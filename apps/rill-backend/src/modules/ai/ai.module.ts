import { Global, Module, type FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { AnthropicLanguageModel } from './anthropic.language-model';
import { EmbeddingModel } from './embedding-model';
import { GeminiEmbeddingModel } from './gemini.embedding-model';
import { GeminiLanguageModel } from './gemini.language-model';
import { LanguageModel } from './language-model';
import { OpenAIEmbeddingModel } from './openai.embedding-model';
import { OpenAILanguageModel } from './openai.language-model';

/**
 * Vendor SDKs stay inside this module. Feature code injects `LanguageModel` / `EmbeddingModel`
 * and never imports `@google/genai`, `openai`, or `@anthropic-ai/sdk`.
 */
const languageModelProvider: FactoryProvider = {
  provide: LanguageModel,
  inject: [ConfigService],
  useFactory: (config: RillConfigService) => {
    switch (config.get('ai.provider', { infer: true })) {
      case 'gemini':
        return new GeminiLanguageModel(config);
      case 'openai':
        return new OpenAILanguageModel(config);
      case 'anthropic':
        return new AnthropicLanguageModel(config);
    }
  },
};

const embeddingModelProvider: FactoryProvider = {
  provide: EmbeddingModel,
  inject: [ConfigService],
  useFactory: (config: RillConfigService) => {
    switch (config.get('ai.embeddingProvider', { infer: true })) {
      case 'gemini':
        return new GeminiEmbeddingModel(config);
      case 'openai':
        return new OpenAIEmbeddingModel(config);
    }
  },
};

@Global()
@Module({
  providers: [languageModelProvider, embeddingModelProvider],
  exports: [LanguageModel, EmbeddingModel],
})
export class AiModule {}
