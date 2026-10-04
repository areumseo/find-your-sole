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

export function shoeCard({ shoe, rank, prefs, onFavoriteChange }: CardOptions): HTMLElement {
  const s = t();
  let explanation: string | undefined;
  let loading = false;

  const card = h('article', { class: 'card' });
  const detail = h('div', { class: 'detail', hidden: true });
  const chev = h('span', { class: 'chev', 'aria-hidden': 'true' });

  const favBtn = h('button', { type: 'button', class: 'icon-btn' });
  const paintFav = () => {
    const on = favorites.has(shoe.id);
    favBtn.textContent = on ? '♥' : '♡';
    favBtn.style.color = on ? 'var(--primary)' : 'var(--muted)';
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.setAttribute('aria-label', on ? s.removeFavorite : s.addFavorite);
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
    } catch {
      explanation = s.explanationError;
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

  const toggle = h('button', {
    type: 'button',
    class: 'main',
    'aria-expanded': 'false',
    onClick: () => {
      const open = detail.hidden;
      detail.hidden = !open;
      card.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) void loadExplanation();
    },
  },
    h('div', { class: 'shoe-name' }, shoe.name),
    h('div', { class: 'shoe-brand' }, shoe.brand),
    tagChips(shoe.use_case),
  );

  card.append(
    h('div', { class: 'card-head' },
      rank !== undefined ? h('div', { class: rank <= 3 ? 'rank top' : 'rank' }, String(rank)) : null,
      toggle,
      h('div', { class: 'side' },
        h('div', { class: 'actions' }, favBtn, addBtn),
        h('div', { class: 'price' }, s.priceRange(shoe.price)),
        chev,
      ),
    ),
    detail,
  );
  return card;
}
