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

const PRICE = '10000000000000000';

const OBJECT = {
  type: 'object',
  additionalProperties: false,
} as const;

export type SeedNetworkOptions = {
  registryAddress: string;
  chainId: number;
};

/**
 * First-party listings beyond SwapMaster. Catalog primitives (Aave, Four.meme) must already
 * exist. Identity is a cache; seed does not mint. Competence is the matching Altana skill.
 */
export async function seedNetwork(
  db: SeedDb,
  options: SeedNetworkOptions,
): Promise<void> {
  await seedListing(db, options, {
    agentId: CATALOG_IDS.agentRadar,
    identityId: CATALOG_IDS.identityRadar,
    capabilityId: CATALOG_IDS.capabilityScreen,
    slug: 'token-radar',
    name: 'Token Radar',
    description:
      'Screens BNB Chain tokens for liquidity and risk. Zero-scope session: no calls, no spend.',
    category: 'research',
    skillId: 'dexscreener-token-radar',
    acceptsErc8183: true,
    acceptsX402: false,
    capability: {
      name: 'screen',
      taxonomyKey: 'research.screen',
      description: 'Find and screen trending tokens. Does not trade.',
      inputSchema: {
        ...OBJECT,
        properties: { query: { type: 'string' } },
      },
      outputSchema: {
        ...OBJECT,
        properties: { tokens: { type: 'array' } },
      },
      pricingModel: 'per_job',
      settlementRail: 'erc8183',
      assetIds: [],
      protocolIds: [],
    },
  });

  await seedListing(db, options, {
    agentId: CATALOG_IDS.agentLoan,
    identityId: CATALOG_IDS.identityLoan,
    capabilityId: CATALOG_IDS.capabilitySupply,
    slug: 'loan-guardian',
    name: 'Loan Guardian',
    description:
      'Supply and withdraw USDT on Aave V3. Does not borrow. Repay by hiring a swap agent.',
    category: 'loan',
    skillId: 'aave-v3-lending',
    acceptsErc8183: true,
    acceptsX402: false,
    canSubcontract: true,
    capability: {
      name: 'supply',
      taxonomyKey: 'defi.lending.supply',
      description: 'Supply USDT to Aave V3 or withdraw the position.',
      inputSchema: {
        ...OBJECT,
        required: ['amount'],
        properties: {
          amount: { type: 'string' },
          action: { type: 'string', enum: ['supply', 'withdraw'] },
        },
      },
      outputSchema: {
        ...OBJECT,
        properties: { txHash: { type: 'string' } },
      },
      pricingModel: 'per_job',
      settlementRail: 'erc8183',
      assetIds: [CATALOG_IDS.assetUsdt],
      protocolIds: [CATALOG_IDS.protocolAave],
    },
  });

  await seedListing(db, options, {
    agentId: CATALOG_IDS.agentRisk,
    identityId: CATALOG_IDS.identityRisk,
    capabilityId: CATALOG_IDS.capabilityRisk,
    slug: 'risk-oracle',
    name: 'Risk Oracle',
    description:
      'Health factor and liquidation distance. Other agents buy this over x402.',
    category: 'risk',
    acceptsErc8183: false,
    acceptsX402: true,
    capability: {
      name: 'health-factor',
      taxonomyKey: 'risk.health_factor',
      description: 'Per-request risk analysis. Settles over x402, not escrow.',
      inputSchema: {
        ...OBJECT,
        properties: { subject: { type: 'string' } },
      },
      outputSchema: {
        ...OBJECT,
        properties: {
          healthFactor: { type: 'string' },
          risk: { type: 'string' },
        },
      },
      pricingModel: 'per_request',
      settlementRail: 'x402',
      x402ResourceUrl: '/capabilities/risk-analysis',
      assetIds: [CATALOG_IDS.assetUsdt],
      protocolIds: [CATALOG_IDS.protocolAave],
    },
  });

  await seedListing(db, options, {
    agentId: CATALOG_IDS.agentCopy,
    identityId: CATALOG_IDS.identityCopy,
    capabilityId: CATALOG_IDS.capabilityCopy,
    slug: 'copy-desk',
    name: 'Copy Desk',
    description:
      "Mirrors a leader wallet's PancakeSwap trades. The leader address is a user input, never a default.",
    category: 'swap',
    skillId: 'copy-trade',
    acceptsErc8183: true,
    acceptsX402: false,
    capability: {
      name: 'copy-trade',
      taxonomyKey: 'defi.copy_trade',
      description: 'Mirror PancakeSwap trades of a wallet the user names.',
      inputSchema: {
        ...OBJECT,
        required: ['leaderWallet'],
        properties: {
          leaderWallet: {
            type: 'string',
            description: 'The wallet to follow. Required. No default.',
          },
          amount: { type: 'string' },
        },
      },
      outputSchema: {
        ...OBJECT,
        properties: { txHash: { type: 'string' } },
      },
      pricingModel: 'per_job',
      settlementRail: 'erc8183',
      assetIds: [
        CATALOG_IDS.assetBnb,
        CATALOG_IDS.assetUsdt,
        CATALOG_IDS.assetUsdc,
      ],
      protocolIds: [CATALOG_IDS.protocolPancake],
    },
  });

  await seedListing(db, options, {
    agentId: CATALOG_IDS.agentFour,
    identityId: CATALOG_IDS.identityFour,
    capabilityId: CATALOG_IDS.capabilityFour,
    slug: 'four-desk',
    name: 'Four Desk',
    description: 'Buy and sell on Four.meme bonding curves on BNB Chain.',
    category: 'token',
    skillId: 'four-meme',
    acceptsErc8183: true,
    acceptsX402: false,
    capability: {
      name: 'curve-swap',
      taxonomyKey: 'defi.launchpad.swap',
      description: 'Trade a Four.meme curve. Spends BNB under the session cap.',
      inputSchema: {
        ...OBJECT,
        required: ['token', 'amount'],
        properties: {
          token: { type: 'string' },
          amount: { type: 'string' },
        },
      },
      outputSchema: {
        ...OBJECT,
        properties: { txHash: { type: 'string' } },
      },
      pricingModel: 'per_job',
      settlementRail: 'erc8183',
      assetIds: [CATALOG_IDS.assetBnb],
      protocolIds: [CATALOG_IDS.protocolFourMeme],
    },
  });
}

type ListingSeed = {
  agentId: string;
  identityId: string;
  capabilityId: string;
  slug: string;
  name: string;
  description: string;
  category: 'swap' | 'loan' | 'risk' | 'token' | 'research';
  skillId?: string;
  acceptsErc8183: boolean;
  acceptsX402: boolean;
  canSubcontract?: boolean;
  capability: {
    name: string;
    taxonomyKey: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    pricingModel: 'per_job' | 'per_request';
    settlementRail: 'erc8183' | 'x402';
    x402ResourceUrl?: string;
    assetIds: string[];
    protocolIds: string[];
  };
};

async function seedListing(
  db: SeedDb,
  options: SeedNetworkOptions,
  listing: ListingSeed,
): Promise<void> {
  await db
    .insert(agents)
    .values({
      id: listing.agentId,
      developerId: CATALOG_IDS.platformDeveloper,
      slug: listing.slug,
      name: listing.name,
      description: listing.description,
      category: listing.category,
      version: '0.1.0',
      status: 'active',
      acceptsErc8183: listing.acceptsErc8183,
      acceptsX402: listing.acceptsX402,
      canSubcontract: listing.canSubcontract ?? false,
      metadata: listing.skillId ? { skillId: listing.skillId } : {},
    })
    .onConflictDoNothing({ target: agents.slug });

  if (listing.skillId) {
    await db
      .update(agents)
      .set({ metadata: { skillId: listing.skillId } })
      .where(eq(agents.id, listing.agentId));
  }

  await db
    .insert(agentIdentities)
    .values({
      id: listing.identityId,
      agentId: listing.agentId,
      chainId: options.chainId,
      registryAddress: options.registryAddress,
      onchainAgentId: '0',
      agentDomain: `${listing.slug}.rill.local`,
      lastSyncBlock: 0,
      lastSyncedAt: new Date(),
    })
    .onConflictDoNothing({ target: agentIdentities.agentId });

  await db
    .insert(capabilities)
    .values({
      id: listing.capabilityId,
      agentId: listing.agentId,
      name: listing.capability.name,
      taxonomyKey: listing.capability.taxonomyKey,
      description: listing.capability.description,
      inputSchema: listing.capability.inputSchema,
      outputSchema: listing.capability.outputSchema,
      pricingModel: listing.capability.pricingModel,
      settlementRail: listing.capability.settlementRail,
      unitPrice: PRICE,
      priceAssetId: CATALOG_IDS.assetU,
      x402ResourceUrl: listing.capability.x402ResourceUrl ?? null,
      x402Method: listing.capability.x402ResourceUrl ? 'GET' : 'GET',
      expectedDurationSeconds: 60,
      status: 'active',
    })
    .onConflictDoNothing({ target: [capabilities.agentId, capabilities.name] });

  if (listing.capability.assetIds.length > 0) {
    await db
      .insert(capabilityAssets)
      .values(
        listing.capability.assetIds.map((assetId) => ({
          capabilityId: listing.capabilityId,
          assetId,
        })),
      )
      .onConflictDoNothing();
  }

  if (listing.capability.protocolIds.length > 0) {
    await db
      .insert(capabilityProtocols)
      .values(
        listing.capability.protocolIds.map((protocolId) => ({
          capabilityId: listing.capabilityId,
          protocolId,
        })),
      )
      .onConflictDoNothing();
  }
}
