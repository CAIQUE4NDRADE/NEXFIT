// Cálculos a partir do estado (sem interface)
import { state, sessoesFeitas } from './store.js';
import { today, addDays, weekday, norm } from './util.js';

export const volumeSessao = s => s.sets.reduce((a, x) => a + (Number(x.kg) || 0) * (Number(x.reps) || 0), 0);
export const duracaoSessao = s => (s.fim && s.inicio) ? new Date(s.fim) - new Date(s.inicio) : 0;

/** Treino programado para hoje: pelo dia da semana; senão, o próximo da sequência. */
export function treinoDeHoje() {
  const ts = state.treinos;
  if (!ts.length) return null;
  const wd = weekday();
  const doDia = ts.find(t => (t.dias || []).includes(wd));
  if (doDia) return { treino: doDia, motivo: 'dia' };
  const ult = [...sessoesFeitas()].reverse().find(s => ts.some(t => t.id === s.treinoId));
  if (!ult) return { treino: ts[0], motivo: 'primeiro' };
  const i = ts.findIndex(t => t.id === ult.treinoId);
  return { treino: ts[(i + 1) % ts.length], motivo: 'sequencia' };
}

export const feitoHoje = treinoId => state.sessoes.some(s => s.fim && s.data === today() && (!treinoId || s.treinoId === treinoId));

/** Última vez que o exercício foi feito (antes da sessão atual). */
export function ultimaVez(nome, excetoSessao) {
  const n = norm(nome);
  for (let i = state.sessoes.length - 1; i >= 0; i--) {
    const s = state.sessoes[i];
    if (s.id === excetoSessao) continue;
    const sets = s.sets.filter(x => norm(x.nome) === n);
    if (sets.length) return { data: s.data, sets };
  }
  return null;
}

/** Recorde (maior carga) por exercício. */
export function recordes() {
  const m = new Map();
  for (const s of state.sessoes) for (const x of s.sets) {
    const kg = Number(x.kg) || 0; if (!kg) continue;
    const k = norm(x.nome); const cur = m.get(k);
    if (!cur || kg > cur.kg || (kg === cur.kg && x.reps > cur.reps)) m.set(k, { nome: x.nome, kg, reps: x.reps, data: s.data });
  }
  return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Histórico de carga de um exercício: maior carga por dia. */
export function historicoCarga(nome) {
  const n = norm(nome), out = [];
  for (const s of state.sessoes) {
    const sets = s.sets.filter(x => norm(x.nome) === n && Number(x.kg) > 0);
    if (sets.length) out.push({ data: s.data, kg: Math.max(...sets.map(x => Number(x.kg))), reps: sets.reduce((a, x) => a + (Number(x.reps) || 0), 0) });
  }
  return out;
}
export function exerciciosFeitos() {
  const m = new Map();
  for (const s of state.sessoes) for (const x of s.sets) m.set(norm(x.nome), x.nome);
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Dia ativo = treinou OU anotou comida OU bebeu água. */
export function diaAtivo(d) {
  return state.sessoes.some(s => s.data === d && s.sets.length) || (state.comida[d] || []).length > 0 || (state.agua[d] || 0) > 0;
}
export function sequencia() {
  let d = today(), n = 0;
  if (!diaAtivo(d)) d = addDays(d, -1);           // hoje ainda pode ser feito
  while (diaAtivo(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

/** Semana atual (segunda a domingo) com dias treinados. */
export function semanaAtual() {
  const t = today(), wd = weekday(t), seg = addDays(t, -((wd + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(seg, i);
    return { d, treinou: state.sessoes.some(s => s.data === d && s.sets.length), hoje: d === t, futuro: d > t };
  });
}
export function treinosPorSemana(n = 8) {
  const t = today(), wd = weekday(t), seg = addDays(t, -((wd + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const ini = addDays(seg, -7 * (n - 1 - i)), fim = addDays(ini, 6);
    const qtd = new Set(state.sessoes.filter(s => s.sets.length && s.data >= ini && s.data <= fim).map(s => s.data)).size;
    return { ini, qtd };
  });
}

export function totaisComida(d = today()) {
  return (state.comida[d] || []).reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}
export const pesoAtual = () => [...state.pesos].sort((a, b) => a.date.localeCompare(b.date)).at(-1) || null;

/** Comparação: últimos N dias × N dias anteriores. */
export function comparar(dias = 30) {
  const t = today(), a1 = addDays(t, -dias + 1), b0 = addDays(a1, -1), b1 = addDays(a1, -dias);
  const per = (ini, fim) => {
    const ss = state.sessoes.filter(s => s.sets.length && s.data >= ini && s.data <= fim);
    const ps = state.pesos.filter(p => p.date >= ini && p.date <= fim).sort((a, b) => a.date.localeCompare(b.date));
    return { treinos: new Set(ss.map(s => s.data)).size, volume: ss.reduce((a, s) => a + volumeSessao(s), 0), peso: ps.at(-1)?.kg ?? null };
  };
  return { atual: per(a1, t), anterior: per(b1, b0) };
}
