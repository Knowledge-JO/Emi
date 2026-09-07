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
import { assets } from './assets';
import {
  address,
  baseUnits,
  hash32,
  primaryId,
  timestamps,
  ts,
} from './common';
import { paymentDirection, x402PaymentStatus, x402Rail } from './enums';
import { sessions } from './sessions';
import { wallets } from './wallets';
import { workflowSteps } from './workflow-steps';

/**
 * The micro-payment ledger, in both directions: `outbound` is our agents paying for someone
 * else's capability, `inbound` is agents paying us as an x402 merchant. One row per paid HTTP
 * request, which is why the resource and the HTTP status are first-class columns.
 *
 * Deliberately separate from `jobs`. x402 and ERC-8183 are different rails with different
 * settlement, and they never share a code path or a table.
 */
export const x402Payments = pgTable(
  'x402_payments',
  {
    id: primaryId(),
    direction: paymentDirection('direction').notNull(),
    workflowStepId: uuid('workflow_step_id').references(
      () => workflowSteps.id,
      {
        onDelete: 'set null',
      },
    ),
    /** The session key that signed the payment authorization. Outbound payments only. */
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    payerWalletId: uuid('payer_wallet_id').references(() => wallets.id, {
      onDelete: 'set null',
    }),
    payerAddress: address('payer_address').notNull(),
    payeeAddress: address('payee_address').notNull(),
    payerAgentId: uuid('payer_agent_id').references(() => agents.id, {
      onDelete: 'set null',
    }),
    payeeAgentId: uuid('payee_agent_id').references(() => agents.id, {
      onDelete: 'set null',
    }),
    /** Echoed from the 402 challenge, so a settlement can be tied to what was actually bought. */
    resourceUrl: text('resource_url').notNull(),
    resourceMethod: text('resource_method').notNull().default('GET'),
    httpStatus: smallint('http_status'),
    rail: x402Rail('rail').notNull(),
    amount: baseUnits('amount').notNull(),
    assetId: uuid('asset_id').references(() => assets.id, {
      onDelete: 'restrict',
    }),
    /** Kept even when the asset is unknown to us: the envelope names a token, not an asset row. */
    tokenAddress: address('token_address').notNull(),
    chainId: integer('chain_id').notNull(),
    facilitatorUrl: text('facilitator_url'),
    /** Authorization nonce from the payment envelope. Unique, so a replay cannot be recorded twice. */
    paymentNonce: text('payment_nonce'),
    settlementTxHash: hash32('settlement_tx_hash'),
    status: x402PaymentStatus('status').notNull().default('quoted'),
    error: jsonb('error').$type<{ code: string; message: string }>(),
    requestedAt: ts('requested_at').notNull().defaultNow(),
    settledAt: ts('settled_at'),
    latencyMs: integer('latency_ms'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('x402_payments_nonce_key').on(t.chainId, t.paymentNonce),
    index('x402_payments_direction_status_idx').on(t.direction, t.status),
    index('x402_payments_session_idx').on(t.sessionId),
    index('x402_payments_payee_agent_idx').on(t.payeeAgentId),
    index('x402_payments_payer_agent_idx').on(t.payerAgentId),
    index('x402_payments_step_idx').on(t.workflowStepId),
    check('x402_payments_amount_positive', sql`${t.amount} > 0`),
    // We cannot pay without a session: the platform holds no keys of its own.
    check(
      'x402_payments_outbound_needs_session',
      sql`${t.direction} <> 'outbound' or ${t.sessionId} is not null`,
    ),
    check(
      'x402_payments_addresses_lowercase',
      sql`${t.payerAddress} = lower(${t.payerAddress})
        and ${t.payeeAddress} = lower(${t.payeeAddress})
        and ${t.tokenAddress} = lower(${t.tokenAddress})`,
    ),
  ],
);

export const x402PaymentsRelations = relations(x402Payments, ({ one }) => ({
  workflowStep: one(workflowSteps, {
    fields: [x402Payments.workflowStepId],
    references: [workflowSteps.id],
  }),
  session: one(sessions, {
    fields: [x402Payments.sessionId],
    references: [sessions.id],
  }),
  payerWallet: one(wallets, {
    fields: [x402Payments.payerWalletId],
    references: [wallets.id],
  }),
  payerAgent: one(agents, {
    fields: [x402Payments.payerAgentId],
    references: [agents.id],
    relationName: 'x402Payer',
  }),
  payeeAgent: one(agents, {
    fields: [x402Payments.payeeAgentId],
    references: [agents.id],
    relationName: 'x402Payee',
  }),
  asset: one(assets, {
    fields: [x402Payments.assetId],
    references: [assets.id],
  }),
}));
