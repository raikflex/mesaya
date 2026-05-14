// Service Worker para notificaciones push de MesaYA staff (mesero / cocina).
// Recibe payloads JSON con: tipo, titulo, cuerpo, url.

self.addEventListener('install', (event) => {
  // Tomar control inmediato sin esperar a que cierren tabs viejas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Controlar a todos los clients abiertos del scope
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { titulo: 'MesaYA', cuerpo: event.data.text(), url: '/' };
  }

  const titulo = payload.titulo || 'MesaYA';
  const opciones = {
    body: payload.cuerpo || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tipo || 'mesaya',
    data: { url: payload.url || '/' },
    // Los llamados urgentes quedan hasta que se interactua. Resto desaparece solo.
    requireInteraction: payload.tipo === 'llamado_campana',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});