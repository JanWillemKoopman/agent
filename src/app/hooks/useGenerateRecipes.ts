'use client';

import { useCallback, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';
import type { FinalRecipe } from '@/lib/types';

interface StatusLine {
  step: number;
  message: string;
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
          if (!frame.trim() || frame.startsWith(':')) continue;
          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }

          if (event === 'status') {
            const parsed = JSON.parse(data) as StatusLine;
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
        setError(err instanceof Error ? err.message : 'Er ging iets mis.');
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
