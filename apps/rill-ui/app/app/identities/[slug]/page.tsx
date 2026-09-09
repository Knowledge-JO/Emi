"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../../components/workspace-shell";
import { errorText, shortAddress } from "@/lib/format";
import {
  getIdentity,
  issueAgentKey,
  syncIdentity,
  type IdentityCard,
} from "@/lib/identity";

export default function IdentityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [card, setCard] = useState<IdentityCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(live = false) {
    if (!slug) return;
    setCard(await getIdentity(slug, live));
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(errorText(err)));
  }, [slug]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Identity">
      <Link href={slug ? `/app/agents/${slug}` : "/app/agents"} className="text-xs text-accent hover:underline">
        Agent listing
      </Link>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {card ? (
        <>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{card.name}</h2>
          <p className="text-sm text-muted">{card.description}</p>
          <p className="font-mono text-xs text-muted">
            token {card.identity.onchainAgentId} · {shortAddress(card.identity.registryAddress)} ·
            chain {card.identity.chainId}
          </p>
          <p className="text-xs text-muted">
            synced {card.identity.synced ? "yes" : "no"} · reputation{" "}
            {card.reputation.score01.toFixed(2)}
          </p>
          {card.live ? (
            <p className="text-xs text-muted">
              live owner {shortAddress(card.live.owner)} · matches listing{" "}
              {card.live.listingMatchesOnchain ? "yes" : "no"}
            </p>
          ) : null}
          {card.liveError ? (
            <p className="text-xs text-danger">{card.liveError.code}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-10 px-4"
              onClick={() => void run(() => refresh(true).then(() => undefined))}
            >
              Live read
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-primary h-10 px-4"
              onClick={() =>
                void run(async () => {
                  setCard(await syncIdentity(slug));
                })
              }
            >
              Sync cache
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-10 px-4"
              onClick={() =>
                void run(async () => {
                  const key = await issueAgentKey(slug);
                  setIssued(key.secret);
                })
              }
            >
              Issue API key
            </button>
          </div>
          {issued ? (
            <p className="break-all rounded-xl border border-accent/30 bg-accent/10 p-3 font-mono text-xs">
              Save this key now: {issued}
            </p>
          ) : null}
        </>
      ) : null}
    </WorkspacePage>
  );
}
