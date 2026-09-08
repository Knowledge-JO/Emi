import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { BSC_ADDRESSES, CATALOG_IDS } from '../src/database/seed/ids';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import type { PlanResponse } from '../src/modules/orchestrator/orchestrator.service';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

const PLAN: PlanResponse = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa40',
  intentId: 'intent-1',
  status: 'awaiting_authorization',
  engine: 'inline',
  walletId: null,
  missing: ['wallet'],
  assumptions: [
    'Spend cap includes 0.5% slippage; the swap notional is unchanged.',
  ],
  steps: [
    {
      stepKey: 'leg-0',
      sequence: 1,
      kind: 'agent_job',
      paymentRail: 'erc8183',
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
      skillId: 'pancakeswap-trading',
      input: {
        fromSymbol: 'USDT',
        toSymbol: 'BNB',
        amount: '5',
        chain: 'bnb',
      },
    },
  ],
  skills: [
    {
      id: 'pancakeswap-trading',
      name: 'PancakeSwap Trading',
      source:
        'https://github.com/altananetwork/skills/blob/main/skills/pancakeswap-trading/SKILL.md',
      category: 'Trading',
      writeOnchain: true,
      may: ['Trade on PancakeSwap', 'Spend up to the cap you set'],
      mayNot: ['Send funds anywhere else', 'Touch any other app or token'],
    },
  ],
  authorizationPlan: {
    calls: [
      { to: BSC_ADDRESSES.pancakeV2Router, protocolSlug: 'pancakeswap' },
      { to: BSC_ADDRESSES.usdt, protocolSlug: 'erc20' },
    ],
    spend: [
      {
        token: BSC_ADDRESSES.usdt,
        limit: '5025000000000000000',
        period: 'day',
      },
    ],
    expiry: 1_700_000_900,
  },
  sessionId: null,
  sessionPublicKey: null,
  sessionStatus: null,
  granted: false,
  temporalWorkflowId: null,
  temporalRunId: null,
  execution: {
    status: 'idle',
    play: null,
    amountIn: null,
    amountOut: null,
    amountOutMin: null,
    path: null,
    transactionHash: null,
    callsId: null,
    error: null,
  },
};

const GRANTED: PlanResponse = {
  ...PLAN,
  status: 'authorized',
  walletId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa50',
  missing: [],
  sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa51',
  sessionPublicKey:
    '0x04aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  sessionStatus: 'active',
  granted: true,
};

describe('Orchestrator plan (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      database: new FakeDatabase(),
      privy: fakePrivy(),
      orchestrator: {
        planForUser: () => Promise.resolve(PLAN),
        getPlanForUser: () => Promise.resolve(PLAN),
        grantForUser: () => Promise.resolve(GRANTED),
        executeForUser: () =>
          Promise.resolve({
            ...GRANTED,
            status: 'completed',
            execution: {
              status: 'succeeded',
              play: 'enter-position',
              amountIn: '5000000000000000000',
              amountOut: '10000000000000000',
              amountOutMin: '9950000000000000',
              path: [BSC_ADDRESSES.usdt, BSC_ADDRESSES.wbnb],
              transactionHash:
                '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
              callsId:
                '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
              error: null,
            },
          }),
        revokeForUser: () =>
          Promise.resolve({
            ...GRANTED,
            status: 'cancelled',
            sessionStatus: 'revoked',
          }),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses an unauthenticated plan', async () => {
    await request(app.getHttpServer())
      .post('/orchestrator/plans')
      .send({ intentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41' })
      .expect(401);
  });

  it('returns a SwapMaster plan that has not been granted', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const response = await request(app.getHttpServer())
      .post('/orchestrator/plans')
      .set('Authorization', 'Bearer good-token')
      .send({ intentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41' })
      .expect(201);

    expect(response.body.granted).toBe(false);
    expect(response.body.status).toBe('awaiting_authorization');
    expect(response.body.steps[0].agent.slug).toBe('swapmaster');
    expect(response.body.steps[0].skillId).toBe('pancakeswap-trading');
    expect(response.body.skills[0].id).toBe('pancakeswap-trading');
    expect(response.body.authorizationPlan.spend[0].limit).toBe(
      '5025000000000000000',
    );
    expect(response.body.missing).toContain('wallet');
  });

  it('records a grant without executing a swap', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/orchestrator/plans/${PLAN.id}/grant`)
      .set('Authorization', 'Bearer good-token')
      .send({
        walletAddress: '0x1111111111111111111111111111111111111111',
        publicKey:
          '0x04aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sessionPrivateKey:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        expiry: 1_700_000_800,
        permissions: {
          calls: PLAN.authorizationPlan.calls.map((call) => ({ to: call.to })),
          spend: PLAN.authorizationPlan.spend,
        },
      })
      .expect(201);

    expect(response.body.granted).toBe(true);
    expect(response.body.sessionId).toBe(GRANTED.sessionId);
    expect(response.body.status).toBe('authorized');
  });

  it('executes an authorized plan through the session', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/orchestrator/plans/${PLAN.id}/execute`)
      .set('Authorization', 'Bearer good-token')
      .expect(201);

    expect(response.body.status).toBe('completed');
    expect(response.body.execution.status).toBe('succeeded');
    expect(response.body.execution.play).toBe('enter-position');
    expect(response.body.execution.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('records a browser revoke without executing', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/orchestrator/plans/${PLAN.id}/revoke`)
      .set('Authorization', 'Bearer good-token')
      .send({
        revokeTxHash:
          '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      })
      .expect(201);

    expect(response.body.sessionStatus).toBe('revoked');
    expect(response.body.status).toBe('cancelled');
  });
});

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
