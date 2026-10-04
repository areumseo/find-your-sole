import type { Prefs, Shoe } from './types';

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
