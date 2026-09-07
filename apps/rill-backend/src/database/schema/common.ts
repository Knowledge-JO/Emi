import { char, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Canonical embedding width. Gemini `gemini-embedding-001` and OpenAI `text-embedding-3-small`
 * both emit this size, so switching `AI_EMBEDDING_PROVIDER` does not require a column rewrite.
 */
export const EMBEDDING_DIMENSIONS = 1536;

export const primaryId = () => uuid('id').primaryKey().defaultRandom();

/**
 * EVM address. Always written lower-cased: a re-cased hex address no longer matches the contract
 * allowlist committed on-chain at grant time, and Keystore lookups are byte comparisons.
 */
export const address = (name: string) => char(name, { length: 42 });

/** A 32-byte keccak256 digest as `0x`-prefixed hex: tx hash, userOp hash, key id, content hash. */
export const hash32 = (name: string) => char(name, { length: 66 });

/**
 * A uint256 amount in the token's base units, held as an exact decimal string. Spend limits and
 * escrow amounts must survive the round trip byte-for-byte; a bigint that becomes a float breaks
 * on-chain permission validation.
 */
export const baseUnits = (name: string) =>
  numeric(name, { precision: 78, scale: 0, mode: 'string' });

export const ts = (name: string) => timestamp(name, { withTimezone: true });

export const timestamps = {
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
