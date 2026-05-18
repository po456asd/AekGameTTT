/* coi-serviceworker.js
 * Enables SharedArrayBuffer on GitHub Pages / static hosts by injecting
 * Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy headers via
 * a Service Worker. Required for the AI web worker (SharedArrayBuffer SMP).
 *
 * Based on https://github.com/gzuidhof/coi-serviceworker (MIT)
 * Gracefully no-ops when: running on file://, SW not supported, or already isolated.
 */
(() => {
  // ── Service Worker context ──────────────────────────────────
  if (typeof window === 'undefined') {
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', e => {
      // Skip opaque/no-cors requests that can't be cloned
      if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;
      e.respondWith(
        fetch(e.request).then(res => {
          if (res.status === 0) return res;
          const h = new Headers(res.headers);
          h.set('Cross-Origin-Embedder-Policy', 'require-corp');
          h.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
        }).catch(() => fetch(e.request))
      );
    });
    return;
  }

  // ── Page context ────────────────────────────────────────────
  if (typeof SharedArrayBuffer !== 'undefined') return; // already cross-origin isolated
  if (!('serviceWorker' in navigator)) return;          // no SW support (file://, old browser)

  const reloadOnce = () => {
    if (sessionStorage.getItem('coi-reload')) { sessionStorage.removeItem('coi-reload'); return; }
    sessionStorage.setItem('coi-reload', '1');
    location.reload();
  };

  navigator.serviceWorker.register(document.currentScript.src)
    .then(reg => {
      if (reg.active && !navigator.serviceWorker.controller) reloadOnce();
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', e => {
          if (e.target.state === 'activated') reloadOnce();
        });
      });
    })
    .catch(() => {}); // silently fail on file:// or HTTP

  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
})();
