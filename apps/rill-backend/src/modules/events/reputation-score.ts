/**
 * Reputation is a projection of the event store. These helpers are pure so a score can be
 * replayed to a sequence watermark and the same numbers come out. Nothing here writes.
 */

export const REPUTATION_OUTBOX_DESTINATION = 'projection:reputation';

export type ReputationEvent = {
  seq: number;
  type: string;
  subjectType: string;
  subjectId?: string | null;
  actorKind: string;
  actorId?: string | null;
  payload: Record<string, unknown>;
};

export type AgentFacts = {
  agentId: string;
  jobsCompleted: number;
  jobsFailed: number;
  jobsDisputed: number;
  disputesLost: number;
  x402Requests: number;
  x402Failures: number;
  latencies: number[];
  volumeBase: bigint;
};

export type ProjectedReputation = {
  agentId: string;
  jobsCompleted: number;
  jobsFailed: number;
  jobsDisputed: number;
  disputesLost: number;
  x402Requests: number;
  x402Failures: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  volumeUsd: string;
  successRate: number;
  disputeRate: number;
  score: number;
};

export function projectReputation(events: ReputationEvent[]): ProjectedReputation[] {
  const jobWorker = new Map<string, string>();
  const facts = new Map<string, AgentFacts>();

  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  for (const event of ordered) {
    rememberJobWorker(jobWorker, event);
    for (const agentId of agentsFor(event, jobWorker)) {
      applyEvent(ensure(facts, agentId), event);
    }
  }

  return [...facts.values()].map((row) => toProjection(row));
}

export function scoreFacts(facts: Omit<AgentFacts, 'agentId'>): number {
  const jobN = facts.jobsCompleted + facts.jobsFailed;
  const xN = facts.x402Requests;
  const jobSuccess = (facts.jobsCompleted + 1) / (jobN + 2);
  const x402Success = (xN - facts.x402Failures + 1) / (xN + 2);
  const disputeRate =
    facts.jobsDisputed / Math.max(1, jobN + facts.jobsDisputed);

  const jobWeight = jobN > 0 ? 0.6 : 0;
  const xWeight = xN > 0 ? 0.25 : 0;
  const priorWeight = 1 - jobWeight - xWeight;
  const success01 =
    jobWeight * jobSuccess + xWeight * x402Success + priorWeight * 0.5;
  const penalty = Math.min(
    0.3,
    disputeRate * 0.5 + facts.disputesLost * 0.15,
  );
  return clamp(0, 100, 100 * (success01 - penalty));
}

function rememberJobWorker(
  jobWorker: Map<string, string>,
  event: ReputationEvent,
): void {
  if (!event.type.startsWith('job.') || !event.subjectId) return;
  const fromPayload = asId(event.payload.workerAgentId);
  if (fromPayload) {
    jobWorker.set(event.subjectId, fromPayload);
    return;
  }
  if (event.actorKind === 'agent' && event.actorId) {
    jobWorker.set(event.subjectId, event.actorId);
  }
}

function agentsFor(
  event: ReputationEvent,
  jobWorker: Map<string, string>,
): string[] {
  if (event.type.startsWith('job.')) {
    const id =
      asId(event.payload.workerAgentId) ??
      (event.subjectId ? jobWorker.get(event.subjectId) : undefined) ??
      (event.actorKind === 'agent' ? event.actorId : undefined);
    return id ? [id] : [];
  }

  if (
    event.type === 'x402.outbound_recorded' ||
    event.type === 'x402.inbound_recorded'
  ) {
    const ids = [
      asId(event.payload.payerAgentId),
      asId(event.payload.payeeAgentId),
    ].filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }

  return [];
}

function applyEvent(facts: AgentFacts, event: ReputationEvent): void {
  switch (event.type) {
    case 'job.settled':
      facts.jobsCompleted += 1;
      addVolume(facts, event.payload.amount);
      break;
    case 'job.refunded':
      facts.jobsFailed += 1;
      break;
    case 'job.disputed':
      facts.jobsDisputed += 1;
      break;
    case 'job.dispute_lost':
      facts.disputesLost += 1;
      break;
    case 'x402.outbound_recorded':
    case 'x402.inbound_recorded':
      facts.x402Requests += 1;
      if (event.payload.status === 'failed') facts.x402Failures += 1;
      addVolume(facts, event.payload.amount);
      if (typeof event.payload.latencyMs === 'number') {
        facts.latencies.push(event.payload.latencyMs);
      }
      break;
    default:
      break;
  }
}

function toProjection(facts: AgentFacts): ProjectedReputation {
  const jobN = facts.jobsCompleted + facts.jobsFailed;
  const successRate =
    jobN + facts.x402Requests === 0
      ? 0.5
      : (facts.jobsCompleted +
          (facts.x402Requests - facts.x402Failures)) /
        Math.max(1, jobN + facts.x402Requests);
  const disputeRate =
    facts.jobsDisputed / Math.max(1, jobN + facts.jobsDisputed);

  return {
    agentId: facts.agentId,
    jobsCompleted: facts.jobsCompleted,
    jobsFailed: facts.jobsFailed,
    jobsDisputed: facts.jobsDisputed,
    disputesLost: facts.disputesLost,
    x402Requests: facts.x402Requests,
    x402Failures: facts.x402Failures,
    p50LatencyMs: percentile(facts.latencies, 0.5),
    p95LatencyMs: percentile(facts.latencies, 0.95),
    volumeUsd: baseUnitsToDecimal(facts.volumeBase),
    successRate,
    disputeRate,
    score: scoreFacts(facts),
  };
}

function ensure(facts: Map<string, AgentFacts>, agentId: string): AgentFacts {
  const existing = facts.get(agentId);
  if (existing) return existing;
  const created: AgentFacts = {
    agentId,
    jobsCompleted: 0,
    jobsFailed: 0,
    jobsDisputed: 0,
    disputesLost: 0,
    x402Requests: 0,
    x402Failures: 0,
    latencies: [],
    volumeBase: 0n,
  };
  facts.set(agentId, created);
  return created;
}

function addVolume(facts: AgentFacts, amount: unknown): void {
  if (typeof amount !== 'string' || !/^\d+$/.test(amount)) return;
  facts.volumeBase += BigInt(amount);
}

function asId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

/** $U has 18 decimals; the column is a decimal string, never a float. */
export function baseUnitsToDecimal(amount: bigint, decimals = 18): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const padded = abs.toString().padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, '');
  const body = frac.length > 0 ? `${whole}.${frac}` : whole;
  return negative ? `-${body}` : body;
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}
