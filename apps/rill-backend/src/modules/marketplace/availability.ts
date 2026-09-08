const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export type AvailabilityInput = {
  agentStatus?: string | null;
  hasIdentity: boolean;
  lastSyncedAt?: Date | string | null;
  now?: Date;
};

/**
 * Ranking availability. An active listing with a recently synced ERC-8004 cache scores 1.
 * Missing identity or a stale sync decays the score; a draft or paused listing is 0.
 */
export function availabilityScore(input: AvailabilityInput): number {
  if (input.agentStatus && input.agentStatus !== 'active') {
    return 0;
  }
  if (!input.hasIdentity) {
    return 0.25;
  }
  if (!input.lastSyncedAt) {
    return 0.25;
  }
  const synced =
    input.lastSyncedAt instanceof Date
      ? input.lastSyncedAt
      : new Date(input.lastSyncedAt);
  const age = (input.now ?? new Date()).getTime() - synced.getTime();
  if (Number.isNaN(age) || age < 0) {
    return 0.25;
  }
  if (age <= FRESH_MS) return 1;
  if (age <= STALE_MS) return 0.5;
  return 0.25;
}
