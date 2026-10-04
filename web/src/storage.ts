import type { OwnedShoe, Shoe } from './types';

// localStorage can throw (private mode, blocked site data) or hold garbage, so
// every read degrades to an empty value instead of breaking the page.
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is unavailable; the app keeps working for this session only.
  }
}

// ── Favorites ─────────────────────────────────────────────
const FAVORITES = 'fys.favorites';

export const favorites = {
  all: (): Shoe[] => read<Shoe[]>(FAVORITES, []),
  has: (id: number): boolean => favorites.all().some((s) => s.id === id),
  toggle(shoe: Shoe): boolean {
    const all = favorites.all();
    const exists = all.some((s) => s.id === shoe.id);
    write(FAVORITES, exists ? all.filter((s) => s.id !== shoe.id) : [...all, shoe]);
    return !exists;
  },
};

// ── My Shoes ──────────────────────────────────────────────
const MY_SHOES = 'fys.myShoes';

export const myShoes = {
  all(): OwnedShoe[] {
    return read<OwnedShoe[]>(MY_SHOES, []).sort((a, b) =>
      b.purchased_at.localeCompare(a.purchased_at) || b.id - a.id,
    );
  },
  add(name: string, brand: string): void {
    const all = read<OwnedShoe[]>(MY_SHOES, []);
    // Highest id + 1, not length + 1, so ids stay unique after deletions.
    const id = all.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    all.push({ id, name, brand, purchased_at: new Date().toISOString().slice(0, 10), km: 0 });
    write(MY_SHOES, all);
  },
  updateKm(id: number, km: number): void {
    write(MY_SHOES, read<OwnedShoe[]>(MY_SHOES, []).map((s) => (s.id === id ? { ...s, km } : s)));
  },
  remove(id: number): void {
    write(MY_SHOES, read<OwnedShoe[]>(MY_SHOES, []).filter((s) => s.id !== id));
  },
};
