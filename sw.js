const CACHE_NAME = 'rigza-v1';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icons/icon-192.svg', './icons/icon-512.svg', './icons/starz.jpg', './icons/my%20image%20.JPG'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
