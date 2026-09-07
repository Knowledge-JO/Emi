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

import {
  address,
  baseUnits,
  hash32,
  primaryId,
  timestamps,
  ts,
} from './common';
import { sessions } from './sessions';
import { wallets } from './wallets';

/**
 * The on-chain grant receipt: who was allowed to do what, when, and on whose signature. One row
 * per `grantSession`, plus the revocation that ended it.
 *
 * The grant is what charges the user the Keystore registration fee, so `keystoreFeeWei` is
 * recorded here for cost reporting — it describes the grant, not the session's ongoing authority,
 * which is why it does not live on `sessions`. `grantTxHash` is nullable on purpose: the relay
 * can confirm a grant without returning one.
 */
export const authorizations = pgTable(
  'authorizations',
  {
    id: primaryId(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    sessionPublicKey: text('session_public_key'),
    keyId: hash32('key_id').notNull(),
    chainId: integer('chain_id').notNull(),
    keystoreAddress: address('keystore_address').notNull(),
    /** Exactly the `permissions` object committed on-chain. Compared before every execute. */
    permissionsSnapshot: jsonb('permissions_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    /** Unix seconds, as committed. Stored alongside the timestamp for byte-exact comparison. */
    expiry: integer('expiry').notNull(),
    expiresAt: ts('expires_at').notNull(),
    grantTxHash: hash32('grant_tx_hash'),
    grantedAt: ts('granted_at').notNull().defaultNow(),
    registered: boolean('registered').notNull().default(false),
    keystoreFeeWei: baseUnits('keystore_fee_wei'),
    revokeTxHash: hash32('revoke_tx_hash'),
    revokedAt: ts('revoked_at'),
    /** Result of the last `isValidKey(user, keyId)` read: exists AND not revoked AND not expired. */
    onchainValid: boolean('onchain_valid'),
    lastVerifiedAt: ts('last_verified_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('authorizations_grant_key').on(t.chainId, t.keyId, t.grantedAt),
    index('authorizations_wallet_idx').on(t.walletId),
    index('authorizations_session_idx').on(t.sessionId),
    index('authorizations_key_idx').on(t.chainId, t.keyId),
    check(
      'authorizations_keystore_lowercase',
      sql`${t.keystoreAddress} = lower(${t.keystoreAddress})`,
    ),
  ],
);

export const authorizationsRelations = relations(authorizations, ({ one }) => ({
  wallet: one(wallets, {
    fields: [authorizations.walletId],
    references: [wallets.id],
  }),
  session: one(sessions, {
    fields: [authorizations.sessionId],
    references: [sessions.id],
  }),
}));
