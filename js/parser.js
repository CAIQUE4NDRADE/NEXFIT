// =====================================================================
// Lê o treino que o personal mandou (WhatsApp, papel digitado, PDF copiado)
// e transforma em fichas. Exemplos que ele entende:
//   "TREINO A - Peito"        "Segunda: pernas"      "*Treino B*"
//   "1. Supino reto 4x10"     "Puxada alta 3x 10-12 (40kg)"
//   "Leg 45 4 séries de 12"   "Tríceps corda 3x15 desc 45s"   "Prancha 3x 30s"
// =====================================================================
import { matchEx } from './lib.js';
import { norm, clamp } from './util.js';

const DIAS = [['domingo', 0], ['segunda', 1], ['terca', 2], ['terça', 2], ['quarta', 3], ['quinta', 4], ['sexta', 5], ['sabado', 6], ['sábado', 6], ['seg', 1], ['ter', 2], ['qua', 3], ['qui', 4], ['sex', 5], ['sab', 6], ['dom', 0]];
const RE_EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu;
const RE_SETS = /(\d{1,2})\s*(?:[x×*]|s[eé]ries?\s*(?:de|x)?|vezes\s*de)\s*(\d{1,3}(?:\s*(?:a|-|–|\/|ou)\s*\d{1,3})*\s*(?:s(?:eg(?:undos)?)?\b|"|rep\w*)?|(?:at[eé]\s*(?:a\s*)?)?falha|m[aá]x(?:imo)?)/i;
const RE_KG = /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg|quilos?|kilos?)\b/i;
const RE_DESC = /(?:desc(?:anso)?|intervalo|pausa)\s*[:=]?\s*(\d{1,3})\s*(min(?:utos?)?|m\b|'|s(?:eg(?:undos)?)?|")?(?:\s*(\d{1,2})\s*(?:s|seg|")?)?/i;
const RE_CARDIO = /\b(bicicleta|bike|esteira|caminhada|el[ií]ptico|transport\w*|corrida|escada|remo erg\w*|spinning)\b/i;
const RE_HEADER = /^(?:treino|ficha|dia|divis[aã]o|semana)\b\s*[:\-–.]?\s*([a-z0-9]{1,2})?\b/i;

function limpar(l) {
  return l.replace(RE_EMOJI, ' ').replace(/[*_~`]/g, ' ').replace(/ /g, ' ')
    .replace(/^\s*(?:[-•·▪●○■□>]+|\d{1,2}\s*[.)ºª°\-–]\s+|\d{1,2}\s*[.)]\s*(?=[a-zà-ú]))/i, '')
    .replace(/\s+/g, ' ').trim();
}
function diasDe(txt) {
  const n = norm(txt), out = new Set();
  for (const [d, i] of DIAS) if (new RegExp(`(^|[^a-z])${norm(d)}(-feira)?([^a-z]|$)`).test(n)) out.add(i);
  return [...out];
}
function segundos(m) {
  if (!m) return null;
  const v = parseInt(m[1], 10), u = (m[2] || '').toLowerCase();
  if (u.startsWith('m') || u === "'") return clamp(v * 60 + (parseInt(m[3] || '0', 10)), 10, 600);
  return clamp(v, 10, 600);
}

export function parseTreino(texto) {
  const linhas = String(texto || '').split(/\r?\n/);
  const treinos = []; const ignoradas = [];
  let cur = null, descGeral = null;
  const novo = (nome, dias = []) => { cur = { nome: nome || `Treino ${String.fromCharCode(65 + treinos.length)}`, dias, descanso: null, exs: [] }; treinos.push(cur); return cur; };

  for (const bruta of linhas) {
    const l = limpar(bruta);
    if (!l || l.length < 2) continue;
    const nl = norm(l);
    // linha só de descanso geral: "Descanso: 60 segundos entre as séries"
    if (/^(desc|intervalo|pausa)/.test(nl) && !RE_SETS.test(l)) { const s = segundos(l.match(RE_DESC)); if (s) { if (cur) cur.descanso = s; else descGeral = s; } continue; }
    if (/^(obs|observa|nota|aquecimento:)/.test(nl)) { if (cur?.exs.length) cur.exs.at(-1).obs = (cur.exs.at(-1).obs ? cur.exs.at(-1).obs + ' ' : '') + l.replace(/^[^:]*:\s*/, ''); continue; }

    // cardio: "bicicleta 10 minutos", "esteira 15 min"
    const mc = l.match(RE_CARDIO);
    if (mc && !RE_SETS.test(l)) {
      if (!cur) novo('Treino A');
      const min = (l.match(/(\d{1,3})\s*(?:min|minutos|')/i) || [])[1];
      cur.exs.push({ nome: capital(mc[0].toLowerCase()), exId: null, tipo: 'cardio', original: l, achado: 1, series: 1, reps: min ? `${min} min` : '10 min', carga: null, descanso: null, obs: '' });
      continue;
    }
    const temSets = RE_SETS.test(l);
    const dias = diasDe(l);
    const pareceTitulo = RE_HEADER.test(l) || /^[a-e]\s*[):\-–]/i.test(l) || (dias.length && l.length < 60 && !temSets)
      || (!temSets && /:$/.test(l)) || (!temSets && l === l.toUpperCase() && /[A-Z]/.test(l) && !matchEx(l));
    if (pareceTitulo && !temSets) {
      let nome = l.replace(/:$/, '').replace(/\s*[-–]\s*$/, '')
        .replace(/\(([^)]*)\)/g, (m0, g) => diasDe(g).length ? ' ' : m0).replace(/\s+/g, ' ').trim()
        .replace(/^(treino|ficha)\s+([a-z0-9]{1,2})\s*[-–:]\s*/i, (m0, a, b) => `${a} ${b.toUpperCase()} · `)
        .replace(/^(treino|ficha|dia)\b/i, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      const m = nome.match(RE_HEADER);
      if (m && m[1] && /^[a-z]$/i.test(m[1]) && nome.length <= 12) nome = `Treino ${m[1].toUpperCase()}`;
      nome = nome.charAt(0).toUpperCase() + nome.slice(1);
      if (nome === nome.toUpperCase()) nome = nome.toLowerCase().replace(/(^|\s|[-–:])\S/g, s => s.toUpperCase()).replace(/\bE\b/g, 'e');
      novo(nome, dias);
      continue;
    }

    // ----- linha de exercício -----
    let resto = l, series = 3, reps = '10–12', carga = null, descanso = null, obs = '';
    const ms = l.match(RE_SETS);
    if (ms) {
      series = clamp(parseInt(ms[1], 10), 1, 20);
      let r = ms[2].trim();
      if (/falha|m[aá]x/i.test(r)) r = 'até a falha';
      else if (/s(eg|egundos)?\b|"/i.test(r)) r = r.replace(/\s*(seg(undos)?|s|")\s*$/i, '') + ' s';
      else r = r.replace(/\s*rep\w*/i, '').replace(/\s*(a|ou|-)\s*/g, '–').replace(/\s+/g, '');
      reps = r; resto = resto.replace(ms[0], ' ');
    }
    const md = resto.match(RE_DESC); if (md) { descanso = segundos(md); resto = resto.replace(md[0], ' '); }
    const mk = resto.match(RE_KG); if (mk) { carga = parseFloat(mk[1].replace(',', '.')); resto = resto.replace(mk[0], ' '); }
    const par = resto.match(/\(([^)]*)\)/g);
    if (par) { obs = par.map(p => p.slice(1, -1).trim()).filter(Boolean).join(' · '); resto = resto.replace(/\([^)]*\)/g, ' '); }
    const traco = resto.split(/\s[-–|]\s|;/);
    let nomeTxt = traco[0]; if (traco.length > 1) obs = [obs, ...traco.slice(1)].filter(x => x.trim()).join(' · ');
    nomeTxt = nomeTxt.replace(/\b(cada (lado|perna|bra[cç]o))\b/i, m => { obs = [obs, m].filter(Boolean).join(' · '); return ' '; })
      .replace(/[,:;.]+\s*$/, '').replace(/^\W+/, '').replace(/\s+/g, ' ').trim();
    if (!nomeTxt || nomeTxt.length < 3 || /^\d+$/.test(nomeTxt)) { ignoradas.push(l); continue; }
    const m = matchEx(nomeTxt);
    if (!ms && !m) { ignoradas.push(l); continue; }      // sem séries e sem exercício conhecido: provavelmente não é exercício
    if (!cur) novo('Treino A');
    cur.exs.push({
      nome: m && m.score >= .6 ? m.ex.nome : capital(nomeTxt), exId: m && m.score >= .6 ? m.ex.id : null,
      original: l, achado: m ? m.score : 0, series, reps, carga, descanso, obs: obs.trim()
    });
  }
  const validos = treinos.filter(t => t.exs.length);
  validos.forEach(t => { t.descanso ??= descGeral; t.exs.forEach(e => { e.descanso ??= t.descanso ?? null; }); });
  return { treinos: validos, ignoradas };
}
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

export const EXEMPLO = `TREINO A - Peito e tríceps (segunda)
1. Supino reto 4x10-12
2. Supino inclinado com halteres 3x12
3. Crucifixo 3x12 (20kg)
4. Tríceps pulley 3x15 desc 45s
5. Tríceps testa 3 séries de 12

TREINO B - Costas e bíceps (quarta)
Puxada alta 4x10
Remada baixa 4x10 - segurar 1s embaixo
Rosca direta 3x12
Prancha 3x 30s

Descanso: 60 segundos`;
