import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

describe('Skills catalog (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      database: new FakeDatabase(),
      privy: fakePrivy(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses an unauthenticated catalog read', async () => {
    await request(app.getHttpServer()).get('/skills').expect(401);
  });

  it('lists pancakeswap-trading as competence that grants nothing', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/skills')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const pancake = list.body.find(
      (skill: { id: string }) => skill.id === 'pancakeswap-trading',
    );
    expect(pancake.writeOnchain).toBe(true);
    expect(pancake.mayNot).toContain('Send funds anywhere else');

    const detail = await request(app.getHttpServer())
      .get('/skills/pancakeswap-trading')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(detail.body.callAddresses).toEqual([
      '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    ]);
    expect(detail.body.addressTable.wbnb).toBe(
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    );
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
