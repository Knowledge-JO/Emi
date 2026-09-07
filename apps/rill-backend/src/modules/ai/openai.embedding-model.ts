import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { RillConfigService } from '../../config/app.config';
import { EMBEDDING_DIMENSIONS } from '../../database/schema/common';
import { EmbeddingModel } from './embedding-model';

@Injectable()
export class OpenAIEmbeddingModel extends EmbeddingModel {
  readonly provider = 'openai' as const;
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(@Inject(ConfigService) config: RillConfigService) {
    super();
    const apiKey = config.get('ai.openaiApiKey', { infer: true });
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required when AI_EMBEDDING_PROVIDER=openai',
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = config.get('ai.embeddingModel', { infer: true });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    });

    const values = response.data[0]?.embedding;
    if (!values || values.length !== this.dimensions) {
      throw new Error(
        `OpenAI embedding was ${values?.length ?? 0} dimensions; expected ${this.dimensions}`,
      );
    }

    return values;
  }
}
