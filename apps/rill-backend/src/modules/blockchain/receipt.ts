export type ReceiptLike = {
  status?: 'success' | 'reverted' | 0 | 1 | '0x0' | '0x1';
  blockNumber: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
} | null;

export type ResolvedReceipt = {
  status: 'submitted' | 'included' | 'succeeded' | 'reverted';
  confirmations: number;
  blockNumber: number | null;
  gasUsed: string | null;
  effectiveGasPriceWei: string | null;
};

const SUCCESS = new Set(['success', 1, '0x1']);
const REVERTED = new Set(['reverted', 0, '0x0']);

/**
 * Map a viem receipt onto the `transactions.status` enum. No receipt means the bundler has
 * accepted the userOp but the chain has not included it yet. One confirmation is enough to
 * call it succeeded here; a production finality gadget is a later slice.
 */
export function resolveReceipt(
  receipt: ReceiptLike,
  head: bigint | number,
  confirmationsNeeded = 1,
): ResolvedReceipt {
  if (!receipt) {
    return {
      status: 'submitted',
      confirmations: 0,
      blockNumber: null,
      gasUsed: null,
      effectiveGasPriceWei: null,
    };
  }

  const blockNumber = Number(receipt.blockNumber);
  const confirmations = Math.max(0, Number(head) - blockNumber + 1);
  const gasUsed = receipt.gasUsed != null ? receipt.gasUsed.toString() : null;
  const effectiveGasPriceWei =
    receipt.effectiveGasPrice != null
      ? receipt.effectiveGasPrice.toString()
      : null;

  if (receipt.status !== undefined && REVERTED.has(receipt.status)) {
    return {
      status: 'reverted',
      confirmations,
      blockNumber,
      gasUsed,
      effectiveGasPriceWei,
    };
  }

  if (
    receipt.status !== undefined &&
    !SUCCESS.has(receipt.status) &&
    !REVERTED.has(receipt.status)
  ) {
    return {
      status: 'included',
      confirmations,
      blockNumber,
      gasUsed,
      effectiveGasPriceWei,
    };
  }

  if (confirmations < confirmationsNeeded) {
    return {
      status: 'included',
      confirmations,
      blockNumber,
      gasUsed,
      effectiveGasPriceWei,
    };
  }

  return {
    status: 'succeeded',
    confirmations,
    blockNumber,
    gasUsed,
    effectiveGasPriceWei,
  };
}

export const DROP_AFTER_MS = 30 * 60 * 1000;

export function shouldDrop(submittedAt: Date | null, now = new Date()): boolean {
  if (!submittedAt) {
    return false;
  }
  return now.getTime() - submittedAt.getTime() >= DROP_AFTER_MS;
}
