// EVOLUÇÃO — resumo, peso, cargas e recordes, medidas, fotos, calendário
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import { act, btn, card, cardHead, seg, empty, openSheet, closeSheet, sheetHead, toast, confirmar, notice } from '../ui.js';
import { esc, fmt, fmtInt, fmtDate, today, addDays, parseNum, uid, DIAS_CURTO, weekday, relDay, fmtDuration } from '../util.js';
import { lineChart, barChart } from '../charts.js';
import { recordes, historicoCarga, exerciciosFeitos, treinosPorSemana, comparar, volumeSessao, duracaoSessao, pesoAtual, resumoMes, melhorSequencia, sequencia, MARCOS } from '../stats.js';
import { refresh } from '../app.js';
import { abrirPeso } from './hoje.js';
import { resumoSemana, inicioSemana, frasesEvolucao } from '../intel.js';
import { semanaCard } from './semana.js';

let aba = 'resumo', exSel = null, mesRef = today().slice(0, 7), periodo = 30;
const ABAS = [['resumo', 'Resumo'], ['semanas', 'Semanas'], ['calendario', 'Calendário'], ['cargas', 'Cargas'], ['peso', 'Peso'], ['medidas', 'Medidas'], ['fotos', 'Fotos']];
const delta = (a, b, un = '', inv = false) => {
  if (a == null || b == null) return '<span class="muted small">sem dados para comparar</span>';
  const d = a - b; if (!d) return '<span class="chip">igual</span>';
  const bom = inv ? d < 0 : d > 0;
  return `<span class="chip ${bom ? 'chip-ok' : 'chip-warn'}">${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}${un}</span>`;
};

function destaqueMes() {
  const m = resumoMes(), a = m.atual, b = m.anterior;
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const pct = b.volume ? Math.round((a.volume - b.volume) / b.volume * 100) : null;
  const frase = !a.dias ? 'Seu primeiro treino do mês está esperando por você.'
    : pct == null ? `Você já treinou ${a.dias} ${a.dias === 1 ? 'dia' : 'dias'} este mês. Continue assim!`
    : pct >= 0 ? `Você levantou <b>${pct}% a mais</b> que no mesmo período do mês passado.` : `Até agora, ${Math.abs(pct)}% abaixo do mesmo período do mês passado. Ainda dá tempo!`;
  return card(`<span class="eyebrow">${icon('sparkles')} Seu ${mes}</span>
    <p class="feature-title">${frase}</p>
    <div class="hero-stats"><div><b class="num">${a.dias}</b><span>dias treinados</span></div><div><b class="num">${fmtInt(a.volume)}</b><span>kg levantados</span></div><div><b class="num">${m.prsMes}</b><span>recordes novos</span></div></div>`, 'hero hero-xl stack');
}
function conquistas() {
  const best = melhorSequencia(), atual = sequencia();
  return card(`${cardHead('Conquistas', 'trophy', `<span class="chip">${icon('flame')} recorde: ${best} ${best === 1 ? 'dia' : 'dias'}</span>`)}
    <div class="badges">${MARCOS.map(n => `<div class="badge ${best >= n ? 'on' : ''}" aria-label="${n} dias seguidos ${best >= n ? 'conquistado' : 'bloqueado'}"><span class="badge-ic">${icon(best >= n ? 'flame' : 'circle-help')}</span><b class="num">${n}</b><small>dias</small></div>`).join('')}</div>
    <p class="small muted" style="margin-top:10px">Sequência atual: <b>${atual} ${atual === 1 ? 'dia ativo' : 'dias ativos'}</b>. Dia ativo = treinou, anotou comida ou bebeu água.</p>`);
}
function resumo() {
  const sem = treinosPorSemana(8), cmp = comparar(periodo), prs = recordes().sort((a, b) => b.data.localeCompare(a.data));
  const semana = addDays(today(), -7);
  return `${destaqueMes()}
  ${analise()}
  <div class="grid-2">
  ${card(`${cardHead('Frequência', 'calendar')}${barChart(sem.map(w => ({ label: fmtDate(w.ini, { day: '2-digit', month: '2-digit' }), y: w.qtd })), { title: 'Dias treinados por semana', max: 7 })}<p class="small muted">Dias treinados em cada semana (últimas 8).</p>`)}
  ${conquistas()}
  </div>
  ${card(`${cardHead('Comparação', 'trending-up')}${seg('ev-per', [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias']], String(periodo))}
    <div class="cmp" style="margin-top:8px">
      <div class="cmp-row"><span>Dias treinados</span><b class="num">${cmp.atual.treinos}</b>${delta(cmp.atual.treinos, cmp.anterior.treinos)}</div>
      <div class="cmp-row"><span>Peso levantado (volume)</span><b class="num">${fmtInt(cmp.atual.volume)} kg</b>${delta(cmp.atual.volume, cmp.anterior.volume, ' kg')}</div>
      <div class="cmp-row"><span>Peso corporal</span><b class="num">${cmp.atual.peso != null ? fmt(cmp.atual.peso) + ' kg' : '—'}</b>${delta(cmp.atual.peso, cmp.anterior.peso, ' kg', !!state.perfil.pesoMeta && state.perfil.pesoMeta < (cmp.atual.peso || 0))}</div>
    </div><p class="small muted">Últimos ${periodo} dias comparados com os ${periodo} dias anteriores.</p>`)}
  ${card(`${cardHead('Recordes pessoais', 'trophy')}${prs.length ? `<div class="list">${prs.map((r, i) => `<button class="list-item list-btn" data-act="ev-ex" data-n="${esc(r.nome)}"><span class="medal ${r.data >= semana ? 'm-ouro' : ''}">${icon('trophy')}</span><span class="grow"><span class="title">${esc(r.nome)}</span><br><span class="sub">${r.data >= semana ? '<b class="novo">Novo!</b> · ' : ''}${relDay(r.data)}</span></span><b class="num pr-v">${fmt(r.kg)} kg <small>× ${r.reps}</small></b>${icon('chevron-right')}</button>`).join('')}</div>` : empty('trophy', 'Nenhum recorde ainda', 'Seus maiores pesos em cada exercício aparecem aqui.')}`)}`;
}

function calendario() {
  const [y, m] = mesRef.split('-').map(Number);
  const first = `${mesRef}-01`, dim = new Date(y, m, 0).getDate(), off = (weekday(first) + 6) % 7;
  const porDia = {}; state.sessoes.filter(s => s.sets.length && s.data.startsWith(mesRef)).forEach(s => (porDia[s.data] ||= []).push(s));
  const cells = [...Array(off).fill(null), ...Array.from({ length: dim }, (_, i) => `${mesRef}-${String(i + 1).padStart(2, '0')}`)];
  const total = Object.keys(porDia).length;
  const titulo = new Date(y, m - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return card(`<div class="date-nav" style="margin:0 0 12px">${btn('', { act: 'ev-mes', ic: 'chevron-left', size: 'lg', srLabel: 'Mês anterior', attrs: { 'data-d': -1 } })}<b style="text-transform:capitalize">${titulo}</b>${btn('', { act: 'ev-mes', ic: 'chevron-right', size: 'lg', srLabel: 'Próximo mês', attrs: { 'data-d': 1, disabled: mesRef >= today().slice(0, 7) } })}</div>
    <div class="cal" role="grid" aria-label="Dias treinados em ${titulo}">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<span class="cal-h">${d}</span>`).join('')}
    ${cells.map(d => d ? `<button class="cal-d ${porDia[d] ? 'on' : ''} ${d === today() ? 'today' : ''}" ${porDia[d] ? `data-act="ev-dia" data-d="${d}"` : 'disabled'} aria-label="${fmtDate(d, { day: 'numeric', month: 'long' })}${porDia[d] ? ': treinou' : ''}">${+d.slice(8)}</button>` : '<span></span>').join('')}</div>
    <p style="margin-top:12px"><b class="num">${total}</b> ${total === 1 ? 'dia treinado' : 'dias treinados'} neste mês. Toque num dia verde para ver o treino.</p>`);
}

function cargas() {
  const exs = exerciciosFeitos();
  if (!exs.length) return card(empty('dumbbell', 'Ainda sem cargas anotadas', 'Faça um treino e a evolução de cada exercício aparece aqui.'));
  if (!exSel || !exs.includes(exSel)) exSel = exs[0];
  const h = historicoCarga(exSel), best = h.length ? Math.max(...h.map(x => x.kg)) : 0;
  return card(`<label class="field"><span>Exercício</span><select class="input" data-change="ev-sel">${exs.map(n => `<option ${n === exSel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    ${h.length ? `<div class="row wrap" style="gap:24px;margin:16px 0"><div class="stat"><span class="stat-label">Recorde</span><span class="stat-value num">${fmt(best)}<span class="stat-unit">kg</span></span></div>
      <div class="stat"><span class="stat-label">Primeira vez</span><span class="stat-value num">${fmt(h[0].kg)}<span class="stat-unit">kg</span></span></div>
      <div class="stat"><span class="stat-label">Evolução</span><span class="stat-value num" style="color:var(--accent-ink)">${h.at(-1).kg >= h[0].kg ? '+' : ''}${fmt(h.at(-1).kg - h[0].kg)}<span class="stat-unit">kg</span></span></div></div>
      ${lineChart(h.slice(-24).map(x => ({ label: fmtDate(x.data), y: x.kg })), { unit: 'kg', title: `Carga em ${exSel}` })}
      <div class="list" style="margin-top:8px">${[...h].reverse().slice(0, 10).map(x => `<div class="list-item"><span class="grow">${relDay(x.data)}</span><b class="num">${fmt(x.kg)} kg</b></div>`).join('')}</div>`
      : '<p class="muted">Sem cargas anotadas para este exercício.</p>'}`);
}

function peso() {
  const ps = [...state.pesos].sort((a, b) => a.date.localeCompare(b.date)), p = pesoAtual();
  return card(`${cardHead('Peso', 'scale', btn('Anotar', { act: 'ev-peso', ic: 'plus', variant: 'primary' }))}
    ${ps.length ? `<div class="row wrap" style="gap:24px;margin-bottom:12px"><div class="stat"><span class="stat-label">Atual</span><span class="stat-value num">${fmt(p.kg)}<span class="stat-unit">kg</span></span></div>
      <div class="stat"><span class="stat-label">Desde o início</span><span class="stat-value num">${p.kg - ps[0].kg > 0 ? '+' : ''}${fmt(p.kg - ps[0].kg)}<span class="stat-unit">kg</span></span></div>
      ${state.perfil.pesoMeta ? `<div class="stat"><span class="stat-label">Meta</span><span class="stat-value num">${fmt(state.perfil.pesoMeta)}<span class="stat-unit">kg</span></span></div>` : ''}</div>
      ${lineChart(ps.slice(-30).map(x => ({ label: fmtDate(x.date), y: x.kg })), { unit: 'kg', title: 'Peso corporal' })}
      <div class="list">${[...ps].reverse().slice(0, 12).map(x => `<div class="list-item"><span class="grow">${relDay(x.date)}</span><b class="num">${fmt(x.kg)} kg</b>${btn('', { act: 'ev-peso-del', ic: 'trash-2', variant: 'ghost', size: 'sm', srLabel: 'Apagar pesagem de ' + fmtDate(x.date), attrs: { 'data-d': x.date } })}</div>`).join('')}</div>`
      : empty('scale', 'Nenhum peso anotado', 'Anote uma vez por semana, de manhã, para ver a evolução.')}`);
}

const MEDS = [['cintura', 'Cintura'], ['quadril', 'Quadril'], ['peito', 'Peito'], ['braco', 'Braço'], ['coxa', 'Coxa']];
function medidas() {
  const ms = [...state.medidas].sort((a, b) => a.date.localeCompare(b.date)), ult = ms.at(-1), pri = ms[0];
  return card(`${cardHead('Medidas', 'ruler', btn('Anotar', { act: 'ev-med', ic: 'plus', variant: 'primary' }))}
    ${ult ? `<p class="small muted" style="margin-bottom:8px">Última: ${relDay(ult.date)} · comparando com ${fmtDate(pri.date)}</p>
      <div class="cmp">${MEDS.map(([k, l]) => ult[k] != null ? `<div class="cmp-row"><span>${l}</span><b class="num">${fmt(ult[k])} cm</b>${ms.length > 1 && pri[k] != null ? delta(ult[k], pri[k], ' cm', k === 'cintura' || k === 'quadril') : ''}</div>` : '').join('')}</div>`
      : empty('ruler', 'Nenhuma medida anotada', 'Use uma fita métrica. Meça sempre no mesmo lugar do corpo.')}`);
}

function fotos() {
  const fs = [...state.fotos].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return card(`${cardHead('Fotos de evolução', 'camera')}
    <label class="btn btn-primary btn-lg btn-block" style="margin-bottom:14px">${icon('camera')}<span>Tirar ou escolher foto</span><input type="file" accept="image/*" capture="environment" data-change="ev-foto" class="sr"></label>
    <p class="small muted" style="margin-bottom:14px">As fotos ficam só neste aparelho, por privacidade.</p>
    ${fs.length >= 2 ? btn('Comparar primeira e última', { act: 'ev-comp', ic: 'image', size: 'lg', block: true }) : ''}
    ${fs.length ? `<div class="photos">${fs.map(f => `<figure><img src="${f.data}" alt="Foto de ${fmtDate(f.date)}" loading="lazy"><figcaption><span>${fmtDate(f.date, { day: '2-digit', month: 'short', year: '2-digit' })}${f.pose ? ' · ' + esc(f.pose) : ''}</span>${btn('', { act: 'ev-foto-del', ic: 'trash-2', variant: 'ghost', size: 'sm', srLabel: 'Apagar foto', attrs: { 'data-id': f.id } })}</figcaption></figure>`).join('')}</div>` : empty('camera', 'Nenhuma foto ainda', 'Tire uma foto de frente e uma de lado a cada mês.')}`);
}

function semanas() {
  const atual = inicioSemana();
  const lista = Array.from({ length: 8 }, (_, k) => addDays(atual, -7 * k)).map(ini => ({ ini, r: resumoSemana(ini) })).filter(x => x.r.temDados);
  if (!lista.length) return card(empty('calendar', 'Nenhuma semana registrada', 'Treine ou anote a comida e o resumo de cada semana aparece aqui. Todo domingo ele também aparece na tela Hoje.'));
  return lista.map(({ ini, r }) => semanaCard(r, { parcial: ini === atual })).join('');
}
function analise() {
  const fs = frasesEvolucao();
  const COR = { bom: 'ok', atencao: 'warn', info: 'info' };
  return card(`${cardHead('O que seus números dizem', 'sparkles')}
    <div class="insights">${fs.map(f => `<div class="insight ins-${COR[f.tom]}"><span class="prog-ic">${icon(f.ic)}</span><div><b>${esc(f.titulo)}</b><p class="small">${esc(f.texto)}</p></div></div>`).join('')}</div>
    <p class="small muted" style="margin-top:12px">Análise automática das últimas 4 semanas, feita com os dados que você anotou. Não substitui seu personal, nutricionista ou médico.</p>`);
}

function render() {
  const body = { resumo, semanas, calendario, cargas, peso, medidas, fotos }[aba]();
  return `<div class="page-head"><div><h1>Evolução</h1><p>Seu progresso ao longo do tempo.</p></div></div>
  <div class="stack">${seg('ev-aba', ABAS, aba)}${body}</div>`;
}

act('ev-aba', el => { aba = el.dataset.v; refresh(); });
act('ev-per', el => { periodo = +el.dataset.v; refresh(); });
act('ev-sel', el => { exSel = el.value; refresh(); });
act('ev-ex', el => { exSel = el.dataset.n; aba = 'cargas'; refresh(); });
act('ev-mes', el => { const [y, m] = mesRef.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.d, 1); mesRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; refresh(); });
act('ev-dia', el => {
  const ss = state.sessoes.filter(s => s.data === el.dataset.d && s.sets.length);
  openSheet(`${sheetHead(fmtDate(el.dataset.d, { weekday: 'long', day: 'numeric', month: 'long' }))}${ss.map(s => `<div class="card card-tight" style="margin-bottom:12px"><h3>${esc(s.nome)}</h3><p class="small muted">${s.sets.length} séries · ${fmtInt(volumeSessao(s))} kg${duracaoSessao(s) ? ' · ' + fmtDuration(duracaoSessao(s)) : ''}${s.sentiu === 'dor' ? ' · sentiu dor' : ''}</p>
    <div class="list">${[...new Set(s.sets.map(x => x.nome))].map(n => `<div class="list-item"><span class="grow"><span class="title">${esc(n)}</span><br><span class="sub num">${s.sets.filter(x => x.nome === n).map(x => `${fmt(x.kg)}×${x.reps}`).join(' · ')}</span></span></div>`).join('')}</div></div>`).join('')}`, { label: 'Treino do dia' });
});
act('ev-peso', () => abrirPeso());
act('ev-peso-del', async el => { if (await confirmar('Apagar esta pesagem?', fmtDate(el.dataset.d, { day: 'numeric', month: 'long' }), { ok: 'Apagar', perigo: true })) { state.pesos = state.pesos.filter(x => x.date !== el.dataset.d); save(); refresh(); } });
act('ev-med', () => {
  const ult = [...state.medidas].sort((a, b) => a.date.localeCompare(b.date)).at(-1) || {};
  openSheet(`${sheetHead('Anotar medidas', 'Em centímetros. Deixe em branco o que não mediu.')}
    <form class="stack" data-submit="ev-med-ok"><div class="grid-2">${MEDS.map(([k, l]) => `<label class="field"><span>${l}</span><input class="input num" id="md-${k}" inputmode="decimal" placeholder="${ult[k] != null ? fmt(ult[k]) : 'cm'}"></label>`).join('')}</div>
    <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')}<span>Salvar medidas</span></button></form>`, { label: 'Anotar medidas' });
});
act('ev-med-ok', () => {
  const m = { date: today() }; let algum = false;
  MEDS.forEach(([k]) => { const v = parseNum(document.getElementById('md-' + k).value); if (v) { m[k] = v; algum = true; } });
  if (!algum) { toast('Preencha pelo menos uma medida.', { ic: 'info' }); return; }
  state.medidas = state.medidas.filter(x => x.date !== m.date); state.medidas.push(m); save(); closeSheet(); refresh(); toast('Medidas salvas.');
});
act('ev-foto', async el => {
  const f = el.files?.[0]; if (!f) return;
  toast('Preparando a foto…', { ic: 'camera' });
  try {
    const data = await comprimir(f, 900, .78);
    state.fotos.push({ id: uid(), date: today(), pose: '', data });
    if (!save()) { state.fotos.pop(); return; }
    refresh(); toast('Foto salva.');
  } catch { toast('Não foi possível abrir essa imagem.', { ic: 'triangle-alert' }); }
});
act('ev-foto-del', async el => { if (await confirmar('Apagar esta foto?', 'Ela será removida deste aparelho.', { ok: 'Apagar', perigo: true })) { state.fotos = state.fotos.filter(x => x.id !== el.dataset.id); save(); refresh(); } });
act('ev-comp', () => {
  const fs = [...state.fotos].sort((a, b) => (a.date || '').localeCompare(b.date || '')), a = fs[0], b = fs.at(-1);
  openSheet(`${sheetHead('Antes e depois')}<div class="compare">${[a, b].map(f => `<figure><img src="${f.data}" alt="Foto de ${fmtDate(f.date)}"><figcaption>${fmtDate(f.date, { day: '2-digit', month: 'short', year: 'numeric' })}</figcaption></figure>`).join('')}</div>`, { label: 'Comparar fotos' });
});

function comprimir(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); };
    img.onerror = rej; img.src = url;
  });
}

export default { render, title: () => 'Evolução' };
