import { EventStoreService } from '../../events/event-store.service';
import { MemoryTemporalRuntime } from './temporal-runtime';
import { WorkflowRunnerService } from './workflow-runner.service';

describe('WorkflowRunnerService', () => {
  it('persists the Temporal handle on the workflows row', async () => {
    const rows: Record<string, unknown>[] = [
      { id: 'wf-1', status: 'authorized', engine: 'inline' },
    ];
    const db = {
      query: {
        sessions: { findFirst: async () => undefined },
        workflows: { findFirst: async () => rows[0] },
      },
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: () => {
            rows[0] = { ...rows[0], ...values };
            const done = Promise.resolve([rows[0]]);
            return Object.assign(done, { returning: () => done });
          },
        }),
      }),
    };
    const events = { append: jest.fn().mockResolvedValue(undefined) };
    const temporal = new MemoryTemporalRuntime();
    const runner = new WorkflowRunnerService(
      db as never,
      temporal,
      events as unknown as EventStoreService,
    );

    const result = await runner.startLoanProtection({
      workflowId: 'wf-1',
      userId: 'user-1',
    });

    expect(result.handle.workflowId).toBe('loan-wf-1');
    expect(result.workflow?.temporalWorkflowId).toBe('loan-wf-1');
    expect(result.workflow?.status).toBe('waiting');
    expect(result.workflow?.engine).toBe('temporal');
    expect(events.append).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workflow.temporal_started' }),
    );
  });
});
