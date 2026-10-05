import { h } from '../dom';
import { getLocale, setLocale, t, type Locale } from '../i18n';
import { chips, pageHeader } from '../ui';
import { statTiles } from './dashboard';
import { myShoesSection } from './myShoes';

const LOCALES: { id: Locale; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
];

export function languageChips(): HTMLElement {
  return chips({
    options: LOCALES.map((l) => l.label),
    selected: new Set([LOCALES.findIndex((l) => l.id === getLocale())]),
    // Never allow an empty selection; setLocale re-renders the page.
    onChange: (next) => {
      const picked = [...next][0];
      if (picked === undefined) return new Set([LOCALES.findIndex((l) => l.id === getLocale())]);
      setLocale(LOCALES[picked].id);
    },
  });
}

export function renderMe(rerender: () => void): HTMLElement {
  const s = t();
  // Saved shoes live in their own tab; this page is only about the shoes you own.
  return h('div', { class: 'page-wide' },
    pageHeader(s.mePageTitle),
    h('p', { class: 'notice-card', role: 'note' }, 'ⓘ ', s.deviceNotice),
    myShoesSection(rerender, statTiles()),
  );
}
