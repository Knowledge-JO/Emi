import { LoanGuardianComposerService } from './loan-guardian-composer.service';

describe('LoanGuardianComposerService', () => {
  it('is idempotent on an already-succeeded monitor hire', async () => {
    const steps = [
      {
        step: {
          id: 'step-monitor',
          stepKey: 'monitor',
          sequence: 1,
          status: 'succeeded',
          paymentRail: 'erc8183',
          attempts: 1,
          startedAt: new Date(),
          input: {},
          output: { rail: 'erc8183', hired: true },
        },
        taxonomyKey: 'research.screen',
        capabilityName: 'screen',
        x402ResourceUrl: null,
        agentSlug: 'token-radar',
        agentId: 'agent-radar',
        canSubcontract: false,
      },
      {
        step: {
          id: 'step-repay',
          stepKey: 'repay',
          sequence: 4,
          status: 'pending',
          paymentRail: 'erc8183',
          attempts: 0,
          startedAt: null,
          input: {},
          output: null,
        },
        taxonomyKey: 'defi.lending.supply',
        capabilityName: 'supply',
        x402ResourceUrl: null,
        agentSlug: 'loan-guardian',
        agentId: 'agent-loan',
        canSubcontract: true,
      },
    ];

    const router = { dispatch: jest.fn() };
    const db = {
      query: {
        workflows: {
          findFirst: () =>
            Promise.resolve({
              id: 'wf',
              sessionId: 'sess',
              graph: { nodes: [] },
            }),
        },
        sessions: {
          findFirst: () =>
            Promise.resolve({
              id: 'sess',
              expiresAt: new Date(Date.now() + 60_000),
              chainId: 56,
              serialized: { permissions: { calls: [] } },
            }),
        },
      },
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => Promise.resolve(steps),
            }),
          }),
        }),
      }),
      update: () => ({
        set: () => ({ where: () => Promise.resolve([]) }),
      }),
    };

    const service = new LoanGuardianComposerService(
      db as never,
      router as never,
      { findForUser: async () => ({ id: 'w', address: '0xabc' }) } as never,
      { get: () => undefined } as never,
      { record: jest.fn() } as never,
      { append: jest.fn() } as never,
    );

    await service.monitor('wf', 'user-1');
    expect(router.dispatch).not.toHaveBeenCalled();
  });
});
