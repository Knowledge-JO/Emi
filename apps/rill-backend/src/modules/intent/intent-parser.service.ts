import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import type { ParsedIntent } from '../../database/schema/intents';
import { EmbeddingModel } from '../ai/embedding-model';
import { LanguageModel } from '../ai/language-model';
import {
  INTENT_PARSER_SYSTEM,
  parsedIntentJsonSchema,
  parsedIntentSchema,
} from './parsed-intent.schema';

export type ParsedIntentResult = {
  intent: ParsedIntent;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  embedding: number[];
};

/**
 * Turns free text into a schema-validated intent object. An unparseable or rejected message fails
 * loudly rather than becoming a guessed swap.
 */
@Injectable()
export class IntentParserService {
  constructor(
    private readonly language: LanguageModel,
    private readonly embeddings: EmbeddingModel,
  ) {}

  async parse(rawText: string): Promise<ParsedIntentResult> {
    const [generated, embedding] = await Promise.all([
      this.language.generateJson({
        jsonSchema: parsedIntentJsonSchema,
        system: INTENT_PARSER_SYSTEM,
        prompt: rawText,
      }),
      this.embeddings.embed(rawText),
    ]);

    const parsed = parsedIntentSchema.safeParse(generated.json);

    if (!parsed.success) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'intent_schema_mismatch',
        error: 'Model output did not match the intent schema',
        details: parsed.error.issues,
      });
    }

    if (parsed.data.rejected || parsed.data.kind === 'unknown') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'intent_unparseable',
        error:
          parsed.data.rejectionReason ??
          'Could not extract an actionable intent',
        details: parsed.data,
      });
    }

    return {
      intent: parsed.data,
      model: generated.model,
      promptTokens: generated.promptTokens,
      completionTokens: generated.completionTokens,
      latencyMs: generated.latencyMs,
      embedding,
    };
  }
}
