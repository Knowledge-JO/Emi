import type { ParsedIntent } from '../../database/schema/intents';

/** Canonical object for "protect my BNB loan". Planner expands this into a DAG. */
export const PROTECT_BNB_LOAN: ParsedIntent = {
  kind: 'protect',
  summary: 'Protect my BNB loan',
  confidence: 0.88,
  rejected: false,
  rejectionReason: null,
  chain: 'bnb',
  legs: [
    {
      type: 'monitor',
      taxonomyKey: 'defi.lending.protect',
      from: { symbol: 'BNB', amount: null },
      to: { symbol: 'BNB', amount: null },
    },
  ],
  goalTree: {
    id: 'protect',
    goal: 'Protect my BNB loan',
    children: [
      { id: 'monitor', goal: 'Monitor the position', children: [] },
      { id: 'risk', goal: 'Calculate health factor', children: [] },
      { id: 'swap', goal: 'Obtain the repayment asset', children: [] },
      { id: 'repay', goal: 'Repay or withdraw', children: [] },
    ],
  },
  missing: ['health-factor threshold', 'which wallet pays'],
  assumptions: ['Collateral is BNB', 'Repayment asset is USDT'],
};
