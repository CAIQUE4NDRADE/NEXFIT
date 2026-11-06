// =====================================================================
// Cronômetro de descanso
// - Conta pelo relógio real (Date.now), não por "somar segundos".
// - Estado salvo: sobrevive a recarregar a página, aba suspensa e tela bloqueada.
// - Quando acaba: som + vibração + voz + notificação (se permitida).
// - Sem descanso ativo, get() devolve null e nada é mostrado.
// =====================================================================
import { beep, falar, vibrar, notificar } from './alerts.js';

const K = 'nexfitTimer';
const subs = new Set();
let st = read();            // {endAt, total, pausedLeft, info:{titulo, proximo, fala}}
let loopH = null, endH = null;

function read() { try { return JSON.parse(localStorage.getItem(K)); } catch { return null; } }
function persist() { try { st ? localStorage.setItem(K, JSON.stringify(st)) : localStorage.removeItem(K); } catch {} }
function emit(ev) { const g = get(); subs.forEach(fn => fn(ev, g)); }
export const onTimer = fn => { subs.add(fn); return () => subs.delete(fn); };

export function get() {
  if (!st) return null;
  const paused = st.pausedLeft != null;
  const left = paused ? st.pausedLeft : Math.max(0, Math.ceil((st.endAt - Date.now()) / 1000));
  return { ...st, left, paused, pct: st.total ? (1 - left / st.total) * 100 : 0 };
}

export function start(sec, info = {}) {
  st = { endAt: Date.now() + sec * 1000, total: sec, pausedLeft: null, info };
  persist(); run(); emit('start');
}
export function pause() {
  const g = get(); if (!g || g.paused) return;
  st.pausedLeft = g.left; persist(); clearTimeout(endH); emit('pause');
}
export function resume() {
  if (!st || st.pausedLeft == null) return;
  st.endAt = Date.now() + st.pausedLeft * 1000; st.pausedLeft = null; persist(); run(); emit('resume');
}
export const toggle = () => (get()?.paused ? resume() : pause());
export function add(delta) {
  const g = get(); if (!g) return;
  if (g.paused) st.pausedLeft = Math.max(5, st.pausedLeft + delta);
  else st.endAt = Math.max(Date.now() + 5000, st.endAt + delta * 1000);
  const left = get().left;
  st.total = Math.max(left, st.total + delta);
  persist(); run(); emit('add');
}
export function skip() { stop('skip'); }
export function stop(ev = 'stop') { st = null; persist(); clearInterval(loopH); clearTimeout(endH); loopH = null; emit(ev); }

function fire() {
  const info = st?.info || {};
  st = null; persist(); clearInterval(loopH); clearTimeout(endH); loopH = null;
  beep('fim'); vibrar();
  falar(info.fala || 'Descanso terminado.');
  if (document.visibilityState !== 'visible') notificar('⏱️ Descanso terminado', info.proximo || 'Hora da próxima série!');
  emit('fim');
  subs.forEach(fn => fn('fim-info', info));
}

function check() {
  const g = get(); if (!g) return;
  if (!g.paused && g.left <= 0) return fire();
  if (!g.paused && g.left === 3 && check.last !== st.endAt) { check.last = st.endAt; beep('aviso'); }   // bip aos 3 s
  emit('tick');
}

function run() {
  clearInterval(loopH); clearTimeout(endH);
  if (!st) return;
  loopH = setInterval(check, 250);
  if (st.pausedLeft == null) endH = setTimeout(check, Math.max(0, st.endAt - Date.now()) + 30);   // dispara mesmo com a aba em segundo plano
  check();
}

// Voltou para o app (desbloqueou a tela / trocou de aba): recalcula na hora
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
window.addEventListener('pageshow', () => check());

// Recupera um descanso que estava rolando antes de recarregar
export function boot() {
  if (!st) return;
  if (st.pausedLeft == null && Date.now() - st.endAt > 10 * 60 * 1000) { stop(); return; }   // muito antigo
  run();
}
