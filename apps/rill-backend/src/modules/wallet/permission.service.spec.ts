import { UnprocessableEntityException } from '@nestjs/common';

import { BSC_ADDRESSES } from '../../database/seed/ids';
import { PermissionService } from './permission.service';

const plan = {
  calls: [
    { to: BSC_ADDRESSES.pancakeV2Router, protocolSlug: 'pancakeswap' },
    { to: BSC_ADDRESSES.usdt, protocolSlug: 'erc20' },
  ],
  spend: [
    {
      token: BSC_ADDRESSES.usdt,
      limit: '5025000000000000000',
      period: 'day' as const,
    },
  ],
  expiry: 1_700_000_900,
};

const matchingGrant = {
  calls: [{ to: BSC_ADDRESSES.pancakeV2Router }, { to: BSC_ADDRESSES.usdt }],
  spend: [
    {
      token: BSC_ADDRESSES.usdt,
      limit: '5025000000000000000',
      period: 'day' as const,
    },
  ],
};

describe('PermissionService.assertGrantMatchesPlan', () => {
  const permissions = new PermissionService();

  it('accepts a grant that matches the plan', () => {
    expect(() =>
      permissions.assertGrantMatchesPlan(
        plan,
        matchingGrant,
        1_700_000_800,
        1_700_000_000,
      ),
    ).not.toThrow();
  });

  it('refuses empty calls when there is spend', () => {
    expect(() =>
      permissions.assertGrantMatchesPlan(
        plan,
        { calls: [], spend: matchingGrant.spend },
        1_700_000_800,
        1_700_000_000,
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('refuses a call target the plan did not allow', () => {
    expect(() =>
      permissions.assertGrantMatchesPlan(
        plan,
        {
          ...matchingGrant,
          calls: [
            ...matchingGrant.calls,
            { to: '0x1111111111111111111111111111111111111111' },
          ],
        },
        1_700_000_800,
        1_700_000_000,
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('refuses a spend cap above the plan', () => {
    expect(() =>
      permissions.assertGrantMatchesPlan(
        plan,
        {
          ...matchingGrant,
          spend: [
            {
              token: BSC_ADDRESSES.usdt,
              limit: '6000000000000000000',
              period: 'day',
            },
          ],
        },
        1_700_000_800,
        1_700_000_000,
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('refuses execute targets outside the granted allowlist', () => {
    expect(() =>
      permissions.assertCallsAllowed(
        [BSC_ADDRESSES.pancakeV2Router, BSC_ADDRESSES.usdt],
        [{ to: '0x1111111111111111111111111111111111111111' }],
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('accepts execute calls that stay inside the allowlist', () => {
    expect(() =>
      permissions.assertCallsAllowed(
        [BSC_ADDRESSES.pancakeV2Router, BSC_ADDRESSES.usdt],
        [{ to: BSC_ADDRESSES.usdt }, { to: BSC_ADDRESSES.pancakeV2Router }],
      ),
    ).not.toThrow();
  });

  it('allows a research zero-scope grant', () => {
    expect(() =>
      permissions.assertGrantMatchesPlan(
        { calls: [], spend: [], expiry: 1_700_000_900 },
        { calls: [], spend: [] },
        1_700_000_800,
        1_700_000_000,
      ),
    ).not.toThrow();
  });
});
