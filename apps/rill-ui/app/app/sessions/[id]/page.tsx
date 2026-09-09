"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../../components/workspace-shell";
import { getSession, recordSessionRevoke, type SessionView } from "@/lib/account";
import { revokeSessionKey } from "@/lib/altana";
import { errorText, shortAddress } from "@/lib/format";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSession(id)
      .then(setSession)
      .catch((err: unknown) => setError(errorText(err)));
  }, [id]);

  async function revoke() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const result = await revokeSessionKey(session.publicKey);
      const next = await recordSessionRevoke(session.id, result.transactionHash);
      setSession(next);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Session">
      <Link href="/app/account" className="text-xs text-accent hover:underline">
        Account
      </Link>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {session ? (
        <>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{session.status}</h2>
          <p className="font-mono text-xs text-muted">id {session.id}</p>
          <p className="font-mono text-xs text-muted">key {shortAddress(session.publicKey)}</p>
          <p className="font-mono text-xs text-muted">
            expires {new Date(session.expiry * 1000).toLocaleString()}
          </p>
          {session.status === "active" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void revoke()}
              className="btn btn-ghost h-10 px-4"
            >
              {busy ? "Revoking…" : "Revoke on-chain"}
            </button>
          ) : null}
        </>
      ) : null}
    </WorkspacePage>
  );
}
