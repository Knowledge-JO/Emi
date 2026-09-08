import {
  DEFAULT_SLIPPAGE_BPS,
  applySlippage,
  displayAmountToBaseUnits,
} from '../../common/amount';
import type { AuthorizationPlan } from '../../database/schema/workflows';

export {
  DEFAULT_SLIPPAGE_BPS,
  applySlippage,
  displayAmountToBaseUnits,
} from '../../common/amount';

/** Long enough to approve and grant later; not so long the scope outlives the swap. */
export const DEFAULT_PLAN_TTL_SECONDS = 15 * 60;

export type AllowlistedContract = {
  address: string;
  protocolSlug: string;
  role: string;
};

export type SpendAsset = {
  symbol: string;
  address: string;
  decimals: number;
  isNative: boolean;
};

export type PlanStepInput = {
  contracts: AllowlistedContract[];
  spendAsset: SpendAsset | null;
  /** Display amount from the parsed intent, e.g. `"5"`. */
  amount: string | null;
  expectedDurationSeconds: number | null;
  /**
   * False for research skills. Empty `calls` plus empty `spend` is then a safe zero-scope
   * session. Empty `calls` with spend is unrestricted and must never be proposed.
   */
  writeOnchain?: boolean;
};

/**
 * Keep only contracts the skill may call. Never add skill addresses that were not already
 * allowlisted on the capability — a playbook cannot widen a session.
 */
export function intersectAllowlist(
  contracts: AllowlistedContract[],
  skillCallAddresses: string[],
): AllowlistedContract[] {
  const allowed = new Set(
    skillCallAddresses.map((address) => address.toLowerCase()),
  );
  return contracts.filter((contract) =>
    allowed.has(contract.address.toLowerCase()),
  );
}

/**
 * Narrowest session the swap needs: skill-intersected protocol contracts, the ERC-20 so `approve`
 * can succeed, and a spend cap of the notional plus slippage. An empty call list with spend is
 * never returned — that would mean unrestricted access inside the cap.
 */
export function buildAuthorizationPlan(
  steps: PlanStepInput[],
  nowSeconds: number,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): { plan: AuthorizationPlan; assumptions: string[]; missing: string[] } {
  const missing: string[] = [];
  const assumptions: string[] = [];
  const calls: AuthorizationPlan['calls'] = [];
  const spend: AuthorizationPlan['spend'] = [];
  const seenCall = new Set<string>();
  const seenSpend = new Set<string>();
  let ttl = DEFAULT_PLAN_TTL_SECONDS;
  let needsCalls = false;

  for (const step of steps) {
    const writeOnchain = step.writeOnchain !== false;
    if (writeOnchain) {
      needsCalls = true;
    }

    if (
      step.expectedDurationSeconds &&
      step.expectedDurationSeconds * 2 > ttl
    ) {
      ttl = step.expectedDurationSeconds * 2;
    }

    for (const contract of step.contracts) {
      const to = contract.address.toLowerCase();
      if (seenCall.has(to)) continue;
      seenCall.add(to);
      calls.push({
        to,
        protocolSlug: contract.protocolSlug,
      });
    }

    if (!writeOnchain) {
      continue;
    }

    if (!step.spendAsset) {
      missing.push('spend asset is not in the catalog');
      continue;
    }

    if (step.amount == null || step.amount === '') {
      missing.push(`amount for ${step.spendAsset.symbol}`);
      continue;
    }

    const base = displayAmountToBaseUnits(
      step.amount,
      step.spendAsset.decimals,
    );
    const limit = applySlippage(base, slippageBps).toString();
    const token = step.spendAsset.address.toLowerCase();

    if (!step.spendAsset.isNative && !seenCall.has(token)) {
      seenCall.add(token);
      calls.push({ to: token, protocolSlug: 'erc20' });
    }

    if (!seenSpend.has(token)) {
      seenSpend.add(token);
      spend.push({ token, limit, period: 'day' });
    }
  }

  if (calls.length === 0 && (spend.length > 0 || needsCalls)) {
    missing.push('no allowlisted contracts for this capability');
  }

  if (slippageBps > 0 && spend.length > 0) {
    assumptions.push(
      `Spend cap includes ${formatBps(slippageBps)} slippage; the swap notional is unchanged.`,
    );
  }

  return {
    plan: {
      calls,
      spend,
      expiry: nowSeconds + ttl,
    },
    assumptions,
    missing: [...new Set(missing)],
  };
}

function formatBps(bps: number): string {
  return `${bps / 100}%`;
}
