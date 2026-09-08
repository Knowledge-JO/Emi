import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema';
import { wallets } from '../schema';
import { BSC_ADDRESSES, CATALOG_IDS, CHAIN_IDS } from './ids';
import { seedCatalog, seedNetworkProtocols, seedSettlementToken } from './catalog';
import { seedNetwork } from './network';
import type { SeedDb } from './types';
import { seedSwapMaster } from './swapmaster';
import { syncSwapMasterIdentity } from './sync-identity';

/**
 * Idempotent catalog + SwapMaster. Safe to re-run. Does not embed: exact `defi.swap` match does
 * not need a vector, and seed must not depend on a live model.
 *
 *   npm run db:seed
 */
async function main(): Promise<void> {
  loadEnv();

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const registry = registryAddressForSeed();
  if (!registry || !/^0x[0-9a-f]{40}$/.test(registry)) {
    throw new Error('ERC8004_REGISTRY_ADDRESS must be a 0x-prefixed address');
  }

  const chainId = chainIdForSeed();
  const onchainAgentId = process.env.SWAPMASTER_ONCHAIN_AGENT_ID ?? '1';
  if (!/^\d+$/.test(onchainAgentId)) {
    throw new Error('SWAPMASTER_ONCHAIN_AGENT_ID must be a decimal token id');
  }

  const ssl =
    process.env.DATABASE_SSL === 'true' || url.includes('sslmode=require');
  const client = postgres(url, { max: 1, ssl: ssl ? 'require' : false });
  const db = drizzle(client, { schema });

  try {
    await seedCatalog(db);
    await seedSettlementToken(db, {
      chainId,
      address:
        chainId === 97 ? BSC_ADDRESSES.uTestnet : BSC_ADDRESSES.u,
    });
    await seedNetworkProtocols(db);
    await seedSwapMaster(db, { registryAddress: registry, chainId, onchainAgentId });
    await seedNetwork(db, { registryAddress: registry, chainId });
    await seedSwapMasterWallet(db, chainId);
    const rpcUrl = process.env.BSC_RPC_URL;
    if (rpcUrl) {
      await syncSwapMasterIdentity(db, {
        rpcUrl,
        chainId,
        registryAddress: registry,
      });
    }
    console.log('Seeded catalog, SwapMaster, and the first-party agent network.');
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function seedSwapMasterWallet(
  db: SeedDb,
  chainId: number,
): Promise<void> {
  const address = process.env.SWAPMASTER_PROVIDER_ADDRESS?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return;
  }
  await db
    .insert(wallets)
    .values({
      address,
      ownerKind: 'agent',
      ownerAgentId: CATALOG_IDS.agentSwapmaster,
      signerKind: 'external',
      label: 'SwapMaster provider',
      chainIds: [chainId],
    })
    .onConflictDoNothing({ target: wallets.address });
}

function chainIdForSeed(): number {
  const chain = process.env.ALTANA_CHAIN ?? 'bnb';
  if (chain === 'bnb-testnet') return CHAIN_IDS['bnb-testnet'];
  if (chain === 'ethereum') return CHAIN_IDS.ethereum;
  return CHAIN_IDS.bnb;
}

function registryAddressForSeed(): string | undefined {
  const onTestnet = process.env.ALTANA_CHAIN === 'bnb-testnet';
  const value = onTestnet
    ? (process.env.ERC8004_REGISTRY_ADDRESS_TESTNET ??
      process.env.ERC8004_REGISTRY_ADDRESS)
    : process.env.ERC8004_REGISTRY_ADDRESS;
  return value?.toLowerCase();
}

function loadEnv(): void {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

void main();
