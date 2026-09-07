import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { RillConfigService } from '../../config/app.config';
import {
  LanguageModel,
  type GenerateJsonInput,
  type GenerateJsonResult,
} from './language-model';

@Injectable()
export class OpenAILanguageModel extends LanguageModel {
  readonly provider = 'openai' as const;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(@Inject(ConfigService) config: RillConfigService) {
    super();
    const apiKey = config.get('ai.openaiApiKey', { infer: true });
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
    }
    this.client = new OpenAI({ apiKey });
    this.model = config.get('ai.plannerModel', { infer: true });
  }

  async generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult> {
    const started = Date.now();
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          strict: true,
          schema: input.jsonSchema,
        },
      },
    });

    const text = completion.choices[0]?.message.content?.trim();
    if (!text) {
      throw new Error('OpenAI returned an empty response');
    }

    return {
      json: JSON.parse(text) as unknown,
      model: this.model,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }
}
