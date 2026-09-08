/**
 * Temporal workflow isolate. Imports only `@temporalio/workflow` and the pure policy.
 * Activities are the only I/O: health factor, session check, execute, verify.
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

import {
  runLoanProtection,
  type LoanProtectionActivities,
  type LoanProtectionInput,
  type LoanProtectionState,
} from './loan-protection';

const activities = proxyActivities<LoanProtectionActivities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 5,
    backoffCoefficient: 2,
    initialInterval: '1s',
  },
});

export async function loanProtection(
  input: LoanProtectionInput,
): Promise<LoanProtectionState> {
  return runLoanProtection(activities, input, sleep);
}
