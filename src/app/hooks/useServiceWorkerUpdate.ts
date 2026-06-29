'use client';

import { useEffect, useState } from 'react';

/**
 * Detecteert of er een nieuwe service-worker (nieuwe deployment) klaarstaat
 * en biedt een refresh-actie die de wachtende SW activeert.
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

    let interval: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker.ready.then((registration) => {
      const promote = (worker: ServiceWorker | null) => {
        if (worker && navigator.serviceWorker.controller) {
          setWaitingWorker(worker);
        }
      };

      promote(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') promote(registration.waiting);
        });
      });

      // Periodiek checken op een nieuwe deployment.
      interval = setInterval(() => registration.update().catch(() => {}), 60_000);
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (interval) clearInterval(interval);
    };
  }, []);

  const refresh = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  return { updateAvailable: waitingWorker !== null, refresh };
}
