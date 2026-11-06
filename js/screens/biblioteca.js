// BIBLIOTECA — busca, filtros por músculo, foto, como fazer, adicionar ao treino
import { state } from '../store.js';
import { EXERCISES, CATEGORIAS, findEx } from '../lib.js';
import { icon } from '../icons.js';
import { act, btn, openSheet, closeSheet, sheetHead, notice, empty, toast } from '../ui.js';
import { esc, norm, debounce } from '../util.js';
import * as F from '../fichas.js';
import { go } from '../app.js';

let filtro = 'Todos', busca = '';
const filtrar = (lista, f, q) => {
  const nq = norm(q);
  return lista.filter(e => (f === 'Todos' || e.cat === f) && (!nq || norm([e.nome, e.grupo, e.equip, ...(e.alias || [])].join(' ')).includes(nq)));
};
const item = (e, actName, extra = '') => `<button class="list-item list-btn" data-act="${actName}" data-id="${e.id}" ${extra}>
  ${e.img ? `<img class="thumb" src="${e.img}" alt="" loading="lazy">` : `<span class="thumb thumb-ph">${icon('dumbbell')}</span>`}
  <span class="grow"><span class="title">${esc(e.nome)}</span><br><span class="sub">${esc(e.grupo)} · ${esc(e.equip)}</span></span>${icon('chevron-right')}</button>`;
const filtros = (name, cur) => `<div class="seg" role="group" aria-label="Filtrar por músculo">${['Todos', ...CATEGORIAS].map(c => `<button type="button" data-act="${name}" data-v="${c}" aria-pressed="${c === cur}">${c}</button>`).join('')}</div>`;

function render(r) {
  const destino = r.query.para;           // id do treino quando veio de "Adicionar exercício"
  const t = destino && state.treinos.find(x => x.id === destino);
  const lista = filtrar(EXERCISES, filtro, busca);
  return `
  <div class="page-head"><div>${t ? `<a class="link-btn" href="#/ficha/${t.id}">${icon('chevron-left')} Voltar para ${esc(t.nome)}</a>` : ''}<h1>Biblioteca</h1><p>${t ? 'Toque no exercício para adicionar ao treino.' : `${EXERCISES.length} exercícios com foto e explicação.`}</p></div></div>
  <div class="stack">
    <label class="search"><span class="sr">Buscar exercício</span>${icon('search')}<input class="input" type="search" id="bib-busca" placeholder="Buscar: supino, puxada, perna…" value="${esc(busca)}" data-input="bib-buscar" autocomplete="off"></label>
    ${filtros('bib-filtro', filtro)}
    <div class="card card-tight"><div class="list" id="bib-lista">${lista.length ? lista.map(e => item(e, 'bib-ver', t ? `data-para="${t.id}"` : '')).join('') : empty('search', 'Nada encontrado', 'Tente outra palavra, como "costas" ou "perna".')}</div></div>
  </div>`;
}
function after(root) { const i = root.querySelector('#bib-busca'); if (i && busca) { i.focus(); i.setSelectionRange(busca.length, busca.length); } }

const atualizarLista = debounce(() => {
  const el = document.getElementById('bib-lista'); if (!el) return;
  const para = new URLSearchParams(location.hash.split('?')[1] || '').get('para');
  const lista = filtrar(EXERCISES, filtro, busca);
  el.innerHTML = lista.length ? lista.map(e => item(e, 'bib-ver', para ? `data-para="${para}"` : '')).join('') : empty('search', 'Nada encontrado', 'Tente outra palavra, como "costas" ou "perna".');
}, 120);
act('bib-buscar', el => { busca = el.value; atualizarLista(); });
act('bib-filtro', el => { filtro = el.dataset.v; document.querySelectorAll('[data-act="bib-filtro"]').forEach(b => b.setAttribute('aria-pressed', b === el)); atualizarLista(); });

export function detalheHtml(e) {
  return `${e.img ? `<img src="${e.img}" alt="Demonstração: ${esc(e.nome)}" class="ex-photo">` : ''}
    <div class="stack">
      <div class="row wrap" style="gap:8px"><span class="chip chip-accent">${esc(e.grupo)}</span><span class="chip">${icon('dumbbell')} ${esc(e.equip)}</span></div>
      <div><h3>Como fazer</h3><p style="margin-top:6px">${esc(e.como)}</p></div>
      ${e.cuidado ? notice(`<b>Cuidado:</b> ${esc(e.cuidado)}`, 'warn', 'triangle-alert') : ''}
      ${e.musculos?.length ? `<p class="small muted"><b>Músculos trabalhados:</b> ${esc(e.musculos.join(' · '))}</p>` : ''}
    </div>`;
}
act('bib-ver', el => {
  const e = findEx(el.dataset.id); if (!e) return;
  const para = el.dataset.para;
  const ts = state.treinos;
  openSheet(`${sheetHead(esc(e.nome))}${detalheHtml(e)}
    <div class="stack" style="margin-top:18px">
    ${para ? btn('Adicionar a este treino', { act: 'bib-add', ic: 'plus', variant: 'primary', size: 'lg', block: true, attrs: { 'data-id': e.id, 'data-t': para } })
      : ts.length ? `<h3>Adicionar a um treino</h3>${ts.map(t => btn(esc(t.nome), { act: 'bib-add', ic: 'plus', size: 'lg', block: true, attrs: { 'data-id': e.id, 'data-t': t.id } })).join('')}`
      : btn('Criar um treino com este exercício', { act: 'bib-add', ic: 'plus', variant: 'primary', size: 'lg', block: true, attrs: { 'data-id': e.id, 'data-t': '' } })}
    </div>`, { label: e.nome });
});
act('bib-add', el => {
  let tid = el.dataset.t;
  if (!tid) tid = F.criarTreino('Treino A').id;
  const e = findEx(el.dataset.id), t = state.treinos.find(x => x.id === tid);
  F.addEx(tid, e); closeSheet();
  toast(`${e.nome} adicionado ao ${t.nome}.`, { ic: 'check' });
  if (new URLSearchParams(location.hash.split('?')[1] || '').get('para')) go(`#/ficha/${tid}`);
});

/** Folha para escolher um exercício (usada ao importar, editar ficha e trocar no treino). */
export function escolherExercicio({ titulo = 'Escolher exercício', sub = '', lista = EXERCISES, onPick }) {
  let f = 'Todos', q = '';
  const desenhar = () => {
    const l = filtrar(lista, f, q);
    document.getElementById('pick-lista').innerHTML = l.length ? l.map(e => item(e, 'pick-ok')).join('') : empty('search', 'Nada encontrado');
  };
  const s = openSheet(`${sheetHead(titulo, sub)}
    <div class="stack">
      <label class="search"><span class="sr">Buscar</span>${icon('search')}<input class="input" type="search" id="pick-busca" placeholder="Buscar exercício" autocomplete="off"></label>
      ${filtros('pick-filtro', f)}
      <div class="list" id="pick-lista"></div>
    </div>`, { label: titulo });
  desenhar();
  s.querySelector('#pick-busca').addEventListener('input', ev => { q = ev.target.value; desenhar(); });
  s.addEventListener('click', ev => {
    const fb = ev.target.closest('[data-act="pick-filtro"]');
    if (fb) { ev.stopPropagation(); f = fb.dataset.v; s.querySelectorAll('[data-act="pick-filtro"]').forEach(b => b.setAttribute('aria-pressed', b === fb)); desenhar(); return; }
    const ok = ev.target.closest('[data-act="pick-ok"]');
    if (ok) { ev.stopPropagation(); const e = findEx(ok.dataset.id); closeSheet(); onPick?.(e); }
  }, true);
}

export default { render, after, title: () => 'Biblioteca' };
