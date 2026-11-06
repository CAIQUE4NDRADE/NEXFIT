// =====================================================================
// Estado do app + persistência + migração dos dados antigos
// Tudo fica no aparelho (localStorage) e, com login, também na nuvem.
// =====================================================================
import { LEGACY_PLANS } from './data/legacy-plans.js';
import { uid, today, parsePrescription, parseNum } from './util.js';

export const KEY = 'nexfitV3';
export const LEGACY_KEY = 'souzaEvolutionPersonalV2';   // SOUZA EVOLUTION / NEXFIT v1
const listeners = new Set();

export function emptyState() {
  return {
    v: 3,
    criadoEm: new Date().toISOString(),
    perfil: { nome: '', metaKcal: null, metaProt: null, metaCarb: null, metaGord: null, metaAgua: 2000, descanso: 90, pesoMeta: null },
    prefs: { tema: 'light', letra: 1, voz: true, som: true, vibrar: true, telaAcesa: true, avisoSaude: false, boasVindas: false },
    treinos: [],          // {id, nome, dias:[0-6], exs:[{id, exId, nome, series, reps, carga, descanso, obs}]}
    sessoes: [],          // {id, treinoId, nome, data, inicio, fim, sets:[{i, nome, n, kg, reps, t}], sentiu, cardio}
    aoVivo: null,         // {sessaoId, treinoId, i}
    pesos: [],            // {date, kg}
    medidas: [],          // {date, cintura, quadril, peito, braco, coxa}
    fotos: [],            // {id, date, pose, data}   (só no aparelho)
    comida: {},           // {'2026-11-06': [{id, ref, alimentoId, nome, g, kcal, p, c, f, medida}]}
    agua: {},             // {'2026-11-06': ml}
    alimentosProprios: [],// [id, nome, 'Rótulo', kcal, p, c, f] por 100 g
    dores: [],
    legado: null          // dados brutos da versão antiga (nada é perdido)
  };
}

function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }

/** Garante que um objeto carregado (local, nuvem ou backup) tem o formato v3. */
export function normalize(s) {
  if (!s || typeof s !== 'object') return emptyState();
  if (s.v !== 3) {
    // Formato antigo (records/weights/photos) → migra
    if (s.records || s.weights || s.customPlans) return migrateV2(s);
    return emptyState();
  }
  const e = emptyState();
  return { ...e, ...s, perfil: { ...e.perfil, ...s.perfil }, prefs: { ...e.prefs, ...s.prefs } };
}

const DIA_IDX = { domingo: 0, segunda: 1, 'terça': 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, 'sábado': 6, sabado: 6 };

/** Converte o objeto do SOUZA EVOLUTION / NEXFIT v1 para o v3 sem perder registros. */
export function migrateV2(old) {
  const s = emptyState();
  const custom = old.customPlans || {};
  const records = old.records || {};
  const lastKg = name => {
    const keys = Object.keys(records).sort().reverse();
    for (const k of keys) {
      const r = records[k]; if ((r.exerciseName || '') !== name) continue;
      const sets = (r.sets || []).filter(x => x.kg !== '' && x.kg != null);
      if (sets.length) return parseNum(sets.at(-1).kg);
      if (r.kg) return parseNum(r.kg);
    }
    return null;
  };
  const hasActivity = Object.keys(records).length || (old.weights || []).length || Object.keys(old.sessions || {}).length || Object.keys(custom).length;

  // Fichas: só traz as fichas antigas se a pessoa já usava o app
  const planName = {};
  if (hasActivity) {
    for (const p of LEGACY_PLANS) {
      const c = custom[p.id];
      const exs = (c?.ex || p.ex).map(e => {
        const pr = parsePrescription(e[1]);
        return { id: uid(), exId: null, nome: e[0], series: pr.series, reps: pr.reps, carga: lastKg(e[0]), descanso: 90, obs: e[3] || '' };
      });
      planName[p.id] = (c?.ex || p.ex).map(e => e[0]);
      s.treinos.push({ id: 'legado-' + p.id, nome: `Treino ${p.id} · ${c?.name || p.name}`, dias: [DIA_IDX[(p.day || '').toLowerCase()] ?? 1], exs });
    }
  }

  // Registros → sessões
  const byDay = {};
  for (const [key, r] of Object.entries(records)) {
    const m = key.match(/^(\d{4}-\d{2}-\d{2})-([A-E])-(\d+)$/); if (!m) continue;
    const [, date, dia, idx] = m;
    const nome = r.exerciseName || planName[dia]?.[+idx] || 'Exercício';
    const sk = date + '-' + dia;
    byDay[sk] ??= { date, dia, sets: [] };
    const sets = Array.isArray(r.sets) ? r.sets : [];
    sets.forEach((x, n) => {
      const kg = x.kg !== '' && x.kg != null ? parseNum(x.kg) : (x.side != null ? Number(r.bar ?? 20) + 2 * Number(x.side || 0) : null);
      const reps = parseNum(x.reps);
      if (x.done || kg || reps) byDay[sk].sets.push({ i: +idx, nome, n: n + 1, kg: kg || 0, reps: reps || 0, tipo: x.type || '', t: r.completedAt || date + 'T12:00:00' });
    });
    if (!sets.length && (r.kg || r.reps)) byDay[sk].sets.push({ i: +idx, nome, n: 1, kg: parseNum(r.kg) || 0, reps: parseNum(r.reps) || 0, t: date + 'T12:00:00' });
  }
  for (const [sk, d] of Object.entries(byDay)) {
    if (!d.sets.length) continue;
    const ses = old.sessions?.[sk] || {};
    s.sessoes.push({
      id: 'legado-' + sk, treinoId: 'legado-' + d.dia, nome: s.treinos.find(t => t.id === 'legado-' + d.dia)?.nome || 'Treino ' + d.dia,
      data: d.date, inicio: ses.startedAt || d.date + 'T12:00:00', fim: ses.finishedAt || ses.startedAt || d.date + 'T13:00:00',
      sets: d.sets, sentiu: ses.score >= 5 ? 'dor' : null, cardio: ses.minutes ? { tipo: ses.type, min: ses.minutes } : null
    });
  }
  s.sessoes.sort((a, b) => a.data.localeCompare(b.data));
  s.pesos = (old.weights || []).map(w => ({ date: w.date, kg: Number(w.kg) })).filter(w => w.date && w.kg);
  s.fotos = (old.photos || []).map(p => ({ id: p.id || uid(), date: p.date, pose: p.pose || '', data: p.data }));
  s.dores = old.pain || [];
  s.prefs.boasVindas = !!hasActivity;
  const { photos, ...resto } = old;
  s.legado = resto;
  return s;
}

// ---------- estado vivo ----------
function load() {
  const cur = read(KEY);
  if (cur) return normalize(cur);
  const old = read(LEGACY_KEY);
  const s = old ? migrateV2(old) : emptyState();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
}

export let state = load();

export function save(reason = 'edit') {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) {
    listeners.forEach(fn => fn('cheio'));
    return false;
  }
  listeners.forEach(fn => fn(reason));
  return true;
}

/** Substitui o estado inteiro (nuvem/backup). */
export function replaceState(next, reason = 'replace') {
  const fotos = state.fotos;
  state = normalize(next);
  if (reason !== 'apagar' && !state.fotos?.length && fotos?.length) state.fotos = fotos;   // fotos ficam no aparelho
  return save(reason);
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---------- consultas ----------
export const treino = id => state.treinos.find(t => t.id === id);
export const sessao = id => state.sessoes.find(s => s.id === id);
export const sessoesFeitas = () => state.sessoes.filter(s => s.fim);
export const comidaDia = (d = today()) => state.comida[d] || [];
