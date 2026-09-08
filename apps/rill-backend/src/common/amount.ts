/**
 * Exact decimal-string math for amounts that later become on-chain limits or calldata.
 * A float must never touch these values.
 */

/** 0.5%. Shared by the spend cap and `amountOutMin` so they describe the same tolerance. */
export const DEFAULT_SLIPPAGE_BPS = 50;

export function displayAmountToBaseUnits(
  amount: string,
  decimals: number,
): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error(`Amount '${amount}' is not a decimal string`);
  }
  if (decimals < 0 || decimals > 36) {
    throw new Error(`Decimals ${decimals} out of range`);
  }

  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > decimals) {
    throw new Error(
      `Amount '${amount}' has more fractional digits than decimals=${decimals}`,
    );
  }

  return BigInt(whole + fraction.padEnd(decimals, '0'));
}

/** Raise a base-unit amount by `bps` (50 = 0.5%). Used for spend caps. */
export function applySlippage(base: bigint, bps: number): bigint {
  if (bps < 0) {
    throw new Error('Slippage bps must be >= 0');
  }
  return (base * (10_000n + BigInt(bps))) / 10_000n;
}

/** Lower a quote by `bps` for `amountOutMin`. Never returns 0 when the quote is > 0. */
export function subtractSlippage(quote: bigint, bps: number): bigint {
  if (bps < 0 || bps >= 10_000) {
    throw new Error('Slippage bps must be in [0, 10000)');
  }
  if (quote <= 0n) {
    throw new Error('Quote must be positive');
  }
  const minOut = (quote * (10_000n - BigInt(bps))) / 10_000n;
  return minOut > 0n ? minOut : 1n;
}
