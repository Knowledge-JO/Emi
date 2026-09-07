import { relations, sql } from 'drizzle-orm';
import {
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
import { assets } from './assets';
import {
  address,
  baseUnits,
  hash32,
  primaryId,
  timestamps,
  ts,
} from './common';
import { capabilities } from './capabilities';
import { jobStatus, principalKind } from './enums';
import { jobDeliverables } from './job-deliverables';
import { transactions } from './transactions';
import { users } from './users';
import { workflowSteps } from './workflow-steps';

/**
 * ERC-8183 escrow jobs — one agent hiring another, or a user hiring an agent, for work with a
 * deliverable. The hirer is polymorphic because agent-to-agent hiring is the point: a loan
 * guardian subcontracts risk analysis without the user knowing the subcontractor exists.
 *
 * A job is never used for a single API call; that is x402's job, and it lives in its own table.
 */
export const jobs = pgTable(
  'jobs',
  {
    id: primaryId(),
    workflowStepId: uuid('workflow_step_id').references(
      () => workflowSteps.id,
      {
        onDelete: 'set null',
      },
    ),
    hirerKind: principalKind('hirer_kind').notNull(),
    hirerUserId: uuid('hirer_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    hirerAgentId: uuid('hirer_agent_id').references(() => agents.id, {
      onDelete: 'restrict',
    }),
    workerAgentId: uuid('worker_agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'restrict' }),
    capabilityId: uuid('capability_id').references(() => capabilities.id, {
      onDelete: 'restrict',
    }),
    chainId: integer('chain_id').notNull(),
    escrowAddress: address('escrow_address').notNull(),
    /** uint256 job id from the escrow contract, as an exact decimal string. Null until created. */
    onchainJobId: text('onchain_job_id'),
    spec: jsonb('spec').$type<Record<string, unknown>>().notNull(),
    /** keccak256 of the canonical spec, as committed on-chain. Proves what was agreed. */
    specHash: hash32('spec_hash').notNull(),
    amount: baseUnits('amount').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    status: jobStatus('status').notNull().default('created'),
    deadlineAt: ts('deadline_at'),
    createTxHash: hash32('create_tx_hash'),
    fundTxHash: hash32('fund_tx_hash'),
    settleTxHash: hash32('settle_tx_hash'),
    disputeTxHash: hash32('dispute_tx_hash'),
    cancelTxHash: hash32('cancel_tx_hash'),
    disputeReason: text('dispute_reason'),
    fundedAt: ts('funded_at'),
    acceptedAt: ts('accepted_at'),
    deliveredAt: ts('delivered_at'),
    settledAt: ts('settled_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('jobs_onchain_key').on(
      t.chainId,
      t.escrowAddress,
      t.onchainJobId,
    ),
    index('jobs_worker_status_idx').on(t.workerAgentId, t.status),
    index('jobs_hirer_agent_idx').on(t.hirerAgentId),
    index('jobs_hirer_user_idx').on(t.hirerUserId),
    index('jobs_step_idx').on(t.workflowStepId),
    index('jobs_status_deadline_idx').on(t.status, t.deadlineAt),
    check('jobs_amount_positive', sql`${t.amount}::numeric > 0`),
    check(
      'jobs_escrow_lowercase',
      sql`${t.escrowAddress} = lower(${t.escrowAddress})`,
    ),
    check(
      'jobs_hirer_matches_kind',
      sql`(${t.hirerKind} = 'user' and ${t.hirerUserId} is not null and ${t.hirerAgentId} is null)
        or (${t.hirerKind} = 'agent' and ${t.hirerAgentId} is not null and ${t.hirerUserId} is null)
        or (${t.hirerKind} = 'platform' and ${t.hirerUserId} is null and ${t.hirerAgentId} is null)`,
    ),
    check(
      'jobs_no_self_hire',
      sql`${t.hirerAgentId} is null or ${t.hirerAgentId} <> ${t.workerAgentId}`,
    ),
  ],
);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  workflowStep: one(workflowSteps, {
    fields: [jobs.workflowStepId],
    references: [workflowSteps.id],
  }),
  hirerUser: one(users, { fields: [jobs.hirerUserId], references: [users.id] }),
  hirerAgent: one(agents, {
    fields: [jobs.hirerAgentId],
    references: [agents.id],
    relationName: 'jobHirerAgent',
  }),
  workerAgent: one(agents, {
    fields: [jobs.workerAgentId],
    references: [agents.id],
    relationName: 'jobWorkerAgent',
  }),
  capability: one(capabilities, {
    fields: [jobs.capabilityId],
    references: [capabilities.id],
  }),
  asset: one(assets, { fields: [jobs.assetId], references: [assets.id] }),
  deliverables: many(jobDeliverables),
  transactions: many(transactions),
}));
