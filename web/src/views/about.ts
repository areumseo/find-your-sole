import { h } from '../dom';
import { t } from '../i18n';
import { pageHeader } from '../ui';

export function renderAbout(): HTMLElement {
  const s = t();
  return h('div', { class: 'page-narrow' },
    pageHeader(s.aboutTitle),
    h('article', { class: 'card about-card persona' },
      h('div', { class: 'persona-head' },
        h('img', { src: '/logo.svg', alt: '', width: 72, height: 72 }),
        h('div', {},
          h('h3', {}, s.personaTitle),
          h('div', { class: 'persona-name' }, s.personaName),
          h('div', { class: 'persona-tagline' }, s.personaTagline),
        ),
      ),
      h('p', {}, s.personaBody),
      h('dl', { class: 'persona-facts' }, ...s.personaFacts.flatMap((f) => [h('dt', {}, f.label), h('dd', {}, f.value)])),
    ),
    ...s.aboutCards.map((c) => h('article', { class: 'card about-card' }, h('h3', {}, c.title), h('p', {}, c.body))),
    h('article', { class: 'card about-card' },
      h('h3', {}, s.licensesTitle),
      h('p', {}, s.licensesBody),
      h('p', {}, h('a', { href: '/licenses/IBMPlexSansKR-OFL.txt', target: '_blank', rel: 'noopener' }, s.licensesLink)),
    ),
    h('p', { class: 'version' }, s.versionLine(__APP_VERSION__, __DATA_UPDATED__)),
  );
}
