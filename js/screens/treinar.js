// TREINAR — lista das fichas, começar treino, importar do personal, criar ficha
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import { act, btn, card, empty, openSheet, closeSheet, sheetHead, confirmar, toast, notice } from '../ui.js';
import { esc, DIAS_CURTO, relDay } from '../util.js';
import { treinoDeHoje, feitoHoje } from '../stats.js';
import { findEx } from '../lib.js';
import * as W from '../workout.js';
import * as F from '../fichas.js';
import { go, refresh } from '../app.js';

export function iniciarTreino(treinoId) {
  const a = W.atual();
  if (a && a.s.treinoId === treinoId) return go('#/treino');
  const comecar = () => {
    if (!state.prefs.avisoSaude) return avisoSaude(() => comecar());
    if (W.iniciar(treinoId)) go('#/treino');
    else toast('Este treino ainda não tem exercícios. Toque em Editar para adicionar.', { ic: 'info' });
  };
  if (a) {
    confirmar('Você tem um treino em andamento', `"${esc(a.s.nome)}" ainda não foi finalizado. Quer descartar e começar este?`, { ok: 'Começar o novo', cancelar: 'Voltar ao que estava', perigo: true })
      .then(ok => { if (ok) { W.descartar(); comecar(); } else go('#/treino'); });
  } else comecar();
}
function avisoSaude(depois) {
  openSheet(`${sheetHead('Antes do primeiro treino')}
    <div class="stack">
      ${notice('Este app ajuda a <b>anotar e acompanhar</b> o treino que seu profissional passou. Ele não substitui o professor de educação física nem o médico.', 'info', 'heart-pulse')}
      <ul class="clean-list">
        <li>${icon('check')} Se você tem pressão alta, problema no coração, nas articulações, ou tem mais de 60 anos, converse com seu médico antes de começar.</li>
        <li>${icon('check')} <b>Pare na hora</b> se sentir dor no peito, tontura, falta de ar forte ou dor nas articulações.</li>
        <li>${icon('check')} Beba água e comece com pouco peso.</li>
      </ul>
      ${btn('Entendi, vamos treinar', { act: 'saude-ok', ic: 'play', variant: 'primary', size: 'lg', block: true })}
    </div>`, { label: 'Aviso de saúde' });
  avisoSaude.depois = depois;
}
act('saude-ok', () => { state.prefs.avisoSaude = true; save(); closeSheet(); avisoSaude.depois?.(); });

function render() {
  const ts = state.treinos;
  const hj = treinoDeHoje();
  const a = W.atual();
  if (!ts.length) return `
    <div class="page-head"><div><h1>Treinar</h1><p>Monte seu treino em menos de um minuto.</p></div></div>
    <div class="stack">
      <a class="card big-choice" href="#/importar">
        <span class="big-ic-wrap">${icon('clipboard-paste')}</span>
        <span><h2>Colar o treino do personal</h2><span class="muted">Copie a mensagem do WhatsApp e cole aqui. O NEXFIT entende e monta sozinho.</span></span>
        ${icon('chevron-right')}
      </a>
      <button class="card big-choice" data-act="tr-divisao">
        <span class="big-ic-wrap">${icon('list')}</span>
        <span><h2>Montar do zero</h2><span class="muted">Escolha a divisão (A, AB, ABC…) e adicione os exercícios da biblioteca.</span></span>
        ${icon('chevron-right')}
      </button>
      <a class="card big-choice" href="#/biblioteca">
        <span class="big-ic-wrap">${icon('library')}</span>
        <span><h2>Ver a biblioteca</h2><span class="muted">101 exercícios com foto e explicação.</span></span>
        ${icon('chevron-right')}
      </a>
    </div>`;

  return `
  <div class="page-head"><div><h1>Treinar</h1><p>Escolha o treino e toque em Começar.</p></div>
    <div class="row wrap">${btn('Colar treino', { href: '#/importar', ic: 'clipboard-paste' })}${btn('Biblioteca', { href: '#/biblioteca', ic: 'library' })}</div></div>
  ${a ? `<div class="card hero row wrap" style="margin-bottom:16px;justify-content:space-between"><div><span class="eyebrow">Em andamento</span><h2 style="margin-top:4px">${esc(a.s.nome)}</h2><p class="muted">${a.s.sets.length} séries anotadas</p></div>${btn('Continuar treino', { href: '#/treino', ic: 'play', variant: 'primary', size: 'lg' })}</div>` : ''}
  <div class="stack">
    ${ts.map(t => {
      const ehHoje = hj?.treino.id === t.id, feito = feitoHoje(t.id);
      const ult = [...state.sessoes].reverse().find(s => s.treinoId === t.id && s.fim);
      const imgs = t.exs.map(e => findEx(e)?.img).filter(Boolean).slice(0, 4);
      return card(`
        <div class="tr-card">
          <div class="tr-imgs" aria-hidden="true">${imgs.length ? imgs.map(src => `<img src="${src}" alt="" loading="lazy">`).join('') : `<span class="thumb thumb-ph">${icon('dumbbell')}</span>`}</div>
          <div class="grow">
            <div class="row wrap" style="gap:8px;margin-bottom:4px">${ehHoje ? '<span class="chip chip-accent">Treino de hoje</span>' : ''}${feito ? `<span class="chip chip-ok">${icon('check')} Feito hoje</span>` : ''}${(t.dias || []).length ? `<span class="chip">${t.dias.sort().map(d => DIAS_CURTO[d]).join(', ')}</span>` : ''}</div>
            <h2>${esc(t.nome)}</h2>
            <p class="muted small">${t.exs.length} exercícios${ult ? ` · último: ${relDay(ult.data).toLowerCase()}` : ''}</p>
          </div>
        </div>
        <div class="tr-actions">
          ${btn('Começar', { act: 'tr-comecar', ic: 'play', variant: ehHoje ? 'primary' : 'dark', size: 'lg', attrs: { 'data-id': t.id, disabled: !t.exs.length } })}
          ${btn('Editar', { href: `#/ficha/${t.id}`, ic: 'pencil', size: 'lg' })}
        </div>`, ehHoje ? 'tr-today' : '');
    }).join('')}
    ${btn('Criar outro treino', { act: 'tr-novo', ic: 'plus', size: 'lg', block: true })}
  </div>`;
}

act('tr-comecar', el => iniciarTreino(el.dataset.id));
act('tr-novo', () => { const t = F.criarTreino(); go(`#/ficha/${t.id}`); });
act('tr-divisao', () => {
  openSheet(`${sheetHead('Como é a sua divisão?', 'Quantos treinos diferentes você faz na semana?')}
    <div class="stack">${[['A', 'Um treino só', 'Corpo inteiro, todo dia igual'], ['AB', 'Dois treinos (A e B)', 'Ex.: superior e inferior'], ['ABC', 'Três treinos (A, B e C)', 'O mais comum'], ['ABCD', 'Quatro treinos'], ['ABCDE', 'Cinco treinos']]
      .map(([v, l, s]) => `<button class="card big-choice" data-act="tr-div-ok" data-v="${v}"><span class="big-ic-wrap num" style="font-weight:800">${v}</span><span><h3>${l}</h3>${s ? `<span class="muted small">${s}</span>` : ''}</span>${icon('chevron-right')}</button>`).join('')}</div>`, { label: 'Divisão do treino' });
});
act('tr-div-ok', el => { const ts = F.criarDivisao(el.dataset.v); closeSheet(); go(`#/ficha/${ts[0].id}`); toast(`${ts.length} treino(s) criado(s). Agora adicione os exercícios.`); });

export default { render, title: () => 'Treinar' };
