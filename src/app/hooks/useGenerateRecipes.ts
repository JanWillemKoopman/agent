'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';
import type { FinalRecipe } from '@/lib/types';

interface StatusLine {
  step: number;
  message: string;
}

interface JobStatus {
  status: 'running' | 'done' | 'error';
  step: number;
  statusLines: StatusLine[];
  recipes: FinalRecipe[] | null;
  error: string | null;
}

// Onthoud de lopende job zodat we er weer op kunnen aanhaken na een refresh,
// het sluiten van de PWA, of nadat het scherm op slot ging.
const JOB_KEY = 'famapp:recipeJobId';
const POLL_INTERVAL_MS = 1500;

export function useGenerateRecipes() {
  const [statusLines, setStatusLines] = useState<StatusLine[]>([]);
  const [recipes, setRecipes] = useState<FinalRecipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mislukte polls (tijdelijke netwerkhik) negeren we een paar keer voordat we
  // ze als fout tonen — zo veroorzaakt een korte hapering geen valse melding.
  const consecutiveFailuresRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (job: JobStatus) => {
      stopPolling();
      jobIdRef.current = null;
      try {
        localStorage.removeItem(JOB_KEY);
      } catch {
        /* localStorage kan ontbreken (privémodus) — niet kritisch. */
      }
      setIsGenerating(false);
      if (job.status === 'done') {
        setRecipes(job.recipes ?? []);
        if (job.statusLines.length) setStatusLines(job.statusLines);
      } else {
        setError(job.error ?? 'Er ging iets mis bij het genereren.');
      }
    },
    [stopPolling]
  );

  // Eén poll-ronde. Plant zichzelf opnieuw zolang de job nog draait.
  const poll = useCallback(async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;

    try {
      const accessToken = await getAccessToken();
      const res = await fetch(`/api/generate-recipes?jobId=${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (res.status === 404) {
        // Job bestaat niet meer (bv. opgeruimd) — stil opruimen.
        finish({ status: 'error', step: 0, statusLines: [], recipes: null, error: 'De generatie kon niet worden gevonden. Probeer het opnieuw.' });
        return;
      }
      if (!res.ok) throw new Error(`Server gaf status ${res.status}`);

      const job = (await res.json()) as JobStatus;
      consecutiveFailuresRef.current = 0;

      if (job.statusLines?.length) setStatusLines(job.statusLines);

      if (job.status === 'running') {
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        finish(job);
      }
    } catch {
      // Tijdelijke fout (scherm op slot, netwerk weg): blijf het rustig proberen.
      // De server draait gewoon door; we pikken het resultaat op zodra we
      // weer verbinding hebben.
      consecutiveFailuresRef.current += 1;
      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [finish]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      jobIdRef.current = jobId;
      try {
        localStorage.setItem(JOB_KEY, jobId);
      } catch {
        /* niet kritisch */
      }
      setIsGenerating(true);
      void poll();
    },
    [poll, stopPolling]
  );

  const generate = useCallback(async () => {
    stopPolling();
    setError(null);
    setStatusLines([]);
    setRecipes([]);
    setIsGenerating(true);
    consecutiveFailuresRef.current = 0;

    try {
      const accessToken = await getAccessToken();
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 401) {
        setError('Sessie verlopen — log opnieuw in en probeer het opnieuw.');
        setIsGenerating(false);
        return;
      }
      if (!res.ok) throw new Error(`Server gaf status ${res.status}`);

      const { jobId } = (await res.json()) as { jobId: string };
      startPolling(jobId);
    } catch (err) {
      setError(
        `Kon het genereren niet starten: ${err instanceof Error ? err.message : 'onbekende fout'}. Probeer het opnieuw.`
      );
      setIsGenerating(false);
    }
  }, [startPolling, stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    jobIdRef.current = null;
    try {
      localStorage.removeItem(JOB_KEY);
    } catch {
      /* niet kritisch */
    }
    setIsGenerating(false);
  }, [stopPolling]);

  // Bij terugkeer naar de app (scherm weer aan / tab weer actief) meteen pollen
  // in plaats van te wachten op de timer — zo verschijnt het resultaat direct.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && jobIdRef.current) {
        stopPolling();
        void poll();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [poll, stopPolling]);

  // Bij mount opnieuw aanhaken op een eventueel nog lopende job (na refresh of
  // het opnieuw openen van de PWA).
  useEffect(() => {
    let resumed: string | null = null;
    try {
      resumed = localStorage.getItem(JOB_KEY);
    } catch {
      resumed = null;
    }
    if (resumed) startPolling(resumed);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { statusLines, recipes, isGenerating, error, generate, cancel };
}
