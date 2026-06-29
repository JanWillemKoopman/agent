'use client';

import { useCallback, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';
import type { FinalRecipe } from '@/lib/types';

interface StatusLine {
  step: number;
  message: string;
}

function classifyError(err: unknown, lastStep: number): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // iOS/Safari: "Load failed" of "The network connection was lost"
  // Chrome/Android: "Failed to fetch" of "NetworkError"
  const isNetworkDrop =
    lower.includes('load failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network connection was lost') ||
    lower.includes('the internet connection appears to be offline');

  if (isNetworkDrop) {
    const stepNames: Record<number, string> = {
      1: 'aanbiedingen zoeken',
      2: 'recepten bedenken',
      3: 'kwaliteitscheck',
      4: 'prijzen ophalen',
      5: 'budget berekenen',
    };
    const where = lastStep > 0 ? ` (tijdens stap ${lastStep}: ${stepNames[lastStep] ?? ''})` : '';
    return `Verbinding verbroken${where}. Dit kan gebeuren als het scherm uitging. Probeer opnieuw.`;
  }

  if (msg.includes('401') || lower.includes('niet geautoriseerd')) {
    return 'Sessie verlopen — log opnieuw in en probeer het opnieuw.';
  }

  if (msg.includes('5') && /^Server gaf status 5\d\d/.test(msg)) {
    return `Server-fout (${msg}). Probeer het over een moment opnieuw.`;
  }

  return `Er ging iets mis: ${msg}`;
}

export function useGenerateRecipes() {
  const [statusLines, setStatusLines] = useState<StatusLine[]>([]);
  const [recipes, setRecipes] = useState<FinalRecipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setStatusLines([]);
    setRecipes([]);

    const controller = new AbortController();
    abortRef.current = controller;
    let lastStep = 0;

    try {
      const accessToken = await getAccessToken();

      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server gaf status ${res.status}`);
      }

      // SSE-frames handmatig parsen uit de fetch-stream.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          // Sla keep-alive comments en lege frames over.
          if (!frame.trim() || frame.startsWith(':')) continue;
          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }

          if (event === 'status') {
            const parsed = JSON.parse(data) as StatusLine;
            lastStep = parsed.step;
            setStatusLines((prev) => [...prev, parsed]);
          } else if (event === 'result') {
            const parsed = JSON.parse(data) as { recipes: FinalRecipe[] };
            setRecipes(parsed.recipes ?? []);
          } else if (event === 'error') {
            const parsed = JSON.parse(data) as { message: string };
            setError(parsed.message);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(classifyError(err, lastStep));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { statusLines, recipes, isGenerating, error, generate, cancel };
}
