import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from './helpers.mjs';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const browser = await launch();
async function setup(host = 'findyoursole.app') {
  const ctx = await browser.newContext({locale:'ko-KR',viewport:{width:390,height:844}});
  const p = await ctx.newPage();
  let scripts = 0;
  await p.route('https://www.googletagmanager.com/**', r => { scripts++; return r.fulfill({body:'',contentType:'text/javascript'}); });
  await p.route(`https://${host}/**`, async r => {
    const pathname = new URL(r.request().url()).pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (file.includes('..')) return r.abort();
    const contentType = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : undefined;
    try { await r.fulfill({body:await readFile(root+file),contentType}); } catch { await r.fulfill({status:404,body:''}); }
  });
  await p.route('https://find-your-sole.onrender.com/**', r => r.fulfill({json:{}}));
  const shoe = {id:65,name:'Test shoe',brand:'LeMouton',price:149000,price_source:'kr_list',weight_g:181,drop_mm:null,cushion:'미확인',width:'미확인',terrain:['로드'],arch:[],pronation:[],use_case:['데일리'],weekly_km:'미확인',tags:[],score:90,budget_status:'within',naver_url:'https://search.shopping.naver.com/search/all?query=Test'};
  await p.route('**/recommend/comfort',r=>r.fulfill({json:[shoe]}));
  await p.route('**/explain',r=>r.fulfill({json:{explanation:'Test explanation'}}));
  return {ctx,p,scripts:()=>scripts};
}
try {
  const {ctx,p,scripts} = await setup();
  await p.goto('https://findyoursole.app/?private=secret');
  await p.locator('.mode-card').nth(2).click();
  await p.locator('.btn-primary').click();
  await p.waitForSelector('article.card');
  await p.locator('.detail-toggle').click();
  await p.locator('.explain').waitFor();
  await p.locator('article .icon-btn').first().click();
  await p.locator('article .icon-btn').first().click();
  await p.locator('.btn-outline-naver').evaluate(el=>el.addEventListener('click',e=>e.preventDefault()));
  await p.locator('.btn-outline-naver').click();
  const commands = await p.evaluate(()=>window.dataLayer);
  assert.equal(scripts(),1);
  assert.equal(commands.find(x=>x[0]==='config')[1],'G-02CCFQWHZ1');
  assert.equal(commands.find(x=>x[0]==='config')[2].send_page_view,false);
  const events = commands.filter(x=>x[0]==='event');
  assert.equal(events.filter(x=>x[1]==='page_view').length,3);
  for (const event of ['recommendation_start','recommendation_complete','explanation_open','favorite_add','favorite_remove','shopping_click']) assert.equal(events.filter(x=>x[1]===event).length,1,event);
  assert.ok(!JSON.stringify(commands).includes('private=secret'));
  for (const event of events.filter(x=>x[1]!=='page_view')) assert.ok(Object.keys(event[2]).every(k=>['mode','shoe_id','result_count'].includes(k)));
  const count=commands.length;
  await p.evaluate(()=>{location.hash='#/admin';});
  await p.waitForTimeout(100);
  assert.equal(await p.evaluate(()=>window.dataLayer.length),count);
  await ctx.close();
  for (const [host,hash] of [['findyoursole.app','#/admin'],['localhost','']]) {
    const test = await setup(host);
    await test.p.goto(`https://${host}/${hash}`);
    await test.p.waitForTimeout(100);
    assert.equal(test.scripts(),0);
    assert.equal(await test.p.evaluate(()=>window.dataLayer),undefined);
    await test.ctx.close();
  }
  console.log('GA4 routes, funnel actions, safe parameters, admin and local exclusions passed');
} finally { await browser.close(); }
