import { pgEnum } from 'drizzle-orm/pg-core';

// Every closed state machine in the system is a Postgres enum, so an invalid transition target
// fails at the database boundary rather than deep inside a workflow.

// ── identity ────────────────────────────────────────────────────────────────────────────────────

export const userStatus = pgEnum('user_status', [
  'active',
  'suspended',
  'deleted',
]);

/**
 * The identity provider that authenticated the user. `privy` covers every login method Privy
 * offers — email, OAuth, wallet, passkey — because which one the user picked is Privy's state to
 * own rather than ours to cache. The other values exist for providers we might integrate directly.
 */
export const authProvider = pgEnum('auth_provider', [
  'privy',
  'email',
  'passkey',
  'siwe',
  'oauth',
]);

export const principalKind = pgEnum('principal_kind', [
  'user',
  'agent',
  'developer',
  'platform',
]);

export const apiKeyStatus = pgEnum('api_key_status', [
  'active',
  'revoked',
  'expired',
]);

export const verificationStatus = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
]);

export const walletOwnerKind = pgEnum('wallet_owner_kind', [
  'user',
  'agent',
  'platform',
]);

export const walletSignerKind = pgEnum('wallet_signer_kind', [
  'local_key',
  'passkey',
  'external',
]);

export const walletStatus = pgEnum('wallet_status', [
  'active',
  'frozen',
  'abandoned',
]);

// ── catalog ─────────────────────────────────────────────────────────────────────────────────────

export const agentStatus = pgEnum('agent_status', [
  'draft',
  'pending_review',
  'active',
  'paused',
  'deprecated',
  'banned',
]);

export const agentCategory = pgEnum('agent_category', [
  'swap',
  'loan',
  'risk',
  'liquidity',
  'token',
  'research',
  'orchestration',
  'other',
]);

export const capabilityStatus = pgEnum('capability_status', [
  'active',
  'paused',
  'retired',
]);

export const pricingModel = pgEnum('pricing_model', [
  'per_job',
  'per_request',
  'subscription',
]);

/** How money moves for a capability. x402 and ERC-8183 never share a code path. */
export const settlementRail = pgEnum('settlement_rail', ['x402', 'erc8183']);

export const protocolKind = pgEnum('protocol_kind', [
  'dex',
  'lending',
  'token_factory',
  'liquidity_pool',
  'oracle',
  'bridge',
  'other',
]);

// ── planning ────────────────────────────────────────────────────────────────────────────────────

export const intentStatus = pgEnum('intent_status', [
  'received',
  'parsing',
  'parsed',
  'resolving',
  'resolved',
  'rejected',
  'failed',
  'cancelled',
]);

export const workflowEngine = pgEnum('workflow_engine', [
  'temporal',
  'bullmq',
  'inline',
]);

export const workflowStatus = pgEnum('workflow_status', [
  'draft',
  'awaiting_authorization',
  'authorized',
  'running',
  'waiting',
  'completed',
  'failed',
  'cancelled',
]);

export const workflowStepKind = pgEnum('workflow_step_kind', [
  'agent_job',
  'x402_purchase',
  'direct_execution',
  'wait',
  'condition',
  'notify',
]);

export const paymentRail = pgEnum('payment_rail', ['none', 'x402', 'erc8183']);

export const workflowStepStatus = pgEnum('workflow_step_status', [
  'pending',
  'blocked',
  'ready',
  'running',
  'awaiting_payment',
  'awaiting_deliverable',
  'succeeded',
  'failed',
  'skipped',
  'compensated',
]);

// ── authority ───────────────────────────────────────────────────────────────────────────────────

export const sessionStatus = pgEnum('session_status', [
  'pending',
  'active',
  'expired',
  'revoked',
  'failed',
]);

/** Where the session's private key actually lives. Never Postgres. */
export const secretProvider = pgEnum('secret_provider', [
  'env',
  'file',
  'vault',
  'aws_secrets_manager',
  'gcp_secret_manager',
]);

export const permissionKind = pgEnum('permission_kind', ['call', 'spend']);

export const spendPeriod = pgEnum('spend_period', [
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year',
]);

// ── commerce ────────────────────────────────────────────────────────────────────────────────────

export const jobStatus = pgEnum('job_status', [
  'created',
  'funded',
  'accepted',
  'delivered',
  'settled',
  'disputed',
  'cancelled',
  'expired',
  'refunded',
]);

export const deliverableDecision = pgEnum('deliverable_decision', [
  'pending',
  'accepted',
  'rejected',
]);

export const paymentDirection = pgEnum('payment_direction', [
  'outbound',
  'inbound',
]);

/** The x402 authorization scheme used for a payment. */
export const x402Rail = pgEnum('x402_rail', ['permit2', 'eip3009']);

export const x402PaymentStatus = pgEnum('x402_payment_status', [
  'quoted',
  'authorized',
  'submitted',
  'settled',
  'failed',
  'expired',
  'refunded',
]);

export const transactionKind = pgEnum('transaction_kind', [
  'user_op',
  'raw_tx',
]);

export const transactionStatus = pgEnum('transaction_status', [
  'pending',
  'submitted',
  'included',
  'succeeded',
  'reverted',
  'dropped',
  'replaced',
]);

// ── trust + audit ───────────────────────────────────────────────────────────────────────────────

export const reputationWindow = pgEnum('reputation_window', [
  'day',
  'week',
  'month',
  'lifetime',
]);

export const actorKind = pgEnum('actor_kind', [
  'user',
  'agent',
  'platform',
  'chain',
  'system',
]);

export const outboxStatus = pgEnum('outbox_status', [
  'pending',
  'sent',
  'failed',
  'dead',
]);
