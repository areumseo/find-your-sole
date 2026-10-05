// Shared setup for the browser tests. Start the stack with `npm run e2e` (or
// point E2E_BASE at a running site) and set CHROMIUM_PATH if Playwright cannot
// find a browser on its own.
import { chromium } from 'playwright-core';
import path from 'node:path';

export const BASE = process.env.E2E_BASE || 'http://localhost:4173/';

// Screenshots are for eyeballing only; they are skipped unless E2E_SHOTS names a folder.
const SHOTS = process.env.E2E_SHOTS;

export async function launch() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const ctx = await newContext(...args);
    const newPage = ctx.newPage.bind(ctx);
    ctx.newPage = async () => {
      const page = await newPage();
      const shot = page.screenshot.bind(page);
      page.screenshot = (opts = {}) =>
        SHOTS ? shot({ ...opts, path: opts.path ? path.join(SHOTS, path.basename(opts.path)) : undefined }) : Promise.resolve();
      return page;
    };
    return ctx;
  };
  return browser;
}
