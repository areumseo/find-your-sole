// The app must open at the top: a reload (or a reopened tab) should not land
// the home page scrolled down, the top bar stays pinned on phones, and
// tapping the current tab scrolls back up.
import { BASE, launch } from './helpers.mjs';
const b = await launch();
let f=0; const ok=(c,m)=>{if(!c)f++;console.log(c?'ok  ':'FAIL',m)};
const p = await (await b.newContext({viewport:{width:390,height:700},locale:'ko-KR'})).newPage();
await p.goto(BASE); await p.waitForSelector('.mode-card');
const top = () => p.evaluate(() => window.scrollY);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
ok(await top() > 0, 'home can scroll down on a phone');
await p.reload(); await p.waitForSelector('.mode-card'); await p.waitForTimeout(300);
ok(await top() === 0, 'reload opens home at the top');
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
ok(await p.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().top) === 0, 'top bar stays pinned while scrolled');
await p.locator('.tabs a[href="#/"]').click(); await p.waitForTimeout(300);
ok(await top() === 0, 'tapping the current tab scrolls to the top');
await b.close(); process.exit(f?1:0);
