export interface Shoe {
  id: number;
  name: string;
  brand: string;
  price: number;
  /** "kr_list" when the KRW price is a Korean list price, "estimate" when it is not. */
  price_source?: string | null;
  /** Overseas list price in USD, present when the KRW price is an estimate. */
  price_usd?: number | null;
  /** The brand's official site, linked from the brand name. */
  brand_url?: string | null;
  weight_g: number | null;
  drop_mm: number | null;
  cushion: string;
  terrain: string[];
  arch: string[];
  pronation: string[];
  use_case: string[];
  weekly_km: string;
  width: string;
  tags: string[];
  score: number;
  /** The price is above the budget the person set. */
  over_budget?: boolean;
  budget_status?: 'within' | 'unknown' | 'over';
  naver_url: string;
  source_url?: string | null;
  specs_checked_at?: string | null;
  weight_note?: string | null;
  sale_price?: number | null;
  sale_price_max?: number | null;
  sale_available?: boolean | null;
  sale_checked_at?: string | null;
  sale_source_url?: string | null;
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
  brand_url?: string | null;
  price: number;
  price_source?: string | null;
  price_usd?: number | null;
  weight_g: number | null;
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
