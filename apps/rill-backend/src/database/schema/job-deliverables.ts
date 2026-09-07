import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { agents } from './agents';
import { hash32, primaryId, timestamps, ts } from './common';
import { deliverableDecision } from './enums';
import { jobs } from './jobs';

/**
 * The worker agent's output. Versioned, because a rejected deliverable can be resubmitted while
 * the escrow stays open. `contentHash` is what the escrow contract sees; `payload` and
 * `storageUri` are the off-chain copies, either of which may be absent for a large artifact.
 *
 * Escrow releases on acceptance, and `releaseTxHash` is the proof of it.
 */
export const jobDeliverables = pgTable(
  'job_deliverables',
  {
    id: primaryId(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    version: smallint('version').notNull().default(1),
    submittedByAgentId: uuid('submitted_by_agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'restrict' }),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    contentHash: hash32('content_hash').notNull(),
    storageUri: text('storage_uri'),
    decision: deliverableDecision('decision').notNull().default('pending'),
    decisionReason: text('decision_reason'),
    releaseTxHash: hash32('release_tx_hash'),
    submittedAt: ts('submitted_at').notNull().defaultNow(),
    decidedAt: ts('decided_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('job_deliverables_version_key').on(t.jobId, t.version),
    index('job_deliverables_decision_idx').on(t.decision),
    check(
      'job_deliverables_decided_has_timestamp',
      sql`${t.decision} = 'pending' or ${t.decidedAt} is not null`,
    ),
  ],
);

export const jobDeliverablesRelations = relations(
  jobDeliverables,
  ({ one }) => ({
    job: one(jobs, { fields: [jobDeliverables.jobId], references: [jobs.id] }),
    submittedByAgent: one(agents, {
      fields: [jobDeliverables.submittedByAgentId],
      references: [agents.id],
    }),
  }),
);
