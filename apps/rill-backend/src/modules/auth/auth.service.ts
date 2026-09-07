import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { EventStoreService } from '../events/event-store.service';
import { UsersService, type UserRecord } from '../users/users.service';
import { PrivyIdentity, type PrivyPrincipal } from './privy-identity.interface';

/**
 * Turns a verified Privy caller into a Rill account.
 *
 * The distinction this module exists to keep: a platform token says "who is calling the API", an
 * Altana session says "what may be signed on-chain". Nothing here grants the second.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly privy: PrivyIdentity,
    private readonly events: EventStoreService,
  ) {}

  /**
   * The sign-in handshake: the frontend logs in with Privy, then calls this once so the DID has
   * an account behind it. Idempotent — calling it on every page load is fine.
   */
  async completeSignIn(principal: PrivyPrincipal): Promise<UserRecord> {
    const existing = await this.users.findByPrivyDid(principal.did);
    const user = existing ?? (await this.signUp(principal));

    this.assertUsable(user);

    await this.events.append({
      type: 'user.signed_in',
      subjectType: 'user',
      subjectId: user.id,
      actorKind: 'user',
      actorId: user.id,
      payload: {
        privySessionId: principal.sessionId,
        tokenExpiresAt: principal.expiresAt.toISOString(),
      },
    });

    return existing ? this.users.touchLastSeen(user.id) : user;
  }

  /**
   * The account behind an already-signed-in caller. Every authenticated route resolves the caller
   * through here rather than trusting a request body.
   */
  async requireUser(principal: PrivyPrincipal): Promise<UserRecord> {
    const user = await this.users.findByPrivyDid(principal.did);

    if (!user) {
      throw new UnauthorizedException(
        'Sign-in incomplete: POST /auth/session first',
      );
    }

    this.assertUsable(user);

    return user;
  }

  async recordSignOut(
    user: UserRecord,
    principal: PrivyPrincipal,
  ): Promise<void> {
    // Privy owns the session, so there is nothing here to revoke — the client drops its tokens.
    // We record it because an account's history should show when it went quiet.
    await this.events.append({
      type: 'user.signed_out',
      subjectType: 'user',
      subjectId: user.id,
      actorKind: 'user',
      actorId: user.id,
      payload: { privySessionId: principal.sessionId },
    });
  }

  private async signUp(principal: PrivyPrincipal): Promise<UserRecord> {
    const profile = principal.unverifiedIdentityToken
      ? await this.privy.readProfile(principal.unverifiedIdentityToken)
      : null;

    const created = await this.users.createFromPrivy({
      did: principal.did,
      email: profile?.email ?? null,
    });

    if (!created) {
      // Lost the race against a concurrent first request; the winner's row is the account.
      const existing = await this.users.findByPrivyDid(principal.did);
      if (!existing) {
        throw new UnauthorizedException(
          'Could not resolve account for this Privy user',
        );
      }
      return existing;
    }

    this.logger.log(
      `Created account ${created.id} for Privy user ${principal.did}`,
    );

    await this.events.append({
      type: 'user.created',
      subjectType: 'user',
      subjectId: created.id,
      actorKind: 'user',
      actorId: created.id,
      payload: { authProvider: 'privy', hasEmail: created.email !== null },
    });

    return created;
  }

  private assertUsable(user: UserRecord): void {
    if (user.status !== 'active') {
      throw new ForbiddenException(`Account is ${user.status}`);
    }
  }
}
