import { h } from '../dom';
import { recommendBeginner, recommendExpert } from '../api';
import { t } from '../i18n';
import { chips, pageHeader, section, slider } from '../ui';
import { shoeCard } from './shoeCard';
import type { Prefs, Shoe } from '../types';

export type Step = 'mode' | 'beginner' | 'expert' | 'results';

// The backend matches on these exact Korean/English strings, so they are
// fixed values separate from the translated labels shown to the user.
const FREQ_API = ['이제 막 시작했어요', '6개월 미만', '1년 미만'];
const TERRAIN_API = ['공원 / 도로', '산 / 흙길'];
const PAIN_API = ['없음', '무릎', '발목', '발바닥 (족저근막염 등)', '여러 곳이 불편해요'];
const ARCH_API = ['normal', 'flat', 'high'];
const PRONATION_API = ['neutral', 'mild_overpronation', 'overpronation'];
const TERRAIN_SHORT_API = ['로드', '트레일'];
const USE_CASE_API = ['데일리', '장거리', '레이스', '입문', '회복런', '트레일'];
const CUSHION_API = ['낮음', '중간', '높음', '최고'];
const WIDTH_API = ['좁음', '보통', '넓음'];
const WEIGHT_KG = [50, 70, 85];

// Form answers live at module level so switching language (which re-renders)
// or navigating away and back does not wipe what the user entered.
const beginner = {
  freq: new Set([0]),
  terrain: new Set([0]),
  pain: new Set([0]),
  wide: false,
  weight: new Set<number>(),
  budget: 150000,
};

const expert = {
  arch: new Set([0]),
  pronation: new Set([0]),
  terrain: new Set([0]),
  useCase: new Set([0]),
  cushion: new Set([1]),
  width: new Set([1]),
  weeklyKm: 20,
  weight: new Set<number>(),
  budget: 150000,
};

let results: Shoe[] = [];
let resultPrefs: Prefs = {};
let lastForm: 'beginner' | 'expert' = 'beginner';

export function hasResults(): boolean {
  return results.length > 0;
}

const first = (set: Set<number>, fallback = 0): number => [...set][0] ?? fallback;
const weightKg = (set: Set<number>): number | undefined => (set.size ? WEIGHT_KG[first(set)] : undefined);

/** Collapse the multi-select pain chips to the single value the API takes. */
function painValue(selected: Set<number>): string {
  if (selected.size === 0 || selected.has(0)) return PAIN_API[0];
  if (selected.size >= 2) return PAIN_API[4];
  return PAIN_API[first(selected)];
}

export function renderRecommend(step: Step, go: (path: string) => void): HTMLElement {
  switch (step) {
    case 'beginner': lastForm = 'beginner'; return beginnerForm(go);
    case 'expert': lastForm = 'expert'; return expertForm(go);
    case 'results': return resultsView(go);
    default: return modeSelect(go);
  }
}

// ── Mode select ───────────────────────────────────────────
function modeSelect(go: (path: string) => void): HTMLElement {
  const s = t();
  const card = (emoji: string, title: string, sub: string, desc: string, path: string) =>
    h('button', { type: 'button', class: 'mode-card', onClick: () => go(path) },
      h('span', { class: 'emoji', 'aria-hidden': 'true' }, emoji),
      h('span', {},
        h('h3', {}, title),
        h('span', { class: 'sub' }, sub),
        h('p', {}, desc),
      ),
      h('span', { class: 'go', 'aria-hidden': 'true' }, '›'),
    );
  return h('div', {},
    h('p', { class: 'lead' }, s.heroSubtitle),
    card('🌱', s.beginnerTitle, s.beginnerSubtitle, s.beginnerDescription, '/beginner'),
    card('🏃', s.expertTitle, s.expertSubtitle, s.expertDescription, '/expert'),
  );
}

// ── Shared form pieces ────────────────────────────────────
function budgetField(state: { budget: number }): HTMLElement {
  const title = h('span', {}, t().sectionBudget(state.budget));
  const input = slider({
    min: 50000, max: 400000, step: 25000, value: state.budget, label: t().sectionBudget(state.budget),
    onInput: (v) => {
      state.budget = v;
      title.textContent = t().sectionBudget(v);
    },
  });
  return section(title, input);
}

function weightField(state: { weight: Set<number> }): HTMLElement {
  const s = t();
  return section(
    s.sectionWeight,
    chips({
      options: [s.weightUnder60, s.weight60to80, s.weightOver80],
      selected: state.weight,
      clearable: true,
      onChange: (next) => (state.weight = next),
    }),
  );
}

/** Submit button that shows progress and a cold-start hint if the API is slow. */
function submitButton(run: () => Promise<void>): { button: HTMLButtonElement; note: HTMLElement } {
  const s = t();
  const note = h('p', { class: 'notice', role: 'status' });
  const button = h('button', { type: 'button', class: 'btn btn-primary btn-block' }, s.btnRecommend);
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.replaceChildren(h('span', { class: 'spinner', 'aria-hidden': 'true' }));
    note.className = 'notice';
    note.textContent = '';
    // If nothing has come back after a few seconds the backend is probably
    // waking from sleep; say so rather than leaving a silent spinner.
    const slowTimer = window.setTimeout(() => (note.textContent = s.wakingServer), 5000);
    try {
      await run();
    } catch (e) {
      note.className = 'notice error';
      note.textContent = s.errorRecommend(e instanceof Error ? e.message : String(e));
      button.disabled = false;
      button.replaceChildren(s.btnRecommend);
    } finally {
      clearTimeout(slowTimer);
    }
  });
  return { button, note };
}

// ── Beginner ──────────────────────────────────────────────
function beginnerForm(go: (path: string) => void): HTMLElement {
  const s = t();
  const st = beginner;

  const wideLabel = h('span', {}, st.wide ? s.wideFootYes : s.wideFootNo);
  const wideSwitch = h('button', {
    type: 'button', class: 'switch', role: 'switch',
    'aria-checked': String(st.wide), 'aria-label': s.sectionWideFoot,
    onClick: () => {
      st.wide = !st.wide;
      wideSwitch.setAttribute('aria-checked', String(st.wide));
      wideLabel.textContent = st.wide ? s.wideFootYes : s.wideFootNo;
    },
  });

  const { button, note } = submitButton(async () => {
    const shoes = await recommendBeginner({
      frequency: FREQ_API[first(st.freq)],
      terrain: TERRAIN_API[first(st.terrain)],
      pain: painValue(st.pain),
      wide_foot: st.wide,
      budget: st.budget,
      weight_kg: weightKg(st.weight),
      brand_filter: [],
    });
    results = shoes;
    resultPrefs = { terrain: first(st.terrain) === 0 ? '로드' : '트레일', budget: st.budget };
    go('/results');
  });

  return h('div', {},
    pageHeader(s.beginnerModeTitle, () => go('/')),
    section(s.sectionFrequency, chips({
      options: s.freq, selected: st.freq, onChange: (n) => (st.freq = n),
    })),
    section(s.sectionTerrain, chips({
      options: s.terrains, selected: st.terrain, onChange: (n) => (st.terrain = n),
    })),
    section(s.sectionPain, chips({
      options: s.pains, selected: st.pain, multi: true,
      onChange: (next) => {
        // "None" is exclusive: picking it clears the rest, picking anything
        // else clears it, and emptying the set falls back to "None".
        if (next.has(0) && !st.pain.has(0)) {
          st.pain = new Set([0]);
        } else {
          next.delete(0);
          st.pain = next.size ? next : new Set([0]);
        }
        return st.pain;
      },
    })),
    section(s.sectionWideFoot, h('div', { class: 'switch-row' }, wideSwitch, wideLabel)),
    weightField(st),
    budgetField(st),
    button,
    note,
  );
}

// ── Expert ────────────────────────────────────────────────
function expertForm(go: (path: string) => void): HTMLElement {
  const s = t();
  const st = expert;

  const kmTitle = h('span', {}, s.sectionWeeklyKm(st.weeklyKm));
  const kmSlider = slider({
    min: 10, max: 80, step: 10, value: st.weeklyKm, label: s.sectionWeeklyKm(st.weeklyKm),
    onInput: (v) => {
      st.weeklyKm = v;
      kmTitle.textContent = s.sectionWeeklyKm(v);
    },
  });

  const { button, note } = submitButton(async () => {
    const arch = ARCH_API[first(st.arch)];
    const pronation = PRONATION_API[first(st.pronation)];
    const terrain = TERRAIN_SHORT_API[first(st.terrain)];
    const cushion = CUSHION_API[first(st.cushion)];
    const width = WIDTH_API[first(st.width)];
    const shoes = await recommendExpert({
      arch, pronation, terrain,
      use_case: [...st.useCase].sort((a, b) => a - b).map((i) => USE_CASE_API[i]),
      cushion, width,
      weekly_km: st.weeklyKm,
      budget: st.budget,
      weight_kg: weightKg(st.weight),
      brand_filter: [],
    });
    results = shoes;
    resultPrefs = { arch, pronation, terrain, cushion, width, weekly_km: st.weeklyKm, budget: st.budget };
    go('/results');
  });

  return h('div', {},
    pageHeader(s.expertModeTitle, () => go('/')),
    section(s.sectionArch, chips({ options: s.arch, selected: st.arch, onChange: (n) => (st.arch = n) })),
    section(s.sectionPronation, chips({
      options: s.pronation, selected: st.pronation, onChange: (n) => (st.pronation = n),
    })),
    section(s.sectionMainTerrain, chips({
      options: s.terrainShort, selected: st.terrain, onChange: (n) => (st.terrain = n),
    })),
    section(s.sectionUseCase, chips({
      options: s.useCases, selected: st.useCase, multi: true,
      onChange: (next) => {
        // At least one use case must stay selected; ignore the tap that
        // would clear the last one.
        if (next.size === 0) return st.useCase;
        st.useCase = next;
      },
    })),
    section(s.sectionCushion, chips({ options: s.cushions, selected: st.cushion, onChange: (n) => (st.cushion = n) })),
    section(s.sectionWidth, chips({ options: s.widths, selected: st.width, onChange: (n) => (st.width = n) })),
    section(kmTitle, kmSlider),
    weightField(st),
    budgetField(st),
    button,
    note,
  );
}

// ── Results ───────────────────────────────────────────────
function resultsView(go: (path: string) => void): HTMLElement {
  const s = t();
  return h('div', {},
    pageHeader(s.resultsTitle, () => go(`/${lastForm}`)),
    results.length
      ? h('div', {}, ...results.map((shoe, i) => shoeCard({ shoe, rank: i + 1, prefs: resultPrefs })))
      : h('p', { class: 'empty' }, s.noResults),
  );
}
