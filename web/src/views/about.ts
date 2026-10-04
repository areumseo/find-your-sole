import { h } from '../dom';
import { t } from '../i18n';
import { pageHeader } from '../ui';

export function renderAbout(): HTMLElement {
  const s = t();
  return h('div', {},
    pageHeader(s.aboutTitle),
    ...s.aboutCards.map((c) => h('article', { class: 'card about-card' }, h('h3', {}, c.title), h('p', {}, c.body))),
    h('article', { class: 'card about-card' },
      h('h3', {}, s.licensesTitle),
      h('p', {}, s.licensesBody),
      h('p', {}, h('a', { href: '/licenses/IBMPlexSansKR-OFL.txt', target: '_blank', rel: 'noopener' }, s.licensesLink)),
    ),
    h('p', { class: 'version' }, 'Find Your Sole'),
  );
}
