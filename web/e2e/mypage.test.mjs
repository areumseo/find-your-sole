import { BASE, launch } from './helpers.mjs';
const b = await launch();
let f=0; const ok=(c,m)=>{if(!c)f++;console.log(c?'ok  ':'FAIL',m)};
for (const [name,vp,scheme] of [['desktop',{width:1280,height:800},'light'],['mobile',{width:390,height:800},'dark']]) {
  const p = await (await b.newContext({viewport:vp,colorScheme:scheme,locale:'ko-KR'})).newPage();
  await p.goto(BASE + ''); await p.waitForSelector('.mode-card');
  ok(await p.locator('.tiles').count()===0, `${name} no tiles on home`);
  ok(await p.locator('.widget-empty').count()===0, `${name} no empty widgets on home`);
  await p.screenshot({path:`${process.env.E2E_SHOTS ?? ''}/home-${name}.png`});
  await p.evaluate(()=>localStorage.setItem('fys.favorites',JSON.stringify([{id:1,name:'Nike Pegasus 42',brand:'Nike',price:149000}])));
  await p.reload(); await p.waitForSelector('.mode-card');
  ok(await p.locator('.widget h2').first().textContent()==='저장한 신발', `${name} saved shows once present`);
  await p.goto(BASE + '#/me'); await p.waitForSelector('.tiles');
  ok(await p.locator('.tile').count()===3, `${name} 3 tiles on My Page`);
  ok(await p.locator('.panel h2').first().textContent()==='내 신발' && await p.locator('.widget').count()===0, `${name} one My Shoes panel, no saved widget on My Page`);
  await p.screenshot({path:`${process.env.E2E_SHOTS ?? ''}/me-${name}.png`, fullPage:true});
}
await b.close(); process.exit(f?1:0);
