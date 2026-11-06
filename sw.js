// NEXFIT 2.0 · service worker — app abre sem internet; imagens e fontes ficam guardadas após o 1º uso
const VERSAO = 'nexfit-2.1.0';
const APP = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './css/app.css', './css/premium.css', './css/screens.css', './css/tokens.css', './js/alerts.js', './js/app.js', './js/charts.js', './js/cloud.js', './js/data/exercises.js', './js/data/foods.js', './js/data/legacy-plans.js', './js/fichas.js', './js/icons.js', './js/lib.js', './js/parser.js', './js/screens/ajustes.js', './js/screens/aovivo.js', './js/screens/biblioteca.js', './js/screens/comida.js', './js/screens/evolucao.js', './js/screens/ficha.js', './js/screens/hoje.js', './js/screens/importar.js', './js/screens/treinar.js', './js/sharecard.js', './js/stats.js', './js/store.js', './js/timer.js', './js/ui.js', './js/util.js', './js/workout.js', ];
const CDN = ['https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const local = url.origin === location.origin;
  if (!local && !CDN.includes(url.origin)) return;                 // Supabase e outros: direto na rede
  if (local && (req.mode === 'navigate' || /\.(js|css|html|webmanifest)$/.test(url.pathname))) {
    // código do app: rede primeiro (pega atualização), cache se estiver sem internet
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
    return;
  }
  // imagens, fontes, biblioteca do login: cache primeiro
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); }
    return r;
  })));
});
// tocar na notificação de "descanso terminado" abre o app no treino
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.includes(self.registration.scope));
    if (c) { c.focus(); return c.navigate ? c.navigate(self.registration.scope + '#/treino') : null; }
    return self.clients.openWindow('./#/treino');
  }));
});
