import { Global, Module } from '@nestjs/common';

import { EventStoreService } from './event-store.service';

// TODO: outbox draining and the audit-trail read API. Appending works; delivery does not yet.
/**
 * Event store, outbox and audit trail. Every state transition in the system lands here so any
 * run — planning, authorization, payment, execution — is auditable and replayable.
 *
 * Global because every module emits events, and the store must never be the reason a module
 * takes on a dependency it otherwise would not have.
 */
@Global()
@Module({
  providers: [EventStoreService],
  exports: [EventStoreService],
})
export class EventsModule {}
