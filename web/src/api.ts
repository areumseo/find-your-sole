import type { DailyPick, NewsItem, NewsResult, Prefs, Shoe } from './types';

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://find-your-sole.onrender.com';

// Render's free tier sleeps when idle and can take a minute to wake, so be
// generous before giving up.
const TIMEOUT_MS = 90_000;

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function get<T>(path: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// News is a nice-to-have: any failure resolves to an empty list (the widget just
// stays hidden) instead of an error. A good result is reused for a few minutes so
// moving between tabs does not refetch; an empty one is retried after a minute,
// since the backend may simply have been asleep.
const NEWS_REUSE_MS = 10 * 60_000;
const NEWS_RETRY_MS = 60_000;
let news: { at: number; result: Promise<NewsResult> } | null = null;

async function loadNews(): Promise<NewsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${BASE_URL}/news`, { signal: controller.signal });
    if (!res.ok) return { items: [] };
    const list = (await res.json()) as unknown;
    return {
      items: Array.isArray(list) ? (list as NewsItem[]) : [],
      updatedAt: res.headers.get('X-News-Updated') ?? undefined,
    };
  } catch {
    return { items: [] };
  } finally {
    clearTimeout(timer);
  }
}

export function fetchNews(): Promise<NewsResult> {
  if (news && Date.now() - news.at < NEWS_REUSE_MS) return news.result;
  const result = loadNews();
  const entry = { at: Date.now(), result };
  news = entry;
  void result.then((r) => {
    if (!r.items.length && news === entry) entry.at = Date.now() - NEWS_REUSE_MS + NEWS_RETRY_MS;
  });
  return result;
}

/** Today's pick; like news it is optional, so failure resolves to null. */
export function fetchPick(locale: string): Promise<DailyPick | null> {
  return get<DailyPick>(`/pick?locale=${encodeURIComponent(locale)}`, 20_000).catch(() => null);
}

/**
 * Fire-and-forget request that wakes a sleeping backend while the user is
 * still filling in the form, so their first real request is not the slow one.
 */
export function warmUp(): void {
  fetch(`${BASE_URL}/health`).catch(() => {});
}

export interface BeginnerRequest {
  frequency: string;
  terrain: string;
  pain: string;
  wide_foot: boolean;
  budget: number;
  weight_kg?: number;
  brand_filter: string[];
}

export interface ExpertRequest {
  arch: string;
  pronation: string;
  terrain: string;
  use_case: string[];
  cushion: string;
  width: string;
  weekly_km: number;
  budget: number;
  weight_kg?: number;
  brand_filter: string[];
}

export interface ComfortRequest {
  where: string;
  hours: string;
  pain: string[];
  wide_foot: boolean;
  budget: number;
  brand_filter: string[];
}

export const recommendComfort = (req: ComfortRequest) =>
  post<Shoe[]>('/recommend/comfort', req);

export const recommendBeginner = (req: BeginnerRequest) =>
  post<Shoe[]>('/recommend/beginner', req);

export const recommendExpert = (req: ExpertRequest) =>
  post<Shoe[]>('/recommend/expert', req);

export async function explainShoe(shoe: Shoe, prefs: Prefs, locale: string): Promise<string> {
  const { explanation } = await post<{ explanation: string }>('/explain', {
    shoe: {
      name: shoe.name,
      brand: shoe.brand,
      cushion: shoe.cushion,
      drop_mm: shoe.drop_mm,
      weight_g: shoe.weight_g,
      width: shoe.width,
      terrain: shoe.terrain,
      use_case: shoe.use_case,
      tags: shoe.tags,
    },
    prefs,
    locale,
  });
  return explanation;
}

// ── Feedback ──────────────────────────────────────────────
export interface FeedbackItem {
  id: number;
  message: string;
  context: string;
  created_at: string;
  resolved: boolean;
  has_screenshot: boolean;
}

/** Error that keeps the HTTP status so callers can word the message for the user. */
export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function call(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (rest.body) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  if (!res.ok) throw new HttpError(res.status);
  return res;
}

export async function sendFeedback(message: string, context: string, screenshot: string | null, website: string): Promise<void> {
  await call('/feedback', { method: 'POST', body: JSON.stringify({ message, context, screenshot, website }) });
}

export async function adminList(token: string): Promise<FeedbackItem[]> {
  return (await (await call('/admin/feedback', { token })).json()) as FeedbackItem[];
}

export interface ServerCheck {
  ok: boolean | null;
  detail: string;
}

/** Result of the checks the server runs at startup (keys, database, admin token). */
export async function adminStatus(token: string): Promise<Record<string, ServerCheck>> {
  return (await (await call('/admin/status', { token })).json()) as Record<string, ServerCheck>;
}

export async function adminScreenshot(token: string, id: number): Promise<Blob> {
  return (await call(`/admin/feedback/${id}/screenshot`, { token })).blob();
}

export async function adminResolve(token: string, id: number): Promise<boolean> {
  const res = await call(`/admin/feedback/${id}/resolve`, { method: 'POST', token });
  return ((await res.json()) as { resolved: boolean }).resolved;
}
