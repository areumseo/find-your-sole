export interface Shoe {
  id: number;
  name: string;
  brand: string;
  price: number;
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
