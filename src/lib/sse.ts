// Helpers om Server-Sent Events te formatteren als UTF-8 chunks.

const encoder = new TextEncoder();

/**
 * Formatteert een named SSE-event met JSON-payload tot een encoded chunk.
 * Resultaat: `event: <name>\ndata: <json>\n\n`
 */
export function sseEvent(event: string, data: unknown): Uint8Array {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
}

/** SSE-commentaarregel, handig als keep-alive ping. */
export function sseComment(text = 'keep-alive'): Uint8Array {
  return encoder.encode(`: ${text}\n\n`);
}
