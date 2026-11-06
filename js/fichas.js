// Lógica das fichas de treino (criar, editar, importar, trocar exercício)
import { state, save, treino } from './store.js';
import { uid } from './util.js';
import { EXERCISES, findEx } from './lib.js';

export function novoEx(lib, o = {}) {
  return { id: uid(), exId: lib?.id || null, nome: lib?.nome || o.nome || 'Exercício', series: o.series ?? 3, reps: o.reps ?? '10–12',
    carga: o.carga ?? null, descanso: o.descanso ?? null, obs: o.obs || '', tipo: o.tipo || null };
}
export function criarTreino(nome, dias = []) {
  const t = { id: uid(), nome: nome || `Treino ${String.fromCharCode(65 + state.treinos.length)}`, dias, exs: [] };
  state.treinos.push(t); save(); return t;
}
export function criarDivisao(letras) {
  const ts = [...letras].map(l => ({ id: uid(), nome: `Treino ${l}`, dias: [], exs: [] }));
  state.treinos.push(...ts); save(); return ts;
}
export function apagarTreino(id) { state.treinos = state.treinos.filter(t => t.id !== id); save(); }
export function duplicarTreino(id) {
  const t = treino(id); if (!t) return;
  const c = JSON.parse(JSON.stringify(t)); c.id = uid(); c.nome = t.nome + ' (cópia)'; c.exs.forEach(e => { e.id = uid(); });
  state.treinos.splice(state.treinos.indexOf(t) + 1, 0, c); save(); return c;
}
export function addEx(treinoId, lib) { const t = treino(treinoId); if (!t) return; const e = novoEx(lib); t.exs.push(e); save(); return e; }
export function moverEx(treinoId, exId, dir) {
  const t = treino(treinoId); const i = t.exs.findIndex(e => e.id === exId), j = i + dir;
  if (i < 0 || j < 0 || j >= t.exs.length) return;
  [t.exs[i], t.exs[j]] = [t.exs[j], t.exs[i]]; save();
}
export function removerEx(treinoId, exId) { const t = treino(treinoId); t.exs = t.exs.filter(e => e.id !== exId); save(); }

/** Alternativas do mesmo grupo muscular (para trocar quando o aparelho está ocupado). */
export function alternativas(ref) {
  const lib = findEx(ref);
  if (!lib) return EXERCISES.slice(0, 20);
  const mesmo = EXERCISES.filter(e => e.id !== lib.id && e.grupo === lib.grupo);
  const cat = EXERCISES.filter(e => e.id !== lib.id && e.grupo !== lib.grupo && e.cat === lib.cat);
  return [...mesmo, ...cat];
}
/** Troca o exercício mantendo séries, repetições e descanso. */
export function trocar(alvo, lib) {
  alvo.exId = lib.id; alvo.nome = lib.nome; alvo.carga = null; save();
}

/** Salva o resultado do leitor de texto como fichas. */
export function importar(parsed, { substituir = false } = {}) {
  const novos = parsed.treinos.map(t => ({
    id: uid(), nome: t.nome, dias: t.dias || [],
    exs: t.exs.map(e => novoEx(e.exId ? findEx(e.exId) : null, e))
  }));
  if (substituir) state.treinos = novos; else state.treinos.push(...novos);
  save(); return novos;
}
