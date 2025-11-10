// sw.js - Service Worker para EpilepsiApp
const CACHE_NAME = 'epilepsiapp-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  './index.html',
  '/manifest.json',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker instalándose para EpilepsiApp...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache abierto:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Todos los recursos cacheados correctamente');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.log('Error al cachear recursos:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activado');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker listo para controlar clientes');
      return self.clients.claim();
    })
  );
});

// Interceptar solicitudes de red
self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('chrome-extension') || 
      event.request.url.includes('sockjs-node')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          console.log('Sirviendo desde cache:', event.request.url);
          return response;
        }
        
        return fetch(event.request).then(function(networkResponse) {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          const responseToCache = networkResponse.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
            
          return networkResponse;
        });
      })
      .catch(function(error) {
        console.log('Error en fetch, modo offline:', error);
        
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        
        return new Response('Recurso no disponible en modo offline', {
          status: 408,
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});