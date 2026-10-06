import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BASE, launch } from './helpers.mjs';

// Needs the API started with ADMIN_TOKEN=e2e-admin-token (run-all.mjs does this).
const TOKEN = 'e2e-admin-token';
const API = 'http://localhost:8000';
const b = await launch();
let fail = 0;
const ok = (c, m, extra = '') => { if (!c) fail++; console.log(c ? 'ok  ' : 'FAIL', m, c ? '' : extra); };
const stamp = Date.now();

const open = async (width) => {
  const ctx = await b.newContext({ viewport: { width, height: 800 }, locale: 'ko-KR' });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForSelector('.fab', { state: 'attached' });
  return page;
};
const adminList = async (page) => (await page.request.get(`${API}/admin/feedback`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();

// A large PNG made in the browser: far over the server limit until the page shrinks it.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fys-fb-'));
const maker = await open(1280);
const pngB64 = await maker.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 3200; c.height = 2400;
  const g = c.getContext('2d');
  const d = g.createImageData(c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.random() * 255; d.data[i + 1] = Math.random() * 255; d.data[i + 2] = Math.random() * 255; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  return c.toDataURL('image/png').split(',')[1];
});
const bigPng = path.join(tmp, 'shot.png');
fs.writeFileSync(bigPng, Buffer.from(pngB64, 'base64'));
ok(fs.statSync(bigPng).size > 1_500_000, 'test screenshot is over the server limit before shrinking', String(fs.statSync(bigPng).size));
const fakePng = path.join(tmp, 'fake.png');
fs.writeFileSync(fakePng, '<html>not an image</html>');

// ── The button ──
const desktop = await open(1280);
ok((await desktop.locator('.fab').count()) === 1, 'one feedback button on Home');
await desktop.goto(BASE + '#/about');
ok((await desktop.locator('.fab').count()) === 1, 'the button stays on other pages');
const box = await desktop.locator('.fab').boundingBox();
ok(box.x + box.width > 1200 && box.y + box.height > 700, 'desktop: bottom-right corner', JSON.stringify(box));

const mobile = await open(390);
ok(await mobile.locator('.fab').isVisible(), 'mobile: the floating feedback button is shown');
await mobile.click('.fab');
await mobile.waitForSelector('dialog[open] textarea');
ok(await mobile.locator('dialog textarea').isVisible(), 'mobile feedback opens from the floating button');
await mobile.keyboard.press('Escape');

// ── Sending ──
await desktop.goto(BASE + '#/saved');
await desktop.click('.fab');
await desktop.waitForSelector('dialog[open] textarea');
await desktop.click('dialog button[type=submit]');
ok((await desktop.locator('dialog[open]').count()) === 1 && (await adminList(desktop)).length === 0, 'an empty note is not sent');

await desktop.setInputFiles('dialog input[type=file]', fakePng);
await desktop.waitForSelector('dialog .notice.error');
ok((await desktop.locator('dialog .feedback-preview img').count()) === 0, 'a file that is not an image is refused with a message');

await desktop.fill('dialog textarea', `  e2e feedback ${stamp}  `);
ok((await desktop.textContent('.feedback-count')).startsWith(`${`  e2e feedback ${stamp}  `.length} /`), 'character counter');
await desktop.setInputFiles('dialog input[type=file]', bigPng);
await desktop.waitForSelector('dialog .feedback-preview img');
await desktop.click('dialog button[type=submit]');
await desktop.waitForSelector('.toast.show');
ok((await desktop.textContent('.toast')).includes('고마워요'), 'thank-you toast');
ok((await desktop.locator('dialog').count()) === 0, 'dialog closes after sending');

const list = await adminList(desktop);
const mine = list.find((r) => r.message === `e2e feedback ${stamp}`);
ok(!!mine && mine.context === '저장' && mine.has_screenshot === true, 'stored trimmed, with the page it came from and a screenshot', JSON.stringify(mine));
const shot = await desktop.request.get(`${API}/admin/feedback/${mine.id}/screenshot`, { headers: { Authorization: `Bearer ${TOKEN}` } });
const body = await shot.body();
ok(shot.headers()['content-type'] === 'image/jpeg' && body.length < 1_500_000 && body.length > 1000, 'screenshot was shrunk to a jpeg under the limit', `${shot.headers()['content-type']} ${body.length}`);

// ── Honeypot: looks like success, stores nothing ──
const before = (await adminList(desktop)).length;
await desktop.click('.fab');
await desktop.waitForSelector('dialog[open] textarea');
await desktop.fill('dialog textarea', 'bot message');
await desktop.evaluate(() => { document.querySelector('dialog input[name=website]').value = 'http://spam'; });
await desktop.click('dialog button[type=submit]');
await desktop.waitForSelector('.toast.show');
ok((await adminList(desktop)).length === before, 'a filled honeypot is dropped silently');

// ── Errors shown to the user ──
const busy = await open(1280);
await busy.route('**/feedback', (r) => r.fulfill({ status: 429, headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
await busy.click('.fab');
await busy.fill('dialog textarea', 'x');
await busy.click('dialog button[type=submit]');
await busy.waitForSelector('dialog .notice.error');
ok((await busy.textContent('dialog .notice')).includes('잠시'), '429 shows the "try again later" message');
ok((await busy.locator('dialog button[type=submit]').isEnabled()), 'the send button recovers so the text is not lost');
ok((await busy.inputValue('dialog textarea')) === 'x', 'the typed text is kept');

// ── Admin page ──
const admin = await open(1280);
ok((await admin.locator('a[href="#/admin"]').count()) === 0, 'no link to the admin page anywhere');
await admin.goto(BASE + '#/admin');
await admin.waitForSelector('input[type=password]');
await admin.fill('input[type=password]', 'wrong');
await admin.click('.admin-login button');
await admin.waitForSelector('.admin-login .notice.error');
ok((await admin.textContent('.admin-login .notice')).includes('맞지 않아요'), 'a wrong token is refused');
await admin.fill('input[type=password]', TOKEN);
await admin.click('.admin-login button');
await admin.waitForSelector('.admin-item');
ok((await admin.textContent('.admin-item')).includes(`e2e feedback ${stamp}`), 'the inbox lists the message');
ok((await admin.textContent('.admin-count')).includes('미해결'), 'open/total counter');
await admin.waitForSelector('.admin-status li');
const checks = await admin.locator('.admin-status li').count();
ok(checks === 4 && (await admin.textContent('.admin-status')).includes('피드백 저장소'), 'the admin page lists the four startup checks', String(checks));
await admin.click('.admin-item >> text=스크린샷 보기');
await admin.waitForSelector('dialog.admin-shot img');
ok(await admin.locator('dialog.admin-shot img').evaluate((i) => i.complete && i.naturalWidth > 0), 'the screenshot opens');
await admin.keyboard.press('Escape');
await admin.click('.admin-item >> text=해결됨으로 표시');
await admin.waitForFunction(() => !document.querySelector('.admin-item'));
ok((await admin.locator('.admin-item').count()) === 0, 'resolved items are hidden by default');
await admin.uncheck('.admin-hide input');
await admin.waitForSelector('.admin-item.resolved');
ok((await admin.textContent('.admin-item.resolved')).includes('해결됨'), 'shown again with the filter off, marked resolved');
await admin.reload();
await admin.waitForSelector('.admin-item, .empty');
ok((await admin.locator('.admin-bar').count()) === 1, 'the token survives a reload (session only)');
await admin.click('text=나가기');
await admin.waitForSelector('input[type=password]');
ok(true, 'sign out returns to the token form');

await b.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
