import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

import { assets } from './assets';
import { baseUnits, primaryId, timestamps, ts } from './common';
import { intentStatus } from './enums';
import { recommendations } from './recommendations';
import { users } from './users';
import { wallets } from './wallets';
import { workflows } from './workflows';

/** A node of the planner's goal tree: "protect loan" → "monitor position", "repay". */
export type GoalNode = {
  id: string;
  goal: string;
  children?: GoalNode[];
};

/** An asset mentioned in the user's message. Amounts stay display strings until catalog lookup. */
export type IntentAssetRef = {
  symbol: string;
  amount: string | null;
};

export type IntentKind =
  'swap' | 'lend' | 'borrow' | 'repay' | 'protect' | 'unknown';

export type IntentLegType = 'swap' | 'lend' | 'borrow' | 'repay' | 'monitor';

/** One required action extracted from the message, before any agent is chosen. */
export type IntentLeg = {
  type: IntentLegType;
  taxonomyKey: string;
  from: IntentAssetRef;
  to: IntentAssetRef;
};

/**
 * The standard object a user message becomes. The LLM proposes this; Zod validates it; nothing
 * downstream trusts raw model text. Amounts are strings. This object does not pick agents,
 * protocols, or signers.
 */
export type ParsedIntent = {
  kind: IntentKind;
  summary: string;
  confidence: number;
  rejected: boolean;
  rejectionReason: string | null;
  chain: 'bnb' | 'bnb-testnet' | 'ethereum' | 'unspecified';
  legs: IntentLeg[];
  goalTree: GoalNode;
  missing: string[];
  assumptions: string[];
};

/** A goal-tree leaf resolved to a capability requirement, before any agent is chosen. */
export type CapabilityGraphNode = {
  id: string;
  goalId: string;
  taxonomyKey: string;
  dependsOn: string[];
  input?: Record<string, unknown>;
};

/**
 * The raw user goal and everything the planner derived from it. Kept verbatim alongside its
 * parse so a bad plan can be replayed against a newer planner and compared.
 *
 * The planner writes here and nowhere else: it produces trees, never transactions.
 */
export const intents = pgTable(
  'intents',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The wallet expected to fund the resulting workflow. */
    walletId: uuid('wallet_id').references(() => wallets.id, {
      onDelete: 'set null',
    }),
    rawText: text('raw_text').notNull(),
    status: intentStatus('status').notNull().default('received'),
    /** The full parsed intent object (kind, legs, goal tree), not just the tree. */
    goalTree: jsonb('goal_tree').$type<ParsedIntent>(),
    capabilityGraph: jsonb('capability_graph').$type<CapabilityGraphNode[]>(),
    /** Ceiling the user accepts for the whole intent, enforced by the authorization planner. */
    budgetLimit: baseUnits('budget_limit'),
    budgetAssetId: uuid('budget_asset_id').references(() => assets.id, {
      onDelete: 'restrict',
    }),
    deadlineAt: ts('deadline_at'),
    plannerModel: text('planner_model'),
    plannerPromptTokens: integer('planner_prompt_tokens'),
    plannerCompletionTokens: integer('planner_completion_tokens'),
    plannerLatencyMs: integer('planner_latency_ms'),
    error: jsonb('error').$type<{
      code: string;
      message: string;
      details?: unknown;
    }>(),
    parsedAt: ts('parsed_at'),
    resolvedAt: ts('resolved_at'),
    ...timestamps,
  },
  (t) => [
    index('intents_user_idx').on(t.userId, t.createdAt),
    index('intents_status_idx').on(t.status),
  ],
);

export const intentsRelations = relations(intents, ({ one, many }) => ({
  user: one(users, { fields: [intents.userId], references: [users.id] }),
  wallet: one(wallets, {
    fields: [intents.walletId],
    references: [wallets.id],
  }),
  budgetAsset: one(assets, {
    fields: [intents.budgetAssetId],
    references: [assets.id],
  }),
  recommendations: many(recommendations),
  workflows: many(workflows),
}));
