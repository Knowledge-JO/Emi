import { Inject, Injectable } from '@nestjs/common';
import type { Hex } from 'viem';

import {
  CHAIN_PUBLIC_CLIENT,
  type ChainPublicClient,
} from '../blockchain/chain-client.provider';
import { ERC8004_REGISTRY_ABI } from './erc8004-abi';
import type { Erc8004ChainReader } from './erc8004-read';

/**
 * Identity reads the registry with viem. It does not import WalletModule or the Altana SDK —
 * those are for sessions. The shared public client is enough for ownerOf / tokenURI.
 */
@Injectable()
export class ViemErc8004ChainReader implements Erc8004ChainReader {
  constructor(
    @Inject(CHAIN_PUBLIC_CLIENT) private readonly client: ChainPublicClient,
  ) {}

  ownerOf(registry: Hex, tokenId: bigint): Promise<Hex> {
    return this.client.readContract({
      address: registry,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    });
  }

  tokenURI(registry: Hex, tokenId: bigint): Promise<string> {
    return this.client.readContract({
      address: registry,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'tokenURI',
      args: [tokenId],
    });
  }

  blockNumber(): Promise<bigint> {
    return this.client.getBlockNumber();
  }
}
