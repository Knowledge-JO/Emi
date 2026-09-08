import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { jobs } from '../src/database/schema';
import { CATALOG_IDS } from '../src/database/seed/ids';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { ERC8183_CHAIN_READER } from '../src/modules/commerce/erc8183/erc8183-read';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

describe('ERC-8183 jobs (e2e)', () => {
  let app: INestApplication<App>;
  let db: JobsDatabase;

  beforeAll(async () => {
    db = new JobsDatabase();
    app = await createTestApp({
      database: db,
      privy: fakePrivy(),
      erc8183Reader: {
        jobCounter: async () => 6n,
        disputeWindow: async () => 3600n,
        getJob: async () => {
          throw new Error('not minted');
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses an unauthenticated hire', async () => {
    await request(app.getHttpServer()).post('/jobs').send({}).expect(401);
  });

  it('creates a user→agent job and refuses self-hire shape via cancel', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', 'Bearer good-token')
      .send({
        workerSlug: 'swapmaster',
        task: 'Swap 5 USDT for BNB and report the receipt',
      })
      .expect(201);

    expect(created.body.job.status).toBe('created');
    expect(created.body.job.hirerKind).toBe('user');
    expect(created.body.job.amount).toBe('10000000000000000');
    expect(created.body.predictedJobId).toBe('7');
    expect(created.body.hireCalls).toHaveLength(5);
    expect(created.body.job.specHash).toMatch(/^0x[0-9a-f]{64}$/);

    const listed = await request(app.getHttpServer())
      .get('/jobs')
      .set('Authorization', 'Bearer good-token')
      .expect(200);
    expect(listed.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/jobs/${created.body.job.id}/cancel`)
      .set('Authorization', 'Bearer good-token')
      .expect(201);
  });
});

class JobsDatabase extends FakeDatabase {
  storedJobs: Array<Record<string, unknown>> = [];

  constructor() {
    super();
    const parent = this.query;
    this.query = {
      ...parent,
      agents: {
        findFirst: () =>
          Promise.resolve({
            id: CATALOG_IDS.agentSwapmaster,
            slug: 'swapmaster',
            status: 'active',
            identity: { onchainAgentId: '1' },
            capabilities: [
              {
                id: CATALOG_IDS.capabilitySwap,
                name: 'swap',
                taxonomyKey: 'defi.swap',
                status: 'active',
                settlementRail: 'erc8183',
                pricingModel: 'per_job',
                unitPrice: '10000000000000000',
                priceAssetId: CATALOG_IDS.assetU,
              },
            ],
          }),
        findMany: () => Promise.resolve([]),
      },
      assets: {
        findFirst: () =>
          Promise.resolve({
            id: CATALOG_IDS.assetU,
            chainId: 56,
            address: '0xce24439f2d9c6a2289f741120fe202248b666666',
            symbol: '$U',
          }),
      },
      wallets: {
        findFirst: () =>
          Promise.resolve({
            id: 'wallet-agent-1',
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            ownerKind: 'agent',
            ownerAgentId: CATALOG_IDS.agentSwapmaster,
          }),
      },
      jobs: {
        findFirst: () => Promise.resolve(this.storedJobs[0]),
        findMany: () => Promise.resolve(this.storedJobs),
      },
      sessions: {
        findFirst: () => Promise.resolve(undefined),
      },
    };
  }

  override insert(table: unknown) {
    if (table === jobs) {
      return {
        values: (values: Record<string, unknown>) => ({
          returning: () => {
            const row = {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
              onchainJobId: null,
              ...values,
            };
            this.storedJobs.push(row);
            return Promise.resolve([row]);
          },
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
      };
    }
    return super.insert(table);
  }

  override update(table: unknown) {
    if (table === jobs) {
      return {
        set: (values: Record<string, unknown>) => ({
          where: () => ({
            returning: () => {
              this.storedJobs[0] = { ...this.storedJobs[0], ...values };
              return Promise.resolve([this.storedJobs[0]]);
            },
          }),
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
