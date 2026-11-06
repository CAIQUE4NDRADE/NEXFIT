// =====================================================================
// TREINO AO VIVO — tela dedicada para usar na academia
// Um exercício por vez, botões grandes, o app conta as séries e o descanso.
// =====================================================================
import { state, save, sessao } from '../store.js';
import * as W from '../workout.js';
import { findEx } from '../lib.js';
import { icon } from '../icons.js';
import { act, btn, bar, stepper, openSheet, closeSheet, sheetHead, toast, notice, confirmar } from '../ui.js';
import { esc, fmt, fmtDate, fmtDuration, fmtInt, repsAlvo } from '../util.js';
import { escolherExercicio } from './biblioteca.js';
import { alternativas } from '../fichas.js';
import { volumeSessao, duracaoSessao, recordes, sequencia, MARCOS } from '../stats.js';
import { prime, falar } from '../alerts.js';
import { go, refresh } from '../app.js';
import { compartilharCard } from '../sharecard.js';

function semTreino(r) {
  const sid = r.query.resumo;
  if (sid && sessao(sid)) return resumo(sessao(sid));
  return `<div class="stack" style="padding-top:20vh;text-align:center">
    ${icon('dumbbell', 'big-ic')}<h1>Nenhum treino em andamento</h1>
    <p class="muted">Escolha um treino para começar.</p>
    ${btn('Ir para Treinar', { href: '#/treinar', variant: 'primary', size: 'lg' })}</div>`;
}

function render(r) {
  const a = W.atual();
  if (!a) return semTreino(r);
  const { s, av, plano } = a;
  const i = av.i, e = plano[i], lib = findEx(e);
  const feitos = W.setsDo(s, i), sug = W.sugestao(s, i);
  const exCompleto = feitos.length >= e.series;
  const total = W.totalSeries(s), pct = total ? s.sets.length / total * 100 : 0;
  const serieAtual = Math.min(feitos.length + 1, e.series);
  const tudo = W.proximoIncompleto(s) === -1;
  const antes = sug.antes;

  return `<div class="live">
  <div class="live-top">
    ${btn('Sair', { act: 'lv-sair', ic: 'chevron-left', variant: 'ghost', size: 'sm' })}
    <div class="live-title"><b>${esc(s.nome)}</b><span class="small muted">Exercício ${i + 1} de ${plano.length} · ${s.sets.length} de ${total} séries</span></div>
    ${btn('', { act: 'lv-lista', ic: 'list', variant: 'outline', size: 'sm', srLabel: 'Ver todos os exercícios' })}
  </div>
  ${bar(pct, 'Progresso do treino')}

  <article class="live-card" aria-labelledby="lv-nome">
    <div class="live-media">
      ${lib?.img ? `<img src="${lib.img}" alt="Demonstração: ${esc(e.nome)}" loading="eager">` : `<div class="live-noimg">${icon('dumbbell')}</div>`}
      <div class="live-media-btns">
        <button class="live-how" data-act="lv-como">${icon('circle-help')}<span>Como fazer</span></button>
        ${e.tipo === 'cardio' ? '' : `<button class="live-how" data-act="lv-trocar">${icon('refresh-cw')}<span>Trocar</span></button>`}
      </div>
    </div>
    <div class="live-info">
      <span class="chip chip-accent">${esc(lib?.grupo || e.grupo || 'Exercício')}</span>
      <h1 id="lv-nome" class="live-name">${esc(e.nome)}</h1>
      ${exCompleto
        ? `<p class="live-serie done">${icon('circle-check')} Todas as ${e.series} séries feitas</p>`
        : `<p class="live-serie">Série <b class="num">${serieAtual}</b> de <b class="num">${e.series}</b> <span class="muted">· meta: ${esc(e.reps)} repetições</span></p>`}
      ${e.obs ? `<p class="small muted live-obs">${icon('info')} ${esc(e.obs)}</p>` : ''}
    </div>
  </article>

  ${exCompleto ? '' : e.tipo === 'cardio' ? `
  <div class="card center"><span class="stat-label">Faça</span><div class="stat-value num" style="font-size:2.6rem">${esc(e.reps)}</div><p class="muted">no seu ritmo, sem perder o fôlego</p></div>` : `
  <div class="live-inputs">
    ${stepper({ id: 'lv-kg', label: 'Carga', value: sug.kg === '' ? '' : String(sug.kg).replace('.', ','), step: 1, max: 500, unit: 'kg', decimals: true })}
    ${stepper({ id: 'lv-reps', label: /\bs$|seg/.test(e.reps) ? 'Tempo' : 'Repetições', value: sug.reps, step: /\bs$|seg/.test(e.reps) ? 5 : 1, max: 600, unit: /\bs$|seg/.test(e.reps) ? 'segundos' : 'vezes' })}
  </div>
  <p class="live-last small">${antes ? `${icon('rotate-ccw')} Última vez (${fmtDate(antes.data)}): ${antes.sets.slice(0, 4).map(x => `<b class="num">${fmt(x.kg)} kg × ${x.reps}</b>`).join(' · ')}` : `${icon('sparkles')} Primeira vez neste exercício. Comece leve.`}</p>
  <button class="btn btn-primary btn-xl btn-block live-go" data-act="lv-serie">${icon('check')}<span>TERMINEI A SÉRIE</span></button>`}

  ${feitos.length ? `<div class="live-done" aria-label="Séries feitas">
    ${feitos.map((x, k) => `<button class="done-pill" data-act="lv-editar" data-k="${s.sets.indexOf(x)}" aria-label="Corrigir série ${x.n}: ${fmt(x.kg)} quilos, ${x.reps} repetições">
      <span class="small muted">Série ${x.n}</span><b class="num">${fmt(x.kg)} kg × ${x.reps}</b>${icon('pencil')}</button>`).join('')}
  </div>` : ''}

  <div class="live-nav">
    ${btn('Anterior', { act: 'lv-ant', ic: 'chevron-left', size: 'lg', attrs: { disabled: i === 0 } })}
    ${tudo
      ? btn('FINALIZAR TREINO', { act: 'lv-fim', ic: 'trophy', variant: 'dark', size: 'lg' })
      : btn(i === plano.length - 1 ? 'Finalizar' : 'Próximo exercício', { act: i === plano.length - 1 ? 'lv-fim' : 'lv-prox', ic: i === plano.length - 1 ? 'trophy' : 'chevron-right', variant: exCompleto ? 'dark' : 'outline', size: 'lg' })}
  </div>
  </div>`;
}

function after(root) {
  // Enter no teclado numérico = terminei
  root.querySelectorAll('#lv-kg, #lv-reps').forEach(inp => inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); root.querySelector('[data-act="lv-serie"]')?.click(); } }));
  root.querySelectorAll('#lv-kg, #lv-reps').forEach(inp => inp.addEventListener('focus', () => inp.select()));
}

// ---------- ações ----------
act('lv-serie', () => {
  prime();
  const a0 = W.atual(); if (!a0) return;
  const e0 = a0.plano[a0.av.i];
  const kg = document.getElementById('lv-kg')?.value ?? '0', reps = document.getElementById('lv-reps')?.value ?? String(repsAlvo(e0.reps));
  if (!reps || reps === '0') { toast('Informe quantas repetições você fez.', { ic: 'info' }); return; }
  const r = W.registrarSerie(kg, reps); if (!r) return;
  refresh();
  if (r.acabouTudo) { falar('Parabéns! Você terminou todos os exercícios.'); toast('Último exercício feito! Toque em FINALIZAR TREINO.', { ic: 'trophy', undo: () => { W.desfazer(r.set); refresh(); } }); }
  else toast(`Série ${r.set.n} anotada: ${fmt(r.set.kg)} kg × ${r.set.reps}`, { undo: () => { W.desfazer(r.set); refresh(); } });
});
act('lv-trocar', () => {
  const a = W.atual(); if (!a) return;
  const i = a.av.i, e = a.plano[i];
  escolherExercicio({ titulo: 'Trocar só no treino de hoje', sub: 'Aparelho ocupado? Escolha outro do mesmo músculo.', lista: alternativas(e),
    onPick: lib => { W.trocarHoje(i, lib); refresh(); toast(`Hoje você vai fazer ${lib.nome}. Sua ficha não muda.`, { ic: 'refresh-cw' }); } });
});
act('lv-prox', () => { const a = W.atual(); if (!a) return; W.irPara(a.av.i + 1); refresh(); });
act('lv-ant', () => { const a = W.atual(); if (!a) return; W.irPara(a.av.i - 1); refresh(); });

act('lv-lista', () => {
  const a = W.atual(); if (!a) return;
  openSheet(`${sheetHead('Exercícios de hoje', 'Toque para ir direto a um exercício')}
    <div class="list">${a.plano.map((e, k) => {
      const f = W.setsDo(a.s, k).length, ok = f >= e.series, img = findEx(e)?.img;
      return `<button class="list-item list-btn" data-act="lv-ir" data-k="${k}" ${k === a.av.i ? 'aria-current="true"' : ''}>
        ${img ? `<img class="thumb" src="${img}" alt="">` : `<span class="thumb thumb-ph">${icon('dumbbell')}</span>`}
        <span class="grow"><span class="title">${k + 1}. ${esc(e.nome)}</span><br><span class="sub">${f} de ${e.series} séries</span></span>
        ${ok ? `<span class="chip chip-ok">${icon('check')} Feito</span>` : k === a.av.i ? '<span class="chip chip-accent">Agora</span>' : ''}
      </button>`; }).join('')}</div>`, { label: 'Lista de exercícios' });
});
act('lv-ir', el => { W.irPara(+el.dataset.k); closeSheet(); refresh(); });

act('lv-como', () => {
  const a = W.atual(); if (!a) return;
  const e = a.plano[a.av.i], lib = findEx(e);
  openSheet(`${sheetHead(esc(e.nome), esc(lib?.equip || ''))}
    ${lib?.img ? `<img src="${lib.img}" alt="Demonstração: ${esc(e.nome)}" style="width:100%;border-radius:18px;background:#fff;margin-bottom:16px">` : ''}
    <div class="stack">
      <div><h3>Como fazer</h3><p style="margin-top:6px">${esc(lib?.como || e.obs || 'Faça o movimento devagar e com controle.')}</p></div>
      ${lib?.cuidado ? notice(`<b>Cuidado:</b> ${esc(lib.cuidado)}`, 'warn', 'triangle-alert') : ''}
      ${lib?.musculos?.length ? `<p class="small muted"><b>Músculos:</b> ${esc(lib.musculos.join(' · '))}</p>` : ''}
      ${e.obs ? notice(`<b>Recado do seu treino:</b> ${esc(e.obs)}`, 'info', 'info') : ''}
    </div>`, { label: 'Como fazer' });
});

function editarSerie(set) {
  if (!set) return;
  openSheet(`${sheetHead(`Corrigir série ${set.n}`, esc(set.nome))}
    <div class="stack">
      ${stepper({ id: 'ed-kg', label: 'Carga', value: String(set.kg).replace('.', ','), step: 1, max: 500, unit: 'kg', decimals: true })}
      ${stepper({ id: 'ed-reps', label: 'Repetições', value: set.reps, step: 1, max: 100, unit: 'vezes' })}
      ${btn('Salvar correção', { act: 'ed-salvar', ic: 'check', variant: 'primary', size: 'lg', block: true })}
      ${btn('Apagar esta série', { act: 'ed-apagar', ic: 'trash-2', variant: 'danger', size: 'lg', block: true })}
    </div>`, { label: 'Corrigir série' });
  editarSerie.set = set;
}
act('lv-editar', el => { const a = W.atual(); editarSerie(a?.s.sets[+el.dataset.k]); });
act('t-corrigir', () => { const a = W.atual(); editarSerie(a?.s.sets.at(-1)); });
act('ed-salvar', () => { W.corrigir(editarSerie.set, document.getElementById('ed-kg').value, document.getElementById('ed-reps').value); closeSheet(); refresh(); toast('Série corrigida.'); });
act('ed-apagar', () => { W.apagarSerie(editarSerie.set); closeSheet(); refresh(); toast('Série apagada.'); });

act('lv-sair', () => {
  openSheet(`${sheetHead('Sair do treino?')}
    <div class="stack">
      ${btn('Continuar treinando', { act: 'fechar', ic: 'play', variant: 'primary', size: 'lg', block: true })}
      ${btn('Pausar e voltar depois', { act: 'lv-pausar', ic: 'pause', size: 'lg', block: true })}
      ${btn('Finalizar treino agora', { act: 'lv-fim', ic: 'trophy', size: 'lg', block: true })}
      ${btn('Descartar este treino', { act: 'lv-descartar', ic: 'trash-2', variant: 'danger', size: 'lg', block: true })}
      <p class="small muted">Ao pausar, tudo o que você anotou fica salvo. É só tocar em "Continuar treino" na tela inicial.</p>
    </div>`, { label: 'Sair do treino' });
});
act('lv-pausar', () => { closeSheet(); go('#/hoje'); });
act('lv-descartar', async () => {
  closeSheet();
  if (await confirmar('Descartar o treino?', 'As séries anotadas hoje neste treino serão apagadas.', { ok: 'Sim, descartar', perigo: true })) { W.descartar(); go('#/treinar'); toast('Treino descartado.'); }
});

// ---------- finalizar ----------
act('lv-fim', () => {
  const a = W.atual(); if (!a) return;
  const falta = W.totalSeries(a.s) - a.s.sets.length;
  openSheet(`${sheetHead('Finalizar treino', falta > 0 ? `Ainda faltam ${falta} séries. Tudo bem finalizar assim mesmo.` : 'Você fez todas as séries. Parabéns!')}
    <div class="stack">
      <h3>Como você se sentiu?</h3>
      <div class="feel">
        <button class="feel-btn" data-act="fim-sent" data-v="bem">${icon('smile')}<span>Bem</span></button>
        <button class="feel-btn" data-act="fim-sent" data-v="cansado">${icon('meh')}<span>Cansado</span></button>
        <button class="feel-btn" data-act="fim-sent" data-v="dor">${icon('frown')}<span>Senti dor</span></button>
      </div>
      <div id="fim-dor" hidden class="stack">
        ${notice('Se a dor for forte, aparecer no peito, ou vier com tontura ou falta de ar, <b>pare e procure ajuda médica</b>. Conte também ao seu personal.', 'warn', 'heart-pulse')}
        <label class="field"><span>Onde doeu? (opcional)</span><input class="input" id="fim-onde" placeholder="Ex.: joelho direito"></label>
      </div>
      <label class="field"><span>Fez esteira, bike ou caminhada? (opcional)</span>
        <span class="row"><input class="input num" id="fim-cardio" inputmode="numeric" placeholder="0" style="max-width:120px"><span class="muted">minutos</span></span></label>
      ${btn('Salvar treino', { act: 'fim-salvar', ic: 'check', variant: 'primary', size: 'xl', block: true })}
    </div>`, { label: 'Finalizar treino' });
});
act('fim-sent', el => {
  document.querySelectorAll('.feel-btn').forEach(b => b.setAttribute('aria-pressed', b === el));
  act.sentiu = el.dataset.v;
  document.getElementById('fim-dor').hidden = el.dataset.v !== 'dor';
});
act('fim-salvar', () => {
  const min = parseInt(document.getElementById('fim-cardio').value, 10);
  const sid = W.atual()?.s.id;
  const prsAntes = new Map(recordes(sid).map(r => [r.nome, r.kg]));    // recordes SEM o treino de hoje
  const seqAntes = sequencia(sid);
  const s = W.finalizar({ sentiu: act.sentiu || null, dor: act.sentiu === 'dor' ? { onde: document.getElementById('fim-onde').value } : null, cardio: min > 0 ? { tipo: 'Cardio', min } : null });
  act.sentiu = null;
  closeSheet();
  document.getElementById('toast').innerHTML = '';   // o "Desfazer" da última série não vale mais
  if (!s) return;
  s.novosRecordes = recordes().filter(r => r.data === s.data && r.kg > (prsAntes.get(r.nome) || 0)).map(r => `${r.nome}: ${fmt(r.kg)} kg`);
  const seq = sequencia();
  s.marco = seq > seqAntes && MARCOS.includes(seq) ? seq : null;
  save('treino');
  falar(s.novosRecordes.length ? 'Treino salvo. E você bateu um recorde! Parabéns!' : s.marco ? `Treino salvo. ${seq} dias seguidos! Parabéns!` : 'Treino salvo. Muito bem!');
  go('#/treino?resumo=' + s.id);
});

// ---------- resumo ----------
function resumo(s) {
  const vol = volumeSessao(s), dur = duracaoSessao(s);
  const exs = [...new Set(s.sets.map(x => x.nome))];
  const festa = s.novosRecordes?.length || s.marco;
  return `<div class="stack live-resumo">
    ${festa ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * .18}s;--r:${(i * 53) % 360}deg;--c:${['#A3E635', '#FBBF24', '#38BDF8', '#F472B6', '#fff'][i % 5]}"></i>`).join('')}</div>` : ''}
    <div class="center stack" style="align-items:center;padding-top:16px">
      <div class="trophy">${icon('trophy')}</div>
      <span class="eyebrow">Treino concluído</span>
      <h1>${esc(s.nome)}</h1>
      <p class="muted">${fmtDate(s.data, { weekday: 'long', day: '2-digit', month: 'long' })}</p>
    </div>
    <div class="card"><div class="grid-3">
      <div class="stat"><span class="stat-label">Tempo</span><span class="stat-value num" style="font-size:1.4rem">${dur ? fmtDuration(dur) : '—'}</span></div>
      <div class="stat"><span class="stat-label">Séries</span><span class="stat-value num">${s.sets.length}</span></div>
      <div class="stat"><span class="stat-label">Volume</span><span class="stat-value num" style="font-size:1.4rem">${fmtInt(vol)}<span class="stat-unit">kg</span></span></div>
    </div></div>
    ${s.marco ? `<div class="card reward">${icon('flame')}<div><b class="num">${s.marco} dias seguidos!</b><p class="muted small">Nova conquista desbloqueada em Evolução.</p></div></div>` : ''}
    ${s.novosRecordes?.length ? `<div class="card reward reward-pr">${icon('trophy')}<div><b>${s.novosRecordes.length > 1 ? 'Novos recordes!' : 'Novo recorde!'}</b>${s.novosRecordes.map(r => `<p class="num">${esc(r)}</p>`).join('')}</div></div>` : ''}
    <div class="card card-tight"><h3 style="margin-bottom:8px">Exercícios</h3><div class="list">${exs.map(n => {
      const ss = s.sets.filter(x => x.nome === n);
      return `<div class="list-item"><span class="grow"><span class="title">${esc(n)}</span><br><span class="sub num">${ss.map(x => `${fmt(x.kg)}×${x.reps}`).join(' · ')}</span></span></div>`; }).join('')}</div></div>
    ${btn('Compartilhar no WhatsApp', { act: 'rs-share', ic: 'share-2', variant: 'primary', size: 'lg', block: true, attrs: { 'data-id': s.id } })}
    ${btn('Voltar ao início', { href: '#/hoje', ic: 'house', size: 'lg', block: true })}
  </div>`;
}
act('rs-share', el => compartilharCard(sessao(el.dataset.id)));

// Aviso quando o descanso termina (o cronômetro some e a tela mostra a próxima série)
document.addEventListener('nexfit:descanso-fim', ev => {
  if (!W.atual()) return;
  refresh();
  toast(ev.detail?.proximo ? `Hora de treinar! ${esc(ev.detail.proximo)}` : 'Descanso terminado!', { ic: 'bell', ms: 6000 });
});

export default { render, after, live: true, title: () => 'Treino' };
