import { comparison } from '../compare';
import { track } from '../analytics';
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

/** How the shoe feels, in plain words, from the catalogue's cushion, support tags and weight. */
function feelLine(shoe: Shoe): string | null {
  const s = t();
  const parts: string[] = [];
  const cushion = s.feelCushion[shoe.cushion];
  if (cushion) parts.push(cushion);
  const supportive = shoe.tags.includes('안정성') || shoe.pronation.some((p) => p.includes('overpronation'));
  if (supportive) parts.push(s.feelSupport);
  else if (shoe.weight_g != null && shoe.weight_g <= 230) parts.push(s.feelLight);
  return parts.length ? parts.join(' · ') : null;
}

/** The AI answer starts with a one-line summary, then a blank line, then the detail. */
function splitSummary(text: string): { summary: string | null; detail: string } {
  const [first, ...rest] = text.split(/\n\s*\n/);
  const detail = rest.join('\n\n').trim();
  return detail && first.length <= 80 ? { summary: first.trim(), detail } : { summary: null, detail: text };
}

const MAX_HIGHLIGHTS = 3;

/** The AI wraps its key phrases in [[ ]]; show the first few highlighted and drop every marker. */
function highlighted(text: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  let used = 0;
  text.split(/\[\[(.+?)\]\]/s).forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) out.push(part.replace(/\[\[|\]\]/g, ''));
    } else if (used < MAX_HIGHLIGHTS) {
      used += 1;
      out.push(h('mark', { class: 'hl' }, part));
    } else {
      out.push(part);
    }
  });
  return out;
}

let disclosureId = 0;

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
  if (prefs.mode === 'comfort' && shoe.cushion !== '미확인') facts.push({ text: s.cushionFact(s.cushionName(shoe.cushion)), kind: 'info' });
  if (shoe.width === prefs.width) facts.push({ text: s.widthMatch, kind: 'match' });
  if (shoe.cushion === prefs.cushion) facts.push({ text: s.cushionMatch, kind: 'match' });
  if (prefs.mode !== 'comfort' && shoe.terrain.includes(String(prefs.terrain))) {
    const terrain = getLocale() === 'en' ? (prefs.terrain === '트레일' ? 'Trail' : 'Road') : String(prefs.terrain);
    facts.push({ text: s.terrainMatch(terrain), kind: 'match' });
  }
  if (!facts.length && shoe.cushion !== '미확인') facts.push({ text: s.cushionFact(s.cushionName(shoe.cushion)), kind: 'info' });
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
  let errorText = '';
  let commentOpen = false;
  const initialOpen = !!prefs && rank !== undefined && rank <= 3;

  const card = h('article', { class: initialOpen ? 'card open' : 'card' });
  const detail = h('div', { class: 'detail', hidden: !initialOpen });
  const chev = h('span', { class: 'chev', 'aria-hidden': 'true' });
  const detailsButton = h('button', {
    type: 'button', class: 'detail-toggle', 'aria-label': s.toggleDetails, 'aria-expanded': String(initialOpen),
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
    track(favorites.has(shoe.id) ? 'favorite_add' : 'favorite_remove', {shoe_id: shoe.id});
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

  const commentId = `shoe-comment-${++disclosureId}`;
  const explainBox = h('div', { id: commentId, class: 'comment-body', hidden: true });
  const commentToggle = h('button', {
    type: 'button', class: 'comment-toggle', 'aria-expanded': 'false', 'aria-controls': commentId,
    onClick: () => {
      commentOpen = !commentOpen;
      explainBox.hidden = !commentOpen;
      commentToggle.setAttribute('aria-expanded', String(commentOpen));
      commentLabel.textContent = commentOpen ? s.aiComment : s.aiCommentShow;
      if (commentOpen) void loadExplanation();
    },
  }, h('span', { 'aria-hidden': 'true' }, '🤖'));
  const commentLabel = h('span', {}, s.aiCommentShow);
  commentToggle.append(commentLabel, h('span', { class: 'comment-chevron', 'aria-hidden': 'true' }));
  const explainBlock = (): HTMLElement => {
    const { summary, detail } = errorText && !explanation ? { summary: null, detail: errorText } : splitSummary(explanation ?? '');
    return h('div', { class: 'explain', role: errorText && !explanation ? 'status' : undefined },
      summary ? h('p', { class: 'explain-summary' }, summary.replace(/\[\[|\]\]/g, '')) : null,
      h('p', {}, ...highlighted(detail)),
    );
  };
  const renderExplain = () => {
    explainBox.replaceChildren(
      ...(loading
        ? [h('p', { class: 'comment-loading', role: 'status' }, s.aiCommentLoading)]
        : explanation || errorText
          ? [explainBlock()]
          : []),
    );
  };

  async function loadExplanation(): Promise<void> {
    if (!prefs || explanation || loading) return;
    track('explanation_open', {shoe_id: shoe.id, mode: String(prefs.mode)});
    loading = true;
    errorText = '';
    renderExplain();
    try {
      explanation = await explainShoe(shoe, prefs, getLocale());
      if (!explanation) errorText = s.explanationError;
    } catch (e) {
      errorText = e instanceof Error && e.message === 'HTTP 429' ? s.explanationBusy : s.explanationError;
    } finally {
      loading = false;
      renderExplain();
    }
  }

  const naver = safeUrl(shoe.naver_url);
  detail.append(
    h('dl', { class: 'specs' },
      ...(
        [
          [s.weight, shoe.weight_g == null ? s.unknownSpec : `${shoe.weight_g}g`],
          [s.drop, shoe.drop_mm == null ? s.unknownSpec : `${shoe.drop_mm}mm`],
          [s.cushion, s.cushionName(shoe.cushion)],
          [s.width, s.widthName(shoe.width)],
        ] as const
      ).map(([label, value]) => h('div', { class: 'spec' }, h('dt', {}, label), h('dd', {}, value))),
    ),
    ...(shoe.weight_note ? [h('p', { class: 'price-note' }, s.weightBasis(shoe.weight_note))] : []),
    ...(shoe.source_url && shoe.specs_checked_at && safeUrl(shoe.source_url)
      ? [h('p', { class: 'price-note' }, h('a', { href: safeUrl(shoe.source_url)!, target: '_blank', rel: 'noopener noreferrer' }, s.sourceChecked(shoe.specs_checked_at)))] : []),
    ...(shoe.sale_checked_at && shoe.sale_source_url && safeUrl(shoe.sale_source_url)
      ? [h('p', { class: 'price-note' }, h('a', { href: safeUrl(shoe.sale_source_url)!, target: '_blank', rel: 'noopener noreferrer' },
          shoe.sale_available === false ? s.soldOutObserved : s.saleObserved(
            `₩${shoe.sale_price?.toLocaleString()}${shoe.sale_price_max && shoe.sale_price_max !== shoe.sale_price ? `–₩${shoe.sale_price_max.toLocaleString()}` : ''}`,
            shoe.sale_checked_at.slice(0, 10))))] : []),
  );
  if (naver) {
    detail.append(
      h('a', { class: 'btn-outline-naver card-shopping', onClick: () => track('shopping_click', {shoe_id: shoe.id}), href: naver, target: '_blank', rel: 'noopener noreferrer' },
        h('img', { class: 'naver-logo', src: '/naver-n.svg', alt: '', width: 18, height: 18 }),
        h('span', { class: 'shopping-label' }, h('span', { class: 'naver-name' }, s.naverName), s.naverAction)),
    );
  }

  if (prefs) detail.append(h('div', { class: 'comment-section' }, commentToggle, explainBox));

  const helpId = `shoe-price-help-${disclosureId}`;
  const priceHelp = h('p', { id: helpId, class: 'price-help', hidden: true }, s.overseasPriceInfo);
  const priceInfo = h('button', { type: 'button', class: 'price-info', 'aria-controls': helpId, title: s.overseasPriceInfo, 'aria-label': s.overseasPriceInfo, 'aria-expanded': 'false',
    onClick: () => { priceHelp.hidden = !priceHelp.hidden; priceInfo.setAttribute('aria-expanded', String(!priceHelp.hidden)); }
  }, 'ⓘ');

  // The name is the real button; its ::after stretches over the whole text block so a tap anywhere
  // toggles the card. The brand link sits above that layer, so it is a real link, not a nested button.
  const toggle = h('button', {
    type: 'button',
    class: 'name-toggle',
    'aria-expanded': String(initialOpen),
    onClick: () => {
      const open = detail.hidden;
      detail.hidden = !open;
      card.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      detailsButton.setAttribute('aria-expanded', String(open));
    },
  }, h('span', { class: 'shoe-name' }, shoe.name));
  const brandHref = shoe.brand_url ? safeUrl(shoe.brand_url) : null;
  const brandEl = brandHref
    ? h('a', {
        class: 'shoe-brand brand-link', href: brandHref, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': s.officialSite(shoe.brand), title: s.officialSite(shoe.brand),
      }, `${shoe.brand} ↗`)
    : h('div', { class: 'shoe-brand' }, shoe.brand);
  const feel = feelLine(shoe);
  const main = h('div', { class: 'main' }, toggle, brandEl, feel ? h('p', { class: 'feel' }, feel) : null, tagChips(shoe.use_case));

  card.append(
    h('div', { class: 'card-head' },
      rank !== undefined ? h('div', { class: rank <= 3 ? 'rank top' : 'rank' }, String(rank)) : null,
      main,
      h('div', { class: 'side' },
        h('div', { class: 'actions' }, favBtn, addBtn),
        h('div', { class: 'price' }, s.priceBrief(shoe),
          shoe.price_source === 'estimate' && shoe.price_usd
            ? priceInfo : null),
        ...(shoe.price_source === 'estimate' && shoe.price_usd ? [priceHelp] : []),
        shoe.price_source === 'kr_list' && shoe.over_budget ? h('span', { class: 'over-budget' }, s.overBudget) : null,
        detailsButton,
      ),
    ),
    ...(prefs && rank !== undefined && rank <= 3 ? [matchSummary(shoe, prefs)] : []),
    detail,
    h('div', { class: 'compare-card-action' }, h('button', {type: 'button', class: 'compare-select', 'data-compare-id': shoe.id, 'aria-pressed': String(comparison.has(shoe.id)),
      onClick: () => { if (!comparison.toggle(shoe, prefs)) toast(s.compareLimit); }
    }, comparison.has(shoe.id) ? s.compareAdded : s.compareAdd)),
  );
  return card;
}
