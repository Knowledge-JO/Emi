import { chooseRail, hasBlockedPending, nextReadySteps } from './agent-router';

describe('agent router', () => {
  it('dispatches write-onchain ERC-8183 over the user session', () => {
    expect(chooseRail({ paymentRail: 'erc8183', writeOnchain: true })).toBe(
      'session',
    );
  });

  it('lets a composer override SwapMaster onto ERC-8183', () => {
    expect(
      chooseRail({
        paymentRail: 'erc8183',
        writeOnchain: true,
        railOverride: 'erc8183',
      }),
    ).toBe('erc8183');
  });

  it('keeps x402 on its own rail', () => {
    expect(chooseRail({ paymentRail: 'x402', writeOnchain: false })).toBe(
      'x402',
    );
  });

  it('hires a zero-scope listing over ERC-8183', () => {
    expect(chooseRail({ paymentRail: 'erc8183', writeOnchain: false })).toBe(
      'erc8183',
    );
  });

  it('unlocks repay only after risk and swap succeed', () => {
    const steps = [
      pending('monitor', 1, []),
      pending('risk', 2, ['monitor']),
      pending('swap', 3, ['risk']),
      pending('repay', 4, ['swap', 'risk']),
    ];

    expect(nextReadySteps(steps).map((step) => step.stepKey)).toEqual([
      'monitor',
    ]);

    steps[0]!.status = 'succeeded';
    steps[1]!.status = 'succeeded';
    expect(nextReadySteps(steps).map((step) => step.stepKey)).toEqual(['swap']);

    steps[2]!.status = 'succeeded';
    expect(nextReadySteps(steps).map((step) => step.stepKey)).toEqual([
      'repay',
    ]);
    expect(hasBlockedPending(steps)).toBe(false);
  });

  it('detects a blocked graph when a parent never succeeds', () => {
    const steps = [
      { ...pending('swap', 1, []), status: 'failed' },
      pending('repay', 2, ['swap']),
    ];
    expect(hasBlockedPending(steps)).toBe(true);
  });
});

function pending(
  stepKey: string,
  sequence: number,
  dependsOn: string[],
) {
  return {
    stepKey,
    status: 'pending',
    sequence,
    paymentRail: 'erc8183',
    writeOnchain: true,
    dependsOn,
  };
}
