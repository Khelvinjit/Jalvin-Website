/* End-to-end order test: basket -> details -> payment -> WhatsApp message.
   Run with the local server up:  node tools/test-order.js  */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';

let pass = 0, fail = 0;
function check(name, ok, extra) {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok && extra) console.log('       ' + String(extra).slice(0, 400));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // ---- below the minimum order is refused --------------------------------
  await page.goto(BASE + '/shop.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(BASE + '/shop.html', { waitUntil: 'networkidle' });
  await page.click('[data-add="kangkung"]');                       // RM2.50
  await page.goto(BASE + '/cart.html', { waitUntil: 'networkidle' });
  check('below minimum blocks checkout',
        await page.isDisabled('#to-details'));
  check('below minimum explains how much more is needed',
        (await page.textContent('#cart-totals')).includes('Add'));

  // ---- halal and non-halal are kept apart in the basket -------------------
  await page.goto(BASE + '/shop.html', { waitUntil: 'networkidle' });
  for (const id of ['ikan-kembung', 'ayam-standard', 'pork-belly']) {
    await page.click(`[data-add="${id}"]`);
  }
  await page.goto(BASE + '/cart.html', { waitUntil: 'networkidle' });
  const groups = await page.$$eval('.cart-group-head', els => els.map(e => e.textContent.trim()));
  check('basket shows a halal group', groups.some(g => /^Halal items/.test(g)), groups);
  check('basket shows a separate non-halal group',
        groups.some(g => /Non-halal/i.test(g) && /separately/i.test(g)), groups);
  check('checkout now enabled (RM56.50 > RM30 minimum)',
        await page.isEnabled('#to-details'));

  // ---- a non-Cyberjaya postcode is refused -------------------------------
  await page.click('#to-details');
  await page.waitForSelector('#step-details:not([hidden])');
  const codes = await page.$$eval('#postcode option', o => o.map(x => x.value).filter(Boolean));
  check('only Cyberjaya postcodes are selectable', JSON.stringify(codes) === '["63000","63100"]', codes);

  // Submitting with nothing filled in must surface field errors, not proceed.
  await page.click('#details-form button[type="submit"]');
  await page.waitForTimeout(250);
  const shown = await page.$$eval('.err.show', e => e.map(x => x.getAttribute('data-err')));
  check('empty form is rejected with field errors', shown.length >= 3, shown);
  check('still on the details step', !(await page.isHidden('#step-details')));

  // ---- a bad phone number is refused -------------------------------------
  await page.fill('#name', 'Aina Rahman');
  await page.fill('#phone', '12345');
  await page.selectOption('#postcode', '63000');
  await page.fill('#address', 'A-12-3, Block A, Jalan Impact');
  await page.click('#details-form button[type="submit"]');
  await page.waitForTimeout(250);
  check('short phone number is rejected',
        await page.isVisible('[data-err="phone"].show'));

  // ---- a valid order goes through ----------------------------------------
  await page.fill('#phone', '012-345 6789');
  await page.selectOption('#neighbourhood', 'Tamarind Square');
  await page.fill('#notes', 'Please call when downstairs');
  await page.click('#details-form button[type="submit"]');
  await page.waitForSelector('#step-pay:not([hidden])', { timeout: 4000 });
  check('valid order reaches the payment step', true);

  const ref = (await page.textContent('#ref')).trim();
  check('order reference looks like JV-YYMMDD-NNNN', /^JV-\d{6}-\d{4}$/.test(ref), ref);
  check('amount to pay is shown', (await page.textContent('#pay-amount')).startsWith('RM'));
  check('QR image is rendered', await page.isVisible('#qr'));

  // ---- the WhatsApp message itself ---------------------------------------
  const href = await page.getAttribute('#send-wa', 'href');
  check('WhatsApp link points at the configured number',
        href.startsWith('https://wa.me/60123456789?text='), href.slice(0, 60));
  const msg = decodeURIComponent(href.split('?text=')[1]);

  check('message carries the order number', msg.includes(ref));
  check('message lists halal items under their own heading',
        /\*ITEMS\*/.test(msg) && msg.includes('Ikan Kembung'));
  check('message flags non-halal items to pack separately',
        /\*NON-HALAL — PACK SEPARATELY\*/.test(msg) && msg.includes('Pork Belly'), msg);
  check('non-halal block comes after the halal block',
        msg.indexOf('NON-HALAL') > msg.indexOf('*ITEMS*'));
  check('message includes pack sizes', msg.includes('≈ 500g'));
  check('message includes the delivery date', /Wednesday|Saturday/.test(msg));
  check('message includes the substitution preference',
        msg.includes('If something is out of stock'));
  check('message includes the customer note', msg.includes('Please call when downstairs'));
  check('message asks for the payment receipt', /receipt/i.test(msg));

  // Totals in the message must match what the page showed.
  const shownTotal = (await page.textContent('#pay-amount')).trim();
  check(`message total matches the page (${shownTotal})`,
        msg.includes('*TOTAL: ' + shownTotal + '*'), msg.match(/\*TOTAL:[^*]*\*/));

  // Delivery fee: RM56.50 subtotal is under RM80, so RM5 applies.
  check('delivery fee applied below the free threshold', msg.includes('Delivery: RM5.00'));

  // ---- free delivery above the threshold ---------------------------------
  await page.goto(BASE + '/shop.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.setItem('jalvin.cart', JSON.stringify({ 'udang-harimau': 2 })); });
  await page.goto(BASE + '/cart.html', { waitUntil: 'networkidle' });
  check('RM90 basket gets free delivery',
        (await page.textContent('#cart-totals')).includes('free'));

  check('no JavaScript errors anywhere in the flow', errors.length === 0, errors.join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
