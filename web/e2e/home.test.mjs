import { BASE, launch } from './helpers.mjs';

const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };

const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
const p = await ctx.newPage();
await p.goto(BASE);
await p.waitForSelector('.col-side .widget');
await p.waitForSelector('.pick');

ok((await p.locator('.col-side .widget h2').allTextContents()).join('|') === '솔이의 데일리 픽|솔이의 한 입 상식', 'side column: pick then tip');
ok((await p.locator('.pick-name').textContent()).length > 3, 'pick has a shoe name');
const link = p.locator('.pick a');
ok((await link.getAttribute('href')).startsWith('https://search.shopping.naver.com/') && (await link.getAttribute('rel')).includes('noopener'), 'pick links to shopping safely');
ok((await p.locator('.pick-reason').textContent()).includes('쿠션'), 'pick shows a reason');
ok((await p.locator('.tip-q').textContent()).endsWith('?') && (await p.locator('.tip-a').textContent()).length > 20, 'tip has a question and answer');

// Same pick/tip all day for everyone: a reload shows the same ones.
const first = [await p.locator('.pick-name').textContent(), await p.locator('.tip-q').textContent()];
await p.reload();
await p.waitForSelector('.pick');
ok(first[0] === (await p.locator('.pick-name').textContent()) && first[1] === (await p.locator('.tip-q').textContent()), 'pick and tip are stable within a day');

// English switches the copy and refetches the pick in English.
await p.click('.lang');
await p.waitForFunction(() => /cushioning/.test(document.querySelector('.pick-reason')?.textContent ?? ''));
ok((await p.locator('.col-side .widget h2').first().textContent()) === 'SOL-E’s Daily Pick', 'english titles');

// If the pick endpoint is down, the tip still shows and nothing breaks.
const errors = [];
const down = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' })).newPage();
down.on('pageerror', (e) => errors.push(e.message));
await down.route('**/pick*', (r) => r.abort());
await down.goto(BASE);
await down.waitForSelector('.tip');
ok((await down.locator('.pick').count()) === 0 && (await down.locator('.tip').count()) === 1 && errors.length === 0, 'pick failure leaves the tip and no errors', errors.join());

// With no news the side column still lays out as the single widget column.
const cols = await down.evaluate(() => getComputedStyle(document.querySelector('.widgets')).gridTemplateColumns.split(' ').length);
ok(cols === 1 || (await down.locator('.col-main').evaluate((e) => getComputedStyle(e).display)) === 'none', 'empty main column is hidden');

// An estimated KRW price is shown as the overseas USD list price instead.
const est = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' })).newPage();
const pickBody = (extra) => JSON.stringify({ name: 'Test Shoe', brand: 'Brand', price: 179000, weight_g: 280, cushion: '높음', categories: ['daily'], reason: '쿠션은 높음이에요.', naver_url: 'https://search.shopping.naver.com/search/all?query=x', ...extra });
await est.route('**/pick*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: pickBody({ price_source: 'estimate', price_usd: 150 }) }));
await est.goto(BASE);
await est.waitForSelector('.pick');
const sub = await est.locator('.pick .row-sub').textContent();
ok(sub.includes('해외 정가 $150') && !sub.includes('만원'), 'estimated price shows the USD list price', sub);
await est.unroute('**/pick*');
await est.route('**/pick*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: pickBody({ price_source: 'kr_list', price_usd: null }) }));
await est.reload();
await est.waitForSelector('.pick');
ok((await est.locator('.pick .row-sub').textContent()).includes('179,000원'), 'a Korean list price shows the same exact amount as the explanation');

// Saved shoes keep the label rules too: an estimated shoe shows its USD price, an old entry without the fields keeps the range.
const saved = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' })).newPage();
await saved.addInitScript(() => localStorage.setItem('fys.favorites', JSON.stringify([
  { id: 1, name: 'Est Shoe', brand: 'B', price: 179000, price_source: 'estimate', price_usd: 150 },
  { id: 2, name: 'Old Entry', brand: 'B', price: 129000 },
])));
await saved.goto(BASE);
await saved.waitForSelector('.widget .row');
const rows = await saved.locator('.widget .row-end').allTextContents();
ok(rows.join('|') === '해외 $150|국내 가격 확인 필요', 'saved widget: USD for estimates, unknown price for old entries without a source', rows.join('|'));

// Soli greets from the hero with a speech bubble, on phones and desktops, in both languages and both themes.
for (const [width, locale, scheme] of [[390, 'ko-KR', 'light'], [360, 'en-US', 'dark'], [1280, 'ko-KR', 'dark'], [768, 'en-US', 'light']]) {
  const page = await (await b.newContext({ viewport: { width, height: 800 }, locale, colorScheme: scheme })).newPage();
  await page.goto(BASE);
  await page.waitForSelector('.hero .bubble');
  const img = await page.locator('.hero .soli').boundingBox();
  const bubble = await page.locator('.hero .bubble').boundingBox();
  const hero = await page.locator('.hero').boundingBox();
  const label = `${width}px ${locale} ${scheme}`;
  ok((await page.locator('.hero .soli').getAttribute('alt')) === '', `${label}: Soli is decoration (empty alt)`);
  ok((await page.textContent('.hero .bubble')) === (locale === 'ko-KR' ? '어서 와, 같이 골라보자!' : 'Come on in, let’s pick together!'), `${label}: the bubble carries Soli's line`);
  ok(bubble.x > img.x + img.width - 1 && bubble.x + bubble.width <= hero.x + hero.width, `${label}: the bubble sits beside Soli inside the hero`, JSON.stringify({ img, bubble, hero }));
  ok(img.width >= 80 && img.y >= hero.y, `${label}: Soli is large and inside the hero`, JSON.stringify(img));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: nothing overflows`);
  const bg = await page.locator('.hero .bubble').evaluate((e) => getComputedStyle(e).backgroundColor);
  ok(bg !== 'rgba(0, 0, 0, 0)', `${label}: the bubble has a background`, bg);
}

await b.close();
process.exit(fail ? 1 : 0);
