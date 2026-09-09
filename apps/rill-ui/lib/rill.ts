import { apiFetch } from "@/lib/api";

export type ParsedIntent = {
  kind: string;
  summary: string;
  confidence: number;
  rejected: boolean;
  rejectionReason: string | null;
  chain: string;
  legs: Array<{
    type: string;
    taxonomyKey: string;
    from: { symbol: string; amount: string | null };
    to: { symbol: string; amount: string | null };
  }>;
  missing: string[];
  assumptions: string[];
};

export type MatchedAgent = {
  graphNodeId: string;
  requestedTaxonomyKey: string;
  rank: number;
  score: number;
  capabilityFitScore: number;
  priceScore: number;
  availabilityScore: number;
  reputationScore: number;
  quotedPrice: string;
  quotedAssetId: string;
  settlementRail: string;
  match: "exact" | "vector";
  agent: { id: string; slug: string; name: string };
  capability: { id: string; name: string; taxonomyKey: string };
};

export type IntentResponse = {
  id: string;
  status: string;
  rawText: string;
  intent: ParsedIntent;
  matches: MatchedAgent[];
  unmatchedTaxonomyKeys: string[];
};

export type PlanResponse = {
  id: string;
  intentId: string;
  status: string;
  engine: string;
  walletId: string | null;
  missing: string[];
  assumptions: string[];
  steps: Array<{
    stepKey: string;
    sequence: number;
    kind: string;
    paymentRail: string;
    agent: { id: string; slug: string; name: string };
    capability: { id: string; name: string; taxonomyKey: string };
    input: Record<string, unknown>;
  }>;
  authorizationPlan: {
    calls: Array<{ to: string; selector?: string; protocolSlug?: string }>;
    spend: Array<{ token: string; limit: string; period: string }>;
    expiry: number;
  };
  granted: boolean;
  sessionId: string | null;
  sessionPublicKey: string | null;
  sessionStatus: "active" | "revoked" | "expired" | "pending" | "failed" | null;
  temporalWorkflowId: string | null;
  temporalRunId: string | null;
  execution: {
    status: "idle" | "running" | "succeeded" | "failed";
    play: string | null;
    amountIn: string | null;
    amountOut: string | null;
    amountOutMin: string | null;
    path: string[] | null;
    transactionHash: string | null;
    callsId: string | null;
    error: string | null;
  };
  skills: Array<{
    id: string;
    name: string;
    source: string;
    category: string;
    writeOnchain: boolean;
    may: string[];
    mayNot: string[];
  }>;
};

export type PublicAgent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  version: string;
  developer: { slug: string; displayName: string };
  capabilities: Array<{
    id: string;
    name: string;
    taxonomyKey: string;
    description: string;
    pricingModel: string;
    settlementRail: string;
    unitPrice: string;
    expectedDurationSeconds: number | null;
  }>;
};

export type MatchGroup = {
  graphNodeId: string;
  taxonomyKey: string;
  matches: MatchedAgent[];
};

export function groupMatches(matches: MatchedAgent[]): MatchGroup[] {
  const groups = new Map<string, MatchGroup>();
  for (const match of matches) {
    const existing = groups.get(match.graphNodeId);
    if (existing) {
      existing.matches.push(match);
      continue;
    }
    groups.set(match.graphNodeId, {
      graphNodeId: match.graphNodeId,
      taxonomyKey: match.requestedTaxonomyKey,
      matches: [match],
    });
  }
  for (const group of groups.values()) {
    group.matches.sort((a, b) => a.rank - b.rank);
  }
  return [...groups.values()];
}

export function defaultSelections(matches: MatchedAgent[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const group of groupMatches(matches)) {
    const first = group.matches[0];
    if (first) next[group.graphNodeId] = first.agent.id;
  }
  return next;
}

export function needsAgentChoice(matches: MatchedAgent[]): boolean {
  return groupMatches(matches).some((group) => group.matches.length > 1);
}

export function selectionsPayload(selections: Record<string, string>) {
  return Object.entries(selections).map(([graphNodeId, agentId]) => ({
    graphNodeId,
    agentId,
  }));
}

export function createIntent(text: string) {
  return apiFetch<IntentResponse>("/intents", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function createPlan(
  intentId: string,
  selections: Record<string, string>,
) {
  return apiFetch<PlanResponse>("/orchestrator/plans", {
    method: "POST",
    body: JSON.stringify({
      intentId,
      selections: selectionsPayload(selections),
    }),
  });
}

export function getPlan(planId: string) {
  return apiFetch<PlanResponse>(`/orchestrator/plans/${planId}`);
}

export function executePlan(planId: string) {
  return apiFetch<PlanResponse>(`/orchestrator/plans/${planId}/execute`, {
    method: "POST",
  });
}

export function getIntent(intentId: string) {
  return apiFetch<IntentResponse>(`/intents/${intentId}`);
}

export function listAgents() {
  return apiFetch<PublicAgent[]>("/marketplace/agents");
}

export function getAgent(slug: string) {
  return apiFetch<PublicAgent>(`/marketplace/agents/${slug}`);
}

export type SkillSummary = {
  id: string;
  name: string;
  source: string;
  category: string;
  writeOnchain: boolean;
  may: string[];
  mayNot: string[];
};

export type SkillDetail = SkillSummary & {
  taxonomyKeys: string[];
  addressTable: Record<string, string>;
  callAddresses: string[];
};

export function listSkills() {
  return apiFetch<SkillSummary[]>("/skills");
}

export function getSkill(id: string) {
  return apiFetch<SkillDetail>(`/skills/${id}`);
}

export function planIsPending(plan: PlanResponse) {
  if (plan.execution.status === "running") return true;
  return plan.engine === "temporal" && plan.status === "running";
}

export function railLabel(rail: string) {
  if (rail === "erc8183") return "ERC-8183";
  if (rail === "x402") return "x402";
  return rail;
}

export function shortAddress(value: string) {
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export const SUGGESTIONS = [
  "swap 5 usdt for bnb",
  "protect my venus loan",
  "what's my swap quote for usdt/bnb",
];
