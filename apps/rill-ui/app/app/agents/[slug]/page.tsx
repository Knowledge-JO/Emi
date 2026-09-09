"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../../components/workspace-shell";
import { errorText, shortAddress } from "@/lib/format";
import { getIdentity, type IdentityCard } from "@/lib/identity";
import { getAgent, railLabel, type PublicAgent } from "@/lib/rill";

export default function AgentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<PublicAgent | null>(null);
  const [identity, setIdentity] = useState<IdentityCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getAgent(slug)
      .then(setAgent)
      .catch((err: unknown) => setError(errorText(err)));
    getIdentity(slug)
      .then(setIdentity)
      .catch(() => setIdentity(null));
  }, [slug]);

  return (
    <WorkspacePage title={agent?.name ?? "Agent"}>
      <Link href="/app/agents" className="text-xs text-accent hover:underline">
        All agents
      </Link>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {agent ? (
        <>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{agent.name}</h2>
          <p className="text-sm text-muted">{agent.description}</p>
          <p className="font-mono text-xs text-muted">
            {agent.slug} · {agent.developer.displayName} · {agent.version}
          </p>
          <ul className="space-y-2">
            {agent.capabilities.map((cap) => (
              <li key={cap.id} className="rounded-xl border border-border px-3 py-2">
                <p className="text-sm text-foreground">{cap.name}</p>
                <p className="text-xs text-muted">
                  {cap.taxonomyKey} · {railLabel(cap.settlementRail)} · {cap.pricingModel} ·{" "}
                  {cap.unitPrice}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {identity ? (
        <section className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">ERC-8004 identity</p>
            <Link href={`/app/identities/${slug}`} className="text-xs text-accent hover:underline">
              Open card
            </Link>
          </div>
          <p className="mt-2 font-mono text-xs text-muted">
            token {identity.identity.onchainAgentId} · registry{" "}
            {shortAddress(identity.identity.registryAddress)}
          </p>
          <p className="mt-1 text-xs text-muted">
            reputation {identity.reputation.score01.toFixed(2)}
          </p>
        </section>
      ) : null}
    </WorkspacePage>
  );
}
