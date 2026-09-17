/* Every page, at phone and desktop width: no JS errors, no horizontal scroll,
   a real <title>, and tap targets big enough to hit with a thumb. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const PAGES = ['index', 'shop', 'cart', 'track', 'review', 'faq', 'policies', 'admin'];

let pass = 0, fail = 0;
const check = (n, ok, extra) => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  if (!ok && extra !== undefined) console.log('       ' + String(extra).slice(0, 300));
};

(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    console.log(`\n== ${width}px ==`);
    for (const name of PAGES) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      // Put something in the basket so cart.html renders its real layout.
      await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.setItem('jalvin.cart',
        JSON.stringify({ kangkung: 2, 'ikan-kembung': 1, 'pork-belly': 1 })));
      await page.goto(`${BASE}/${name}.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(350);

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const title = await page.title();
      const smallTargets = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('a,button,select,input[type=checkbox],input[type=radio]')
          .forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;       // hidden
            // WCAG 2.2 (2.5.8) exempts a link sitting inline within a sentence.
            const inSentence = el.tagName === 'A' &&
              getComputedStyle(el).display === 'inline' &&
              Array.from(el.parentNode.childNodes).some(n =>
                n.nodeType === 3 && n.textContent.trim().length > 0);
            if (inSentence) return;
            if (r.height < 24 || r.width < 24) {
              bad.push((el.tagName + ' "' + (el.textContent || el.value || '').trim().slice(0, 24) +
                        '" ' + Math.round(r.width) + 'x' + Math.round(r.height)));
            }
          });
        return bad;
      });
      const brokenImgs = await page.evaluate(() =>
        Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0)
          .map(i => i.getAttribute('src')));

      check(`${name}: no JS errors`, errors.length === 0, errors.join(' | '));
      check(`${name}: no horizontal scroll`, overflow <= 1, overflow + 'px');
      check(`${name}: has a title`, title.length > 5, title);
      check(`${name}: no broken images`, brokenImgs.length === 0, brokenImgs.join(', '));
      if (width === 390) {
        check(`${name}: tap targets meet the 24px minimum`, smallTargets.length === 0,
              smallTargets.join(' | '));
      }
      await page.close();
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
