import {
  composeProtectActions,
  healthFactorFromRiskBody,
  LOAN_GUARDIAN_SLUG,
} from './loan-guardian-economy';

describe('Loan Guardian composer', () => {
  const steps = [
    {
      stepKey: 'monitor',
      agentSlug: 'token-radar',
      paymentRail: 'erc8183',
      writeOnchain: false,
    },
    {
      stepKey: 'risk',
      agentSlug: 'risk-oracle',
      paymentRail: 'x402',
      writeOnchain: false,
    },
    {
      stepKey: 'swap',
      agentSlug: 'swapmaster',
      paymentRail: 'erc8183',
      writeOnchain: true,
    },
    {
      stepKey: 'repay',
      agentSlug: 'loan-guardian',
      paymentRail: 'erc8183',
      writeOnchain: true,
    },
  ];

  it('buys risk, hires swap, and keeps Aave on the user session', () => {
    const actions = composeProtectActions(LOAN_GUARDIAN_SLUG, steps);
    expect(actions).toEqual([
      { stepKey: 'monitor', rail: 'erc8183', actor: 'composer' },
      { stepKey: 'risk', rail: 'x402', actor: 'composer' },
      { stepKey: 'swap', rail: 'erc8183', actor: 'composer' },
      { stepKey: 'repay', rail: 'session', actor: 'user' },
    ]);
  });

  it('does not let SwapMaster steal the user session when composing', () => {
    const swap = composeProtectActions(LOAN_GUARDIAN_SLUG, steps).find(
      (row) => row.stepKey === 'swap',
    );
    expect(swap?.rail).toBe('erc8183');
    expect(swap?.actor).toBe('composer');
  });
});

describe('healthFactorFromRiskBody', () => {
  it('reads the x402 JSON the merchant returns', () => {
    expect(healthFactorFromRiskBody({ healthFactor: '1.1' })).toBe('1.1');
    expect(healthFactorFromRiskBody({ healthFactor: 1.42 })).toBe('1.42');
    expect(healthFactorFromRiskBody({ paid: true })).toBeNull();
  });
});
