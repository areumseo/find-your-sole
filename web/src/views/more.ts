import { h } from '../dom';
import { t } from '../i18n';
import { pageHeader, section } from '../ui';
import { languageChips } from './me';
import { openFeedback } from '../feedback';

/** Phone-only menu behind the "More" tab; wide screens list these in the sidebar. */
export function renderMore(): HTMLElement {
  const s = t();
  const row = (icon: string, label: string, href: string) =>
    h('a', { class: 'card menu-row', href },
      h('span', { class: 'ico', 'aria-hidden': 'true' }, icon),
      h('span', { class: 'label' }, label),
      h('span', { class: 'go', 'aria-hidden': 'true' }, '›'),
    );
  return h('div', { class: 'page-narrow' },
    pageHeader(s.moreTitle),
    row('👤', s.navMe, '#/me'),
    row('ℹ︎', s.navAbout, '#/about'),
    h('button', { type: 'button', class: 'card menu-row feedback-entry', onClick: openFeedback },
      h('span', { class: 'ico', 'aria-hidden': 'true' }, '💬'),
      h('span', { class: 'label' }, s.feedbackFab),
      h('span', { class: 'go', 'aria-hidden': 'true' }, '›'),
    ),
    h('div', { style: 'margin-top:20px' }, section(s.languageLabel, languageChips())),
  );
}
