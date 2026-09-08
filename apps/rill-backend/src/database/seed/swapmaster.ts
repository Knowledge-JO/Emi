import { eq } from 'drizzle-orm';

import {
  agentIdentities,
  agents,
  capabilities,
  capabilityAssets,
  capabilityProtocols,
} from '../schema';
import { CATALOG_IDS } from './ids';
import type { SeedDb } from './types';

const SWAP_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fromSymbol', 'toSymbol', 'amount'],
  properties: {
    fromSymbol: { type: 'string' },
    toSymbol: { type: 'string' },
    amount: {
      type: 'string',
      description: 'Display amount as a decimal string, never base units.',
    },
  },
};

const SWAP_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['amountOut'],
  properties: {
    amountOut: { type: 'string' },
    txHash: { type: 'string' },
  },
};

export type SeedSwapMasterOptions = {
  registryAddress: string;
  chainId: number;
  onchainAgentId: string;
};

/**
 * Step 6: one first-party worker the swap intent can match. Identity is a cached ERC-8004 row.
 * Seed does not mint. `onchainAgentId` is a placeholder until SWAPMASTER_ONCHAIN_AGENT_ID is set
 * and a live read names SwapMaster. Competence is the Altana `pancakeswap-trading` skill.
 */
export async function seedSwapMaster(
  db: SeedDb,
  options: SeedSwapMasterOptions,
): Promise<void> {
  const { registryAddress, chainId, onchainAgentId } = options;
  await db
    .insert(agents)
    .values({
      id: CATALOG_IDS.agentSwapmaster,
      developerId: CATALOG_IDS.platformDeveloper,
      slug: 'swapmaster',
      name: 'SwapMaster',
      description: 'Swaps BNB, USDT and USDC on PancakeSwap.',
      category: 'swap',
      version: '0.1.0',
      status: 'active',
      acceptsErc8183: true,
      acceptsX402: false,
      canSubcontract: false,
      metadata: { skillId: 'pancakeswap-trading' },
    })
    .onConflictDoNothing({ target: agents.slug });

  await db
    .update(agents)
    .set({ metadata: { skillId: 'pancakeswap-trading' } })
    .where(eq(agents.id, CATALOG_IDS.agentSwapmaster));

  await db
    .insert(agentIdentities)
    .values({
      id: CATALOG_IDS.identitySwapmaster,
      agentId: CATALOG_IDS.agentSwapmaster,
      chainId,
      registryAddress,
      onchainAgentId,
      agentDomain: 'swapmaster.rill.local',
      lastSyncBlock: 0,
      lastSyncedAt: new Date(),
    })
    .onConflictDoNothing({ target: agentIdentities.agentId });

  const existing = await db.query.agentIdentities.findFirst({
    where: eq(agentIdentities.agentId, CATALOG_IDS.agentSwapmaster),
  });

  if (existing) {
    const registryChanged = existing.registryAddress !== registryAddress;
    const idChanged = existing.onchainAgentId !== onchainAgentId;
    const chainChanged = existing.chainId !== chainId;
    if (registryChanged || idChanged || chainChanged) {
      await db
        .update(agentIdentities)
        .set({
          chainId,
          registryAddress,
          onchainAgentId,
          lastSyncBlock: 0,
          lastSyncedAt: new Date(),
        })
        .where(eq(agentIdentities.agentId, CATALOG_IDS.agentSwapmaster));
    }
  }

  await db
    .insert(capabilities)
    .values({
      id: CATALOG_IDS.capabilitySwap,
      agentId: CATALOG_IDS.agentSwapmaster,
      name: 'swap',
      taxonomyKey: 'defi.swap',
      description:
        'Swap an exact amount of one listed asset for another on PancakeSwap.',
      inputSchema: SWAP_INPUT_SCHEMA,
      outputSchema: SWAP_OUTPUT_SCHEMA,
      pricingModel: 'per_job',
      settlementRail: 'erc8183',
      // 0.01 USDT at 18 decimals — a listing price, not a quote for the swap itself.
      unitPrice: '10000000000000000',
      priceAssetId: CATALOG_IDS.assetU,
      expectedDurationSeconds: 60,
      status: 'active',
    })
    .onConflictDoNothing({ target: [capabilities.agentId, capabilities.name] });

  await db
    .update(capabilities)
    .set({ priceAssetId: CATALOG_IDS.assetU })
    .where(eq(capabilities.id, CATALOG_IDS.capabilitySwap));

  await db
    .insert(capabilityAssets)
    .values([
      {
        capabilityId: CATALOG_IDS.capabilitySwap,
        assetId: CATALOG_IDS.assetBnb,
      },
      {
        capabilityId: CATALOG_IDS.capabilitySwap,
        assetId: CATALOG_IDS.assetUsdt,
      },
      {
        capabilityId: CATALOG_IDS.capabilitySwap,
        assetId: CATALOG_IDS.assetUsdc,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(capabilityProtocols)
    .values({
      capabilityId: CATALOG_IDS.capabilitySwap,
      protocolId: CATALOG_IDS.protocolPancake,
    })
    .onConflictDoNothing();
}
