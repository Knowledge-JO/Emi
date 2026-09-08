/**
 * Embeddings for discovery. Anthropic has no embedding model, so this port is Gemini or OpenAI
 * only — `AI_EMBEDDING_PROVIDER` is independent of `AI_PROVIDER`.
 *
 * Output length is always `EMBEDDING_DIMENSIONS` (1536) so a provider switch does not invalidate
 * the `vector` columns.
 *
 * `query` is a user message or goal node; `document` is a capability we index. Gemini uses
 * matching task types; OpenAI ignores the distinction (same embedding space).
 */
export type EmbeddingTask = 'query' | 'document';

export abstract class EmbeddingModel {
  abstract readonly provider: 'gemini' | 'openai';
  abstract readonly dimensions: number;

  abstract embed(text: string, task?: EmbeddingTask): Promise<number[]>;
}
