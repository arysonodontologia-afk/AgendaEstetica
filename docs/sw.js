// Service worker: guarda o app no aparelho (abre mesmo sem internet) e busca versão nova quando há conexão.
const CACHE = 'agenda-v4';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'backend.js', 'firebase-config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const own = u.origin === location.origin, sdk = u.hostname === 'www.gstatic.com';
  if (!own && !sdk) return; // chamadas ao Firebase (dados/login) passam direto
  e.respondWith(
    fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
