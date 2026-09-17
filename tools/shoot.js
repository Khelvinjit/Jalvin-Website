// Screenshot helper: node tools/shoot.js <url-path> <out.png> [width] [fullpage]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [, , target, out, width = '1280', full = '1'] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +width, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // report horizontal overflow, which is the #1 mobile bug
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: out, fullPage: full === '1' });
  if (overflow > 1) console.log(`!! horizontal overflow: ${overflow}px at ${width}px wide`);
  if (errors.length) console.log(errors.join('\n')); else console.log('no js errors');
  await browser.close();
})();
