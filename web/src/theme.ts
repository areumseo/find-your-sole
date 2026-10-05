import { h } from './dom';
import { t } from './i18n';

export type Theme = 'light' | 'dark';

const KEY = 'fys.theme';
const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

// index.html applies a saved choice before first paint to avoid a flash; this
// covers the same ground if that inline script did not run.
try {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
} catch {
  // storage unavailable (private mode, blocked site data): follow the system
}

/** The theme in effect: an explicit choice, otherwise whatever the system prefers. */
export function currentTheme(): Theme {
  const set = root.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return systemDark.matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not persisted; still applies for this session
  }
  repaint();
}

// ── toggle button ─────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';

function icon(kind: 'sun' | 'moon'): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  })) svg.setAttribute(k, v);
  if (kind === 'sun') {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '4');
    const rays = document.createElementNS(NS, 'path');
    rays.setAttribute('d', 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41');
    svg.append(circle, rays);
  } else {
    const moon = document.createElementNS(NS, 'path');
    moon.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    svg.append(moon);
  }
  return svg;
}

let button: HTMLButtonElement | null = null;

function paint(btn: HTMLButtonElement): void {
  // Show where a tap leads: a sun in the dark, a moon in the light.
  const dark = currentTheme() === 'dark';
  const label = dark ? t().themeToLight : t().themeToDark;
  btn.replaceChildren(icon(dark ? 'sun' : 'moon'));
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

function repaint(): void {
  if (button) paint(button);
}

// With no saved choice the theme follows the system, so the icon must too.
systemDark.addEventListener('change', repaint);

/** The sun/moon button. Only the most recently created one is kept in sync. */
export function themeToggle(): HTMLButtonElement {
  const btn = h('button', {
    type: 'button',
    class: 'icon-toggle',
    onClick: () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
  });
  button = btn;
  paint(btn);
  return btn;
}
