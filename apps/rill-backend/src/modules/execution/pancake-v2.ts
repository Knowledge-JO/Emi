import { encodeFunctionData, type Hex } from 'viem';

/** PancakeSwap V2 router — Uniswap V2 surface we actually call. */
export const PANCAKE_V2_ROUTER_ABI = [
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export function encodeApprove(spender: string, amount: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender as `0x${string}`, amount],
  });
}

export function encodeSwapExactTokensForTokens(input: {
  amountIn: bigint;
  amountOutMin: bigint;
  path: string[];
  to: string;
  deadline: number;
}): Hex {
  return encodeFunctionData({
    abi: PANCAKE_V2_ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [
      input.amountIn,
      input.amountOutMin,
      input.path as `0x${string}`[],
      input.to as `0x${string}`,
      BigInt(input.deadline),
    ],
  });
}
