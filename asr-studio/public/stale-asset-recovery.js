(async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn('Failed to clear stale app cache:', error);
  } finally {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('asr-reload', Date.now().toString());
    window.location.replace(url.toString());
  }
})();
