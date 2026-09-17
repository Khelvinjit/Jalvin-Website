/* ============================================================================
   store.js — shared state and helpers for every page.

   Everything that touches data goes through here. If this business ever
   outgrows WhatsApp and needs a real database, this is the ONLY file that has
   to change: swap the localStorage calls for API calls and the rest of the
   site keeps working.
   ========================================================================= */
(function () {
  "use strict";

  const C = window.CONFIG;
  const KEY = { cart: "jalvin.cart", orders: "jalvin.orders",
                products: "jalvin.products.override", admin: "jalvin.admin" };

  /* ---------- tiny helpers ------------------------------------------------ */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const money = n => C.currency + Number(n || 0).toFixed(2);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* localStorage can throw (private mode, blocked cookies). Never let that
     take the whole page down — the shop must still render. */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ---------- Malaysian time ---------------------------------------------
     Cut-offs are computed in Asia/Kuala_Lumpur (UTC+8, no daylight saving),
     never in the visitor's own timezone. A customer checking the site from
     overseas must see the same deadline as one sitting in Cyberjaya.        */
  const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

  function klParts(d) {
    const s = new Date((d || new Date()).getTime() + KL_OFFSET_MS);
    return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate(),
             day: s.getUTCDay(), hh: s.getUTCHours(), mm: s.getUTCMinutes() };
  }
  /* Build the UTC instant for a Kuala Lumpur wall-clock time. */
  function klInstant(y, m, d, hh, mm, ss, ms) {
    return new Date(Date.UTC(y, m, d, hh || 0, mm || 0, ss || 0, ms || 0) - KL_OFFSET_MS);
  }

  const DAY_MS = 86400000;
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- delivery slots & cut-offs -----------------------------------
     THE most important function on the site. The owner buys from the farmer
     only after the cut-off, so a slot whose cut-off has passed must disappear
     from checkout entirely — there is no time left to buy the goods.

     Pure and clock-injectable: pass any date in to test it.                 */
  function getAvailableDeliveryDates(now, limit) {
    now = now || new Date();
    const t = now.getTime();
    const p = klParts(now);
    const out = [];

    (C.deliverySlots || []).forEach(slot => {
      /* How many days before delivery does ordering close?
         Wednesday delivery, Monday cut-off = 2 days. */
      const daysBack = ((slot.day - slot.cutoffDay) + 7) % 7;
      /* Days from today to the next occurrence of this delivery weekday. */
      const firstAhead = ((slot.day - p.day) + 7) % 7;

      for (let w = 0; w < 6; w++) {
        const del = klInstant(p.y, p.m, p.d + firstAhead + w * 7, 12, 0);
        const dp = klParts(del);
        /* The cut-off runs to the END of its minute, so an order placed at
           exactly 11:59 PM still counts. */
        const cut = klInstant(dp.y, dp.m, dp.d - daysBack,
                              slot.cutoffHour, slot.cutoffMinute, 59, 999);
        if (cut.getTime() < t) continue;          // too late to buy for this one
        out.push({
          slotId: slot.id,
          label: slot.label,
          labelMs: slot.labelMs,
          cutoffLabel: slot.cutoffLabel,
          deliveryDate: del,
          deliveryIso: [dp.y, String(dp.m + 1).padStart(2, "0"),
                        String(dp.d).padStart(2, "0")].join("-"),
          dateText: slot.label + ", " + dp.d + " " + MONTHS[dp.m] + " " + dp.y,
          cutoff: cut,
          cutoffIso: cut.toISOString(),
          msLeft: cut.getTime() - t,
        });
      }
    });

    out.sort((a, b) => a.deliveryDate - b.deliveryDate);
    return out.slice(0, limit || 4);
  }

  /* The soonest cut-off — drives the countdown in the header. */
  function nextCutoff(now) {
    const slots = getAvailableDeliveryDates(now);
    if (!slots.length) return null;
    return slots.slice().sort((a, b) => a.cutoff - b.cutoff)[0];
  }

  function countdownText(ms) {
    if (ms == null || ms < 0) return "closed";
    const d = Math.floor(ms / DAY_MS);
    const h = Math.floor((ms % DAY_MS) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (d > 0) return d + "d " + h + "h " + m + "m";
    if (h > 0) return h + "h " + m + "m " + s + "s";
    return m + "m " + s + "s";
  }

  function formatDateLong(d) {
    const p = klParts(d);
    return DAY_NAMES[p.day] + ", " + p.d + " " + MONTHS[p.m] + " " + p.y;
  }

  /* ---------- products ----------------------------------------------------
     Source of truth is data/products.js. The admin panel can hold unpublished
     edits in localStorage so the owner sees changes immediately; those apply
     on this device only until they export and upload the file.             */
  function allProducts() {
    const base = (window.PRODUCTS_DATA && window.PRODUCTS_DATA.products) || [];
    const override = read(KEY.products, null);
    const list = (override && override.products) || base;
    return list.map(p => Object.assign({}, p));
  }
  function productById(id) { return allProducts().find(p => p.id === id) || null; }
  function saveProductOverride(payload) { return write(KEY.products, payload); }
  function clearProductOverride() { try { localStorage.removeItem(KEY.products); } catch (e) {} }
  function hasUnpublishedEdits() { return !!read(KEY.products, null); }

  function categoryOf(id) { return (C.categories || []).find(c => c.id === id) || null; }
  function isNonHalal(p) { const c = categoryOf(p.category); return c ? !c.halal : false; }

  /* ---------- cart -------------------------------------------------------- */
  function getCart() { const c = read(KEY.cart, {}); return (c && typeof c === "object") ? c : {}; }
  function saveCart(c) { write(KEY.cart, c); document.dispatchEvent(new CustomEvent("cart:change")); }

  function cartCount() {
    const c = getCart();
    return Object.keys(c).reduce((n, k) => n + (c[k] || 0), 0);
  }

  /* Returns cart lines split into halal / non-halal. They are kept apart all
     the way to the WhatsApp message so the two can never end up in one bag. */
  function cartLines() {
    const c = getCart(), halal = [], nonhalal = [];
    let subtotal = 0;
    Object.keys(c).forEach(id => {
      const p = productById(id);
      const qty = c[id];
      if (!p || !qty) return;
      const line = { product: p, qty: qty, total: +(p.price * qty).toFixed(2) };
      subtotal += line.total;
      (isNonHalal(p) ? nonhalal : halal).push(line);
    });
    const sort = (a, b) => a.product.ms.localeCompare(b.product.ms);
    halal.sort(sort); nonhalal.sort(sort);
    return { halal: halal, nonhalal: nonhalal, all: halal.concat(nonhalal),
             subtotal: +subtotal.toFixed(2) };
  }

  function setQty(id, qty) {
    const c = getCart();
    const p = productById(id);
    qty = Math.max(0, Math.floor(qty || 0));
    if (p && p.cap) qty = Math.min(qty, p.cap);   // respect the per-cycle cap
    if (qty <= 0) delete c[id]; else c[id] = qty;
    saveCart(c);
    return qty;
  }
  function addToCart(id, n) { return setQty(id, (getCart()[id] || 0) + (n || 1)); }
  function removeFromCart(id) { return setQty(id, 0); }
  function clearCart() { saveCart({}); }

  /* ---------- totals ------------------------------------------------------ */
  function totals() {
    const lines = cartLines();
    const sub = lines.subtotal;
    const freeAt = C.freeDeliveryAbove;
    const fee = (sub <= 0 || sub >= freeAt) ? 0 : C.deliveryFee;
    return {
      subtotal: sub,
      delivery: fee,
      grand: +(sub + fee).toFixed(2),
      freeDelivery: sub >= freeAt && sub > 0,
      awayFromFree: +Math.max(0, freeAt - sub).toFixed(2),
      belowMinimum: sub > 0 && sub < C.minimumOrder,
      shortBy: +Math.max(0, C.minimumOrder - sub).toFixed(2),
      itemCount: lines.all.reduce((n, l) => n + l.qty, 0),
      hasNonHalal: lines.nonhalal.length > 0,
      hasHalal: lines.halal.length > 0,
    };
  }

  /* ---------- order reference --------------------------------------------
     Format JV-YYMMDD-NNNN. Digits only: the customer has to retype this into
     the DuitNow reference box, and letters invite 0/O and 1/l mistakes.    */
  function makeOrderRef(now) {
    const p = klParts(now || new Date());
    const ymd = String(p.y).slice(2) + String(p.m + 1).padStart(2, "0") +
                String(p.d).padStart(2, "0");
    const n = String(Math.floor(Math.random() * 9000) + 1000);
    return "JV-" + ymd + "-" + n;
  }

  /* ---------- the customer's own order copies ----------------------------- */
  function savedOrders() { const o = read(KEY.orders, []); return Array.isArray(o) ? o : []; }
  function saveOrder(order) {
    const list = savedOrders().filter(o => o.ref !== order.ref);
    list.unshift(order);
    write(KEY.orders, list.slice(0, 25));
  }
  function lastOrder() { return savedOrders()[0] || null; }

  /* ---------- phone numbers ----------------------------------------------- */
  function normalisePhone(raw) {
    let d = String(raw || "").replace(/[^\d]/g, "");
    if (d.startsWith("60")) return d;
    if (d.startsWith("0")) return "6" + d;
    if (d.startsWith("1")) return "60" + d;
    return d;
  }
  function isValidMyMobile(raw) {
    const d = normalisePhone(raw);
    return /^601[0-9]{8,9}$/.test(d);
  }

  /* ---------- WhatsApp ---------------------------------------------------- */
  function waLink(text) {
    return "https://wa.me/" + C.business.whatsapp + "?text=" + encodeURIComponent(text);
  }

  /* ---------- icons ------------------------------------------------------- */
  const ICONS = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h2.2l2.3 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H5.3"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 20c0-9 6-15 16-15 0 11-6 16-13 16-1 0-2 0-3-1z" opacity=".95"/><path d="M4 20C7 14 12 10 17 8" stroke="#1F5F3F" stroke-width="1.4" fill="none" opacity=".45"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.5.7.7-2.4-.2-.3A8 8 0 0 1 12 4zm-3.3 4.2c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.6.1.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3l-1.9-.9c-.3-.1-.5-.2-.7.1l-.7.9c-.1.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.3-1.6-1.5-1.9-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5.5 5.5L20 6"/></svg>',
  };

  function starsHtml(n, big) {
    let h = '<span class="stars' + (big ? " stars--lg" : "") +
            '" role="img" aria-label="' + n + ' out of 5 stars">';
    for (let i = 0; i < 5; i++) {
      h += '<span style="' + (i < n ? "" : "opacity:.22") + '">' + ICONS.star + "</span>";
    }
    return h + "</span>";
  }

  /* ---------- shared header & footer -------------------------------------
     Injected rather than copy-pasted into eight HTML files, so the owner can
     add a nav link in one place and not miss a page.                       */
  function layout(current) {
    const b = C.business;
    const head = document.getElementById("site-head");
    if (head) {
      head.innerHTML =
        '<div class="cutoff-bar" id="cutoff-bar"><div class="wrap"><div class="cutoff-bar__inner" ' +
          'id="cutoff-inner">Loading delivery dates…</div></div></div>' +
        '<div class="site-head"><div class="wrap"><div class="site-head__inner">' +
          '<a class="brand" href="index.html">' +
            '<span class="brand__mark" style="color:#8FCf9F">' + ICONS.leaf + "</span>" +
            '<span><span class="brand__name">' + esc(b.name) + "</span><br>" +
            '<span class="brand__sub">' + esc(b.serviceArea) + "</span></span></a>" +
          '<button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false">' +
            ICONS.menu + "</button>" +
          '<nav class="nav" id="nav">' +
            navLink("index.html", "Home", current) +
            navLink("shop.html", "Shop", current) +
            navLink("track.html", "Track order", current) +
            navLink("review.html", "Leave a review", current) +
            navLink("faq.html", "FAQ", current) +
          "</nav>" +
          '<a class="cart-btn" href="cart.html">' + ICONS.cart +
            '<span class="label">Cart</span>' +
            '<span class="cart-btn__count" id="cart-count">0</span></a>' +
        "</div></div></div>";

      const t = document.getElementById("nav-toggle"), n = document.getElementById("nav");
      t.addEventListener("click", () => {
        const open = n.classList.toggle("open");
        t.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    const foot = document.getElementById("site-foot");
    if (foot) {
      foot.innerHTML =
        '<footer class="site-foot"><div class="wrap"><div class="foot-grid">' +
          "<div><h4>" + esc(b.name) + "</h4>" +
            "<p>" + esc(b.taglineEn) + "</p>" +
            '<p><a class="btn btn--wa btn--sm" href="' + waLink("Hi " + b.ownerName + "! I have a question about Jalvin Fresh.") +
              '" target="_blank" rel="noopener">' + ICONS.wa + " " + esc(b.whatsappDisplay) + "</a></p></div>" +
          "<div><h4>Shop</h4><ul>" +
            '<li><a href="shop.html">All produce</a></li>' +
            '<li><a href="cart.html">Your cart</a></li>' +
            '<li><a href="track.html">Track your order</a></li>' +
            '<li><a href="review.html">Leave a review</a></li></ul></div>' +
          "<div><h4>Info</h4><ul>" +
            '<li><a href="faq.html">How it works &amp; FAQ</a></li>' +
            '<li><a href="policies.html#refund">Refunds &amp; substitutions</a></li>' +
            '<li><a href="policies.html#halal">Halal &amp; non-halal handling</a></li>' +
            '<li><a href="policies.html#privacy">Privacy notice</a></li>' +
            '<li><a href="policies.html#terms">Terms &amp; conditions</a></li></ul></div>' +
        "</div><div class=\"foot-legal\">" +
          "<p><b>" + esc(b.name) + "</b> · " + esc(b.ssmNumber) + " · " + esc(b.email) +
            " · " + esc(b.whatsappDisplay) + "<br>" +
            "We deliver to " + esc(b.serviceArea) + " only (" + C.allowedPostcodes.join(", ") + "). " +
            "Prices include all charges. Delivery " + money(C.deliveryFee) +
            ", free above " + money(C.freeDeliveryAbove) + ". Minimum order " +
            money(C.minimumOrder) + ".</p>" +
          "<p>© " + klParts().y + " " + esc(b.name) + ". Sample website.</p>" +
        "</div></div></footer>";
    }

    refreshCartCount();
    startCutoffTicker();
  }

  function navLink(href, label, current) {
    const on = current === href;
    return '<a href="' + href + '"' + (on ? ' aria-current="page"' : "") + ">" + esc(label) + "</a>";
  }

  function refreshCartCount() {
    const el = document.getElementById("cart-count");
    if (!el) return;
    const n = cartCount();
    el.textContent = n;
    el.style.display = n ? "" : "none";
  }
  document.addEventListener("cart:change", refreshCartCount);

  /* Live countdown to the next cut-off. Honest urgency: it is a real
     deadline, and showing it stops customers ordering too late. */
  function startCutoffTicker() {
    const box = document.getElementById("cutoff-inner");
    const bar = document.getElementById("cutoff-bar");
    if (!box) return;
    function tick() {
      const next = nextCutoff();
      if (!next) { box.textContent = "Ordering is closed right now — WhatsApp us and we'll help."; return; }
      const urgent = next.msLeft < 12 * 3600 * 1000;
      if (bar) bar.classList.toggle("urgent", urgent);
      box.innerHTML =
        "<span>Next delivery <b>" + esc(next.dateText) + "</b></span>" +
        "<span>Order by <b>" + esc(next.cutoffLabel) + "</b></span>" +
        '<span class="clock">' + countdownText(next.msLeft) + " left</span>";
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- toast ------------------------------------------------------- */
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("role", "status");
      el.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);" +
        "background:#22201D;color:#fff;padding:12px 20px;border-radius:999px;z-index:200;" +
        "font-weight:600;font-size:.92rem;box-shadow:0 8px 26px rgba(0,0,0,.28);max-width:88vw;" +
        "text-align:center;opacity:0;transition:opacity .18s";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => { el.style.opacity = "1"; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2200);
  }

  /* ---------- export ------------------------------------------------------ */
  window.Store = {
    $: $, $$: $$, esc: esc, money: money, read: read, write: write, KEY: KEY,
    klParts: klParts, klInstant: klInstant, DAY_NAMES: DAY_NAMES, MONTHS: MONTHS,
    getAvailableDeliveryDates: getAvailableDeliveryDates, nextCutoff: nextCutoff,
    countdownText: countdownText, formatDateLong: formatDateLong,
    allProducts: allProducts, productById: productById, categoryOf: categoryOf,
    isNonHalal: isNonHalal, saveProductOverride: saveProductOverride,
    clearProductOverride: clearProductOverride, hasUnpublishedEdits: hasUnpublishedEdits,
    getCart: getCart, cartCount: cartCount, cartLines: cartLines, setQty: setQty,
    addToCart: addToCart, removeFromCart: removeFromCart, clearCart: clearCart,
    totals: totals, makeOrderRef: makeOrderRef,
    savedOrders: savedOrders, saveOrder: saveOrder, lastOrder: lastOrder,
    normalisePhone: normalisePhone, isValidMyMobile: isValidMyMobile, waLink: waLink,
    ICONS: ICONS, starsHtml: starsHtml, layout: layout, toast: toast,
    refreshCartCount: refreshCartCount,
  };
})();
