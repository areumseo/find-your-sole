import { fetchNews, fetchPick } from '../api';
import { h, safeUrl } from '../dom';
import { getLocale, t } from '../i18n';
import type { DailyPick, NewsItem } from '../types';
import { savedWidget, widget } from './dashboard';
import { modeCards } from './recommend';

function relativeDate(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return '';
  return new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }).format(-Math.max(0, days), 'day');
}

/** "10/5 18:30"-style local time for when the news was refreshed. */
function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** Shoe launch news. Titles are text only and links are limited to http(s). */
function newsWidget(items: NewsItem[], updatedAt?: string): HTMLElement {
  const s = t();
  const el = widget(s.widgetNews, null,
    h('ul', { class: 'rows' }, ...items.slice(0, 3).map((item) => {
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
    h('p', { class: 'widget-foot' }, [updatedAt ? s.newsUpdated(formatStamp(updatedAt)) : '', s.newsCredit, s.newsLanguageNote].filter(Boolean).join(' · ')),
  );
  el.classList.add('news');
  return el;
}

/** One tip per calendar day, the same for everyone. */
function tipWidget(): HTMLElement {
  const s = t();
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000);
  const tip = s.tips[day % s.tips.length];
  return widget(s.widgetTip, null,
    h('div', { class: 'tip' },
      h('p', { class: 'tip-q' }, tip.q),
      h('p', { class: 'tip-a' }, tip.a),
    ),
  );
}

function pickWidget(pick: DailyPick): HTMLElement {
  const s = t();
  const href = safeUrl(pick.naver_url);
  return widget(s.widgetPick, null,
    h('div', { class: 'pick' },
      h('div', { class: 'pick-name' }, pick.name),
      h('div', { class: 'row-sub' }, `${pick.brand} · ${s.priceLabel(pick)}`),
      h('p', { class: 'pick-reason' }, pick.reason),
      href ? h('a', { class: 'btn btn-primary btn-small', href, target: '_blank', rel: 'noopener noreferrer' }, s.pickCta) : null,
    ),
  );
}

export function renderHome(go: (path: string) => void): HTMLElement {
  const s = t();
  const saved = savedWidget(true);

  // Left column: news (once it arrives) and saved shoes. Right column: today's
  // pick and tip. A column with nothing in it is hidden by the stylesheet.
  const main = h('div', { class: 'col-main' }, ...(saved ? [saved] : []));
  const side = h('div', { class: 'col-side' }, tipWidget());

  const root = h('div', { class: 'dashboard' },
    h('section', { class: 'hero' },
      h('h1', {}, s.homeGreeting),
      h('p', {}, s.homeSubtitle),
      modeCards(go),
    ),
    // Personal stats live on My Page; Home only shows saved shoes once there are some.
    h('div', { class: 'widgets' }, main, side),
  );

  // News and the pick arrive after the first paint; if either is missing,
  // nothing is drawn, so the page never shows an empty box or a spinner for
  // an optional feed.
  void fetchNews().then(({ items, updatedAt }) => {
    if (items.length && root.isConnected) main.prepend(newsWidget(items, updatedAt));
  });
  void fetchPick(getLocale()).then((pick) => {
    if (pick && root.isConnected) side.prepend(pickWidget(pick));
  });
  return root;
}
