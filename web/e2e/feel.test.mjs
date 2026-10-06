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
{
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })).newPage();
  await page.route('**/explain', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ explanation: '발이 편한 푹신한 신발이에요\n\n쿠션이 높아서 오래 걸어도 부담이 적어요.' }) }));
  await page.goto(BASE);
  await page.locator('.mode-card').nth(2).click();
  await page.click('.btn-primary');
  await page.waitForSelector('article.card');
  await page.locator('.comment-toggle').first().click();
  await page.waitForSelector('.explain');
  ok((await page.textContent('.explain-summary')) === '발이 편한 푹신한 신발이에요', 'the AI answer opens with a highlighted one-line summary');
  ok((await page.locator('.explain p').count()) === 2, 'the detail follows as its own paragraph');
}
await b.close();
process.exit(fail ? 1 : 0);
