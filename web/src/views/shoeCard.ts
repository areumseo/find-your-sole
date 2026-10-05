import { h, safeUrl } from '../dom';
import { explainShoe } from '../api';
import { getLocale, t } from '../i18n';
import { favorites, myShoes } from '../storage';
import { openForm, toast } from '../ui';
import type { Prefs, Shoe } from '../types';

const TAG_COLORS: Record<string, string> = {
  데일리: '#87CEEB', 장거리: '#9B7FD4', 레이스: '#FF6B6B', 입문: '#56C786',
  회복런: '#4ECDC4', 트레일: '#8B6914', 템포: '#FF9F43', 인터벌: '#EE5A24',
};

function tagChips(useCase: string[]): HTMLElement {
  return h('div', { class: 'tags' },
    ...useCase.map((tag) => {
      const color = TAG_COLORS[tag] ?? '#9e9e9e';
      return h('span', {
        class: 'tag',
        style: `color:${color};background:color-mix(in srgb, ${color} 15%, transparent)`,
      }, t().tag(tag));
    }),
  );
}

interface CardOptions {
  shoe: Shoe;
  rank?: number;
  /** Present on the results screen. Enables the AI explanation. */
  prefs?: Prefs;
  onFavoriteChange?: () => void;
}

type FactKind = 'match' | 'good' | 'info';
interface Fact { text: string; kind: FactKind }

/** Facts from the catalogue compared with the answers, not another AI request. */
function matchFacts(shoe: Shoe, prefs: Prefs): Fact[] {
  const s = t();
  const facts: Fact[] = [];
  if (prefs.mode === 'comfort') facts.push({ text: s.cushionFact(s.cushionName(shoe.cushion)), kind: 'info' });
  if (shoe.width === prefs.width) facts.push({ text: s.widthMatch, kind: 'match' });
  if (shoe.cushion === prefs.cushion) facts.push({ text: s.cushionMatch, kind: 'match' });
  if (prefs.mode !== 'comfort' && shoe.terrain.includes(String(prefs.terrain))) {
    const terrain = getLocale() === 'en' ? (prefs.terrain === '트레일' ? 'Trail' : 'Road') : String(prefs.terrain);
    facts.push({ text: s.terrainMatch(terrain), kind: 'match' });
  }
  if (!facts.length) facts.push({ text: s.cushionFact(s.cushionName(shoe.cushion)), kind: 'info' });
  // Budget is the fact people care about most, so it always makes the cut.
  if (shoe.price_source === 'kr_list' && shoe.price <= Number(prefs.budget)) {
    return [...facts.slice(0, 2), { text: s.withinBudget, kind: 'good' }];
  }
  return facts.slice(0, 3);
}

/** "Compared with your answers": a gray label, then one chip per fact. Color carries the meaning:
 *  blue = matches an answer, green = within budget, gray = plain information. */
function matchSummary(shoe: Shoe, prefs: Prefs): HTMLElement {
  const s = t();
  return h('div', { class: 'match-summary' },
    h('span', { class: 'match-label' }, `${s.matchLabel}:`),
    ...matchFacts(shoe, prefs).map((f) =>
      h('span', { class: `fact fact-${f.kind}` }, f.kind === 'info' ? f.text : `✓ ${f.text}`)),
  );
}

export function shoeCard({ shoe, rank, prefs, onFavoriteChange }: CardOptions): HTMLElement {
  const s = t();
  let explanation: string | undefined;
  let loading = false;

  const card = h('article', { class: 'card' });
  const detail = h('div', { class: 'detail', hidden: true });
  const chev = h('span', { class: 'chev', 'aria-hidden': 'true' });
  const detailsButton = h('button', {
    type: 'button', class: 'detail-toggle', 'aria-label': s.toggleDetails, 'aria-expanded': 'false',
    onClick: () => toggle.click(),
  }, chev);

  const favBtn = h('button', { type: 'button', class: 'icon-btn' });
  const paintFav = () => {
    const on = favorites.has(shoe.id);
    favBtn.textContent = on ? '♥' : '♡';
    favBtn.style.color = on ? 'var(--primary)' : 'var(--muted)';
    favBtn.setAttribute('aria-pressed', String(on));
    const label = on ? s.removeFavorite : s.addFavorite;
    favBtn.setAttribute('aria-label', label);
    favBtn.dataset.tip = label; // shown as a tooltip on hover/focus
  };
  favBtn.addEventListener('click', () => {
    favorites.toggle(shoe);
    paintFav();
    onFavoriteChange?.();
  });
  paintFav();

  const addBtn = h('button', {
    type: 'button',
    class: 'icon-btn',
    'aria-label': s.addToMyShoes,
    'data-tip': s.addToMyShoes,
    style: 'color:var(--muted)',
    onClick: () =>
      openForm(
        s.addShoe,
        [
          { name: 'name', label: s.shoeName, value: shoe.name, required: true },
          { name: 'brand', label: s.brand, value: shoe.brand },
        ],
        s.addShoe,
        ({ name, brand }) => {
          if (!name) return;
          myShoes.add(name, brand);
          toast(s.shoeAdded(name));
        },
      ),
  }, '⊕');

  const explainBox = h('div');
  const renderExplain = () => {
    explainBox.replaceChildren(
      ...(loading
        ? [h('div', { class: 'spinner', role: 'status', 'aria-label': 'Loading' })]
        : explanation
          ? [h('div', { class: 'explain' }, h('span', { 'aria-hidden': 'true' }, '🤖'), h('p', {}, explanation))]
          : []),
    );
  };

  async function loadExplanation(): Promise<void> {
    if (!prefs || explanation || loading) return;
    loading = true;
    renderExplain();
    try {
      explanation = await explainShoe(shoe, prefs, getLocale());
    } catch (e) {
      explanation = e instanceof Error && e.message === 'HTTP 429' ? s.explanationBusy : s.explanationError;
    } finally {
      loading = false;
      renderExplain();
    }
  }

  const naver = safeUrl(shoe.naver_url);
  detail.append(
    // The header only has room for the short price; spell out the overseas list price here.
    ...(shoe.price_source === 'estimate' && shoe.price_usd ? [h('p', { class: 'price-note' }, s.priceLabel(shoe))] : []),
    h('dl', { class: 'specs' },
      ...(
        [
          [s.weight, `${shoe.weight_g}g`],
          [s.drop, `${shoe.drop_mm}mm`],
          [s.cushion, s.cushionName(shoe.cushion)],
          [s.width, s.widthName(shoe.width)],
        ] as const
      ).map(([label, value]) => h('div', { class: 'spec' }, h('dt', {}, label), h('dd', {}, value))),
    ),
    explainBox,
  );
  if (naver) {
    detail.append(
      h('a', { class: 'btn-outline-naver', href: naver, target: '_blank', rel: 'noopener noreferrer' },
        `🛒 ${s.naverShopping}`),
    );
  }

  // The name is the real button; its ::after stretches over the whole text block so a tap anywhere
  // toggles the card. The brand link sits above that layer, so it is a real link, not a nested button.
  const toggle = h('button', {
    type: 'button',
    class: 'name-toggle',
    'aria-expanded': 'false',
    onClick: () => {
      const open = detail.hidden;
      detail.hidden = !open;
      card.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      detailsButton.setAttribute('aria-expanded', String(open));
      if (open) void loadExplanation();
    },
  }, h('span', { class: 'shoe-name' }, shoe.name));
  const brandHref = shoe.brand_url ? safeUrl(shoe.brand_url) : null;
  const brandEl = brandHref
    ? h('a', {
        class: 'shoe-brand brand-link', href: brandHref, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': s.officialSite(shoe.brand), title: s.officialSite(shoe.brand),
      }, `${shoe.brand} ↗`)
    : h('div', { class: 'shoe-brand' }, shoe.brand);
  const main = h('div', { class: 'main' }, toggle, brandEl, tagChips(shoe.use_case));

  card.append(
    h('div', { class: 'card-head' },
      rank !== undefined ? h('div', { class: rank <= 3 ? 'rank top' : 'rank' }, String(rank)) : null,
      main,
      h('div', { class: 'side' },
        h('div', { class: 'actions' }, favBtn, addBtn),
        h('div', { class: 'price' }, s.priceBrief(shoe)),
        shoe.price_source !== 'kr_list' && shoe.price_usd
          ? h('span', { class: 'price-unconfirmed' }, s.priceUnconfirmed)
          : shoe.price_source === 'kr_list' && shoe.over_budget ? h('span', { class: 'over-budget' }, s.overBudget) : null,
        detailsButton,
      ),
    ),
    ...(prefs && rank !== undefined && rank <= 3 ? [matchSummary(shoe, prefs)] : []),
    detail,
  );
  return card;
}
