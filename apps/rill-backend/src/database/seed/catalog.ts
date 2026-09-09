import { eq } from 'drizzle-orm';

import {
  assets,
  developers,
  NATIVE_ASSET_ADDRESS,
  protocolContracts,
  protocols,
  users,
} from '../schema';
import { BSC_ADDRESSES, BSC_CHAIN_ID, CATALOG_IDS } from './ids';
import type { SeedDb } from './types';

/**
 * Step 1 of marketplace bring-up: things a capability can name. No agents yet — a listing that
 * claims USDT before USDT exists is a broken FK, not a product.
 */
export async function seedCatalog(db: SeedDb): Promise<void> {
  await db
    .insert(users)
    .values({
      id: CATALOG_IDS.platformUser,
      displayName: 'Emi',
      authProvider: 'oauth',
      externalAuthId: 'rill:platform',
      status: 'active',
    })
    .onConflictDoNothing({
      target: [users.authProvider, users.externalAuthId],
    });

  await db
    .insert(developers)
    .values({
      id: CATALOG_IDS.platformDeveloper,
      userId: CATALOG_IDS.platformUser,
      slug: 'rill',
      displayName: 'Emi',
      description: 'First-party publisher of reference agents.',
      verification: 'verified',
      verifiedAt: new Date(),
    })
    .onConflictDoNothing({ target: developers.slug });

  await db
    .insert(assets)
    .values([
      {
        id: CATALOG_IDS.assetBnb,
        chainId: BSC_CHAIN_ID,
        address: NATIVE_ASSET_ADDRESS,
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        isNative: true,
        coingeckoId: 'binancecoin',
      },
      {
        id: CATALOG_IDS.assetUsdt,
        chainId: BSC_CHAIN_ID,
        address: BSC_ADDRESSES.usdt,
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 18,
        permit2Supported: true,
        coingeckoId: 'tether',
      },
      {
        id: CATALOG_IDS.assetUsdc,
        chainId: BSC_CHAIN_ID,
        address: BSC_ADDRESSES.usdc,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 18,
        permit2Supported: true,
        coingeckoId: 'usd-coin',
      },
      {
        id: CATALOG_IDS.assetWbnb,
        chainId: BSC_CHAIN_ID,
        address: BSC_ADDRESSES.wbnb,
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        decimals: 18,
        coingeckoId: 'wbnb',
      },
    ])
    .onConflictDoNothing({ target: [assets.chainId, assets.address] });

  await db
    .insert(protocols)
    .values({
      id: CATALOG_IDS.protocolPancake,
      slug: 'pancakeswap',
      name: 'PancakeSwap',
      kind: 'dex',
      website: 'https://pancakeswap.finance',
    })
    .onConflictDoNothing({ target: protocols.slug });

  await db
    .insert(protocolContracts)
    .values({
      id: CATALOG_IDS.pancakeRouter,
      protocolId: CATALOG_IDS.protocolPancake,
      chainId: BSC_CHAIN_ID,
      role: 'router',
      address: BSC_ADDRESSES.pancakeV2Router,
      allowlistable: true,
      verified: true,
    })
    .onConflictDoNothing({
      target: [
        protocolContracts.protocolId,
        protocolContracts.chainId,
        protocolContracts.role,
      ],
    });
}

/** Aave and Four.meme — seeded only because loan / launchpad listings name them. */
export async function seedNetworkProtocols(db: SeedDb): Promise<void> {
  await db
    .insert(protocols)
    .values([
      {
        id: CATALOG_IDS.protocolAave,
        slug: 'aave-v3',
        name: 'Aave V3',
        kind: 'lending',
        website: 'https://aave.com',
      },
      {
        id: CATALOG_IDS.protocolFourMeme,
        slug: 'four-meme',
        name: 'Four.meme',
        kind: 'token_factory',
        website: 'https://four.meme',
      },
    ])
    .onConflictDoNothing({ target: protocols.slug });

  await db
    .insert(protocolContracts)
    .values([
      {
        id: CATALOG_IDS.aavePool,
        protocolId: CATALOG_IDS.protocolAave,
        chainId: BSC_CHAIN_ID,
        role: 'lending_pool',
        address: BSC_ADDRESSES.aaveV3Pool,
        allowlistable: true,
        verified: true,
      },
      {
        id: CATALOG_IDS.fourMemeManager,
        protocolId: CATALOG_IDS.protocolFourMeme,
        chainId: BSC_CHAIN_ID,
        role: 'token_manager',
        address: BSC_ADDRESSES.fourMemeTokenManager,
        allowlistable: true,
        verified: true,
      },
    ])
    .onConflictDoNothing({
      target: [
        protocolContracts.protocolId,
        protocolContracts.chainId,
        protocolContracts.role,
      ],
    });
}

export async function seedSettlementToken(
  db: SeedDb,
  input: { chainId: number; address: string },
): Promise<void> {
  await db
    .insert(assets)
    .values({
      id: CATALOG_IDS.assetU,
      chainId: input.chainId,
      address: input.address.toLowerCase(),
      symbol: '$U',
      name: 'United Stables',
      decimals: 18,
      isSettlementToken: true,
      permit2Supported: true,
    })
    .onConflictDoNothing({ target: [assets.chainId, assets.address] });

  await db
    .update(assets)
    .set({
      chainId: input.chainId,
      address: input.address.toLowerCase(),
      isSettlementToken: true,
    })
    .where(eq(assets.id, CATALOG_IDS.assetU));
}
