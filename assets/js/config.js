/* =============================================================================
   JALVIN FRESH — BUSINESS SETTINGS
   =============================================================================
   This is the ONLY file you need to edit to change how the business runs.
   Everything below is plain English. Change the value between the quotes.
   After editing, upload this file again and the whole website updates.
   ========================================================================== */

const CONFIG = {

  /* --- YOUR BUSINESS ------------------------------------------------------ */
  business: {
    name:        "Jalvin Fresh",
    tagline:     "Sayur, ikan & ayam segar dari ladang ke pintu rumah anda",
    taglineEn:   "Farm-fresh vegetables, fish & chicken delivered to your door",

    // TODO: Replace with your real details before going live.
    // These are LEGALLY REQUIRED on a Malaysian online store
    // (Consumer Protection (Electronic Trade Transactions) Regulations 2012).
    ssmNumber:   "SSM: 202601234567 (XXXXXXXX-X)",
    email:       "hello@jalvinfresh.my",

    // WhatsApp number in international format, NO +, NO spaces, NO dashes.
    // Malaysian example: 60123456789  (for 012-345 6789)
    whatsapp:    "60123456789",
    whatsappDisplay: "012-345 6789",

    ownerName:   "Jalvin",
    replyPromise: "We reply to every WhatsApp within 2 hours, 8am–9pm daily.",
    serviceArea: "Cyberjaya only",
  },

  /* --- MONEY -------------------------------------------------------------- */
  currency:        "RM",
  deliveryFee:     5.00,   // Flat delivery charge
  freeDeliveryAbove: 80.00,  // Basket above this = free delivery
  minimumOrder:    30.00,  // Orders below this cannot check out

  /* --- WHERE WE DELIVER --------------------------------------------------- */
  // Only these postcodes can order. Cyberjaya is 63000 and 63100.
  allowedPostcodes: ["63000", "63100"],
  allowedAreaName:  "Cyberjaya",

  // Popular condos/areas — used for the address dropdown and delivery routing.
  neighbourhoods: [
    "Tamarind Square", "Symphony Suites", "The Arc", "Domain NeoCyber",
    "Cybersquare", "Third Avenue", "Sejati Residences", "Alanis Residence",
    "Cyberjaya University College", "MMU Cyberjaya", "Garden Residence",
    "Setia Eco Glades", "Cyber Heights Villa", "Other (I'll type it below)",
  ],

  /* --- DELIVERY DAYS & ORDER CUT-OFFS ------------------------------------- */
  /* This is the backbone of the business. You buy from the farmer AFTER the
     cut-off, so the cut-off must give you enough lead time.

     day:      0=Sunday 1=Monday 2=Tuesday 3=Wednesday 4=Thursday 5=Friday 6=Saturday
     cutoffDay: which day orders close
     cutoffHour / cutoffMinute: 23:59 means 11:59 PM                            */
  deliverySlots: [
    {
      id: "wed",
      label: "Wednesday",
      labelMs: "Rabu",
      day: 3,
      cutoffDay: 1,          // Monday
      cutoffHour: 23,
      cutoffMinute: 59,
      cutoffLabel: "Monday 11:59 PM",
    },
    {
      id: "sat",
      label: "Saturday",
      labelMs: "Sabtu",
      day: 6,
      cutoffDay: 4,          // Thursday
      cutoffHour: 23,
      cutoffMinute: 59,
      cutoffLabel: "Thursday 11:59 PM",
    },
  ],

  // Delivery time windows offered at checkout.
  deliveryWindows: [
    "9:00 AM – 12:00 PM",
    "2:00 PM – 6:00 PM",
    "Any time (I'm flexible)",
  ],

  /* --- WHEN SOMETHING IS OUT OF STOCK ------------------------------------- */
  substitutionOptions: [
    {
      id: "substitute",
      label: "Substitute with something similar",
      note:  "We'll pick the closest item at the same price or cheaper, and refund any difference.",
    },
    {
      id: "refund",
      label: "Just refund me for that item",
      note:  "Refunded to your bank within 24 hours of delivery.",
    },
    {
      id: "call",
      label: "WhatsApp me first, I'll decide",
      note:  "We'll message you from the market before buying anything else.",
    },
  ],

  /* --- PAYMENT ------------------------------------------------------------ */
  payment: {
    method:      "DuitNow QR",
    // Replace assets/img/duitnow-qr.png with a screenshot of YOUR DuitNow QR.
    qrImage:     "assets/img/duitnow-qr.svg",   // replace with a photo/screenshot of YOUR DuitNow QR
    accountName: "JALVIN FRESH ENTERPRISE",
    // Customers must type their order number here so you can match payment to order.
    referenceInstruction: "Type your order number in the DuitNow 'Reference' box",
  },

  /* --- ADMIN PANEL -------------------------------------------------------- */
  admin: {
    /* Passcode for the owner panel. CHANGE THIS.
       Honest warning: this is a website with no server, so the passcode only
       stops casual snooping — anyone who views the page source can read it.
       It protects the convenience of the panel, not your money. Your money is
       protected because payments go straight to your bank, never through
       this site. */
    passcode: "jalvin2026",
  },

  /* --- ORDER STATUSES ----------------------------------------------------- */
  orderStatuses: [
    { id: "awaiting",  en: "Awaiting payment verification", ms: "Menunggu pengesahan bayaran", step: 1 },
    { id: "verified",  en: "Payment verified",              ms: "Bayaran disahkan",            step: 2 },
    { id: "buying",    en: "Buying at the farm",            ms: "Sedang dibeli di ladang",     step: 3 },
    { id: "packed",    en: "Packed & chilled",              ms: "Dibungkus & disejukkan",      step: 4 },
    { id: "out",       en: "Out for delivery",              ms: "Dalam perjalanan",            step: 5 },
    { id: "delivered", en: "Delivered",                     ms: "Telah dihantar",              step: 6 },
    { id: "cancelled", en: "Cancelled",                     ms: "Dibatalkan",                  step: 0 },
    { id: "refunded",  en: "Refunded",                      ms: "Bayaran dikembalikan",        step: 0 },
  ],

  /* --- PRODUCT CATEGORIES ------------------------------------------------- */
  categories: [
    { id: "sayur",   en: "Vegetables",    ms: "Sayur",            icon: "leaf",    halal: true  },
    { id: "ikan",    en: "Fish & Seafood", ms: "Ikan & Makanan Laut", icon: "fish", halal: true  },
    { id: "ayam",    en: "Halal Chicken", ms: "Ayam Halal",       icon: "chicken", halal: true  },
    { id: "nonhalal",en: "Non-Halal (Pork)", ms: "Bukan Halal (Khinzir)", icon: "pork", halal: false },
  ],
};

// Make available to every page.
if (typeof window !== "undefined") window.CONFIG = CONFIG;
if (typeof module !== "undefined") module.exports = CONFIG;
