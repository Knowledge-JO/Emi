import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { CATALOG_IDS } from '../src/database/seed/ids';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';
const AGENT = CATALOG_IDS.agentSwapmaster;

const LISTING = {
  id: AGENT,
  slug: 'swapmaster',
  name: 'SwapMaster',
  description: 'Swaps BNB, USDT and USDC on PancakeSwap.',
  category: 'swap',
  version: '0.1.0',
  status: 'active',
  developer: {
    userId: 'user-1',
    slug: 'rill',
    displayName: 'Rill',
    verification: 'verified',
  },
  identity: {
    chainId: 56,
    registryAddress: '0x3333333333333333333333333333333333333333',
    onchainAgentId: '1',
    ownerAddress: null,
    agentDomain: 'swapmaster.rill.local',
    endpointUrl: null,
    lastSyncBlock: 0,
    lastSyncedAt: null,
  },
  capabilities: [],
};

describe('Reputation (e2e)', () => {
  let app: INestApplication<App>;
  let db: ReputationDatabase;

  beforeAll(async () => {
    db = new ReputationDatabase();
    app = await createTestApp({
      database: db,
      privy: fakePrivy(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves 0.5 until the projection writes a row', async () => {
    const card = await request(app.getHttpServer())
      .get('/identities/swapmaster')
      .expect(200);
    expect(card.body.reputation.score01).toBe(0.5);
  });

  it('refuses recompute and drain without Privy', async () => {
    await request(app.getHttpServer())
      .post('/reputation/recompute')
      .expect(401);
    await request(app.getHttpServer()).post('/events/outbox/drain').expect(401);
  });

  it('projects settled jobs onto the worker and records the watermark', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const recomputed = await request(app.getHttpServer())
      .post('/reputation/recompute')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(recomputed.body.agents).toBe(1);
    expect(recomputed.body.watermark).toBeGreaterThanOrEqual(2);
    expect(recomputed.body.scores[0].score).toBeGreaterThan(50);

    const card = await request(app.getHttpServer())
      .get('/identities/swapmaster')
      .expect(200);
    expect(card.body.reputation.score01).toBeGreaterThan(0.5);
    expect(db.reputationRows[0]?.sourceEventSeq).toBe(recomputed.body.watermark);
  });

  it('drains the outbox without appending new events', async () => {
    const before = db.events.length;
    const drained = await request(app.getHttpServer())
      .post('/events/outbox/drain')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(drained.body.sent).toBeGreaterThanOrEqual(1);
    expect(db.events.length).toBe(before);
    expect(db.eventOutbox[0]?.status).toBe('sent');
  });
});

class ReputationDatabase extends FakeDatabase {
  constructor() {
    super();
    this.events.push(
      {
        seq: 1,
        type: 'job.created',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'user',
        actorId: 'user-1',
        payload: { workerAgentId: AGENT, amount: '10000000000000000' },
      },
      {
        seq: 2,
        type: 'job.settled',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'user',
        actorId: 'user-1',
        payload: { workerAgentId: AGENT, amount: '10000000000000000' },
      },
    );

    const parent = this.query;
    this.query = {
      ...parent,
      agents: {
        findFirst: () => Promise.resolve(LISTING),
        findMany: () => Promise.resolve([LISTING]),
      },
      agentIdentities: {
        findFirst: () =>
          Promise.resolve({
            id: 'ident-1',
            agentId: LISTING.id,
            ...LISTING.identity,
          }),
        findMany: () => Promise.resolve([]),
      },
    };
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
