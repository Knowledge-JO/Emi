import { BSC_ADDRESSES } from '../../database/seed/ids';
import {
  applySlippage,
  buildAuthorizationPlan,
  displayAmountToBaseUnits,
  intersectAllowlist,
} from './authorization-plan';

describe('displayAmountToBaseUnits', () => {
  it('keeps 5 USDT as an exact 18-decimal integer string', () => {
    expect(displayAmountToBaseUnits('5', 18).toString()).toBe(
      '5000000000000000000',
    );
  });

  it('pads a fractional amount without rounding', () => {
    expect(displayAmountToBaseUnits('5.25', 18).toString()).toBe(
      '5250000000000000000',
    );
  });
});

describe('applySlippage', () => {
  it('adds 50 bps to 5e18 without going through a float', () => {
    const base = displayAmountToBaseUnits('5', 18);
    expect(applySlippage(base, 50).toString()).toBe('5025000000000000000');
  });
});

describe('buildAuthorizationPlan', () => {
  const pancake = {
    address: BSC_ADDRESSES.pancakeV2Router,
    protocolSlug: 'pancakeswap',
    role: 'router',
  };

  const usdt = {
    symbol: 'USDT',
    address: BSC_ADDRESSES.usdt,
    decimals: 18,
    isNative: false,
  };

  it('allowlists the router and the ERC-20, and caps spend at notional plus slippage', () => {
    const { plan, missing, assumptions } = buildAuthorizationPlan(
      [
        {
          contracts: [pancake],
          spendAsset: usdt,
          amount: '5',
          expectedDurationSeconds: 60,
        },
      ],
      1_700_000_000,
    );

    expect(missing).toEqual([]);
    expect(plan.calls.map((call) => call.to)).toEqual([
      BSC_ADDRESSES.pancakeV2Router,
      BSC_ADDRESSES.usdt,
    ]);
    expect(plan.spend).toEqual([
      {
        token: BSC_ADDRESSES.usdt,
        limit: '5025000000000000000',
        period: 'day',
      },
    ]);
    expect(plan.expiry).toBe(1_700_000_000 + 15 * 60);
    expect(assumptions.some((line) => line.includes('0.5%'))).toBe(true);
  });

  it('refuses to emit an empty allowlist when there is spend but nothing to call', () => {
    const { missing, plan } = buildAuthorizationPlan(
      [
        {
          contracts: [],
          spendAsset: {
            symbol: 'BNB',
            address: BSC_ADDRESSES.bnb,
            decimals: 18,
            isNative: true,
          },
          amount: '5',
          expectedDurationSeconds: null,
        },
      ],
      0,
    );

    expect(plan.calls).toEqual([]);
    expect(missing).toContain('no allowlisted contracts for this capability');
  });

  it('allows a research zero-scope plan: no calls and no spend', () => {
    const { missing, plan, assumptions } = buildAuthorizationPlan(
      [
        {
          contracts: [],
          spendAsset: null,
          amount: null,
          expectedDurationSeconds: 5,
          writeOnchain: false,
        },
      ],
      0,
    );

    expect(missing).toEqual([]);
    expect(plan.calls).toEqual([]);
    expect(plan.spend).toEqual([]);
    expect(assumptions).toEqual([]);
  });
});

describe('intersectAllowlist', () => {
  it('drops protocol contracts the skill does not call, and never adds skill-only addresses', () => {
    const kept = intersectAllowlist(
      [
        {
          address: BSC_ADDRESSES.pancakeV2Router,
          protocolSlug: 'pancakeswap',
          role: 'router',
        },
        {
          address: '0x1111111111111111111111111111111111111111',
          protocolSlug: 'other',
          role: 'helper',
        },
      ],
      [BSC_ADDRESSES.pancakeV2Router, BSC_ADDRESSES.wbnb],
    );

    expect(kept.map((row) => row.address)).toEqual([
      BSC_ADDRESSES.pancakeV2Router,
    ]);
  });
});
