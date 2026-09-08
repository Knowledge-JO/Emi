import { type Hex, type PublicClient } from 'viem';

import { ERC8004_REGISTRY_ABI } from './erc8004-abi';

export type Erc8004ChainReader = {
  ownerOf(registry: Hex, tokenId: bigint): Promise<Hex>;
  tokenURI(registry: Hex, tokenId: bigint): Promise<string>;
  blockNumber(): Promise<bigint>;
};

export type LiveRegistryRead = {
  owner: string;
  uri: string;
  block: number;
};

export const ERC8004_CHAIN_READER = Symbol('ERC8004_CHAIN_READER');

export function viemPublicClientReader(
  client: Pick<PublicClient, 'readContract' | 'getBlockNumber'>,
): Erc8004ChainReader {
  return {
    ownerOf(registry, tokenId) {
      return client.readContract({
        address: registry,
        abi: ERC8004_REGISTRY_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
      });
    },
    tokenURI(registry, tokenId) {
      return client.readContract({
        address: registry,
        abi: ERC8004_REGISTRY_ABI,
        functionName: 'tokenURI',
        args: [tokenId],
      });
    },
    blockNumber() {
      return client.getBlockNumber();
    },
  };
}

export async function readErc8004Agent(
  reader: Erc8004ChainReader,
  registry: string,
  agentId: bigint,
): Promise<LiveRegistryRead> {
  const address = registry.toLowerCase() as Hex;
  const [owner, uri, block] = await Promise.all([
    reader.ownerOf(address, agentId),
    reader.tokenURI(address, agentId),
    reader.blockNumber(),
  ]);

  return {
    owner: owner.toLowerCase(),
    uri,
    block: Number(block),
  };
}
