export type WorkflowEngineName = 'inline' | 'bullmq' | 'temporal';

/**
 * Horizon picks the substrate. A single swap stays in the request. Several short steps go
 * through BullMQ (retries). Loan protection waits for days — that is Temporal.
 */
export function chooseEngine(
  kind: string | null | undefined,
  stepCount: number,
): WorkflowEngineName {
  if (kind === 'protect') {
    return 'temporal';
  }
  if (stepCount > 1) {
    return 'bullmq';
  }
  return 'inline';
}
