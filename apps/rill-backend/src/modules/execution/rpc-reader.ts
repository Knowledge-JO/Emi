import { Inject, Injectable } from '@nestjs/common';
import type { Hex } from 'viem';

import {
  CHAIN_PUBLIC_CLIENT,
  type ChainPublicClient,
} from '../blockchain/chain-client.provider';
import { ERC20_ABI, PANCAKE_V2_ROUTER_ABI } from './pancake-v2';

export type QuoteReader = {
  getAmountsOut(
    router: string,
    amountIn: bigint,
    path: string[],
  ): Promise<readonly bigint[]>;
};

/**
 * Read-only RPC. Quotes and decimals never go through a session.
 */
@Injectable()
export class ChainRpcReader implements QuoteReader {
  constructor(
    @Inject(CHAIN_PUBLIC_CLIENT) private readonly client: ChainPublicClient,
  ) {}

  async getAmountsOut(
    router: string,
    amountIn: bigint,
    path: string[],
  ): Promise<readonly bigint[]> {
    return this.client.readContract({
      address: router as `0x${string}`,
      abi: PANCAKE_V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, path as `0x${string}`[]],
    });
  }

  async tokenDecimals(token: string): Promise<number> {
    return this.client.readContract({
      address: token as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
  }
}
