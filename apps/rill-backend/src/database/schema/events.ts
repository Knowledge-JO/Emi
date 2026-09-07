import { relations } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { primaryId, ts } from './common';
import { actorKind, outboxStatus } from './enums';

/**
 * Append-only event store. Every state transition lands here — intent parsed, agent selected,
 * session granted, payment settled, job delivered, session revoked — so any run can be audited
 * and replayed. Rows are never updated or deleted: a correction is a new event.
 *
 * `seq` gives a total order for replay. `eventId` is the producer's idempotency key, so a
 * retried handler cannot double-record. `subjectType`/`subjectId` are intentionally not foreign
 * keys: the history of a workflow has to outlive the workflow row.
 */
export const events = pgTable(
  'events',
  {
    seq: bigserial('seq', { mode: 'number' }).primaryKey(),
    eventId: uuid('event_id').notNull().defaultRandom(),
    /** Dot-notation type, e.g. `session.granted`, `x402.payment.settled`, `job.delivered`. */
    type: text('type').notNull(),
    schemaVersion: smallint('schema_version').notNull().default(1),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id'),
    actorKind: actorKind('actor_kind').notNull(),
    actorId: uuid('actor_id'),
    /** The intent or workflow this event belongs to; the join key for a full audit trail. */
    correlationId: uuid('correlation_id'),
    /** The event that caused this one. */
    causationId: uuid('causation_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    occurredAt: ts('occurred_at').notNull().defaultNow(),
    recordedAt: ts('recorded_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('events_event_id_key').on(t.eventId),
    index('events_subject_idx').on(t.subjectType, t.subjectId, t.seq),
    index('events_type_idx').on(t.type, t.occurredAt),
    index('events_correlation_idx').on(t.correlationId, t.seq),
  ],
);

/**
 * Transactional outbox. A handler writes its event and its delivery rows in the same transaction
 * as the state change, and a worker drains this table afterwards — so a webhook or index update
 * can never be sent for a transaction that rolled back.
 */
export const eventOutbox = pgTable(
  'event_outbox',
  {
    id: primaryId(),
    eventSeq: bigint('event_seq', { mode: 'number' })
      .notNull()
      .references(() => events.seq, { onDelete: 'cascade' }),
    /** Delivery target, e.g. `webhook:developer`, `queue:indexer`, `temporal:signal`. */
    destination: text('destination').notNull(),
    status: outboxStatus('status').notNull().default('pending'),
    attempts: smallint('attempts').notNull().default(0),
    nextAttemptAt: ts('next_attempt_at').notNull().defaultNow(),
    lastError: text('last_error'),
    sentAt: ts('sent_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('event_outbox_destination_key').on(t.eventSeq, t.destination),
    index('event_outbox_pending_idx').on(t.status, t.nextAttemptAt),
  ],
);

export const eventsRelations = relations(events, ({ many }) => ({
  outbox: many(eventOutbox),
}));

export const eventOutboxRelations = relations(eventOutbox, ({ one }) => ({
  event: one(events, {
    fields: [eventOutbox.eventSeq],
    references: [events.seq],
  }),
}));
