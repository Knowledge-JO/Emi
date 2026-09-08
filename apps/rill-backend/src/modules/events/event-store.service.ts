import { Injectable } from '@nestjs/common';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { eventOutbox, events } from '../../database/schema';
import { REPUTATION_OUTBOX_DESTINATION } from './reputation-score';

type ActorKind = (typeof events.actorKind.enumValues)[number];

export type AppendEventInput = {
  /** Dot-notation type, e.g. `user.signed_in`, `session.granted`, `job.delivered`. */
  type: string;
  /** The kind of thing this happened to (`user`, `workflow_step`, `job`, …). */
  subjectType: string;
  subjectId?: string | null;
  actorKind: ActorKind;
  actorId?: string | null;
  /** The intent or workflow this belongs to, so an audit trail joins on one key. */
  correlationId?: string | null;
  causationId?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
};

export type AppendedEvent = {
  seq: number;
  eventId: string;
};

/**
 * Append-only event store. Every state transition in the system lands here so any run can be
 * audited and replayed, and so derived data — reputation above all — can be recomputed from
 * facts rather than trusted.
 *
 * Rows are never updated or deleted; a correction is a new event.
 */
@Injectable()
export class EventStoreService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async append(input: AppendEventInput): Promise<AppendedEvent> {
    return this.db.transaction(async (tx) => {
      const [appended] = await tx
        .insert(events)
        .values({
          type: input.type,
          subjectType: input.subjectType,
          subjectId: input.subjectId ?? null,
          actorKind: input.actorKind,
          actorId: input.actorId ?? null,
          correlationId: input.correlationId ?? null,
          causationId: input.causationId ?? null,
          payload: input.payload ?? {},
          occurredAt: input.occurredAt ?? new Date(),
        })
        .returning({ seq: events.seq, eventId: events.eventId });

      await tx.insert(eventOutbox).values({
        eventSeq: appended.seq,
        destination: REPUTATION_OUTBOX_DESTINATION,
        status: 'pending',
      });

      return appended;
    });
  }
}
