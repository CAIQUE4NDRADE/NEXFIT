// NEXFIT service worker — app abre offline; imagens dos exercícios ficam em cache depois da 1ª vez.
const VERSAO = 'nexfit-v2';
const ESSENCIAIS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './img/nexfit-logo.svg', './nexfit-cloud.js'];
const CDN = 'https://cdn.jsdelivr.net';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const origem = new URL(req.url).origin;
  if (req.method !== 'GET' || (origem !== location.origin && origem !== CDN)) return; // Supabase passa direto
  if (req.mode === 'navigate') {
    // página: tenta a versão nova primeiro, cai no cache sem internet
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // imagens e demais arquivos: cache primeiro
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); }
    return r;
  })));
});
