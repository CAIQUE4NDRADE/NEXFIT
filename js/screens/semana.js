// Cartão do resumo semanal (usado no Hoje e em Evolução → Semanas)
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import { act, btn, toast } from '../ui.js';
import { esc, fmt, fmtInt, fmtDate } from '../util.js';
import { resumoSemana, textoWhatsApp } from '../intel.js';
import { refresh } from '../app.js';

const COR = { otima: 'ok', boa: 'ok', fraca: 'warn', parada: 'warn' };

export function semanaCard(r, { destaque = false, parcial = false } = {}) {
  const tiles = [
    [`${r.dias}<small>/${r.meta}</small>`, 'treinos'],
    r.volPct != null ? [`${r.volPct >= 0 ? '+' : ''}${r.volPct}<small>%</small>`, 'peso levantado'] : [`${fmtInt(r.vol)}<small> kg</small>`, 'peso levantado'],
    r.protOk != null ? [`${r.protOk}<small>%</small>`, 'meta de proteína'] : null,
    r.diasComida ? [`${r.diasComida}<small> dias</small>`, 'anotou a comida'] : null
  ].filter(Boolean);
  const periodo = `${fmtDate(r.ini, { day: '2-digit', month: '2-digit' })} a ${fmtDate(r.fim, { day: '2-digit', month: '2-digit' })}`;
  return `<section class="card week-card ${destaque ? 'week-hl' : ''}" aria-label="Resumo da semana ${periodo}">
    <div class="card-head"><div><span class="eyebrow">${icon('calendar')} ${parcial ? 'Esta semana (até agora)' : 'Sua semana'} · ${periodo}</span>
      <h2 style="margin-top:6px" class="wk-title wk-${COR[r.nivel]}">${esc(r.titulo)}</h2></div>
      ${destaque ? btn('', { act: 'sm-fechar', ic: 'x', variant: 'ghost', size: 'sm', srLabel: 'Fechar resumo', attrs: { 'data-ini': r.ini } }) : ''}</div>
    <div class="wk-tiles">${tiles.map(([v, l]) => `<div><b class="num">${v}</b><span>${l}</span></div>`).join('')}</div>
    ${r.destaques.length ? `<h3 class="wk-h">Destaques</h3><ul class="wk-list">${r.destaques.map(d => `<li class="${d.atencao ? 'att' : ''}">${icon(d.ic)}<span>${esc(d.t)}</span></li>`).join('')}</ul>` : ''}
    <div class="wk-foco">${icon('sparkles')}<div><b>Foco da próxima semana</b><p>${esc(r.foco)}</p></div></div>
    ${!parcial ? btn('Compartilhar no WhatsApp', { act: 'sm-share', ic: 'share-2', variant: destaque ? 'primary' : 'outline', size: 'lg', block: true, attrs: { 'data-ini': r.ini } }) : ''}
  </section>`;
}

act('sm-fechar', el => { state.prefs.semanaVista = el.dataset.ini; save(); refresh(); toast('O resumo fica guardado em Evolução → Semanas.', { ic: 'calendar' }); });
act('sm-share', async el => {
  const txt = textoWhatsApp(resumoSemana(el.dataset.ini));
  try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
});
