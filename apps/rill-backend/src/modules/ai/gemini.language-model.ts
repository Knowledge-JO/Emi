import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

import type { RillConfigService } from '../../config/app.config';
import {
  LanguageModel,
  type GenerateJsonInput,
  type GenerateJsonResult,
} from './language-model';

/**
 * Gemini via the official `@google/genai` SDK. Structured output is enforced with
 * `responseJsonSchema`; the caller still re-validates with Zod because a schema hint is not a
 * guarantee.
 */
@Injectable()
export class GeminiLanguageModel extends LanguageModel {
  readonly provider = 'gemini' as const;
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(@Inject(ConfigService) config: RillConfigService) {
    super();
    const apiKey = config.get('ai.geminiApiKey', { infer: true });
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = config.get('ai.plannerModel', { infer: true });
  }

  async generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult> {
    const started = Date.now();
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: input.prompt,
      config: {
        systemInstruction: input.system,
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: input.jsonSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return {
      json: JSON.parse(text) as unknown,
      model: this.model,
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs: Date.now() - started,
    };
  }
}
