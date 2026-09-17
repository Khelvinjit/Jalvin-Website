/* ============================================================================
   reviews.js — the star picker and review submission.

   A review is sent to the owner over WhatsApp like everything else. The owner
   then decides in the admin panel whether it gets published.

   The publishing rule the owner asked for: 5-star reviews may be published
   after approval; anything below 5 stars is for the owner's eyes only, to act
   on. Because that means the public page shows only the best reviews, the page
   says so plainly rather than implying it is the full picture.
   ========================================================================= */
(function () {
  "use strict";
  const S = window.Store, C = window.CONFIG;

  function mountPicker(host, onChange) {
    let value = 0;
    host.innerHTML = [1, 2, 3, 4, 5].map(n =>
      '<button type="button" data-star="' + n + '" aria-label="' + n +
      ' star' + (n > 1 ? "s" : "") + '">' + S.ICONS.star + "</button>").join("");

    function paint(v) {
      S.$$("button", host).forEach(b =>
        b.classList.toggle("on", Number(b.getAttribute("data-star")) <= v));
    }
    host.addEventListener("click", e => {
      const b = e.target.closest("[data-star]");
      if (!b) return;
      value = Number(b.getAttribute("data-star"));
      paint(value);
      onChange(value);
    });
    // Hover preview, but never on touch — it would stick after a tap.
    host.addEventListener("mouseover", e => {
      const b = e.target.closest("[data-star]");
      if (b && matchMedia("(hover:hover)").matches) paint(Number(b.getAttribute("data-star")));
    });
    host.addEventListener("mouseleave", () => paint(value));
    return () => value;
  }

  function buildMessage(r) {
    const L = [];
    L.push("*JALVIN FRESH — CUSTOMER REVIEW*");
    L.push(r.stars + " out of 5 stars");
    L.push("");
    L.push("From: " + r.name + (r.area ? " (" + r.area + ")" : ""));
    if (r.ref) L.push("Order: " + r.ref);
    L.push("");
    L.push(r.text);
    L.push("");
    if (r.improve) { L.push("*What we could do better:*"); L.push(r.improve); L.push(""); }
    L.push(r.stars === 5
      ? "I'm happy for this to be published on your website."
      : "This one is for you, not the website.");
    return L.join("\n");
  }

  window.Reviews = { mountPicker: mountPicker, buildMessage: buildMessage };
})();
