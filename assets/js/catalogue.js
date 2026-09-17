/* ============================================================================
   catalogue.js — the product grid, category filter and search.
   ========================================================================= */
(function () {
  "use strict";
  const S = window.Store, C = window.CONFIG;

  function card(p) {
    const nonhalal = S.isNonHalal(p);
    const inCart = S.getCart()[p.id] || 0;
    const out = p.inStock === false;

    let badge = "";
    if (out) badge = '<span class="badge badge--out">Sold out</span>';
    else if (nonhalal) badge = '<span class="badge badge--nonhalal">Non-halal</span>';

    const control = out
      ? '<span class="tiny muted">Back next week</span>'
      : (inCart
          ? '<div class="stepper" data-id="' + S.esc(p.id) + '">' +
              '<button type="button" data-step="-1" aria-label="One less ' + S.esc(p.ms) + '">&minus;</button>' +
              '<span data-qty>' + inCart + "</span>" +
              '<button type="button" data-step="1" aria-label="One more ' + S.esc(p.ms) + '">+</button>' +
            "</div>"
          : '<button type="button" class="product__add" data-add="' + S.esc(p.id) + '" ' +
              'aria-label="Add ' + S.esc(p.ms) + ' to cart">+</button>');

    return '<article class="product' + (nonhalal ? " product--nonhalal" : "") +
             (out ? " is-out" : "") + '" data-card="' + S.esc(p.id) + '">' +
        badge +
        '<img class="product__img" src="' + S.esc(p.image) + '" alt="' + S.esc(p.ms) +
          '" loading="lazy" width="160" height="160">' +
        '<div class="product__body">' +
          '<div class="product__ms">' + S.esc(p.ms) + "</div>" +
          '<div class="product__en">' + S.esc(p.en) + "</div>" +
          '<span class="product__pack">' + S.esc(p.pack) + "</span>" +
          (p.note ? '<p class="product__note">' + S.esc(p.note) + "</p>" : "") +
          '<div class="product__foot">' +
            '<span class="product__price">' + S.money(p.price) + "</span>" +
            control +
          "</div>" +
        "</div></article>";
  }

  /* Re-render just one card so the grid does not flicker on every tap. */
  function refreshCard(id) {
    const el = document.querySelector('[data-card="' + CSS.escape(id) + '"]');
    const p = S.productById(id);
    if (!el || !p) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = card(p);
    el.replaceWith(tmp.firstElementChild);
  }

  function render(host, products, emptyMsg) {
    if (!products.length) {
      host.innerHTML = '<div class="empty"><h3>Nothing here yet</h3><p>' +
        S.esc(emptyMsg || "Try another category or clear your search.") + "</p></div>";
      return;
    }
    host.innerHTML = products.map(card).join("");
  }

  /* One delegated listener for the whole grid. */
  function wire(host) {
    host.addEventListener("click", e => {
      const add = e.target.closest("[data-add]");
      if (add) {
        const id = add.getAttribute("data-add");
        const p = S.productById(id);
        S.addToCart(id, 1);
        refreshCard(id);
        S.toast(p.ms + " added to your basket");
        return;
      }
      const step = e.target.closest("[data-step]");
      if (step) {
        const box = step.closest(".stepper");
        const id = box.getAttribute("data-id");
        const p = S.productById(id);
        const now = S.getCart()[id] || 0;
        const want = now + Number(step.getAttribute("data-step"));
        const got = S.setQty(id, want);
        if (want > got && p.cap) S.toast("We can only source " + p.cap + " of " + p.ms + " this round");
        refreshCard(id);
      }
    });
  }

  window.Catalogue = { card: card, render: render, wire: wire, refreshCard: refreshCard };
})();
