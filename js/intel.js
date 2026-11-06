// =====================================================================
// NEXFIT · inteligência por regras (sem IA, sem internet, sem custo)
// 1) progressão de carga  2) resumo semanal  3) frases de evolução
// Regras de ouro: o app SUGERE, nunca muda carga sozinho; só fala do que
// tem dado; nunca diagnostica nem promete ganho de músculo.
// =====================================================================
import { state } from './store.js';
import { findEx } from './lib.js';
import { norm, today, addDays, weekday, fmt, fmtDate } from './util.js';
import { volumeSessao, sequencia } from './stats.js';

// ---------------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------------
/** "8–12" → {min:8,max:12} · "12" → {12,12} · "até a falha" → {falha} · "30 s" → {tempo} */
export function metaReps(reps) {
  const s = String(reps || '');
  if (/falha|m[aá]x/i.test(s)) return { tipo: 'falha' };
  if (/\d\s*(s|seg)/i.test(s) || /min/i.test(s)) return { tipo: 'tempo' };
  const n = (s.match(/\d+/g) || []).map(Number);
  if (!n.length) return { tipo: 'faixa', min: 8, max: 12 };
  return { tipo: 'faixa', min: Math.min(...n), max: Math.max(...n) };
}

/** Sessões anteriores (mais recente primeiro) que tiveram o exercício. */
function historico(nome, exceto) {
  const n = norm(nome), out = [];
  for (let i = state.sessoes.length - 1; i >= 0; i--) {
    const s = state.sessoes[i];
    if (s.id === exceto) continue;
    const sets = s.sets.filter(x => norm(x.nome) === n).sort((a, b) => a.n - b.n);
    if (sets.length) out.push({ s, sets, kg: Math.max(...sets.map(x => Number(x.kg) || 0)), reps: sets.map(x => Number(x.reps) || 0) });
  }
  return out.sort((a, b) => (b.s.data + (b.s.inicio || '')).localeCompare(a.s.data + (a.s.inicio || '')));   // mais recente primeiro, pela data
}

/** Quanto subir, conforme o equipamento e a carga atual. */
export function incremento(nome, kg) {
  const eq = norm((findEx(nome)?.equip || '') + ' ' + nome);
  if (/halter/.test(eq)) return kg < 10 ? 1 : 2;
  if (/leg|smith|barra|anilha/.test(eq)) return kg >= 60 ? 5 : 2.5;
  return kg >= 50 ? 5 : 2.5;                       // máquinas e polias
}

// ---------------------------------------------------------------------
// 1) PROGRESSÃO DE CARGA
// ---------------------------------------------------------------------
/**
 * @returns {{tipo, titulo, texto, ultima?, sugestao?}}
 * tipo: novo | dor | subir | manter | abaixo | abaixo2 | queda | recorde | perto
 */
export function progressao(e, sessaoAtual) {
  if (!e || e.tipo === 'cardio') return null;
  const h = historico(e.nome, sessaoAtual);
  const meta = metaReps(e.reps);
  if (!h.length) return { tipo: 'novo', titulo: 'Primeira vez neste exercício', texto: 'Comece leve, aprenda o movimento e anote como foi.' };
  const ult = h[0];
  const linha = `${fmt(ult.kg)} kg × ${ult.reps.join(' · ')}`;
  const base = { ultima: { data: ult.s.data, linha, kg: ult.kg } };

  if (ult.s.sentiu === 'dor') return { ...base, tipo: 'dor', titulo: 'Da última vez você sentiu dor', texto: 'Vá com cuidado e mantenha a carga. Se doer de novo, pare e fale com seu personal.' };

  // exercícios até a falha / por tempo: compara com o seu melhor
  if (meta.tipo !== 'faixa') {
    const melhor = Math.max(...h.map(x => Math.max(...x.reps)));
    const atual = Math.max(...ult.reps);
    const un = meta.tipo === 'tempo' ? 's' : ' repetições';
    return atual >= melhor
      ? { ...base, tipo: 'recorde', titulo: 'Você está no seu melhor', texto: `Seu recorde é ${melhor}${un}. Tente superar hoje!` }
      : { ...base, tipo: 'perto', titulo: 'Perto do seu melhor', texto: `Recorde: ${melhor}${un}. Da última vez: ${atual}${un}.` };
  }

  // queda: volume caindo por 3 treinos seguidos com a mesma carga ou maior
  if (h.length >= 3) {
    const v = h.slice(0, 3).map(x => x.sets.reduce((a, s) => a + (Number(s.kg) || 0) * (Number(s.reps) || 0), 0) || x.reps.reduce((a, r) => a + r, 0));
    if (v[0] < v[1] && v[1] < v[2] && h[0].kg >= h[2].kg) {
      return { ...base, tipo: 'queda', titulo: 'Seu rendimento caiu nos últimos treinos', texto: 'Mantenha a carga. Durma bem, beba água e coma direito. Se continuar, converse com seu personal.' };
    }
  }

  const completas = ult.reps.length >= (e.series || ult.reps.length);
  const noTopo = completas && ult.reps.every(r => r >= meta.max);
  const abaixo = ult.reps.filter(r => r < meta.min).length > ult.reps.length / 2;
  const abaixoAntes = h[1] && h[1].reps.filter(r => r < meta.min).length > h[1].reps.length / 2 && h[1].kg >= ult.kg;

  if (noTopo) {
    if (!ult.kg) return { ...base, tipo: 'subir', titulo: 'Pode evoluir!', texto: 'Você bateu a meta em todas as séries. Tente mais repetições ou uma versão mais difícil, se o personal liberar.' };
    const novo = Math.round((ult.kg + incremento(e.nome, ult.kg)) * 2) / 2;
    return { ...base, tipo: 'subir', titulo: 'Pode subir!', texto: `Você fez ${meta.max} repetições em todas as séries. Se a execução estiver boa, teste ${fmt(novo)} kg.`, sugestao: novo };
  }
  if (abaixo && abaixoAntes) return { ...base, tipo: 'abaixo2', titulo: 'A carga pode estar alta', texto: `Dois treinos seguidos abaixo de ${meta.min} repetições. Converse com seu personal sobre baixar um pouco.` };
  if (abaixo) return { ...base, tipo: 'abaixo', titulo: 'Mantenha a carga', texto: `Da última vez ficou abaixo de ${meta.min} repetições. Mantenha ${fmt(ult.kg)} kg e capriche na execução.` };
  return { ...base, tipo: 'manter', titulo: 'Mantenha e busque mais repetições', texto: `Continue com ${fmt(ult.kg)} kg e tente chegar a ${meta.max} repetições em todas as séries.` };
}

// ---------------------------------------------------------------------
// 2) RESUMO SEMANAL (segunda a domingo)
// ---------------------------------------------------------------------
export const inicioSemana = (d = today()) => addDays(d, -((weekday(d) + 6) % 7));

/** Qual semana mostrar no Hoje: domingo → a atual; segunda/terça → a que acabou. Outros dias: nenhuma. */
export function semanaParaMostrar(d = today()) {
  const wd = weekday(d);
  if (wd === 0) return inicioSemana(d);
  if (wd === 1 || wd === 2) return addDays(inicioSemana(d), -7);
  return null;
}

export function metaSemanal() {
  return new Set(state.treinos.flatMap(t => t.dias || [])).size || Math.min(5, Math.max(3, state.treinos.length || 3));
}

function maxKgAntes(nome, ate) {
  const n = norm(nome); let m = 0;
  for (const s of state.sessoes) if (s.data < ate) for (const x of s.sets) if (norm(x.nome) === n) m = Math.max(m, Number(x.kg) || 0);
  return m;
}

export function resumoSemana(ini) {
  const fim = addDays(ini, 6), p = state.perfil;
  const dentro = d => d >= ini && d <= fim;
  const ss = state.sessoes.filter(s => s.sets.length && dentro(s.data));
  const ssAnt = state.sessoes.filter(s => s.sets.length && s.data >= addDays(ini, -7) && s.data < ini);
  const dias = new Set(ss.map(s => s.data)).size, meta = metaSemanal();
  const vol = ss.reduce((a, s) => a + volumeSessao(s), 0), volAnt = ssAnt.reduce((a, s) => a + volumeSessao(s), 0);
  const volPct = volAnt ? Math.round((vol - volAnt) / volAnt * 100) : null;

  // cargas que subiram (comparado com tudo o que veio antes da semana)
  const subiu = [];
  const nomes = [...new Set(ss.flatMap(s => s.sets.map(x => x.nome)))];
  for (const nome of nomes) {
    const antes = maxKgAntes(nome, ini);
    const agora = Math.max(...ss.flatMap(s => s.sets.filter(x => norm(x.nome) === norm(nome)).map(x => Number(x.kg) || 0)));
    if (antes > 0 && agora > antes) subiu.push({ nome, de: antes, para: agora });
  }
  subiu.sort((a, b) => (b.para - b.de) / b.de - (a.para - a.de) / a.de);

  // comida e água (só se anotou)
  const diasComida = Object.keys(state.comida).filter(d => dentro(d) && state.comida[d].length);
  const protDia = d => state.comida[d].reduce((a, x) => a + (x.p || 0), 0);
  const protBaixa = p.metaProt ? diasComida.filter(d => protDia(d) < p.metaProt * .9) : [];
  const protOk = p.metaProt && diasComida.length ? Math.round((diasComida.length - protBaixa.length) / diasComida.length * 100) : null;
  const metaAgua = p.metaAgua || 2000;
  const diasAgua = Object.keys(state.agua).filter(d => dentro(d) && state.agua[d] >= metaAgua).length;

  // peso
  const ps = [...state.pesos].sort((a, b) => a.date.localeCompare(b.date));
  const pFim = [...ps].reverse().find(x => dentro(x.date)), pIni = [...ps].reverse().find(x => x.date < ini);
  const pesoDelta = pFim && pIni ? +(pFim.kg - pIni.kg).toFixed(1) : null;

  const nivel = dias >= meta ? 'otima' : dias >= Math.ceil(meta * .6) ? 'boa' : dias > 0 ? 'fraca' : 'parada';
  const titulo = { otima: 'Semana excelente!', boa: 'Boa semana!', fraca: 'Semana mais fraca', parada: 'Semana sem treino' }[nivel];

  const destaques = [];
  if (subiu.length) destaques.push({ ic: 'trophy', t: `Você subiu a carga ${subiu.length > 1 ? `em ${subiu.length} exercícios` : 'no ' + subiu[0].nome}` + (subiu.length === 1 ? ` (${fmt(subiu[0].de)} → ${fmt(subiu[0].para)} kg)` : `, como ${subiu[0].nome} (${fmt(subiu[0].de)} → ${fmt(subiu[0].para)} kg)`) });
  const seq = sequencia();
  if (seq >= 3 && fim >= addDays(today(), -1)) destaques.push({ ic: 'flame', t: `Sequência de ${seq} dias ativos` });
  if (volPct != null && volPct >= 5) destaques.push({ ic: 'trending-up', t: `Você levantou ${volPct}% a mais que na semana anterior` });
  if (protBaixa.length >= 2) destaques.push({ ic: 'triangle-alert', t: `Proteína abaixo da meta em ${protBaixa.length} ${protBaixa.length === 7 ? 'dias (todos)' : 'dias'}${protBaixa.length <= 3 ? ` (${[...protBaixa].sort().map(d => fmtDate(d, { weekday: 'long' })).join(', ')})` : ''}`, atencao: true });
  if (pesoDelta != null && pesoDelta !== 0) destaques.push({ ic: 'scale', t: `Peso ${pesoDelta > 0 ? 'subiu' : 'desceu'} ${fmt(Math.abs(pesoDelta))} kg (${fmt(pIni.kg)} → ${fmt(pFim.kg)} kg)` });
  if (!destaques.length && dias) destaques.push({ ic: 'check', t: `Você treinou ${dias} ${dias === 1 ? 'dia' : 'dias'} nesta semana` });

  // foco da próxima semana: a primeira regra que se aplica
  let foco;
  if (!dias) foco = 'Recomeçar: escolha 2 dias da semana e faça o treino, mesmo que mais leve.';
  else if (dias < meta) foco = `Chegar a ${meta} treinos na semana. Deixe a bolsa pronta na véspera.`;
  else if (protBaixa.length >= 3) foco = 'Manter os treinos e caprichar na proteína (carne, frango, ovo, peixe, feijão).';
  else if (diasComida.length && diasAgua < 3) foco = 'Manter os treinos e beber mais água ao longo do dia.';
  else if (!subiu.length) foco = 'Continue assim e tente subir a carga em um exercício.';
  else foco = 'Continue assim! Mantenha a frequência e a boa execução.';

  return { ini, fim, dias, meta, vol, volPct, subiu, diasComida: diasComida.length, protOk, diasAgua, pesoDelta, nivel, titulo, destaques, foco, temDados: dias > 0 || diasComida.length > 0 || pFim };
}

export function textoWhatsApp(r) {
  const l = [`*Minha semana no NEXFIT* (${fmtDate(r.ini, { day: '2-digit', month: '2-digit' })} a ${fmtDate(r.fim, { day: '2-digit', month: '2-digit' })})`, `${r.nivel === 'otima' || r.nivel === 'boa' ? '🟢' : '🟡'} ${r.titulo}`, '',
    `💪 ${r.dias} de ${r.meta} treinos`];
  if (r.volPct != null) l.push(`📈 ${r.volPct >= 0 ? '+' : ''}${r.volPct}% de peso levantado`);
  r.subiu.slice(0, 3).forEach(s => l.push(`🏆 ${s.nome}: ${fmt(s.de)} → ${fmt(s.para)} kg`));
  l.push('', 'https://caique4ndrade.github.io/NEXFIT/');
  return l.join('\n');
}

// ---------------------------------------------------------------------
// 3) FRASES DE EVOLUÇÃO (últimas ~4 semanas)
// ---------------------------------------------------------------------
export function frasesEvolucao() {
  const t = today(), ini = addDays(t, -28), out = [];
  const ss = state.sessoes.filter(s => s.sets.length && s.data >= ini);
  const p = state.perfil;

  if (!state.sessoes.some(s => s.sets.length)) {
    return [{ ic: 'info', tom: 'info', titulo: 'Ainda não há dados suficientes', texto: 'Faça alguns treinos e anote o peso uma vez por semana. Depois de 2 semanas eu começo a analisar sua evolução.' }];
  }

  // força: compara a primeira e a última carga de cada exercício no período
  const evo = [];
  for (const nome of [...new Set(ss.flatMap(s => s.sets.map(x => x.nome)))]) {
    const n = norm(nome);
    const serie = state.sessoes.filter(s => s.data >= addDays(ini, -7)).map(s => ({ d: s.data, kg: Math.max(0, ...s.sets.filter(x => norm(x.nome) === n).map(x => Number(x.kg) || 0)) })).filter(x => x.kg > 0).sort((a, b) => a.d.localeCompare(b.d));
    if (serie.length >= 2 && serie.at(-1).d > serie[0].d) evo.push({ nome, de: serie[0].kg, para: serie.at(-1).kg, pct: (serie.at(-1).kg - serie[0].kg) / serie[0].kg * 100, dias: (new Date(serie.at(-1).d) - new Date(serie[0].d)) / 864e5 });
  }
  const subindo = evo.filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct), caindo = evo.filter(x => x.pct < -5);
  const semanas = Math.max(1, Math.round(Math.max(0, ...evo.map(x => x.dias)) / 7));
  let forca = null;
  if (subindo.length) {
    const [a, b] = subindo;
    forca = 'sobe';
    out.push({ ic: 'dumbbell', tom: 'bom', titulo: 'Sua força está subindo', texto: `Em ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}, ${a.nome} foi de ${fmt(a.de)} para ${fmt(a.para)} kg (+${Math.round(a.pct)}%)${b ? ` e ${b.nome} de ${fmt(b.de)} para ${fmt(b.para)} kg` : ''}.` });
  } else if (caindo.length > evo.length / 2 && evo.length) {
    forca = 'cai';
    out.push({ ic: 'dumbbell', tom: 'atencao', titulo: 'Cargas um pouco abaixo', texto: 'Suas cargas caíram em relação ao começo do mês. Pode ser cansaço, sono ou alimentação. Se continuar, converse com seu personal.' });
  } else if (evo.length) {
    forca = 'estavel';
    out.push({ ic: 'dumbbell', tom: 'info', titulo: 'Cargas estáveis', texto: 'Você manteve as cargas. Quando bater o máximo de repetições em todas as séries, o app vai sugerir subir.' });
  }

  // peso (só se tem 2 pesagens no período)
  const ps = state.pesos.filter(x => x.date >= addDays(ini, -7)).sort((a, b) => a.date.localeCompare(b.date));
  if (ps.length >= 2) {
    const d = +(ps.at(-1).kg - ps[0].kg).toFixed(1), meta = p.pesoMeta;
    const rumo = meta ? (Math.abs(ps.at(-1).kg - meta) < Math.abs(ps[0].kg - meta) ? 'na direção da sua meta' : 'na direção contrária à sua meta') : '';
    if (Math.abs(d) < .3) out.push({ ic: 'scale', tom: 'info', titulo: 'Peso estável', texto: `Seu peso ficou em torno de ${fmt(ps.at(-1).kg)} kg.${meta ? ` Sua meta é ${fmt(meta)} kg.` : ''}` });
    else out.push({ ic: 'scale', tom: meta ? (rumo.startsWith('na direção da') ? 'bom' : 'atencao') : 'info',
      titulo: `Seu peso ${d > 0 ? 'subiu' : 'desceu'} ${fmt(Math.abs(d))} kg`,
      texto: `${fmt(ps[0].kg)} → ${fmt(ps.at(-1).kg)} kg${rumo ? `, ${rumo}` : ''}.${d > 0 && forca === 'sobe' ? ' Junto com o aumento de força é um bom sinal, mas só o peso não mostra se é músculo: fotos e medidas ajudam a ver melhor.' : ''}` });
  } else out.push({ ic: 'scale', tom: 'info', titulo: 'Anote seu peso', texto: 'Pese-se uma vez por semana, de manhã, para eu conseguir analisar a evolução do seu corpo.' });

  // constância
  const diasTreino = new Set(ss.map(s => s.data)).size, media = +(diasTreino / 4).toFixed(1), meta = metaSemanal();
  out.push(media >= meta * .8
    ? { ic: 'calendar', tom: 'bom', titulo: 'Muito constante', texto: `Média de ${fmt(media)} treinos por semana nas últimas 4 semanas.` }
    : { ic: 'calendar', tom: 'atencao', titulo: 'Dá para treinar mais vezes', texto: `Média de ${fmt(media)} treinos por semana. Sua meta é ${meta}. Constância é o que mais traz resultado.` });

  // proteína (só se tem meta e anotou comida)
  if (p.metaProt) {
    const dias = Object.keys(state.comida).filter(d => d >= ini && state.comida[d].length);
    if (dias.length >= 4) {
      const baixos = dias.filter(d => state.comida[d].reduce((a, x) => a + (x.p || 0), 0) < p.metaProt * .9).length;
      const porSemana = Math.round(baixos / 4);
      if (porSemana >= 2) out.push({ ic: 'utensils', tom: 'atencao', titulo: 'Ponto de atenção: proteína', texto: `A proteína ficou abaixo da meta em cerca de ${porSemana} dias por semana.` });
      else out.push({ ic: 'utensils', tom: 'bom', titulo: 'Proteína em dia', texto: 'Você bateu a meta de proteína na maioria dos dias anotados.' });
    }
  }

  // cintura (medidas)
  const ms = state.medidas.filter(m => m.cintura != null).sort((a, b) => a.date.localeCompare(b.date));
  if (ms.length >= 2 && ms.at(-1).date >= addDays(t, -60)) {
    const d = +(ms.at(-1).cintura - ms[0].cintura).toFixed(1);
    if (d) out.push({ ic: 'ruler', tom: d < 0 ? 'bom' : 'info', titulo: `Cintura ${d < 0 ? 'diminuiu' : 'aumentou'} ${fmt(Math.abs(d))} cm`, texto: `De ${fmt(ms[0].cintura)} para ${fmt(ms.at(-1).cintura)} cm desde ${fmtDate(ms[0].date)}.` });
  }
  return out.slice(0, 5);
}
