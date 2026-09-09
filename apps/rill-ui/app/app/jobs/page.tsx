"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkspacePage } from "../../components/workspace-shell";
import { createJob, listJobs, type JobRow } from "@/lib/commerce";
import { errorText, shortAddress } from "@/lib/format";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workerSlug, setWorkerSlug] = useState("swapmaster");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setJobs(await listJobs());
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createJob({ workerSlug, task });
      setTask("");
      await refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Jobs">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">ERC-8183 jobs</h2>
      <p className="text-sm text-muted">
        Hire, fund, deliver, and settle through <span className="font-mono">/jobs</span>. This rail
        is never x402.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <form onSubmit={(event) => void onCreate(event)} className="space-y-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium text-foreground">Create a job</p>
        <label className="block text-xs text-muted">
          Worker slug
          <input
            value={workerSlug}
            onChange={(event) => setWorkerSlug(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm text-foreground"
          />
        </label>
        <label className="block text-xs text-muted">
          Task
          <input
            value={task}
            onChange={(event) => setTask(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-deep px-3 text-sm text-foreground"
            required
          />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary h-10 px-4">
          {busy ? "Creating…" : "Create"}
        </button>
      </form>

      <ul className="space-y-2">
        {jobs?.map((job) => (
          <li key={job.id}>
            <Link
              href={`/app/jobs/${job.id}`}
              className="block rounded-xl border border-border px-3 py-3 hover:border-accent/40"
            >
              <p className="text-sm text-foreground">{job.status}</p>
              <p className="font-mono text-[11px] text-muted">
                {shortAddress(job.id)} · {job.amount} · {job.onchainJobId ?? "off-chain"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </WorkspacePage>
  );
}
