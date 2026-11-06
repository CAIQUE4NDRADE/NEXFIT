// =====================================================================
// NEXFIT 2.0 · núcleo: rotas, tema, navegação, cronômetro na tela
// =====================================================================
import { state, save, onChange } from './store.js';
import { icon } from './icons.js';
import { bindActions, act, toast, brandMark, btn } from './ui.js';
import * as timer from './timer.js';
import { prime, telaAcesa } from './alerts.js';
import { fmtClock, esc } from './util.js';
import { initCloud, cloudButton } from './cloud.js';

import hoje from './screens/hoje.js';
import treinar from './screens/treinar.js';
import aovivo from './screens/aovivo.js';
import importar from './screens/importar.js';
import ficha from './screens/ficha.js';
import biblioteca from './screens/biblioteca.js';
import comida from './screens/comida.js';
import evolucao from './screens/evolucao.js';
import ajustes from './screens/ajustes.js';

const ROUTES = { hoje, treinar, treino: aovivo, importar, ficha, biblioteca, comida, evolucao, ajustes };
const TAB_OF = { hoje: 'hoje', treinar: 'treinar', treino: 'treinar', importar: 'treinar', ficha: 'treinar', biblioteca: 'treinar', comida: 'comida', evolucao: 'evolucao', ajustes: 'ajustes' };
const NAV = [['hoje', 'Hoje', 'house'], ['treinar', 'Treinar', 'dumbbell'], ['comida', 'Comida', 'utensils'], ['evolucao', 'Evolução', 'trending-up']];

// ---------- tema e letra ----------
export function applyPrefs() {
  const r = document.documentElement;
  r.dataset.theme = state.prefs.tema || 'light';
  r.style.setProperty('--scale', state.prefs.letra || 1);
  const dark = r.dataset.theme === 'dark' || (r.dataset.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111827' : '#F4F6F8');
}

// ---------- rotas ----------
export function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const [name = 'hoje', ...rest] = path.split('/');
  return { name: ROUTES[name] ? name : 'hoje', params: rest, query: Object.fromEntries(new URLSearchParams(query)) };
}
export const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

let current = null;
export function render({ keepScroll = false } = {}) {
  const r = parseRoute();
  const scr = ROUTES[r.name];
  const main = document.getElementById('main');
  const y = window.scrollY;
  const changed = current !== r.name + r.params.join('/');
  current = r.name + r.params.join('/');
  document.body.classList.toggle('live', !!scr.live);
  try {
    main.innerHTML = scr.render(r) || '';
    scr.after?.(main, r);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="card"><h2>Algo deu errado nesta tela</h2><p class="muted" style="margin:8px 0 16px">Seus dados estão salvos. Tente voltar ao início.</p>${btn('Voltar ao início', { href: '#/hoje', variant: 'primary' })}<details style="margin-top:14px"><summary class="small muted">Detalhes técnicos</summary><pre class="small">${esc(e.stack || e)}</pre></details></div>`;
  }
  document.title = (scr.title ? scr.title(r) + ' · ' : '') + 'NEXFIT';
  const tab = TAB_OF[r.name];
  document.querySelectorAll('[data-tab]').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (changed && !keepScroll) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  else window.scrollTo(0, y);
  telaAcesa(!!scr.live);
  renderTimer();
}
export const refresh = () => render({ keepScroll: true });

// ---------- shell ----------
function shell() {
  const navLinks = (cls) => NAV.map(([id, label, ic]) => `<a class="${cls}" data-tab="${id}" href="#/${id}">${icon(ic)}<span>${label}</span></a>`).join('');
  document.getElementById('app').innerHTML = `
  <a class="skip" href="#main">Pular para o conteúdo</a>
  <aside class="sidebar" aria-label="Menu principal">
    <a class="brand" href="#/hoje">${brandMark()}<span><span class="brand-name">NEX<b>FIT</b></span><span class="brand-tag">TRAIN · TRACK · EVOLVE</span></span></a>
    <nav class="stack" style="gap:6px">${navLinks('side-link')}
      <div class="side-sep"></div>
      <a class="side-link" data-tab="biblioteca-side" href="#/biblioteca">${icon('library')}<span>Biblioteca</span></a>
      <a class="side-link" data-tab="ajustes" href="#/ajustes">${icon('settings')}<span>Ajustes</span></a>
    </nav>
    <p class="side-foot">NEXFIT 2.0 · seus dados ficam com você</p>
  </aside>
  <header class="topbar">
    <a class="brand" href="#/hoje" aria-label="NEXFIT, início">${brandMark()}<span><span class="brand-name">NEX<b>FIT</b></span><span class="brand-tag">TRAIN · TRACK · EVOLVE</span></span></a>
    <span id="cloud-slot"></span>
    <a class="top-btn" href="#/ajustes" data-tab="ajustes" aria-label="Ajustes">${icon('settings')}<span>Ajustes</span></a>
  </header>
  <div id="rest-banner"></div>
  <main id="main" tabindex="-1"></main>
  <nav class="tabbar" aria-label="Menu principal">${navLinks('tab')}</nav>
  <div id="timer-root"></div>
  <div id="toast" role="status" aria-live="polite"></div>`;
}

// ---------- cronômetro na tela ----------
function renderTimer() {
  const g = timer.get();
  const root = document.getElementById('timer-root'), banner = document.getElementById('rest-banner');
  if (!root) return;
  const live = parseRoute().name === 'treino';
  if (!g) { root.innerHTML = ''; banner.innerHTML = ''; document.body.classList.remove('resting'); return; }
  if (!live) {        // fora do treino: só uma faixa discreta no topo
    root.innerHTML = ''; document.body.classList.remove('resting');
    banner.innerHTML = `<a class="rest-banner" href="#/treino">${icon('timer')}<span class="grow"><b>Descansando</b><span class="small"> · ${esc(g.info?.proximo || '')}</span></span><b class="num" data-t="clock">${fmtClock(g.left)}</b><span class="chip">Voltar</span></a>`;
    return;
  }
  banner.innerHTML = '';
  document.body.classList.add('resting');
  if (!root.firstChild) {
    root.innerHTML = `<div class="rest" role="dialog" aria-modal="true" aria-label="Descanso entre séries">
      <div class="rest-top"><span class="eyebrow">Descanso</span><span class="rest-title" data-t="titulo"></span></div>
      <div class="rest-ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" class="rest-track"/><circle cx="100" cy="100" r="88" class="rest-prog" data-t="prog" pathLength="100"/></svg>
        <div class="rest-center"><div class="rest-clock num" data-t="clock" role="timer" aria-live="off"></div><div class="rest-state" data-t="estado"></div></div></div>
      <p class="rest-next" data-t="prox"></p>
      <div class="rest-ctrl">
        <button class="btn btn-outline btn-lg" data-act="t-menos" aria-label="Tirar 15 segundos">−15 s</button>
        <button class="btn btn-outline btn-lg" data-act="t-pausa" data-t="pausa"></button>
        <button class="btn btn-outline btn-lg" data-act="t-mais" aria-label="Somar 15 segundos">+15 s</button>
      </div>
      <button class="btn btn-primary btn-xl btn-block" data-act="t-pular">${icon('skip-forward')}<span>Pular descanso</span></button>
      <button class="link-btn" data-act="t-corrigir">${icon('pencil')} Corrigir a série que acabei de fazer</button>
    </div>`;
  }
  const q = s => root.querySelector(`[data-t="${s}"]`);
  q('clock').textContent = fmtClock(g.left);
  q('titulo').textContent = g.info?.titulo || '';
  q('prox').innerHTML = g.info?.proximo ? `Próximo: <b>${esc(g.info.proximo)}</b>` : '';
  q('estado').textContent = g.paused ? 'Pausado' : '';
  q('prog').style.strokeDashoffset = String(100 - Math.min(100, g.pct));
  q('pausa').innerHTML = g.paused ? `${icon('play')}<span>Continuar</span>` : `${icon('pause')}<span>Pausar</span>`;
  root.querySelector('.rest').classList.toggle('paused', g.paused);
}
function tickOnly() {
  const g = timer.get(); if (!g) return renderTimer();
  const live = parseRoute().name === 'treino';
  const el = document.querySelector(live ? '#timer-root [data-t="clock"]' : '#rest-banner [data-t="clock"]');
  if (!el) return renderTimer();
  el.textContent = fmtClock(g.left);
  const p = document.querySelector('#timer-root [data-t="prog"]'); if (p) p.style.strokeDashoffset = String(100 - Math.min(100, g.pct));
}
act('t-menos', () => timer.add(-15));
act('t-mais', () => timer.add(15));
act('t-pausa', () => timer.toggle());
act('t-pular', () => timer.skip());

// ---------- início ----------
export function start() {
  applyPrefs();
  shell();
  bindActions(document);
  document.addEventListener('pointerdown', prime, { passive: true });   // libera som/voz no 1º toque
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyPrefs);
  timer.onTimer((ev, g) => {
    if (ev === 'tick') tickOnly();
    else if (ev === 'fim-info') document.dispatchEvent(new CustomEvent('nexfit:descanso-fim', { detail: g }));
    else renderTimer();
  });
  onChange(reason => { if (reason === 'cheio') toast('O armazenamento do aparelho está cheio. Apague fotos antigas ou faça um backup.', { ic: 'triangle-alert', ms: 9000 }); });
  window.addEventListener('hashchange', () => render());
  document.getElementById('cloud-slot').innerHTML = cloudButton();
  initCloud({ onRemote: () => { applyPrefs(); refresh(); } });
  timer.boot();
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}
