import { HttpError, adminList, adminResolve, adminScreenshot, adminStatus, type FeedbackItem } from '../api';
import { h } from '../dom';
import { getLocale, t } from '../i18n';
import { pageHeader } from '../ui';

const KEY = 'fys.adminToken';

// The token lives in sessionStorage only: it disappears when the tab closes.
const getToken = (): string => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const setToken = (v: string): void => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch { /* memory only */ } };

let hideResolved = true;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** Hidden page at #/admin: no link points here. */
export function renderAdmin(): HTMLElement {
  const root = h('div', { class: 'page-narrow admin' });
  const redraw = () => root.replaceChildren(pageHeader(t().adminTitle), token() ? inbox(redraw) : login(redraw));
  const token = getToken;
  redraw();
  return root;
}

function login(redraw: () => void): HTMLElement {
  const s = t();
  const note = h('p', { class: 'notice', role: 'status' });
  const input = h('input', { type: 'password', name: 'token', autocomplete: 'off', 'aria-label': s.adminTokenLabel, placeholder: s.adminTokenLabel, required: true });
  const form = h('form', { class: 'admin-login' }, input, h('button', { type: 'submit', class: 'btn btn-primary' }, s.adminOpen), note);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    note.className = 'notice';
    note.textContent = '';
    try {
      await adminList(value); // checks the token before keeping it
      setToken(value);
      redraw();
    } catch (err) {
      note.className = 'notice error';
      note.textContent = err instanceof HttpError && err.status === 401 ? s.adminBadToken
        : err instanceof HttpError && err.status === 404 ? s.adminOff
        : s.adminError;
    }
  });
  return h('section', { class: 'card about-card' }, form);
}

function inbox(redraw: () => void): HTMLElement {
  const s = t();
  const token = getToken();
  const box = h('div', { class: 'admin-list' }, h('div', { class: 'spinner', 'aria-hidden': 'true' }));
  const note = h('p', { class: 'notice', role: 'status' });
  let items: FeedbackItem[] = [];

  const hide = h('input', { type: 'checkbox', checked: hideResolved });
  hide.addEventListener('change', () => { hideResolved = hide.checked; paint(); });
  const count = h('span', { class: 'admin-count' });
  const logout = h('button', { type: 'button', class: 'btn btn-text', onClick: () => { setToken(''); redraw(); } }, s.adminLogout);

  function paint(): void {
    const open = items.filter((i) => !i.resolved).length;
    count.textContent = s.adminCount(open, items.length);
    const shown = hideResolved ? items.filter((i) => !i.resolved) : items;
    box.replaceChildren(...(shown.length ? shown.map(row) : [h('p', { class: 'empty' }, s.adminEmpty)]));
  }

  function row(item: FeedbackItem): HTMLElement {
    const resolveBtn = h('button', { type: 'button', class: 'btn btn-text' }, item.resolved ? s.adminReopen : s.adminResolve);
    resolveBtn.addEventListener('click', async () => {
      resolveBtn.disabled = true;
      try {
        item.resolved = await adminResolve(token, item.id);
        paint();
      } catch { resolveBtn.disabled = false; note.className = 'notice error'; note.textContent = s.adminError; }
    });
    const shot = h('button', { type: 'button', class: 'btn btn-text' }, s.adminShot);
    shot.addEventListener('click', async () => {
      shot.disabled = true;
      try {
        const url = URL.createObjectURL(await adminScreenshot(token, item.id));
        const dialog = h('dialog', { class: 'dialog admin-shot' },
          h('img', { src: url, alt: '' }),
          h('div', { class: 'dialog-actions' }, h('button', { type: 'button', class: 'btn btn-text', onClick: () => dialog.close() }, s.cancel)),
        );
        dialog.addEventListener('close', () => { URL.revokeObjectURL(url); dialog.remove(); });
        document.body.append(dialog);
        dialog.showModal();
      } catch { note.className = 'notice error'; note.textContent = s.adminError; }
      shot.disabled = false;
    });
    return h('article', { class: item.resolved ? 'card admin-item resolved' : 'card admin-item' },
      h('div', { class: 'admin-meta' },
        h('span', {}, formatDate(item.created_at)),
        item.context ? h('span', { class: 'tag' }, item.context) : null,
        item.resolved ? h('span', { class: 'tag done' }, s.adminResolved) : null,
      ),
      h('p', { class: 'admin-message' }, item.message),
      h('div', { class: 'admin-actions' }, item.has_screenshot ? shot : null, resolveBtn),
    );
  }

  void adminList(token).then((list) => { items = list; paint(); }).catch((err) => {
    if (err instanceof HttpError && err.status === 401) { setToken(''); redraw(); return; }
    box.replaceChildren();
    note.className = 'notice error';
    note.textContent = err instanceof HttpError && err.status === 404 ? s.adminOff : s.adminError;
  });

  // Server checks: shows at a glance whether the keys and the database are working.
  const status = h('section', { class: 'card admin-status', hidden: true });
  void adminStatus(token).then((checks) => {
    const rows = Object.entries(checks).map(([name, c]) =>
      h('li', { class: c.ok === false ? 'bad' : c.ok ? 'good' : 'idle' },
        h('span', { class: 'status-ico', 'aria-hidden': 'true' }, c.ok === false ? '✕' : c.ok ? '✓' : '–'),
        h('strong', {}, s.adminStatusNames[name] ?? name),
        h('span', { class: 'status-detail' }, c.detail),
      ));
    if (!rows.length) return;
    status.replaceChildren(h('h3', {}, s.adminStatusTitle), h('ul', {}, ...rows));
    status.hidden = false;
  }).catch(() => { /* the inbox still works without it */ });

  return h('div', {},
    status,
    h('div', { class: 'admin-bar' }, count, h('label', { class: 'admin-hide' }, hide, ` ${s.adminHideResolved}`), logout),
    note, box,
  );
}
