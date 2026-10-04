import { h } from '../dom';
import { t } from '../i18n';
import { favorites } from '../storage';
import { pageHeader } from '../ui';
import { shoeCard } from './shoeCard';

export function renderFavorites(rerender: () => void): HTMLElement {
  const s = t();
  const shoes = favorites.all();
  return h('div', {},
    pageHeader(s.favoritesTitle),
    shoes.length
      ? h('div', {}, ...shoes.map((shoe) => shoeCard({ shoe, onFavoriteChange: rerender })))
      : h('p', { class: 'empty' }, s.favoritesEmpty),
  );
}
