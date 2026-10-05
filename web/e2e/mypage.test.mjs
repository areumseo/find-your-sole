import { BASE, launch } from './helpers.mjs';
const b = await launch();
let f=0; const ok=(c,m,extra='')=>{if(!c)f++;console.log(c?'ok  ':'FAIL',m,c?'':extra)};
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
// Phone layout: the shoe name must not be squeezed by the distance and the actions.
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })).newPage();
  await p.addInitScript(() => localStorage.setItem('fys.myShoes', JSON.stringify([
    { id: 1, name: 'Nike Pegasus 42', brand: 'Nike', purchased_at: '2026-01-01', km: 520 },
  ])));
  await p.goto(BASE + '#/me');
  await p.waitForSelector('.card.owned');
  const name = await p.locator('.owned .shoe-name').boundingBox();
  const menu = await p.locator('.owned .menu').boundingBox();
  const card = await p.locator('.card.owned').boundingBox();
  ok(name.height < 40 && name.width > 100, 'phone: the shoe name stays on one or two short lines', JSON.stringify(name));
  ok(menu.y > name.y + name.height - 1 && menu.x + menu.width <= card.x + card.width + 1, 'phone: the actions sit on their own row inside the card', JSON.stringify({ menu, card }));
  ok((await p.locator('.owned .menu button').count()) === 2, 'phone: both actions are still there');
}

await b.close(); process.exit(f?1:0);
