import {
  baseUnitsToDecimal,
  projectReputation,
  scoreFacts,
} from './reputation-score';

const AGENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa30';

describe('reputation projection', () => {
  it('scores an agent with no evidence at 50 — same as a missing row', () => {
    expect(
      scoreFacts({
        jobsCompleted: 0,
        jobsFailed: 0,
        jobsDisputed: 0,
        disputesLost: 0,
        x402Requests: 0,
        x402Failures: 0,
        latencies: [],
        volumeBase: 0n,
      }),
    ).toBe(50);
  });

  it('replays job.settled onto the worker, not the hiring user', () => {
    const rows = projectReputation([
      {
        seq: 1,
        type: 'job.created',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'user',
        actorId: 'user-1',
        payload: { workerAgentId: AGENT, amount: '10000000000000000' },
      },
      {
        seq: 2,
        type: 'job.settled',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'user',
        actorId: 'user-1',
        payload: { amount: '10000000000000000' },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(AGENT);
    expect(rows[0]?.jobsCompleted).toBe(1);
    expect(rows[0]?.volumeUsd).toBe('0.01');
    expect(rows[0]?.score).toBeGreaterThan(50);
  });

  it('counts disputes and refunds against the worker', () => {
    const rows = projectReputation([
      {
        seq: 1,
        type: 'job.delivered',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'agent',
        actorId: AGENT,
        payload: {},
      },
      {
        seq: 2,
        type: 'job.disputed',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'user',
        actorId: 'user-1',
        payload: {},
      },
      {
        seq: 3,
        type: 'job.refunded',
        subjectType: 'job',
        subjectId: 'job-1',
        actorKind: 'user',
        actorId: 'user-1',
        payload: {},
      },
    ]);

    expect(rows[0]).toMatchObject({
      agentId: AGENT,
      jobsFailed: 1,
      jobsDisputed: 1,
    });
    expect(rows[0]?.score).toBeLessThan(50);
  });

  it('attributes x402 rows to the paying or receiving agent', () => {
    const rows = projectReputation([
      {
        seq: 1,
        type: 'x402.outbound_recorded',
        subjectType: 'x402_payment',
        subjectId: 'pay-1',
        actorKind: 'system',
        payload: {
          payerAgentId: AGENT,
          status: 'settled',
          amount: '10000000000000000',
          latencyMs: 80,
        },
      },
      {
        seq: 2,
        type: 'x402.outbound_recorded',
        subjectType: 'x402_payment',
        subjectId: 'pay-2',
        actorKind: 'system',
        payload: { payerAgentId: AGENT, status: 'failed', latencyMs: 200 },
      },
    ]);

    expect(rows[0]).toMatchObject({
      agentId: AGENT,
      x402Requests: 2,
      x402Failures: 1,
      p50LatencyMs: 80,
      p95LatencyMs: 200,
    });
  });

  it('formats base units as a decimal string', () => {
    expect(baseUnitsToDecimal(10_000_000_000_000_000n)).toBe('0.01');
    expect(baseUnitsToDecimal(0n)).toBe('0');
  });
});
