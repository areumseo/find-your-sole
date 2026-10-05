import { BASE, launch } from './helpers.mjs';
const b = await launch();
let fail = 0; const ok = (c, m) => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m); };
const U = BASE;
for (const [name, vp, scheme] of [['desktop',{width:1280,height:800},'light'],['mobile',{width:390,height:800},'dark']]) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme });
  const p = await ctx.newPage(); await p.goto(U); await p.waitForSelector('.icon-toggle');
  const attr = () => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(await attr() === null, `${name} default follows system`);
  const bg0 = await bg();
  await p.click('.icon-toggle');
  const want = scheme === 'dark' ? 'light' : 'dark';
  ok(await attr() === want, `${name} click -> ${want}`);
  ok(await bg() !== bg0, `${name} background changed`);
  ok(await p.evaluate(() => localStorage.getItem('fys.theme')) === want, `${name} stored`);
  await p.reload(); await p.waitForSelector('.icon-toggle');
  ok(await attr() === want, `${name} persists`);
  const lab = await p.getAttribute('.icon-toggle', 'aria-label'); 
  await p.click('.lang');
  ok((await p.getAttribute('.icon-toggle','aria-label')) !== lab, `${name} label localized on lang toggle`);
  const t = await p.locator('.icon-toggle').boundingBox(), l = await p.locator('.lang').boundingBox(), br = await p.locator('.brand-name').boundingBox();
  ok(Math.abs(t.y+t.height/2 - (l.y+l.height/2)) < 6, `${name} aligned with lang`);
  ok(!(t.x < br.x+br.width && t.x+t.width > br.x && t.y < br.y+br.height && t.y+t.height > br.y), `${name} no brand overlap`);
  ok(t.x+t.width <= vp.width && t.y+t.height <= vp.height, `${name} in viewport`);
  await p.screenshot({ path: `${process.env.S}/theme-${name}.png` });
  await ctx.close();
}
// storage failure
const c2 = await b.newContext(); const p2 = await c2.newPage();
await p2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('x'); } }); });
const errs = []; p2.on('pageerror', e => errs.push(e.message));
await p2.goto(U); await p2.waitForSelector('.icon-toggle'); await p2.click('.icon-toggle');
ok(errs.length === 0 && await p2.evaluate(() => document.documentElement.dataset.theme) !== undefined, 'storage failure ok');
await b.close(); process.exit(fail ? 1 : 0);
