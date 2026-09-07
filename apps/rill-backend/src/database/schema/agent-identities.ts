import { relations, sql } from 'drizzle-orm';
import {
  bigint,
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
import { address, primaryId, timestamps, ts } from './common';

/**
 * The ERC-8004 record backing a listing. Identity is on-chain and canonical; this row is a cache
 * of it, which is why every field is stamped with the block it was read at. Discovery may serve
 * stale data, but commerce must re-read the chain.
 */
export const agentIdentities = pgTable(
  'agent_identities',
  {
    id: primaryId(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    chainId: integer('chain_id').notNull(),
    registryAddress: address('registry_address').notNull(),
    /** ERC-8004 agent id, a uint256 kept as an exact decimal string. */
    onchainAgentId: text('onchain_agent_id').notNull(),
    /** The domain the registry resolves for this agent, used to fetch its agent card. */
    agentDomain: text('agent_domain'),
    endpointUrl: text('endpoint_url'),
    ownerAddress: address('owner_address'),
    /** Attestations as read from the registry: issuer, subject, schema, uri. */
    attestations: jsonb('attestations').$type<
      Array<{
        issuer: string;
        schema: string;
        uri?: string;
        issuedAt?: string;
      }>
    >(),
    lastSyncBlock: bigint('last_sync_block', { mode: 'number' }),
    lastSyncedAt: ts('last_synced_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('agent_identities_agent_key').on(t.agentId),
    uniqueIndex('agent_identities_onchain_key').on(
      t.chainId,
      t.registryAddress,
      t.onchainAgentId,
    ),
    index('agent_identities_owner_idx').on(t.ownerAddress),
    check(
      'agent_identities_registry_lowercase',
      sql`${t.registryAddress} = lower(${t.registryAddress})`,
    ),
  ],
);

export const agentIdentitiesRelations = relations(
  agentIdentities,
  ({ one }) => ({
    agent: one(agents, {
      fields: [agentIdentities.agentId],
      references: [agents.id],
    }),
  }),
);
