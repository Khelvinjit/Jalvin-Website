/* Order statuses shown on track.html.
   The owner updates these in the admin panel, exports this file and uploads it.
   Status ids come from CONFIG.orderStatuses in assets/js/config.js. */
window.ORDER_STATUS_DATA = {
  updated: "2026-09-17",
  orders: {
    "JV-260917-0417": { status: "buying",    delivery: "2026-09-19", note: "At the market now — your ikan kembung is in the box." },
    "JV-260916-2288": { status: "out",       delivery: "2026-09-19", note: "Driver left at 9:05am, you are third stop." },
    "JV-260915-1043": { status: "delivered", delivery: "2026-09-16", note: "Delivered 10:22am, handed to you at the door." },
    "JV-260917-7781": { status: "awaiting",  delivery: "2026-09-23", note: "" },
    "JV-260914-5502": { status: "refunded",  delivery: "2026-09-16", note: "Ikan bawal sold out before we reached the stall. Refunded RM32 on 16 Sep." },
  },
};
