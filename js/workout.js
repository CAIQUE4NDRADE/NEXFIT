// =====================================================================
// Lógica do treino ao vivo (sem interface)
// =====================================================================
import { state, save, treino, sessao } from './store.js';
import { uid, today, repsAlvo, parseNum } from './util.js';
import { ultimaVez } from './stats.js';
import * as timer from './timer.js';

export const atual = () => {
  const av = state.aoVivo; if (!av) return null;
  const s = sessao(av.sessaoId);
  if (!s || s.fim) { state.aoVivo = null; save(); return null; }
  return { av, s, plano: s.plano || [] };
};

export function iniciar(treinoId) {
  const t = treino(treinoId); if (!t || !t.exs.length) return null;
  const s = {
    id: uid(), treinoId: t.id, nome: t.nome, data: today(), inicio: new Date().toISOString(), fim: null, sets: [],
    plano: JSON.parse(JSON.stringify(t.exs)), sentiu: null, cardio: null
  };
  state.sessoes.push(s);
  state.aoVivo = { sessaoId: s.id, treinoId: t.id, i: 0 };
  save('treino');
  return s;
}

export const setsDo = (s, i) => s.sets.filter(x => x.i === i);
export const completo = (s, i) => setsDo(s, i).length >= (s.plano[i]?.series || 0);
export const totalSeries = s => s.plano.reduce((a, e) => a + (e.series || 0), 0);
export const proximoIncompleto = (s, desde = 0) => {
  for (let k = 0; k < s.plano.length; k++) { const j = (desde + k) % s.plano.length; if (!completo(s, j)) return j; }
  return -1;
};

/** Valores sugeridos para a próxima série. */
export function sugestao(s, i) {
  const e = s.plano[i]; const feitos = setsDo(s, i);
  const ult = feitos.at(-1);
  const antes = ultimaVez(e.nome, s.id);
  const n = feitos.length + 1;
  const ref = antes?.sets.find(x => x.n === n) || antes?.sets.at(-1);
  return {
    kg: ult?.kg ?? e.carga ?? ref?.kg ?? '',
    reps: ult?.reps ?? repsAlvo(e.reps),
    antes
  };
}

export function irPara(i) {
  const a = atual(); if (!a) return;
  a.av.i = Math.max(0, Math.min(a.plano.length - 1, i)); save('treino');
}

/** Registra a série e inicia o descanso. Retorna info para a interface. */
export function registrarSerie(kgTxt, repsTxt) {
  const a = atual(); if (!a) return null;
  const { s, av } = a; const i = av.i; const e = s.plano[i];
  const kg = parseNum(kgTxt) ?? 0, reps = parseNum(repsTxt) ?? 0;
  const n = setsDo(s, i).length + 1;
  const set = { i, nome: e.nome, n, kg, reps, t: new Date().toISOString() };
  s.sets.push(set);
  // a carga usada vira a sugestão da próxima vez
  const t = treino(s.treinoId); const te = t?.exs.find(x => x.id === e.id);
  if (te && kg) te.carga = kg;
  e.carga = kg || e.carga;

  const acabouEx = n >= e.series;
  const prox = acabouEx ? proximoIncompleto(s, i + 1) : i;
  const acabouTudo = prox === -1;
  let proximo = '', fala = '';
  if (!acabouEx) { proximo = `Série ${n + 1} de ${e.series} · ${e.nome}`; fala = `Descanso terminado. Série ${n + 1} de ${e.series}.`; }
  else if (!acabouTudo) { const pe = s.plano[prox]; proximo = `Próximo exercício: ${pe.nome}`; fala = `Descanso terminado. Próximo exercício: ${pe.nome}.`; av.i = prox; }
  save('treino');
  if (!acabouTudo && e.tipo !== 'cardio') timer.start(e.descanso || state.perfil.descanso || 90, { titulo: `${e.nome} · série ${n} feita`, proximo, fala });
  else timer.stop();
  return { set, acabouEx, acabouTudo, mudouEx: acabouEx && !acabouTudo };
}

/** Troca o exercício só nesta sessão (a ficha continua igual). */
export function trocarHoje(i, lib) {
  const a = atual(); if (!a) return;
  const e = a.s.plano[i];
  e.trocadoDe = e.trocadoDe || e.nome; e.exId = lib.id; e.nome = lib.nome; e.carga = null; e.id = e.id + '-t';
  save('treino');
}

export function desfazer(set) {
  const a = atual(); if (!a) return;
  const k = a.s.sets.indexOf(set); if (k < 0) return;
  a.s.sets.splice(k, 1); a.av.i = set.i;
  timer.stop(); save('treino');
}

export function corrigir(set, kg, reps) {
  set.kg = parseNum(kg) ?? set.kg; set.reps = parseNum(reps) ?? set.reps; save('treino');
}
export function apagarSerie(set) {
  const a = atual(); if (!a) return;
  a.s.sets.splice(a.s.sets.indexOf(set), 1);
  a.s.sets.filter(x => x.i === set.i).forEach((x, k) => { x.n = k + 1; });
  save('treino');
}

export function finalizar({ sentiu = null, dor = null, cardio = null } = {}) {
  const a = atual(); if (!a) return null;
  const s = a.s;
  s.fim = new Date().toISOString(); s.sentiu = sentiu; s.cardio = cardio;
  if (sentiu === 'dor') state.dores.push({ date: s.data, score: dor?.nivel ?? null, onde: dor?.onde || '', sessao: s.id });
  state.aoVivo = null; timer.stop(); save('treino');
  return s;
}
export function descartar() {
  const a = atual(); if (!a) return;
  state.sessoes = state.sessoes.filter(x => x.id !== a.s.id);
  state.aoVivo = null; timer.stop(); save('treino');
}
