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

import { address, primaryId, timestamps } from './common';
import { protocolKind } from './enums';

/** PancakeSwap, Aave, the token factory, LP managers. */
export const protocols = pgTable(
  'protocols',
  {
    id: primaryId(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    kind: protocolKind('kind').notNull(),
    website: text('website'),
    docsUrl: text('docs_url'),
    riskNotes: text('risk_notes'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('protocols_slug_key').on(t.slug),
    index('protocols_kind_idx').on(t.kind),
  ],
);

/**
 * Contract addresses per chain and per role. This table is the only source for session-key
 * contract allowlists: an address that is not here can never reach `permissions.calls`, which is
 * what keeps "allowed to use Aave" from becoming "allowed to call anything".
 */
export const protocolContracts = pgTable(
  'protocol_contracts',
  {
    id: primaryId(),
    protocolId: uuid('protocol_id')
      .notNull()
      .references(() => protocols.id, { onDelete: 'cascade' }),
    chainId: integer('chain_id').notNull(),
    /** `router`, `pool`, `lending_pool`, `factory`, `position_manager`, … */
    role: text('role').notNull(),
    address: address('address').notNull(),
    /** False keeps a known contract out of every generated allowlist. */
    allowlistable: boolean('allowlistable').notNull().default(true),
    verified: boolean('verified').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('protocol_contracts_role_key').on(
      t.protocolId,
      t.chainId,
      t.role,
    ),
    index('protocol_contracts_address_idx').on(t.chainId, t.address),
    check(
      'protocol_contracts_address_lowercase',
      sql`${t.address} = lower(${t.address})`,
    ),
  ],
);

export const protocolsRelations = relations(protocols, ({ many }) => ({
  contracts: many(protocolContracts),
}));

export const protocolContractsRelations = relations(
  protocolContracts,
  ({ one }) => ({
    protocol: one(protocols, {
      fields: [protocolContracts.protocolId],
      references: [protocols.id],
    }),
  }),
);
