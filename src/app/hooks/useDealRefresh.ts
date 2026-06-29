'use client';

import { useEffect, useRef } from 'react';
import { refreshDailyDeals } from '@/lib/api';

/**
 * Vuurt bij sessie-start (mount van de ingelogde app) één keer de achtergrond-
 * scrape van supermarktaanbiedingen af. De gebruiker merkt hier niets van; de
 * server vult de dagcache zodat 'recepten genereren' daarna de gecachte
 * aanbiedingen kan gebruiken in plaats van live te scrapen.
 */
export function useDealRefresh() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refreshDailyDeals();
  }, []);
}
