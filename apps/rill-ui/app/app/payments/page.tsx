"use client";

import { useEffect, useState } from "react";

import { WorkspacePage } from "../../components/workspace-shell";
import { fetchX402, listPayments, type X402Payment } from "@/lib/commerce";
import { errorText, shortAddress } from "@/lib/format";

export default function PaymentsPage() {
  const [rows, setRows] = useState<X402Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setRows(await listPayments());
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onFetch(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = await fetchX402({
        url,
        sessionId: sessionId || undefined,
      });
      setResult(JSON.stringify(body, null, 2));
      await refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Payments">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">x402 ledger</h2>
      <p className="text-sm text-muted">
        Outbound paid HTTP and the payment table. This module never shares a path with ERC-8183.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <form onSubmit={(event) => void onFetch(event)} className="space-y-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium text-foreground">Fetch with x402</p>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm"
          required
        />
        <input
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          placeholder="Session id (optional)"
          className="h-10 w-full rounded-xl border border-border bg-surface-deep px-3 font-mono text-sm"
        />
        <button type="submit" disabled={busy} className="btn btn-primary h-10 px-4">
          {busy ? "Paying…" : "Fetch"}
        </button>
        {result ? (
          <pre className="overflow-x-auto rounded-xl bg-surface-deep p-3 font-mono text-[11px] text-muted">
            {result}
          </pre>
        ) : null}
      </form>

      <ul className="space-y-2">
        {rows?.map((row) => (
          <li key={row.id} className="rounded-xl border border-border px-3 py-3">
            <p className="text-sm text-foreground">
              {row.direction} · {row.amount} · {row.rail}
            </p>
            <p className="mt-1 truncate font-mono text-[11px] text-muted">{row.resourceUrl}</p>
            <p className="font-mono text-[11px] text-muted">
              {shortAddress(row.payerAddress)} → {shortAddress(row.payeeAddress)}
            </p>
          </li>
        ))}
        {rows?.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : null}
      </ul>
    </WorkspacePage>
  );
}
