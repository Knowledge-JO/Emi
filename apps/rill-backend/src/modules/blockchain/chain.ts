import { createPublicClient, http, type PublicClient } from 'viem';
import { bsc, bscTestnet, mainnet } from 'viem/chains';

/**
 * The public-client surface the rest of the platform injects. Signing never goes through here.
 */
export type ChainPublicClient = Pick<
  PublicClient,
  'readContract' | 'getBlockNumber' | 'getTransactionReceipt' | 'getLogs'
> & { chain?: { id: number } };

/** BSC primary; testnet when `ALTANA_CHAIN=bnb-testnet`; Ethereum only if config allows it. */
export function viemChainFor(chainId: number) {
  if (chainId === 97) return bscTestnet;
  if (chainId === 1) return mainnet;
  return bsc;
}

export function createChainPublicClient(
  rpcUrl: string,
  chainId: number,
): PublicClient {
  return createPublicClient({
    chain: viemChainFor(chainId),
    transport: http(rpcUrl),
  });
}
