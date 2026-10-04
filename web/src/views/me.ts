import { h } from '../dom';
import { getLocale, setLocale, t, type Locale } from '../i18n';
import { chips, pageHeader, section } from '../ui';
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
  return h('div', { class: 'page-wide' },
    pageHeader(s.mePageTitle),
    h('p', { class: 'notice-card', role: 'note' }, 'ⓘ ', s.deviceNotice),
    myShoesSection(rerender),
    h('section', { class: 'block' },
      h('div', { class: 'section-head' }, h('h2', {}, s.settingsTitle)),
      section(s.languageLabel, languageChips()),
    ),
  );
}
