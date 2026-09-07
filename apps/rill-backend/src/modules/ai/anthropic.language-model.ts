import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import type { RillConfigService } from '../../config/app.config';
import {
  LanguageModel,
  type GenerateJsonInput,
  type GenerateJsonResult,
} from './language-model';

/**
 * Anthropic has no native JSON-schema mode, so we force a single tool whose input is the schema.
 * The tool is never "executed" — we just read the arguments the model filled in.
 */
@Injectable()
export class AnthropicLanguageModel extends LanguageModel {
  readonly provider = 'anthropic' as const;
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(@Inject(ConfigService) config: RillConfigService) {
    super();
    const apiKey = config.get('ai.anthropicApiKey', { infer: true });
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic',
      );
    }
    this.client = new Anthropic({ apiKey });
    this.model = config.get('ai.plannerModel', { infer: true });
  }

  async generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult> {
    const started = Date.now();
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0,
      system: input.system,
      messages: [{ role: 'user', content: input.prompt }],
      tools: [
        {
          name: 'record_result',
          description:
            'Record the structured result. Call this with the extracted object.',
          input_schema: input.jsonSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'record_result' },
    });

    const block = message.content.find((part) => part.type === 'tool_use');
    if (!block || block.type !== 'tool_use') {
      throw new Error('Anthropic did not return a structured tool result');
    }

    return {
      json: block.input,
      model: this.model,
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
      latencyMs: Date.now() - started,
    };
  }
}
