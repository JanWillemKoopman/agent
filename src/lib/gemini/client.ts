import { GoogleGenAI } from '@google/genai';

// Centrale model-ids.
// - FLASH_LITE: snel + goedkoop — voor Shoppers (stap 4).
// - CHEF:       culinaire kwaliteit — voor Chefs (stap 2) en Critic (stap 3).
// - FORAGER:    grounded search (stap 1) — gemini-3.5-flash.
//
// Winkels worden serieel verwerkt (één tegelijk) zodat de ~25 parallelle calls
// per winkel binnen het RPM-quotum blijven. Retry met backoff vangt incidentele
// 429s op.
export const GEMINI_FLASH_LITE = 'gemini-2.5-flash-lite';
export const GEMINI_CHEF = 'gemini-2.5-flash';
export const GEMINI_FORAGER = 'gemini-3.5-flash';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ontbreekt in de omgeving.');
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Haalt het eerste JSON-array/-object uit een tekst en parset het.
 * Robuust tegen markdown-codeblokken en omringende tekst — nodig voor calls
 * met de google_search tool, waar `responseSchema` niet toegestaan is.
 */
export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Val terug op het eerste { ... } of [ ... ] blok.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error('Kon geen geldige JSON uit het Gemini-antwoord halen.');
  }
}

/**
 * Genereert structured JSON met een vast schema (geen tools/search).
 * Gebruikt voor de Chefs en de Critic.
 */
export async function generateStructured<T>(opts: {
  systemInstruction?: string;
  prompt: string;
  responseSchema: unknown;
  model?: string;
}): Promise<T> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: opts.model ?? GEMINI_FLASH_LITE,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: opts.responseSchema as never,
      temperature: 0.7,
    },
  });
  return extractJson<T>(response.text ?? '');
}

/**
 * Retry-wrapper met exponential backoff voor 429 (RESOURCE_EXHAUSTED).
 * De forager vuurt tot 25 parallelle calls per winkel — bij meerdere winkels
 * kan dat het RPM-quotum overschrijden. Een korte pauze + retry is dan
 * effectiever dan direct falen.
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 =
        err instanceof Error &&
        (err.message.includes('429') ||
          err.message.includes('RESOURCE_EXHAUSTED') ||
          err.message.includes('quota'));
      if (!is429 || attempt >= maxAttempts) throw err;
      const delayMs = 2000 * 2 ** (attempt - 1); // 2s, 4s
      console.warn(`[Gemini] 429 rate-limit, retry ${attempt}/${maxAttempts} na ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/**
 * Genereert JSON met de google_search grounding-tool ingeschakeld.
 * `responseSchema` mag hier niet, dus we vragen JSON in de prompt en parsen
 * het antwoord defensief. Gebruikt voor de Foragers en Shoppers.
 */
export async function generateGroundedJson<T>(opts: {
  systemInstruction?: string;
  prompt: string;
  model?: string;
}): Promise<T> {
  const ai = getGeminiClient();
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: opts.model ?? GEMINI_FLASH_LITE,
      contents: opts.prompt,
      config: {
        systemInstruction: opts.systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
    });
    return extractJson<T>(response.text ?? '');
  });
}
