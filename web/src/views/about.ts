import { h } from '../dom';
import { t } from '../i18n';
import { pageHeader } from '../ui';

export function renderAbout(): HTMLElement {
  const s = t();
  return h('div', {},
    pageHeader(s.aboutTitle),
    ...s.aboutCards.map((c) => h('article', { class: 'card about-card' }, h('h3', {}, c.title), h('p', {}, c.body))),
    h('p', { class: 'version' }, 'Find Your Sole'),
  );
}
