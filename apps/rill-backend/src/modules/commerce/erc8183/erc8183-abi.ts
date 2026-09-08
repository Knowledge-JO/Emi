import { encodeFunctionData, type Hex } from 'viem';

import type { Erc8183Stack } from './erc8183-addresses';

export const ERC8183_COMMERCE_ABI = [
  {
    name: 'createJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'evaluator', type: 'address' },
      { name: 'expiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'hook', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'setBudget',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'optParams', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'fund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'expectedBudget', type: 'uint256' },
      { name: 'optParams', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'deliverable', type: 'bytes32' },
      { name: 'optParams', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'getJob',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'client', type: 'address' },
          { name: 'provider', type: 'address' },
          { name: 'evaluator', type: 'address' },
          { name: 'description', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'expiredAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'hook', type: 'address' },
          { name: 'submittedAt', type: 'uint256' },
          { name: 'deliverable', type: 'bytes32' },
        ],
      },
    ],
  },
  {
    name: 'jobCounter',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const ERC8183_ROUTER_ABI = [
  {
    name: 'registerJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'policy', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'settle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'evidence', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export const ERC8183_POLICY_ABI = [
  {
    name: 'dispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'disputeWindow',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const JOB_STATUS = [
  'OPEN',
  'FUNDED',
  'SUBMITTED',
  'COMPLETED',
  'REJECTED',
  'EXPIRED',
] as const;

export type JobStatusName = (typeof JOB_STATUS)[number];

export type EncodedCall = {
  to: string;
  data: Hex;
  value: '0';
  signature: string;
};

export type HireCallInput = {
  stack: Erc8183Stack;
  jobId: bigint;
  provider: string;
  description: string;
  budget: bigint;
  expiredAt: bigint;
};

/** Five atomic hire calls. Selector-scoped — never `{ to: commerce }` alone. */
export function encodeHireCalls(input: HireCallInput): EncodedCall[] {
  if (new TextEncoder().encode(input.description).length > 4096) {
    throw new Error('ERC-8183 description exceeds 4096 bytes');
  }
  const { stack: a, jobId } = input;
  return [
    {
      to: a.commerce,
      signature: 'createJob(address,address,uint256,string,address)',
      value: '0',
      data: encodeFunctionData({
        abi: ERC8183_COMMERCE_ABI,
        functionName: 'createJob',
        args: [
          input.provider as Hex,
          a.router as Hex,
          input.expiredAt,
          input.description,
          a.router as Hex,
        ],
      }),
    },
    {
      to: a.router,
      signature: 'registerJob(uint256,address)',
      value: '0',
      data: encodeFunctionData({
        abi: ERC8183_ROUTER_ABI,
        functionName: 'registerJob',
        args: [jobId, a.policy as Hex],
      }),
    },
    {
      to: a.commerce,
      signature: 'setBudget(uint256,uint256,bytes)',
      value: '0',
      data: encodeFunctionData({
        abi: ERC8183_COMMERCE_ABI,
        functionName: 'setBudget',
        args: [jobId, input.budget, '0x'],
      }),
    },
    {
      to: a.paymentToken,
      signature: 'approve(address,uint256)',
      value: '0',
      data: encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [a.commerce as Hex, input.budget],
      }),
    },
    {
      to: a.commerce,
      signature: 'fund(uint256,uint256,bytes)',
      value: '0',
      data: encodeFunctionData({
        abi: ERC8183_COMMERCE_ABI,
        functionName: 'fund',
        args: [jobId, input.budget, '0x'],
      }),
    },
  ];
}

export function encodeSubmitCall(
  stack: Erc8183Stack,
  jobId: bigint,
  deliverable: Hex,
  optParams: Hex = '0x',
): EncodedCall {
  return {
    to: stack.commerce,
    signature: 'submit(uint256,bytes32,bytes)',
    value: '0',
    data: encodeFunctionData({
      abi: ERC8183_COMMERCE_ABI,
      functionName: 'submit',
      args: [jobId, deliverable, optParams],
    }),
  };
}

export function encodeSettleCall(stack: Erc8183Stack, jobId: bigint): EncodedCall {
  return {
    to: stack.router,
    signature: 'settle(uint256,bytes)',
    value: '0',
    data: encodeFunctionData({
      abi: ERC8183_ROUTER_ABI,
      functionName: 'settle',
      args: [jobId, '0x'],
    }),
  };
}

export function encodeDisputeCall(stack: Erc8183Stack, jobId: bigint): EncodedCall {
  return {
    to: stack.policy,
    signature: 'dispute(uint256)',
    value: '0',
    data: encodeFunctionData({
      abi: ERC8183_POLICY_ABI,
      functionName: 'dispute',
      args: [jobId],
    }),
  };
}

export function encodeClaimRefundCall(
  stack: Erc8183Stack,
  jobId: bigint,
): EncodedCall {
  return {
    to: stack.commerce,
    signature: 'claimRefund(uint256)',
    value: '0',
    data: encodeFunctionData({
      abi: ERC8183_COMMERCE_ABI,
      functionName: 'claimRefund',
      args: [jobId],
    }),
  };
}

export function hirePermissions(stack: Erc8183Stack) {
  return [
    { to: stack.commerce, signature: 'createJob(address,address,uint256,string,address)' },
    { to: stack.router, signature: 'registerJob(uint256,address)' },
    { to: stack.commerce, signature: 'setBudget(uint256,uint256,bytes)' },
    { to: stack.paymentToken, signature: 'approve(address,uint256)' },
    { to: stack.commerce, signature: 'fund(uint256,uint256,bytes)' },
    { to: stack.router, signature: 'settle(uint256,bytes)' },
    { to: stack.policy, signature: 'dispute(uint256)' },
    { to: stack.commerce, signature: 'claimRefund(uint256)' },
  ];
}

export function submitPermissions(stack: Erc8183Stack) {
  return [{ to: stack.commerce, signature: 'submit(uint256,bytes32,bytes)' }];
}
