// IMPORTAR — cola o treino que o personal mandou e o app monta as fichas
import { state } from '../store.js';
import { parseTreino, EXEMPLO } from '../parser.js';
import { findEx } from '../lib.js';
import { icon } from '../icons.js';
import { act, btn, card, notice, toast, empty } from '../ui.js';
import { esc, DIAS_CURTO } from '../util.js';
import * as F from '../fichas.js';
import { escolherExercicio } from './biblioteca.js';
import { go, refresh } from '../app.js';

let texto = '', preview = null;

function render() {
  if (preview) return revisar();
  return `
  <div class="page-head"><div><a class="link-btn" href="#/treinar">${icon('chevron-left')} Treinar</a><h1>Colar o treino do personal</h1>
    <p>Copie a mensagem do WhatsApp (ou o texto da ficha) e cole no quadro abaixo.</p></div></div>
  <div class="stack">
    <div class="steps">
      <div class="step"><b class="num">1</b><span>No WhatsApp, <b>segure o dedo</b> na mensagem do personal e toque em <b>Copiar</b>.</span></div>
      <div class="step"><b class="num">2</b><span>Volte aqui e toque em <b>Colar</b>.</span></div>
      <div class="step"><b class="num">3</b><span>Toque em <b>Montar meu treino</b> e confira.</span></div>
    </div>
    ${btn('Colar', { act: 'imp-colar', ic: 'clipboard-paste', variant: 'dark', size: 'lg', block: true })}
    <label class="field"><span>Texto do treino</span>
      <textarea class="input" id="imp-texto" data-input="imp-digitar" placeholder="Exemplo:&#10;Treino A - Peito&#10;Supino reto 4x10&#10;Crucifixo 3x12">${esc(texto)}</textarea></label>
    ${btn('Montar meu treino', { act: 'imp-ler', ic: 'sparkles', variant: 'primary', size: 'xl', block: true })}
    <button class="link-btn" data-act="imp-exemplo">Não tenho o texto agora — ver um exemplo</button>
  </div>`;
}

function revisar() {
  const { treinos, ignoradas } = preview;
  const naoAchados = treinos.reduce((a, t) => a + t.exs.filter(e => !e.exId && e.tipo !== 'cardio').length, 0);
  return `
  <div class="page-head"><div><button class="link-btn" data-act="imp-voltar">${icon('chevron-left')} Voltar e editar o texto</button><h1>Confira seu treino</h1>
    <p>Entendi <b>${treinos.length} treino(s)</b> com <b>${treinos.reduce((a, t) => a + t.exs.length, 0)} exercícios</b>.</p></div></div>
  <div class="stack">
    ${naoAchados ? notice(`<b>${naoAchados} exercício(s)</b> não estão na biblioteca (aparecem com ponto de interrogação). Pode deixar assim ou tocar em <b>Escolher</b> para ligar à foto certa.`, 'warn', 'circle-help') : notice('Todos os exercícios foram reconhecidos. Confira e toque em <b>Salvar</b>.', 'ok', 'circle-check')}
    ${treinos.map((t, ti) => card(`
      <label class="field"><span>Nome do treino</span><input class="input" value="${esc(t.nome)}" data-input="imp-nome" data-t="${ti}"></label>
      <div style="margin:14px 0 6px" class="small muted"><b>Dias da semana</b> (opcional)</div>
      <div class="days">${DIAS_CURTO.map((d, i) => `<button type="button" class="day ${t.dias.includes(i) ? 'on' : ''}" aria-pressed="${t.dias.includes(i)}" data-act="imp-dia" data-t="${ti}" data-d="${i}">${d}</button>`).join('')}</div>
      <div class="list" style="margin-top:12px">${t.exs.map((e, ei) => {
        const lib = e.exId ? findEx(e.exId) : null;
        return `<div class="list-item">
          ${lib?.img ? `<img class="thumb" src="${lib.img}" alt="">` : `<span class="thumb thumb-ph">${icon(e.tipo === 'cardio' ? 'footprints' : 'circle-help')}</span>`}
          <span class="grow"><span class="title">${esc(e.nome)}</span><br>
            <span class="sub num">${e.tipo === 'cardio' ? esc(e.reps) : `${e.series} × ${esc(e.reps)}`}${e.carga ? ` · ${e.carga} kg` : ''}${e.descanso ? ` · descanso ${e.descanso}s` : ''}</span>
            ${e.obs ? `<br><span class="sub">${icon('info')} ${esc(e.obs)}</span>` : ''}
            ${!lib || e.achado < 0.97 ? `<br><span class="sub small">Você escreveu: “${esc(e.original)}”</span>` : ''}</span>
          <span class="col-actions">
            ${e.tipo === 'cardio' ? '' : btn(lib ? 'Trocar' : 'Escolher', { act: 'imp-escolher', size: 'sm', variant: lib ? 'outline' : 'primary', attrs: { 'data-t': ti, 'data-e': ei } })}
            ${btn('', { act: 'imp-remover', ic: 'trash-2', size: 'sm', variant: 'ghost', srLabel: 'Remover ' + e.nome, attrs: { 'data-t': ti, 'data-e': ei } })}
          </span></div>`; }).join('')}</div>`)).join('')}
    ${ignoradas.length ? `<details class="card card-tight"><summary><b>${ignoradas.length} linha(s) que não entendi</b></summary><ul>${ignoradas.map(l => `<li class="small">${esc(l)}</li>`).join('')}</ul></details>` : ''}
    ${state.treinos.length ? `
      ${btn('Salvar e manter meus outros treinos', { act: 'imp-salvar', ic: 'check', variant: 'primary', size: 'lg', block: true, attrs: { 'data-sub': '0' } })}
      ${btn('Salvar e substituir os treinos antigos', { act: 'imp-salvar', ic: 'refresh-cw', size: 'lg', block: true, attrs: { 'data-sub': '1' } })}`
      : btn('Salvar meu treino', { act: 'imp-salvar', ic: 'check', variant: 'primary', size: 'xl', block: true, attrs: { 'data-sub': '0' } })}
  </div>`;
}

act('imp-digitar', el => { texto = el.value; });
act('imp-colar', async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (t?.trim()) { texto = t; document.getElementById('imp-texto').value = t; toast('Texto colado. Agora toque em Montar meu treino.'); }
    else toast('Não há texto copiado. Copie a mensagem do personal primeiro.', { ic: 'info' });
  } catch { document.getElementById('imp-texto').focus(); toast('Segure o dedo no quadro e escolha "Colar".', { ic: 'info', ms: 6000 }); }
});
act('imp-exemplo', () => { texto = EXEMPLO; document.getElementById('imp-texto').value = EXEMPLO; });
act('imp-ler', () => {
  texto = document.getElementById('imp-texto').value;
  if (!texto.trim()) { toast('Cole o texto do treino no quadro primeiro.', { ic: 'info' }); return; }
  const r = parseTreino(texto);
  if (!r.treinos.length) { toast('Não encontrei exercícios nesse texto. Confira se tem algo como "Supino 3x12".', { ic: 'triangle-alert', ms: 7000 }); return; }
  preview = r; refresh(); window.scrollTo(0, 0);
});
act('imp-voltar', () => { preview = null; refresh(); });
act('imp-nome', el => { preview.treinos[+el.dataset.t].nome = el.value; });
act('imp-dia', el => {
  const t = preview.treinos[+el.dataset.t], d = +el.dataset.d;
  t.dias = t.dias.includes(d) ? t.dias.filter(x => x !== d) : [...t.dias, d];
  el.classList.toggle('on'); el.setAttribute('aria-pressed', t.dias.includes(d));
});
act('imp-remover', el => { preview.treinos[+el.dataset.t].exs.splice(+el.dataset.e, 1); preview.treinos = preview.treinos.filter(t => t.exs.length); refresh(); });
act('imp-escolher', el => {
  const e = preview.treinos[+el.dataset.t].exs[+el.dataset.e];
  escolherExercicio({ titulo: 'Qual é este exercício?', sub: `Você escreveu: “${esc(e.original)}”`, onPick: lib => { e.exId = lib.id; e.nome = lib.nome; e.achado = 1; refresh(); } });
});
act('imp-salvar', el => {
  const novos = F.importar(preview, { substituir: el.dataset.sub === '1' });
  preview = null; texto = '';
  toast(`${novos.length} treino(s) salvo(s)!`, { ic: 'circle-check' });
  go('#/treinar');
});

export default { render, title: () => 'Colar treino' };
