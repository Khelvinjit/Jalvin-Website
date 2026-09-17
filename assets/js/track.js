/* ============================================================================
   track.js — order status lookup, plus the customer's own order history.

   With no backend, status comes from data/order-status.js, which the owner
   updates in the admin panel and re-uploads. WhatsApp is still the primary
   way customers hear about their order; this page is for "where is it?" at
   11pm when they don't want to message anyone.
   ========================================================================= */
(function () {
  "use strict";
  const S = window.Store, C = window.CONFIG;

  const FLOW = C.orderStatuses.filter(s => s.step > 0).sort((a, b) => a.step - b.step);

  function statusById(id) { return C.orderStatuses.find(s => s.id === id) || null; }

  function trackerHtml(currentId) {
    const cur = statusById(currentId);
    // Cancelled and refunded sit outside the normal flow.
    if (!cur || cur.step === 0) {
      const tone = currentId === "refunded" ? "info" : "danger";
      return '<div class="notice notice--' + tone + '"><b>' + S.esc(cur ? cur.en : "Unknown") +
        "</b><br>" + S.esc(cur ? cur.ms : "") + "</div>";
    }
    return '<ul class="track-steps">' + FLOW.map(s => {
      const cls = s.step < cur.step ? "done" : s.step === cur.step ? "now" : "";
      const mark = s.step < cur.step ? "&#10003;" : s.step;
      return '<li class="' + cls + '"><span class="track-dot">' + mark + "</span>" +
        '<span><span class="track-label">' + S.esc(s.en) + "</span>" +
        '<span class="track-sub">' + S.esc(s.ms) + "</span></span></li>";
    }).join("") + "</ul>";
  }

  function lookup(ref) {
    ref = String(ref || "").trim().toUpperCase();
    const data = (window.ORDER_STATUS_DATA && window.ORDER_STATUS_DATA.orders) || {};
    return { ref: ref, record: data[ref] || null };
  }

  function resultHtml(ref, rec) {
    if (!rec) {
      return '<div class="notice notice--warn"><b>We can\'t find order ' + S.esc(ref) + " yet.</b><br>" +
        "New orders appear here once we've verified your payment — usually within 2 hours. " +
        'If it\'s been longer, <a href="' + S.waLink("Hi! Checking on order " + ref) +
        '" target="_blank" rel="noopener">WhatsApp us</a> and we\'ll look it up.</div>';
    }
    const st = statusById(rec.status);
    return '<div class="card">' +
      '<div class="row between" style="margin-bottom:6px">' +
        '<span class="orderref" style="font-size:1.1rem;padding:6px 12px">' + S.esc(ref) + "</span>" +
        '<span class="pill ' + (rec.status === "delivered" ? "pill--good"
                              : rec.status === "cancelled" ? "pill--bad" : "pill--warn") + '">' +
          S.esc(st ? st.en : rec.status) + "</span>" +
      "</div>" +
      (rec.delivery ? '<p class="muted small">Delivery date: <b>' +
        S.esc(S.formatDateLong(new Date(rec.delivery + "T04:00:00Z"))) + "</b></p>" : "") +
      (rec.note ? '<div class="notice notice--info" style="margin:12px 0"><b>Latest update:</b> ' +
        S.esc(rec.note) + "</div>" : "") +
      '<div style="margin-top:16px">' + trackerHtml(rec.status) + "</div>" +
      '<a class="btn btn--wa btn--sm" style="margin-top:8px" href="' +
        S.waLink("Hi! Question about order " + ref) + '" target="_blank" rel="noopener">' +
        "Ask about this order</a></div>";
  }

  window.Track = { lookup: lookup, resultHtml: resultHtml, trackerHtml: trackerHtml };
})();
