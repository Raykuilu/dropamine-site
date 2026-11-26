// Dropamine : application installable. Démarrage rapide et consultation hors connexion.
// - pages et données (data/*.json) : réseau d'abord, copie en cache si le réseau manque ;
// - fichiers du site (css, js, polices, icônes) : cache d'abord, rafraîchi en arrière-plan ;
// - API (api.dropamine.app) et Battle.net : jamais en cache (toujours en direct).
const VERSION = 'v2';
const SHELL = `shell-${VERSION}`, DATA = `data-${VERSION}`, IMG = `img-${VERSION}`;
const PRECACHE = ['./', 'index.html', 'Dropamine-Logo.png', 'icons/icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL, DATA, IMG].includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || (await caches.match('index.html')) || Response.error();
  }
}
async function staleWhileRevalidate(req, cacheName, max = 0) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then(async res => {
    if (res.ok || res.type === 'opaque') {
      await cache.put(req, res.clone());
      if (max) { const keys = await cache.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k); }
    }
    return res;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.dropamine.app' || url.hostname.endsWith('battle.net')) return;            // en direct
  if (url.hostname === 'render.worldofwarcraft.com') { e.respondWith(staleWhileRevalidate(req, IMG, 400)); return; }   // icônes et portraits
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.startsWith('/data/')) { e.respondWith(networkFirst(req, req.mode === 'navigate' ? SHELL : DATA)); return; }
  e.respondWith(staleWhileRevalidate(req, SHELL));
});

// notifications push (sorties de la chasse en groupe)
self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { title: 'Dropamine', body: e.data?.text() }; }
  // toujours afficher (Chrome l'exige pour chaque push) ; le même « tag » remplace l'alerte précédente de la même sortie
  e.waitUntil(self.registration.showNotification(m.title || 'Dropamine', { body: m.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: m.tag, renotify: !!m.tag, data: { url: m.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => new URL(x.url).origin === location.origin);
    return c ? c.navigate(url).then(x => (x || c).focus()) : self.clients.openWindow(url);
  }));
});
