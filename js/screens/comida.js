// COMIDA — calorias, proteína, carboidrato, gordura, refeições, água e histórico
import { state, save, comidaDia } from '../store.js';
import { FOODS, MEASURES, POPULAR } from '../data/foods.js';
import { icon } from '../icons.js';
import { act, btn, card, cardHead, bar, openSheet, closeSheet, sheetHead, stepper, toast, empty, notice } from '../ui.js';
import { esc, fmt, fmtInt, today, addDays, relDay, norm, uid, parseNum, DIAS_CURTO, weekday } from '../util.js';
import { totaisComida } from '../stats.js';
import { ring, barChart } from '../charts.js';
import { refresh } from '../app.js';

export const COPO = 250;
export const REFEICOES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];
const REF_IC = { 'Café da manhã': 'coffee', 'Almoço': 'utensils', 'Lanche': 'apple', 'Jantar': 'soup', 'Ceia': 'moon-star' };
let dia = today();

const todos = () => [...state.alimentosProprios, ...FOODS];
const porId = id => todos().find(f => String(f[0]) === String(id));
const nomeBonito = n => n.replace(/, /g, ' · ');

export function addAgua(ml, d = today()) {
  state.agua[d] = Math.max(0, (state.agua[d] || 0) + ml);
  save();
  const meta = state.perfil.metaAgua || 2000;
  if (ml > 0 && state.agua[d] >= meta && state.agua[d] - ml < meta) toast('Meta de água do dia batida! 💧', { ic: 'glass-water' });
}

function render() {
  const p = state.perfil, t = totaisComida(dia), itens = comidaDia(dia);
  const agua = state.agua[dia] || 0, metaAgua = p.metaAgua || 2000, metaCopos = Math.round(metaAgua / COPO), copos = Math.round(agua / COPO);
  const semMeta = !p.metaKcal;
  const macro = (label, v, meta, cor) => `<div class="macro-row"><div class="row" style="justify-content:space-between"><span><b>${label}</b></span><span class="num">${fmtInt(v)}${meta ? ` / ${fmtInt(meta)}` : ''} g</span></div>${bar(meta ? v / meta * 100 : 0, label, cor)}</div>`;
  const hist = Array.from({ length: 7 }, (_, i) => { const d = addDays(today(), i - 6); return { label: DIAS_CURTO[weekday(d)], y: Math.round(totaisComida(d).kcal) }; });

  return `
  <div class="page-head"><div><h1>Comida</h1><p>Anote o que comeu e a água que bebeu.</p></div></div>
  <div class="date-nav">
    ${btn('', { act: 'cm-dia', ic: 'chevron-left', size: 'lg', srLabel: 'Dia anterior', attrs: { 'data-d': -1 } })}
    <b>${relDay(dia)}</b>
    ${btn('', { act: 'cm-dia', ic: 'chevron-right', size: 'lg', srLabel: 'Próximo dia', attrs: { 'data-d': 1, disabled: dia >= today() } })}
  </div>
  <div class="stack">
    ${card(`<div class="cm-sum">
      ${ring(p.metaKcal ? t.kcal / p.metaKcal * 100 : 0, { size: 150, stroke: 14, label: `${fmtInt(t.kcal)} calorias`, center: `<div><b class="num" style="font-size:1.7rem">${fmtInt(t.kcal)}</b><br><span class="small muted">${p.metaKcal ? `de ${fmtInt(p.metaKcal)} kcal` : 'calorias'}</span></div>` })}
      <div class="stack grow" style="gap:12px">
        ${p.metaKcal ? `<p><b class="num">${fmtInt(Math.max(0, p.metaKcal - t.kcal))}</b> kcal ${t.kcal > p.metaKcal ? 'acima da meta' : 'restantes'}</p>` : ''}
        ${macro('Proteína', t.p, p.metaProt, 'var(--prot)')}${macro('Carboidrato', t.c, p.metaCarb, 'var(--carb)')}${macro('Gordura', t.f, p.metaGord, 'var(--fat)')}
      </div></div>
      ${semMeta ? `<div style="margin-top:14px">${notice(`Quer acompanhar uma meta? Use a que o nutricionista passou. <a href="#/ajustes">Definir metas</a>`, 'info', 'info')}</div>` : ''}`)}

    ${card(`${cardHead('Água', 'glass-water', `<span class="chip">${fmt(agua / 1000)} de ${fmt(metaAgua / 1000)} L</span>`)}
      <div class="cups" role="img" aria-label="${copos} de ${metaCopos} copos">${Array.from({ length: Math.max(metaCopos, copos) }, (_, i) => `<span class="cup ${i < copos ? 'on' : ''}">${icon('glass-water')}</span>`).join('')}</div>
      <div class="row" style="margin-top:14px">${btn('', { act: 'cm-agua', ic: 'minus', size: 'lg', srLabel: 'Tirar 1 copo', attrs: { 'data-ml': -COPO, disabled: !agua } })}${btn('Bebi 1 copo', { act: 'cm-agua', ic: 'plus', variant: 'primary', size: 'lg', block: true, attrs: { 'data-ml': COPO } })}</div>
      <p class="small muted" style="margin-top:8px">1 copo = ${COPO} ml</p>`)}

    ${REFEICOES.map(ref => {
      const its = itens.filter(x => x.ref === ref), kc = its.reduce((a, x) => a + x.kcal, 0);
      const ontem = comidaDia(addDays(dia, -1)).filter(x => x.ref === ref);
      return card(`${cardHead(ref, REF_IC[ref], its.length ? `<span class="chip num">${fmtInt(kc)} kcal</span>` : '', 'h2')}
        ${its.length ? `<div class="list">${its.map(x => `<div class="list-item"><span class="grow"><span class="title">${esc(nomeBonito(x.nome))}</span><br><span class="sub">${esc(x.medida)} · <b class="num">${fmtInt(x.kcal)} kcal</b> · P ${fmt(x.p)} · C ${fmt(x.c)} · G ${fmt(x.f)}</span></span>
          ${btn('', { act: 'cm-del', ic: 'trash-2', variant: 'ghost', size: 'sm', srLabel: 'Remover ' + x.nome, attrs: { 'data-id': x.id } })}</div>`).join('')}</div>` : ''}
        <div class="row wrap" style="margin-top:${its.length ? 12 : 0}px">
          ${btn('Adicionar', { act: 'cm-add', ic: 'plus', size: 'lg', variant: its.length ? 'outline' : 'dark', attrs: { 'data-ref': ref } })}
          ${!its.length && ontem.length ? btn('Repetir de ontem', { act: 'cm-repetir', ic: 'copy', size: 'lg', attrs: { 'data-ref': ref } }) : ''}
        </div>`);
    }).join('')}

    ${card(`${cardHead('Últimos 7 dias', 'chart-line')}${barChart(hist, { title: 'Calorias por dia' })}${p.metaKcal ? `<p class="small muted">Meta: ${fmtInt(p.metaKcal)} kcal por dia</p>` : ''}`)}
    <p class="small muted center">Valores nutricionais: Tabela TACO (NEPA/UNICAMP). Medidas caseiras são aproximadas — ajuste os gramas se precisar.</p>
  </div>`;
}

act('cm-dia', el => { const n = addDays(dia, +el.dataset.d); if (n <= today()) { dia = n; refresh(); } });
act('cm-agua', el => { addAgua(+el.dataset.ml, dia); refresh(); });
act('cm-del', el => {
  const lista = state.comida[dia] || []; const k = lista.findIndex(x => x.id === el.dataset.id); if (k < 0) return;
  const [x] = lista.splice(k, 1); save(); refresh();
  toast(`${nomeBonito(x.nome)} removido.`, { undo: () => { lista.splice(k, 0, x); save(); refresh(); } });
});
act('cm-repetir', el => {
  const ref = el.dataset.ref, ontem = comidaDia(addDays(dia, -1)).filter(x => x.ref === ref);
  state.comida[dia] = [...(state.comida[dia] || []), ...ontem.map(x => ({ ...x, id: uid() }))]; save(); refresh();
  toast(`${ref} de ontem repetido.`);
});

// ---------- adicionar alimento ----------
let addRef = 'Almoço', escolhido = null;
act('cm-add', el => { addRef = el.dataset.ref; escolhido = null; abrirBusca(); });

function abrirBusca() {
  const s = openSheet(`${sheetHead(`Adicionar ao ${addRef.toLowerCase()}`)}
    <div class="stack">
      <label class="search"><span class="sr">Buscar alimento</span>${icon('search')}<input class="input" type="search" id="fd-q" placeholder="Ex.: arroz, frango, banana" autocomplete="off" autofocus></label>
      <div class="list" id="fd-lista"></div>
      ${btn('Não achei — cadastrar pelo rótulo', { act: 'fd-novo', ic: 'plus', size: 'lg', block: true })}
    </div>`, { label: 'Adicionar alimento' });
  const lista = s.querySelector('#fd-lista');
  const desenhar = q => {
    const nq = norm(q), tk = nq.split(/\s+/).filter(Boolean);
    let res;
    if (!tk.length) {
      const recentes = [...new Set(Object.keys(state.comida).sort().reverse().flatMap(d => state.comida[d].map(x => String(x.alimentoId))))].slice(0, 8).map(porId).filter(Boolean);
      res = [...recentes, ...POPULAR.map(porId).filter(f => f && !recentes.includes(f))].slice(0, 20);
    } else {
      res = todos().map(f => { const n = norm(f[1]); return { f, ok: tk.every(t => n.includes(t)), s: (n.startsWith(tk[0]) ? 2 : 0) + (POPULAR.includes(f[0]) ? 1 : 0) + (/cozid|grelhad|assad|cru\b/.test(n) ? .5 : 0) - n.length / 200 }; })
        .filter(x => x.ok).sort((a, b) => b.s - a.s).slice(0, 40).map(x => x.f);
    }
    lista.innerHTML = res.length ? res.map(f => `<button class="list-item list-btn" data-fd="${f[0]}"><span class="grow"><span class="title">${esc(nomeBonito(f[1]))}</span><br><span class="sub num">${fmtInt(f[3])} kcal em 100 g${f[2] === 'Rótulo' ? ' · meu alimento' : ''}</span></span>${icon('chevron-right')}</button>`).join('')
      : empty('search', 'Não encontrado', 'Tente outra palavra ou cadastre pelo rótulo.');
  };
  desenhar('');
  s.querySelector('#fd-q').addEventListener('input', e => desenhar(e.target.value));
  lista.addEventListener('click', e => { const b = e.target.closest('[data-fd]'); if (b) { escolhido = porId(b.dataset.fd); abrirQuantidade(); } });
}

function abrirQuantidade() {
  const f = escolhido; if (!f) return;
  const meds = [...(MEASURES[f[0]] || []), ['100 g', 100], ['gramas', 1]];
  let medIdx = 0;
  const s = openSheet(`${sheetHead(esc(nomeBonito(f[1])), `${fmtInt(f[3])} kcal em 100 g`)}
    <div class="stack">
      <div><span class="stepper-label">Medida</span><div class="seg" id="fd-meds">${meds.map(([n, g], i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(n)}${g > 1 && n !== '100 g' ? ` <span class="muted small">≈${g} g</span>` : ''}</button>`).join('')}</div></div>
      ${stepper({ id: 'fd-qtd', label: 'Quantidade', value: 1, step: 1, min: 0, max: 2000, unit: meds[0][0], decimals: true })}
      <div class="card card-tight" id="fd-calc" aria-live="polite"></div>
      ${btn('Adicionar', { act: 'fd-ok', ic: 'check', variant: 'primary', size: 'lg', block: true })}
      <button class="link-btn" data-act="fd-voltar">${icon('chevron-left')} Escolher outro alimento</button>
    </div>`, { label: 'Quantidade' });
  const qtd = s.querySelector('#fd-qtd'), unit = s.querySelector('.stepper .unit'), box = s.querySelector('[data-stepper="fd-qtd"]');
  const calc = () => {
    const [n, g] = meds[medIdx], q = parseNum(qtd.value) || 0, gramas = q * g, k = gramas / 100;
    abrirQuantidade.v = { gramas, medida: n === 'gramas' ? `${fmt(gramas)} g` : n === '100 g' ? `${fmt(q * 100)} g` : `${fmt(q)} ${n} (≈${fmtInt(gramas)} g)`, kcal: f[3] * k, p: f[4] * k, c: f[5] * k, f: f[6] * k };
    const v = abrirQuantidade.v;
    s.querySelector('#fd-calc').innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><b class="num" style="font-size:1.4rem">${fmtInt(v.kcal)} kcal</b><span class="num small">${fmtInt(gramas)} g · P ${fmt(v.p)} · C ${fmt(v.c)} · G ${fmt(v.f)}</span></div>`;
  };
  s.querySelector('#fd-meds').addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return; e.stopPropagation();
    medIdx = +b.dataset.i; s.querySelectorAll('#fd-meds button').forEach(x => x.setAttribute('aria-pressed', x === b));
    const [n] = meds[medIdx]; unit.textContent = n;
    if (n === 'gramas') { qtd.value = '100'; box.dataset.step = '10'; } else { qtd.value = '1'; box.dataset.step = n === '100 g' ? '0.5' : '1'; }
    calc();
  }, true);
  qtd.addEventListener('input', calc); calc();
}
act('fd-voltar', () => abrirBusca());
act('fd-ok', () => {
  const v = abrirQuantidade.v, f = escolhido;
  if (!v || v.gramas <= 0) { toast('Informe a quantidade.', { ic: 'info' }); return; }
  (state.comida[dia] ||= []).push({ id: uid(), ref: addRef, alimentoId: f[0], nome: f[1], g: Math.round(v.gramas), medida: v.medida, kcal: Math.round(v.kcal), p: +v.p.toFixed(1), c: +v.c.toFixed(1), f: +v.f.toFixed(1) });
  save(); closeSheet(); refresh(); toast(`${nomeBonito(f[1])} adicionado.`);
});
act('fd-novo', () => {
  openSheet(`${sheetHead('Cadastrar pelo rótulo', 'Copie os números da tabela nutricional da embalagem.')}
    <form class="stack" data-submit="fd-novo-ok">
      <label class="field"><span>Nome</span><input class="input" id="nv-nome" required placeholder="Ex.: Leite integral Marca X"></label>
      <label class="field"><span>A tabela é para quantos gramas (ou ml)?</span><input class="input num" id="nv-porc" inputmode="decimal" value="100"></label>
      <div class="grid-2">
        <label class="field"><span>Calorias (kcal)</span><input class="input num" id="nv-kcal" inputmode="decimal" required></label>
        <label class="field"><span>Proteínas (g)</span><input class="input num" id="nv-p" inputmode="decimal" value="0"></label>
        <label class="field"><span>Carboidratos (g)</span><input class="input num" id="nv-c" inputmode="decimal" value="0"></label>
        <label class="field"><span>Gorduras totais (g)</span><input class="input num" id="nv-f" inputmode="decimal" value="0"></label>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')}<span>Salvar alimento</span></button>
    </form>`, { label: 'Cadastrar alimento' });
});
act('fd-novo-ok', () => {
  const g = id => parseNum(document.getElementById(id).value);
  const nome = document.getElementById('nv-nome').value.trim(), porc = g('nv-porc') || 100, kcal = g('nv-kcal');
  if (!nome || kcal == null) { toast('Preencha o nome e as calorias.', { ic: 'info' }); return; }
  const k = 100 / porc;
  const f = ['u' + uid(), nome, 'Rótulo', +(kcal * k).toFixed(1), +((g('nv-p') || 0) * k).toFixed(1), +((g('nv-c') || 0) * k).toFixed(1), +((g('nv-f') || 0) * k).toFixed(1)];
  state.alimentosProprios.unshift(f); save();
  escolhido = f; abrirQuantidade(); toast('Alimento cadastrado.');
});

export default { render, title: () => 'Comida' };
