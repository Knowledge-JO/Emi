import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { address, primaryId, timestamps } from './common';

/** The native-token sentinel. A chain's gas token has no ERC-20 address. */
export const NATIVE_ASSET_ADDRESS =
  '0x0000000000000000000000000000000000000000';

/**
 * BNB, USDT, USDC and the $U settlement token. `decimals` is load-bearing: every amount in this
 * schema is stored in base units, so a wrong decimals value silently rescales spend limits and
 * escrow amounts by orders of magnitude.
 */
export const assets = pgTable(
  'assets',
  {
    id: primaryId(),
    chainId: integer('chain_id').notNull(),
    address: address('address').notNull(),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    decimals: smallint('decimals').notNull(),
    isNative: boolean('is_native').notNull().default(false),
    /** True for $U, the token capability prices and escrow amounts are quoted in. */
    isSettlementToken: boolean('is_settlement_token').notNull().default(false),
    /** Whether the wallet has run the one-time `approveTokenForPermit2` for the x402 rail. */
    permit2Supported: boolean('permit2_supported').notNull().default(false),
    eip3009Supported: boolean('eip3009_supported').notNull().default(false),
    coingeckoId: text('coingecko_id'),
    logoUrl: text('logo_url'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('assets_chain_address_key').on(t.chainId, t.address),
    index('assets_symbol_idx').on(t.symbol),
    check('assets_address_lowercase', sql`${t.address} = lower(${t.address})`),
    check('assets_decimals_range', sql`${t.decimals} between 0 and 36`),
    check(
      'assets_native_uses_zero_address',
      sql`${t.isNative} = false or ${t.address} = '0x0000000000000000000000000000000000000000'`,
    ),
  ],
);

export const assetsRelations = relations(assets, () => ({}));
