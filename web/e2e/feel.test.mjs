import { BASE, launch } from './helpers.mjs';

const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };

for (const [locale, re] of [['ko-KR', /푹신|단단|탄탄|가벼/], ['en-US', /soft|firm|plush|light|balance/i]]) {
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale })).newPage();
  await page.goto(BASE);
  await page.locator('.mode-card').first().click();
  await page.click('.btn-primary');
  await page.waitForSelector('article.card');
  const lines = await page.locator('article.card .feel').allTextContents();
  ok(lines.length >= 3 && lines.every((l) => re.test(l)), `${locale}: result cards describe the feel in plain words`, JSON.stringify(lines));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: nothing overflows`);
}
await b.close();
process.exit(fail ? 1 : 0);
