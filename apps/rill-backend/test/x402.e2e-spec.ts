import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { QUOTE_PRICE, settlementToken } from '../src/modules/commerce/x402/x402-challenge';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';
const MERCHANT = '0x1111111111111111111111111111111111111111';
const PAYER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('x402 (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      database: new FakeDatabase(),
      privy: fakePrivy(),
      x402Facilitator: {
        verify: () => Promise.resolve({ valid: true }),
        settle: () =>
          Promise.resolve({
            success: true,
            txHash:
              '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          }),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a 402 challenge for an unpaid quote', async () => {
    const res = await request(app.getHttpServer())
      .get('/capabilities/quote')
      .expect(402);

    expect(res.body.x402Version).toBe(2);
    expect(res.body.resource.url).toMatch(/\/capabilities\/quote$/);
    expect(res.body.accepts[0]).toMatchObject({
      scheme: 'exact',
      network: 'eip155:56',
      asset: settlementToken(56),
      amount: QUOTE_PRICE,
      payTo: MERCHANT,
      extra: { assetTransferMethod: 'permit2-exact' },
    });
  });

  it('returns the quote after facilitator settlement', async () => {
    const header = encodePayment({
      payTo: MERCHANT,
      asset: settlementToken(56),
      amount: QUOTE_PRICE,
    });

    const res = await request(app.getHttpServer())
      .get('/capabilities/quote')
      .set('X-PAYMENT', header)
      .expect(200);

    expect(res.body.paid).toBe(true);
    expect(res.body.pair).toBe('USDT/BNB');
  });

  it('refuses outbound fetch without a session', async () => {
    await request(app.getHttpServer()).post('/x402/fetch').expect(401);

    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/x402/fetch')
      .set('Authorization', 'Bearer good-token')
      .send({ url: 'https://risk.example/score' })
      .expect(422);

    expect(res.body.code).toBe('x402_session_required');
  });
});

function encodePayment(input: {
  payTo: string;
  asset: string;
  amount: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 2,
      accepted: {
        scheme: 'exact',
        network: 'eip155:56',
        asset: input.asset,
        amount: input.amount,
        payTo: input.payTo,
        extra: { assetTransferMethod: 'permit2-exact' },
      },
      payload: {
        from: PAYER,
        permit: { nonce: '1' },
      },
    }),
  ).toString('base64');
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
