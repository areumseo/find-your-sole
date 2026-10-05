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
ok(priceTexts[0] === '해외 정가 US$150ⓘ' && priceTexts[1] === '179,000원', 'card header shows the short price', priceTexts.join('|'));

// The full explanation is in the expanded card.
ok(await cards.nth(0).locator('.detail').isVisible(), 'first card is expanded by default');
ok(await cards.nth(1).locator('.detail').isVisible(), 'second card is expanded by default');
ok((await cards.nth(0).locator('.price-note').count()) === 0, 'overseas price is not repeated in details');
ok((await cards.nth(0).locator('.price-unconfirmed').count()) === 0, 'duplicate price badge removed');
ok((await cards.nth(0).locator('.btn-outline-naver').textContent()).includes('네이버쇼핑에서 국내 판매가 확인하기'), 'shopping button explains the domestic-price check');
await cards.nth(0).locator('.price-info').click();
ok((await cards.nth(0).locator('.price-help').textContent()).includes('참고용'), 'price info explains reference-only price');
ok((await cards.nth(1).locator('.price-note').count()) === 0, 'Korean list price has no overseas note');
// Tooltips on the two icon buttons.
await p.setViewportSize({ width: 1280, height: 800 });
const heart = cards.nth(0).locator('.actions button[aria-pressed]');
const plus = cards.nth(0).locator('.icon-btn').nth(1);
ok((await heart.getAttribute('data-tip')) === '저장' && (await plus.getAttribute('data-tip')) === '내 신발에 추가', 'icon buttons carry their tooltip text');
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
ok((await over.textContent('.notice-card')).includes('조건에 맞는 순서'), 'a note explains the order');
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
  const img = await page.locator('.found-row .sol-e').boundingBox();
  const bubble = await page.locator('.found-row .bubble').boundingBox();
  const firstCard = await page.locator('article.card').first().boundingBox();
  ok((await page.textContent('.found-row .bubble')) === line, `${label}: the bubble says "${line}"`);
  ok((await page.locator('.found-row .sol-e').getAttribute('src')) === '/sol-e-complete.svg' && (await page.locator('.found-row .sol-e').getAttribute('alt')) === '', `${label}: the arms-up pose, as decoration`);
  ok(await page.locator('.found-row .sol-e').evaluate((i) => i.complete && i.naturalWidth > 0), `${label}: the image loads`);
  ok(bubble.x > img.x + img.width - 1 && bubble.y + bubble.height < firstCard.y, `${label}: the bubble sits beside SOL-E, above the first card`, JSON.stringify({ img, bubble, firstCard }));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: nothing overflows`);
}
const none = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })).newPage();
await none.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
await none.goto(BASE);
await none.locator('.mode-card').nth(2).click();
await none.click('.btn-primary');
await none.waitForSelector('.empty-state');
ok((await none.locator('.found-row').count()) === 0, 'no celebration when nothing was found');
ok((await none.textContent('.empty-state .empty-title')) === '조건에 맞는 신발이 없어요', 'empty state explains that nothing matched');
ok(await none.locator('.empty-state .sol-e').evaluate((i) => i.complete && i.naturalWidth > 0), 'empty state shows SOL-E');
await none.click('.empty-state .btn-primary');
await none.waitForSelector('.btn-primary');
ok(none.url().includes('#/search/comfort'), 'the button returns to the form');

// "Compared with your answers": one chip per fact, with color carrying the meaning.
for (const [scheme, locale, label] of [['light', 'ko-KR', '내 조건과 비교:'], ['dark', 'en-US', 'Compared with your answers:']]) {
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale, colorScheme: scheme })).newPage();
  await page.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify([shoe(1, 'Cheap Match', { price: 129000, price_source: 'kr_list' })]) }));
  await page.goto(BASE);
  await page.locator('.mode-card').nth(2).click();
  await page.click('.btn-primary');
  await page.waitForSelector('.match-summary');
  const where = `${scheme}/${locale}`;
  ok((await page.textContent('.match-label')) === label, `${where}: gray label "${label}"`);
  const kinds = await page.locator('.match-summary .fact').evaluateAll((els) => els.map((e) => e.className.replace('fact ', '')));
  ok(kinds.length >= 2 && kinds.length <= 3 && kinds.includes('fact-info') && kinds.includes('fact-match') && kinds.includes('fact-good'), `${where}: info, match and within-budget chips`, kinds.join(','));
  ok(kinds[kinds.length - 1] === 'fact-good', `${where}: within-budget is always shown, last`);
  const colors = await page.locator('.match-summary .fact').evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
  ok(new Set(colors).size === colors.length, `${where}: every kind has its own text color`, colors.join(' | '));
  const texts = await page.locator('.match-summary .fact').allTextContents();
  ok(texts.filter((x) => x.startsWith('✓')).length === kinds.filter((k) => k !== 'fact-info').length, `${where}: matches and budget carry a check mark, plain info does not`, texts.join('|'));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${where}: nothing overflows`);
}

// The brand name links to the official site; the rest of the text block still toggles the card.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
  const page = await ctx.newPage();
  await page.route('**/recommend/comfort', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify([
      shoe(1, 'Linked Shoe', { brand: 'Hoka', brand_url: 'https://www.hoka.com/ko-kr' }),
      shoe(2, 'Unsafe Link Shoe', { brand: 'Evil', brand_url: 'javascript:alert(1)' }),
      shoe(3, 'Old Entry Shoe', { brand: 'Legacy' }),
    ]) }));
  await page.goto(BASE);
  await page.locator('.mode-card').nth(2).click();
  await page.click('.btn-primary');
  await page.waitForSelector('article.card');
  const card = page.locator('article.card');
  const link = card.nth(0).locator('a.brand-link');
  ok((await link.getAttribute('href')) === 'https://www.hoka.com/ko-kr' && (await link.getAttribute('target')) === '_blank' && (await link.getAttribute('rel')).includes('noopener') && (await link.getAttribute('rel')).includes('noreferrer'), 'brand name is a safe new-tab link to the official site');
  ok((await link.getAttribute('aria-label')) === 'Hoka 공식 사이트 (새 탭)' && (await link.textContent()).startsWith('Hoka'), 'the link has an accessible name');
  ok((await card.nth(1).locator('a.brand-link').count()) === 0 && (await card.nth(1).locator('.shoe-brand').textContent()) === 'Evil', 'a non-https address is shown as plain text');
  ok((await card.nth(2).locator('a.brand-link').count()) === 0 && (await card.nth(2).locator('.shoe-brand').textContent()) === 'Legacy', 'an entry without an address is plain text');
  // Clicking the link opens a new tab and does NOT toggle the card.
  const [popup] = await Promise.all([ctx.waitForEvent('page'), link.click()]);
  await popup.close();
  ok((await card.nth(0).locator('.name-toggle').getAttribute('aria-expanded')) === 'true', 'clicking the brand link leaves expansion unchanged');
  // Clicking the name or the tags toggles it.
  // A real tap on the tag: Playwright's own click refuses because the stretched button layer
  // sits on top of the tag, so click the tag's position with the mouse like a finger would.
  const tagBox = await card.nth(0).locator('.tags .tag').first().boundingBox();
  await page.mouse.click(tagBox.x + tagBox.width / 2, tagBox.y + tagBox.height / 2);
  const afterTag = await card.nth(0).locator('.name-toggle').getAttribute('aria-expanded');
  await card.nth(0).locator('.name-toggle').click();
  const afterName = await card.nth(0).locator('.name-toggle').getAttribute('aria-expanded');
  ok(afterTag === 'false' && afterName === 'true', 'clicking tags collapses the card and clicking the name expands it', `${afterTag} -> ${afterName}`);
  // Keyboard: Tab reaches the name button, then the brand link, as separate stops.
  await page.keyboard.press('Escape');
  await card.nth(1).locator('.name-toggle').focus();
  await page.keyboard.press('Tab');
  ok(await card.nth(1).locator('.shoe-brand').count() === 1, 'the unsafe-link card keeps a plain brand line after the name');
  await link.focus();
  ok(await link.evaluate((e) => document.activeElement === e), 'the brand link is keyboard focusable');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'nothing overflows');
}

const enCtx = await b.newContext({viewport:{width:390,height:844},locale:'en-US'});
const enPage = await enCtx.newPage();
await enPage.route('**/recommend/comfort',r=>r.fulfill({json:RESULTS}));
await enPage.route('**/explain',r=>r.fulfill({json:{explanation:'Fixture'}}));
await enPage.goto(BASE);
await enPage.locator('.mode-card').nth(2).click();
await enPage.locator('.btn-primary').click();
await enPage.waitForSelector('article.card');
const enCard = enPage.locator('article.card').first();
ok((await enCard.locator('.price').textContent()).includes('Overseas list US$150'), 'English header identifies overseas list price');
await enCard.locator('.price-info').click();
ok((await enCard.innerText()).includes('Overseas list price for reference'), 'English reference-price explanation');
ok((await enCard.locator('.btn-outline-naver').textContent()).includes('Check Korean price'), 'English domestic-price action');
ok(await enPage.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), 'English price context fits phone width');
await enPage.screenshot({path:'price-context-en.png',fullPage:true});
await p.screenshot({path:'price-context-ko.png',fullPage:true});
await b.close();
process.exit(fail ? 1 : 0);
