import './fonts.css';
import './styles.css';
import { warmUp } from './api';
import { h, mount } from './dom';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import { renderAbout } from './views/about';
import { renderHome } from './views/home';
import { renderMe } from './views/me';
import { renderMore } from './views/more';
import { hasResults, renderRecommend, type Step } from './views/recommend';
import { renderSaved } from './views/saved';

type Page = 'home' | 'search' | 'saved' | 'me' | 'about' | 'more';

interface Route {
  page: Page;
  step: Step;
}

/** Same breakpoint as the sidebar layout in styles.css. */
const isWide = (): boolean => window.matchMedia('(min-width: 900px)').matches;

// Addresses from before the dashboard redesign. Redirect rather than 404 so
// links that were already shared keep working.
const LEGACY: Record<string, string> = {
  favorites: 'saved',
  'my-shoes': 'me',
  beginner: 'search/beginner',
  expert: 'search/expert',
  results: 'search/results',
};

function parseRoute(): Route {
  let path = location.hash.replace(/^#\/?/, '');
  if (path in LEGACY) {
    path = LEGACY[path];
    history.replaceState(null, '', `#/${path}`);
  }
  const [page, sub] = path.split('/');

  switch (page) {
    case 'search': {
      const step: Step = sub === 'beginner' || sub === 'expert' || sub === 'results' ? sub : 'mode';
      // Results only exist in memory; a reload or shared link has none to show.
      if (step === 'results' && !hasResults()) return { page: 'search', step: 'mode' };
      return { page: 'search', step };
    }
    case 'saved':
    case 'me':
    case 'about':
      return { page, step: 'mode' };
    case 'more':
      // "More" is a phone menu; on wide screens its entries are in the sidebar.
      if (isWide()) {
        history.replaceState(null, '', '#/me');
        return { page: 'me', step: 'mode' };
      }
      return { page: 'more', step: 'mode' };
    default:
      return { page: 'home', step: 'mode' };
  }
}

/** Navigate within the app, e.g. go('/search/results'). */
const go = (path: string): void => {
  location.hash = path === '/' ? '#/' : `#${path}`;
};

interface NavItem {
  href: string;
  icon: string;
  label: () => string;
  /** Pages for which this item is highlighted. */
  pages: Page[];
  /** Which layout shows it: the sidebar, the bottom bar, or both. */
  show: 'all' | 'wide' | 'narrow';
}

// Compare is planned but needs the full shoe catalogue from the API, so it is
// left out until that exists rather than shipping an empty screen.
const NAV: NavItem[] = [
  { href: '#/', icon: '🏠', label: () => t().navHome, pages: ['home'], show: 'all' },
  { href: '#/search', icon: '🔍', label: () => t().navSearch, pages: ['search'], show: 'all' },
  { href: '#/saved', icon: '♡', label: () => t().navSaved, pages: ['saved'], show: 'all' },
  { href: '#/me', icon: '👤', label: () => t().navMe, pages: ['me'], show: 'wide' },
  { href: '#/about', icon: 'ℹ︎', label: () => t().navAbout, pages: ['about'], show: 'wide' },
  { href: '#/more', icon: '⋯', label: () => t().navMore, pages: ['more', 'me', 'about'], show: 'narrow' },
];

const topbar = h('header', { class: 'topbar' });
const tabs = h('nav', { class: 'tabs', 'aria-label': 'Main' });
const sidebar = h('aside', { class: 'sidebar' }, topbar, tabs);
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

  mount(tabs, ...NAV.map(({ href, icon, label, pages, show }) =>
    h('a', {
      href,
      class: show === 'wide' ? 'wide-only' : show === 'narrow' ? 'narrow-only' : undefined,
      'aria-current': pages.includes(route.page) ? 'page' : undefined,
    },
      h('span', { class: 'ico', 'aria-hidden': 'true' }, icon),
      label(),
    ),
  ));

  switch (route.page) {
    case 'search': mount(main, renderRecommend(route.step, go)); break;
    case 'saved': mount(main, renderSaved(render)); break;
    case 'me': mount(main, renderMe(render)); break;
    case 'about': mount(main, renderAbout()); break;
    case 'more': mount(main, renderMore()); break;
    default: mount(main, renderHome(go));
  }
}

function boot(): void {
  document.documentElement.lang = getLocale();
  document.title = t().pageTitle;
  document.getElementById('app')!.replaceChildren(sidebar, main);

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
