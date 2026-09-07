import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { authorizations } from './authorizations';
import { hash32, primaryId, timestamps, ts } from './common';
import { secretProvider, sessionStatus } from './enums';
import { permissions } from './permissions';
import { transactions } from './transactions';
import { wallets } from './wallets';
import { workflows } from './workflows';
import { x402Payments } from './x402-payments';

/**
 * Altana session keys: bounded, temporary, revocable authority granted by one wallet to one
 * agent.
 *
 * This row stores the output of `serializeSession` and nothing else. The session's private key
 * lives in the secret store named by `secretProvider` + `secretRef`, and is recombined at
 * execute time with `deserializeSession(stored, signerFromPrivateKey(key))`. A raw `Session` is
 * never `JSON.stringify`'d: that throws on bigint limits and would embed the key.
 *
 * `serialized` must round-trip byte-for-byte. The on-chain validator matches
 * `permissions + expiry + publicKey` against what was committed at grant time, so a re-cased hex
 * address or a limit that passed through a float leaves the agent unable to act.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: primaryId(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),
    /** The agent holding this session. Null for a session the platform runs itself. */
    grantedToAgentId: uuid('granted_to_agent_id').references(() => agents.id, {
      onDelete: 'restrict',
    }),
    /** SEC1 public key of the session signer. */
    sessionPublicKey: text('session_public_key').notNull(),
    /** keccak256 of the SEC1 public key — the `keyId` argument to `isValidKey(user, keyId)`. */
    keyId: hash32('key_id').notNull(),
    chainId: integer('chain_id').notNull(),
    serialized: jsonb('serialized').$type<Record<string, unknown>>().notNull(),
    secretProvider: secretProvider('secret_provider').notNull(),
    secretRef: text('secret_ref').notNull(),
    expiresAt: ts('expires_at').notNull(),
    /** False for a key granted with `register: false`: usable, but not yet publicly verifiable. */
    registered: boolean('registered').notNull().default(false),
    status: sessionStatus('status').notNull().default('pending'),
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: ts('last_used_at'),
    revokedAt: ts('revoked_at'),
    revokeReason: text('revoke_reason'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('sessions_public_key_key').on(t.sessionPublicKey),
    uniqueIndex('sessions_wallet_key_id_key').on(
      t.walletId,
      t.keyId,
      t.chainId,
    ),
    index('sessions_wallet_status_idx').on(t.walletId, t.status),
    index('sessions_agent_idx').on(t.grantedToAgentId),
    index('sessions_expiry_idx').on(t.status, t.expiresAt),
    check(
      'sessions_revoked_has_timestamp',
      sql`${t.status} <> 'revoked' or ${t.revokedAt} is not null`,
    ),
  ],
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [sessions.walletId],
    references: [wallets.id],
  }),
  grantedToAgent: one(agents, {
    fields: [sessions.grantedToAgentId],
    references: [agents.id],
  }),
  permissions: many(permissions),
  authorizations: many(authorizations),
  workflows: many(workflows),
  transactions: many(transactions),
  x402Payments: many(x402Payments),
}));
