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

import {
  address,
  baseUnits,
  hash32,
  primaryId,
  timestamps,
  ts,
} from './common';
import { jobs } from './jobs';
import { protocols } from './protocols';
import { sessions } from './sessions';
import { transactionKind, transactionStatus } from './enums';
import { wallets } from './wallets';
import { workflowSteps } from './workflow-steps';

/**
 * Every on-chain transaction the platform originated, and the step that caused it. Most are
 * userOps signed by a session key, so both hashes are recorded: the userOp hash is what the
 * bundler acknowledges, the tx hash is what a block explorer shows.
 *
 * `calls` stores the targets and selectors only — enough to audit what a session did against
 * what it was allowed to do, without keeping a second copy of arbitrary calldata.
 */
export const transactions = pgTable(
  'transactions',
  {
    id: primaryId(),
    walletId: uuid('wallet_id').references(() => wallets.id, {
      onDelete: 'set null',
    }),
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    workflowStepId: uuid('workflow_step_id').references(
      () => workflowSteps.id,
      {
        onDelete: 'set null',
      },
    ),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    protocolId: uuid('protocol_id').references(() => protocols.id, {
      onDelete: 'set null',
    }),
    chainId: integer('chain_id').notNull(),
    kind: transactionKind('kind').notNull().default('user_op'),
    status: transactionStatus('status').notNull().default('pending'),
    fromAddress: address('from_address').notNull(),
    toAddress: address('to_address'),
    userOpHash: hash32('user_op_hash'),
    txHash: hash32('tx_hash'),
    calls:
      jsonb('calls').$type<
        Array<{ to: string; selector?: string; value?: string }>
      >(),
    valueWei: baseUnits('value_wei'),
    gasUsed: baseUnits('gas_used'),
    effectiveGasPriceWei: baseUnits('effective_gas_price_wei'),
    feeWei: baseUnits('fee_wei'),
    blockNumber: bigint('block_number', { mode: 'number' }),
    blockTimestamp: ts('block_timestamp'),
    revertReason: text('revert_reason'),
    submittedAt: ts('submitted_at'),
    confirmedAt: ts('confirmed_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('transactions_tx_hash_key').on(t.chainId, t.txHash),
    uniqueIndex('transactions_user_op_key').on(t.chainId, t.userOpHash),
    index('transactions_wallet_idx').on(t.walletId, t.createdAt),
    index('transactions_session_idx').on(t.sessionId),
    index('transactions_step_idx').on(t.workflowStepId),
    index('transactions_status_idx').on(t.status),
    check(
      'transactions_has_a_hash',
      sql`${t.txHash} is not null or ${t.userOpHash} is not null or ${t.status} = 'pending'`,
    ),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  session: one(sessions, {
    fields: [transactions.sessionId],
    references: [sessions.id],
  }),
  workflowStep: one(workflowSteps, {
    fields: [transactions.workflowStepId],
    references: [workflowSteps.id],
  }),
  job: one(jobs, { fields: [transactions.jobId], references: [jobs.id] }),
  protocol: one(protocols, {
    fields: [transactions.protocolId],
    references: [protocols.id],
  }),
}));
