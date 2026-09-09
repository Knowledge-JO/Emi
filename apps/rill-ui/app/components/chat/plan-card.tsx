"use client";

import Link from "next/link";

import { planIsPending, railLabel, shortAddress, type PlanResponse } from "@/lib/rill";

type PlanCardProps = {
  plan: PlanResponse;
  busy?: boolean;
  onApprove: () => void;
  onRun: () => void;
  onRevoke: () => void;
};

export function PlanCard({ plan, busy, onApprove, onRun, onRevoke }: PlanCardProps) {
  const expiry = new Date(plan.authorizationPlan.expiry * 1000);
  const running = planIsPending(plan);
  const done = plan.execution.status === "succeeded" || plan.status === "completed";
  const failed = plan.execution.status === "failed" || plan.status === "failed";
  const usesJobs = plan.steps.some((step) => step.paymentRail === "erc8183");
  const usesX402 = plan.steps.some((step) => step.paymentRail === "x402");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Authorization plan</p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {plan.status} · {plan.engine}
          {plan.granted ? " · granted" : ""}
          {plan.temporalWorkflowId ? ` · ${plan.temporalWorkflowId}` : ""}
        </p>
      </div>

      <ol className="space-y-2">
        {plan.steps.map((step) => (
          <li
            key={step.stepKey}
            className="rounded-xl border border-border bg-surface-deep/60 px-3 py-2"
          >
            <p className="text-sm text-foreground">
              {step.sequence + 1}. {step.agent.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {step.capability.name} · {railLabel(step.paymentRail)}
            </p>
            <Link
              href={`/app/agents/${step.agent.slug}`}
              className="mt-1 inline-block font-mono text-[11px] text-accent hover:underline"
            >
              {step.agent.slug}
            </Link>
          </li>
        ))}
      </ol>

      {running && plan.engine === "temporal" ? (
        <p className="text-xs text-accent">
          Loan protection is running as a durable workflow. This chat keeps polling until it
          settles — it does not time out after a minute.
        </p>
      ) : null}

      {plan.skills.map((skill) => (
        <div key={skill.id}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Skill ·{" "}
            <Link href={`/app/skills/${skill.id}`} className="text-accent hover:underline">
              {skill.name}
            </Link>
          </p>
          <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <p className="font-medium text-foreground">May</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">
                {skill.may.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">May not</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">
                {skill.mayNot.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Session may call
        </p>
        <ul className="mt-1 space-y-1 font-mono text-[11px] text-muted">
          {plan.authorizationPlan.calls.map((call) => (
            <li key={`${call.to}-${call.selector ?? ""}`}>
              {call.protocolSlug ? `${call.protocolSlug} · ` : ""}
              {shortAddress(call.to)}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Spend cap</p>
        <ul className="mt-1 space-y-1 font-mono text-[11px] text-muted">
          {plan.authorizationPlan.spend.map((cap) => (
            <li key={cap.token}>
              {cap.limit} / {cap.period} · {shortAddress(cap.token)}
            </li>
          ))}
        </ul>
      </div>

      <p className="font-mono text-[11px] text-muted">expires {expiry.toLocaleString()}</p>

      {plan.sessionId ? (
        <Link
          href={`/app/sessions/${plan.sessionId}`}
          className="block font-mono text-[11px] text-accent hover:underline"
        >
          Session {shortAddress(plan.sessionId)}
        </Link>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs">
        {usesJobs ? (
          <Link href="/app/jobs" className="text-accent hover:underline">
            Open jobs
          </Link>
        ) : null}
        {usesX402 ? (
          <Link href="/app/payments" className="text-accent hover:underline">
            Open x402 ledger
          </Link>
        ) : null}
      </div>

      {plan.missing.length > 0 ? (
        <p className="text-xs text-accent">Still needed: {plan.missing.join(", ")}</p>
      ) : null}

      {plan.assumptions.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
          {plan.assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {done ? (
        <div className="space-y-1 font-mono text-[11px] text-success">
          <p>Executed{plan.execution.play ? ` · ${plan.execution.play}` : ""}</p>
          {plan.execution.transactionHash ? (
            <a
              href={`https://bscscan.com/tx/${plan.execution.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="block text-accent hover:underline"
            >
              {shortAddress(plan.execution.transactionHash)}
            </a>
          ) : null}
        </div>
      ) : null}

      {failed && plan.execution.error ? (
        <p className="text-xs text-danger">{plan.execution.error}</p>
      ) : null}

      {!plan.granted ? (
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="btn btn-primary h-10 px-4"
          >
            {busy ? "Granting…" : "Approve session"}
          </button>
          <p className="mt-2 text-xs text-muted">
            Your passkey grants a scoped session. It does not run the job yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plan.sessionStatus !== "revoked" && !done ? (
            <button
              type="button"
              disabled={busy || running}
              onClick={onRun}
              className="btn btn-primary h-10 px-4"
            >
              {running ? "Running…" : failed ? "Retry" : "Run"}
            </button>
          ) : null}
          {plan.sessionStatus === "active" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRevoke}
              className="btn btn-ghost h-10 px-4"
            >
              Revoke
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
