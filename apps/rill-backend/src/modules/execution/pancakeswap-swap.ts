import { subtractSlippage } from '../../common/amount';
import { encodeApprove, encodeSwapExactTokensForTokens } from './pancake-v2';
import type { QuoteReader } from './rpc-reader';

export const SWAP_DEADLINE_SECONDS = 600;

export type BuiltCall = {
  to: string;
  data: string;
  value: string;
};

export type SwapBuildInput = {
  router: string;
  wbnb: string;
  native: string;
  tokenIn: { address: string; decimals: number; isNative: boolean };
  tokenOut: { address: string; decimals: number; isNative: boolean };
  amountIn: bigint;
  recipient: string;
  allowlist: string[];
  slippageBps: number;
  deadline: number;
};

export type SwapBuildResult = {
  play: 'enter-position';
  calls: BuiltCall[];
  quote: {
    amountIn: string;
    amountOut: string;
    amountOutMin: string;
    path: string[];
    slippageBps: number;
    deadline: number;
    /** True when the user asked for BNB and we deliver WBNB (Altana cannot take transfer()). */
    unwrapToNative: boolean;
  };
};

/**
 * PancakeSwap V2 enter-position play. Reads quote on RPC; returns approve + swap calldata.
 * Native BNB out is received as WBNB — Pancake's ETH payout uses a stipend transfer that
 * cannot run an EIP-7702 wallet.
 */
export async function buildPancakeSwapCalls(
  quotes: QuoteReader,
  input: SwapBuildInput,
): Promise<SwapBuildResult> {
  if (input.tokenIn.isNative) {
    throw new Error(
      'Native BNB as the input token is not supported in this play',
    );
  }
  if (input.amountIn <= 0n) {
    throw new Error('Swap amount must be positive');
  }

  const tokenIn = input.tokenIn.address.toLowerCase();
  const tokenOut = input.tokenOut.isNative
    ? input.wbnb.toLowerCase()
    : input.tokenOut.address.toLowerCase();
  const router = input.router.toLowerCase();
  const wbnb = input.wbnb.toLowerCase();
  const recipient = input.recipient.toLowerCase();

  const candidates: string[][] = [[tokenIn, tokenOut]];
  if (tokenIn !== wbnb && tokenOut !== wbnb) {
    candidates.push([tokenIn, wbnb, tokenOut]);
  }

  let best: { path: string[]; amountOut: bigint } | null = null;
  for (const path of candidates) {
    try {
      const amounts = await quotes.getAmountsOut(router, input.amountIn, path);
      const amountOut = amounts[amounts.length - 1];
      if (amountOut == null || amountOut <= 0n) continue;
      if (!best || amountOut > best.amountOut) {
        best = { path, amountOut };
      }
    } catch {
      // Empty or reverting pair — try the next route.
    }
  }

  if (!best) {
    throw new Error('No PancakeSwap V2 route quoted for this pair');
  }

  const amountOutMin = subtractSlippage(best.amountOut, input.slippageBps);
  const calls: BuiltCall[] = [
    {
      to: tokenIn,
      data: encodeApprove(router, input.amountIn),
      value: '0',
    },
    {
      to: router,
      data: encodeSwapExactTokensForTokens({
        amountIn: input.amountIn,
        amountOutMin,
        path: best.path,
        to: recipient,
        deadline: input.deadline,
      }),
      value: '0',
    },
  ];

  const allowed = new Set(
    input.allowlist.map((address) => address.toLowerCase()),
  );
  for (const call of calls) {
    if (!allowed.has(call.to)) {
      throw new Error(`${call.to} is not on the session allowlist`);
    }
  }

  return {
    play: 'enter-position',
    calls,
    quote: {
      amountIn: input.amountIn.toString(),
      amountOut: best.amountOut.toString(),
      amountOutMin: amountOutMin.toString(),
      path: best.path,
      slippageBps: input.slippageBps,
      deadline: input.deadline,
      unwrapToNative: input.tokenOut.isNative,
    },
  };
}
