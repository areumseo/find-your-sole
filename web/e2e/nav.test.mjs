import { BASE, launch } from './helpers.mjs';
const b = await launch();
let f=0; const ok=(c,m)=>{if(!c)f++;console.log(c?'ok  ':'FAIL',m)};
for (const [n,vp] of [['desktop',{width:1280,height:800}],['mobile',{width:390,height:800}]]) {
  const p = await (await b.newContext({viewport:vp,locale:'ko-KR'})).newPage();
  await p.goto(BASE + ''); await p.waitForSelector('.mode-card');
  const labels = await p.locator('.tabs a:visible').allTextContents();
  console.log(n, labels.join(' | '));
  ok(!labels.some(l=>l.includes('검색')), `${n} no search item`);
  ok((await p.locator('.tabs a:visible svg.ico').count()) === 5, `${n} menu icons are line icons (svg), one per entry`);
  await p.goto(BASE + '#/search'); await p.waitForSelector('.mode-card');
  ok(new URL(p.url()).hash==='#/', `${n} #/search redirects home`);
  await p.locator('.mode-card').first().click(); await p.waitForSelector('.form-grid');
  ok(await p.locator('.tabs a[aria-current=page]').first().textContent().then(x=>x.includes('홈')), `${n} home highlighted in form`);
  await p.getByRole('button',{name:'뒤로'}).click().catch(async()=>{await p.locator('.back, [aria-label=뒤로]').first().click();});
  await p.waitForSelector('.mode-card');
  ok(new URL(p.url()).hash==='#/'||new URL(p.url()).hash==='', `${n} back returns home`);
  await p.goto(BASE + '#/search/results'); await p.waitForSelector('.mode-card');
  ok(new URL(p.url()).hash==='#/', `${n} stale results go home`);
}
await b.close(); process.exit(f?1:0);
