import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { apiKeys } from '../src/database/schema';
import { AGENT_API_KEY_PREFIX } from '../src/modules/auth/api-key.service';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { encodeAgentUri } from '../src/modules/identity/erc8004-codec';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';
const LISTING = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa30',
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
  capabilities: [
    {
      id: 'cap-1',
      name: 'swap',
      taxonomyKey: 'defi.swap',
      description: 'Swap listed assets',
      pricingModel: 'per_job',
      settlementRail: 'erc8183',
      unitPrice: '10000000000000000',
      expectedDurationSeconds: 60,
      status: 'active',
    },
  ],
};

describe('Identity (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const db = new IdentityDatabase();
    app = await createTestApp({
      database: db,
      privy: fakePrivy(),
      erc8004Reader: {
        ownerOf: async () => '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        tokenURI: async () =>
          encodeAgentUri({
            name: 'SomeoneElse',
            description: 'not ours',
          }),
        blockNumber: async () => 1_000n,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves a public identity card without Privy', async () => {
    const res = await request(app.getHttpServer())
      .get('/identities/swapmaster')
      .expect(200);

    expect(res.body.slug).toBe('swapmaster');
    expect(res.body.developer.slug).toBe('rill');
    expect(res.body.capabilities[0].taxonomyKey).toBe('defi.swap');
    expect(res.body.identity.synced).toBe(false);
    expect(res.body.reputation.score01).toBe(0.5);
  });

  it('re-reads the registry on ?live=1 without treating a stranger NFT as SwapMaster', async () => {
    const res = await request(app.getHttpServer())
      .get('/identities/swapmaster?live=1')
      .expect(200);

    expect(res.body.live.listingMatchesOnchain).toBe(false);
    expect(res.body.live.onchainName).toBe('SomeoneElse');
    expect(res.body.identity.agentDomain).toBe('swapmaster.rill.local');
  });

  it('issues an agent key only to the listing developer and resolves /identities/me', async () => {
    await request(app.getHttpServer())
      .post('/identities/swapmaster/keys')
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const issued = await request(app.getHttpServer())
      .post('/identities/swapmaster/keys')
      .set('Authorization', 'Bearer good-token')
      .send({ name: 'e2e' })
      .expect(201);

    expect(issued.body.secret.startsWith(AGENT_API_KEY_PREFIX)).toBe(true);
    expect(issued.body.secret).not.toBe(issued.body.prefix);

    const me = await request(app.getHttpServer())
      .get('/identities/me')
      .set('Authorization', `Bearer ${issued.body.secret}`)
      .expect(200);

    expect(me.body.slug).toBe('swapmaster');
    expect(me.body.identity.onchainAgentId).toBe('1');
  });
});

class IdentityDatabase extends FakeDatabase {
  listing = LISTING;
  issuedKeys: Array<Record<string, unknown>> = [];

  constructor() {
    super();
    const parent = this.query;
    this.query = {
      ...parent,
      agents: {
        findFirst: () => Promise.resolve(this.listing),
        findMany: () => Promise.resolve([this.listing]),
      },
      agentIdentities: {
        findFirst: () =>
          Promise.resolve({
            id: 'ident-1',
            agentId: this.listing.id,
            ...this.listing.identity,
          }),
        findMany: () => Promise.resolve([]),
      },
      apiKeys: {
        findFirst: () => {
          const row = this.issuedKeys[0];
          if (!row) return Promise.resolve(undefined);
          return Promise.resolve({
            ...row,
            agent: {
              slug: this.listing.slug,
              identity: { id: 'ident-1', ...this.listing.identity },
            },
          });
        },
      },
    };
  }

  override insert(table: unknown) {
    if (table === apiKeys) {
      const append = (values: Record<string, unknown>) => {
        const row = {
          id: 'key-1',
          status: 'active',
          expiresAt: null,
          ...values,
        };
        this.issuedKeys.push(row);
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
    return super.insert(table);
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
