import { eq } from 'drizzle-orm';
import { createPublicClient, http } from 'viem';
import { bsc, bscTestnet, mainnet } from 'viem/chains';

import { decodeAgentUri, listingMatchesOnchain } from '../../modules/identity/erc8004-codec';
import {
  readErc8004Agent,
  viemPublicClientReader,
} from '../../modules/identity/erc8004-read';
import { agentIdentities } from '../schema';
import { CATALOG_IDS } from './ids';
import type { SeedDb } from './types';

/**
 * Best-effort live read after seed. Failure is normal: we have not minted SwapMaster, and
 * token id 1 on a shared registry is usually someone else.
 */
export async function syncSwapMasterIdentity(
  db: SeedDb,
  input: { rpcUrl: string; chainId: number; registryAddress: string },
): Promise<void> {
  const cached = await db.query.agentIdentities.findFirst({
    where: eq(agentIdentities.agentId, CATALOG_IDS.agentSwapmaster),
  });
  if (!cached) {
    return;
  }

  const chain =
    input.chainId === 97 ? bscTestnet : input.chainId === 1 ? mainnet : bsc;
  const client = createPublicClient({
    chain,
    transport: http(input.rpcUrl),
  });

  try {
    const live = await readErc8004Agent(
      viemPublicClientReader(client),
      input.registryAddress,
      BigInt(cached.onchainAgentId),
    );
    const decoded = decodeAgentUri(live.uri);
    const matches = listingMatchesOnchain('SwapMaster', decoded);
    const endpoint =
      matches && decoded.kind === 'record'
        ? (decoded.record.services?.find((item) => item.endpoint)?.endpoint ??
          cached.endpointUrl)
        : cached.endpointUrl;
    const domain =
      matches && decoded.kind === 'https'
        ? new URL(decoded.url).host
        : cached.agentDomain;

    await db
      .update(agentIdentities)
      .set({
        ownerAddress: live.owner,
        lastSyncBlock: live.block,
        lastSyncedAt: new Date(),
        endpointUrl: endpoint,
        agentDomain: domain,
      })
      .where(eq(agentIdentities.agentId, CATALOG_IDS.agentSwapmaster));

    if (matches) {
      console.log(
        `Synced SwapMaster identity ${cached.onchainAgentId} at block ${live.block}.`,
      );
    } else {
      console.log(
        `Read ERC-8004 agent ${cached.onchainAgentId} at block ${live.block}; ` +
          `on-chain name is not SwapMaster — cache owner updated, listing pointers left in place.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `SwapMaster identity ${cached.onchainAgentId} is not on ${input.registryAddress} yet (${message}).`,
    );
  }
}
