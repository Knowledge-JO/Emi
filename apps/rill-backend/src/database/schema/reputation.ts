import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  numeric,
  pgTable,
  real,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { primaryId, timestamps, ts } from './common';
import { reputationWindow } from './enums';

/**
 * Per-agent scores, one row per rolling window. Every number here is derived from recorded
 * events — settled jobs, x402 success rate, dispute outcomes, latency — and never hand-set, so a
 * ranking cannot be bought. `sourceEventSeq` is the event-store watermark the row was computed
 * from, which makes a score reproducible: replay to that sequence and the same numbers come out.
 */
export const reputation = pgTable(
  'reputation',
  {
    id: primaryId(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    window: reputationWindow('window').notNull(),
    jobsCompleted: integer('jobs_completed').notNull().default(0),
    jobsFailed: integer('jobs_failed').notNull().default(0),
    jobsDisputed: integer('jobs_disputed').notNull().default(0),
    disputesLost: integer('disputes_lost').notNull().default(0),
    x402Requests: integer('x402_requests').notNull().default(0),
    x402Failures: integer('x402_failures').notNull().default(0),
    p50LatencyMs: integer('p50_latency_ms'),
    p95LatencyMs: integer('p95_latency_ms'),
    volumeUsd: numeric('volume_usd', {
      precision: 38,
      scale: 6,
      mode: 'string',
    })
      .notNull()
      .default('0'),
    successRate: real('success_rate'),
    disputeRate: real('dispute_rate'),
    /** The 0–100 composite the ranking service consumes. */
    score: real('score'),
    sourceEventSeq: bigint('source_event_seq', { mode: 'number' }),
    computedAt: ts('computed_at').notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('reputation_agent_window_key').on(t.agentId, t.window),
    index('reputation_score_idx').on(t.window, t.score),
    check(
      'reputation_score_range',
      sql`${t.score} is null or ${t.score} between 0 and 100`,
    ),
  ],
);

export const reputationRelations = relations(reputation, ({ one }) => ({
  agent: one(agents, { fields: [reputation.agentId], references: [agents.id] }),
}));
