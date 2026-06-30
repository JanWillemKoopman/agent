'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDealStatus, type DealStatus } from '@/lib/api';

const POLL_INTERVAL_RUNNING_MS = 4_000;

export function useDealStatus() {
  const [status, setStatus] = useState<DealStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDealStatus();
      setStatus(data);
      setIsLoading(false);

      // Zolang er een run actief is, blijven we pollen.
      const hasRunning = data.stores.some((s) => s.status === 'running');
      if (hasRunning) {
        pollRef.current = setTimeout(load, POLL_INTERVAL_RUNNING_MS);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setIsLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [load]);

  return { status, isLoading, refetch };
}
