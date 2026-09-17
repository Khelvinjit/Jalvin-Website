# Jalvin Fresh

A complete online shop for a **pre-order fresh grocery business in Cyberjaya**.

> Customer orders and pays by DuitNow QR → you verify the payment → you buy from the
> farmer → you deliver on Wednesday or Saturday.

No server, no database, no monthly bill. It is plain HTML, CSS and JavaScript, so it runs on
free hosting and you can change a price without a developer.

---

## Try it right now

Double-click `index.html`. That's it — no install, no build step. Everything works offline
except the WhatsApp links.

To see it exactly as a customer would, serve it over HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

The owner panel is at `admin.html`. The passcode is `jalvin2026` until you change it.

---

## Before you go live — the checklist

Work through this in order. It takes about 30 minutes.

### 1. Your business details (required by law)

Open `assets/js/config.js` and fill in the `business` block:

```js
name:       "Jalvin Fresh",
ssmNumber:  "SSM: 202601234567 (XXXXXXXX-X)",   // ← your real SSM number
email:      "hello@jalvinfresh.my",              // ← your real email
whatsapp:   "60123456789",                       // ← no +, no spaces, no dashes
```

**This is not optional.** The Consumer Protection (Electronic Trade Transactions) Regulations
2012 require a Malaysian online seller to display its registered business name, SSM
registration number, email address, phone number, a description of the goods, the full price
including all charges, the payment terms and the estimated delivery time — and to keep
transaction records for two years. All of that is already built into the site; it just needs
your real details instead of the placeholders. They appear in the footer of every page and on
`policies.html`.

You also need SSM registration to open a business bank account. Use one: a personal account
has daily DuitNow receipt limits that a growing shop will hit.

### 2. Your DuitNow QR

Replace `assets/img/duitnow-qr.svg` with a screenshot or photo of **your own** DuitNow QR.
If you save it as a `.png` or `.jpg`, update this line in `config.js` to match:

```js
qrImage: "assets/img/duitnow-qr.svg",
```

### 3. Change the admin passcode

In `config.js`:

```js
admin: { passcode: "jalvin2026" },   // ← change this
```

**Be honest with yourself about what this protects.** There is no server, so anyone who knows
how to view page source can read that passcode. It keeps casual visitors out of your panel —
nothing more. It is not protecting your money, because payments go straight to your bank and
never touch this website.

### 4. Delete the owner reminder box

`policies.html` has a yellow box addressed to you, explaining what to fill in. Delete that
block once you're done — it starts with `<div class="notice notice--warn" id="owner-todo"`.

### 5. Check your prices and margins

Open `admin.html` → **Prices & products**. Every item has a cost price (what you pay at the
market) and a selling price, and the panel shows your margin on each. Anything under 20% is
flagged red — packaging and fuel have to come out of that.

---

## Putting it on the internet (free)

**Cloudflare Pages** is the recommendation: free, unlimited bandwidth, and its free tier
explicitly allows commercial use.

1. Push this folder to a GitHub repository.
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → *Create a project* → connect
   your GitHub repo.
3. Build command: **leave empty**. Build output directory: **leave empty** (or `/`).
4. Deploy. You get a free `yourname.pages.dev` address in about a minute.
5. Optional: attach your own domain (roughly RM60–80/year from any Malaysian registrar).

> **Not GitHub Pages.** GitHub's terms say Pages "is not intended for or allowed to be used as
> a free web hosting service to run your online business". Fine for a demo, wrong for a real
> shop. Netlify's free tier is another fine option.

---

## Day-to-day: how you actually run this

### Changing prices (do this weekly)

1. Open `admin.html`, unlock.
2. Edit prices in the table. A yellow banner appears saying customers can't see the changes yet.
3. Click **Publish → download products.js**.
4. Upload that file to your site's `data/` folder, replacing the old `products.js`.

If you're on Cloudflare Pages via GitHub, "upload" means committing the new file — drag it
into the GitHub web interface and the site redeploys itself in under a minute.

### Taking an order

1. Customer sends you a WhatsApp message with their whole order in it, plus a payment receipt.
2. Check your **bank account** — not the receipt screenshot; screenshots can be edited.
3. In `admin.html` → **Orders**, long-press the WhatsApp message, copy, and paste it into the
   box. It fills itself in and warns you if anything doesn't add up.
4. Set the status to **Payment verified** and reply to the customer.

### Shopping day

`admin.html` → **Farm list**. Pick the delivery date. You get:

- every item across every order, added up into one list ("Kangkung × 7 ikat")
- what it should cost you at the market
- what your customers have already paid you
- what's left over for you
- all the deliveries grouped by condo so you can plan the route

Hit **Print** and take it with you. This one screen is the difference between a calm market
run and scrolling forty WhatsApp chats at 5am.

### Letting customers track their order

`admin.html` → **Orders** → set each status → **Publish statuses**. Upload the downloaded
`order-status.js` to `data/`. Customers can then look up their order number on `track.html`.

Do this once or twice a day — WhatsApp is still how customers really hear from you; the
tracking page is for the ones who'd rather not message you at 11pm.

### Reviews

`admin.html` → **Reviews**. Type in reviews you receive. Then:

- **5 stars + they gave permission** → approve it → it goes on your homepage
- **5 stars, no permission yet** → sits in "waiting for approval"
- **Under 5 stars** → stays private, forever. It never appears on the website. There's a box to
  write down what you did about it.

Publish with **Publish → download reviews.js**, then upload to `data/`.

> The homepage says out loud that these are your 5-star reviews and not a complete picture.
> That's deliberate. Customers can tell when a review page is too perfect, and saying it
> plainly builds more trust than pretending.

---

## What's in here

```
index.html       Homepage — hero, how it works, popular items, reviews
shop.html        Full catalogue, category filter, search
cart.html        Basket → delivery details → DuitNow QR → WhatsApp
track.html       Order status lookup + the customer's own order history
review.html      Star rating and feedback form
faq.html         How it works, cut-offs, refunds
policies.html    T&C, refunds, delivery, halal handling, PDPA privacy notice
admin.html       Owner panel (passcode-gated)

assets/js/config.js      ← EVERY business setting lives here
assets/js/store.js       Data, cart, cut-off logic, shared header/footer
assets/js/checkout.js    Validation and the WhatsApp order message
assets/js/admin.js       Order parsing, farm list, file exports
assets/css/styles.css    The whole design system
assets/fonts/            Self-hosted webfonts (see the README in there)
assets/img/products/     53 product illustrations

data/products.js         Your catalogue — the file you republish on price changes
data/reviews.js          Approved 5-star reviews only
data/order-status.js     Order number → status

tools/                   Generators and tests — not part of the website
```

### Swapping the drawings for real photos

Every product uses a hand-drawn SVG so the site looks finished from day one. To use a real
photo instead, drop a square image into `assets/img/products/` and point the product's `image`
field at it. Square, at least 600×600, shot on a plain background.

Take your own photos rather than pulling them off the internet — customers can tell, and stock
photos of vegetables are one of the fastest ways to look like a dropshipper.

---

## Tests

```bash
node tools/test-cutoffs.js    # order cut-offs, across timezones
node tools/test-parser.js     # WhatsApp message round-trip + farm list maths
python3 -m http.server 8765 & # the browser tests need the site served
node tools/test-order.js      # full customer order flow
node tools/test-admin.js      # admin panel, exports, review moderation
node tools/test-pages.js      # every page at phone and desktop width
```

To regenerate the product illustrations and `data/products.js` from
`tools/products.py`:

```bash
python3 tools/generate.py
```

---

## Things to sort out that aren't code

These came up while building this and are worth a phone call each.

**Halal segregation.** You sell halal chicken and pork. That means separate storage, separate
cooler boxes, separate bags, separate handling, and ideally separate delivery runs. The shop as
a whole cannot be described as halal, and the site doesn't claim it is. The website enforces
the separation in the basket and in the order message you receive — the physical separation is
on you, and customers will forgive almost anything except getting this wrong.

**Food premise licence.** Repacking raw fish and chicken may require a licence from Majlis
Bandaraya Sepang. Worth one phone call before you scale up.

**Cold chain.** Fish and chicken need to stay between 0–4°C from the market to the customer's
door. Insulated cooler boxes, plenty of ice packs, and the tightest delivery route you can
manage. This is the single most likely thing to generate a complaint.

**Costs that are easy to forget.** Packaging runs about RM1.50–2.50 per order once you count
insulated bags and ice packs, and you should buy roughly 5% extra to cover spoilage and
short-weight packs. Both come out of your RM5 delivery fee and your margin — the admin panel
shows you what's left after the farm cost, but not after these.

**Cash flow is in your favour, but only just.** Customers pay before you buy, so you're never
out of pocket. But the money sits in your account for a day or two before you spend it — don't
mistake it for profit.

**Cheap ways to grow, in the order I'd do them:**
1. A WhatsApp broadcast list with the week's price list, sent every Monday and Thursday. Free,
   and the single most effective channel this business has.
2. "Order again" on the tracking page — already built. A weekly grocery order should take one
   tap, not fifteen.
3. Referral: bring a neighbour, both get RM5 off. Cyberjaya is condo-dense; one building can be
   an entire delivery route.
4. Group orders by condo. The farm list already groups your deliveries by area — lean into it.

**If you outgrow WhatsApp.** Every piece of data access in the site funnels through
`assets/js/store.js`. Moving to a real database (Supabase's free tier would do it) means
changing that one file, not rewriting the site.

---

## Licence

MIT — see `LICENSE`. The two webfonts are SIL Open Font License 1.1; see
`assets/fonts/README.txt`.
