// =====================================================================
// Componentes de interface reutilizáveis (HTML em string) + ações
// Cada botão usa data-act="nome" e a ação é registrada com act().
// =====================================================================
import { icon } from './icons.js';
import { esc } from './util.js';

// ---------- ações (delegação de eventos) ----------
const actions = {};
export const act = (name, fn) => { actions[name] = fn; };
export function bindActions(root = document) {
  root.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  root.addEventListener('change', ev => {
    const el = ev.target.closest('[data-change]');
    if (el && actions[el.dataset.change]) actions[el.dataset.change](el, ev);
  });
  root.addEventListener('input', ev => {
    const el = ev.target.closest('[data-input]');
    if (el && actions[el.dataset.input]) actions[el.dataset.input](el, ev);
  });
  root.addEventListener('submit', ev => {
    const el = ev.target.closest('form[data-submit]');
    if (el && actions[el.dataset.submit]) { ev.preventDefault(); actions[el.dataset.submit](el, ev); }
  });
}
const attrs = o => Object.entries(o || {}).map(([k, v]) => v === true ? k : v === false || v == null ? '' : `${k}="${esc(v)}"`).join(' ');

// ---------- componentes ----------
export function btn(label, { act: a, ic, variant = 'outline', size = '', block = false, attrs: at, href, srLabel } = {}) {
  const cls = `btn btn-${variant} ${size ? 'btn-' + size : ''} ${block ? 'btn-block' : ''} ${!label ? 'icon-btn' : ''}`;
  const inner = `${ic ? icon(ic) : ''}${label ? `<span>${label}</span>` : ''}${!label && srLabel ? `<span class="sr">${esc(srLabel)}</span>` : ''}`;
  if (href) return `<a class="${cls}" href="${esc(href)}" ${attrs(at)}>${inner}</a>`;
  return `<button type="button" class="${cls}" ${a ? `data-act="${a}"` : ''} ${!label && srLabel ? `aria-label="${esc(srLabel)}"` : ''} ${attrs(at)}>${inner}</button>`;
}
export const card = (body, cls = '', at = '') => `<section class="card ${cls}" ${at}>${body}</section>`;
export const cardHead = (title, ic, right = '', tag = 'h2') => `<div class="card-head"><${tag}>${ic ? icon(ic) : ''}${title}</${tag}>${right}</div>`;
export const stat = (label, value, unit = '', sub = '') =>
  `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}${unit ? `<span class="stat-unit">${unit}</span>` : ''}</span>${sub ? `<span class="small muted">${sub}</span>` : ''}</div>`;
export const bar = (pct, label = '', color = '') =>
  `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" ${label ? `aria-label="${esc(label)}"` : ''}><i style="--p:${Math.min(100, Math.max(0, pct))}%;${color ? `background:${color}` : ''}"></i></div>`;
export const chip = (txt, kind = '') => `<span class="chip ${kind ? 'chip-' + kind : ''}">${txt}</span>`;
export const notice = (txt, kind = 'info', ic = 'info') => `<div class="notice notice-${kind}" role="note">${icon(ic)}<div>${txt}</div></div>`;
export const empty = (ic, title, text = '', action = '') => `<div class="empty">${icon(ic)}<h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${action}</div>`;
export function seg(name, options, current) {
  return `<div class="seg" role="group">${options.map(([v, l]) => `<button type="button" data-act="${name}" data-v="${esc(v)}" aria-pressed="${v === current}">${l}</button>`).join('')}</div>`;
}
export function stepper({ id, label, value, step = 1, min = 0, max = 999, unit = '', decimals = false }) {
  return `<div><span class="stepper-label" id="${id}-l">${label}</span>
  <div class="stepper" data-stepper="${id}" data-step="${step}" data-min="${min}" data-max="${max}">
    <button type="button" data-act="step" data-dir="-1" aria-label="Diminuir ${esc(label)}">${icon('minus')}</button>
    <div class="val"><input id="${id}" class="num" inputmode="${decimals ? 'decimal' : 'numeric'}" value="${value ?? ''}" placeholder="0" aria-labelledby="${id}-l" autocomplete="off"><div class="unit">${unit}</div></div>
    <button type="button" data-act="step" data-dir="1" aria-label="Aumentar ${esc(label)}">${icon('plus')}</button>
  </div></div>`;
}
act('step', el => {
  const box = el.closest('[data-stepper]'), inp = box.querySelector('input');
  const step = parseFloat(box.dataset.step), min = parseFloat(box.dataset.min), max = parseFloat(box.dataset.max);
  const cur = parseFloat(String(inp.value).replace(',', '.')) || 0;
  let v = Math.round((cur + step * Number(el.dataset.dir)) * 100) / 100;
  v = Math.min(max, Math.max(min, v));
  inp.value = String(v).replace('.', ',');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  navigator.vibrate?.(8);
});
export const swtch = (id, label, checked, sub = '', change = '') =>
  `<label class="switch" for="${id}"><span><b>${label}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ''}</span><input type="checkbox" role="switch" id="${id}" ${checked ? 'checked' : ''} ${change ? `data-change="${change}"` : ''}></label>`;

// ---------- folha (modal) ----------
let lastFocus = null;
export function openSheet(html, { label = 'Janela', onClose } = {}) {
  closeSheet();
  lastFocus = document.activeElement;
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'sheet';
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="sheet-grip"></div>${html}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov) closeSheet(); });
  ov._onClose = onClose;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  const f = ov.querySelector('[autofocus], input, button:not([data-act="fechar"]), [tabindex]');
  setTimeout(() => f?.focus(), 30);
  return ov.querySelector('.sheet');
}
export function closeSheet() {
  const ov = document.getElementById('sheet');
  if (!ov) return;
  ov._onClose?.();
  ov.remove(); document.body.style.overflow = '';
  lastFocus?.focus?.();
}
export const sheetHead = (title, sub = '') => `<div class="sheet-head"><div><h2>${title}</h2>${sub ? `<p class="muted small" style="margin-top:4px">${sub}</p>` : ''}</div>${btn('', { act: 'fechar', ic: 'x', variant: 'ghost', srLabel: 'Fechar' })}</div>`;
act('fechar', () => closeSheet());
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/** Confirmação com botões grandes (substitui o confirm() do navegador). */
export function confirmar(titulo, texto, { ok = 'Confirmar', cancelar = 'Cancelar', perigo = false } = {}) {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (done) return; done = true; res(v); };
    const s = openSheet(`${sheetHead(titulo)}<p class="muted" style="margin-bottom:20px">${texto}</p>
      <div class="stack">${btn(ok, { act: 'cf-ok', variant: perigo ? 'danger' : 'primary', size: 'lg', block: true })}${btn(cancelar, { act: 'cf-no', size: 'lg', block: true })}</div>`,
      { label: titulo, onClose: () => fin(false) });
    s.querySelector('[data-act="cf-ok"]').onclick = e => { e.stopPropagation(); fin(true); closeSheet(); };
    s.querySelector('[data-act="cf-no"]').onclick = e => { e.stopPropagation(); fin(false); closeSheet(); };
  });
}

// ---------- aviso rápido (toast) com "Desfazer" ----------
let toastT;
export function toast(msg, { undo, ic = 'circle-check', ms = 4500 } = {}) {
  const box = document.getElementById('toast');
  clearTimeout(toastT);
  box.innerHTML = `<div class="toast">${icon(ic)}<span class="grow">${msg}</span>${undo ? `<button type="button" class="btn btn-sm btn-primary" id="toast-undo">${icon('undo-2')}Desfazer</button>` : ''}</div>`;
  if (undo) box.querySelector('#toast-undo').onclick = () => { box.innerHTML = ''; undo(); };
  toastT = setTimeout(() => { box.innerHTML = ''; }, undo ? Math.max(ms, 7000) : ms);
}

export function brandMark() {
  return `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 25V7h4.2l7.6 11.2V7H24v18h-4.2L12.2 13.8V25z" fill="#A3E635"/></svg></span>`;
}
