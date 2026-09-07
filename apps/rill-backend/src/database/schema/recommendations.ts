import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  real,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { assets } from './assets';
import { baseUnits, primaryId, timestamps } from './common';
import { capabilities } from './capabilities';
import { settlementRail } from './enums';
import { intents } from './intents';

/**
 * Ranked agent matches for one node of a capability graph. The component scores are stored
 * separately from the total so a ranking is explainable after the fact: a user can be told why
 * their loan was handed to one agent over a cheaper one, and a developer can be told why they
 * lost. A recommendation is a proposal only — selection is recorded on `workflow_steps`.
 */
export const recommendations = pgTable(
  'recommendations',
  {
    id: primaryId(),
    intentId: uuid('intent_id')
      .notNull()
      .references(() => intents.id, { onDelete: 'cascade' }),
    /** Key of the capability-graph node this match answers. */
    graphNodeId: text('graph_node_id').notNull(),
    requestedTaxonomyKey: text('requested_taxonomy_key').notNull(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    capabilityId: uuid('capability_id')
      .notNull()
      .references(() => capabilities.id, { onDelete: 'cascade' }),
    rank: smallint('rank').notNull(),
    score: real('score').notNull(),
    capabilityFitScore: real('capability_fit_score').notNull(),
    reputationScore: real('reputation_score').notNull(),
    priceScore: real('price_score').notNull(),
    availabilityScore: real('availability_score').notNull(),
    /** Weights and any tie-breakers applied, so a score can be recomputed from this row alone. */
    scoringWeights: jsonb('scoring_weights').$type<Record<string, number>>(),
    quotedPrice: baseUnits('quoted_price').notNull(),
    quotedAssetId: uuid('quoted_asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    settlementRail: settlementRail('settlement_rail').notNull(),
    selected: boolean('selected').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('recommendations_node_capability_key').on(
      t.intentId,
      t.graphNodeId,
      t.capabilityId,
    ),
    index('recommendations_node_rank_idx').on(
      t.intentId,
      t.graphNodeId,
      t.rank,
    ),
    index('recommendations_agent_idx').on(t.agentId),
    check('recommendations_score_range', sql`${t.score} between 0 and 1`),
  ],
);

export const recommendationsRelations = relations(
  recommendations,
  ({ one }) => ({
    intent: one(intents, {
      fields: [recommendations.intentId],
      references: [intents.id],
    }),
    agent: one(agents, {
      fields: [recommendations.agentId],
      references: [agents.id],
    }),
    capability: one(capabilities, {
      fields: [recommendations.capabilityId],
      references: [capabilities.id],
    }),
    quotedAsset: one(assets, {
      fields: [recommendations.quotedAssetId],
      references: [assets.id],
    }),
  }),
);
