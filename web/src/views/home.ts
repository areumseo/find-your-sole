import { h } from '../dom';
import { t } from '../i18n';
import { SOON_KM, REPLACE_KM, favorites, myShoes } from '../storage';
import { modeCards } from './recommend';

function tile(label: string, value: string, sub?: string): HTMLElement {
  return h('div', { class: 'tile' },
    h('div', { class: 'tile-label' }, label),
    h('div', { class: 'tile-value' }, value),
    sub ? h('div', { class: 'tile-sub' }, sub) : null,
  );
}

function widget(title: string, link: { href: string; label: string } | null, ...body: Node[]): HTMLElement {
  return h('section', { class: 'widget' },
    h('div', { class: 'widget-head' },
      h('h2', {}, title),
      link ? h('a', { href: link.href }, link.label) : null,
    ),
    ...body,
  );
}

function empty(message: string, cta: { href: string; label: string }): HTMLElement {
  return h('div', { class: 'widget-empty' },
    h('p', {}, message),
    h('a', { class: 'btn btn-primary btn-small', href: cta.href }, cta.label),
  );
}

export function renderHome(go: (path: string) => void): HTMLElement {
  const s = t();
  const owned = myShoes.all();
  const saved = favorites.all();
  const totalKm = owned.reduce((sum, shoe) => sum + shoe.km, 0);
  const soon = owned.filter((shoe) => shoe.km >= SOON_KM).length;

  // Closest to being worn out first, so the shoe that needs attention leads.
  const byWear = [...owned].sort((a, b) => b.km - a.km).slice(0, 5);

  return h('div', { class: 'dashboard' },
    h('section', { class: 'hero' },
      h('img', { class: 'hero-mascot', src: '/logo.svg', alt: '', width: 112, height: 112 }),
      h('h1', {}, s.homeGreeting),
      h('p', {}, s.homeSubtitle),
      modeCards(go),
    ),

    h('div', { class: 'tiles' },
      tile(s.statShoes, s.pairs(owned.length)),
      tile(s.statKm, `${Math.round(totalKm).toLocaleString()}km`),
      tile(s.statSoon, s.count(soon), soon ? `${SOON_KM}km+` : undefined),
      tile(s.statSaved, s.count(saved.length)),
    ),

    h('div', { class: 'widgets' },
      widget(s.widgetMyShoes, owned.length ? { href: '#/me', label: s.viewAll } : null,
        owned.length
          ? h('ul', { class: 'rows' }, ...byWear.map((shoe) => {
              const worn = shoe.km > REPLACE_KM;
              const near = shoe.km >= SOON_KM;
              const pct = Math.min(100, (shoe.km / REPLACE_KM) * 100);
              return h('li', { class: 'row' },
                h('div', { class: 'row-main' },
                  h('div', { class: 'row-title' }, shoe.name),
                  h('div', {
                    class: worn ? 'progress worn' : 'progress',
                    role: 'progressbar',
                    'aria-label': shoe.name,
                    'aria-valuemin': 0,
                    'aria-valuemax': REPLACE_KM,
                    'aria-valuenow': Math.round(shoe.km),
                  }, h('i', { style: `width:${pct}%` })),
                ),
                h('div', { class: worn ? 'row-end danger' : 'row-end' },
                  `${shoe.km.toFixed(0)}km`,
                  near ? h('small', {}, worn ? s.replaceTime : s.soonLabel) : null,
                ),
              );
            }))
          : empty(s.myShoesWidgetEmpty, { href: '#/me', label: s.myShoesWidgetEmptyCta }),
      ),

      widget(s.widgetSaved, saved.length ? { href: '#/saved', label: s.viewAll } : null,
        saved.length
          ? h('ul', { class: 'rows' }, ...saved.slice(0, 5).map((shoe) =>
              h('li', { class: 'row' },
                h('div', { class: 'row-main' },
                  h('div', { class: 'row-title' }, shoe.name),
                  h('div', { class: 'row-sub' }, shoe.brand),
                ),
                h('div', { class: 'row-end' }, s.priceRange(shoe.price)),
              ),
            ))
          : empty(s.savedWidgetEmpty, { href: '#/search', label: s.savedWidgetEmptyCta }),
      ),
    ),
  );
}
