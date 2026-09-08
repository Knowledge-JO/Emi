import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

import type { RillConfigService } from '../../config/app.config';
import { EMBEDDING_DIMENSIONS } from '../../database/schema/common';
import { EmbeddingModel, type EmbeddingTask } from './embedding-model';

/** Gemini embeddings via `@google/genai`, truncated to the schema's 1536-dimension columns. */
@Injectable()
export class GeminiEmbeddingModel extends EmbeddingModel {
  readonly provider = 'gemini' as const;
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(@Inject(ConfigService) config: RillConfigService) {
    super();
    const apiKey = config.get('ai.geminiApiKey', { infer: true });
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required when AI_EMBEDDING_PROVIDER=gemini',
      );
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = config.get('ai.embeddingModel', { infer: true });
  }

  async embed(text: string, task: EmbeddingTask = 'query'): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.model,
      contents: text,
      config: {
        taskType:
          task === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY',
        outputDimensionality: this.dimensions,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length !== this.dimensions) {
      throw new Error(
        `Gemini embedding was ${values?.length ?? 0} dimensions; expected ${this.dimensions}`,
      );
    }

    return values;
  }
}
