"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";

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

type IntentResponse = {
  id: string;
  status: string;
  rawText: string;
  intent: ParsedIntent;
  embeddingDimensions: number;
  planner: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  };
};

/**
 * The first useful surface after sign-in: type an outcome, see the object the API extracted.
 * Agents, quotes and sessions come later — this panel only proves the intent is clear.
 */
export function IntentComposer() {
  const [text, setText] = useState("swap 5 usdt for bnb");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntentResponse | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<IntentResponse>("/intents", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not parse intent");
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
          {busy ? "Parsing…" : "Parse"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {result ? (
        <pre className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs leading-5 dark:border-zinc-800 dark:bg-zinc-950">
          {JSON.stringify(result.intent, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
