// Som, voz, vibração, notificação e tela acesa
import { state } from './store.js';

let ctx = null;
/** Precisa ser chamado num toque do usuário (iPhone/Android só liberam áudio e voz assim). */
export function prime() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C && !ctx) ctx = new C();
    if (ctx?.state === 'suspended') ctx.resume();
  } catch {}
  try {
    if ('speechSynthesis' in window && !prime.voz) {
      const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); prime.voz = true;
    }
  } catch {}
}

export function beep(kind = 'fim') {
  if (!state.prefs.som || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const notas = kind === 'fim' ? [[880, 0], [880, .25], [1175, .5]] : [[660, 0]];
  for (const [f, d] of notas) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, now + d); g.gain.exponentialRampToValueAtTime(.5, now + d + .02); g.gain.exponentialRampToValueAtTime(.0001, now + d + .22);
    o.connect(g).connect(ctx.destination); o.start(now + d); o.stop(now + d + .25);
  }
}

let vozPt = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  vozPt = vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export function falar(texto) {
  if (!state.prefs.voz || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR'; u.rate = .95; u.pitch = 1; if (vozPt) u.voice = vozPt;
    speechSynthesis.speak(u);
  } catch {}
}
export const vibrar = (p = [250, 120, 250, 120, 400]) => { if (state.prefs.vibrar) try { navigator.vibrate?.(p); } catch {} };

// ---------- notificação (tela bloqueada / outro app) ----------
export const podeNotificar = () => 'Notification' in window;
export const notifStatus = () => podeNotificar() ? Notification.permission : 'indisponivel';
export async function pedirNotificacao() {
  if (!podeNotificar()) return 'indisponivel';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}
export async function notificar(titulo, corpo) {
  if (notifStatus() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body: corpo, tag: 'nexfit-descanso', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [300, 120, 300], requireInteraction: false };
    if (reg) { await reg.showNotification(titulo, opts); return true; }
    new Notification(titulo, opts); return true;
  } catch { return false; }
}

// ---------- tela acesa durante o treino ----------
let lock = null, querAceso = false;
export async function telaAcesa(on) {
  querAceso = on && state.prefs.telaAcesa;
  try {
    if (querAceso && !lock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!querAceso && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && querAceso) telaAcesa(true); });
