import { fetchNews } from '../api';
import { h, safeUrl } from '../dom';
import { getLocale, t } from '../i18n';
import type { NewsItem } from '../types';
import { savedWidget, widget } from './dashboard';
import { modeCards } from './recommend';

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

export function renderHome(go: (path: string) => void): HTMLElement {
  const s = t();
  const saved = savedWidget(true);

  const root = h('div', { class: 'dashboard' },
    h('section', { class: 'hero' },
      h('h1', {}, s.homeGreeting),
      h('p', {}, s.homeSubtitle),
      modeCards(go),
    ),
    // Personal stats (owned shoes, distance, saved) live on My Page; Home only
    // shows recently saved shoes once there are some.
    h('div', { class: 'widgets' }, ...(saved ? [saved] : [])),
  );

  // Appended once the news arrives; nothing is drawn if there is none, so the
  // page never shows an empty box or a spinner for an optional feed.
  const widgets = root.querySelector('.widgets');
  void fetchNews().then((items) => {
    if (items.length && widgets && root.isConnected) widgets.append(newsWidget(items));
  });
  return root;
}
