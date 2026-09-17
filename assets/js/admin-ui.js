/* ============================================================================
   admin-ui.js — wiring for admin.html.
   ========================================================================= */
(function () {
  "use strict";
  const S = window.Store, C = window.CONFIG, A = window.Admin;
  const $ = id => document.getElementById(id);

  /* ---------- lock -------------------------------------------------------- */
  function unlock() {
    $("lock").hidden = true;
    $("panel").hidden = false;
    drawAll();
  }
  $("lock-form").addEventListener("submit", e => {
    e.preventDefault();
    if ($("pass").value === C.admin.passcode) {
      try { sessionStorage.setItem(A.AK.unlocked, "1"); } catch (err) {}
      unlock();
    } else {
      const err = $("pass-err");
      err.textContent = "That isn't the passcode.";
      err.classList.add("show");
      $("pass").classList.add("is-error");
    }
  });
  $("lock-again").addEventListener("click", () => {
    try { sessionStorage.removeItem(A.AK.unlocked); } catch (e) {}
    location.reload();
  });
  try { if (sessionStorage.getItem(A.AK.unlocked) === "1") unlock(); } catch (e) {}

  /* ---------- tabs -------------------------------------------------------- */
  S.$$("[role=tab]").forEach(btn => btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-tab");
    S.$$("[role=tab]").forEach(b => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
    S.$$("[data-panel]").forEach(p => { p.hidden = p.getAttribute("data-panel") !== name; });
    if (name === "farm") drawFarm();
  }));

  /* ---------- unpublished-changes banner ---------------------------------
     The mistake waiting to happen is "I changed the price but the website
     still shows the old one", so this is loud and permanent until published. */
  function drawDirty() {
    $("dirty-banner").innerHTML = S.hasUnpublishedEdits()
      ? '<div class="notice notice--warn" style="margin-bottom:18px"><b>You have price changes ' +
        "that your customers cannot see yet.</b> They are saved in this browser only. Click " +
        "<b>Publish</b> on the Prices tab, then upload the downloaded file to your website's " +
        "<code>data/</code> folder.</div>"
      : "";
  }

  /* ---------- products ---------------------------------------------------- */
  let pFilter = "", pCat = "all";

  $("p-cat").innerHTML = '<option value="all">All categories</option>' +
    C.categories.map(c => '<option value="' + c.id + '">' + S.esc(c.ms) + "</option>").join("");

  function saveProducts(list) {
    S.saveProductOverride({ updated: A.today(), products: list });
    drawProducts(); drawDirty();
  }

  function drawProducts() {
    const all = S.allProducts();
    const rows = all.filter(p => {
      if (pCat !== "all" && p.category !== pCat) return false;
      if (!pFilter) return true;
      return (p.ms + " " + p.en).toLowerCase().includes(pFilter);
    });

    $("p-table").querySelector("tbody").innerHTML = rows.map(p => {
      const margin = p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0;
      const tone = margin < 15 ? "pill--bad" : margin < 25 ? "pill--warn" : "pill--good";
      return '<tr data-id="' + S.esc(p.id) + '">' +
        '<td><div class="row" style="gap:9px;flex-wrap:nowrap">' +
          '<img src="' + S.esc(p.image) + '" alt="" width="34" height="34" style="border-radius:7px">' +
          "<span><b>" + S.esc(p.ms) + '</b><br><span class="tiny muted">' + S.esc(p.en) + "</span></span>" +
        "</div></td>" +
        '<td><input data-f="pack" value="' + S.esc(p.pack) + '" style="min-width:150px"></td>' +
        '<td class="num"><input data-f="cost" type="number" step="0.10" min="0" value="' +
          Number(p.cost).toFixed(2) + '" style="width:82px;text-align:right"></td>' +
        '<td class="num"><input data-f="price" type="number" step="0.10" min="0" value="' +
          Number(p.price).toFixed(2) + '" style="width:82px;text-align:right"></td>' +
        '<td class="num"><span class="pill ' + tone + '">' + margin.toFixed(0) + "%</span></td>" +
        '<td class="num"><input data-f="cap" type="number" step="1" min="0" value="' +
          (p.cap || 0) + '" style="width:70px;text-align:right"></td>' +
        '<td><label style="display:flex;gap:6px;align-items:center;cursor:pointer">' +
          '<input data-f="inStock" type="checkbox" style="width:auto;min-height:0"' +
          (p.inStock !== false ? " checked" : "") + '><span class="tiny">' +
          (p.inStock !== false ? "Yes" : "Sold out") + "</span></label></td>" +
        '<td><button class="link-remove" data-del="' + S.esc(p.id) + '">Remove</button></td></tr>';
    }).join("");

    const totalMargin = all.reduce((n, p) => n + (p.price - p.cost), 0);
    const avg = all.length ? all.reduce((n, p) =>
      n + (p.price > 0 ? (p.price - p.cost) / p.price : 0), 0) / all.length * 100 : 0;
    $("p-summary").innerHTML = rows.length + " of " + all.length + " items shown · " +
      "average margin <b>" + avg.toFixed(1) + "%</b> · " +
      all.filter(p => p.inStock === false).length + " marked sold out" +
      (avg < 20 ? ' · <span style="color:var(--danger)">that average is thin — ' +
        "packaging and fuel have to come out of it</span>" : "");
  }

  $("p-table").addEventListener("change", e => {
    const f = e.target.getAttribute("data-f");
    if (!f) return;
    const id = e.target.closest("tr").getAttribute("data-id");
    const list = S.allProducts();
    const p = list.find(x => x.id === id);
    if (!p) return;
    if (f === "inStock") p.inStock = e.target.checked;
    else if (f === "cost" || f === "price") p[f] = Math.max(0, Number(e.target.value) || 0);
    else if (f === "cap") p.cap = Math.max(0, Math.floor(Number(e.target.value) || 0));
    else p[f] = e.target.value;
    saveProducts(list);
  });

  $("p-table").addEventListener("click", e => {
    const del = e.target.closest("[data-del]");
    if (!del) return;
    const id = del.getAttribute("data-del");
    const p = S.productById(id);
    if (!confirm("Remove " + (p ? p.ms : id) + " from your shop?\n\n" +
                 "It disappears from the website once you publish. You can add it back later.")) return;
    saveProducts(S.allProducts().filter(x => x.id !== id));
  });

  $("p-search").addEventListener("input", e => { pFilter = e.target.value.trim().toLowerCase(); drawProducts(); });
  $("p-cat").addEventListener("change", e => { pCat = e.target.value; drawProducts(); });

  $("p-add").addEventListener("click", () => {
    const ms = prompt("Malay name (e.g. Ubi Kentang)");
    if (!ms) return;
    const en = prompt("English name", "") || ms;
    const pack = prompt("Pack size the customer receives (e.g. 1 pek ≈ 500g)", "1 pek") || "1 pek";
    const price = Number(prompt("Selling price in RM", "5.00")) || 0;
    const cost = Number(prompt("What it costs you at the market, in RM", "3.50")) || 0;
    const cat = prompt("Category — one of: " + C.categories.map(c => c.id).join(", "), "sayur");
    if (!C.categories.some(c => c.id === cat)) { alert("Unknown category: " + cat); return; }

    const id = ms.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (S.productById(id)) { alert("You already have a product with that name."); return; }

    const list = S.allProducts();
    list.push({ id: id, ms: ms, en: en, category: cat, pack: pack, price: price, cost: cost,
                cap: 20, inStock: true, note: "",
                image: "assets/img/products/" + id + ".svg" });
    saveProducts(list);
    alert("Added " + ms + ".\n\nIt has no picture yet — put an image at\n" +
          "assets/img/products/" + id + ".svg (or .jpg, and change the path)\n" +
          "or it will show as a broken image on your shop.");
  });

  $("p-revert").addEventListener("click", () => {
    if (!S.hasUnpublishedEdits()) { alert("There is nothing to undo."); return; }
    if (!confirm("Throw away every change you have made since the last publish?")) return;
    S.clearProductOverride(); drawProducts(); drawDirty();
  });

  $("p-export").addEventListener("click", () => {
    A.exportProducts();
    setTimeout(() => alert("products.js has been downloaded.\n\n" +
      "Now upload it to your website's data/ folder, replacing the old products.js.\n" +
      "Your customers will see the new prices as soon as you do."), 300);
  });

  /* ---------- orders ------------------------------------------------------ */
  function previewOrder() {
    const text = $("o-paste").value;
    if (!text.trim()) { $("o-preview").innerHTML = ""; return null; }
    const o = A.parseOrder(text);
    const problems = A.validateOrder(o);
    const items = o.halal.concat(o.nonhalal);

    $("o-preview").innerHTML =
      (problems.length
        ? '<div class="notice notice--danger"><b>Check this before you buy anything:</b><ul style="margin:8px 0 0;padding-left:18px">' +
          problems.map(p => "<li>" + S.esc(p) + "</li>").join("") + "</ul></div>"
        : '<div class="notice notice--info"><b>Looks good.</b> ' + items.length +
          " item lines, total " + S.money(o.grand) + ".</div>") +
      '<div class="card" style="margin-top:10px"><div class="small">' +
        "<b>" + S.esc(o.ref || "no order number") + "</b> · " + S.esc(o.name || "no name") +
        " · " + S.esc(o.phone || "no phone") + "<br>" +
        '<span class="muted">' + S.esc(o.deliveryText || "no date") + " · " +
        S.esc(o.window || "") + "</span><br>" +
        '<span class="muted">' + S.esc(o.address || "") + "</span></div>" +
        (items.length ? '<div class="small" style="margin-top:8px">' + items.map(l =>
          "• " + l.qty + " &times; " + S.esc(l.name) + (l.id ? "" :
            ' <span class="pill pill--bad">not in catalogue</span>')).join("<br>") + "</div>" : "") +
      "</div>";
    return o;
  }

  $("o-check").addEventListener("click", previewOrder);
  $("o-paste").addEventListener("input", () => {
    clearTimeout(window.__oT);
    window.__oT = setTimeout(previewOrder, 300);
  });

  $("o-save").addEventListener("click", () => {
    const o = previewOrder();
    if (!o) { alert("Paste a WhatsApp order message first."); return; }
    const problems = A.validateOrder(o);
    if (problems.length && !confirm("This order has problems:\n\n• " + problems.join("\n• ") +
        "\n\nSave it anyway?")) return;
    const list = A.getOrders().filter(x => x.ref !== o.ref);
    list.unshift(o);
    A.setOrders(list);
    $("o-paste").value = "";
    $("o-preview").innerHTML = "";
    drawOrders(); drawFarmDates();
    S.toast("Saved " + o.ref);
  });

  function drawOrders() {
    const orders = A.getOrders();
    const body = $("o-table").querySelector("tbody");
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted" style="padding:26px;text-align:center">' +
        "No orders saved yet. Paste one above to get started.</td></tr>";
      return;
    }
    body.innerHTML = orders.map(o =>
      '<tr data-ref="' + S.esc(o.ref) + '">' +
        "<td><b>" + S.esc(o.ref) + "</b></td>" +
        "<td>" + S.esc(o.name) + '<br><span class="tiny muted">' + S.esc(o.phone) + "</span></td>" +
        "<td>" + S.esc(o.deliveryText || "—") + "</td>" +
        '<td class="num">' + S.money(o.grand) + "</td>" +
        '<td><select data-f="status" style="min-width:190px">' +
          C.orderStatuses.map(s => '<option value="' + s.id + '"' +
            (o.status === s.id ? " selected" : "") + ">" + S.esc(s.en) + "</option>").join("") +
        "</select></td>" +
        '<td><input data-f="publicNote" value="' + S.esc(o.publicNote || "") +
          '" placeholder="Shown on the tracking page" style="min-width:230px"></td>' +
        '<td><button class="link-remove" data-del-order="' + S.esc(o.ref) + '">Delete</button></td>' +
      "</tr>").join("");
  }

  $("o-table").addEventListener("change", e => {
    const f = e.target.getAttribute("data-f");
    if (!f) return;
    const ref = e.target.closest("tr").getAttribute("data-ref");
    const list = A.getOrders();
    const o = list.find(x => x.ref === ref);
    if (!o) return;
    o[f] = e.target.value;
    A.setOrders(list);
    if (f === "status") drawFarm();
  });

  $("o-table").addEventListener("click", e => {
    const d = e.target.closest("[data-del-order]");
    if (!d) return;
    const ref = d.getAttribute("data-del-order");
    if (!confirm("Delete order " + ref + " from this panel?")) return;
    A.setOrders(A.getOrders().filter(x => x.ref !== ref));
    drawOrders(); drawFarmDates(); drawFarm();
  });

  $("o-export").addEventListener("click", () => {
    if (!A.getOrders().length) { alert("There are no orders to publish yet."); return; }
    A.exportStatuses();
    setTimeout(() => alert("order-status.js has been downloaded.\n\n" +
      "Upload it to your website's data/ folder. Customers can then look up their\n" +
      "order number on the Track page and see where it is."), 300);
  });

  /* ---------- farm list --------------------------------------------------- */
  function drawFarmDates() {
    const dates = Array.from(new Set(A.getOrders().map(o => o.deliveryIso).filter(Boolean))).sort();
    const sel = $("f-date");
    const keep = sel.value;
    sel.innerHTML = dates.length
      ? dates.map(d => '<option value="' + d + '">' +
          S.esc(S.formatDateLong(new Date(d + "T04:00:00Z"))) + "</option>").join("")
      : '<option value="">No orders saved yet</option>';
    if (dates.indexOf(keep) > -1) sel.value = keep;
  }

  function drawFarm() {
    drawFarmDates();
    const date = $("f-date").value;
    const f = A.farmList(date);

    $("f-summary").innerHTML = '<div class="trust">' +
      "<div><b>" + f.orderCount + "</b><span>orders</span></div>" +
      "<div><b>" + S.money(f.collected) + "</b><span>collected from customers</span></div>" +
      "<div><b>" + S.money(f.estCost) + "</b><span>estimated farm cost</span></div>" +
      "<div><b>" + S.money(f.estProfit) + "</b><span>left for you" +
        (f.unknown ? " (some costs unknown)" : "") + "</span></div></div>" +
      (f.orderCount
        ? '<div class="notice notice--info" style="margin-top:14px">Take ' +
          "<b>" + S.money(f.estCost) + "</b> to the market, plus a bit extra — prices move and you " +
          "want a spare bundle or two rather than a refund conversation. Remember packaging and " +
          "fuel come out of the " + S.money(f.estProfit) + ".</div>"
        : '<div class="empty"><h3>Nothing to buy for this date</h3><p>Paste some orders in the ' +
          "Orders tab and they will add up here.</p></div>");

    $("f-table").closest(".table-wrap").hidden = !f.orderCount;
    $("f-table").querySelector("tbody").innerHTML = f.rows.map(r =>
      "<tr" + (r.nonhalal ? ' style="background:var(--maroon-tint)"' : "") + ">" +
        "<td><b>" + S.esc(r.name) + "</b>" +
          (r.nonhalal ? ' <span class="pill" style="background:var(--maroon);color:#fff">non-halal</span>' : "") +
          (r.id ? "" : ' <span class="pill pill--bad">unknown item</span>') + "</td>" +
        "<td>" + S.esc(r.pack) + "</td>" +
        '<td class="num"><b style="font-size:1.1rem">' + r.qty + "</b></td>" +
        '<td class="num">' + (r.cost != null ? S.money(r.cost * r.qty) : "—") + "</td>" +
        '<td class="num">' + S.money(r.revenue) + "</td>" +
        '<td><input type="checkbox" style="width:auto;min-height:0"></td>' +
      "</tr>").join("");

    $("f-orders").innerHTML = f.orderCount
      ? "<h3>Delivery run</h3>" +
        '<p class="muted small no-print">Grouped by area so you can plan the route.</p>' +
        groupByArea(f.orders)
      : "";
  }

  function groupByArea(orders) {
    const groups = {};
    orders.forEach(o => {
      // Last chunk of the address is usually the condo / area.
      const parts = String(o.address || "").split(",").map(s => s.trim());
      const area = parts.length > 1 ? parts[parts.length - 2] : (parts[0] || "Unknown");
      (groups[area] = groups[area] || []).push(o);
    });
    return Object.keys(groups).sort().map(area =>
      '<div class="card" style="margin-bottom:12px">' +
        "<h4 style=\"margin:0 0 8px\">" + S.esc(area) + " · " + groups[area].length + " stop" +
          (groups[area].length > 1 ? "s" : "") + "</h4>" +
        groups[area].map(o =>
          '<div class="row between small" style="padding:6px 0;border-top:1px solid var(--border-soft)">' +
            "<span><b>" + S.esc(o.ref) + "</b> · " + S.esc(o.name) + " · " + S.esc(o.phone) + "<br>" +
              '<span class="muted">' + S.esc(o.address) + " · " + S.esc(o.window || "") + "</span></span>" +
            '<span class="money">' + S.money(o.grand) + "</span></div>").join("") +
      "</div>").join("");
  }

  $("f-date").addEventListener("change", drawFarm);

  /* ---------- reviews ----------------------------------------------------- */
  function seedReviews() {
    // First run: pull in whatever is already published so the panel is not empty.
    if (A.getReviews().length) return;
    const pub = (window.REVIEWS_DATA && window.REVIEWS_DATA.reviews) || [];
    A.setReviews(pub.map((r, i) => ({
      id: "seed" + i, name: r.name, area: r.area, stars: r.stars,
      text: r.text, date: r.date, approved: true, action: "",
    })));
  }

  function reviewCard(r) {
    return '<article class="review" data-rid="' + S.esc(r.id) + '">' +
      S.starsHtml(r.stars) +
      '<p class="review__text" style="font-size:.95rem">' + S.esc(r.text) + "</p>" +
      '<div class="review__who"><b>' + S.esc(r.name) + "</b>" +
        (r.area ? " · " + S.esc(r.area) : "") + " · " + S.esc(r.date) + "</div>" +
      (r.stars === 5
        ? '<div class="row" style="gap:8px;margin-top:6px">' +
            (r.approved
              ? '<button class="btn btn--ghost btn--sm" data-unapprove="' + S.esc(r.id) + '">Unpublish</button>'
              : '<button class="btn btn--green btn--sm" data-approve="' + S.esc(r.id) + '">Approve &amp; publish</button>') +
            '<button class="link-remove" data-rdel="' + S.esc(r.id) + '">Delete</button></div>'
        : '<div style="margin-top:8px"><label class="tiny label">What did you do about it?</label>' +
          '<input data-action="' + S.esc(r.id) + '" value="' + S.esc(r.action || "") +
            '" placeholder="e.g. Switched to a colder cooler box">' +
          '<div class="row" style="margin-top:8px"><button class="link-remove" data-rdel="' +
            S.esc(r.id) + '">Delete</button></div></div>');
  }

  function drawReviews() {
    const all = A.getReviews();
    const pub = all.filter(r => r.stars === 5 && r.approved);
    const pend = all.filter(r => r.stars === 5 && !r.approved);
    const priv = all.filter(r => r.stars < 5);

    $("r-published").innerHTML = pub.length ? pub.map(reviewCard).join("")
      : '<p class="muted small">Nothing published yet.</p>';
    $("r-pending").innerHTML = pend.length ? pend.map(reviewCard).join("")
      : '<p class="muted small">No 5-star reviews waiting.</p>';
    $("r-private").innerHTML = priv.length ? priv.map(reviewCard).join("")
      : '<p class="muted small">No critical reviews — which is good, but keep asking for them.</p>';
  }

  $("r-add").addEventListener("click", () => {
    const name = $("r-name").value.trim();
    const text = $("r-text").value.trim();
    if (!name || !text) { alert("A name and the review text are both needed."); return; }
    const stars = Number($("r-stars").value);
    const consent = $("r-consent").checked;
    if (stars === 5 && !consent &&
        !confirm("They have not given permission to publish.\n\n" +
                 "Save it as waiting for approval instead?")) return;
    const list = A.getReviews();
    list.unshift({ id: "r" + Date.now(), name: name, area: $("r-area").value.trim(),
                   stars: stars, text: text, date: A.today(),
                   approved: stars === 5 && consent, action: "" });
    A.setReviews(list);
    $("r-name").value = $("r-area").value = $("r-text").value = "";
    $("r-consent").checked = false;
    drawReviews();
    S.toast(stars === 5 ? "Review saved" : "Saved privately — it will never be published");
  });

  document.addEventListener("click", e => {
    const ap = e.target.closest("[data-approve]"), un = e.target.closest("[data-unapprove]"),
          dl = e.target.closest("[data-rdel]");
    if (!ap && !un && !dl) return;
    const id = (ap || un || dl).getAttribute(ap ? "data-approve" : un ? "data-unapprove" : "data-rdel");
    let list = A.getReviews();
    if (dl) {
      if (!confirm("Delete this review permanently?")) return;
      list = list.filter(r => r.id !== id);
    } else {
      const r = list.find(x => x.id === id);
      if (r) r.approved = !!ap;
    }
    A.setReviews(list);
    drawReviews();
  });

  document.addEventListener("change", e => {
    const id = e.target.getAttribute && e.target.getAttribute("data-action");
    if (!id) return;
    const list = A.getReviews();
    const r = list.find(x => x.id === id);
    if (r) { r.action = e.target.value; A.setReviews(list); }
  });

  $("r-export").addEventListener("click", () => {
    const n = A.getReviews().filter(r => r.stars === 5 && r.approved).length;
    A.exportReviews();
    setTimeout(() => alert("reviews.js has been downloaded with " + n + " approved review" +
      (n === 1 ? "" : "s") + ".\n\nUpload it to your website's data/ folder.\n" +
      "Reviews below 5 stars were not included — they never leave this panel."), 300);
  });

  /* ---------- settings ---------------------------------------------------- */
  function drawSettings() {
    const rows = [
      ["Business name", C.business.name, "business.name"],
      ["SSM registration number", C.business.ssmNumber, "business.ssmNumber"],
      ["Email", C.business.email, "business.email"],
      ["WhatsApp number", C.business.whatsappDisplay + " (" + C.business.whatsapp + ")", "business.whatsapp"],
      ["Delivery fee", S.money(C.deliveryFee), "deliveryFee"],
      ["Free delivery above", S.money(C.freeDeliveryAbove), "freeDeliveryAbove"],
      ["Minimum order", S.money(C.minimumOrder), "minimumOrder"],
      ["Postcodes served", C.allowedPostcodes.join(", "), "allowedPostcodes"],
      ["Delivery days & cut-offs",
       C.deliverySlots.map(s => s.label + " (order by " + s.cutoffLabel + ")").join("<br>"),
       "deliverySlots"],
      ["Time windows", C.deliveryWindows.join("<br>"), "deliveryWindows"],
      ["DuitNow QR image", C.payment.qrImage, "payment.qrImage"],
      ["Admin passcode", "•".repeat(C.admin.passcode.length), "admin.passcode"],
    ];
    $("s-table").innerHTML = rows.map(r =>
      "<tr><td><b>" + S.esc(r[0]) + "</b></td><td>" + r[1] +
      "</td><td><code>" + S.esc(r[2]) + "</code></td></tr>").join("");
  }

  /* ---------- go ---------------------------------------------------------- */
  function drawAll() {
    seedReviews();
    drawDirty(); drawProducts(); drawOrders(); drawFarmDates(); drawFarm();
    drawReviews(); drawSettings();
  }
})();
