/* Admin panel end-to-end: unlock, change a price, paste an order, check the
   farm list adds up, and confirm review moderation never leaks a low rating. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';

let pass = 0, fail = 0;
function check(name, ok, extra) {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok && extra !== undefined) console.log('       ' + String(extra).slice(0, 400));
}

const ORDER = `*JALVIN FRESH — NEW ORDER*
Order no: *JV-260917-0417*

*DELIVERY*
Wednesday, 23 Sep 2026
9:00 AM – 12:00 PM

*CUSTOMER*
Aina Rahman
60123456789
A-12-3, Block A, Jalan Impact
Tamarind Square, 63000 Cyberjaya

*ITEMS*
• 4 x Kangkung · 1 ikat ≈ 250g · RM10.00
• 1 x Ikan Kembung · ≈ 500g (4–5 ekor) · RM16.00

*NON-HALAL — PACK SEPARATELY*
• 1 x Pork Belly (Samchan) · ≈ 500g · RM22.00

Subtotal: RM48.00
Delivery: RM5.00
*TOTAL: RM53.00*

*If something is out of stock:*
Substitute with something similar

I have paid RM53.00 by DuitNow QR with reference JV-260917-0417. My receipt screenshot is attached.`;

(async () => {
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'jalvin-dl-'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());

  await page.goto(BASE + '/admin.html', { waitUntil: 'networkidle' });

  // ---- the lock ----------------------------------------------------------
  check('panel is hidden before unlocking', await page.isHidden('#panel'));
  await page.fill('#pass', 'wrong-passcode');
  await page.click('#lock-form button[type=submit]');
  check('wrong passcode is rejected', await page.isVisible('#pass-err.show'));
  check('panel still hidden after a wrong passcode', await page.isHidden('#panel'));

  await page.fill('#pass', 'jalvin2026');
  await page.click('#lock-form button[type=submit]');
  await page.waitForSelector('#panel:not([hidden])');
  check('correct passcode unlocks the panel', true);

  // ---- changing a price ---------------------------------------------------
  const rowSel = 'tr[data-id="kangkung"]';
  const before = await page.inputValue(`${rowSel} input[data-f="price"]`);
  check('kangkung starts at RM2.50', before === '2.50', before);
  check('no unpublished-changes banner at rest',
        !(await page.isVisible('#dirty-banner .notice')));

  await page.fill(`${rowSel} input[data-f="price"]`, '3.20');
  await page.dispatchEvent(`${rowSel} input[data-f="price"]`, 'change');
  await page.waitForTimeout(250);
  check('editing a price warns that it is not published yet',
        (await page.textContent('#dirty-banner')).includes('cannot see yet'));
  check('margin recalculates after a price change',
        (await page.textContent(`${rowSel} td:nth-child(5)`)).trim() === '44%',
        await page.textContent(`${rowSel} td:nth-child(5)`));

  // The shop must show the new price on this device straight away.
  const shop = await ctx.newPage();
  await shop.goto(BASE + '/shop.html', { waitUntil: 'networkidle' });
  const shopPrice = await shop.textContent('[data-card="kangkung"] .product__price');
  check('shop reflects the new price immediately', shopPrice.trim() === 'RM3.20', shopPrice);
  await shop.close();

  // ---- exporting produces a file the site can actually load ---------------
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#p-export')]);
  const file = path.join(downloads, 'products.js');
  await dl.saveAs(file);
  const exported = fs.readFileSync(file, 'utf8');
  check('exported file is named products.js', dl.suggestedFilename() === 'products.js');
  check('exported file assigns window.PRODUCTS_DATA', exported.includes('window.PRODUCTS_DATA ='));
  check('exported file carries the new price', /"price":\s*3\.2/.test(exported));

  // Load the exported file the way a browser would, to prove it is valid.
  const sandbox = { window: {} };
  require('vm').createContext(sandbox);
  require('vm').runInContext(exported, sandbox);
  const reloaded = sandbox.window.PRODUCTS_DATA;
  check('exported file parses as valid JavaScript', !!reloaded);
  check('exported file keeps every product', reloaded.products.length === 53, reloaded.products.length);
  check('exported kangkung price is 3.20',
        reloaded.products.find(p => p.id === 'kangkung').price === 3.2);

  // ---- marking something sold out ----------------------------------------
  await page.uncheck('tr[data-id="petai"] input[data-f="inStock"]');
  await page.waitForTimeout(200);
  const shop2 = await ctx.newPage();
  await shop2.goto(BASE + '/shop.html', { waitUntil: 'networkidle' });
  check('sold-out item is shown as sold out on the shop',
        await shop2.isVisible('[data-card="petai"] .badge--out'));
  check('sold-out item cannot be added to a basket',
        !(await shop2.isVisible('[data-card="petai"] [data-add]')));
  await shop2.close();

  // ---- undo ---------------------------------------------------------------
  await page.click('#p-revert');
  await page.waitForTimeout(250);
  check('undo restores the original price',
        (await page.inputValue(`${rowSel} input[data-f="price"]`)) === '2.50');
  check('undo clears the unpublished-changes banner',
        !(await page.isVisible('#dirty-banner .notice')));

  // ---- pasting a WhatsApp order ------------------------------------------
  await page.click('[data-tab="orders"]');
  await page.fill('#o-paste', ORDER);
  await page.click('#o-check');
  await page.waitForTimeout(300);
  check('a clean pasted order is accepted',
        (await page.textContent('#o-preview')).includes('Looks good'),
        await page.textContent('#o-preview'));
  await page.click('#o-save');
  await page.waitForTimeout(300);
  check('saved order appears in the table',
        (await page.textContent('#o-table')).includes('JV-260917-0417'));
  check('saved order shows the customer name',
        (await page.textContent('#o-table')).includes('Aina Rahman'));

  // ---- the farm list ------------------------------------------------------
  await page.click('[data-tab="farm"]');
  await page.waitForTimeout(300);
  const farm = await page.textContent('#f-table');
  check('farm list lists kangkung', farm.includes('Kangkung'));
  const farmRows = await page.$$eval('#f-table tbody tr', rows => rows.map(r => ({
    name: r.cells[0].textContent.trim(), qty: r.cells[2].textContent.trim(),
    cost: r.cells[3].textContent.trim() })));
  const kRow = farmRows.find(r => r.name === 'Kangkung');
  check('farm list carries the right quantity (4 ikat)', kRow && kRow.qty === '4', farmRows);
  check('farm list costs the quantity, not one unit (4 x RM1.80)',
        kRow && kRow.cost === 'RM7.20', kRow);
  check('farm list flags the non-halal row',
        (await page.innerHTML('#f-table')).includes('non-halal'));
  check('farm summary shows money collected',
        (await page.textContent('#f-summary')).includes('RM53.00'),
        await page.textContent('#f-summary'));
  check('delivery run is grouped by area',
        (await page.textContent('#f-orders')).includes('Tamarind Square'));

  // A cancelled order must drop out of the shopping list.
  await page.click('[data-tab="orders"]');
  await page.selectOption('#o-table select[data-f="status"]', 'cancelled');
  await page.click('[data-tab="farm"]');
  await page.waitForTimeout(300);
  check('cancelling an order removes it from the farm list',
        (await page.textContent('#f-summary')).includes('Nothing to buy'),
        await page.textContent('#f-summary'));

  // ---- review moderation --------------------------------------------------
  await page.click('[data-tab="reviews"]');
  await page.waitForTimeout(200);
  check('seeded 5-star reviews show as published',
        (await page.textContent('#r-published')).includes('Aina'));

  // A 2-star review must never reach the published file.
  await page.fill('#r-name', 'Testing Critic');
  await page.fill('#r-area', 'The Arc');
  await page.selectOption('#r-stars', '2');
  await page.fill('#r-text', 'The fish was warm when it arrived and I had to throw it away.');
  await page.click('#r-add');
  await page.waitForTimeout(300);
  check('low rating lands in the private section',
        (await page.textContent('#r-private')).includes('Testing Critic'));
  check('low rating is NOT in the published section',
        !(await page.textContent('#r-published')).includes('Testing Critic'));
  check('low rating has an "what did you do about it" box',
        await page.isVisible('#r-private input[data-action]'));

  // A 5-star review without consent waits for approval rather than publishing.
  await page.fill('#r-name', 'Pending Person');
  await page.selectOption('#r-stars', '5');
  await page.fill('#r-text', 'Everything was perfect, thank you so much for the quick delivery.');
  await page.click('#r-add');
  await page.waitForTimeout(300);
  check('5-star without consent waits for approval',
        (await page.textContent('#r-pending')).includes('Pending Person'));
  check('unapproved 5-star is not published yet',
        !(await page.textContent('#r-published')).includes('Pending Person'));

  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#r-export')]);
  const rfile = path.join(downloads, 'reviews.js');
  await dl2.saveAs(rfile);
  const rout = fs.readFileSync(rfile, 'utf8');
  check('exported reviews exclude the 2-star review', !rout.includes('Testing Critic'), rout.slice(0, 200));
  check('exported reviews exclude the unapproved 5-star', !rout.includes('Pending Person'));
  check('exported reviews include an approved one', rout.includes('Aina'));
  const rbox = { window: {} };
  require('vm').createContext(rbox); require('vm').runInContext(rout, rbox);
  check('exported reviews file is valid JavaScript', !!rbox.window.REVIEWS_DATA);
  check('every exported review is 5 stars',
        rbox.window.REVIEWS_DATA.reviews.every(r => r.stars === 5));

  // Approving the pending one publishes it.
  await page.click('#r-pending [data-approve]');
  await page.waitForTimeout(250);
  check('approving moves it to published',
        (await page.textContent('#r-published')).includes('Pending Person'));

  // ---- statuses export ----------------------------------------------------
  await page.click('[data-tab="orders"]');
  const [dl3] = await Promise.all([page.waitForEvent('download'), page.click('#o-export')]);
  const sfile = path.join(downloads, 'order-status.js');
  await dl3.saveAs(sfile);
  const sout = fs.readFileSync(sfile, 'utf8');
  const sbox = { window: {} };
  require('vm').createContext(sbox); require('vm').runInContext(sout, sbox);
  check('exported statuses file is valid JavaScript', !!sbox.window.ORDER_STATUS_DATA);
  check('exported statuses contain the order',
        !!sbox.window.ORDER_STATUS_DATA.orders['JV-260917-0417']);
  check('exported statuses carry no customer name or phone',
        !sout.includes('Aina Rahman') && !sout.includes('60123456789'), sout.slice(0, 300));

  check('no JavaScript errors anywhere in the panel', errors.length === 0, errors.join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  fs.rmSync(downloads, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})();
