/* Unit tests for the cut-off logic — the one piece of this site that, if
   wrong, costs real money: an order accepted after the cut-off is one the
   owner has no time left to buy.

   Run: node tools/test-cutoffs.js     (TZ=... node tools/test-cutoffs.js) */
const path = require('path');
global.window = { CONFIG: require(path.join(__dirname, '..', 'assets', 'js', 'config.js')) };
global.document = { addEventListener() {}, getElementById() { return null; } };
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; },
                        setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
require(path.join(__dirname, '..', 'assets', 'js', 'store.js'));
const S = window.Store;

/* A Kuala Lumpur wall-clock time as a real instant (KL is UTC+8, no DST). */
const kl = (y, m, d, hh = 0, mm = 0, ss = 0) =>
  new Date(Date.UTC(y, m - 1, d, hh, mm, ss) - 8 * 3600 * 1000);

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) console.log(`       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`);
}
const dates = now => S.getAvailableDeliveryDates(now, 4).map(s => s.deliveryIso);

/* 2026-09-14 Mon · 09-16 Wed · 09-17 Thu · 09-19 Sat · 09-21 Mon · 09-23 Wed */
console.log('\n-- Wednesday slot closes Monday 11:59 PM --');
check('Mon 23:58 -> Wed 16th still open',
      dates(kl(2026, 9, 14, 23, 58)).includes('2026-09-16'), true);
check('Mon 23:59:30 -> still inside the 11:59 minute',
      dates(kl(2026, 9, 14, 23, 59, 30)).includes('2026-09-16'), true);
check('Tue 00:01 -> Wed 16th gone',
      dates(kl(2026, 9, 15, 0, 1)).includes('2026-09-16'), false);
check('Tue 00:01 -> Sat 19th still offered',
      dates(kl(2026, 9, 15, 0, 1)).includes('2026-09-19'), true);

console.log('\n-- Saturday slot closes Thursday 11:59 PM --');
check('Thu 23:58 -> Sat 19th still open',
      dates(kl(2026, 9, 17, 23, 58)).includes('2026-09-19'), true);
check('Fri 00:01 -> Sat 19th gone',
      dates(kl(2026, 9, 18, 0, 1)).includes('2026-09-19'), false);
check('Fri 00:01 -> next Wed 23rd offered',
      dates(kl(2026, 9, 18, 0, 1)).includes('2026-09-23'), true);

console.log('\n-- ordering on the delivery day itself --');
check('Wed morning -> today is NOT orderable',
      dates(kl(2026, 9, 16, 8, 0)).includes('2026-09-16'), false);
check('Sat morning -> next Wed 23rd is',
      dates(kl(2026, 9, 19, 9, 0)).includes('2026-09-23'), true);

console.log('\n-- ordering is always possible --');
[[2026, 9, 14], [2026, 9, 15], [2026, 9, 16], [2026, 9, 17],
 [2026, 9, 18], [2026, 9, 19], [2026, 9, 20]].forEach(([y, m, d]) => {
  const list = S.getAvailableDeliveryDates(kl(y, m, d, 12, 0), 4);
  check(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} noon offers >=2 dates`,
        list.length >= 2, true);
});

console.log('\n-- dates are always in the future and correctly ordered --');
const sample = S.getAvailableDeliveryDates(kl(2026, 9, 15, 10, 0), 4);
check('all delivery dates are after now',
      sample.every(s => s.deliveryDate > kl(2026, 9, 15, 10, 0)), true);
check('sorted ascending',
      sample.map(s => +s.deliveryDate).slice().sort((a, b) => a - b).join() ===
      sample.map(s => +s.deliveryDate).join(), true);
check('every cut-off precedes its own delivery',
      sample.every(s => s.cutoff < s.deliveryDate), true);
check('only Wednesdays and Saturdays are offered',
      sample.every(s => [3, 6].includes(S.klParts(s.deliveryDate).day)), true);

console.log('\n-- timezone independence --');
check(`same instant gives same dates in TZ=${process.env.TZ || 'system'}`,
      dates(kl(2026, 9, 15, 0, 1)), ['2026-09-19', '2026-09-23', '2026-09-26', '2026-09-30']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
