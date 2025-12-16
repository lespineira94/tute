// Script para limpiar cache y service worker
// Pega esto en la consola del navegador si sigues teniendo problemas de cache

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

if ('caches' in window) {
  caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      })
    );
  }).then(function() {
    console.log('Todos los caches eliminados');
    window.location.reload(true);
  });
}
