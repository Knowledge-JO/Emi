import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { EMBEDDING_DIMENSIONS } from '../src/database/schema';
import { CATALOG_IDS } from '../src/database/seed/ids';
import type { EmbeddingModel } from '../src/modules/ai/embedding-model';
import type { LanguageModel } from '../src/modules/ai/language-model';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { PROTECT_BNB_LOAN } from '../src/modules/intent/protect-loan.fixture';
import { SWAP_FIVE_USDT } from '../src/modules/intent/swap-five-usdt.fixture';
import type { MarketplaceMatchingService } from '../src/modules/marketplace/marketplace-matching.service';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

let parsedKind: 'swap' | 'protect' = 'swap';

describe('Intent parse (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeAll(async () => {
    db = new FakeDatabase();
    app = await createTestApp({
      database: db,
      privy: fakePrivy(),
      languageModel: fakeLanguage(),
      embeddingModel: fakeEmbeddings(),
      matching: swapMasterMatching(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses an unauthenticated parse', async () => {
    await request(app.getHttpServer())
      .post('/intents')
      .send({ text: 'swap 5 usdt for bnb' })
      .expect(401);
  });

  it('turns a swap message into the standard intent object', async () => {
    parsedKind = 'swap';
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const response = await request(app.getHttpServer())
      .post('/intents')
      .set('Authorization', 'Bearer good-token')
      .send({ text: 'swap 5 usdt for bnb' })
      .expect(201);

    expect(response.body.intent).toEqual(SWAP_FIVE_USDT);
    expect(response.body.intent.legs[0].from.amount).toBe('5');
    expect(response.body.embeddingDimensions).toBe(EMBEDDING_DIMENSIONS);
    expect(response.body.status).toBe('resolved');
    expect(response.body.capabilityGraph).toEqual([
      {
        id: 'leg-0',
        goalId: 'execute',
        taxonomyKey: 'defi.swap',
        dependsOn: [],
        input: {
          fromSymbol: 'USDT',
          toSymbol: 'BNB',
          amount: '5',
          chain: 'bnb',
        },
      },
    ]);
    expect(response.body.matches).toEqual([
      expect.objectContaining({
        requestedTaxonomyKey: 'defi.swap',
        rank: 1,
        agent: expect.objectContaining({
          slug: 'swapmaster',
          name: 'SwapMaster',
        }),
        capability: expect.objectContaining({
          taxonomyKey: 'defi.swap',
        }),
      }),
    ]);
    expect(response.body.unmatchedTaxonomyKeys).toEqual([]);
    expect(db.intents).toHaveLength(1);
    expect(db.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['intent.parsed', 'intent.resolved']),
    );
  });

  it('expands a protect message into a catalog DAG', async () => {
    parsedKind = 'protect';
    const response = await request(app.getHttpServer())
      .post('/intents')
      .set('Authorization', 'Bearer good-token')
      .send({ text: 'protect my bnb loan' })
      .expect(201);

    expect(response.body.intent.kind).toBe('protect');
    expect(
      response.body.capabilityGraph.map(
        (node: { id: string; taxonomyKey: string; dependsOn: string[] }) => [
          node.id,
          node.taxonomyKey,
          node.dependsOn,
        ],
      ),
    ).toEqual([
      ['monitor', 'research.screen', []],
      ['risk', 'risk.health_factor', ['monitor']],
      ['swap', 'defi.swap', ['risk']],
      ['repay', 'defi.lending.supply', ['swap', 'risk']],
    ]);
  });
});

function fakeLanguage(): LanguageModel {
  return {
    provider: 'gemini',
    generateJson: async () => ({
      json: parsedKind === 'protect' ? PROTECT_BNB_LOAN : SWAP_FIVE_USDT,
      model: 'gemini-2.5-flash',
      promptTokens: 10,
      completionTokens: 20,
      latencyMs: 5,
    }),
  };
}

function fakeEmbeddings(): EmbeddingModel {
  return {
    provider: 'gemini',
    dimensions: EMBEDDING_DIMENSIONS,
    embed: async () => Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0),
  };
}

function swapMasterMatching(): Pick<
  MarketplaceMatchingService,
  'matchIntent' | 'listForIntent'
> {
  return {
    matchIntent: (input) =>
      Promise.resolve({
        unmatchedTaxonomyKeys: [],
        matches: [
          {
            graphNodeId: input.graph[0]?.id ?? 'leg-0',
            requestedTaxonomyKey: 'defi.swap',
            rank: 1,
            score: 0.85,
            capabilityFitScore: 1,
            priceScore: 1,
            availabilityScore: 1,
            reputationScore: 0.5,
            quotedPrice: '10000000000000000',
            quotedAssetId: CATALOG_IDS.assetUsdt,
            settlementRail: 'erc8183',
            match: 'exact',
            agent: {
              id: CATALOG_IDS.agentSwapmaster,
              slug: 'swapmaster',
              name: 'SwapMaster',
            },
            capability: {
              id: CATALOG_IDS.capabilitySwap,
              name: 'swap',
              taxonomyKey: 'defi.swap',
            },
          },
        ],
      }),
    listForIntent: () => Promise.resolve([]),
  };
}

function fakePrivy(): PrivyIdentity {
  return {
    async verifyAccessToken(accessToken: string, identityToken: string | null) {
      if (accessToken !== 'good-token') {
        throw new UnauthorizedException(
          'Invalid or expired Privy access token',
        );
      }

      return {
        did: DID,
        sessionId: 'privy-session-1',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T01:00:00.000Z'),
        unverifiedIdentityToken: identityToken,
      };
    },
    async readProfile() {
      return { email: null };
    },
  };
}
