import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { SessionResponse } from '../src/modules/auth/auth.controller';
import type { PrivyIdentity } from '../src/modules/auth/privy-identity.interface';
import type { UserResponse } from '../src/modules/users/users.service';
import { FakeDatabase, createTestApp } from './test-app';

const DID = 'did:privy:cm123456789';

/**
 * Exercises the sign-in flow through the real HTTP stack and the real module graph — the part
 * unit tests cannot reach: that the guard resolves inside another module's controller, that
 * routes are mounted where the frontend expects them, and that responses are shaped as promised.
 */
describe('Sign-in flow (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeAll(async () => {
    db = new FakeDatabase();
    app = await createTestApp({ database: db, privy: fakePrivy() });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).post('/auth/session').expect(401);
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('rejects a token Privy will not verify', async () => {
    await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer forged-token')
      .expect(401);
  });

  it('creates the account on first sign-in and records it', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .set('privy-id-token', 'identity-token')
      .expect(200);

    const body = response.body as SessionResponse;
    expect(body.user).toMatchObject({
      privyUserId: DID,
      email: 'batman@privy.io',
      status: 'active',
    });
    expect(body.session.privySessionId).toBe('privy-session-1');

    expect(db.users).toHaveLength(1);
    expect(db.events.map((event) => event.type)).toEqual([
      'user.created',
      'user.signed_in',
    ]);
  });

  it('returns the same account to a repeat sign-in', async () => {
    const first = await request(app.getHttpServer())
      .post('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer good-token')
      .expect(200);

    expect(db.users).toHaveLength(1);
    expect((me.body as UserResponse).id).toBe(
      (first.body as SessionResponse).user.id,
    );
  });

  it('records a sign-out', async () => {
    await request(app.getHttpServer())
      .delete('/auth/session')
      .set('Authorization', 'Bearer good-token')
      .expect(204);

    expect(db.events.at(-1)?.type).toBe('user.signed_out');
  });
});

function fakePrivy(): PrivyIdentity {
  return {
    verifyAccessToken(accessToken: string, identityToken: string | null) {
      if (accessToken !== 'good-token') {
        return Promise.reject(
          new UnauthorizedException('Invalid or expired Privy access token'),
        );
      }

      return Promise.resolve({
        did: DID,
        sessionId: 'privy-session-1',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T01:00:00.000Z'),
        unverifiedIdentityToken: identityToken,
      });
    },
    readProfile() {
      return Promise.resolve({ email: 'batman@privy.io' });
    },
  };
}
