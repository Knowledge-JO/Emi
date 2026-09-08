import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { assets } from './assets';
import { baseUnits, primaryId, timestamps, ts } from './common';
import { workflowEngine, workflowStatus } from './enums';
import { intents } from './intents';
import { sessions } from './sessions';
import { wallets } from './wallets';
import { workflowSteps } from './workflow-steps';

/**
 * The scope a workflow asks the user to authorize, before any session exists. Values are exact
 * strings because the same bytes are later committed on-chain at grant time; converting a limit
 * to a number here would produce a session that fails validation at execute time.
 */
export type AuthorizationPlan = {
  calls: Array<{ to: string; selector?: string; protocolSlug?: string }>;
  spend: Array<{
    token: string;
    limit: string;
    period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  }>;
  expiry: number;
};

/**
 * A resolved, deterministic capability graph bound to chosen agents. This is the artifact that
 * executes — the LLM's plan stops at `intents`. A workflow may run for a week ("watch my health
 * factor and act below 1.3"), which is why it carries a Temporal handle rather than a job id.
 */
export const workflows = pgTable(
  'workflows',
  {
    id: primaryId(),
    intentId: uuid('intent_id')
      .notNull()
      .references(() => intents.id, { onDelete: 'restrict' }),
    /**
     * The wallet that will grant authority. Null on a draft plan is allowed — the user may review
     * the scope before they have registered an Altana account. Granting a session still requires
     * this to be set.
     */
    walletId: uuid('wallet_id').references(() => wallets.id, {
      onDelete: 'restrict',
    }),
    /** Set once the user has approved the plan and the session has been granted on-chain. */
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    label: text('label'),
    status: workflowStatus('status').notNull().default('draft'),
    engine: workflowEngine('engine').notNull().default('temporal'),
    graph: jsonb('graph').$type<Record<string, unknown>>().notNull(),
    authorizationPlan: jsonb('authorization_plan').$type<AuthorizationPlan>(),
    approvedAt: ts('approved_at'),
    temporalWorkflowId: text('temporal_workflow_id'),
    temporalRunId: text('temporal_run_id'),
    /** Running total across both rails, for enforcing the intent's budget. */
    spentAmount: baseUnits('spent_amount').notNull().default('0'),
    spendAssetId: uuid('spend_asset_id').references(() => assets.id, {
      onDelete: 'restrict',
    }),
    startedAt: ts('started_at'),
    completedAt: ts('completed_at'),
    failure: jsonb('failure').$type<{
      code: string;
      message: string;
      stepKey?: string;
    }>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('workflows_temporal_key').on(t.temporalWorkflowId),
    index('workflows_intent_idx').on(t.intentId),
    index('workflows_status_idx').on(t.status),
    index('workflows_wallet_idx').on(t.walletId),
  ],
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  intent: one(intents, {
    fields: [workflows.intentId],
    references: [intents.id],
  }),
  wallet: one(wallets, {
    fields: [workflows.walletId],
    references: [wallets.id],
  }),
  session: one(sessions, {
    fields: [workflows.sessionId],
    references: [sessions.id],
  }),
  spendAsset: one(assets, {
    fields: [workflows.spendAssetId],
    references: [assets.id],
  }),
  steps: many(workflowSteps),
}));
