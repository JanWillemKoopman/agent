'use client';

import { useEffect, useState } from 'react';

/**
 * Detecteert nieuwe service-worker versies en biedt twee update-paden:
 * 1. Auto-update bij app openen (visibilitychange) — de gebruiker ziet altijd
 *    de nieuwste versie zodra de PWA wordt geopend vanuit het beginscherm.
 * 2. Manuele update via UpdateBanner terwijl de app actief is.
 */
export function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let onVisibilityChange: (() => void) | undefined;

    navigator.serviceWorker.ready.then((registration) => {

      const promoteWaiting = (worker: ServiceWorker | null) => {
        if (worker && navigator.serviceWorker.controller) {
          setWaitingWorker(worker);
        }
      };

      promoteWaiting(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') promoteWaiting(registration.waiting);
        });
      });

      // Periodieke poll elke 60 s (in-sessie update-check).
      pollInterval = setInterval(() => registration.update().catch(() => {}), 60_000);

      // Auto-update bij heropen van de PWA vanuit het beginscherm.
      onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return;
        registration.update().catch(() => {});
        if (registration.waiting) {
          // App werd zojuist geopend → direct activeren zonder banner.
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (pollInterval) clearInterval(pollInterval);
      if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const refresh = () => waitingWorker?.postMessage({ type: 'SKIP_WAITING' });

  return { updateAvailable: waitingWorker !== null, refresh };
}
