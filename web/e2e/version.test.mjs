import { BASE, launch } from './helpers.mjs';

const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };

for (const [locale, re] of [['ko-KR', /^Find Your Sole v\d+\.\d+\.\d+ · 신발 데이터 업데이트 \d{4}-\d{2}$/], ['en-US', /^Find Your Sole v\d+\.\d+\.\d+ · Shoe data updated \d{4}-\d{2}$/]]) {
  const page = await (await b.newContext({ viewport: { width: 390, height: 800 }, locale })).newPage();
  await page.goto(BASE + '#/about');
  await page.waitForSelector('.version');
  const text = await page.textContent('.version');
  ok(re.test(text), `${locale}: about footer shows version and data date`, text);
}
await b.close();
process.exit(fail ? 1 : 0);
