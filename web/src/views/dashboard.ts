import { h } from '../dom';
import { t } from '../i18n';
import { SOON_KM, favorites, myShoes } from '../storage';

function tile(label: string, value: string, sub?: string): HTMLElement {
  return h('div', { class: 'tile' },
    h('div', { class: 'tile-label' }, label),
    h('div', { class: 'tile-value' }, value),
    sub ? h('div', { class: 'tile-sub' }, sub) : null,
  );
}

export function widget(title: string, link: { href: string; label: string } | null, ...body: Node[]): HTMLElement {
  return h('section', { class: 'widget' },
    h('div', { class: 'widget-head' },
      h('h2', {}, title),
      link ? h('a', { href: link.href }, link.label) : null,
    ),
    ...body,
  );
}

export function empty(message: string, cta: { href: string; label: string }): HTMLElement {
  return h('div', { class: 'widget-empty' },
    h('p', {}, message),
    h('a', { class: 'btn btn-primary btn-small', href: cta.href }, cta.label),
  );
}

/** Owned shoes, total distance and shoes due for replacement. */
export function statTiles(): HTMLElement {
  const s = t();
  const owned = myShoes.all();
  const totalKm = owned.reduce((sum, shoe) => sum + shoe.km, 0);
  const soon = owned.filter((shoe) => shoe.km >= SOON_KM).length;
  return h('div', { class: 'tiles' },
    tile(s.statShoes, s.pairs(owned.length)),
    tile(s.statKm, `${Math.round(totalKm).toLocaleString()}km`),
    tile(s.statSoon, s.count(soon), soon ? `${SOON_KM}km+` : undefined),
  );
}

/** Saved shoes list; `hideWhenEmpty` is for Home, where an empty box is just noise. */
export function savedWidget(hideWhenEmpty = false): HTMLElement | null {
  const s = t();
  const saved = favorites.all();
  if (!saved.length && hideWhenEmpty) return null;
  return widget(s.widgetSaved, saved.length ? { href: '#/saved', label: s.viewAll } : null,
    saved.length
      ? h('ul', { class: 'rows' }, ...saved.slice(0, 5).map((shoe) =>
          h('li', { class: 'row' },
            h('div', { class: 'row-main' },
              h('div', { class: 'row-title' }, shoe.name),
              h('div', { class: 'row-sub' }, shoe.brand),
            ),
            h('div', { class: 'row-end' }, s.priceBrief(shoe)),
          ),
        ))
      : empty(s.savedWidgetEmpty, { href: '#/search', label: s.savedWidgetEmptyCta }),
  );
}
