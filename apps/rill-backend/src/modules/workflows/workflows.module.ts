import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RillConfigService } from '../../config/app.config';
import { RedisWorkflowQueue } from './queues/redis-queue';
import {
  MemoryWorkflowQueue,
  WORKFLOW_QUEUE,
  type WorkflowQueue,
} from './queues/workflow-queue';
import { TemporalClientRuntime } from './temporal/temporal-client.provider';
import {
  MemoryTemporalRuntime,
  TEMPORAL_RUNTIME,
  type TemporalRuntime,
} from './temporal/temporal-runtime';
import { WorkflowRunnerService } from './temporal/workflow-runner.service';

export { WORKFLOW_QUEUE } from './queues/workflow-queue';
export { TEMPORAL_RUNTIME } from './temporal/temporal-runtime';
export { chooseEngine } from './choose-engine';
export { WorkflowRunnerService } from './temporal/workflow-runner.service';

/**
 * Two execution substrates, chosen by workflow horizon:
 *   BullMQ (Redis) — short-lived jobs: a swap retry, a multi-step DAG
 *   Temporal       — durable workflows: "monitor my loan for 7 days and act when HF < 1.3"
 * Tests never connect to Redis or Temporal; they use in-memory adapters.
 */
@Module({
  providers: [
    WorkflowRunnerService,
    {
      provide: WORKFLOW_QUEUE,
      inject: [ConfigService],
      useFactory: (config: RillConfigService): WorkflowQueue => {
        if (config.get('app.env', { infer: true }) === 'test') {
          return new MemoryWorkflowQueue();
        }
        try {
          return RedisWorkflowQueue.connect(
            config.get('redis.url', { infer: true }),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'redis unavailable';
          new Logger('WorkflowsModule').warn(
            `BullMQ not connected (${message}); using in-process queue`,
          );
          return new MemoryWorkflowQueue();
        }
      },
    },
    {
      provide: TEMPORAL_RUNTIME,
      inject: [ConfigService],
      useFactory: async (
        config: RillConfigService,
      ): Promise<TemporalRuntime> => {
        if (config.get('app.env', { infer: true }) === 'test') {
          return new MemoryTemporalRuntime();
        }
        return TemporalClientRuntime.connect({
          address: config.get('temporal.address', { infer: true }),
          namespace: config.get('temporal.namespace', { infer: true }),
          taskQueue: config.get('temporal.taskQueue', { infer: true }),
        });
      },
    },
  ],
  exports: [WorkflowRunnerService, WORKFLOW_QUEUE, TEMPORAL_RUNTIME],
})
export class WorkflowsModule {}
