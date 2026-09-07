import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { EMBEDDING_DIMENSIONS } from '../src/database/schema';
import type { EmbeddingModel } from '../src/modules/ai/embedding-model';
import type { LanguageModel } from '../src/modules/ai/language-model';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { SWAP_FIVE_USDT } from '../src/modules/intent/swap-five-usdt.fixture';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

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
    expect(db.intents).toHaveLength(1);
    expect(db.events.map((event) => event.type)).toContain('intent.parsed');
  });
});

function fakeLanguage(): LanguageModel {
  return {
    provider: 'gemini',
    generateJson: async () => ({
      json: SWAP_FIVE_USDT,
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
