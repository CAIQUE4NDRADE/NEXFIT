/* =====================================================================
   NEXFIT · login + sincronização com Supabase
   - O app continua funcionando sem login (salva só no aparelho).
   - Logado: cada alteração é enviada para a nuvem 2 s depois de salvar.
   - Ao abrir em outro aparelho, baixa a versão mais recente.
   - Fotos de evolução ficam só no aparelho por enquanto (são pesadas).
   ===================================================================== */
(function () {
  const SUPABASE_URL = 'https://ayjlxyhcvvgstoloanan.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_dlKC_A4vrBi5v9RnRbcRig_WjeGSPrC'; // chave pública (pode ficar no site)
  const META = 'nexfitSyncMeta';       // {userId, remoteAt, dirtyAt}
  const SO_LOCAL = ['photos', 'exercisePhotos']; // não sobem para a nuvem

  if (!window.supabase || !window.supabase.createClient) {
    console.warn('NEXFIT: biblioteca do Supabase não carregou (sem internet?). Modo local.');
    return;
  }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let user = null, timer = null, enviando = false, status = 'local';

  // ---------- utilidades ----------
  const lerMeta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { return {}; } };
  const gravarMeta = m => { try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {} };
  const paraNuvem = d => { const c = { ...d }; SO_LOCAL.forEach(k => delete c[k]); return c; };
  const aparelho = () => (navigator.userAgentData?.platform || navigator.platform || 'web').slice(0, 40);

  function setStatus(s) {
    status = s;
    const b = document.getElementById('cloudBtn');
    if (!b) return;
    const map = {
      local: ['☁︎', 'Entrar', 'Salvo só neste aparelho — toque para entrar'],
      ok: ['☁︎✓', 'Nuvem', 'Sincronizado com a nuvem'],
      sync: ['☁︎…', 'Enviando', 'Enviando para a nuvem'],
      erro: ['☁︎!', 'Offline', 'Sem conexão — será enviado quando voltar']
    }[s];
    b.innerHTML = map[0] + ' <span>' + map[1] + '</span>';
    b.title = map[2];
    b.dataset.status = s;
  }

  // ---------- envio (push) ----------
  async function enviar() {
    if (!user || enviando) return;
    enviando = true; setStatus('sync');
    try {
      const agora = new Date().toISOString();
      const { error } = await sb.from('app_estado').upsert({
        user_id: user.id, dados: paraNuvem(db), aparelho: aparelho(), atualizado_em: agora
      });
      if (error) throw error;
      const m = lerMeta(); m.userId = user.id; m.remoteAt = agora; delete m.dirtyAt; gravarMeta(m);
      setStatus('ok');
    } catch (e) {
      console.warn('NEXFIT: falha ao enviar', e); setStatus('erro');
    } finally { enviando = false; }
  }
  function agendarEnvio() {
    const m = lerMeta(); m.dirtyAt = new Date().toISOString(); gravarMeta(m);
    if (!user) return;
    clearTimeout(timer); timer = setTimeout(enviar, 2000);
  }

  // ---------- recebimento (pull) ----------
  async function sincronizar() {
    if (!user) return;
    setStatus('sync');
    const { data, error } = await sb.from('app_estado').select('dados, atualizado_em').eq('user_id', user.id).maybeSingle();
    if (error) { console.warn(error); setStatus('erro'); return; }
    const m = lerMeta();
    const outroUsuario = m.userId && m.userId !== user.id;

    if (!data) { // primeira vez na nuvem: sobe o que tem no aparelho
      if (outroUsuario) { aplicarRemoto(structuredClone(initial)); }
      await enviar(); return;
    }
    const remotoMudou = !m.remoteAt || new Date(data.atualizado_em) > new Date(m.remoteAt);
    const localMudou = !!m.dirtyAt && !outroUsuario;

    if (remotoMudou && localMudou && new Date(m.dirtyAt) > new Date(data.atualizado_em)) {
      await enviar();                       // aparelho tem alteração mais nova
    } else if (remotoMudou || outroUsuario) {
      aplicarRemoto(data.dados);            // nuvem é mais nova (ou trocou de conta)
      m.userId = user.id; m.remoteAt = data.atualizado_em; delete m.dirtyAt; gravarMeta(m);
      setStatus('ok');
    } else if (localMudou) {
      await enviar();
    } else setStatus('ok');
  }
  function aplicarRemoto(dados) {
    const fotosLocais = {};
    SO_LOCAL.forEach(k => { if (db && db[k] !== undefined) fotosLocais[k] = db[k]; });
    db = Object.assign(structuredClone(initial), dados, fotosLocais);
    salvarOriginal();
    try { render(); } catch (e) { location.reload(); }
  }

  // ---------- liga no save() do app ----------
  const saveOriginal = window.save;
  const salvarOriginal = () => saveOriginal();
  window.save = function () { const ok = saveOriginal.apply(this, arguments); if (ok !== false) agendarEnvio(); return ok; };

  // ---------- tela de login ----------
  function abrir() {
    document.getElementById('nexAuth')?.remove();
    const d = document.createElement('div');
    d.id = 'nexAuth';
    d.innerHTML = user ? `
      <div class="nx-card" role="dialog" aria-modal="true" aria-label="Conta NEXFIT">
        <h2>Sua conta</h2>
        <p class="muted">${user.email}</p>
        <p class="nx-ok">${status === 'ok' ? '✓ Treinos salvos na nuvem' : status === 'erro' ? '! Sem conexão — envia quando voltar' : 'Sincronizando…'}</p>
        <p class="small muted">Fotos de evolução ficam só neste aparelho por enquanto.</p>
        <button class="primary" onclick="nexCloud.agora()">Sincronizar agora</button>
        <button onclick="nexCloud.sair()">Sair da conta</button>
        <button class="nx-x" onclick="nexCloud.fechar()" aria-label="Fechar">✕</button>
      </div>` : `
      <div class="nx-card" role="dialog" aria-modal="true" aria-label="Entrar no NEXFIT">
        <h2>Entrar no NEXFIT</h2>
        <p class="muted small">Salve seus treinos na nuvem e use em qualquer aparelho.</p>
        <label>E-mail<input id="nxEmail" type="email" autocomplete="email" inputmode="email"></label>
        <label>Senha<input id="nxSenha" type="password" autocomplete="current-password" minlength="6"></label>
        <p id="nxMsg" class="small" role="status"></p>
        <button class="primary" onclick="nexCloud.entrar()">Entrar</button>
        <button onclick="nexCloud.cadastrar()">Criar conta</button>
        <button class="nx-link" onclick="nexCloud.esqueci()">Esqueci a senha</button>
        <button class="nx-x" onclick="nexCloud.fechar()" aria-label="Fechar">✕</button>
      </div>`;
    d.addEventListener('click', e => { if (e.target === d) fechar(); });
    document.body.appendChild(d);
    document.getElementById('nxEmail')?.focus();
  }
  function fechar() { document.getElementById('nexAuth')?.remove(); }
  const msg = (t, erro) => { const p = document.getElementById('nxMsg'); if (p) { p.textContent = t; p.className = 'small ' + (erro ? 'nx-err' : 'nx-ok'); } };
  const campos = () => [document.getElementById('nxEmail').value.trim(), document.getElementById('nxSenha').value];
  const traduz = m => /Invalid login/i.test(m) ? 'E-mail ou senha incorretos.'
    : /not confirmed/i.test(m) ? 'Confirme seu e-mail (veja a caixa de entrada e o spam).'
    : /already registered/i.test(m) ? 'Esse e-mail já tem conta. Use Entrar.'
    : /at least 6/i.test(m) ? 'A senha precisa de pelo menos 6 caracteres.'
    : /rate limit/i.test(m) ? 'Muitas tentativas. Aguarde alguns minutos.' : m;

  async function entrar() {
    const [email, senha] = campos();
    if (!email || !senha) return msg('Preencha e-mail e senha.', true);
    msg('Entrando…');
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) return msg(traduz(error.message), true);
    fechar();
  }
  async function cadastrar() {
    const [email, senha] = campos();
    if (!email || senha.length < 6) return msg('Informe e-mail e senha com 6+ caracteres.', true);
    msg('Criando conta…');
    const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) return msg(traduz(error.message), true);
    if (data.session) fechar();
    else msg('Conta criada! Abra o link que enviamos para ' + email + ' e depois toque em Entrar.');
  }
  async function esqueci() {
    const [email] = campos();
    if (!email) return msg('Digite seu e-mail acima.', true);
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    msg(error ? traduz(error.message) : 'Enviamos um link para redefinir a senha.', !!error);
  }
  async function sair() {
    if (lerMeta().dirtyAt) await enviar();
    await sb.auth.signOut();
    fechar();
  }

  // ---------- estilos ----------
  const css = document.createElement('style');
  css.textContent = `
  .cloud-btn{margin-left:auto;flex:0 0 auto;border:1px solid #277b5c;background:#0b241c;color:#00e879;border-radius:12px;font-weight:700;min-height:46px;min-width:48px;padding:7px 11px;font-size:17px;margin-right:6px;display:inline-flex;align-items:center;gap:6px}
  .cloud-btn span{font-size:13px}.cloud-btn[data-status=local]{color:#cfe7da;border-color:#475762;background:#1b242c}
  .cloud-btn[data-status=erro]{color:#ffcf7a;border-color:#7a6230}
  @media(max-width:420px){.cloud-btn span{display:none}}
  #nexAuth{position:fixed;inset:0;background:rgba(3,8,7,.78);display:flex;align-items:center;justify-content:center;z-index:20000;padding:16px}
  #nexAuth .nx-card{position:relative;width:min(100%,380px);background:#141d23;border:1px solid #2b5b40;border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px}
  #nexAuth h2{margin:0;color:#fff}#nexAuth label{display:flex;flex-direction:column;gap:5px}
  #nexAuth .nx-x{position:absolute;top:10px;right:10px;padding:6px 10px}
  #nexAuth .nx-link{background:none;border:none;color:#86e8a5;text-decoration:underline}
  .nx-ok{color:#86e8a5}.nx-err{color:#ffb4b4}`;
  document.head.appendChild(css);

  // ---------- botão no cabeçalho ----------
  const hdr = document.querySelector('header.app-header');
  if (hdr) {
    const b = document.createElement('button');
    b.id = 'cloudBtn'; b.className = 'cloud-btn'; b.onclick = abrir;
    const hr = hdr.querySelector('.head-right');
    hdr.insertBefore(b, hr || null);
  }
  setStatus('local');

  // ---------- sessão ----------
  sb.auth.onAuthStateChange((evento, sessao) => {
    const antes = user?.id;
    user = sessao?.user || null;
    if (!user) { setStatus('local'); return; }
    if (evento === 'PASSWORD_RECOVERY') {
      const nova = prompt('Digite a nova senha (mínimo 6 caracteres):');
      if (nova && nova.length >= 6) sb.auth.updateUser({ password: nova });
    }
    if (user.id !== antes) setTimeout(sincronizar, 0);
  });
  window.addEventListener('online', () => { if (user && lerMeta().dirtyAt) enviar(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user) sincronizar(); });

  window.nexCloud = { open: abrir, fechar, entrar, cadastrar, esqueci, sair, agora: sincronizar, cliente: sb };
})();
