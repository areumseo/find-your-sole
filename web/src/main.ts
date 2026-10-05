import { comparison } from './compare';
import { renderCompare } from './views/compare';
import { trackPage } from './analytics';
import './fonts.css';
import './styles.css';
import { warmUp } from './api';
import { feedbackButton } from './feedback';
import { h, mount } from './dom';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import { themeToggle } from './theme';
import { renderAbout } from './views/about';
import { renderAdmin } from './views/admin';
import { renderHome } from './views/home';
import { renderMe } from './views/me';
import { renderMore } from './views/more';
import { hasResults, renderRecommend, type Step } from './views/recommend';
import { renderSaved } from './views/saved';

type Page = 'home' | 'search' | 'saved' | 'me' | 'about' | 'more' | 'admin' | 'compare';

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
      const step: Step = sub === 'beginner' || sub === 'expert' || sub === 'comfort' || sub === 'results' ? sub : 'mode';
      // Results only exist in memory; a reload or shared link has none to show.
      // The finder cards live on Home, so the bare search address (and results
      // that no longer exist after a reload) just go there.
      if (step === 'mode' || (step === 'results' && !hasResults())) {
        history.replaceState(null, '', '#/');
        return { page: 'home', step: 'mode' };
      }
      return { page: 'search', step };
    }
    case 'compare':
    case 'saved':
    case 'me':
    case 'about':
    case 'admin': // no menu item and no link: reached only by typing #/admin
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

const NAV: NavItem[] = [
  { href: '#/', icon: '🏠', label: () => t().navHome, pages: ['home', 'search'], show: 'all' },
  { href: '#/saved', icon: '♡', label: () => t().navSaved, pages: ['saved'], show: 'all' },
  { href: '#/compare', icon: '↔', label: () => t().navCompare, pages: ['compare'], show: 'wide' },
  { href: '#/me', icon: '👤', label: () => t().navMe, pages: ['me'], show: 'wide' },
  { href: '#/about', icon: 'ℹ︎', label: () => t().navAbout, pages: ['about'], show: 'wide' },
  { href: '#/more', icon: '⋯', label: () => t().navMore, pages: ['more', 'me', 'about', 'compare'], show: 'narrow' },
];

const topbar = h('header', { class: 'topbar' });
const tabs = h('nav', { class: 'tabs', 'aria-label': 'Main' });
const sidebar = h('aside', { class: 'sidebar' }, topbar, tabs);
const main = h('main', { id: 'content' });

function render(): void {
  const route = parseRoute();
  paintComparisonBar(route.page);
  trackPage(route.page === 'admin' ? '/admin' : route.page === 'home' ? '/' : route.page === 'search' ? `/search/${route.step}` : `/${route.page}`);
  const s = t();

  mount(topbar,
    h('div', { class: 'brand' },
      h('img', { class: 'brand-logo', src: '/logo.svg', alt: '', width: 40, height: 40 }),
      // Two lines beside the mascot. The <br> keeps the text reading as "Find Your Sole".
      h('span', { class: 'brand-name' }, 'Find Your ', h('br'), h('b', {}, 'Sole')),
    ),
    h('div', { class: 'controls' },
      themeToggle(),
      h('button', {
        type: 'button', class: 'lang', 'aria-label': s.langToggleLabel,
        onClick: () => setLocale(getLocale() === 'ko' ? 'en' : 'ko'),
      }, s.langToggle),
    ),
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
    case 'compare': mount(main, renderCompare()); break;
    case 'search': mount(main, renderRecommend(route.step, go)); break;
    case 'saved': mount(main, renderSaved(render)); break;
    case 'me': mount(main, renderMe(render)); break;
    case 'about': mount(main, renderAbout()); break;
    case 'more': mount(main, renderMore()); break;
    case 'admin': mount(main, renderAdmin()); break;
    default: mount(main, renderHome(go));
  }
}

const compareBar = h('aside', {class: 'compare-selection-bar', hidden: true});
function paintComparisonBar(page: Page): void {
  const entries = comparison.all(), s = t();
  const visible = entries.length > 0 && page !== 'admin' && page !== 'compare';
  compareBar.hidden = !visible;
  document.body.classList.toggle('has-compare-bar', visible);
  compareBar.replaceChildren(h('span', {class:'compare-bar-hint'}, entries.length === 1 ? s.compareNeedTwo : s.navCompare),
    h('button', {type:'button',class:'btn compare-bar-button',disabled:entries.length<2,onClick:()=>go('/compare')},s.compareBar(entries.length)));
  document.querySelectorAll<HTMLButtonElement>('[data-compare-id]').forEach(button => {
    const selected = comparison.has(Number(button.dataset.compareId));
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? s.compareAdded : s.compareAdd;
  });
}
comparison.subscribe(() => {
  const route = parseRoute();
  paintComparisonBar(route.page);
  if (route.page === 'compare') mount(main, renderCompare());
});

/** The floating feedback button lives outside the page content so it survives navigation. */
let fab: HTMLElement | null = null;
function mountFeedbackButton(): void {
  const next = feedbackButton();
  fab ? fab.replaceWith(next) : document.body.append(next);
  fab = next;
}

function boot(): void {
  document.documentElement.lang = getLocale();
  document.title = t().pageTitle;
  document.getElementById('app')!.replaceChildren(sidebar, main);
  document.body.append(compareBar);

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
  });
  onLocaleChange(render);
  render();
  mountFeedbackButton();
  onLocaleChange(mountFeedbackButton);

  // Wake the free-tier backend now so the first recommendation is not slow.
  warmUp();
}

boot();
