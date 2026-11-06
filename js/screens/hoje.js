// HOJE — painel inicial: saudação, treino de hoje, semana, comida/água, peso, último treino
import { state, save, sessoesFeitas } from '../store.js';
import { icon } from '../icons.js';
import { act, btn, card, cardHead, bar, notice, openSheet, closeSheet, sheetHead, stepper, toast } from '../ui.js';
import { esc, fmt, fmtInt, fmtDate, relDay, greeting, today, DIAS_CURTO, parseNum, fmtDuration } from '../util.js';
import { treinoDeHoje, feitoHoje, semanaAtual, sequencia, totaisComida, pesoAtual, volumeSessao, duracaoSessao, exercicioPrincipal, historicoCarga } from '../stats.js';
import { ring, lineChart } from '../charts.js';
import { findEx } from '../lib.js';
import * as W from '../workout.js';
import { iniciarTreino } from './treinar.js';
import { addAgua, COPO } from './comida.js';
import { refresh } from '../app.js';

function metaSemana() {
  return new Set(state.treinos.flatMap(t => t.dias || [])).size || Math.min(5, Math.max(3, state.treinos.length));
}
function anelSemana() {
  const feitos = semanaAtual().filter(d => d.treinou).length, meta = metaSemana();
  return ring(feitos / meta * 100, { size: 116, stroke: 11, color: 'var(--lime)', label: `${feitos} de ${meta} treinos na semana`,
    center: `<div class="ring-txt"><b class="num">${feitos}<span>/${meta}</span></b><small>semana</small></div>` });
}
function hero() {
  const a = W.atual();
  if (a) return card(`<div class="hero-grid"><div class="stack" style="gap:6px"><span class="eyebrow">${icon('timer')} Treino em andamento</span>
    <h2 class="hero-title">${esc(a.s.nome)}</h2>
    <p class="muted">${a.s.sets.length} de ${W.totalSeries(a.s)} séries feitas</p></div>
    ${ring(a.s.sets.length / Math.max(1, W.totalSeries(a.s)) * 100, { size: 116, stroke: 11, color: 'var(--lime)', label: 'Progresso do treino', center: `<div class="ring-txt"><b class="num">${Math.round(a.s.sets.length / Math.max(1, W.totalSeries(a.s)) * 100)}<span>%</span></b><small>feito</small></div>` })}</div>
    ${btn('CONTINUAR TREINO', { href: '#/treino', ic: 'play', variant: 'primary', size: 'xl', block: true })}`, 'hero hero-xl stack');

  if (!state.treinos.length) return card(`<span class="eyebrow">${icon('sparkles')} Primeiro passo</span>
    <h2 class="hero-title">Vamos montar seu treino</h2>
    <p class="muted">Recebeu a ficha do personal pelo WhatsApp? Copie e cole aqui. O NEXFIT entende e monta tudo sozinho.</p>
    ${btn('Colar treino do personal', { href: '#/importar', ic: 'clipboard-paste', variant: 'primary', size: 'xl', block: true })}
    <a class="link-btn hero-link" href="#/treinar">Prefiro montar do zero</a>`, 'hero hero-xl stack');

  const hj = treinoDeHoje(), t = hj.treino;
  if (feitoHoje()) {
    const s = [...sessoesFeitas()].reverse().find(x => x.data === today());
    return card(`<div class="hero-grid"><div class="stack" style="gap:6px"><span class="eyebrow">${icon('circle-check')} Treino de hoje feito</span>
      <h2 class="hero-title">Muito bem${state.perfil.nome ? ', ' + esc(state.perfil.nome.split(' ')[0]) : ''}!</h2>
      <p class="muted">${esc(s.nome)}</p></div>${anelSemana()}</div>
      <div class="hero-stats"><div><b class="num">${s.sets.length}</b><span>séries</span></div><div><b class="num">${fmtInt(volumeSessao(s))}</b><span>kg levantados</span></div><div><b class="num">${duracaoSessao(s) ? Math.round(duracaoSessao(s) / 60000) : '—'}</b><span>minutos</span></div></div>
      <div class="row wrap">${btn('Ver evolução', { href: '#/evolucao', ic: 'trending-up', variant: 'primary', size: 'lg' })}${btn('Treinar de novo', { href: '#/treinar', ic: 'dumbbell', variant: 'glass', size: 'lg' })}</div>`, 'hero hero-xl stack');
  }
  const imgs = t.exs.map(e => findEx(e)?.img).filter(Boolean).slice(0, 3);
  const min = Math.max(20, Math.round(t.exs.reduce((a, e) => a + (e.series || 3) * ((e.descanso || state.perfil.descanso || 90) + 40), 0) / 60));
  return card(`<div class="hero-grid"><div class="stack" style="gap:6px">
      <span class="eyebrow">${icon('flame')} ${hj.motivo === 'dia' ? 'Programado para hoje' : 'Seu próximo treino'}</span>
      <h2 class="hero-title">${esc(t.nome)}</h2>
      <div class="hero-meta"><span>${icon('dumbbell')} ${t.exs.length} exercícios</span><span>${icon('timer')} ~${min} min</span></div></div>
      ${anelSemana()}</div>
    ${imgs.length ? `<div class="hero-strip" aria-hidden="true">${imgs.map(src => `<img src="${src}" alt="">`).join('')}${t.exs.length > 3 ? `<span>+${t.exs.length - 3}</span>` : ''}</div>` : ''}
    ${btn('COMEÇAR TREINO', { act: 'hj-comecar', ic: 'play', variant: 'primary', size: 'xl', block: true, attrs: { 'data-id': t.id, disabled: !t.exs.length } })}
    ${state.treinos.length > 1 ? `<a class="link-btn hero-link" href="#/treinar">Fazer outro treino</a>` : ''}`, 'hero hero-xl stack');
}

function numeros() {
  const seq = sequencia(), p = pesoAtual(), t = totaisComida(), agua = state.agua[today()] || 0, metaAgua = state.perfil.metaAgua || 2000;
  const tile = (href, ic, cor, valor, unid, label, extra = '') => `<div class="tile" style="--tc:var(${cor})"><a class="tile-cover" href="${href}" aria-label="${esc(label)}: ${esc(String(valor))}${esc(unid)}"></a><span class="tile-ic">${icon(ic)}</span><span class="tile-v num">${valor}<small>${unid}</small></span><span class="tile-l">${label}</span>${extra}</div>`;
  return `<div class="tiles">
    ${tile('#/evolucao', 'flame', '--c-fogo', seq, seq === 1 ? ' dia' : ' dias', 'Sequência')}
    ${tile('#/evolucao', 'scale', '--c-peso', p ? fmt(p.kg) : '—', p ? ' kg' : '', p ? 'Peso · ' + relDay(p.date).toLowerCase() : 'Peso')}
    ${tile('#/comida', 'utensils', '--c-comida', fmtInt(t.kcal), ' kcal', state.perfil.metaKcal ? `de ${fmtInt(state.perfil.metaKcal)}` : 'Comida hoje')}
    ${tile('#/comida', 'glass-water', '--c-agua', fmt(agua / 1000), ' L', `de ${fmt(metaAgua / 1000)} L de água`, `<button class="tile-add" data-act="hj-agua" aria-label="Bebi 1 copo de água">${icon('plus')}</button>`)}
  </div>`;
}

function destaque() {
  const nome = exercicioPrincipal();
  if (!nome) return '';
  const h = historicoCarga(nome); if (h.length < 1) return '';
  const ganho = h.at(-1).kg - h[0].kg;
  return card(`<div class="card-head"><div><span class="eyebrow">Sua evolução</span><h2 style="margin-top:4px">${esc(nome)}</h2></div>
      ${h.length > 1 ? `<span class="chip ${ganho >= 0 ? 'chip-ok' : 'chip-warn'} num" style="font-size:1rem">${ganho >= 0 ? '▲ +' : '▼ '}${fmt(ganho)} kg</span>` : ''}</div>
    ${lineChart(h.slice(-12).map(x => ({ label: fmtDate(x.data), y: x.kg })), { h: 190, unit: 'kg', title: `Carga em ${nome}` })}
    <a class="link-btn" href="#/evolucao">Ver todos os exercícios</a>`, 'card-feature');
}

function semana() {
  const dias = semanaAtual(), feitos = dias.filter(d => d.treinou).length, seq = sequencia();
  const meta = metaSemana();
  return card(`${cardHead('Sua semana', 'calendar', `<span class="chip chip-accent">${icon('flame')} ${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos</span>`)}
    <div class="week" role="list" aria-label="Dias treinados nesta semana">${dias.map((d, i) => `<div role="listitem" class="wk ${d.treinou ? 'on' : ''} ${d.hoje ? 'today' : ''} ${d.futuro ? 'fut' : ''}" aria-label="${DIAS_CURTO[(i + 1) % 7]}: ${d.treinou ? 'treinou' : d.futuro ? 'ainda não chegou' : 'não treinou'}">
      <span class="wk-dot">${d.treinou ? icon('check') : ''}</span><span class="wk-d">${DIAS_CURTO[(i + 1) % 7]}</span></div>`).join('')}</div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><span><b class="num">${feitos}</b> de <b class="num">${meta}</b> treinos na semana</span><span class="muted small">${Math.round(Math.min(100, feitos / meta * 100))}%</span></div>
    ${bar(feitos / meta * 100, 'Progresso semanal')}
    <p class="small muted" style="margin-top:10px">Dia ativo = treinou, anotou comida ou bebeu água.</p>`);
}

function render() {
  const nome = state.perfil.nome;
  return `
  <div class="page-head"><div><p class="hello">${greeting()}${nome ? ',' : ''}</p><h1>${nome ? esc(nome.split(' ')[0]) + '!' : 'Bem-vindo!'}</h1><p>${fmtDate(today(), { weekday: 'long', day: '2-digit', month: 'long' })}</p></div></div>
  <div class="stack">
    ${!nome ? card(`<form class="row wrap" data-submit="hj-nome" style="align-items:flex-end"><label class="field grow"><span>Como podemos te chamar?</span><input class="input" id="hj-nome" autocomplete="given-name" placeholder="Seu nome"></label>${btn('Salvar', { variant: 'primary', size: 'lg', attrs: { type: 'submit' } }).replace('type="button"', '')}</form>`) : ''}
    ${state.prefs.boasVindas ? notice(`<b>Seus dados do app antigo foram trazidos.</b> Treinos, cargas, peso e fotos estão aqui. ${btn('Ok', { act: 'hj-bv', size: 'sm' })}`, 'ok', 'circle-check') : ''}
    <div class="dash">
      <div class="dash-main stack">${hero()}${numeros()}</div>
      <div class="dash-side stack">${semana()}${destaque()}</div>
    </div>
    <p class="credits">NEXFIT · desenvolvido por <b>Caique Andrade</b></p>
  </div>`;
}

act('hj-comecar', el => iniciarTreino(el.dataset.id));
act('hj-nome', () => { const v = document.getElementById('hj-nome').value.trim(); if (!v) return; state.perfil.nome = v; save(); refresh(); toast(`Prazer, ${esc(v.split(' ')[0])}!`); });
act('hj-bv', () => { state.prefs.boasVindas = false; save(); refresh(); });
act('hj-agua', () => { addAgua(COPO); refresh(); });
act('hj-peso', () => abrirPeso());

export function abrirPeso() {
  const p = pesoAtual();
  openSheet(`${sheetHead('Anotar peso', 'Pese-se de preferência de manhã, em jejum.')}
    <div class="stack">
      ${stepper({ id: 'ps-kg', label: 'Peso de hoje', value: p ? String(p.kg).replace('.', ',') : '70', step: .1, min: 20, max: 400, unit: 'kg', decimals: true })}
      ${btn('Salvar peso', { act: 'ps-salvar', ic: 'check', variant: 'primary', size: 'lg', block: true })}
    </div>`, { label: 'Anotar peso' });
}
act('ps-salvar', () => {
  const kg = parseNum(document.getElementById('ps-kg').value);
  if (!kg || kg < 20 || kg > 400) { toast('Informe um peso entre 20 e 400 kg.', { ic: 'info' }); return; }
  const d = today();
  state.pesos = state.pesos.filter(x => x.date !== d); state.pesos.push({ date: d, kg });
  save(); closeSheet(); refresh(); toast(`Peso anotado: ${fmt(kg)} kg`);
});

export default { render, title: () => 'Hoje' };
