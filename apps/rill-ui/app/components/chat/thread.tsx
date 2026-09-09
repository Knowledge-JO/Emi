"use client";

import { AgentPicker } from "./agent-picker";
import { PlanCard } from "./plan-card";
import type { IntentResponse, PlanResponse } from "@/lib/rill";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; kind: "status"; text: string }
  | { id: string; role: "assistant"; kind: "error"; text: string }
  | {
      id: string;
      role: "assistant";
      kind: "agents";
      intent: IntentResponse;
    }
  | { id: string; role: "assistant"; kind: "plan"; plan: PlanResponse };

type ThreadProps = {
  messages: ChatMessage[];
  selections: Record<string, string>;
  busy: boolean;
  onSelectAgent: (graphNodeId: string, agentId: string) => void;
  onContinue: () => void;
  onApprove: () => void;
  onRun: () => void;
  onRevoke: () => void;
};

export function Thread({
  messages,
  selections,
  busy,
  onSelectAgent,
  onContinue,
  onApprove,
  onRun,
  onRevoke,
}: ThreadProps) {
  const latestAgents = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.kind === "agents");
  const latestPlan = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.kind === "plan");

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <article
          key={message.id}
          className={
            message.role === "user"
              ? "ml-auto max-w-[85%] rounded-2xl bg-accent/15 px-4 py-3 text-sm text-foreground"
              : "mr-auto w-full max-w-[92%] rounded-2xl border border-border bg-surface px-4 py-3"
          }
        >
          {message.role === "user" ? (
            <p>{message.text}</p>
          ) : message.kind === "status" ? (
            <p className="text-sm text-muted">{message.text}</p>
          ) : message.kind === "error" ? (
            <p className="text-sm text-danger">{message.text}</p>
          ) : message.kind === "agents" ? (
            <AgentPicker
              intent={message.intent}
              selections={selections}
              disabled={busy || message.id !== latestAgents?.id}
              onSelect={onSelectAgent}
              onContinue={onContinue}
            />
          ) : (
            <PlanCard
              plan={message.plan}
              busy={busy || message.id !== latestPlan?.id}
              onApprove={onApprove}
              onRun={onRun}
              onRevoke={onRevoke}
            />
          )}
        </article>
      ))}
    </div>
  );
}
