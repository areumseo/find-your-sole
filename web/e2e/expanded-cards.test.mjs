import assert from 'node:assert/strict';
import {BASE,launch} from './helpers.mjs';
const b=await launch();
const shoes=Array.from({length:4},(_,i)=>({id:i+1,name:`Example shoe ${i+1}`,brand:'Brand',price:160000,price_source:'estimate',price_usd:140,weight_g:278,drop_mm:12,cushion:'중간',width:'보통',terrain:['로드'],arch:['normal'],pronation:['neutral'],use_case:['데일리'],weekly_km:'10이상',tags:[],score:90-i,naver_url:'https://search.shopping.naver.com/search/all?query=example'}));
try {
 for(const [locale,theme,width] of [['ko-KR','light',390],['ko-KR','dark',390],['en-US','light',1280],['en-US','dark',360]]) {
  const ctx=await b.newContext({locale,viewport:{width,height:844},colorScheme:theme});const p=await ctx.newPage();let calls=0;
  await p.route('**/recommend/comfort',r=>r.fulfill({json:shoes}));
  await p.route('**/explain',async r=>{calls++;await new Promise(resolve=>setTimeout(resolve,100));await r.fulfill({json:{explanation:'Example AI comment'}});});
  await p.goto(BASE);await p.locator('.mode-card').nth(2).click();await p.locator('.btn-primary').click();await p.waitForSelector('article.card');
  assert.equal(await p.locator('article.card.open').count(),3);assert.equal(calls,0);
  const first=p.locator('article.card').first();assert.equal(await first.locator('.icon-btn').count(),2);
  assert.equal(await first.locator('.price-note').count(),0);assert.equal(await first.locator('.price-unconfirmed').count(),0);
  await first.locator('.price-info').click();assert.ok(await first.locator('.price-help').isVisible());
  const shopping=first.locator('.card-shopping');const box=await shopping.boundingBox();assert.ok(box.width<=341);
  const logo=shopping.locator('.naver-logo');assert.equal(await logo.getAttribute('alt'),'');
  assert.ok(await logo.evaluate(el=>el.complete && el.naturalWidth>0));
  assert.ok(!(await shopping.innerText()).includes('↗'));
  assert.equal(await shopping.locator('.naver-name').evaluate(el=>getComputedStyle(el).textDecorationLine),'none');
  assert.equal(await shopping.getAttribute('target'),'_blank');
  assert.ok((await shopping.getAttribute('rel')).includes('noopener'));
  await first.locator('.comment-toggle').click();await first.locator('.comment-loading').waitFor();
  await first.locator('.comment-toggle').click();await first.locator('.comment-toggle').click();
  await first.locator('.explain').waitFor();assert.equal(calls,1);
  await first.locator('.comment-toggle').click();assert.ok(!(await first.locator('.explain').isVisible()));
  await first.locator('.comment-toggle').click();assert.equal(calls,1);
  await first.locator('.detail-toggle').click();await first.locator('.detail-toggle').click();assert.equal(calls,1);
  await p.locator('.more-results > summary').click();const last=p.locator('article.card').last();
  assert.equal(await last.locator('.name-toggle').getAttribute('aria-expanded'),'false');
  await last.locator('.detail-toggle').click();assert.equal(calls,1);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('.more-results > summary').click();await p.screenshot({path:`expanded-${locale}-${theme}-${width}.png`,fullPage:true});
  await ctx.close();
 }
 const ctx=await b.newContext({locale:'ko-KR'});const p=await ctx.newPage();let attempts=0;
 await p.route('**/recommend/comfort',r=>r.fulfill({json:[shoes[0]]}));
 await p.route('**/explain',r=>{attempts++;return attempts===1?r.fulfill({status:429,json:{detail:'limited'}}):r.fulfill({json:{explanation:'Recovered'}});});
 await p.goto(BASE);await p.locator('.mode-card').nth(2).click();await p.locator('.btn-primary').click();await p.waitForSelector('.comment-toggle');
 await p.locator('.comment-toggle').click();await p.getByText('설명 요청이 많아요. 잠시 뒤에 다시 눌러 주세요.').waitFor();
 await p.locator('.comment-toggle').click();await p.locator('.comment-toggle').click();await p.getByText('Recovered',{exact:true}).waitFor();assert.equal(attempts,2);
 await ctx.close();
 console.log('Default expansion, explicit AI loading, cache, retry, both themes and bilingual mobile layouts passed');
}finally{await b.close();}
