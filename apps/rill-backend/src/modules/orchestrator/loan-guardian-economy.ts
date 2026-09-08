import { chooseRail, type StepRail } from './agent-router';

export const LOAN_GUARDIAN_SLUG = 'loan-guardian';

export type ComposeStep = {
  stepKey: string;
  agentSlug: string;
  paymentRail: string;
  writeOnchain: boolean;
};

export type ComposedAction = {
  stepKey: string;
  rail: StepRail;
  /** `composer` = Loan Guardian hires or buys; `user` = the granted session (Aave). */
  actor: 'user' | 'composer';
};

/**
 * Loan Guardian is an economic actor, not a store listing that does everything itself.
 *
 *   Risk Oracle   ← x402 (composer buys; user session still signs the micropayment)
 *   SwapMaster    ← ERC-8183 hire (composer is the hirer)
 *   Token Radar   ← ERC-8183 hire (monitor)
 *   Aave repay    ← user session (the grant is the user's authority)
 */
export function composeProtectActions(
  composerSlug: string,
  steps: readonly ComposeStep[],
): ComposedAction[] {
  return steps.map((step) => {
    if (step.paymentRail === 'x402') {
      return { stepKey: step.stepKey, rail: 'x402', actor: 'composer' };
    }
    if (step.agentSlug === composerSlug && step.writeOnchain) {
      return { stepKey: step.stepKey, rail: 'session', actor: 'user' };
    }
    if (step.agentSlug !== composerSlug) {
      return { stepKey: step.stepKey, rail: 'erc8183', actor: 'composer' };
    }
    return {
      stepKey: step.stepKey,
      rail: chooseRail(step),
      actor: 'user',
    };
  });
}

export function healthFactorFromRiskBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const value = (body as { healthFactor?: unknown }).healthFactor;
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}
