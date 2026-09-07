import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { assets } from './assets';
import {
  EMBEDDING_DIMENSIONS,
  baseUnits,
  primaryId,
  timestamps,
} from './common';
import { capabilityStatus, pricingModel, settlementRail } from './enums';
import { protocols } from './protocols';
import { recommendations } from './recommendations';
import { workflowSteps } from './workflow-steps';

/**
 * The central marketplace object — not the agent. An agent does not get to claim "I am a DeFi
 * agent"; it declares capabilities a planner can match by machine: a name, a taxonomy key, an
 * input/output contract, the assets and protocols it covers, and exactly one way to be paid.
 *
 * The embedding matches a capability against a goal-tree node semantically. The taxonomy key
 * matches it exactly. Discovery uses both: exact first, vector as fallback.
 */
export const capabilities = pgTable(
  'capabilities',
  {
    id: primaryId(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Dot-notation match key, e.g. `defi.swap`, `defi.lending.repay`, `risk.position_health`. */
    taxonomyKey: text('taxonomy_key').notNull(),
    description: text('description').notNull(),
    /** JSON Schema for the call. The orchestrator validates against it before spending anything. */
    inputSchema: jsonb('input_schema')
      .$type<Record<string, unknown>>()
      .notNull(),
    outputSchema: jsonb('output_schema')
      .$type<Record<string, unknown>>()
      .notNull(),
    pricingModel: pricingModel('pricing_model').notNull(),
    settlementRail: settlementRail('settlement_rail').notNull(),
    unitPrice: baseUnits('unit_price').notNull(),
    priceAssetId: uuid('price_asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    /** Where an x402 buyer sends the request. Meaningless for escrowed jobs. */
    x402ResourceUrl: text('x402_resource_url'),
    x402Method: text('x402_method').default('GET'),
    maxConcurrency: integer('max_concurrency').notNull().default(1),
    expectedDurationSeconds: integer('expected_duration_seconds'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    status: capabilityStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('capabilities_agent_name_key').on(t.agentId, t.name),
    index('capabilities_taxonomy_idx').on(t.taxonomyKey, t.status),
    index('capabilities_rail_idx').on(t.settlementRail),
    index('capabilities_embedding_idx').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
    // The rail follows the shape of the work: a single API call is x402, a job with a
    // deliverable is ERC-8183. Never an escrow job for one request.
    check(
      'capabilities_rail_matches_pricing',
      sql`(${t.pricingModel} = 'per_request' and ${t.settlementRail} = 'x402')
        or (${t.pricingModel} = 'per_job' and ${t.settlementRail} = 'erc8183')
        or ${t.pricingModel} = 'subscription'`,
    ),
    check(
      'capabilities_x402_needs_resource',
      sql`${t.settlementRail} <> 'x402' or ${t.x402ResourceUrl} is not null`,
    ),
  ],
);

/** Assets a capability can operate on. Join rows, so discovery can filter in SQL. */
export const capabilityAssets = pgTable(
  'capability_assets',
  {
    capabilityId: uuid('capability_id')
      .notNull()
      .references(() => capabilities.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.capabilityId, t.assetId] }),
    index('capability_assets_asset_idx').on(t.assetId),
  ],
);

/**
 * Protocols a capability touches. Doubles as the input to the authorization planner: the union of
 * these protocols' contracts is the contract allowlist a step's session is allowed to call.
 */
export const capabilityProtocols = pgTable(
  'capability_protocols',
  {
    capabilityId: uuid('capability_id')
      .notNull()
      .references(() => capabilities.id, { onDelete: 'cascade' }),
    protocolId: uuid('protocol_id')
      .notNull()
      .references(() => protocols.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.capabilityId, t.protocolId] }),
    index('capability_protocols_protocol_idx').on(t.protocolId),
  ],
);

export const capabilitiesRelations = relations(
  capabilities,
  ({ one, many }) => ({
    agent: one(agents, {
      fields: [capabilities.agentId],
      references: [agents.id],
    }),
    priceAsset: one(assets, {
      fields: [capabilities.priceAssetId],
      references: [assets.id],
    }),
    assets: many(capabilityAssets),
    protocols: many(capabilityProtocols),
    recommendations: many(recommendations),
    workflowSteps: many(workflowSteps),
  }),
);

export const capabilityAssetsRelations = relations(
  capabilityAssets,
  ({ one }) => ({
    capability: one(capabilities, {
      fields: [capabilityAssets.capabilityId],
      references: [capabilities.id],
    }),
    asset: one(assets, {
      fields: [capabilityAssets.assetId],
      references: [assets.id],
    }),
  }),
);

export const capabilityProtocolsRelations = relations(
  capabilityProtocols,
  ({ one }) => ({
    capability: one(capabilities, {
      fields: [capabilityProtocols.capabilityId],
      references: [capabilities.id],
    }),
    protocol: one(protocols, {
      fields: [capabilityProtocols.protocolId],
      references: [protocols.id],
    }),
  }),
);
