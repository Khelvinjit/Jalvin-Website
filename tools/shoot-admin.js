const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 });
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8765/admin.html', { waitUntil: 'networkidle' });
  await p.fill('#pass', 'jalvin2026');
  await p.click('#lock-form button[type=submit]');
  await p.waitForSelector('#panel:not([hidden])');
  // Seed one order so the farm list has something to show.
  await p.click('[data-tab="orders"]');
  await p.fill('#o-paste', `*JALVIN FRESH — NEW ORDER*
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
• 2 x Ikan Kembung · ≈ 500g (4–5 ekor) · RM32.00
• 1 x Ayam Standard · ≈ 1.6 kg (1 ekor) · RM16.00

*NON-HALAL — PACK SEPARATELY*
• 1 x Pork Belly (Samchan) · ≈ 500g · RM22.00

Subtotal: RM80.00
Delivery: FREE
*TOTAL: RM80.00*

*If something is out of stock:*
Substitute with something similar`);
  await p.click('#o-save'); await p.waitForTimeout(400);
  await p.fill('#o-paste', `*JALVIN FRESH — NEW ORDER*
Order no: *JV-260917-0918*

*DELIVERY*
Wednesday, 23 Sep 2026
2:00 PM – 6:00 PM

*CUSTOMER*
Suresh Kumar
60198887766
B-8-2, Symphony Suites
Symphony Suites, 63000 Cyberjaya

*ITEMS*
• 3 x Kangkung · 1 ikat ≈ 250g · RM7.50
• 2 x Bayam Merah · 1 ikat ≈ 250g · RM5.60
• 1 x Udang Putih · ≈ 500g · RM28.00

Subtotal: RM41.10
Delivery: RM5.00
*TOTAL: RM46.10*

*If something is out of stock:*
WhatsApp me first, I'll decide`);
  await p.click('#o-save'); await p.waitForTimeout(400);
  await p.click(`[data-tab="${process.argv[3] || 'farm'}"]`);
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT, fullPage: true });
  await b.close();
})();
