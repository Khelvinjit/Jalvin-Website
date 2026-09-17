/* ============================================================================
   admin.js — the owner's panel.

   With no server, the workflow is: edit here -> Export -> upload the file the
   browser gives you. Edits live in this browser until they are published, and
   the panel says so loudly, because "I changed the price but the website still
   shows the old one" is the mistake waiting to happen.
   ========================================================================= */
(function () {
  "use strict";
  const S = window.Store, C = window.CONFIG;

  const AK = { orders: "jalvin.admin.orders", reviews: "jalvin.admin.reviews",
               unlocked: "jalvin.admin.unlocked" };

  /* ---------- order parsing ----------------------------------------------
     The owner copies the WhatsApp message a customer sent and pastes it here.
     We wrote that message format ourselves in checkout.js, so we can read it
     back reliably — no retyping 40 orders at 5am.                          */
  const ITEM_RE = /^[•\-*]\s*(\d+)\s*x\s*([^·]+)·([^·]+)·\s*RM\s*([\d.]+)\s*$/i;

  function parseOrder(text) {
    const lines = String(text || "").split(/\r?\n/).map(l => l.trim());
    const o = { ref: "", name: "", phone: "", address: "", deliveryText: "", window: "",
                halal: [], nonhalal: [], subtotal: 0, delivery: 0, grand: 0,
                substitutionLabel: "", notes: "", status: "awaiting" };

    let section = "";
    lines.forEach(raw => {
      const line = raw.replace(/\*/g, "").trim();
      if (!line) return;

      if (/^ORDER NO:/i.test(line)) { o.ref = line.replace(/^order no:\s*/i, "").trim(); return; }
      if (/^DELIVERY$/i.test(line))  { section = "delivery"; return; }
      if (/^CUSTOMER$/i.test(line))  { section = "customer"; return; }
      if (/^ITEMS$/i.test(line))     { section = "halal"; return; }
      if (/^NON-HALAL/i.test(line))  { section = "nonhalal"; return; }
      if (/^If something is out of stock:?$/i.test(line)) { section = "sub"; return; }
      if (/^JALVIN FRESH/i.test(line)) return;

      let m;
      if ((m = line.match(/^Subtotal:\s*RM\s*([\d.]+)/i))) { o.subtotal = +m[1]; section = ""; return; }
      if ((m = line.match(/^Delivery:\s*(?:RM\s*([\d.]+)|FREE)/i))) { o.delivery = m[1] ? +m[1] : 0; return; }
      if ((m = line.match(/^TOTAL:\s*RM\s*([\d.]+)/i))) { o.grand = +m[1]; return; }
      if ((m = line.match(/^Notes:\s*(.+)$/i))) { o.notes = m[1].trim(); section = ""; return; }
      if (/^I have paid/i.test(line)) { section = ""; return; }

      if (section === "delivery") {
        if (!o.deliveryText) o.deliveryText = line; else if (!o.window) o.window = line;
        return;
      }
      if (section === "customer") {
        if (!o.name) o.name = line;
        else if (!o.phone && /\d{7,}/.test(line.replace(/\D/g, ""))) o.phone = line;
        else o.address = o.address ? o.address + ", " + line : line;
        return;
      }
      if (section === "halal" || section === "nonhalal") {
        const it = raw.match(ITEM_RE);
        if (it) {
          o[section].push({ qty: +it[1], name: it[2].trim(), pack: it[3].trim(), total: +it[4] });
        }
        return;
      }
      if (section === "sub") { o.substitutionLabel = line; section = ""; return; }
    });

    // Match the free-text item names back to real products so the farm list
    // can aggregate them and show cost prices.
    const products = S.allProducts();
    const attach = l => {
      const p = products.find(x => x.ms.toLowerCase() === l.name.toLowerCase()) ||
                products.find(x => x.ms.toLowerCase().startsWith(l.name.toLowerCase().slice(0, 10)));
      l.id = p ? p.id : null;
      l.cost = p ? p.cost : null;
      return l;
    };
    o.halal.forEach(attach);
    o.nonhalal.forEach(attach);

    o.deliveryIso = isoFromText(o.deliveryText);
    return o;
  }

  /* "Wednesday, 23 Sep 2026" -> "2026-09-23" */
  function isoFromText(text) {
    const m = String(text || "").match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
    if (!m) return "";
    const mi = S.MONTHS.findIndex(x => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (mi < 0) return "";
    return m[3] + "-" + String(mi + 1).padStart(2, "0") + "-" + String(m[1]).padStart(2, "0");
  }

  function validateOrder(o) {
    const problems = [];
    if (!/^JV-\d{6}-\d{4}$/.test(o.ref)) problems.push("No valid order number found");
    if (!o.halal.length && !o.nonhalal.length) problems.push("No items found");
    if (!o.grand) problems.push("No total found");
    const sum = o.halal.concat(o.nonhalal).reduce((n, l) => n + l.total, 0);
    if (o.subtotal && Math.abs(sum - o.subtotal) > 0.02) {
      problems.push("Item lines add up to " + S.money(sum) + " but the message says " +
                    S.money(o.subtotal) + " — check before you buy");
    }
    const unknown = o.halal.concat(o.nonhalal).filter(l => !l.id).map(l => l.name);
    if (unknown.length) problems.push("Not in your catalogue: " + unknown.join(", "));
    return problems;
  }

  /* ---------- stored collections ------------------------------------------ */
  const getOrders = () => { const v = S.read(AK.orders, []); return Array.isArray(v) ? v : []; };
  const setOrders = v => S.write(AK.orders, v);
  const getReviews = () => { const v = S.read(AK.reviews, []); return Array.isArray(v) ? v : []; };
  const setReviews = v => S.write(AK.reviews, v);

  /* ---------- the consolidated farm shopping list -------------------------
     The highest-value screen in this whole panel. Without it the owner is
     scrolling forty WhatsApp chats at 5am in the market.                    */
  function farmList(deliveryIso) {
    const orders = getOrders().filter(o =>
      (!deliveryIso || o.deliveryIso === deliveryIso) &&
      o.status !== "cancelled" && o.status !== "refunded");

    const byId = {};
    let collected = 0;
    orders.forEach(o => {
      collected += o.grand || 0;
      o.halal.concat(o.nonhalal).forEach(l => {
        const key = l.id || ("?" + l.name);
        if (!byId[key]) {
          byId[key] = { id: l.id, name: l.name, pack: l.pack, qty: 0,
                        revenue: 0, cost: l.cost, nonhalal: o.nonhalal.indexOf(l) > -1 };
        }
        byId[key].qty += l.qty;
        byId[key].revenue += l.total;
      });
    });

    const rows = Object.keys(byId).map(k => byId[k]);
    rows.sort((a, b) => (a.nonhalal - b.nonhalal) || a.name.localeCompare(b.name));
    const estCost = rows.reduce((n, r) => n + (r.cost != null ? r.cost * r.qty : 0), 0);
    const revenue = rows.reduce((n, r) => n + r.revenue, 0);

    return { orders: orders, rows: rows, orderCount: orders.length,
             collected: +collected.toFixed(2), revenue: +revenue.toFixed(2),
             estCost: +estCost.toFixed(2), estProfit: +(collected - estCost).toFixed(2),
             unknown: rows.some(r => r.cost == null) };
  }

  /* ---------- file export -------------------------------------------------
     Produces the exact file the owner uploads over the old one. */
  function download(filename, content) {
    const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function today() {
    const p = S.klParts();
    return p.y + "-" + String(p.m + 1).padStart(2, "0") + "-" + String(p.d).padStart(2, "0");
  }

  function exportProducts() {
    const products = S.allProducts().map(p => ({
      id: p.id, ms: p.ms, en: p.en, category: p.category, pack: p.pack,
      price: +Number(p.price).toFixed(2), cost: +Number(p.cost).toFixed(2),
      cap: p.cap, inStock: p.inStock !== false, note: p.note, image: p.image,
    }));
    const body = JSON.stringify({ updated: today(),
      note: "Edit prices in the admin panel, then export this file and upload it.",
      products: products }, null, 2);
    download("products.js",
      "/* Jalvin Fresh catalogue.\n" +
      "   Exported from admin.html on " + today() + ".\n" +
      "   Upload this file to data/products.js on your website, replacing the old one. */\n" +
      "window.PRODUCTS_DATA = " + body + ";\n");
  }

  function exportStatuses() {
    const map = {};
    getOrders().forEach(o => {
      map[o.ref] = { status: o.status, delivery: o.deliveryIso || "", note: o.publicNote || "" };
    });
    download("order-status.js",
      "/* Jalvin Fresh order statuses.\n" +
      "   Exported from admin.html on " + today() + ".\n" +
      "   Upload to data/order-status.js. Customers look these up on track.html.\n" +
      "   Note: order numbers are visible to anyone who opens this file, so never\n" +
      "   put a customer's name, phone number or address in the note field. */\n" +
      "window.ORDER_STATUS_DATA = " + JSON.stringify({ updated: today(), orders: map }, null, 2) + ";\n");
  }

  function exportReviews() {
    // Only approved 5-star reviews ever leave this panel.
    const published = getReviews()
      .filter(r => r.stars === 5 && r.approved)
      .map(r => ({ name: r.name, area: r.area || "", stars: 5, date: r.date, text: r.text }));
    download("reviews.js",
      "/* Jalvin Fresh published reviews.\n" +
      "   Exported from admin.html on " + today() + ".\n" +
      "   Upload to data/reviews.js. Only approved 5-star reviews are included —\n" +
      "   reviews below 5 stars stay in your admin panel and are never published. */\n" +
      "window.REVIEWS_DATA = " + JSON.stringify({ updated: today(), reviews: published }, null, 2) + ";\n");
  }

  window.Admin = {
    AK: AK, parseOrder: parseOrder, validateOrder: validateOrder, isoFromText: isoFromText,
    getOrders: getOrders, setOrders: setOrders, getReviews: getReviews, setReviews: setReviews,
    farmList: farmList, exportProducts: exportProducts, exportStatuses: exportStatuses,
    exportReviews: exportReviews, download: download, today: today,
  };
})();
