import { BSC_ADDRESSES } from '../../database/seed/ids';
import { NATIVE_ASSET_ADDRESS } from '../../database/schema/assets';
import { preflightReady } from './balance-preflight';

describe('preflightReady', () => {
  it('refuses a wallet with no native gas', () => {
    const result = preflightReady({ native: 0n, tokens: [] }, [
      { token: BSC_ADDRESSES.usdt, minimum: 1n },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('wallet_unfunded_native');
  });

  it('refuses when the spend token is short', () => {
    const result = preflightReady(
      {
        native: 1n,
        tokens: [{ address: BSC_ADDRESSES.usdt, raw: 4n * 10n ** 18n }],
      },
      [{ token: BSC_ADDRESSES.usdt, minimum: 5n * 10n ** 18n }],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('wallet_insufficient_token');
  });

  it('accepts native gas plus enough spend token', () => {
    const result = preflightReady(
      {
        native: 10n ** 16n,
        tokens: [{ address: BSC_ADDRESSES.usdt, raw: 5n * 10n ** 18n }],
      },
      [{ token: BSC_ADDRESSES.usdt, minimum: 5n * 10n ** 18n }],
    );
    expect(result).toEqual({ ok: true });
  });

  it('treats the zero address as native spend', () => {
    const result = preflightReady({ native: 2n, tokens: [] }, [
      { token: NATIVE_ASSET_ADDRESS, minimum: 3n },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('wallet_insufficient_native');
  });
});
