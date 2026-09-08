import { Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

import {
  STEP_RETRY,
  WORKFLOW_JOBS,
  WORKFLOW_QUEUES,
  type DispatchStepJob,
} from './queues.constants';
import type { WorkflowJobHandler, WorkflowQueue } from './workflow-queue';

const logger = new Logger('RedisWorkflowQueue');

export class RedisWorkflowQueue implements WorkflowQueue {
  private handler: WorkflowJobHandler | null = null;
  private worker: Worker<DispatchStepJob> | null = null;

  constructor(
    private readonly queue: Queue<DispatchStepJob>,
    private readonly connection: IORedis,
  ) {}

  static connect(url: string): RedisWorkflowQueue {
    const connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 1_000,
    });
    const queue = new Queue<DispatchStepJob>(WORKFLOW_QUEUES.execution, {
      connection,
      defaultJobOptions: {
        attempts: STEP_RETRY.attempts,
        backoff: { type: 'exponential', delay: STEP_RETRY.backoffMs },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
    return new RedisWorkflowQueue(queue, connection);
  }

  register(handler: WorkflowJobHandler): void {
    this.handler = handler;
    if (this.worker) {
      return;
    }
    this.worker = new Worker<DispatchStepJob>(
      WORKFLOW_QUEUES.execution,
      async (job) => {
        if (!this.handler) {
          throw new Error('No execution processor registered');
        }
        await this.handler(job.data);
      },
      { connection: this.connection },
    );
    this.worker.on('failed', (job, error) => {
      logger.warn(
        `step job ${job?.id} failed (${job?.attemptsMade}): ${error.message}`,
      );
    });
  }

  async enqueue(job: DispatchStepJob): Promise<void> {
    await this.queue.add(WORKFLOW_JOBS.dispatchStep, job);
  }
}
