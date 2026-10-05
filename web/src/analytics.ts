/** Only allowlisted routes and event fields reach GA; never forward form answers. */
const ID = 'G-02CCFQWHZ1';
const ROUTES = new Set(['/', '/search/beginner', '/search/expert', '/search/comfort', '/search/results', '/compare', '/saved', '/me', '/about', '/more']);
let started = false;
let previous = '';
let lastPage = '';
const analyticsWindow = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
function allowed(): boolean {
  return import.meta.env.PROD && ['findyoursole.app', 'www.findyoursole.app'].includes(location.hostname)
    && !location.hash.startsWith('#/admin');
}
function init(): boolean {
  if (!allowed()) return false;
  if (!started) {
    started = true;
    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
    // gtag.js consumes Arguments commands; plain arrays are data-layer method calls.
    analyticsWindow.gtag = function () { analyticsWindow.dataLayer!.push(arguments); };
    analyticsWindow.gtag('js', new Date());
    analyticsWindow.gtag('config', ID, { send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false, page_location: location.origin + '/', page_referrer: safeReferrer()
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
    document.head.append(script);
  }
  return true;
}
export function trackPage(path: string): void {
  if (!ROUTES.has(path)) { lastPage = ''; return; }
  if (!init() || path === lastPage) return;
  lastPage = path;
  const url = location.origin + '/#' + path;
  analyticsWindow.gtag!('event', 'page_view', {page_location: url,
    page_title: `Find Your Sole ${path}`, page_referrer: previous || safeReferrer()});
  previous = url;
  if (['/search/beginner', '/search/expert', '/search/comfort'].includes(path)) {
    track('recommendation_start', {mode: path.split('/').pop()!});
  }
}
function safeReferrer(): string {
  try { return document.referrer ? new URL(document.referrer).origin + '/' : ''; } catch { return ''; }
}
type Event = 'recommendation_start' | 'recommendation_complete' | 'explanation_open' | 'favorite_add' | 'favorite_remove' | 'shopping_click';
export function track(event: Event, fields: {mode?: string; shoe_id?: number; result_count?: number} = {}): void {
  if (!init()) return;
  const params: Record<string, string | number> = {};
  if (['beginner', 'expert', 'comfort'].includes(fields.mode || '')) params.mode = fields.mode!;
  if (Number.isInteger(fields.shoe_id) && fields.shoe_id! > 0) params.shoe_id = fields.shoe_id!;
  if (Number.isInteger(fields.result_count) && fields.result_count! >= 0) params.result_count = fields.result_count!;
  analyticsWindow.gtag!('event', event, params);
}
