import type { jobs } from '../../../database/schema';
import type { JobStatusName } from './erc8183-abi';

export type LocalJobStatus = (typeof jobs.$inferSelect)['status'];

/**
 * Map the kernel enum onto our row. `accepted` is off-chain (hirer reviewed the
 * deliverable) and is kept when the chain is still SUBMITTED.
 */
export function mirrorLocalStatus(
  onchain: JobStatusName | 'UNKNOWN',
  current: LocalJobStatus,
): LocalJobStatus {
  switch (onchain) {
    case 'OPEN':
      return 'created';
    case 'FUNDED':
      return 'funded';
    case 'SUBMITTED':
      return current === 'accepted' ? 'accepted' : 'delivered';
    case 'COMPLETED':
      return 'settled';
    case 'REJECTED':
      return 'disputed';
    case 'EXPIRED':
      return current === 'refunded' ? 'refunded' : 'expired';
    default:
      return current;
  }
}
