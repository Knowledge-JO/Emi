import { UnprocessableEntityException } from '@nestjs/common';

import type { EmbeddingModel } from '../ai/embedding-model';
import type { GenerateJsonResult, LanguageModel } from '../ai/language-model';
import { IntentParserService } from './intent-parser.service';
import { SWAP_FIVE_USDT } from './swap-five-usdt.fixture';

describe('IntentParserService', () => {
  const embedding = Array.from({ length: 1536 }, () => 0.01);

  const embeddings: EmbeddingModel = {
    provider: 'gemini',
    dimensions: 1536,
    embed: jest.fn().mockResolvedValue(embedding),
  };

  const language = (json: unknown): LanguageModel => ({
    provider: 'gemini',
    generateJson: jest.fn().mockResolvedValue({
      json,
      model: 'gemini-2.5-flash',
      promptTokens: 120,
      completionTokens: 80,
      latencyMs: 40,
    } satisfies GenerateJsonResult),
  });

  it('accepts a schema-valid swap intent', async () => {
    const parser = new IntentParserService(
      language(SWAP_FIVE_USDT),
      embeddings,
    );
    const result = await parser.parse('swap 5 usdt for bnb');

    expect(result.intent).toEqual(SWAP_FIVE_USDT);
    expect(result.intent.legs[0]?.from).toEqual({
      symbol: 'USDT',
      amount: '5',
    });
    expect(result.embedding).toHaveLength(1536);
  });

  it('rejects model output that does not match the schema', async () => {
    const parser = new IntentParserService(
      language({ kind: 'swap' }),
      embeddings,
    );

    await expect(parser.parse('swap 5 usdt for bnb')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('fails loudly when the model cannot extract an actionable intent', async () => {
    const parser = new IntentParserService(
      language({
        ...SWAP_FIVE_USDT,
        kind: 'unknown',
        rejected: true,
        rejectionReason: 'Not an on-chain outcome',
        legs: [],
      }),
      embeddings,
    );

    await expect(parser.parse('hello there')).rejects.toMatchObject({
      response: { code: 'intent_unparseable' },
    });
  });

  it('refuses a numeric amount — amounts must stay strings', async () => {
    const parser = new IntentParserService(
      language({
        ...SWAP_FIVE_USDT,
        legs: [
          {
            type: 'swap',
            taxonomyKey: 'defi.swap',
            from: { symbol: 'USDT', amount: 5 },
            to: { symbol: 'BNB', amount: null },
          },
        ],
      }),
      embeddings,
    );

    await expect(parser.parse('swap 5 usdt for bnb')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
