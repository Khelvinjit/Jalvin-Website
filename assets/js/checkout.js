/* ============================================================================
   checkout.js — cart, checkout validation and the WhatsApp order message.
   ========================================================================= */
(function () {
  "use strict";
  const S = window.Store, C = window.CONFIG;

  /* ---------- cart rendering ---------------------------------------------
     Halal and non-halal are rendered as two labelled groups and stay apart all
     the way into the WhatsApp message, so the two can never end up in one bag. */
  function lineHtml(l) {
    const p = l.product;
    return '<div class="line" data-line="' + S.esc(p.id) + '">' +
      '<img src="' + S.esc(p.image) + '" alt="" width="58" height="58">' +
      "<div>" +
        '<div class="line__name">' + S.esc(p.ms) + "</div>" +
        '<div class="line__meta">' + S.esc(p.pack) + " · " + S.money(p.price) + " each</div>" +
        '<div class="stepper" data-id="' + S.esc(p.id) + '" style="margin-top:7px;width:max-content">' +
          '<button type="button" data-step="-1" aria-label="One less">&minus;</button>' +
          "<span>" + l.qty + "</span>" +
          '<button type="button" data-step="1" aria-label="One more">+</button>' +
        "</div>" +
      "</div>" +
      '<div class="line__right">' +
        '<span class="line__total">' + S.money(l.total) + "</span>" +
        '<button type="button" class="link-remove" data-remove="' + S.esc(p.id) + '">Remove</button>' +
      "</div></div>";
  }

  function renderCart(host) {
    const lines = S.cartLines();
    if (!lines.all.length) {
      host.innerHTML =
        '<div class="empty"><h3>Your basket is empty</h3>' +
        "<p>Pick what you need for the week and we'll buy it fresh on delivery morning.</p>" +
        '<a class="btn btn--primary" href="shop.html">Browse this week\'s produce</a></div>';
      return false;
    }
    let html = "";
    if (lines.halal.length) {
      html += '<div class="cart-group-head halal">Halal items</div>' +
              lines.halal.map(lineHtml).join("");
    }
    if (lines.nonhalal.length) {
      html += '<div class="cart-group-head nonhalal">Non-halal — packed &amp; delivered separately</div>' +
              lines.nonhalal.map(lineHtml).join("");
    }
    host.innerHTML = html;
    return true;
  }

  function renderTotals(host) {
    const t = S.totals();
    let html = '<div class="totals">' +
      "<div><span>Subtotal</span><span class=\"money\">" + S.money(t.subtotal) + "</span></div>" +
      "<div><span>Delivery" + (t.freeDelivery ? " <b style=\"color:var(--green)\">(free)</b>" : "") +
        "</span><span class=\"money\">" + (t.freeDelivery ? "RM0.00" : S.money(t.delivery)) + "</span></div>" +
      "<div class=\"grand\"><span>Total</span><span class=\"money\">" + S.money(t.grand) + "</span></div>" +
      "</div>";

    if (t.belowMinimum) {
      html += '<div class="notice notice--warn" style="margin-top:14px">Minimum order is <b>' +
        S.money(C.minimumOrder) + "</b>. Add <b>" + S.money(t.shortBy) +
        "</b> more to check out.</div>";
    } else if (!t.freeDelivery && t.subtotal > 0) {
      html += '<div class="notice notice--info" style="margin-top:14px">Add <b>' +
        S.money(t.awayFromFree) + "</b> more and delivery is free.</div>";
    }
    host.innerHTML = html;
    return t;
  }

  /* ---------- the WhatsApp order message ---------------------------------
     Written to be read at a glance on a phone at 5am in the market, because
     that is exactly when the owner will be reading it. */
  /* One item line. The fields are separated by a middot rather than wrapped in
     brackets, because pack sizes contain their own brackets ("≈ 500g (4–5 ekor)")
     and the admin panel has to be able to parse this back unambiguously. */
  function itemLine(l) {
    return "• " + l.qty + " x " + l.name + " · " + l.pack + " · " + S.money(l.total);
  }

  function buildMessage(order) {
    const L = [];
    L.push("*JALVIN FRESH — NEW ORDER*");
    L.push("Order no: *" + order.ref + "*");
    L.push("");
    L.push("*DELIVERY*");
    L.push(order.deliveryText);
    L.push(order.window);
    L.push("");
    L.push("*CUSTOMER*");
    L.push(order.name);
    L.push(order.phone);
    L.push(order.address);
    L.push(order.neighbourhood + ", " + order.postcode + " " + C.allowedAreaName);
    L.push("");

    if (order.halal.length) {
      L.push("*ITEMS*");
      order.halal.forEach(l => L.push(itemLine(l)));
      L.push("");
    }
    if (order.nonhalal.length) {
      L.push("*NON-HALAL — PACK SEPARATELY*");
      order.nonhalal.forEach(l => L.push(itemLine(l)));
      L.push("");
    }

    L.push("Subtotal: " + S.money(order.subtotal));
    L.push("Delivery: " + (order.delivery ? S.money(order.delivery) : "FREE"));
    L.push("*TOTAL: " + S.money(order.grand) + "*");
    L.push("");
    L.push("*If something is out of stock:*");
    L.push(order.substitutionLabel);
    if (order.notes) {
      L.push("");
      L.push("*Notes:* " + order.notes);
    }
    L.push("");
    L.push("I have paid " + S.money(order.grand) + " by DuitNow QR with reference " + order.ref +
           ". My receipt screenshot is attached.");
    return L.join("\n");
  }

  /* ---------- validation --------------------------------------------------- */
  function validate(form) {
    const errors = {};
    const v = name => (form.querySelector('[name="' + name + '"]') || {}).value || "";

    if (v("name").trim().length < 2) errors.name = "Please tell us your name.";

    if (!S.isValidMyMobile(v("phone"))) {
      errors.phone = "Enter a Malaysian mobile number, e.g. 012-345 6789.";
    }

    const pc = v("postcode").trim();
    if (!pc) errors.postcode = "Postcode is required.";
    else if (C.allowedPostcodes.indexOf(pc) === -1) {
      errors.postcode = "Sorry — we only deliver to " + C.allowedAreaName + " (" +
        C.allowedPostcodes.join(" and ") + ") for now.";
    }

    if (v("address").trim().length < 6) {
      errors.address = "We need your unit and block to find you.";
    }
    if (!v("delivery")) errors.delivery = "Pick a delivery date.";
    if (!v("substitution")) errors.substitution = "Tell us what to do if something sells out.";

    return errors;
  }

  function showErrors(form, errors) {
    S.$$("[data-err]", form).forEach(el => el.classList.remove("show"));
    S.$$(".is-error", form).forEach(el => el.classList.remove("is-error"));
    let first = null;
    Object.keys(errors).forEach(k => {
      const box = form.querySelector('[data-err="' + k + '"]');
      const input = form.querySelector('[name="' + k + '"]');
      if (box) { box.textContent = errors[k]; box.classList.add("show"); }
      if (input) { input.classList.add("is-error"); if (!first) first = input; }
      if (!first && box) first = box;
    });
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    return !Object.keys(errors).length;
  }

  window.Checkout = {
    renderCart: renderCart, renderTotals: renderTotals,
    buildMessage: buildMessage, itemLine: itemLine, validate: validate,
    showErrors: showErrors,
  };
})();
