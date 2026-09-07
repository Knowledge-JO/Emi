import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { primaryId, timestamps, ts } from './common';
import { capabilities } from './capabilities';
import { paymentRail, workflowStepKind, workflowStepStatus } from './enums';
import { jobs } from './jobs';
import { protocols } from './protocols';
import { transactions } from './transactions';
import { workflows } from './workflows';
import { x402Payments } from './x402-payments';

/**
 * One node of a resolved graph. A step names the agent, the capability and the rail that pays
 * for it; it never carries calldata. `dependsOn` holds sibling step keys, so the graph is
 * readable without walking the workflow's JSON.
 *
 * The commerce artifacts point back here (`jobs`, `x402_payments`, `transactions`), so a step
 * stays a plan and the money keeps its own trail.
 */
export const workflowSteps = pgTable(
  'workflow_steps',
  {
    id: primaryId(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    /** Stable key from the capability graph. Referenced by sibling steps in `dependsOn`. */
    stepKey: text('step_key').notNull(),
    sequence: smallint('sequence').notNull(),
    kind: workflowStepKind('kind').notNull(),
    paymentRail: paymentRail('payment_rail').notNull().default('none'),
    status: workflowStepStatus('status').notNull().default('pending'),
    agentId: uuid('agent_id').references(() => agents.id, {
      onDelete: 'restrict',
    }),
    capabilityId: uuid('capability_id').references(() => capabilities.id, {
      onDelete: 'restrict',
    }),
    /** Set for `direct_execution`: the protocol the execution adapter targets. */
    protocolId: uuid('protocol_id').references(() => protocols.id, {
      onDelete: 'restrict',
    }),
    dependsOn: text('depends_on')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    input: jsonb('input').$type<Record<string, unknown>>(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    attempts: smallint('attempts').notNull().default(0),
    maxAttempts: smallint('max_attempts').notNull().default(3),
    timeoutSeconds: integer('timeout_seconds'),
    lastError: jsonb('last_error').$type<{ code: string; message: string }>(),
    startedAt: ts('started_at'),
    completedAt: ts('completed_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('workflow_steps_key_key').on(t.workflowId, t.stepKey),
    index('workflow_steps_workflow_sequence_idx').on(t.workflowId, t.sequence),
    index('workflow_steps_status_idx').on(t.status),
    index('workflow_steps_agent_idx').on(t.agentId),
    // A step that hires or buys must name the agent it pays.
    check(
      'workflow_steps_paid_step_needs_agent',
      sql`${t.paymentRail} = 'none' or ${t.agentId} is not null`,
    ),
    check(
      'workflow_steps_rail_matches_kind',
      sql`(${t.kind} = 'agent_job' and ${t.paymentRail} = 'erc8183')
        or (${t.kind} = 'x402_purchase' and ${t.paymentRail} = 'x402')
        or (${t.kind} not in ('agent_job', 'x402_purchase') and ${t.paymentRail} = 'none')`,
    ),
  ],
);

export const workflowStepsRelations = relations(
  workflowSteps,
  ({ one, many }) => ({
    workflow: one(workflows, {
      fields: [workflowSteps.workflowId],
      references: [workflows.id],
    }),
    agent: one(agents, {
      fields: [workflowSteps.agentId],
      references: [agents.id],
    }),
    capability: one(capabilities, {
      fields: [workflowSteps.capabilityId],
      references: [capabilities.id],
    }),
    protocol: one(protocols, {
      fields: [workflowSteps.protocolId],
      references: [protocols.id],
    }),
    jobs: many(jobs),
    x402Payments: many(x402Payments),
    transactions: many(transactions),
  }),
);
