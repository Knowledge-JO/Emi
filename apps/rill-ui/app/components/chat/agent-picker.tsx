"use client";

import { Check } from "@phosphor-icons/react";

import {
  groupMatches,
  railLabel,
  type IntentResponse,
} from "@/lib/rill";

type AgentPickerProps = {
  intent: IntentResponse;
  selections: Record<string, string>;
  disabled?: boolean;
  onSelect: (graphNodeId: string, agentId: string) => void;
  onContinue: () => void;
};

export function AgentPicker({
  intent,
  selections,
  disabled,
  onSelect,
  onContinue,
}: AgentPickerProps) {
  const groups = groupMatches(intent.matches);
  const ready =
    groups.length > 0 &&
    groups.every((group) => Boolean(selections[group.graphNodeId]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">{intent.intent.summary}</p>
      <p className="font-mono text-[11px] text-muted">
        {intent.intent.kind} · {intent.intent.chain}
        {intent.intent.confidence
          ? ` · ${Math.round(intent.intent.confidence * 100)}%`
          : ""}
      </p>

      {intent.intent.missing.length > 0 ? (
        <p className="text-xs text-accent">
          Assumed or still open: {intent.intent.missing.join(", ")}
        </p>
      ) : null}

      {intent.unmatchedTaxonomyKeys.length > 0 ? (
        <p className="text-xs text-danger">
          No listing for {intent.unmatchedTaxonomyKeys.join(", ")}
        </p>
      ) : null}

      {groups.map((group) => (
        <div key={group.graphNodeId} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {group.matches.length > 1
              ? `Choose an agent for ${group.taxonomyKey}`
              : group.taxonomyKey}
          </p>
          <div className="space-y-2">
            {group.matches.map((match) => {
              const selected = selections[group.graphNodeId] === match.agent.id;
              return (
                <button
                  key={`${match.graphNodeId}-${match.agent.id}-${match.capability.id}`}
                  type="button"
                  disabled={disabled || group.matches.length === 1}
                  onClick={() => onSelect(group.graphNodeId, match.agent.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-accent/50 bg-accent/5"
                      : "border-border hover:border-[#3a424c]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {match.agent.name}
                        <span className="ml-2 font-mono text-[11px] text-muted">
                          #{match.rank}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {match.capability.name} · {railLabel(match.settlementRail)}{" "}
                        · {match.match}
                      </p>
                    </div>
                    {selected ? (
                      <Check size={16} className="mt-0.5 text-accent" />
                    ) : null}
                  </div>
                  <dl className="mt-2 grid grid-cols-4 gap-2 font-mono text-[10px] text-muted">
                    <div>fit {match.capabilityFitScore.toFixed(2)}</div>
                    <div>price {match.priceScore.toFixed(2)}</div>
                    <div>avail {match.availabilityScore.toFixed(2)}</div>
                    <div>rep {match.reputationScore.toFixed(2)}</div>
                  </dl>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {ready ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onContinue}
          className="btn btn-primary h-10 px-4"
        >
          Continue with this plan
        </button>
      ) : null}
    </div>
  );
}
