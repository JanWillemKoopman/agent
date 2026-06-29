import { GoogleGenAI } from '@google/genai';

// Centrale model-ids. Hybride opzet:
// - FLASH: snel — voor Foragers (stap 1) en Shoppers (stap 4).
// - PRO:   culinaire kwaliteit — voor Chefs (stap 2) en Critic (stap 3).
export const GEMINI_FLASH = 'gemini-2.5-flash';
export const GEMINI_PRO = 'gemini-2.5-pro';
// Default blijft Flash voor calls die geen expliciet model meegeven.
export const GEMINI_MODEL = GEMINI_FLASH;

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
    model: opts.model ?? GEMINI_MODEL,
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
  const response = await ai.models.generateContent({
    model: opts.model ?? GEMINI_MODEL,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemInstruction,
      tools: [{ googleSearch: {} }],
      temperature: 0.4,
    },
  });
  return extractJson<T>(response.text ?? '');
}
