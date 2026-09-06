import { Module } from '@nestjs/common';

// TODO: Event store, outbox and audit trail. Every state transition in the system lands here so
// any run — planning, authorization, payment, execution — is auditable and replayable.
@Module({})
export class EventsModule {}
