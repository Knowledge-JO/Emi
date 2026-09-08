export const WORKFLOW_QUEUES = {
  execution: 'rill.workflow.execution',
} as const;

export const WORKFLOW_JOBS = {
  dispatchStep: 'dispatch-step',
} as const;

export const STEP_RETRY = {
  attempts: 5,
  backoffMs: 1_000,
} as const;

export type DispatchStepJob = {
  workflowId: string;
  userId: string;
};

export function retryBackoffMs(
  attempt: number,
  baseMs: number = STEP_RETRY.backoffMs,
): number {
  const n = Math.max(1, attempt);
  return baseMs * 2 ** Math.min(n - 1, 8);
}
