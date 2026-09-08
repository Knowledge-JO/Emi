import { Global, Module } from '@nestjs/common';

import { EventStoreService } from './event-store.service';
import { OutboxService } from './outbox.service';
import { ReputationController } from './reputation.controller';
import { ReputationProjectionService } from './reputation-projection.service';

/**
 * Event store, outbox and the reputation projection. Every state transition lands in
 * `events`; append also writes `event_outbox` in the same transaction. Drain delivers.
 * `reputation` is written only by the projection job.
 */
@Global()
@Module({
  controllers: [ReputationController],
  providers: [EventStoreService, OutboxService, ReputationProjectionService],
  exports: [EventStoreService, OutboxService, ReputationProjectionService],
})
export class EventsModule {}
