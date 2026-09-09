import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { primaryId, timestamps, ts } from './common';
import { developers } from './developers';
import { apiKeyStatus, principalKind } from './enums';
import { users } from './users';

/**
 * Credentials for calling the Emi API: dashboard tokens for users, server-to-server keys for
 * agents that buy our x402 capabilities. Only the digest is stored, so a database leak cannot
 * be replayed as a caller.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: primaryId(),
    ownerKind: principalKind('owner_kind').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => agents.id, {
      onDelete: 'cascade',
    }),
    developerId: uuid('developer_id').references(() => developers.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    /** First bytes of the key, shown in the UI so a user can tell two keys apart. */
    prefix: text('prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    scopes: text('scopes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: apiKeyStatus('status').notNull().default('active'),
    rateLimitPerMinute: integer('rate_limit_per_minute'),
    lastUsedAt: ts('last_used_at'),
    expiresAt: ts('expires_at'),
    revokedAt: ts('revoked_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('api_keys_key_hash_key').on(t.keyHash),
    index('api_keys_owner_idx').on(t.ownerKind, t.status),
    index('api_keys_user_idx').on(t.userId),
    index('api_keys_agent_idx').on(t.agentId),
    check(
      'api_keys_owner_matches_kind',
      sql`(${t.ownerKind} = 'user' and ${t.userId} is not null)
        or (${t.ownerKind} = 'agent' and ${t.agentId} is not null)
        or (${t.ownerKind} = 'developer' and ${t.developerId} is not null)
        or (${t.ownerKind} = 'platform' and ${t.userId} is null and ${t.agentId} is null and ${t.developerId} is null)`,
    ),
  ],
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
  agent: one(agents, { fields: [apiKeys.agentId], references: [agents.id] }),
  developer: one(developers, {
    fields: [apiKeys.developerId],
    references: [developers.id],
  }),
}));
