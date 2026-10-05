import { BASE, launch } from './helpers.mjs';

const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };

const shoe = (id, name, extra = {}) => ({
  id, name, brand: 'Brand', price_source: 'kr_list', price: 179000, weight_g: 277, drop_mm: 8, cushion: '높음', terrain: ['로드'], arch: ['normal'],
  pronation: ['neutral'], use_case: ['데일리'], weekly_km: '20이상', width: '보통', tags: [], score: 90,
  naver_url: 'https://search.shopping.naver.com/search/all?query=x', ...extra,
});
const RESULTS = [
  shoe(1, 'Hoka Clifton 10', { price_source: 'estimate', price_usd: 150 }),
  shoe(2, 'New Balance Fresh Foam X 880v15', { price_source: 'kr_list' }),
];

const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', hasTouch: true });
const p = await ctx.newPage();
await p.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(RESULTS) }));
await p.goto(BASE);
await p.locator('.mode-card').nth(2).click();
await p.click('.btn-primary');
await p.waitForSelector('article.card');

const cards = p.locator('article.card');
const head = async (i) => cards.nth(i).locator('.card-head').boundingBox();
const title = async (i) => cards.nth(i).locator('.card-head').evaluate((el) => {
  const t = el.querySelector('button, .info, h3')?.getBoundingClientRect();
  return t ? t.width : 0;
});

// Phone width: the long overseas-price text must not squeeze the shoe name into a narrow column.
const names = await cards.locator('.card-head h3, .card-head .name, .card-head strong').allTextContents().catch(() => []);
const nameBox = await cards.nth(0).locator('text=Hoka Clifton 10').first().boundingBox();
ok(nameBox.width > 140 && nameBox.height < 60, 'a long overseas price does not squeeze the shoe name', JSON.stringify(nameBox));
const priceTexts = await p.locator('.side .price').allTextContents();
ok(priceTexts[0] === '해외 $150' && priceTexts[1] === '179,000원', 'card header shows the short price', priceTexts.join('|'));

// The full explanation is in the expanded card.
await cards.nth(0).locator('.card-head').click();
await p.waitForSelector('.price-note');
ok((await p.textContent('.price-note')).includes('해외 정가 $150 · 국내 가격은 판매처 확인'), 'the full overseas price is in the details');
await cards.nth(1).locator('.card-head').click();
ok((await cards.nth(1).locator('.price-note').count()) === 0, 'a Korean list price has no overseas note');

// Tooltips on the two icon buttons.
await p.setViewportSize({ width: 1280, height: 800 });
const heart = cards.nth(0).locator('button[aria-pressed]');
const plus = cards.nth(0).locator('.icon-btn').nth(1);
ok((await heart.getAttribute('data-tip')) === '저장하기' && (await plus.getAttribute('data-tip')) === '내 신발에 추가', 'icon buttons carry their tooltip text');
await plus.hover();
const tip = await plus.evaluate((el) => getComputedStyle(el, '::after').content);
ok(tip.includes('내 신발에 추가'), 'the tooltip shows on hover', tip);
await heart.click();
ok((await heart.getAttribute('data-tip')) === '저장 해제', 'the heart tooltip follows its state');

// Over-budget shoes are marked and explained once at the top of the results.
const over = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })).newPage();
await over.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify([shoe(1, 'In Budget Shoe', { price: 129000 }), shoe(2, 'Pricey Shoe', { price: 219000, over_budget: true })]) }));
await over.goto(BASE);
await over.locator('.mode-card').nth(2).click();
await over.click('.btn-primary');
await over.waitForSelector('article.card');
ok((await over.locator('.over-budget').count()) === 1 && (await over.locator('article.card').nth(1).locator('.over-budget').count()) === 1, 'only the over-budget card carries the badge');
ok((await over.textContent('.notice-card')).includes('예산 안의 신발을 먼저'), 'a note explains the order');
await over.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([shoe(1, 'Only Shoe')]) }));
await over.goBack();
await over.click('.btn-primary');
await over.waitForSelector('article.card');
ok((await over.locator('.notice-card').count()) === 0, 'no note when everything is within budget');

// SOL-E celebrates on the results page, but only when there are results.
for (const [width, locale, scheme, line] of [[390, 'ko-KR', 'light', '딱 맞는 신발 발견!'], [1280, 'en-US', 'dark', 'Found your perfect pair!']]) {
  const page = await (await b.newContext({ viewport: { width, height: 844 }, locale, colorScheme: scheme })).newPage();
  await page.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(RESULTS) }));
  await page.goto(BASE);
  await page.locator('.mode-card').nth(2).click();
  await page.click('.btn-primary');
  await page.waitForSelector('article.card');
  const label = `${width}px ${locale} ${scheme}`;
  const img = await page.locator('.found-row .soli').boundingBox();
  const bubble = await page.locator('.found-row .bubble').boundingBox();
  const firstCard = await page.locator('article.card').first().boundingBox();
  ok((await page.textContent('.found-row .bubble')) === line, `${label}: the bubble says "${line}"`);
  ok((await page.locator('.found-row .soli').getAttribute('src')) === '/soli-complete.svg' && (await page.locator('.found-row .soli').getAttribute('alt')) === '', `${label}: the arms-up pose, as decoration`);
  ok(await page.locator('.found-row .soli').evaluate((i) => i.complete && i.naturalWidth > 0), `${label}: the image loads`);
  ok(bubble.x > img.x + img.width - 1 && bubble.y + bubble.height < firstCard.y, `${label}: the bubble sits beside SOL-E, above the first card`, JSON.stringify({ img, bubble, firstCard }));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: nothing overflows`);
}
const none = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })).newPage();
await none.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
await none.goto(BASE);
await none.locator('.mode-card').nth(2).click();
await none.click('.btn-primary');
await none.waitForSelector('.hero');
ok((await none.locator('.found-row').count()) === 0, 'no celebration when nothing was found (the app stays on a page without results)');

await b.close();
process.exit(fail ? 1 : 0);
