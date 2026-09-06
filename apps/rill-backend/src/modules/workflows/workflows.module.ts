import { Module } from '@nestjs/common';

// TODO: Two execution substrates, chosen by workflow horizon:
//   BullMQ (Redis) — short-lived jobs: a swap, a quote, an indexer pass
//   Temporal       — durable workflows: "monitor my loan for 7 days and act when HF < 1.3"
// Anything that must survive a restart or wait for days belongs in Temporal.
@Module({})
export class WorkflowsModule {}
