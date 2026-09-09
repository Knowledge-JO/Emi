"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../components/workspace-shell";
import { errorText } from "@/lib/format";
import { listAgents, railLabel, type PublicAgent } from "@/lib/rill";

export default function AgentsPage() {
  const [agents, setAgents] = useState<PublicAgent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch((err: unknown) => setError(errorText(err)));
  }, []);

  return (
    <WorkspacePage title="Agents">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Agents</h2>
      <p className="text-sm text-muted">
        Live listings from <span className="font-mono">GET /marketplace/agents</span>. Matching still
        happens when you send a chat message.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {agents === null && !error ? <p className="text-sm text-muted">Loading…</p> : null}
      <div className="grid gap-3">
        {agents?.map((agent) => (
          <Link
            key={agent.id}
            href={`/app/agents/${agent.slug}`}
            className="rounded-2xl border border-border p-4 hover:border-accent/40"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{agent.name}</p>
              <span className="text-[11px] uppercase tracking-wide text-muted">{agent.category}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{agent.description}</p>
            <p className="mt-2 font-mono text-[11px] text-muted">
              {agent.capabilities
                .map((cap) => `${cap.taxonomyKey} · ${railLabel(cap.settlementRail)}`)
                .join(" · ")}
            </p>
          </Link>
        ))}
      </div>
    </WorkspacePage>
  );
}
