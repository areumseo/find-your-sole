import assert from 'node:assert/strict';
import { BASE, launch } from './helpers.mjs';
const browser = await launch();
try {
  for (const locale of ['ko-KR','en-US']) {
    const ctx = await browser.newContext({locale,viewport:{width:390,height:844}});
    const p = await ctx.newPage();
    const shoe = {id:65,name:'르무통 워크 / LeMouton Walk',brand:'LeMouton',price:149000,price_source:'kr_list',weight_g:181,drop_mm:null,cushion:'미확인',width:'미확인',terrain:['로드'],arch:[],pronation:[],use_case:['데일리'],weekly_km:'미확인',tags:['메리노울 소재'],score:90,budget_status:'within',naver_url:'https://search.shopping.naver.com/search/all?query=LeMouton',source_url:'https://www.lemouton.co.kr/product/detail.html?product_no=325',specs_checked_at:'2026-10-05',weight_note:'230mm 기준',sale_price:121900,sale_price_max:121900,sale_checked_at:'2026-10-05T06:00:00Z',sale_source_url:'https://www.lemouton.co.kr/product/detail.html?product_no=325',sale_available:true};
    await p.route('**/recommend/comfort',r=>r.fulfill({json:[shoe]}));
    await p.route('**/explain',r=>r.fulfill({json:{explanation:'Verified fixture explanation'}}));
    await p.goto(BASE);
    await p.locator('.mode-card').nth(2).click();
    await p.locator('.btn-primary').click();
    await p.waitForSelector('article.card');
    const summary = await p.locator('.match-summary').innerText();
    assert.ok(!summary.includes('쿠션') && !summary.includes('cushioning'));
    assert.ok(!summary.includes('발볼') && !summary.includes('width'));
    await p.locator('.comment-toggle').click();
    await p.locator('.explain').waitFor();
    const specs = await p.locator('.specs').innerText();
    assert.ok(!specs.includes('null') && !specs.includes('0mm'));
    assert.ok(specs.includes(locale==='ko-KR'?'미확인':'Not confirmed'));
    const detail = await p.locator('.detail').innerText();
    assert.ok(detail.includes('230mm') && detail.includes('2026-10-05') && detail.includes('121,900'));
    assert.ok(await p.locator('.detail a[href*="lemouton.co.kr"]').count()===2);
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
    await p.screenshot({path:`catalog-${locale}.png`,fullPage:true});
    await ctx.close();
  }
} finally { await browser.close(); }
console.log('Unknown specs, sources, sale observations and mobile layout passed in Korean and English');
