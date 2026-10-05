import assert from 'node:assert/strict';
import { BASE, launch } from './helpers.mjs';

const browser = await launch();
const shoes = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1, name: i === 0 ? 'Skechers Go Walk 7' : `New Balance Fresh Foam X 880v${i}`,
  brand: 'Test', price: i < 3 ? 129000 : 199000, price_source: i === 2 ? 'estimate' : 'kr_list',
  price_usd: i === 2 ? 130 : null, over_budget: i >= 3,
  weight_g: 267, drop_mm: 4, cushion: '중간', terrain: ['로드'], arch: ['normal'],
  pronation: ['neutral'], use_case: ['데일리'], weekly_km: '20이상', width: '보통', tags: [], score: 90,
  naver_url: 'https://search.shopping.naver.com/search/all?query=test',
}));

try {
  for (const width of [360, 390, 768, 1024, 1280]) {
    for (const locale of ['ko-KR', 'en-US']) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, locale });
      const page = await ctx.newPage();
      let explanations = 0;
      await page.route('**/recommend/comfort', r => r.fulfill({ json: shoes, headers: { 'access-control-allow-origin': '*' } }));
      await page.route('**/explain', r => { explanations++; return r.fulfill({ json: { explanation: 'Test explanation' }, headers: { 'access-control-allow-origin': '*' } }); });
      await page.goto(BASE);
      await page.waitForSelector('.mode-card');
      await page.evaluate(() => document.fonts.ready);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'home fits viewport');
      if (locale === 'en-US') assert((await page.textContent('.hero')).includes('SOL-E'));
      if (width >= 640 && width < 1100) {
        const grid = await page.locator('.mode-grid').boundingBox();
        const third = await page.locator('.mode-card').nth(2).boundingBox();
        assert(Math.abs(third.width - grid.width) < 2, 'third entry fills the tablet row');
      }
      await page.locator('.mode-card').nth(2).click();
      if (width < 900) assert.equal(await page.locator('.fab').isVisible(), false, 'feedback cannot cover submit');
      await page.locator('.form-actions button').click();
      await page.waitForSelector('article.card');
      assert.equal(await page.locator('article.card:visible').count(), 3, 'three candidates initially visible');
      assert.equal(await page.locator('.match-summary').count(), 3);
      assert.equal(explanations, 0, 'summaries do not consume AI requests');
      assert.equal(await page.locator('.price-unconfirmed').count(), 1);
      assert(!(await page.locator('article.card').nth(2).textContent()).includes(locale === 'ko-KR' ? '국내 정가 기준 예산 이내' : 'Within budget'));
      if (width < 600) {
        const name = await page.locator('.shoe-name').first().boundingBox();
        const side = await page.locator('.side').first().boundingBox();
        assert(name.width > 220 && side.y >= name.y + name.height, 'name gets full row above actions');
      }
      await page.locator('.more-results > summary').click();
      assert.equal(await page.locator('article.card:visible').count(), 5, 'remaining candidates accessible');
      await page.locator('article.card .detail-toggle').last().click();
      await page.waitForSelector('.explain');
      assert.equal(explanations, 1);
      assert.equal(await page.locator('article.card .name-toggle').last().getAttribute('aria-expanded'), 'true');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'results fit viewport');
      if (width === 360 || width === 1280) {
        await page.locator('article.card .name-toggle').last().click();
        await page.locator('.more-results > summary').click();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `review-${width}-${locale}-light.png`, fullPage: true });
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.screenshot({ path: `review-${width}-${locale}-dark.png`, fullPage: true });
      }
      if (width < 900) {
        await page.locator('a[href="#/more"]').click();
        await page.locator('.feedback-entry').click();
        assert(await page.locator('dialog[open] textarea').isVisible());
        await page.keyboard.press('Escape');
      }
      console.log(`ok responsive review: ${width}px ${locale}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
