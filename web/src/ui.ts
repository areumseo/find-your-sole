import { h } from './dom';
import { t } from './i18n';

export function section(title: Node | string, child: Node): HTMLElement {
  return h('section', { class: 'field' }, h('h3', { class: 'field-title' }, title), child);
}

interface ChipOptions {
  options: string[];
  selected: Set<number>;
  /** Allow several chips at once. */
  multi?: boolean;
  /** Allow tapping the selected chip again to clear it (single-select only). */
  clearable?: boolean;
  /**
   * Called with the selection the tap would produce. Return a different set to
   * override it (e.g. to keep "None" exclusive); the chips repaint to match.
   */
  onChange: (next: Set<number>) => Set<number> | void;
}

export function chips({ options, selected, multi, clearable, onChange }: ChipOptions): HTMLElement {
  const group = h('div', { class: 'chips', role: 'group' });
  const buttons = options.map((label, i) =>
    h('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(selected.has(i)),
      onClick: () => {
        const next = new Set(selected);
        if (multi) {
          next.has(i) ? next.delete(i) : next.add(i);
        } else if (clearable && next.has(i)) {
          next.clear();
        } else {
          next.clear();
          next.add(i);
        }
        selected = onChange(next) ?? next;
        buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(selected.has(j))));
      },
    }, label),
  );
  group.append(...buttons);
  return group;
}

export function slider(opts: {
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
  onInput: (value: number) => void;
}): HTMLInputElement {
  return h('input', {
    type: 'range',
    class: 'slider',
    min: opts.min,
    max: opts.max,
    step: opts.step,
    value: opts.value,
    'aria-label': opts.label,
    onInput: (e) => opts.onInput(Number((e.target as HTMLInputElement).value)),
  });
}

export function pageHeader(title: string, onBack?: () => void): HTMLElement {
  return h('div', { class: 'page-header' },
    onBack ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': t().back, onClick: onBack }, '←') : null,
    h('h2', {}, title),
  );
}

// ── Toast ─────────────────────────────────────────────────
let toastTimer: number | undefined;

export function toast(message: string): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 2400);
}

// ── Dialog ────────────────────────────────────────────────
interface Field {
  name: string;
  label: string;
  value?: string;
  type?: 'text' | 'number';
  suffix?: string;
  required?: boolean;
}

/** Modal form built on <dialog>, which gives focus trapping and Esc for free. */
export function openForm(
  title: string,
  fields: Field[],
  submitLabel: string,
  onSubmit: (values: Record<string, string>) => void,
): void {
  const dialog = h('dialog', { class: 'dialog' });
  const form = h('form', { method: 'dialog' },
    h('h3', {}, title),
    ...fields.map((f) =>
      h('label', { class: 'input-row' },
        h('span', {}, f.label),
        h('span', { class: 'input-wrap' },
          h('input', {
            name: f.name,
            type: f.type ?? 'text',
            value: f.value ?? '',
            required: f.required ?? false,
            inputmode: f.type === 'number' ? 'decimal' : undefined,
            min: f.type === 'number' ? 0 : undefined,
            step: f.type === 'number' ? 'any' : undefined,
            autocomplete: 'off',
          }),
          f.suffix ? h('span', { class: 'suffix' }, f.suffix) : null,
        ),
      ),
    ),
    h('div', { class: 'dialog-actions' },
      h('button', { type: 'button', class: 'btn btn-text', onClick: () => dialog.close() }, t().cancel),
      h('button', { type: 'submit', class: 'btn btn-primary' }, submitLabel),
    ),
  );
  form.addEventListener('submit', () => {
    const data = new FormData(form);
    const values: Record<string, string> = {};
    fields.forEach((f) => (values[f.name] = String(data.get(f.name) ?? '').trim()));
    onSubmit(values);
  });
  dialog.append(form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('input')?.focus();
}
