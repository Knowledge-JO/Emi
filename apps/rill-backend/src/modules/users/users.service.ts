import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { users } from '../../database/schema';

export type UserRecord = typeof users.$inferSelect;

/** What the API returns for a user. Never the raw row: that is ours, not the client's. */
export type UserResponse = {
  id: string;
  privyUserId: string | null;
  email: string | null;
  displayName: string | null;
  status: UserRecord['status'];
  createdAt: string;
  lastSeenAt: string | null;
};

/**
 * Accounts and profiles. This module owns nothing on-chain — a user's authority lives in their
 * Altana smart account, which the wallet module manages. A row here is an identifier and a
 * status, nothing that can move money.
 */
@Injectable()
export class UsersService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  findByPrivyDid(did: string): Promise<UserRecord | undefined> {
    return this.db.query.users.findFirst({
      where: and(
        eq(users.authProvider, 'privy'),
        eq(users.externalAuthId, did),
      ),
    });
  }

  /**
   * Creates the account for a Privy DID, or returns `null` if it already existed. Two concurrent
   * first requests both reach here; the unique index on (auth_provider, external_auth_id) picks
   * the winner, and the loser learns it was not a sign-up rather than failing.
   */
  async createFromPrivy(input: {
    did: string;
    email: string | null;
  }): Promise<UserRecord | null> {
    const [created] = await this.db
      .insert(users)
      .values({
        authProvider: 'privy',
        externalAuthId: input.did,
        email: input.email,
        lastSeenAt: new Date(),
      })
      .onConflictDoNothing({
        target: [users.authProvider, users.externalAuthId],
      })
      .returning();

    return created ?? null;
  }

  async touchLastSeen(id: string): Promise<UserRecord> {
    const [updated] = await this.db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return updated;
  }

  toResponse(user: UserRecord): UserResponse {
    return {
      id: user.id,
      privyUserId: user.externalAuthId,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }
}
