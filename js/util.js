// Utilidades gerais (sem dependências)
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = (d = new Date()) => d.toLocaleDateString('sv-SE');          // 2026-11-06
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return today(d); };
export const weekday = (iso = today()) => new Date(iso + 'T12:00:00').getDay();  // 0=dom
export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
export const fmt = n => (n == null || n === '' || Number.isNaN(Number(n))) ? '—' : nf.format(Number(n));
export const fmtInt = n => (n == null || Number.isNaN(Number(n))) ? '—' : Math.round(Number(n)).toLocaleString('pt-BR');
export const parseNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function fmtDate(iso, opts = { day: '2-digit', month: 'short' }) {
  if (!iso) return '—';
  return new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', opts).replace('.', '');
}
export function relDay(iso) {
  const t = today();
  if (iso === t) return 'Hoje';
  if (iso === addDays(t, -1)) return 'Ontem';
  if (iso === addDays(t, 1)) return 'Amanhã';
  return fmtDate(iso, { weekday: 'short', day: '2-digit', month: 'short' });
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Lê "3 × 4–6", "4x10-12", "3x até a falha", "10 × 10"
export function parsePrescription(txt) {
  const s = String(txt || '');
  const m = s.match(/(\d+)\s*(?:[x×*]|s[eé]ries?\s*de)\s*(\d+\s*(?:[-–a]\s*\d+)?|at[eé]\s*a\s*falha|falha|m[aá]x\w*)/i);
  if (m) {
    const series = clamp(parseInt(m[1], 10), 1, 20);
    let reps = m[2].replace(/\s+/g, '').replace(/[-a]/, '–');
    if (/falha|m[aá]x/i.test(reps)) reps = 'até a falha';
    return { series, reps };
  }
  if (/falha/i.test(s)) return { series: 3, reps: 'até a falha' };
  return { series: 3, reps: '10–12' };
}
// Primeiro número das repetições ("10–12" → 10) para pré-preencher
export const repsAlvo = reps => { const m = String(reps || '').match(/\d+/); return m ? parseInt(m[0], 10) : 10; };
