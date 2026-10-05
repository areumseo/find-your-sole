import { HttpError, sendFeedback } from './api';
import { h } from './dom';
import { t } from './i18n';
import { toast } from './ui';

const MAX_MESSAGE = 2000;
const MAX_EDGE = 1600;
// The server accepts up to 1.5 MB; stay a little under so base64 overhead never matters.
const MAX_BYTES = 1_400_000;

/** Where the note was written. Always Korean: it is read by the person running the site. */
export function contextLabel(hash = location.hash): string {
  const path = hash.replace(/^#\/?/, '');
  const [page, sub] = path.split('/');
  const forms: Record<string, string> = { beginner: '초심자 폼', expert: '경험자 폼', comfort: '편한 신발 폼', results: '추천 결과' };
  switch (page) {
    case 'saved': return '저장';
    case 'me': return '마이페이지';
    case 'about': return '앱 정보';
    case 'more': return '더보기';
    case 'search': return `검색 · ${forms[sub] ?? '검색'}`;
    default: return '홈';
  }
}

/** Shrink a phone screenshot to a JPEG that fits the server limit; returns raw base64. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('unreadable image'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = '#fff'; // transparent PNGs would turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= MAX_BYTES) return await toBase64(blob);
    }
    throw new Error('image too large');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function openFeedback(): void {
  const s = t();
  const context = contextLabel();
  let screenshot: string | null = null;

  const note = h('p', { class: 'notice', role: 'status' });
  const text = h('textarea', {
    class: 'feedback-text', maxlength: MAX_MESSAGE, rows: 6, placeholder: s.feedbackPlaceholder,
    'aria-label': s.feedbackTitle, required: true,
  });
  const counter = h('span', { class: 'feedback-count' }, `0 / ${MAX_MESSAGE}`);
  text.addEventListener('input', () => (counter.textContent = `${text.value.length} / ${MAX_MESSAGE}`));

  // Honeypot: invisible to people, tempting to bots.
  const trap = h('input', { class: 'feedback-trap', name: 'website', type: 'text', tabindex: -1, autocomplete: 'off', 'aria-hidden': 'true' });

  const preview = h('div', { class: 'feedback-preview' });
  const file = h('input', { type: 'file', accept: 'image/*', class: 'feedback-file', 'aria-label': s.feedbackAttach });
  const clearShot = () => { screenshot = null; file.value = ''; preview.replaceChildren(); };
  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (!picked) return clearShot();
    note.className = 'notice';
    note.textContent = '';
    try {
      screenshot = await shrink(picked);
      const img = h('img', { src: `data:image/jpeg;base64,${screenshot}`, alt: '' });
      preview.replaceChildren(img, h('button', { type: 'button', class: 'btn btn-text', onClick: clearShot }, s.feedbackRemoveImage));
    } catch {
      clearShot();
      note.className = 'notice error';
      note.textContent = s.feedbackBadImage;
    }
  });

  const send = h('button', { type: 'submit', class: 'btn btn-primary' }, s.feedbackSend);
  const dialog = h('dialog', { class: 'dialog feedback-dialog' });
  const form = h('form', { method: 'dialog' },
    h('h3', {}, s.feedbackTitle),
    h('p', { class: 'feedback-hint' }, s.feedbackHint),
    text,
    h('div', { class: 'feedback-meta' }, h('span', { class: 'feedback-privacy' }, s.feedbackPrivacy), counter),
    trap,
    h('div', { class: 'feedback-attach' },
      h('label', { class: 'btn btn-text' }, s.feedbackAttach, file),
      preview,
    ),
    note,
    h('div', { class: 'dialog-actions' },
      h('button', { type: 'button', class: 'btn btn-text', onClick: () => dialog.close() }, s.cancel),
      send,
    ),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // stay open until the server answers
    const message = text.value.trim();
    if (!message) { text.focus(); return; }
    send.disabled = true;
    send.textContent = s.feedbackSending;
    note.className = 'notice';
    note.textContent = '';
    try {
      await sendFeedback(message, context, screenshot, trap.value);
      dialog.close();
      toast(s.feedbackThanks);
    } catch (err) {
      note.className = 'notice error';
      note.textContent = err instanceof HttpError && err.status === 429 ? s.feedbackBusy
        : err instanceof HttpError && (err.status === 413 || err.status === 422) && screenshot ? s.feedbackBadImage
        : s.feedbackError;
      send.disabled = false;
      send.textContent = s.feedbackSend;
    }
  });

  dialog.append(form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  text.focus();
}

/** The round "feedback" button that floats on every page. Rebuilt on language change. */
export function feedbackButton(): HTMLElement {
  const s = t();
  return h('button', { type: 'button', class: 'fab', 'aria-label': s.feedbackFab, title: s.feedbackFab, onClick: openFeedback },
    h('span', { class: 'fab-ico', 'aria-hidden': 'true' }, '💬'),
    h('span', { class: 'fab-label' }, s.feedbackFab),
  );
}
