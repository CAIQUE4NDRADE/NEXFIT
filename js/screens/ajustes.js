// AJUSTES — aparência, avisos do treino, metas, conta, backup
import { state, save, replaceState, emptyState, normalize } from '../store.js';
import { icon } from '../icons.js';
import { act, btn, card, cardHead, seg, swtch, stepper, toast, confirmar, notice } from '../ui.js';
import { esc, parseNum, today } from '../util.js';
import { prime, falar, beep, vibrar, notifStatus, pedirNotificacao } from '../alerts.js';
import { applyPrefs, refresh } from '../app.js';
import { cloudUser } from '../cloud.js';

function render() {
  const p = state.perfil, pr = state.prefs, ns = notifStatus();
  const num = (id, label, val, unit, ph = '') => `<label class="field"><span>${label}</span><span class="row"><input class="input num" id="${id}" inputmode="decimal" value="${val ?? ''}" placeholder="${ph}" data-change="aj-num"><span class="muted" style="min-width:40px">${unit}</span></span></label>`;
  return `<div class="page-head"><div><h1>Ajustes</h1><p>Deixe o NEXFIT do seu jeito.</p></div></div>
  <div class="stack">
    ${card(`${cardHead('Leitura', 'a-large-small')}
      <p style="margin-bottom:8px"><b>Tamanho da letra</b></p>${seg('aj-letra', [['1', 'Normal'], ['1.15', 'Grande'], ['1.3', 'Muito grande']], String(pr.letra || 1))}
      <p style="margin:18px 0 8px"><b>Cores</b></p>${seg('aj-tema', [['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Automático']], pr.tema || 'light')}
      <p class="small muted" style="margin-top:8px">"Automático" segue o modo do celular.</p>`)}

    ${card(`${cardHead('Avisos durante o treino', 'bell')}
      <div class="stack" style="gap:4px">
        ${swtch('aj-voz', 'Falar em voz alta', pr.voz, 'Ex.: "Descanso terminado. Série 3 de 4."', 'aj-sw')}
        ${swtch('aj-som', 'Tocar som', pr.som, 'Três bipes no fim do descanso', 'aj-sw')}
        ${swtch('aj-vibrar', 'Vibrar o celular', pr.vibrar, 'Em celulares que permitem', 'aj-sw')}
        ${swtch('aj-telaAcesa', 'Manter a tela acesa no treino', pr.telaAcesa, 'A tela não apaga enquanto você treina', 'aj-sw')}
      </div>
      <div style="margin-top:14px">${btn('Testar aviso', { act: 'aj-testar', ic: 'volume-2', size: 'lg', block: true })}</div>
      <div style="margin-top:14px">${ns === 'granted' ? notice('Notificações ligadas: você é avisado mesmo com o celular bloqueado (quando o celular permite).', 'ok', 'bell')
        : ns === 'denied' ? notice('As notificações estão bloqueadas nas configurações do navegador. Para liberar: toque no cadeado ao lado do endereço do site e permita "Notificações".', 'warn', 'bell')
        : ns === 'indisponivel' ? notice('Este navegador não mostra notificações. Para receber aviso com a tela bloqueada, instale o app na tela inicial.', 'info', 'bell')
        : btn('Avisar também com a tela bloqueada', { act: 'aj-notif', ic: 'bell', variant: 'primary', size: 'lg', block: true })}</div>`)}

    ${card(`${cardHead('Treino', 'timer')}
      ${stepper({ id: 'aj-desc', label: 'Descanso padrão entre séries', value: p.descanso || 90, step: 15, min: 15, max: 600, unit: 'segundos' })}
      <p class="small muted" style="margin-top:8px">Usado quando o exercício não tem um descanso próprio.</p>`)}

    ${card(`${cardHead('Você e suas metas', 'user')}
      <div class="stack">
        <label class="field"><span>Seu nome</span><input class="input" id="aj-nome" value="${esc(p.nome)}" data-change="aj-num" autocomplete="given-name"></label>
        ${num('aj-pesoMeta', 'Meta de peso', p.pesoMeta, 'kg', 'opcional')}
        ${notice('Use as metas que o <b>nutricionista</b> passou. Se não tiver, deixe em branco.', 'info', 'info')}
        <div class="grid-2">${num('aj-metaKcal', 'Calorias por dia', p.metaKcal, 'kcal')}${num('aj-metaProt', 'Proteína por dia', p.metaProt, 'g')}${num('aj-metaCarb', 'Carboidrato por dia', p.metaCarb, 'g')}${num('aj-metaGord', 'Gordura por dia', p.metaGord, 'g')}</div>
        ${num('aj-metaAgua', 'Água por dia', p.metaAgua, 'ml', '2000')}
      </div>`)}

    ${card(`${cardHead('Conta e nuvem', 'cloud')}
      <p class="muted" style="margin-bottom:12px">${cloudUser() ? `Conectado como <b>${esc(cloudUser().email)}</b>.` : 'Sem conta, tudo fica salvo só neste aparelho. Com conta, você usa no celular e no computador e não perde nada se trocar de celular.'}</p>
      ${btn(cloudUser() ? 'Ver minha conta' : 'Entrar ou criar conta', { act: 'cloud-open', ic: 'cloud', variant: cloudUser() ? 'outline' : 'primary', size: 'lg', block: true })}`)}

    ${card(`${cardHead('Cópia de segurança', 'download')}
      <p class="muted" style="margin-bottom:12px">Baixe um arquivo com todos os seus dados (inclusive fotos). Serve para guardar ou passar para outro aparelho. Também aceita arquivos do app antigo.</p>
      <div class="stack">${btn('Baixar meus dados', { act: 'aj-export', ic: 'download', size: 'lg', block: true })}
      <label class="btn btn-outline btn-lg btn-block">${icon('upload')}<span>Restaurar de um arquivo</span><input type="file" accept="application/json,.json" class="sr" data-change="aj-import"></label></div>`)}

    ${card(`${cardHead('Sobre', 'info')}
      <p><b>NEXFIT 2.0</b> · Train. Track. Evolve.</p>
      <p class="small muted" style="margin-top:6px">O NEXFIT ajuda a anotar e acompanhar o treino e a alimentação. Não substitui orientação de médico, nutricionista ou professor de educação física.</p>
      <p class="small muted" style="margin-top:6px">Valores dos alimentos: Tabela TACO 4ª edição (NEPA/UNICAMP). Ícones: Lucide.</p>
      <div style="margin-top:16px">${btn('Apagar todos os dados deste aparelho', { act: 'aj-apagar', ic: 'trash-2', variant: 'danger', block: true })}</div>`)}
  </div>`;
}
function after(root) { root.querySelector('#aj-desc')?.addEventListener('input', e => { const v = parseInt(e.target.value, 10); if (v >= 15) { state.perfil.descanso = v; save(); } }); }

act('aj-letra', el => { state.prefs.letra = +el.dataset.v; save(); applyPrefs(); refresh(); });
act('aj-tema', el => { state.prefs.tema = el.dataset.v; save(); applyPrefs(); refresh(); });
act('aj-sw', el => { state.prefs[el.id.replace('aj-', '')] = el.checked; save(); });
act('aj-num', el => {
  const k = el.id.replace('aj-', '');
  if (k === 'nome') state.perfil.nome = el.value.trim();
  else { const v = parseNum(el.value); state.perfil[k] = v && v > 0 ? v : null; if (k === 'metaAgua' && !state.perfil.metaAgua) state.perfil.metaAgua = 2000; }
  save(); toast('Salvo.', { ms: 1500 });
});
act('aj-testar', () => { prime(); setTimeout(() => { beep('fim'); vibrar(); falar('Descanso terminado. Série 2 de 3.'); }, 150); });
act('aj-notif', async () => { const r = await pedirNotificacao(); toast(r === 'granted' ? 'Pronto! Você será avisado.' : 'Notificações não liberadas.', { ic: 'bell' }); refresh(); });

act('aj-export', () => {
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nexfit-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Arquivo baixado.', { ic: 'download' });
});
act('aj-import', async el => {
  const f = el.files?.[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const n = normalize(data);
    if (!n.treinos.length && !n.sessoes.length && !n.pesos.length && !Object.keys(n.comida).length) throw new Error('vazio');
    if (await confirmar('Restaurar este arquivo?', `Os dados atuais deste aparelho serão trocados pelos do arquivo (${n.treinos.length} treinos, ${n.sessoes.length} sessões, ${n.pesos.length} pesagens).`, { ok: 'Restaurar' })) {
      replaceState(data, 'import'); applyPrefs(); refresh(); toast('Dados restaurados.');
    }
  } catch { toast('Esse arquivo não é uma cópia de segurança do NEXFIT.', { ic: 'triangle-alert' }); }
  el.value = '';
});
act('aj-apagar', async () => {
  if (!await confirmar('Apagar tudo?', 'Treinos, histórico, comida, peso e fotos deste aparelho serão apagados. Se você tem conta, os dados da nuvem continuam lá.', { ok: 'Sim, apagar tudo', perigo: true })) return;
  if (!await confirmar('Tem certeza mesmo?', 'Não dá para desfazer. Recomendamos baixar uma cópia antes.', { ok: 'Apagar definitivamente', perigo: true })) return;
  replaceState(emptyState(), 'apagar'); localStorage.removeItem('nexfitSyncMeta'); applyPrefs(); location.hash = '#/hoje'; refresh(); toast('Dados apagados.');
});

export default { render, after, title: () => 'Ajustes' };
