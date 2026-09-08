import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { and, asc, eq, lte } from 'drizzle-orm';

import type { RillConfigService } from '../../config/app.config';
import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { eventOutbox, events } from '../../database/schema';
import { REPUTATION_OUTBOX_DESTINATION } from './reputation-score';
import { ReputationProjectionService } from './reputation-projection.service';

const MAX_ATTEMPTS = 8;

/**
 * Drains `event_outbox`. Append writes the row in the same transaction as the event;
 * this worker is the only thing that marks delivery. A rolled-back append never appears here.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(ConfigService) private readonly config: RillConfigService,
    private readonly reputation: ReputationProjectionService,
  ) {}

  @Cron('*/30 * * * * *')
  async scheduledDrain(): Promise<void> {
    if (this.config.get('app.env', { infer: true }) === 'test') return;
    await this.drain();
  }

  async drain(limit = 50) {
    const batch = await this.db.query.eventOutbox.findMany({
      where: and(
        eq(eventOutbox.status, 'pending'),
        lte(eventOutbox.nextAttemptAt, new Date()),
      ),
      orderBy: [asc(eventOutbox.nextAttemptAt)],
      limit,
    });

    let sent = 0;
    let failed = 0;
    for (const row of batch) {
      if (row.status && row.status !== 'pending') continue;
      try {
        await this.deliver(row.destination, row.eventSeq);
        await this.db
          .update(eventOutbox)
          .set({
            status: 'sent',
            sentAt: new Date(),
            lastError: null,
          })
          .where(eq(eventOutbox.id, row.id));
        sent += 1;
      } catch (error) {
        failed += 1;
        const attempts = (row.attempts ?? 0) + 1;
        const dead = attempts >= MAX_ATTEMPTS;
        const message =
          error instanceof Error ? error.message : 'outbox delivery failed';
        await this.db
          .update(eventOutbox)
          .set({
            status: dead ? 'dead' : 'failed',
            attempts,
            lastError: message,
            nextAttemptAt: new Date(Date.now() + 2 ** Math.min(attempts, 8) * 1000),
          })
          .where(eq(eventOutbox.id, row.id));
        this.logger.warn(
          `outbox ${row.id} → ${row.destination} failed (${attempts}): ${message}`,
        );
      }
    }

    return { claimed: batch.length, sent, failed };
  }

  private async deliver(destination: string, eventSeq: number): Promise<void> {
    if (destination === REPUTATION_OUTBOX_DESTINATION) {
      await this.reputation.projectUpTo(eventSeq);
      return;
    }

    const event = await this.db.query.events.findFirst({
      where: eq(events.seq, eventSeq),
    });
    if (!event) {
      throw new Error(`outbox event ${eventSeq} is missing`);
    }
    this.logger.debug(`outbox ${destination} seq=${eventSeq} type=${event.type}`);
  }
}
