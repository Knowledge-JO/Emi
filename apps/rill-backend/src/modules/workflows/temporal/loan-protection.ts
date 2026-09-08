export type LoanProtectionPhase =
  | 'start'
  | 'waiting'
  | 'check'
  | 'execute'
  | 'verify'
  | 'completed'
  | 'failed'
  | 'expired';

export type LoanProtectionInput = {
  workflowId: string;
  userId: string;
  threshold: string;
  checkEveryMs: number;
  maxChecks: number;
};

export type LoanProtectionState = {
  phase: LoanProtectionPhase;
  threshold: string;
  checks: number;
  maxChecks: number;
  lastHealthFactor: string | null;
  reason?: string;
};

export type LoanProtectionEvent =
  | { type: 'monitored' }
  | { type: 'waited' }
  | {
      type: 'health';
      healthFactor: string;
      sessionValid: boolean;
    }
  | { type: 'executed' }
  | { type: 'verified'; ok: boolean }
  | { type: 'failed'; reason: string }
  | { type: 'deadline' };

export type LoanProtectionActivities = {
  monitor(input: LoanProtectionInput): Promise<void>;
  assertSession(input: LoanProtectionInput): Promise<boolean>;
  checkHealthFactor(input: LoanProtectionInput): Promise<string>;
  executeProtection(input: LoanProtectionInput): Promise<void>;
  verify(input: LoanProtectionInput): Promise<boolean>;
};

export const DEFAULT_HF_THRESHOLD = '1.3';
export const DEFAULT_CHECK_EVERY_MS = 60 * 60 * 1000;
export const DEFAULT_MAX_CHECKS = 24 * 7;

export function initialLoanProtection(
  input: Pick<LoanProtectionInput, 'threshold' | 'maxChecks'>,
): LoanProtectionState {
  return {
    phase: 'start',
    threshold: input.threshold,
    checks: 0,
    maxChecks: input.maxChecks,
    lastHealthFactor: null,
  };
}

export function healthFactorBelow(healthFactor: string, threshold: string): boolean {
  const hf = Number(healthFactor);
  const limit = Number(threshold);
  if (!Number.isFinite(hf) || !Number.isFinite(limit)) {
    throw new Error('health factor is not a decimal string');
  }
  return hf < limit;
}

/**
 * Deterministic loan-protection policy. Temporal (and tests) drive this with activity results.
 * No I/O, no clocks — the caller sleeps between `waited` events.
 */
export function reduceLoanProtection(
  state: LoanProtectionState,
  event: LoanProtectionEvent,
): LoanProtectionState {
  if (state.phase === 'completed' || state.phase === 'failed' || state.phase === 'expired') {
    return state;
  }
  if (event.type === 'failed') {
    return { ...state, phase: 'failed', reason: event.reason };
  }
  if (event.type === 'monitored' && state.phase === 'start') {
    return { ...state, phase: 'waiting' };
  }
  if (event.type === 'waited' && state.phase === 'waiting') {
    const checks = state.checks + 1;
    if (checks > state.maxChecks) {
      return { ...state, checks, phase: 'expired', reason: 'deadline' };
    }
    return { ...state, checks, phase: 'check' };
  }
  if (event.type === 'deadline' && (state.phase === 'waiting' || state.phase === 'check')) {
    return { ...state, phase: 'expired', reason: 'deadline' };
  }
  if (event.type === 'health' && state.phase === 'check') {
    if (!event.sessionValid) {
      return {
        ...state,
        lastHealthFactor: event.healthFactor,
        phase: 'failed',
        reason: 'session_expired',
      };
    }
    if (healthFactorBelow(event.healthFactor, state.threshold)) {
      return {
        ...state,
        lastHealthFactor: event.healthFactor,
        phase: 'execute',
      };
    }
    return {
      ...state,
      lastHealthFactor: event.healthFactor,
      phase: 'waiting',
    };
  }
  if (event.type === 'executed' && state.phase === 'execute') {
    return { ...state, phase: 'verify' };
  }
  if (event.type === 'verified' && state.phase === 'verify') {
    return event.ok
      ? { ...state, phase: 'completed' }
      : { ...state, phase: 'failed', reason: 'verify_failed' };
  }
  return state;
}

export async function runLoanProtection(
  activities: LoanProtectionActivities,
  input: LoanProtectionInput,
  sleepFn: (ms: number) => Promise<void>,
): Promise<LoanProtectionState> {
  let state = initialLoanProtection(input);
  await activities.monitor(input);
  state = reduceLoanProtection(state, { type: 'monitored' });

  while (state.phase === 'waiting') {
    await sleepFn(input.checkEveryMs);
    state = reduceLoanProtection(state, { type: 'waited' });
    if (state.phase !== 'check') {
      break;
    }
    const [sessionValid, healthFactor] = await Promise.all([
      activities.assertSession(input),
      activities.checkHealthFactor(input),
    ]);
    state = reduceLoanProtection(state, {
      type: 'health',
      healthFactor,
      sessionValid,
    });
  }

  if (state.phase === 'execute') {
    await activities.executeProtection(input);
    state = reduceLoanProtection(state, { type: 'executed' });
    const ok = await activities.verify(input);
    state = reduceLoanProtection(state, { type: 'verified', ok });
  }

  return state;
}
