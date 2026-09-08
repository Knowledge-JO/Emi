/** Blocks we refuse to treat as final. BSC reorgs are shallow; eight is enough for this slice. */
export const REORG_BUFFER_BLOCKS = 8;

/** Cap a single log-range so a first catch-up cannot scan from genesis. */
export const MAX_INDEX_SPAN = 2_000;

export function safeHead(
  head: bigint | number,
  buffer = REORG_BUFFER_BLOCKS,
): number {
  const block = Number(head);
  return block > buffer ? block - buffer : 0;
}

/**
 * Inclusive range to scan after `lastBlock`, already rewound by `buffer` so a reorg of that
 * depth is re-applied idempotently. `null` means the cursor is already at or past the safe head.
 */
export function nextIndexRange(
  lastBlock: number,
  finalizedHead: number,
  buffer = REORG_BUFFER_BLOCKS,
  maxSpan = MAX_INDEX_SPAN,
): { from: number; to: number } | null {
  const from = Math.max(0, lastBlock - buffer + 1);
  if (from > finalizedHead) {
    return null;
  }
  const to = Math.min(finalizedHead, from + maxSpan - 1);
  if (to < from) {
    return null;
  }
  return { from, to };
}

export function shouldAdvanceCursor(lastBlock: number, processedTo: number): boolean {
  return processedTo > lastBlock;
}
