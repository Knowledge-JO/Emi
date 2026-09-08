export type TemporalHandle = {
  workflowId: string;
  runId: string;
};

export type TemporalRuntime = {
  startLoanProtection(input: {
    workflowId: string;
    userId: string;
    threshold: string;
    checkEveryMs: number;
    maxChecks: number;
  }): Promise<TemporalHandle>;
};

export const TEMPORAL_RUNTIME = 'TEMPORAL_RUNTIME';

/** Records starts. A worker is not required — tests assert the handle, not a cluster. */
export class MemoryTemporalRuntime implements TemporalRuntime {
  readonly started: TemporalHandle[] = [];

  async startLoanProtection(input: {
    workflowId: string;
  }): Promise<TemporalHandle> {
    const handle = {
      workflowId: `loan-${input.workflowId}`,
      runId: `run-${this.started.length + 1}`,
    };
    this.started.push(handle);
    return handle;
  }
}
