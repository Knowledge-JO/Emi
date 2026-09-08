import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import {
  DEFAULT_SLIPPAGE_BPS,
  displayAmountToBaseUnits,
} from '../../../common/amount';
import {
  SWAP_DEADLINE_SECONDS,
  buildPancakeSwapCalls,
  type SwapBuildResult,
} from '../pancakeswap-swap';
import { ChainRpcReader } from '../rpc-reader';

export type SwapStepInput = {
  fromSymbol: string;
  toSymbol: string;
  amount: string;
  chain?: string;
};

export type CatalogToken = {
  symbol: string;
  address: string;
  decimals: number;
  isNative: boolean;
};

/**
 * PancakeSwap V2 — quote on RPC, build approve + swap. Never holds a signer.
 */
@Injectable()
export class PancakeswapAdapter {
  constructor(private readonly rpc: ChainRpcReader) {}

  async buildEnterPosition(input: {
    step: SwapStepInput;
    tokenIn: CatalogToken;
    tokenOut: CatalogToken;
    router: string;
    wbnb: string;
    native: string;
    recipient: string;
    allowlist: string[];
    sessionExpiry: number;
    nowSeconds?: number;
    slippageBps?: number;
  }): Promise<SwapBuildResult> {
    const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    const deadline = Math.min(now + SWAP_DEADLINE_SECONDS, input.sessionExpiry);
    if (deadline <= now) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'session_expired',
        error: 'Session expiry is already in the past',
      });
    }

    let amountIn: bigint;
    try {
      amountIn = displayAmountToBaseUnits(
        input.step.amount,
        input.tokenIn.decimals,
      );
    } catch (error) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'swap_amount_invalid',
        error: error instanceof Error ? error.message : 'Invalid swap amount',
      });
    }

    try {
      return await buildPancakeSwapCalls(this.rpc, {
        router: input.router,
        wbnb: input.wbnb,
        native: input.native,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
        amountIn,
        recipient: input.recipient,
        allowlist: input.allowlist,
        slippageBps: input.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
        deadline,
      });
    } catch (error) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'swap_build_failed',
        error: error instanceof Error ? error.message : 'Could not build swap',
      });
    }
  }
}
