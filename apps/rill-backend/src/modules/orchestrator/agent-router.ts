export type StepRail = 'session' | 'x402' | 'erc8183';

export type RoutableStep = {
  stepKey: string;
  status: string;
  sequence: number;
  paymentRail: string;
  writeOnchain: boolean;
  dependsOn: string[];
};

/**
 * Pick the rail a step actually runs on. x402 stays x402. A write-onchain listing uses the
 * user's granted session. A zero-scope ERC-8183 listing is a hire, not a signer.
 * `railOverride` is how Loan Guardian subcontracts SwapMaster instead of executing the swap.
 */
export function chooseRail(step: {
  paymentRail: string;
  writeOnchain: boolean;
  railOverride?: StepRail;
}): StepRail {
  if (step.railOverride) {
    return step.railOverride;
  }
  if (step.paymentRail === 'x402') {
    return 'x402';
  }
  if (step.writeOnchain) {
    return 'session';
  }
  return 'erc8183';
}

export function nextReadySteps(steps: RoutableStep[]): RoutableStep[] {
  const succeeded = new Set(
    steps.filter((step) => step.status === 'succeeded').map((step) => step.stepKey),
  );
  return steps
    .filter((step) => step.status === 'pending')
    .filter((step) => step.dependsOn.every((parent) => succeeded.has(parent)))
    .sort((a, b) => a.sequence - b.sequence);
}

export function hasBlockedPending(steps: RoutableStep[]): boolean {
  const pending = steps.some(
    (step) => step.status === 'pending' || step.status === 'running',
  );
  return pending && nextReadySteps(steps).length === 0;
}
