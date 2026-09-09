import { apiFetch } from "@/lib/api";

export type Publisher = {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  description: string | null;
  verification: string;
  createdAt: string;
};

export function getPublisher() {
  return apiFetch<Publisher>("/marketplace/publishers/me");
}

export function becomePublisher(body: {
  slug: string;
  displayName: string;
  description?: string;
}) {
  return apiFetch<Publisher>("/marketplace/publishers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function registerListing(body: {
  slug: string;
  name: string;
  description: string;
  category?: string;
  acceptsErc8183?: boolean;
  acceptsX402?: boolean;
  canSubcontract?: boolean;
  skillId?: string;
}) {
  return apiFetch<{ slug: string; id: string }>("/marketplace/agents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function attachListingIdentity(
  slug: string,
  body: { onchainAgentId: string; agentDomain?: string; endpointUrl?: string },
) {
  return apiFetch<unknown>(`/marketplace/agents/${slug}/identity`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function declareListingCapability(
  slug: string,
  body: {
    name: string;
    taxonomyKey: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    pricingModel: "per_job" | "per_request" | "subscription";
    settlementRail: "x402" | "erc8183";
    unitPrice: string;
    priceAssetId: string;
    assetIds: string[];
    protocolIds: string[];
    expectedDurationSeconds?: number;
    x402ResourceUrl?: string;
  },
) {
  return apiFetch<unknown>(`/marketplace/agents/${slug}/capabilities`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function publishListing(slug: string) {
  return apiFetch<unknown>(`/marketplace/agents/${slug}/publish`, {
    method: "POST",
  });
}
