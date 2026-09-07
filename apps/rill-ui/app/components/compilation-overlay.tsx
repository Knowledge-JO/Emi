"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface RouteNode {
  label: string;
  status: "complete" | "active" | "pending";
}

interface AgentBadge {
  name: string;
  successRate: string;
  developer: string;
  fee: string;
}

interface CompilationOverlayProps {
  intent: string;
  nodes: RouteNode[];
  agents: AgentBadge[];
  onApprove: () => void;
  onCancel: () => void;
}

const alternatives = ["Recommended", "Cheapest", "Fastest"] as const;

export function CompilationOverlay({
  intent,
  nodes,
  agents,
  onApprove,
  onCancel,
}: CompilationOverlayProps) {
  const [selectedPath, setSelectedPath] = useState<"Recommended" | "Cheapest" | "Fastest">("Recommended");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="
          w-full max-w-2xl rounded-2xl
          bg-background-elevated border border-border
          p-8 my-8
        "
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm uppercase tracking-wider text-foreground-muted mb-1">
              Best Solution
            </h2>
            <p className="text-foreground leading-relaxed max-w-md text-lg">
              {intent}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-foreground-muted hover:text-foreground transition-colors p-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Expected outcome */}
        <div className="mb-6 p-4 rounded-xl bg-background-surface border border-accent-cyan/20">
          <div className="text-xs text-foreground-muted mb-1">Expected Outcome</div>
          <div className="font-data text-2xl font-semibold text-accent-cyan">
            ~2,450 USDT
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            Estimated after swap and repay, subject to market conditions
          </div>
        </div>

        {/* Execution route */}
        <div className="mb-6">
          <h3 className="text-sm uppercase tracking-wider text-foreground-muted mb-3">
            Execution Route
          </h3>
          <div className="space-y-0">
            {nodes.map((node, i) => (
              <div key={node.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${node.status === "complete" && "bg-accent-cyan"}
                    ${node.status === "active" && "bg-accent-magenta"}
                    ${node.status === "pending" && "bg-foreground-muted/40"}
                  `}></div>
                  {i < nodes.length - 1 && (
                    <div className="w-px h-6 bg-border"></div>
                  )}
                </div>
                <div className={`
                  text-sm py-1
                  ${node.status === "pending" ? "text-foreground-muted" : "text-foreground"}
                `}>
                  {node.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent validation */}
        <div className="mb-6">
          <h3 className="text-sm uppercase tracking-wider text-foreground-muted mb-3">
            Agent Validation
          </h3>
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between p-3 rounded-lg bg-background-surface"
              >
                <span className="text-sm font-medium text-foreground">{agent.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-accent-cyan font-data">{agent.successRate}</span>
                  <span className="text-foreground-muted">{agent.developer}</span>
                  <span className="text-foreground-muted font-data">{agent.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alternatives toggle */}
        <div className="mb-6">
          <h3 className="text-sm uppercase tracking-wider text-foreground-muted mb-3">
            Path
          </h3>
          <div className="flex gap-2">
            {alternatives.map((alt) => (
              <button
                key={alt}
                onClick={() => setSelectedPath(alt)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                  ${selectedPath === alt
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40"
                    : "bg-background-surface text-foreground-muted border border-border hover:text-foreground"
                  }
                `}
              >
                {alt}
              </button>
            ))}
          </div>
        </div>

        {/* Bounded permissions */}
        <div className="mb-8">
          <h3 className="text-sm uppercase tracking-wider text-foreground-muted mb-3">
            Bounded Permissions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-background-surface">
              <div className="text-2xl font-data font-semibold text-foreground">$100</div>
              <div className="text-xs text-foreground-muted mt-1">Max Spend</div>
              <div className="text-xs text-accent-magenta mt-1 font-data">Bounded</div>
            </div>
            <div className="p-4 rounded-lg bg-background-surface">
              <div className="text-2xl font-data font-semibold text-foreground">7d</div>
              <div className="text-xs text-foreground-muted mt-1">Session Expiry</div>
              <div className="text-xs text-accent-cyan mt-1 font-data">Revokes in 7d</div>
            </div>
            <div className="p-4 rounded-lg bg-background-surface">
              <div className="text-2xl font-data font-semibold text-foreground">2</div>
              <div className="text-xs text-foreground-muted mt-1">Allowed Protocols</div>
              <div className="text-xs text-accent-cyan mt-1 font-data">Venus · PancakeSwap</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="
              flex-1 px-4 py-3 rounded-xl
              border border-border text-foreground-muted
              hover:text-foreground hover:border-foreground-muted/40
              transition-all duration-200
            "
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="
              flex-1 px-4 py-3 rounded-xl
              bg-accent-magenta text-white font-medium
              hover:bg-accent-magenta/90
              shadow-[0_0_30px_rgba(255,30,153,0.25)]
              transition-all duration-200
              active:scale-[0.98]
            "
          >
            Approve & Start
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}