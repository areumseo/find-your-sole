import { BASE, launch } from './helpers.mjs';

const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };

const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
const p = await ctx.newPage();
await p.goto(BASE);
await p.waitForSelector('.col-side .widget');
await p.waitForSelector('.pick');

ok((await p.locator('.col-side .widget h2').allTextContents()).join('|') === '솔이의 오늘의 픽|솔이의 한 입 상식', 'side column: pick then tip');
ok((await p.locator('.pick-name').textContent()).length > 3, 'pick has a shoe name');
const link = p.locator('.pick a');
ok((await link.getAttribute('href')).startsWith('https://search.shopping.naver.com/') && (await link.getAttribute('rel')).includes('noopener'), 'pick links to shopping safely');
ok((await p.locator('.pick-reason').textContent()).includes('쿠션'), 'pick shows a reason');
ok((await p.locator('.tip-q').textContent()).endsWith('?') && (await p.locator('.tip-a').textContent()).length > 20, 'tip has a question and answer');

// Same pick/tip all day for everyone: a reload shows the same ones.
const first = [await p.locator('.pick-name').textContent(), await p.locator('.tip-q').textContent()];
await p.reload();
await p.waitForSelector('.pick');
ok(first[0] === (await p.locator('.pick-name').textContent()) && first[1] === (await p.locator('.tip-q').textContent()), 'pick and tip are stable within a day');

// English switches the copy and refetches the pick in English.
await p.click('.lang');
await p.waitForFunction(() => /cushioning/.test(document.querySelector('.pick-reason')?.textContent ?? ''));
ok((await p.locator('.col-side .widget h2').first().textContent()) === 'Soli’s Pick of the Day', 'english titles');

// If the pick endpoint is down, the tip still shows and nothing breaks.
const errors = [];
const down = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' })).newPage();
down.on('pageerror', (e) => errors.push(e.message));
await down.route('**/pick*', (r) => r.abort());
await down.goto(BASE);
await down.waitForSelector('.tip');
ok((await down.locator('.pick').count()) === 0 && (await down.locator('.tip').count()) === 1 && errors.length === 0, 'pick failure leaves the tip and no errors', errors.join());

// With no news the side column still lays out as the single widget column.
const cols = await down.evaluate(() => getComputedStyle(document.querySelector('.widgets')).gridTemplateColumns.split(' ').length);
ok(cols === 1 || (await down.locator('.col-main').evaluate((e) => getComputedStyle(e).display)) === 'none', 'empty main column is hidden');

await b.close();
process.exit(fail ? 1 : 0);
