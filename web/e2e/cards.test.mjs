import { BASE, launch } from './helpers.mjs';

const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };

const shoe = (id, name, extra = {}) => ({
  id, name, brand: 'Brand', price: 179000, weight_g: 277, drop_mm: 8, cushion: '높음', terrain: ['로드'], arch: ['normal'],
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
ok(priceTexts[0] === '해외 $150' && priceTexts[1] === '15~20만원대', 'card header shows the short price', priceTexts.join('|'));

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

await b.close();
process.exit(fail ? 1 : 0);
