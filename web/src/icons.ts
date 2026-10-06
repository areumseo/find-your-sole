const NS = 'http://www.w3.org/2000/svg';

/** Outline icons for the menu, drawn with one stroke weight so they read as a set. Shapes are fixed here, never from data. */
const SHAPES = {
  home: ['M3.5 11 12 4l8.5 7', 'M5.5 9.5V20h13V9.5', 'M10 20v-5.5h4V20'],
  saved: ['M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z'],
  compare: ['M4 8h14', 'm14.5 4.5 3.5 3.5-3.5 3.5', 'M20 16H6', 'm9.5 12.5L6 16l3.5 3.5'],
  me: ['M4.5 20c.8-4 3.7-6 7.5-6s6.7 2 7.5 6'],
  about: ['M12 11v5.2', 'M12 7.8h.01'],
} as const;

export type IconName = keyof typeof SHAPES;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ico');
  const add = (tag: string, attrs: Record<string, string>) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  for (const d of SHAPES[name]) add('path', { d });
  if (name === 'me') add('circle', { cx: '12', cy: '8.5', r: '3.7' });
  if (name === 'about') add('circle', { cx: '12', cy: '12', r: '8.5' });
  return svg;
}
