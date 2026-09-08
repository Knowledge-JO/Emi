import { NATIVE_ASSET_ADDRESS } from '../../database/schema/assets';

export type PreflightNeed = {
  token: string;
  minimum: bigint;
};

export type PreflightBalances = {
  native: bigint;
  tokens: Array<{ address: string; raw: bigint | null }>;
};

/**
 * Is this wallet funded enough to run the next write? Native must be > 0 (gas / relay).
 * Each spend token must have a readable balance at least `minimum`.
 */
export function preflightReady(
  balances: PreflightBalances,
  spend: PreflightNeed[],
): { ok: true } | { ok: false; code: string; error: string } {
  if (balances.native <= 0n) {
    return {
      ok: false,
      code: 'wallet_unfunded_native',
      error:
        'Wallet has no native balance for gas. Fund it before the session can act.',
    };
  }

  for (const need of spend) {
    const token = need.token.toLowerCase();
    if (token === NATIVE_ASSET_ADDRESS) {
      if (balances.native < need.minimum) {
        return {
          ok: false,
          code: 'wallet_insufficient_native',
          error: 'Wallet native balance is below the amount this step spends',
        };
      }
      continue;
    }

    const held = balances.tokens.find((row) => row.address === token);
    if (!held || held.raw == null) {
      return {
        ok: false,
        code: 'wallet_token_unreadable',
        error: `Could not read balance for ${token}`,
      };
    }
    if (held.raw < need.minimum) {
      return {
        ok: false,
        code: 'wallet_insufficient_token',
        error: `Wallet holds less than ${need.minimum.toString()} of ${token}`,
      };
    }
  }

  return { ok: true };
}
