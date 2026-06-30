'use client';

import { useCallback, useRef, useState } from 'react';
import { streamDealRefresh } from '@/lib/api';

export type StoreRunStatus = 'idle' | 'running' | 'done' | 'failed' | 'skipped';

export interface StoreProgress {
  store: string;
  status: StoreRunStatus;
  productsFound?: number;
  confidenceScore?: number;
  currentCount?: number;
  errorMessage?: string;
}

export function useDealRefreshStream() {
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeProgress, setStoreProgress] = useState<StoreProgress[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const updateStore = useCallback(
    (store: string, update: Partial<Omit<StoreProgress, 'store'>>) => {
      setStoreProgress((prev) => {
        const exists = prev.find((s) => s.store === store);
        if (exists) {
          return prev.map((s) => (s.store === store ? { ...s, ...update } : s));
        }
        return [...prev, { store, status: 'idle', ...update }];
      });
    },
    []
  );

  const trigger = useCallback(
    async (stores?: string[]) => {
      // Annuleer eventuele lopende stream.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRunning(true);
      setIsDone(false);
      setError(null);
      // Zet alle bekende stores op 'idle' als we de lijst al kennen.
      if (stores?.length) {
        setStoreProgress(stores.map((s) => ({ store: s, status: 'idle' })));
      } else {
        setStoreProgress([]);
      }

      try {
        await streamDealRefresh(
          (event, data) => {
            const store = data.store as string | undefined;

            switch (event) {
              case 'started': {
                const startedStores = data.stores as string[] | undefined;
                if (startedStores?.length) {
                  setStoreProgress(
                    startedStores.map((s) => ({ store: s, status: 'idle' as StoreRunStatus }))
                  );
                }
                break;
              }
              case 'store-start':
                if (store) updateStore(store, { status: 'running' });
                break;
              case 'store-progress':
                if (store) updateStore(store, { currentCount: data.count as number | undefined });
                break;
              case 'store-done':
                if (store)
                  updateStore(store, {
                    status: 'done',
                    productsFound: data.productsFound as number | undefined,
                    confidenceScore: data.confidenceScore as number | undefined,
                  });
                break;
              case 'store-error':
                if (store)
                  updateStore(store, {
                    status: 'failed',
                    errorMessage: (data.error as string | undefined) ?? undefined,
                  });
                break;
              case 'store-skip':
                if (store) updateStore(store, { status: 'skipped' });
                break;
              case 'done':
                setIsDone(true);
                // Reset stores die nog op 'running' staan (SSE-event gemist) zodat
                // de UI terugvalt op DB-status in plaats van oneindig te draaien.
                setStoreProgress((prev) =>
                  prev.map((s) => (s.status === 'running' ? { ...s, status: 'idle' } : s))
                );
                break;
              case 'error':
                setError((data.message as string | undefined) ?? 'Er ging iets mis.');
                break;
            }
          },
          controller.signal
        );
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Verbinding verbroken.');
        }
      } finally {
        setIsRunning(false);
        // Veiligheidsnet: als de stream onverwacht sluit, zet overgebleven
        // 'running' stores op 'idle' zodat de UI de DB-status toont.
        setStoreProgress((prev) =>
          prev.map((s) => (s.status === 'running' ? { ...s, status: 'idle' } : s))
        );
      }
    },
    [updateStore]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  return { isRunning, isDone, error, storeProgress, trigger, cancel };
}
