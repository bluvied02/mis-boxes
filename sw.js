// Deja la app abrir aunque no haya señal. Primero intenta internet (así ve lo nuevo) y si no, usa lo guardado.
const CACHE = 'misboxes-v3'
const ARCHIVOS = ['./', 'index.html', 'estilos.css', 'app.js', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png']
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))); self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim() })
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r }).catch(() => caches.match(e.request, { ignoreSearch: true })))
})
