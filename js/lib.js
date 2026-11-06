// Biblioteca de exercícios: busca por id/nome/apelido e correspondência aproximada
import { EXERCISES } from './data/exercises.js';
import { norm } from './util.js';

export { EXERCISES };
export const CATEGORIAS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen'];
const byId = new Map(EXERCISES.map(e => [e.id, e]));
const byName = new Map(EXERCISES.map(e => [norm(e.nome), e]));

const STOP = new Set(['com', 'de', 'da', 'do', 'na', 'no', 'em', 'e', 'a', 'o', 'as', 'os', 'ou', 'para', 'pegada', 'aparelho']);
export const tokens = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t));

export function findEx(ref) {
  if (!ref) return null;
  if (typeof ref === 'object') return (ref.exId && byId.get(ref.exId)) || byName.get(norm(ref.nome)) || null;
  return byId.get(ref) || byName.get(norm(ref)) || null;
}

/** Acha o exercício mais parecido com um texto livre ("puxada alta", "leg 45", "supino reto barra"). */
export function matchEx(texto) {
  const n = norm(texto).replace(/[^a-z0-9 °]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  if (byName.has(n)) return { ex: byName.get(n), score: 1 };
  const tq = tokens(n);
  let best = null;
  for (const e of EXERCISES) {
    let s = 0;
    for (const a of e.alias || []) {
      const an = norm(a);
      if (n === an) s = Math.max(s, .97);
      else if (new RegExp(`(^| )${an}( |$)`).test(n)) s = Math.max(s, .6 + .35 * Math.min(1, tokens(an).length / Math.max(1, tq.length)));
    }
    const te = tokens(e.nome);
    const inter = tq.filter(t => te.some(x => x === t || (t.length > 3 && (x.startsWith(t) || t.startsWith(x))))).length;
    if (inter) s = Math.max(s, (2 * inter) / (tq.length + te.length));
    if (!best || s > best.score) best = { ex: e, score: s };
  }
  return best && best.score >= .5 ? best : null;
}

export const imgOf = ref => findEx(ref)?.img || null;
