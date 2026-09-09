"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../../components/workspace-shell";
import {
  acceptJob,
  cancelJob,
  deliverJob,
  disputeJob,
  fundJob,
  getJob,
  refundJob,
  settleJob,
  syncJob,
  type JobRow,
} from "@/lib/commerce";
import { errorText, shortAddress } from "@/lib/format";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobRow | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!id) return;
    setJob(await getJob(id));
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(errorText(err)));
  }, [id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Job">
      <Link href="/app/jobs" className="text-xs text-accent hover:underline">
        All jobs
      </Link>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {job ? (
        <>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{job.status}</h2>
          <dl className="space-y-1 font-mono text-xs text-muted">
            <p>id {job.id}</p>
            <p>on-chain {job.onchainJobId ?? "—"}</p>
            <p>amount {job.amount}</p>
            <p>escrow {shortAddress(job.escrowAddress)}</p>
            {job.fundTxHash ? <p>fund {shortAddress(job.fundTxHash)}</p> : null}
            {job.settleTxHash ? <p>settle {shortAddress(job.settleTxHash)}</p> : null}
          </dl>

          <label className="block text-xs text-muted">
            Session id (for fund / settle / refund / dispute)
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-deep px-3 font-mono text-sm text-foreground"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="btn btn-primary h-9 px-3"
              onClick={() => void run(() => fundJob(job.id, sessionId || undefined))}
            >
              Fund
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-9 px-3"
              onClick={() => void run(() => syncJob(job.id))}
            >
              Sync
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-9 px-3"
              onClick={() =>
                void run(() => deliverJob(job.id, { note: "delivered from emi ui" }))
              }
            >
              Deliver
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-9 px-3"
              onClick={() => void run(() => acceptJob(job.id))}
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-primary h-9 px-3"
              onClick={() => void run(() => settleJob(job.id, sessionId || undefined))}
            >
              Settle
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-9 px-3"
              onClick={() => void run(() => refundJob(job.id, sessionId || undefined))}
            >
              Refund
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost h-9 px-3"
              onClick={() => void run(() => cancelJob(job.id))}
            >
              Cancel
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Dispute reason"
              className="h-10 flex-1 rounded-xl border border-border bg-surface-deep px-3 text-sm"
            />
            <button
              type="button"
              disabled={busy || !reason}
              className="btn btn-ghost h-10 px-3"
              onClick={() => void run(() => disputeJob(job.id, reason, sessionId || undefined))}
            >
              Dispute
            </button>
          </div>
        </>
      ) : null}
    </WorkspacePage>
  );
}
