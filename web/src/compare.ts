import type { Prefs, Shoe } from './types';
export interface CompareEntry {
  shoe: Shoe;
  selected_at: string;
  matches?: {width: boolean; cushion: boolean; terrain: boolean};
}
const KEY = 'fys.compare';
export const MAX_COMPARE = 3;
const listeners = new Set<() => void>();
function valid(value: unknown): value is CompareEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as CompareEntry;
  return !!e.shoe && Number.isInteger(e.shoe.id) && e.shoe.id > 0 && typeof e.shoe.name === 'string'
    && typeof e.shoe.brand === 'string' && typeof e.shoe.price === 'number' && Number.isFinite(e.shoe.price) && e.shoe.price >= 0 && typeof e.selected_at === 'string' && Number.isFinite(Date.parse(e.selected_at));
}
function parse(raw: string | null): CompareEntry[] {
  try {
    const values: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(values)) return [];
    const seen = new Set<number>();
    return values.filter(valid).filter(e => {if (seen.has(e.shoe.id)) return false; seen.add(e.shoe.id); return true;}).slice(0, MAX_COMPARE).map(e => ({shoe: e.shoe, selected_at:e.selected_at, matches:e.matches && ['width','cushion','terrain'].every(k=>typeof e.matches![k as keyof typeof e.matches] === 'boolean') ? e.matches : undefined}));
  } catch {return [];}
}
let selected: CompareEntry[] = [];
try {selected = parse(localStorage.getItem(KEY));} catch { /* Session-only selection. */ }
function changed(): void {
  try {localStorage.setItem(KEY, JSON.stringify(selected));} catch { /* Keep selection in memory. */ }
  listeners.forEach(listener => listener());
}
export const comparison = {
  all: (): CompareEntry[] => [...selected],
  has: (id: number): boolean => selected.some(e => e.shoe.id === id),
  subscribe(listener: () => void): void {listeners.add(listener);},
  toggle(shoe: Shoe, prefs?: Prefs): boolean {
    if (comparison.has(shoe.id)) {comparison.remove(shoe.id); return true;}
    if (selected.length >= MAX_COMPARE) return false;
    selected.push({shoe, selected_at: new Date().toISOString(), matches: prefs ? {
      width: shoe.width !== '미확인' && shoe.width === prefs.width,
      cushion: shoe.cushion !== '미확인' && shoe.cushion === prefs.cushion,
      terrain: typeof prefs.terrain === 'string' && Array.isArray(shoe.terrain) && shoe.terrain.includes(prefs.terrain),
    } : undefined});
    changed();return true;
  },
  remove(id: number): void {selected = selected.filter(e => e.shoe.id !== id);changed();},
  clear(): void {selected = [];changed();},
};
window.addEventListener('storage', event => {
  if (event.key === KEY || event.key === null) {selected = parse(event.newValue);listeners.forEach(listener => listener());}
});
