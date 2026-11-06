// =====================================================================
// Login + sincronização com o Supabase (opcional)
// Sem login o app funciona 100% no aparelho. Com login, cada alteração
// sobe 2 s depois; ao abrir em outro aparelho, baixa a mais recente.
// Fotos ficam só no aparelho (são pesadas).
// =====================================================================
import { state, replaceState, onChange } from './store.js';
import { openSheet, closeSheet, sheetHead, btn, act, toast } from './ui.js';
import { icon } from './icons.js';
import { esc } from './util.js';

const SUPABASE_URL = 'https://ayjlxyhcvvgstoloanan.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dlKC_A4vrBi5v9RnRbcRig_WjeGSPrC';   // chave pública (pode ficar no site)
const META = 'nexfitSyncMeta';
const SO_LOCAL = ['fotos', 'aoVivo'];

let sb = null, user = null, timer = null, enviando = false, status = 'local', onRemote = () => {};
const lerMeta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; } };
const gravarMeta = m => { try { localStorage.setItem(META, JSON.stringify(m)); } catch {} };
const paraNuvem = () => { const c = { ...state }; SO_LOCAL.forEach(k => delete c[k]); return c; };

export const cloudButton = () => `<button class="top-btn" id="cloudBtn" data-act="cloud-open" data-status="local">${icon('cloud-off')}<span>Entrar</span></button>`;
function setStatus(s) {
  status = s;
  const b = document.getElementById('cloudBtn'); if (!b) return;
  const [ic, txt, tip] = {
    local: ['cloud-off', 'Entrar', 'Salvo só neste aparelho. Toque para entrar e salvar na nuvem.'],
    ok: ['cloud', 'Salvo', 'Salvo na nuvem'],
    sync: ['refresh-cw', 'Salvando', 'Enviando para a nuvem'],
    erro: ['cloud-off', 'Sem rede', 'Sem conexão. Envia quando a internet voltar.']
  }[s];
  b.innerHTML = `${icon(ic)}<span>${txt}</span>`; b.dataset.status = s; b.title = tip; b.setAttribute('aria-label', tip);
}

async function enviar() {
  if (!user || enviando) return;
  enviando = true; setStatus('sync');
  try {
    const agora = new Date().toISOString();
    const { error } = await sb.from('app_estado').upsert({ user_id: user.id, dados: paraNuvem(), versao: 3, aparelho: navigator.platform?.slice(0, 40) || 'web', atualizado_em: agora });
    if (error) throw error;
    const m = lerMeta(); m.userId = user.id; m.remoteAt = agora; delete m.dirtyAt; gravarMeta(m);
    setStatus('ok');
  } catch (e) { console.warn('NEXFIT nuvem:', e); setStatus('erro'); }
  finally { enviando = false; }
}
function agendar() {
  const m = lerMeta(); m.dirtyAt = new Date().toISOString(); gravarMeta(m);
  if (!user) return;
  clearTimeout(timer); timer = setTimeout(enviar, 2000);
}

async function sincronizar() {
  if (!user) return;
  setStatus('sync');
  const { data, error } = await sb.from('app_estado').select('dados, atualizado_em').eq('user_id', user.id).maybeSingle();
  if (error) { console.warn(error); setStatus('erro'); return; }
  const m = lerMeta();
  const outro = m.userId && m.userId !== user.id;
  if (!data) { await enviar(); return; }                                    // 1ª vez: sobe o que tem aqui
  const remotoNovo = !m.remoteAt || new Date(data.atualizado_em) > new Date(m.remoteAt);
  const localNovo = !!m.dirtyAt && !outro;
  if (remotoNovo && localNovo && new Date(m.dirtyAt) > new Date(data.atualizado_em)) await enviar();
  else if (remotoNovo || outro) {
    const aoVivo = state.aoVivo;
    replaceState(data.dados, 'remoto');
    if (!outro) state.aoVivo = aoVivo;
    m.userId = user.id; m.remoteAt = data.atualizado_em; delete m.dirtyAt; gravarMeta(m);
    setStatus('ok'); onRemote();
  } else if (localNovo) await enviar();
  else setStatus('ok');
}

// ---------- telas de conta ----------
function abrir() {
  if (!sb) {
    openSheet(`${sheetHead('Salvar na nuvem')}<p class="muted">Não foi possível carregar o serviço de login (sem internet?). O app continua funcionando normalmente e salva tudo neste aparelho.</p>`, { label: 'Conta' });
    return;
  }
  if (user) {
    openSheet(`${sheetHead('Sua conta', esc(user.email))}
      <div class="stack">
        <div class="notice ${status === 'erro' ? 'notice-warn' : 'notice-ok'}">${icon(status === 'erro' ? 'cloud-off' : 'cloud')}<div>${status === 'erro' ? 'Sem conexão agora. Seus dados estão guardados aqui e sobem quando a internet voltar.' : 'Seus treinos, comida e evolução estão salvos na nuvem.'}</div></div>
        <p class="small muted">As fotos de evolução ficam só neste aparelho.</p>
        ${btn('Sincronizar agora', { act: 'cloud-sync', ic: 'refresh-cw', variant: 'primary', size: 'lg', block: true })}
        ${btn('Sair da conta', { act: 'cloud-sair', ic: 'log-out', size: 'lg', block: true })}
      </div>`, { label: 'Sua conta' });
    return;
  }
  openSheet(`${sheetHead('Entrar no NEXFIT', 'Guarde seus dados na nuvem e use no celular e no computador.')}
    <form class="stack" data-submit="cloud-entrar" novalidate>
      <label class="field"><span>E-mail</span><input class="input" id="nx-email" type="email" autocomplete="email" inputmode="email" required></label>
      <label class="field"><span>Senha</span><input class="input" id="nx-senha" type="password" autocomplete="current-password" minlength="6" required><small>Mínimo de 6 letras ou números.</small></label>
      <p id="nx-msg" role="alert" class="small"></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('log-out')}<span>Entrar</span></button>
      ${btn('Criar conta nova', { act: 'cloud-criar', ic: 'user', size: 'lg', block: true })}
      <button type="button" class="link-btn" data-act="cloud-esqueci">Esqueci minha senha</button>
    </form>`, { label: 'Entrar' });
}
const msg = (t, erro) => { const p = document.getElementById('nx-msg'); if (p) { p.textContent = t; p.style.color = erro ? 'var(--danger)' : 'var(--ok)'; } };
const campos = () => [document.getElementById('nx-email').value.trim(), document.getElementById('nx-senha').value];
const traduz = m => /Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /not confirmed/i.test(m) ? 'Falta confirmar o e-mail. Abra o link que mandamos (veja também o spam).'
  : /already registered/i.test(m) ? 'Este e-mail já tem conta. Toque em Entrar.' : /at least 6/i.test(m) ? 'A senha precisa de pelo menos 6 caracteres.'
  : /rate limit/i.test(m) ? 'Muitas tentativas. Espere alguns minutos.' : /fetch/i.test(m) ? 'Sem internet. Tente de novo quando conectar.' : m;
const redirect = () => location.origin + location.pathname;

act('cloud-open', abrir);
act('cloud-entrar', async () => {
  const [email, senha] = campos();
  if (!email || !senha) return msg('Preencha o e-mail e a senha.', true);
  msg('Entrando…');
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return msg(traduz(error.message), true);
  closeSheet(); toast('Pronto! Você entrou na sua conta.');
});
act('cloud-criar', async () => {
  const [email, senha] = campos();
  if (!email || senha.length < 6) return msg('Informe o e-mail e uma senha com 6 ou mais caracteres.', true);
  msg('Criando sua conta…');
  const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: redirect(), data: { nome: state.perfil.nome || '' } } });
  if (error) return msg(traduz(error.message), true);
  if (data.session) { closeSheet(); toast('Conta criada!'); }
  else msg(`Conta criada! Abra o e-mail que enviamos para ${email}, toque no link e depois volte aqui para entrar.`);
});
act('cloud-esqueci', async () => {
  const [email] = campos();
  if (!email) return msg('Digite seu e-mail no campo acima.', true);
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect() });
  msg(error ? traduz(error.message) : 'Enviamos um link para criar uma senha nova.', !!error);
});
act('cloud-sync', async () => { await sincronizar(); closeSheet(); toast(status === 'ok' ? 'Tudo sincronizado.' : 'Sem conexão agora.'); });
act('cloud-sair', async () => { if (lerMeta().dirtyAt) await enviar(); await sb.auth.signOut(); closeSheet(); toast('Você saiu. Os dados continuam neste aparelho.'); });
act('cloud-nova-senha', async () => {
  const v = document.getElementById('nx-nova')?.value || '';
  if (v.length < 6) return msg('Mínimo de 6 caracteres.', true);
  const { error } = await sb.auth.updateUser({ password: v });
  if (error) return msg(traduz(error.message), true);
  closeSheet(); toast('Senha alterada.');
});

export function initCloud(opts = {}) {
  onRemote = opts.onRemote || onRemote;
  onChange(reason => { if (!['remoto', 'cheio', 'apagar'].includes(reason)) agendar(); });
  if (!window.supabase?.createClient) { setStatus('local'); return; }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  sb.auth.onAuthStateChange((ev, sess) => {
    const antes = user?.id;
    user = sess?.user || null;
    if (!user) { setStatus('local'); return; }
    if (ev === 'PASSWORD_RECOVERY') {
      openSheet(`${sheetHead('Criar senha nova')}<div class="stack"><label class="field"><span>Senha nova</span><input class="input" id="nx-nova" type="password" minlength="6" autocomplete="new-password"></label><p id="nx-msg" role="alert" class="small"></p>${btn('Salvar senha', { act: 'cloud-nova-senha', variant: 'primary', size: 'lg', block: true })}</div>`, { label: 'Senha nova' });
    }
    if (user.id !== antes) setTimeout(sincronizar, 0);
  });
  addEventListener('online', () => { if (user && lerMeta().dirtyAt) enviar(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user && !state.aoVivo) sincronizar(); });
}
export const cloudUser = () => user;
