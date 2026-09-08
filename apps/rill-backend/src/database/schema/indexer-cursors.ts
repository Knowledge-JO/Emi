import { bigint, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { primaryId, timestamps } from './common';

/**
 * Last chain block the in-process indexer committed, per feed. The chain is the source of
 * truth; this row is only a restart cursor so a reorg or a crash cannot skip or double-apply
 * a range. Named feeds (`erc8004`, `erc8183`, `keystore`) advance independently.
 */
export const indexerCursors = pgTable(
  'indexer_cursors',
  {
    id: primaryId(),
    chainId: integer('chain_id').notNull(),
    name: text('name').notNull(),
    lastBlock: bigint('last_block', { mode: 'number' }).notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('indexer_cursors_chain_name').on(t.chainId, t.name)],
);
