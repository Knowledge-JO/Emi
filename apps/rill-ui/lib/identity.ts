import { apiFetch } from "@/lib/api";

export type IdentityCard = {
  slug: string;
  name: string;
  description: string;
  category: string;
  version: string;
  developer: { slug: string; displayName: string; verification: string };
  capabilities: Array<{
    id: string;
    name: string;
    taxonomyKey: string;
    description: string;
    pricingModel: string;
    settlementRail: string;
    unitPrice: string;
  }>;
  identity: {
    chainId: number;
    registryAddress: string;
    onchainAgentId: string;
    ownerAddress: string | null;
    agentDomain: string | null;
    endpointUrl: string | null;
    lastSyncBlock: number;
    lastSyncedAt: string | null;
    synced: boolean;
  };
  reputation: { score01: number };
  live?: {
    owner: string;
    uri: string;
    block: number;
    listingMatchesOnchain: boolean;
    onchainName: string | null;
  };
  liveError?: { code: string };
};

export function getIdentity(slug: string, live = false) {
  return apiFetch<IdentityCard>(`/identities/${slug}${live ? "?live=1" : ""}`);
}

export function syncIdentity(slug: string) {
  return apiFetch<IdentityCard>(`/identities/${slug}/sync`, { method: "POST" });
}

export function issueAgentKey(slug: string, name?: string) {
  return apiFetch<{ id: string; prefix: string; name: string; secret: string }>(
    `/identities/${slug}/keys`,
    { method: "POST", body: JSON.stringify({ name }) },
  );
}
