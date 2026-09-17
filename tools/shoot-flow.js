const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.setItem('jalvin.cart',
    JSON.stringify({ kangkung: 2, 'ikan-kembung': 1, 'ayam-standard': 1, 'pork-belly': 1 })));
  await p.goto('http://127.0.0.1:8765/cart.html', { waitUntil: 'networkidle' });
  await p.click('#to-details');
  await p.waitForSelector('#step-details:not([hidden])');
  await p.fill('#name', 'Aina Rahman');
  await p.fill('#phone', '012-345 6789');
  await p.selectOption('#postcode', '63000');
  await p.selectOption('#neighbourhood', 'Tamarind Square');
  await p.fill('#address', 'A-12-3, Block A, Jalan Impact');
  await p.click('#details-form button[type=submit]');
  await p.waitForSelector('#step-pay:not([hidden])');
  await p.waitForTimeout(600);
  await p.screenshot({ path: OUT, fullPage: true });
  await b.close();
})();
