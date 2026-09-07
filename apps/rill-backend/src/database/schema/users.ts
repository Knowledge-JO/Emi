import { relations } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { apiKeys } from './api-keys';
import { primaryId, timestamps, ts } from './common';
import { developers } from './developers';
import { authProvider, userStatus } from './enums';
import { intents } from './intents';
import { wallets } from './wallets';

/**
 * Platform accounts. Auth identifiers only — funds and authority live on the user's Altana smart
 * account, not here. Nothing in this table can move money.
 */
export const users = pgTable(
  'users',
  {
    id: primaryId(),
    email: text('email'),
    displayName: text('display_name'),
    authProvider: authProvider('auth_provider').notNull(),
    /** Subject id at the auth provider: OAuth `sub`, passkey credential id, or SIWE address. */
    externalAuthId: text('external_auth_id'),
    status: userStatus('status').notNull().default('active'),
    lastSeenAt: ts('last_seen_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_key').on(t.email),
    uniqueIndex('users_external_auth_key').on(t.authProvider, t.externalAuthId),
    index('users_status_idx').on(t.status),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  developers: many(developers),
  intents: many(intents),
  apiKeys: many(apiKeys),
}));
