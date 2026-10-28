// Shared by mail-inbound.service.ts (inbound email bodies) and the AI
// knowledge-base ingestion (fetched URL content) — same job either way:
// reduce HTML to plain text good enough for an LLM prompt, not a real
// DOM-aware parser.
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
