import './fonts.css';
import './styles.css';
import { warmUp } from './api';
import { h, mount } from './dom';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import { renderAbout } from './views/about';
import { renderFavorites } from './views/favorites';
import { renderMyShoes } from './views/myShoes';
import { hasResults, renderRecommend, type Step } from './views/recommend';

type Tab = 'recommend' | 'favorites' | 'my-shoes' | 'about';

interface Route {
  tab: Tab;
  step: Step;
}

const STEPS: Record<string, Step> = { beginner: 'beginner', expert: 'expert', results: 'results' };

function parseRoute(): Route {
  const path = location.hash.replace(/^#\/?/, '');
  if (path === 'favorites' || path === 'my-shoes' || path === 'about') return { tab: path, step: 'mode' };
  const step = STEPS[path] ?? 'mode';
  // Results only exist in memory; a reload or shared link has none to show.
  if (step === 'results' && !hasResults()) return { tab: 'recommend', step: 'mode' };
  return { tab: 'recommend', step };
}

/** Navigate within the app, e.g. go('/results') or go('/'). */
const go = (path: string): void => {
  location.hash = path === '/' ? '#/' : `#${path}`;
};

const TABS: { tab: Tab; href: string; icon: string; label: () => string }[] = [
  { tab: 'recommend', href: '#/', icon: '🔍', label: () => t().tabRecommend },
  { tab: 'favorites', href: '#/favorites', icon: '♡', label: () => t().tabFavorites },
  { tab: 'my-shoes', href: '#/my-shoes', icon: '👟', label: () => t().tabMyShoes },
  { tab: 'about', href: '#/about', icon: 'ℹ︎', label: () => t().tabAbout },
];

const topbar = h('header', { class: 'topbar' });
const tabs = h('nav', { class: 'tabs', 'aria-label': 'Main' });
const main = h('main', { id: 'content' });

function render(): void {
  const route = parseRoute();
  const s = t();

  mount(topbar,
    h('div', { class: 'brand' }, 'Find Your ', h('b', {}, 'Sole')),
    h('button', {
      type: 'button', class: 'lang', 'aria-label': s.langToggleLabel,
      onClick: () => setLocale(getLocale() === 'ko' ? 'en' : 'ko'),
    }, s.langToggle),
  );

  mount(tabs, ...TABS.map(({ tab, href, icon, label }) =>
    h('a', { href, 'aria-current': tab === route.tab ? 'page' : undefined },
      h('span', { class: 'ico', 'aria-hidden': 'true' }, icon),
      label(),
    ),
  ));

  switch (route.tab) {
    case 'favorites': mount(main, renderFavorites(render)); break;
    case 'my-shoes': mount(main, renderMyShoes(render)); break;
    case 'about': mount(main, renderAbout()); break;
    default: mount(main, renderRecommend(route.step, go));
  }
}

function boot(): void {
  document.documentElement.lang = getLocale();
  document.title = t().pageTitle;
  document.getElementById('app')!.replaceChildren(topbar, tabs, main);

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
  });
  onLocaleChange(render);
  render();

  // Wake the free-tier backend now so the first recommendation is not slow.
  warmUp();
}

boot();
