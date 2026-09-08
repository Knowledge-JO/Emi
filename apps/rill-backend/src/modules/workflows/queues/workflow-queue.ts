import {
  retryBackoffMs,
  STEP_RETRY,
  type DispatchStepJob,
} from './queues.constants';

export const WORKFLOW_QUEUE = 'WORKFLOW_QUEUE';

export type WorkflowJobHandler = (job: DispatchStepJob) => Promise<void>;

export type WorkflowQueue = {
  enqueue(job: DispatchStepJob): Promise<void>;
  register(handler: WorkflowJobHandler): void;
};

/**
 * In-process queue with the same retry/backoff policy BullMQ uses. Tests run with sleep skipped
 * so a failed step retries immediately. Production Redis is a different adapter.
 */
export class MemoryWorkflowQueue implements WorkflowQueue {
  readonly jobs: DispatchStepJob[] = [];
  private handler: WorkflowJobHandler | null = null;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(sleep: (ms: number) => Promise<void> = () => Promise.resolve()) {
    this.sleep = sleep;
  }

  register(handler: WorkflowJobHandler): void {
    this.handler = handler;
  }

  async enqueue(job: DispatchStepJob): Promise<void> {
    this.jobs.push(job);
    if (!this.handler) {
      return;
    }
    let lastError: unknown;
    for (let attempt = 1; attempt <= STEP_RETRY.attempts; attempt += 1) {
      try {
        await this.handler(job);
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= STEP_RETRY.attempts) {
          break;
        }
        await this.sleep(retryBackoffMs(attempt));
      }
    }
    throw lastError;
  }
}
