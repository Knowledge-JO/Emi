"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { grantPlan, revokePlan } from "@/lib/altana";

type ParsedIntent = {
  kind: string;
  summary: string;
  confidence: number;
  rejected: boolean;
  rejectionReason: string | null;
  chain: string;
  legs: Array<{
    type: string;
    taxonomyKey: string;
    from: { symbol: string; amount: string | null };
    to: { symbol: string; amount: string | null };
  }>;
  goalTree: unknown;
  missing: string[];
  assumptions: string[];
};

type MatchedAgent = {
  graphNodeId: string;
  requestedTaxonomyKey: string;
  rank: number;
  score: number;
  capabilityFitScore: number;
  priceScore: number;
  availabilityScore: number;
  reputationScore: number;
  quotedPrice: string;
  quotedAssetId: string;
  settlementRail: string;
  match: "exact" | "vector";
  agent: { id: string; slug: string; name: string };
  capability: { id: string; name: string; taxonomyKey: string };
};

type PlanResponse = {
  id: string;
  intentId: string;
  status: string;
  engine: string;
  walletId: string | null;
  missing: string[];
  assumptions: string[];
  steps: Array<{
    stepKey: string;
    sequence: number;
    kind: string;
    paymentRail: string;
    agent: { id: string; slug: string; name: string };
    capability: { id: string; name: string; taxonomyKey: string };
    input: Record<string, unknown>;
  }>;
  authorizationPlan: {
    calls: Array<{ to: string; selector?: string; protocolSlug?: string }>;
    spend: Array<{ token: string; limit: string; period: string }>;
    expiry: number;
  };
  granted: boolean;
  sessionId: string | null;
  sessionPublicKey: string | null;
  sessionStatus: "active" | "revoked" | "expired" | "pending" | "failed" | null;
  execution: {
    status: "idle" | "running" | "succeeded" | "failed";
    play: string | null;
    amountIn: string | null;
    amountOut: string | null;
    amountOutMin: string | null;
    path: string[] | null;
    transactionHash: string | null;
    callsId: string | null;
    error: string | null;
  };
  skills: Array<{
    id: string;
    name: string;
    source: string;
    category: string;
    writeOnchain: boolean;
    may: string[];
    mayNot: string[];
  }>;
};

type IntentResponse = {
  id: string;
  status: string;
  rawText: string;
  intent: ParsedIntent;
  capabilityGraph: unknown[];
  matches: MatchedAgent[];
  unmatchedTaxonomyKeys: string[];
  embeddingDimensions: number;
  planner: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  };
};

/**
 * Type an outcome, see who matched, review the authorization plan, approve a session,
 * then run the bound skill playbook.
 */
export function IntentComposer() {
  const [text, setText] = useState("swap 5 usdt for bnb");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntentResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [balances, setBalances] = useState<{
    native: string;
    tokens: Array<{
      address: string;
      ok: boolean;
      display?: string;
      symbol?: string;
    }>;
  } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPlan(null);

    try {
      const response = await apiFetch<IntentResponse>("/intents", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not match intent");
    } finally {
      setBusy(false);
    }
  }

  async function reviewPlan() {
    if (!result) return;
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<PlanResponse>("/orchestrator/plans", {
        method: "POST",
        body: JSON.stringify({ intentId: result.id }),
      });
      setPlan(response);
      await refreshBalances();
    } catch (err) {
      setPlan(null);
      setError(err instanceof Error ? err.message : "Could not build a plan");
    } finally {
      setBusy(false);
    }
  }

  async function approvePlan() {
    if (!plan || plan.granted) return;
    setBusy(true);
    setError(null);

    try {
      const response = await grantPlan<PlanResponse>(plan);
      setPlan(response);
      await refreshBalances();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not grant a session",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshBalances() {
    try {
      const snapshot = await apiFetch<{
        native: string;
        tokens: Array<{
          address: string;
          ok: boolean;
          display?: string;
          symbol?: string;
        }>;
      }>("/wallets/me/balances");
      setBalances(snapshot);
    } catch {
      setBalances(null);
    }
  }

  async function revokeGrantedPlan() {
    if (!plan?.sessionPublicKey || plan.sessionStatus === "revoked") return;
    setBusy(true);
    setError(null);

    try {
      const response = await revokePlan<PlanResponse>({
        id: plan.id,
        sessionPublicKey: plan.sessionPublicKey,
      });
      setPlan(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not revoke the session",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runPlan() {
    if (!plan?.granted || plan.execution.status === "running") return;
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<PlanResponse>(
        `/orchestrator/plans/${plan.id}/execute`,
        { method: "POST" },
      );
      setPlan(response);
      if (response.execution.status === "failed") {
        setError(response.execution.error ?? "Swap failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <form onSubmit={(event) => void submit(event)} className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Describe an outcome…"
          className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={busy || text.trim().length < 3}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {busy ? "Working…" : "Find agents"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {result ? (
        <ResultPanel
          result={result}
          plan={plan}
          busy={busy}
          onReviewPlan={() => void reviewPlan()}
          onApprove={() => void approvePlan()}
          onRun={() => void runPlan()}
          onRevoke={() => void revokeGrantedPlan()}
          balances={balances}
        />
      ) : null}
    </div>
  );
}

function ResultPanel({
  result,
  plan,
  busy,
  onReviewPlan,
  onApprove,
  onRun,
  onRevoke,
  balances,
}: {
  result: IntentResponse;
  plan: PlanResponse | null;
  busy: boolean;
  onReviewPlan: () => void;
  onApprove: () => void;
  onRun: () => void;
  onRevoke: () => void;
  balances: {
    native: string;
    tokens: Array<{
      address: string;
      ok: boolean;
      display?: string;
      symbol?: string;
    }>;
  } | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {result.intent.summary}
        <span className="ml-2 font-mono text-xs text-zinc-400">
          {result.intent.kind} · {result.intent.chain}
        </span>
      </p>

      {result.matches.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {result.matches.map((match) => (
            <li
              key={`${match.graphNodeId}-${match.capability.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">
                  #{match.rank} {match.agent.name}
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  {match.score.toFixed(2)} · {match.match} ·{" "}
                  {match.settlementRail}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {match.capability.taxonomyKey} via {match.agent.slug}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500 sm:grid-cols-4">
                <Score label="fit" value={match.capabilityFitScore} />
                <Score label="price" value={match.priceScore} />
                <Score label="avail" value={match.availabilityScore} />
                <Score label="rep" value={match.reputationScore} />
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No agent matched
          {result.unmatchedTaxonomyKeys.length > 0
            ? ` ${result.unmatchedTaxonomyKeys.join(", ")}`
            : ""}
          . Seed the catalog if this is a swap.
        </p>
      )}

      {result.matches.length > 0 && !plan ? (
        <button
          type="button"
          onClick={onReviewPlan}
          disabled={busy}
          className="self-start rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
        >
          {busy ? "Planning…" : "Review plan"}
        </button>
      ) : null}

      {plan ? (
        <PlanPanel
          plan={plan}
          busy={busy}
          onApprove={onApprove}
          onRun={onRun}
          onRevoke={onRevoke}
          balances={balances}
        />
      ) : null}

      {result.unmatchedTaxonomyKeys.length > 0 && result.matches.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Unmatched: {result.unmatchedTaxonomyKeys.join(", ")}
        </p>
      ) : null}

      <pre className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs leading-5 dark:border-zinc-800 dark:bg-zinc-950">
        {JSON.stringify(
          {
            intent: result.intent,
            capabilityGraph: result.capabilityGraph,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

function PlanPanel({
  plan,
  busy,
  onApprove,
  onRun,
  onRevoke,
  balances,
}: {
  plan: PlanResponse;
  busy: boolean;
  onApprove: () => void;
  onRun: () => void;
  onRevoke: () => void;
  balances: {
    native: string;
    tokens: Array<{
      address: string;
      ok: boolean;
      display?: string;
      symbol?: string;
    }>;
  } | null;
}) {
  const expiry = new Date(plan.authorizationPlan.expiry * 1000).toISOString();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-medium">Authorization plan</p>
      <p className="mt-1 text-xs text-zinc-500">
        {plan.status} · {plan.engine} ·{" "}
        {plan.granted ? "granted" : "not granted"}
      </p>

      {plan.missing.length > 0 ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Still needed: {plan.missing.join(", ")}
        </p>
      ) : null}

      {plan.skills.map((skill) => (
        <div key={skill.id} className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Skill · {skill.name}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            How to use the protocol. The session below is what it may spend.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-zinc-600 dark:text-zinc-300">
                May
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-500">
                {skill.may.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-600 dark:text-zinc-300">
                May not
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-500">
                {skill.mayNot.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          May call
        </p>
        <ul className="mt-1 space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
          {plan.authorizationPlan.calls.map((call) => (
            <li key={call.to}>
              {call.protocolSlug ? `${call.protocolSlug} · ` : ""}
              {call.to}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Spend cap
        </p>
        <ul className="mt-1 space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
          {plan.authorizationPlan.spend.map((cap) => (
            <li key={cap.token}>
              {cap.limit} / {cap.period} · {cap.token}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 font-mono text-[11px] text-zinc-400">
        expires {expiry}
      </p>

      {plan.assumptions.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-zinc-500">
          {plan.assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {plan.granted ? (
        <div className="mt-4">
          <p className="text-xs text-zinc-500">
            Session {plan.sessionId} is {plan.sessionStatus ?? "granted"}.
          </p>
          {balances ? (
            <ul className="mt-3 space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
              <li>native {balances.native}</li>
              {balances.tokens
                .filter((token) => token.ok)
                .map((token) => (
                  <li key={token.address}>
                    {token.symbol ?? token.address.slice(0, 10)} {token.display}
                  </li>
                ))}
            </ul>
          ) : null}
          {plan.execution.status === "succeeded" ? (
            <div className="mt-3 space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
              <p>play {plan.execution.play}</p>
              {plan.execution.amountOutMin ? (
                <p>min out {plan.execution.amountOutMin}</p>
              ) : null}
              {plan.execution.transactionHash ? (
                <p>tx {plan.execution.transactionHash}</p>
              ) : null}
            </div>
          ) : null}
          {plan.execution.status === "failed" && plan.execution.error ? (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              {plan.execution.error}
            </p>
          ) : null}
          {plan.sessionStatus !== "revoked" &&
          plan.execution.status !== "succeeded" ? (
            <>
              <button
                type="button"
                onClick={onRun}
                disabled={busy || plan.execution.status === "running"}
                className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
              >
                {busy || plan.execution.status === "running"
                  ? "Swapping…"
                  : plan.execution.status === "failed"
                    ? "Retry swap"
                    : "Run swap"}
              </button>
              <p className="mt-3 text-xs text-zinc-500">
                Run quotes on RPC, then the session submits approve + swap. The
                passkey is not asked again. Native balance must be funded.
              </p>
            </>
          ) : null}
          {plan.sessionStatus === "active" ? (
            <button
              type="button"
              onClick={onRevoke}
              disabled={busy}
              className="mt-4 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
            >
              {busy ? "Revoking…" : "Revoke session"}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {busy ? "Granting…" : "Approve"}
          </button>
          <p className="mt-3 text-xs text-zinc-500">
            Approve grants a scoped session with your passkey. It does not swap.
          </p>
        </>
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd>{value.toFixed(2)}</dd>
    </div>
  );
}
