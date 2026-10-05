import assert from 'node:assert/strict';
import {BASE,launch} from './helpers.mjs';
const b=await launch();
const shoes=Array.from({length:4},(_,i)=>({id:i+1,name:`Shoe ${i+1}`,brand:'Brand',price:149000,price_source:i===1?'estimate':'kr_list',price_usd:i===1?140:null,weight_g:i===2?null:180+i*10,drop_mm:i===2?null:8+i*2,cushion:i===2?'미확인':'중간',width:'보통',terrain:['로드'],arch:['normal'],pronation:['neutral'],use_case:['데일리'],weekly_km:'10이상',tags:[],score:90-i,budget_status:i===1?'unknown':'within',weight_note:'230mm 기준',naver_url:'https://search.shopping.naver.com/search/all?query=shoe',source_url:i===2?'javascript:alert(1)':'https://example.com/product',specs_checked_at:'2026-10-05',sale_available:true,sale_price:110000,sale_checked_at:i===0?'2020-01-01T00:00:00Z':new Date().toISOString(),sale_source_url:'https://example.com/product'}));
async function setup(locale='ko-KR',colorScheme='light',width=390) {
 const ctx=await b.newContext({locale,colorScheme,viewport:{width,height:844}}),p=await ctx.newPage();let ai=0;
 await p.route('**/recommend/comfort',r=>r.fulfill({json:shoes}));
 await p.route('**/explain',r=>{ai++;return r.fulfill({json:{explanation:'Unexpected'}});});
 return {ctx,p,ai:()=>ai};
}
try {
 for(const [locale,theme,width] of [['ko-KR','light',390],['ko-KR','dark',390],['en-US','light',1280],['en-US','dark',360]]) {
  const {ctx,p,ai}=await setup(locale,theme,width);
  await p.goto(BASE);await p.locator('.mode-card').nth(2).click();await p.locator('.btn-primary').click();await p.waitForSelector('article.card');
  await p.locator('.compare-select').nth(0).click();assert.ok(await p.locator('.compare-selection-bar button').isDisabled());
  await p.locator('.compare-select').nth(1).click();assert.ok(await p.locator('.compare-selection-bar button').isEnabled());
  await p.locator('.compare-select').nth(2).click();await p.locator('.more-results > summary').click();
  await p.locator('.compare-select').nth(3).click();await p.getByText(locale==='ko-KR'?'신발은 최대 3개까지 비교할 수 있어요.':'You can compare up to 3 shoes.',{exact:true}).waitFor();
  assert.equal(await p.locator('.compare-select[aria-pressed="true"]').count(),3);
  await p.locator('.compare-selection-bar button').click();await p.waitForURL('**/#/compare');await p.waitForSelector('.compare-table');
  assert.equal(await p.locator('.compare-table thead th').count(),4);assert.equal(ai(),0);
  const priceRow=p.locator('.compare-table tbody tr').nth(0);assert.ok((await priceRow.innerText()).includes('US$140'));
  const selling=p.locator('.compare-table tbody tr').nth(1);assert.ok((await selling.locator('td').nth(0).innerText()).includes(locale==='ko-KR'?'미확인':'Not confirmed'));
  const weight=p.locator('.compare-table tbody tr').nth(2);assert.ok((await weight.innerText()).includes(locale==='ko-KR'?'미확인':'Not confirmed'));
  assert.equal(await p.locator('.compare-table a[href^="javascript"]').count(),0);
  assert.ok(!(await p.locator('main').innerText()).includes('2020-01-01'));
  assert.ok((await p.locator('.panel').innerText()).includes(locale==='ko-KR'?'단정하지':'do not identify'));
  const scroll=p.locator('.compare-scroll');assert.equal(await p.locator('.compare-table th').first().evaluate(el=>getComputedStyle(el).position),'sticky');
  if(width<900) assert.ok(await scroll.evaluate(el=>el.scrollWidth>el.clientWidth));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`compare-${locale}-${theme}-${width}.png`,fullPage:true});
  await p.reload();await p.waitForSelector('.compare-table');assert.equal(await p.locator('.compare-chip').count(),3);
  await p.locator('.compare-chip').first().click();assert.equal(await p.locator('.compare-table thead th').count(),3);
  await p.locator('.compare-chip').first().click();assert.equal(await p.locator('.compare-table').count(),0);
  await p.locator('.compare-chip').click();assert.equal(await p.locator('.compare-chip').count(),0);
  await p.evaluate(shoe=>localStorage.setItem('fys.favorites',JSON.stringify([shoe])),shoes[0]);
  await p.goto(`${BASE}#/saved`);await p.waitForSelector('.compare-select');await p.locator('.compare-select').click();
  assert.equal(ai(),0);await p.goto(`${BASE}#/compare`);await p.waitForSelector('.compare-chip');assert.equal(await p.locator('.compare-chip').count(),1);
  await ctx.close();
 }
 for(const raw of ['{broken','{}',JSON.stringify([{shoe:{id:1,name:'Broken',brand:'B'},selected_at:'now'}])]) {
  const {ctx,p}=await setup();await p.addInitScript(value=>localStorage.setItem('fys.compare',value),raw);
  await p.goto(`${BASE}#/compare`);await p.waitForSelector('main .empty');assert.equal(await p.locator('.compare-chip').count(),0);await ctx.close();
 }
 const {ctx,p}=await setup();await p.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('blocked');};});
 await p.goto(BASE);await p.locator('.mode-card').nth(2).click();await p.locator('.btn-primary').click();await p.waitForSelector('article.card');
 await p.locator('.compare-select').nth(0).click();await p.locator('.compare-select').nth(1).click();await p.locator('.compare-selection-bar button').click();await p.waitForSelector('.compare-table');assert.equal(await p.locator('.compare-chip').count(),2);await ctx.close();
 console.log('Comparison selection, cap, persistence, safe prices/specs, responsive themes and blocked storage passed');
}finally{await b.close();}
