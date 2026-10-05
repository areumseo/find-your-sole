import assert from 'node:assert/strict';
import { BASE, launch } from './helpers.mjs';

// Crawlers must receive sharing metadata without executing JavaScript.
const response = await fetch(BASE);
assert.equal(response.status, 200);
const html = await response.text();
assert.match(html, /<title>Find Your Sole — 내 발에 맞는 한 켤레<\/title>/);
assert.match(html, /property="og:image" content="https:\/\/findyoursole.app\/social-preview.png"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
const image = await fetch(new URL('social-preview.png', BASE));
assert.equal(image.status, 200);
assert.match(image.headers.get('content-type'), /image\/png/);
const bytes = Buffer.from(await image.arrayBuffer());
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 630);

const browser = await launch();
try {
  const context = await browser.newContext({locale: 'ko-KR'});
  const page = await context.newPage();
  await page.route('**/news*', route => route.fulfill({json:{items:[]}}));
  await page.route('**/pick*', route => route.fulfill({json:{}}));
  await page.goto(BASE);
  await page.getByRole('button', {name:'Switch to English', exact:true}).waitFor();
  assert.equal(await page.title(), 'Find Your Sole — 내 발에 맞는 한 켤레');
  await page.getByRole('button', {name:'Switch to English', exact:true}).click();
  assert.equal(await page.title(), 'Find Your Sole — Find Your Fit');
} finally { await browser.close(); }
console.log('Social metadata, PNG and localized runtime titles passed');
