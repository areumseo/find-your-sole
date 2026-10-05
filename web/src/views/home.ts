import { fetchNews } from '../api';
import { h, safeUrl } from '../dom';
import { getLocale, t } from '../i18n';
import { SOON_KM, REPLACE_KM, favorites, myShoes } from '../storage';
import type { NewsItem } from '../types';
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

function relativeDate(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return '';
  return new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }).format(-Math.max(0, days), 'day');
}

/** Shoe launch news. Titles are text only and links are limited to http(s). */
function newsWidget(items: NewsItem[]): HTMLElement {
  const s = t();
  const el = widget(s.widgetNews, null,
    h('ul', { class: 'rows' }, ...items.slice(0, 5).map((item) => {
      const href = safeUrl(item.url);
      const meta = [item.source, relativeDate(item.published_at)].filter(Boolean).join(' · ');
      return h('li', { class: 'row' },
        h('div', { class: 'row-main' },
          href
            ? h('a', { class: 'news-title', href, target: '_blank', rel: 'noopener noreferrer' }, item.title)
            : h('span', { class: 'news-title' }, item.title),
          h('div', { class: 'row-sub' }, meta),
        ),
      );
    })),
    h('p', { class: 'widget-foot' }, s.newsCredit),
  );
  el.classList.add('wide');
  return el;
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

  const root = h('div', { class: 'dashboard' },
    h('section', { class: 'hero' },
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

  // Appended once the news arrives; nothing is drawn if there is none, so the
  // page never shows an empty box or a spinner for an optional feed.
  const widgets = root.querySelector('.widgets');
  void fetchNews().then((items) => {
    if (items.length && widgets && root.isConnected) widgets.append(newsWidget(items));
  });
  return root;
}
