export interface Shoe {
  id: number;
  name: string;
  brand: string;
  price: number;
  /** "kr_list" when the KRW price is a Korean list price, "estimate" when it is not. */
  price_source?: string | null;
  /** Overseas list price in USD, present when the KRW price is an estimate. */
  price_usd?: number | null;
  weight_g: number;
  drop_mm: number;
  cushion: string;
  terrain: string[];
  arch: string[];
  pronation: string[];
  use_case: string[];
  weekly_km: string;
  width: string;
  tags: string[];
  score: number;
  naver_url: string;
}

/** What the backend's /explain endpoint reads from the user's answers. */
export type Prefs = Record<string, string | number>;

export interface OwnedShoe {
  id: number;
  name: string;
  brand: string;
  purchased_at: string;
  km: number;
}

export interface DailyPick {
  name: string;
  brand: string;
  price: number;
  price_source?: string | null;
  price_usd?: number | null;
  weight_g: number;
  cushion: string;
  categories: string[];
  reason: string;
  naver_url: string;
}

export interface NewsResult {
  items: NewsItem[];
  /** ISO 8601 UTC: when the server last refreshed the news, if it says. */
  updatedAt?: string;
}

export interface NewsItem {
  title: string;
  /** Publisher host, e.g. "example.com", or "네이버 뉴스". */
  source: string;
  url: string;
  /** ISO 8601, UTC. */
  published_at: string;
}
