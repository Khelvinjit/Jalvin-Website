/* The owner pastes the WhatsApp message a customer sent straight into the
   admin panel. We wrote that message format ourselves, so this test proves we
   can read our own format back without losing anything. */
const path = require('path');
const R = f => require(path.join(__dirname, '..', f));
global.window = { CONFIG: R('assets/js/config.js') };
global.document = { addEventListener() {}, getElementById() { return null; },
                    querySelector() { return null; }, querySelectorAll() { return []; } };
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; },
                        setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
R('data/products.js'); R('assets/js/store.js'); R('assets/js/checkout.js'); R('assets/js/admin.js');
const S = window.Store, K = window.Checkout, A = window.Admin;

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) console.log(`       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`);
}

const original = {
  ref: 'JV-260917-0417',
  name: 'Aina Rahman',
  phone: '60123456789',
  address: 'A-12-3, Block A, Jalan Impact',
  neighbourhood: 'Tamarind Square',
  postcode: '63000',
  deliveryText: 'Wednesday, 23 Sep 2026',
  window: '9:00 AM – 12:00 PM',
  substitutionLabel: 'Substitute with something similar',
  notes: 'Please call when downstairs, lift is slow',
  halal: [
    { id: 'kangkung',     name: 'Kangkung',     pack: '1 ikat ≈ 250g', qty: 2, total: 5.00 },
    { id: 'ikan-kembung', name: 'Ikan Kembung', pack: '≈ 500g (4–5 ekor)', qty: 1, total: 16.00 },
  ],
  nonhalal: [
    { id: 'pork-belly', name: 'Pork Belly (Samchan)', pack: '≈ 500g', qty: 1, total: 22.00 },
  ],
  subtotal: 43.00, delivery: 5.00, grand: 48.00,
};

const msg = K.buildMessage(original);
console.log('--- generated message ---\n' + msg + '\n--- end ---\n');
const p = A.parseOrder(msg);

check('order number survives',        p.ref, original.ref);
check('customer name survives',       p.name, original.name);
check('phone survives',               p.phone, original.phone);
check('address survives',             p.address, 'A-12-3, Block A, Jalan Impact, Tamarind Square, 63000 Cyberjaya');
check('delivery date text survives',  p.deliveryText, original.deliveryText);
check('delivery date -> ISO',         p.deliveryIso, '2026-09-23');
check('time window survives',         p.window, original.window);
check('halal item count',             p.halal.length, 2);
check('non-halal item count',         p.nonhalal.length, 1);
check('halal items stay halal',       p.halal.map(l => l.name), ['Kangkung', 'Ikan Kembung']);
check('pork stays in the non-halal list', p.nonhalal.map(l => l.name), ['Pork Belly (Samchan)']);
check('quantities survive',           p.halal.map(l => l.qty), [2, 1]);
check('line totals survive',          p.halal.map(l => l.total), [5, 16]);
check('pack size with parens in the name parses',
      p.nonhalal[0].pack, '≈ 500g');
check('items match back to catalogue ids',
      p.halal.concat(p.nonhalal).map(l => l.id), ['kangkung', 'ikan-kembung', 'pork-belly']);
check('cost prices attached for margin maths',
      p.halal.concat(p.nonhalal).every(l => typeof l.cost === 'number'), true);
check('subtotal survives',            p.subtotal, 43);
check('delivery fee survives',        p.delivery, 5);
check('grand total survives',         p.grand, 48);
check('substitution choice survives', p.substitutionLabel, original.substitutionLabel);
check('customer note survives',       p.notes, original.notes);
check('a clean order raises no warnings', A.validateOrder(p), []);

console.log('\n-- free delivery variant --');
const freeOrder = Object.assign({}, original, { delivery: 0, subtotal: 90, grand: 90,
  halal: [{ id: 'udang-harimau', name: 'Udang Harimau', pack: '≈ 500g', qty: 2, total: 90 }],
  nonhalal: [] });
const pf = A.parseOrder(K.buildMessage(freeOrder));
check('free delivery parses as 0',    pf.delivery, 0);
check('total still parses',           pf.grand, 90);
check('no non-halal section when there is no pork', pf.nonhalal.length, 0);

console.log('\n-- garbage in --');
const junk = A.parseOrder('hello can I order some vegetables please');
check('junk text is rejected with reasons', A.validateOrder(junk).length >= 2, true);

console.log('\n-- tampered total is caught --');
const bad = A.parseOrder(K.buildMessage(original).replace('Subtotal: RM43.00', 'Subtotal: RM13.00'));
check('mismatched subtotal is flagged',
      A.validateOrder(bad).some(x => /add up to/.test(x)), true);

console.log('\n-- farm list aggregation --');
A.setOrders([p, A.parseOrder(K.buildMessage(Object.assign({}, original, { ref: 'JV-260917-0418' })))]);
const fl = A.farmList('2026-09-23');
check('both orders counted',          fl.orderCount, 2);
check('kangkung quantities summed across orders',
      fl.rows.find(r => r.name === 'Kangkung').qty, 4);
check('ikan kembung summed', (fl.rows.find(r => r.name === 'Ikan Kembung') || {}).qty, 2);
check('money collected is the sum of order totals', fl.collected, 96);
check('estimated farm cost is computed', fl.estCost > 0, true);
check('profit = collected - cost',    fl.estProfit, +(fl.collected - fl.estCost).toFixed(2));
check('non-halal rows sort last',     fl.rows[fl.rows.length - 1].name, 'Pork Belly (Samchan)');
check('cancelled orders are excluded from the farm list', (() => {
  const c = Object.assign({}, p, { status: 'cancelled' });
  A.setOrders([c]);
  return A.farmList('2026-09-23').orderCount;
})(), 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
