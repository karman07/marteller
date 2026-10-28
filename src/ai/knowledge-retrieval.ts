import type { DataSource } from './schemas/ai-config.schema';

const CHUNK_SIZE = 500;

export type RetrievedChunk = {
  sourceName: string;
  text: string;
  score: number;
};

// Lexical (keyword-overlap) retrieval, not embeddings/vector search — see
// the plan comment on AiReplyService for why. Splits each ready data
// source's content into ~CHUNK_SIZE paragraph chunks, scores each by how
// many of the query's distinct words it contains (normalized by chunk
// length so a short, dense match beats a long chunk that happens to
// contain a few query words), and returns the topK highest-scoring chunks
// across all sources combined.
export function retrieveRelevantChunks(
  dataSources: DataSource[],
  query: string,
  topK = 3,
): RetrievedChunk[] {
  const queryWords = tokenize(query);
  if (queryWords.size === 0) return [];

  const candidates: RetrievedChunk[] = [];
  for (const source of dataSources) {
    if (source.status !== 'ready' || !source.content) continue;
    for (const chunk of chunkText(source.content)) {
      const score = scoreChunk(chunk, queryWords);
      if (score > 0) candidates.push({ sourceName: source.name, text: chunk, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, topK);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
}

function chunkText(content: string): string[] {
  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (current && (current.length + p.length) > CHUNK_SIZE) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  // A single giant paragraph with no blank-line breaks still needs
  // splitting, or it becomes one enormous "chunk" that always wins.
  return chunks.flatMap((c) =>
    c.length <= CHUNK_SIZE * 1.5 ? [c] : splitLong(c),
  );
}

function splitLong(text: string): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    parts.push(text.slice(i, i + CHUNK_SIZE));
  }
  return parts;
}

function scoreChunk(chunk: string, queryWords: Set<string>): number {
  const chunkWords = tokenize(chunk);
  if (chunkWords.size === 0) return 0;
  let matches = 0;
  for (const w of queryWords) {
    if (chunkWords.has(w)) matches += 1;
  }
  return matches / Math.sqrt(chunkWords.size);
}
