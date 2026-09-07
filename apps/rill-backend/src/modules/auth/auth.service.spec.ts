import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import type { EventStoreService } from '../events/event-store.service';
import type { UserRecord, UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { PrivyIdentity, PrivyPrincipal } from './privy-identity.interface';

const DID = 'did:privy:cm123456789';

const userRow = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 'user-1',
  email: null,
  displayName: null,
  authProvider: 'privy',
  externalAuthId: DID,
  status: 'active',
  lastSeenAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const principal = (
  overrides: Partial<PrivyPrincipal> = {},
): PrivyPrincipal => ({
  did: DID,
  sessionId: 'session-1',
  issuedAt: new Date('2026-01-01T00:00:00.000Z'),
  expiresAt: new Date('2026-01-01T01:00:00.000Z'),
  unverifiedIdentityToken: null,
  ...overrides,
});

describe('AuthService', () => {
  let users: jest.Mocked<
    Pick<UsersService, 'findByPrivyDid' | 'createFromPrivy' | 'touchLastSeen'>
  >;
  let privy: jest.Mocked<Pick<PrivyIdentity, 'readProfile'>>;
  let events: jest.Mocked<Pick<EventStoreService, 'append'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByPrivyDid: jest.fn(),
      createFromPrivy: jest.fn(),
      touchLastSeen: jest.fn(),
    };
    privy = { readProfile: jest.fn() };
    events = {
      append: jest.fn().mockResolvedValue({ seq: 1, eventId: 'event-1' }),
    };

    service = new AuthService(
      users as unknown as UsersService,
      privy as unknown as PrivyIdentity,
      events as unknown as EventStoreService,
    );
  });

  const emittedTypes = () =>
    events.append.mock.calls.map(([event]) => event.type);

  describe('completeSignIn', () => {
    it('creates the account on first sign-in and records both events', async () => {
      users.findByPrivyDid.mockResolvedValue(undefined);
      users.createFromPrivy.mockResolvedValue(userRow());

      const user = await service.completeSignIn(principal());

      expect(user.id).toBe('user-1');
      expect(users.createFromPrivy).toHaveBeenCalledWith({
        did: DID,
        email: null,
      });
      expect(emittedTypes()).toEqual(['user.created', 'user.signed_in']);
    });

    it('copies the email out of an identity token when the client sent one', async () => {
      users.findByPrivyDid.mockResolvedValue(undefined);
      privy.readProfile.mockResolvedValue({ email: 'batman@privy.io' });
      users.createFromPrivy.mockResolvedValue(
        userRow({ email: 'batman@privy.io' }),
      );

      await service.completeSignIn(
        principal({ unverifiedIdentityToken: 'id-token' }),
      );

      expect(privy.readProfile).toHaveBeenCalledWith('id-token');
      expect(users.createFromPrivy).toHaveBeenCalledWith({
        did: DID,
        email: 'batman@privy.io',
      });
    });

    it('signs in without an email when the identity token does not verify', async () => {
      users.findByPrivyDid.mockResolvedValue(undefined);
      privy.readProfile.mockResolvedValue(null);
      users.createFromPrivy.mockResolvedValue(userRow());

      await service.completeSignIn(
        principal({ unverifiedIdentityToken: 'tampered' }),
      );

      expect(users.createFromPrivy).toHaveBeenCalledWith({
        did: DID,
        email: null,
      });
    });

    it('is idempotent: a returning user is touched, not re-created', async () => {
      users.findByPrivyDid.mockResolvedValue(userRow());
      users.touchLastSeen.mockResolvedValue(
        userRow({ lastSeenAt: new Date() }),
      );

      const user = await service.completeSignIn(principal());

      expect(users.createFromPrivy).not.toHaveBeenCalled();
      expect(users.touchLastSeen).toHaveBeenCalledWith('user-1');
      expect(user.lastSeenAt).not.toBeNull();
      expect(emittedTypes()).toEqual(['user.signed_in']);
    });

    it('falls back to the winning row when two first requests race', async () => {
      users.findByPrivyDid
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(userRow({ id: 'winner' }));
      // The unique index rejected our insert, so nothing came back.
      users.createFromPrivy.mockResolvedValue(null);
      users.touchLastSeen.mockResolvedValue(userRow({ id: 'winner' }));

      const user = await service.completeSignIn(principal());

      expect(user.id).toBe('winner');
      expect(emittedTypes()).toEqual(['user.signed_in']);
    });

    it('refuses a suspended account even with a valid token', async () => {
      users.findByPrivyDid.mockResolvedValue(userRow({ status: 'suspended' }));

      await expect(service.completeSignIn(principal())).rejects.toThrow(
        ForbiddenException,
      );
      expect(emittedTypes()).toEqual([]);
    });
  });

  describe('requireUser', () => {
    it('tells the caller to complete the handshake when no account exists', async () => {
      users.findByPrivyDid.mockResolvedValue(undefined);

      await expect(service.requireUser(principal())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns the account for a verified caller', async () => {
      users.findByPrivyDid.mockResolvedValue(userRow());

      await expect(service.requireUser(principal())).resolves.toMatchObject({
        id: 'user-1',
      });
    });
  });
});
