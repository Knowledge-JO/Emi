import type { ParsedIntent } from '../../database/schema/intents';

/** Canonical object for "swap 5 usdt for bnb". Used by parser tests and the HTTP suite. */
export const SWAP_FIVE_USDT: ParsedIntent = {
  kind: 'swap',
  summary: 'Swap 5 USDT for BNB',
  confidence: 0.94,
  rejected: false,
  rejectionReason: null,
  chain: 'bnb',
  legs: [
    {
      type: 'swap',
      taxonomyKey: 'defi.swap',
      from: { symbol: 'USDT', amount: '5' },
      to: { symbol: 'BNB', amount: null },
    },
  ],
  goalTree: {
    id: 'root',
    goal: 'Swap 5 USDT for BNB',
    children: [
      {
        id: 'quote',
        goal: 'Obtain a quote to sell 5 USDT for BNB',
        children: [],
      },
      {
        id: 'execute',
        goal: 'Execute the swap of 5 USDT for BNB',
        children: [],
      },
    ],
  },
  missing: ['slippage tolerance', 'which wallet pays'],
  assumptions: ['Amount 5 is USDT, not BNB', 'Target chain is BNB Chain'],
};
