import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { EMBEDDING_DIMENSIONS } from '../src/database/schema';
import {
  agentIdentities,
  agents,
  capabilities,
  developers,
} from '../src/database/schema';
import { EmbeddingModel } from '../src/modules/ai/embedding-model';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

describe('Publisher registry (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      database: new PublisherDatabase(),
      privy: fakePrivy(),
      embeddingModel: new ZeroEmbedding(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses the publisher flow without Privy', async () => {
    await request(app.getHttpServer()).post('/marketplace/publishers').expect(401);
    await request(app.getHttpServer()).post('/marketplace/agents').expect(401);
  });

  it('registers a draft and refuses publish until identity + capability exist', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    await request(app.getHttpServer())
      .post('/marketplace/agents')
      .set('Authorization', 'Bearer good-token')
      .send({
        slug: 'radar-one',
        name: 'Radar One',
        description: 'Screens tokens.',
        category: 'research',
        skillId: 'dexscreener-token-radar',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/marketplace/publishers')
      .set('Authorization', 'Bearer good-token')
      .send({ slug: 'acme', displayName: 'Acme' })
      .expect(200);

    const draft = await request(app.getHttpServer())
      .post('/marketplace/agents')
      .set('Authorization', 'Bearer good-token')
      .send({
        slug: 'radar-one',
        name: 'Radar One',
        description: 'Screens tokens.',
        category: 'research',
        skillId: 'dexscreener-token-radar',
        acceptsErc8183: true,
      })
      .expect(201);

    expect(draft.body.status).toBe('draft');

    await request(app.getHttpServer())
      .post('/marketplace/agents/radar-one/publish')
      .set('Authorization', 'Bearer good-token')
      .expect(400);

    await request(app.getHttpServer())
      .post('/marketplace/agents/radar-one/identity')
      .set('Authorization', 'Bearer good-token')
      .send({ onchainAgentId: '9', agentDomain: 'radar.acme.local' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/marketplace/agents/radar-one/capabilities')
      .set('Authorization', 'Bearer good-token')
      .send({
        name: 'screen',
        taxonomyKey: 'research.screen',
        description: 'Screen tokens. No trades.',
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        pricingModel: 'per_job',
        settlementRail: 'erc8183',
        unitPrice: '10000000000000000',
        priceAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa14',
        assetIds: [],
        protocolIds: [],
      })
      .expect(201);

    const published = await request(app.getHttpServer())
      .post('/marketplace/agents/radar-one/publish')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(published.body.status).toBe('active');
  });
});

class ZeroEmbedding extends EmbeddingModel {
  readonly provider = 'gemini' as const;
  readonly dimensions = EMBEDDING_DIMENSIONS;
  embed(): Promise<number[]> {
    return Promise.resolve(Array(this.dimensions).fill(0));
  }
}

class PublisherDatabase extends FakeDatabase {
  developers: Record<string, unknown>[] = [];
  listings: Record<string, unknown>[] = [];
  identities: Record<string, unknown>[] = [];
  caps: Record<string, unknown>[] = [];

  constructor() {
    super();
    const parent = this.query;
    this.query = {
      ...parent,
      developers: {
        findFirst: () => Promise.resolve(this.developers[0]),
      },
      agents: {
        findFirst: () => Promise.resolve(this.listings[0]),
        findMany: () => Promise.resolve(this.listings),
      },
      agentIdentities: {
        findFirst: () => Promise.resolve(this.identities[0]),
        findMany: () => Promise.resolve(this.identities),
      },
      capabilities: {
        findFirst: () => Promise.resolve(this.caps[0]),
        findMany: () => Promise.resolve(this.caps),
      },
    };
  }

  override insert(table: unknown) {
    const target =
      table === developers
        ? this.developers
        : table === agents
          ? this.listings
          : table === agentIdentities
            ? this.identities
            : table === capabilities
              ? this.caps
              : null;

    if (!target) {
      return super.insert(table);
    }

    const append = (values: Record<string, unknown>) => {
      const row = {
        id: `${target.length + 1}`,
        status: table === agents ? 'draft' : 'active',
        ...values,
      };
      target.push(row);
      return Promise.resolve([row]);
    };

    return {
      values: (values: Record<string, unknown>) => ({
        returning: () => append(values),
        onConflictDoNothing: () => ({
          returning: () => append(values),
        }),
      }),
    };
  }

  override update(table: unknown) {
    if (table === agents || table === capabilities) {
      const list = table === agents ? this.listings : this.caps;
      return {
        set: (values: Record<string, unknown>) => ({
          where: () => {
            if (list[0]) list[0] = { ...list[0], ...values };
            const done = Promise.resolve(list[0] ? [list[0]] : []);
            return Object.assign(done, { returning: () => done });
          },
        }),
      };
    }
    return super.update(table);
  }
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
