import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { address, hash32, primaryId, timestamps, ts } from './common';
import { walletOwnerKind, walletSignerKind, walletStatus } from './enums';
import { sessions } from './sessions';
import { transactions } from './transactions';
import { users } from './users';

/**
 * Altana smart accounts, for both users and agents. The same address is provisioned on every
 * chain the client lists, so `chainIds` records where it has been used rather than distinct
 * accounts. Private keys never appear in this table, or anywhere else in Postgres: `signerKind`
 * only says where the signer comes from.
 */
export const wallets = pgTable(
  'wallets',
  {
    id: primaryId(),
    address: address('address').notNull(),
    ownerKind: walletOwnerKind('owner_kind').notNull(),
    ownerUserId: uuid('owner_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    ownerAgentId: uuid('owner_agent_id').references(() => agents.id, {
      onDelete: 'restrict',
    }),
    signerKind: walletSignerKind('signer_kind').notNull(),
    label: text('label'),
    chainIds: integer('chain_ids')
      .array()
      .notNull()
      .default(sql`'{}'::integer[]`),
    /** Passkey wallets are rebuilt with `recoverFromPasskey`, so the rpId has to survive. */
    passkeyRpId: text('passkey_rp_id'),
    passkeyCredentialId: text('passkey_credential_id'),
    adminPublicKey: text('admin_public_key'),
    adminKeyId: hash32('admin_key_id'),
    /**
     * Keystore's `initialRegisterKey` is auto-prepended to the wallet's first admin-signed
     * action. Until that lands the wallet is live but not on-chain, and nothing can verify it.
     */
    adminKeyRegistered: boolean('admin_key_registered')
      .notNull()
      .default(false),
    adminKeyRegisteredAt: ts('admin_key_registered_at'),
    adminRegistrationTxHash: hash32('admin_registration_tx_hash'),
    status: walletStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('wallets_address_key').on(t.address),
    uniqueIndex('wallets_owner_agent_key').on(t.ownerAgentId),
    index('wallets_owner_user_idx').on(t.ownerUserId),
    check('wallets_address_lowercase', sql`${t.address} = lower(${t.address})`),
    check(
      'wallets_owner_matches_kind',
      sql`(${t.ownerKind} = 'user' and ${t.ownerUserId} is not null and ${t.ownerAgentId} is null)
        or (${t.ownerKind} = 'agent' and ${t.ownerAgentId} is not null and ${t.ownerUserId} is null)
        or (${t.ownerKind} = 'platform' and ${t.ownerUserId} is null and ${t.ownerAgentId} is null)`,
    ),
    check(
      'wallets_passkey_needs_rp_id',
      sql`${t.signerKind} <> 'passkey' or ${t.passkeyRpId} is not null`,
    ),
  ],
);

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  ownerUser: one(users, {
    fields: [wallets.ownerUserId],
    references: [users.id],
  }),
  ownerAgent: one(agents, {
    fields: [wallets.ownerAgentId],
    references: [agents.id],
  }),
  sessions: many(sessions),
  transactions: many(transactions),
}));
