import { h } from '../dom';
import { t } from '../i18n';
import { favorites } from '../storage';
import { pageHeader } from '../ui';
import { shoeCard } from './shoeCard';

export function renderSaved(rerender: () => void): HTMLElement {
  const s = t();
  const shoes = favorites.all();
  return h('div', {},
    pageHeader(s.savedTitle),
    shoes.length
      ? h('div', { class: 'cards-grid' }, ...shoes.map((shoe) => shoeCard({ shoe, onFavoriteChange: rerender })))
      : h('div', { class: 'empty' },
          h('p', { class: 'empty-title' }, s.savedEmpty),
          h('p', { class: 'hint' }, s.savedHint),
          h('a', { class: 'btn btn-primary', href: '#/search' }, s.savedWidgetEmptyCta),
        ),
  );
}
