import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';

import {
  WORKFLOW_QUEUE,
  type WorkflowQueue,
} from '../workflows/queues/workflow-queue';
import { OrchestratorService } from './orchestrator.service';

/**
 * Short-lived steps. The queue retries with backoff; this processor asks the orchestrator to
 * dispatch the next ready DAG node. Exhausted retries fail the step rather than dying silently.
 */
@Injectable()
export class ExecutionProcessor implements OnModuleInit {
  constructor(
    @Inject(WORKFLOW_QUEUE) private readonly queue: WorkflowQueue,
    private readonly orchestrator: OrchestratorService,
  ) {}

  onModuleInit(): void {
    this.queue.register((job) => this.handle(job));
  }

  async handle(job: { workflowId: string; userId: string }): Promise<void> {
    const result = await this.orchestrator.dispatchQueuedStep(
      job.userId,
      job.workflowId,
    );
    if (result.more) {
      await this.queue.enqueue(job);
    }
  }
}
