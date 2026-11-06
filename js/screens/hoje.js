// HOJE — painel inicial: saudação, treino de hoje, semana, comida/água, peso, último treino
import { state, save, sessoesFeitas } from '../store.js';
import { icon } from '../icons.js';
import { act, btn, card, cardHead, bar, notice, openSheet, closeSheet, sheetHead, stepper, toast } from '../ui.js';
import { esc, fmt, fmtInt, fmtDate, relDay, greeting, today, DIAS_CURTO, parseNum, fmtDuration } from '../util.js';
import { treinoDeHoje, feitoHoje, semanaAtual, sequencia, totaisComida, pesoAtual, volumeSessao, duracaoSessao } from '../stats.js';
import { ring } from '../charts.js';
import { findEx } from '../lib.js';
import * as W from '../workout.js';
import { iniciarTreino } from './treinar.js';
import { addAgua, COPO } from './comida.js';
import { refresh } from '../app.js';

function hero() {
  const a = W.atual();
  if (a) return card(`<span class="eyebrow">Treino em andamento</span>
    <h2 class="hero-title">${esc(a.s.nome)}</h2>
    <p class="muted">${a.s.sets.length} de ${W.totalSeries(a.s)} séries feitas</p>
    ${bar(a.s.sets.length / Math.max(1, W.totalSeries(a.s)) * 100, 'Progresso')}
    ${btn('CONTINUAR TREINO', { href: '#/treino', ic: 'play', variant: 'primary', size: 'xl', block: true })}`, 'hero stack');

  if (!state.treinos.length) return card(`<span class="eyebrow">Primeiro passo</span>
    <h2 class="hero-title">Vamos montar seu treino</h2>
    <p class="muted">Recebeu a ficha do personal pelo WhatsApp? Copie e cole aqui. O NEXFIT entende e monta tudo sozinho.</p>
    ${btn('Colar treino do personal', { href: '#/importar', ic: 'clipboard-paste', variant: 'primary', size: 'xl', block: true })}
    <a class="link-btn" style="color:#fff" href="#/treinar">Prefiro montar do zero</a>`, 'hero stack');

  const hj = treinoDeHoje(), t = hj.treino;
  if (feitoHoje()) {
    const s = [...sessoesFeitas()].reverse().find(x => x.data === today());
    return card(`<span class="eyebrow">${icon('circle-check')} Treino de hoje feito</span>
      <h2 class="hero-title">Muito bem${state.perfil.nome ? ', ' + esc(state.perfil.nome.split(' ')[0]) : ''}!</h2>
      <p class="muted">${esc(s.nome)} · ${s.sets.length} séries · ${fmtInt(volumeSessao(s))} kg levantados</p>
      <div class="row wrap">${btn('Ver evolução', { href: '#/evolucao', ic: 'trending-up', variant: 'primary', size: 'lg' })}${btn('Treinar de novo', { href: '#/treinar', ic: 'dumbbell', variant: 'dark', size: 'lg' })}</div>`, 'hero stack');
  }
  const imgs = t.exs.map(e => findEx(e)?.img).filter(Boolean).slice(0, 3);
  return card(`<div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><span class="eyebrow">${hj.motivo === 'dia' ? 'Programado para hoje' : 'Próximo treino'}</span>
      <h2 class="hero-title">${esc(t.nome)}</h2>
      <p class="muted">${t.exs.length} exercícios · cerca de ${Math.max(20, Math.round(t.exs.reduce((a, e) => a + (e.series || 3) * ((e.descanso || state.perfil.descanso || 90) + 40), 0) / 60))} min</p></div>
      ${imgs.length ? `<div class="hero-imgs" aria-hidden="true">${imgs.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}
    </div>
    <ul class="hero-list">${t.exs.slice(0, 4).map(e => `<li>${esc(e.nome)} <span class="muted">${e.tipo === 'cardio' ? esc(e.reps) : `${e.series}×${esc(e.reps)}`}</span></li>`).join('')}${t.exs.length > 4 ? `<li class="muted">+ ${t.exs.length - 4} exercícios</li>` : ''}</ul>
    ${btn('COMEÇAR TREINO', { act: 'hj-comecar', ic: 'play', variant: 'primary', size: 'xl', block: true, attrs: { 'data-id': t.id, disabled: !t.exs.length } })}
    ${state.treinos.length > 1 ? `<a class="link-btn" style="color:#fff" href="#/treinar">Fazer outro treino</a>` : ''}`, 'hero stack');
}

function semana() {
  const dias = semanaAtual(), feitos = dias.filter(d => d.treinou).length, seq = sequencia();
  const meta = Math.max(...state.treinos.map(t => 0), new Set(state.treinos.flatMap(t => t.dias || [])).size) || Math.min(5, Math.max(3, state.treinos.length));
  return card(`${cardHead('Sua semana', 'calendar', `<span class="chip chip-accent">${icon('flame')} ${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos</span>`)}
    <div class="week" role="list" aria-label="Dias treinados nesta semana">${dias.map((d, i) => `<div role="listitem" class="wk ${d.treinou ? 'on' : ''} ${d.hoje ? 'today' : ''} ${d.futuro ? 'fut' : ''}" aria-label="${DIAS_CURTO[(i + 1) % 7]}: ${d.treinou ? 'treinou' : d.futuro ? 'ainda não chegou' : 'não treinou'}">
      <span class="wk-dot">${d.treinou ? icon('check') : ''}</span><span class="wk-d">${DIAS_CURTO[(i + 1) % 7]}</span></div>`).join('')}</div>
    <div class="row" style="justify-content:space-between;margin-top:14px"><span><b class="num">${feitos}</b> de <b class="num">${meta}</b> treinos na semana</span><span class="muted small">${Math.round(Math.min(100, feitos / meta * 100))}%</span></div>
    ${bar(feitos / meta * 100, 'Progresso semanal')}
    <p class="small muted" style="margin-top:10px">Dia ativo = treinou, anotou comida ou bebeu água.</p>`);
}

function comidaCard() {
  const t = totaisComida(), p = state.perfil, agua = state.agua[today()] || 0, metaAgua = p.metaAgua || 2000;
  const copos = Math.round(agua / COPO), metaCopos = Math.round(metaAgua / COPO);
  return card(`${cardHead('Alimentação de hoje', 'utensils', btn('Abrir', { href: '#/comida', size: 'sm', ic: 'chevron-right' }))}
    <div class="row" style="gap:18px">
      ${ring(p.metaKcal ? t.kcal / p.metaKcal * 100 : 0, { size: 112, stroke: 12, label: `${fmtInt(t.kcal)} calorias`, center: `<div><b class="num" style="font-size:1.3rem">${fmtInt(t.kcal)}</b><br><span class="small muted">${p.metaKcal ? 'de ' + fmtInt(p.metaKcal) : 'kcal'}</span></div>` })}
      <div class="stack grow" style="gap:6px">
        <div class="macro"><span>Proteína</span><b class="num">${fmtInt(t.p)} g</b></div>
        <div class="macro"><span>Carboidrato</span><b class="num">${fmtInt(t.c)} g</b></div>
        <div class="macro"><span>Gordura</span><b class="num">${fmtInt(t.f)} g</b></div>
      </div>
    </div>
    <div class="water-row">
      <div class="grow"><b>${icon('glass-water')} Água</b><br><span class="num">${copos} de ${metaCopos} copos</span> <span class="small muted">(${fmt(agua / 1000)} L)</span>${bar(agua / metaAgua * 100, 'Água', 'var(--water)')}</div>
      ${btn('+1 copo', { act: 'hj-agua', ic: 'plus', variant: 'dark', size: 'lg' })}
    </div>`);
}

function pesoUltimo() {
  const p = pesoAtual(), meta = state.perfil.pesoMeta;
  const s = [...sessoesFeitas()].reverse()[0];
  return `<div class="grid-2">
    ${card(`${cardHead('Peso atual', 'scale')}
      ${p ? `<div class="stat-value num">${fmt(p.kg)}<span class="stat-unit">kg</span></div><p class="small muted">${relDay(p.date)}${meta ? ` · meta ${fmt(meta)} kg` : ''}</p>` : '<p class="muted">Ainda não anotado.</p>'}
      <div style="margin-top:12px">${btn('Anotar peso', { act: 'hj-peso', ic: 'plus', size: 'lg', block: true })}</div>`)}
    ${card(`${cardHead('Último treino', 'dumbbell')}
      ${s ? `<p><b>${esc(s.nome)}</b></p><p class="small muted">${relDay(s.data)}${duracaoSessao(s) ? ' · ' + fmtDuration(duracaoSessao(s)) : ''}</p>
        <div class="row" style="gap:20px;margin-top:10px"><div class="stat"><span class="stat-label">Séries</span><span class="stat-value num" style="font-size:1.5rem">${s.sets.length}</span></div><div class="stat"><span class="stat-label">Volume</span><span class="stat-value num" style="font-size:1.5rem">${fmtInt(volumeSessao(s))}<span class="stat-unit">kg</span></span></div></div>`
        : '<p class="muted">Seu primeiro treino aparece aqui.</p>'}`)}
  </div>`;
}

function render() {
  const nome = state.perfil.nome;
  return `
  <div class="page-head"><div><h1>${greeting()}${nome ? ', ' + esc(nome.split(' ')[0]) : ''}!</h1><p>${fmtDate(today(), { weekday: 'long', day: '2-digit', month: 'long' })}</p></div></div>
  <div class="stack">
    ${!nome ? card(`<form class="row wrap" data-submit="hj-nome" style="align-items:flex-end"><label class="field grow"><span>Como podemos te chamar?</span><input class="input" id="hj-nome" autocomplete="given-name" placeholder="Seu nome"></label>${btn('Salvar', { variant: 'dark', size: 'lg', attrs: { type: 'submit' } }).replace('type="button"', '')}</form>`) : ''}
    ${state.prefs.boasVindas ? notice(`<b>Seus dados do app antigo foram trazidos.</b> Treinos, cargas, peso e fotos estão aqui. ${btn('Ok', { act: 'hj-bv', size: 'sm' })}`, 'ok', 'circle-check') : ''}
    ${hero()}
    ${semana()}
    ${comidaCard()}
    ${pesoUltimo()}
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
