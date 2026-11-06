// FICHA — editar um treino: nome, dias, exercícios (séries, repetições, carga, descanso)
import { state, save, treino } from '../store.js';
import { findEx } from '../lib.js';
import { icon } from '../icons.js';
import { act, btn, card, empty, openSheet, closeSheet, sheetHead, stepper, confirmar, toast } from '../ui.js';
import { esc, DIAS_CURTO, parseNum } from '../util.js';
import * as F from '../fichas.js';
import { escolherExercicio } from './biblioteca.js';
import { go, refresh } from '../app.js';
import { iniciarTreino } from './treinar.js';

function render(r) {
  const t = treino(r.params[0]);
  if (!t) return empty('triangle-alert', 'Treino não encontrado', '', btn('Voltar', { href: '#/treinar', variant: 'primary' }));
  return `
  <div class="page-head"><div><a class="link-btn" href="#/treinar">${icon('chevron-left')} Treinar</a><h1>Editar treino</h1></div>
    ${t.exs.length ? btn('Começar', { act: 'fi-comecar', ic: 'play', variant: 'primary', size: 'lg', attrs: { 'data-t': t.id } }) : ''}</div>
  <div class="stack">
    ${card(`<label class="field"><span>Nome do treino</span><input class="input" value="${esc(t.nome)}" data-change="fi-nome" data-t="${t.id}" maxlength="60"></label>
      <div style="margin:16px 0 8px"><b>Dias da semana</b> <span class="small muted">— o app sugere este treino nesses dias</span></div>
      <div class="days">${DIAS_CURTO.map((d, i) => `<button type="button" class="day ${(t.dias || []).includes(i) ? 'on' : ''}" aria-pressed="${(t.dias || []).includes(i)}" data-act="fi-dia" data-t="${t.id}" data-d="${i}">${d}</button>`).join('')}</div>`)}
    ${card(`<div class="card-head"><h2>${icon('dumbbell')}Exercícios</h2><span class="chip">${t.exs.length}</span></div>
      ${t.exs.length ? `<div class="list">${t.exs.map((e, i) => {
        const lib = findEx(e);
        return `<div class="list-item fi-item">
          ${lib?.img ? `<img class="thumb" src="${lib.img}" alt="">` : `<span class="thumb thumb-ph">${icon(e.tipo === 'cardio' ? 'footprints' : 'dumbbell')}</span>`}
          <button class="grow list-btn-plain" data-act="fi-editar" data-t="${t.id}" data-e="${e.id}">
            <span class="title">${i + 1}. ${esc(e.nome)}</span><br>
            <span class="sub num">${e.tipo === 'cardio' ? esc(e.reps) : `${e.series} × ${esc(e.reps)}${e.carga ? ` · ${String(e.carga).replace('.', ',')} kg` : ''} · descanso ${e.descanso || state.perfil.descanso}s`}</span>
            ${e.obs ? `<br><span class="sub">${icon('info')} ${esc(e.obs)}</span>` : ''}
          </button>
          <span class="col-actions">
            ${btn('', { act: 'fi-mover', ic: 'arrow-up', size: 'sm', variant: 'ghost', srLabel: 'Subir', attrs: { 'data-t': t.id, 'data-e': e.id, 'data-d': -1, disabled: i === 0 } })}
            ${btn('', { act: 'fi-mover', ic: 'arrow-down', size: 'sm', variant: 'ghost', srLabel: 'Descer', attrs: { 'data-t': t.id, 'data-e': e.id, 'data-d': 1, disabled: i === t.exs.length - 1 } })}
          </span></div>`; }).join('')}</div>` : empty('dumbbell', 'Nenhum exercício ainda', 'Adicione pela biblioteca ou cole o treino do personal.')}
      <div class="stack" style="margin-top:14px">
        ${btn('Adicionar exercício', { act: 'fi-add', ic: 'plus', variant: 'primary', size: 'lg', block: true, attrs: { 'data-t': t.id } })}
      </div>`)}
    <div class="row wrap">
      ${btn('Duplicar treino', { act: 'fi-duplicar', ic: 'copy', attrs: { 'data-t': t.id } })}
      ${btn('Apagar treino', { act: 'fi-apagar', ic: 'trash-2', variant: 'danger', attrs: { 'data-t': t.id } })}
    </div>
  </div>`;
}

act('fi-comecar', el => iniciarTreino(el.dataset.t));
act('fi-nome', el => { const t = treino(el.dataset.t); t.nome = el.value.trim() || t.nome; save(); toast('Nome salvo.'); });
act('fi-dia', el => {
  const t = treino(el.dataset.t), d = +el.dataset.d; t.dias ||= [];
  t.dias = t.dias.includes(d) ? t.dias.filter(x => x !== d) : [...t.dias, d]; save();
  el.classList.toggle('on'); el.setAttribute('aria-pressed', t.dias.includes(d));
});
act('fi-mover', el => { F.moverEx(el.dataset.t, el.dataset.e, +el.dataset.d); refresh(); });
act('fi-add', el => escolherExercicio({ titulo: 'Adicionar exercício', onPick: lib => { const e = F.addEx(el.dataset.t, lib); refresh(); toast(`${lib.nome} adicionado.`); abrirEditor(el.dataset.t, e.id); } }));
act('fi-duplicar', el => { const c = F.duplicarTreino(el.dataset.t); go(`#/ficha/${c.id}`); toast('Treino duplicado.'); });
act('fi-apagar', async el => {
  const t = treino(el.dataset.t);
  if (await confirmar('Apagar este treino?', `"${esc(t.nome)}" será apagado. O histórico do que você já treinou continua salvo.`, { ok: 'Apagar treino', perigo: true })) { F.apagarTreino(t.id); go('#/treinar'); toast('Treino apagado.'); }
});

function abrirEditor(tid, eid) {
  const t = treino(tid), e = t?.exs.find(x => x.id === eid); if (!e) return;
  const cardio = e.tipo === 'cardio';
  openSheet(`${sheetHead(esc(e.nome), cardio ? 'Cardio' : 'Ajuste como o personal passou')}
    <div class="stack">
      ${cardio ? `<label class="field"><span>Tempo</span><input class="input" id="fe-reps" value="${esc(e.reps)}" placeholder="10 min"></label>` : `
      ${stepper({ id: 'fe-series', label: 'Séries', value: e.series, step: 1, min: 1, max: 20, unit: 'séries' })}
      <label class="field"><span>Repetições</span><input class="input num" id="fe-reps" value="${esc(e.reps)}" placeholder="Ex.: 12 ou 10–12 ou até a falha"><small>Pode escrever "10–12", "15" ou "até a falha".</small></label>
      ${stepper({ id: 'fe-carga', label: 'Carga inicial (opcional)', value: e.carga == null ? '' : String(e.carga).replace('.', ','), step: 1, max: 500, unit: 'kg', decimals: true })}
      ${stepper({ id: 'fe-desc', label: 'Descanso entre séries', value: e.descanso || state.perfil.descanso || 90, step: 15, min: 15, max: 600, unit: 'segundos' })}`}
      <label class="field"><span>Observação do personal (opcional)</span><input class="input" id="fe-obs" value="${esc(e.obs)}" placeholder="Ex.: segurar 2 segundos embaixo"></label>
      ${btn('Salvar', { act: 'fe-salvar', ic: 'check', variant: 'primary', size: 'lg', block: true })}
      ${cardio ? '' : btn('Trocar por outro exercício', { act: 'fe-trocar', ic: 'refresh-cw', size: 'lg', block: true })}
      ${btn('Remover do treino', { act: 'fe-remover', ic: 'trash-2', variant: 'danger', size: 'lg', block: true })}
    </div>`, { label: 'Editar exercício' });
  abrirEditor.alvo = [tid, eid];
}
act('fi-editar', el => abrirEditor(el.dataset.t, el.dataset.e));
act('fe-salvar', () => {
  const [tid, eid] = abrirEditor.alvo; const e = treino(tid).exs.find(x => x.id === eid);
  const g = id => document.getElementById(id)?.value;
  if (e.tipo !== 'cardio') {
    e.series = Math.max(1, parseInt(g('fe-series'), 10) || e.series);
    e.carga = parseNum(g('fe-carga'));
    e.descanso = parseInt(g('fe-desc'), 10) || null;
  }
  e.reps = (g('fe-reps') || '').trim() || e.reps;
  e.obs = (g('fe-obs') || '').trim();
  save(); closeSheet(); refresh(); toast('Exercício salvo.');
});
act('fe-trocar', () => {
  const [tid, eid] = abrirEditor.alvo; const e = treino(tid).exs.find(x => x.id === eid);
  escolherExercicio({ titulo: 'Trocar por qual?', sub: 'Mostrando primeiro os do mesmo músculo', lista: F.alternativas(e), onPick: lib => { const antes = e.nome; F.trocar(e, lib); refresh(); toast(`${antes} trocado por ${lib.nome}.`); } });
});
act('fe-remover', () => { const [tid, eid] = abrirEditor.alvo; F.removerEx(tid, eid); closeSheet(); refresh(); toast('Exercício removido.'); });

export default { render, title: () => 'Editar treino' };
