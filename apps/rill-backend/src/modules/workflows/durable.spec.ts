import { chooseEngine } from './choose-engine';
import { retryBackoffMs } from './queues/queues.constants';
import { MemoryWorkflowQueue } from './queues/workflow-queue';
import {
  healthFactorBelow,
  initialLoanProtection,
  reduceLoanProtection,
  runLoanProtection,
} from './temporal/loan-protection';

describe('chooseEngine', () => {
  it('keeps a single swap inline', () => {
    expect(chooseEngine('swap', 1)).toBe('inline');
  });

  it('queues a short multi-step DAG', () => {
    expect(chooseEngine('swap', 2)).toBe('bullmq');
  });

  it('sends loan protection to Temporal', () => {
    expect(chooseEngine('protect', 4)).toBe('temporal');
  });
});

describe('retryBackoffMs', () => {
  it('doubles from the base delay', () => {
    expect(retryBackoffMs(1, 1000)).toBe(1000);
    expect(retryBackoffMs(2, 1000)).toBe(2000);
    expect(retryBackoffMs(3, 1000)).toBe(4000);
  });
});

describe('MemoryWorkflowQueue', () => {
  it('retries a failed step then succeeds', async () => {
    const queue = new MemoryWorkflowQueue();
    let attempts = 0;
    queue.register(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('transient');
      }
    });
    await queue.enqueue({ workflowId: 'wf', userId: 'user' });
    expect(attempts).toBe(3);
    expect(queue.jobs).toHaveLength(1);
  });
});

describe('loan protection machine', () => {
  const base = initialLoanProtection({ threshold: '1.3', maxChecks: 3 });

  it('waits while health factor is above the threshold', () => {
    let state = reduceLoanProtection(base, { type: 'monitored' });
    state = reduceLoanProtection(state, { type: 'waited' });
    state = reduceLoanProtection(state, {
      type: 'health',
      healthFactor: '1.42',
      sessionValid: true,
    });
    expect(state.phase).toBe('waiting');
    expect(healthFactorBelow('1.42', '1.3')).toBe(false);
  });

  it('executes when HF drops and the session is still valid', () => {
    let state = reduceLoanProtection(base, { type: 'monitored' });
    state = reduceLoanProtection(state, { type: 'waited' });
    state = reduceLoanProtection(state, {
      type: 'health',
      healthFactor: '1.1',
      sessionValid: true,
    });
    expect(state.phase).toBe('execute');
    state = reduceLoanProtection(state, { type: 'executed' });
    state = reduceLoanProtection(state, { type: 'verified', ok: true });
    expect(state.phase).toBe('completed');
  });

  it('fails closed if the session expired before execute', () => {
    let state = reduceLoanProtection(base, { type: 'monitored' });
    state = reduceLoanProtection(state, { type: 'waited' });
    state = reduceLoanProtection(state, {
      type: 'health',
      healthFactor: '1.0',
      sessionValid: false,
    });
    expect(state.phase).toBe('failed');
    expect(state.reason).toBe('session_expired');
  });

  it('expires after maxChecks waits', () => {
    let state = reduceLoanProtection(
      initialLoanProtection({ threshold: '1.3', maxChecks: 1 }),
      { type: 'monitored' },
    );
    state = reduceLoanProtection(state, { type: 'waited' });
    state = reduceLoanProtection(state, {
      type: 'health',
      healthFactor: '2',
      sessionValid: true,
    });
    state = reduceLoanProtection(state, { type: 'waited' });
    expect(state.phase).toBe('expired');
  });

  it('runs the loop with injected activities', async () => {
    const result = await runLoanProtection(
      {
        monitor: async () => undefined,
        assertSession: async () => true,
        checkHealthFactor: async () => '1.1',
        executeProtection: async () => undefined,
        verify: async () => true,
      },
      {
        workflowId: 'wf',
        userId: 'user',
        threshold: '1.3',
        checkEveryMs: 0,
        maxChecks: 2,
      },
      async () => undefined,
    );
    expect(result.phase).toBe('completed');
  });
});
