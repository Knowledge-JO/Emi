"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ActionBar } from "./components/action-bar";
import { PromptPills } from "./components/prompt-pills";
import { MetricTicker } from "./components/metric-ticker";
import { FeaturedWorkflows } from "./components/featured-workflows";
import { CompilationOverlay } from "./components/compilation-overlay";
import { Dashboard } from "./components/dashboard";

interface Session {
  id: string;
  title: string;
  status: "monitoring" | "executing" | "completed";
  healthFactor?: string;
  updatedAt: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  txHash: string;
  timestamp: string;
}

const SESSION_NODES = [
  { label: "Read Oracle", status: "complete" as const },
  { label: "Check Venus Health Factor", status: "complete" as const },
  { label: "Swap via PancakeSwap", status: "active" as const },
  { label: "Repay", status: "pending" as const },
];

const SESSION_AGENTS = [
  { name: "Monitor Agent", successRate: "99.1%", developer: "@venus-guard", fee: "2.5%" },
  { name: "Risk Agent", successRate: "98.4%", developer: "@risk-labs", fee: "1.0%" },
  { name: "Swap Agent", successRate: "97.8%", developer: "@swapmaster", fee: "0.5%" },
];

export default function Home() {
  const [phase, setPhase] = useState<"landing" | "dashboard">("landing");
  const [compiling, setCompiling] = useState(false);
  const [intent, setIntent] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleSubmit = (value: string) => {
    setIntent(value);
    setCompiling(true);
  };

  const handleApprove = () => {
    setCompiling(false);
    setPhase("dashboard");
    const id = Math.random().toString(36).slice(2);
    setSessions((prev) => [
      {
        id,
        title: intent,
        status: "monitoring",
        healthFactor: "1.4",
        updatedAt: "just now",
      },
      ...prev,
    ]);
    setHistory((prev) => [
      {
        id,
        action: `${intent} - Session authorized`,
        txHash: "0x" + Math.random().toString(16).slice(2, 66),
        timestamp: "just now",
      },
      ...prev,
    ]);
  };

  const handleRevoke = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setHistory((prev) => prev.map((h) =>
      h.id === id ? { ...h, action: `${h.action} - Revoked` } : h
    ));
  };

  return (
    <main className="relative flex flex-1 flex-col min-h-[100dvh] overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-accent-cyan/5 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-1/3 w-[400px] h-[300px] rounded-full bg-accent-magenta/5 blur-[100px]"></div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "landing" && (
          <motion.div
            key="landing"
            className="relative z-10 flex flex-col items-center justify-center w-full px-4 py-16"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="text-4xl md:text-6xl font-semibold tracking-tighter text-center mb-4 text-foreground"
            >
              What do you want to get done?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-foreground-muted text-center mb-10 max-w-2xl text-lg"
            >
              Describe an outcome. Rill finds the best agents and executes it securely on BNB Chain.
            </motion.p>

            <ActionBar onSubmit={handleSubmit} />
            <PromptPills onSelect={handleSubmit} />
            <MetricTicker />
            <FeaturedWorkflows onSelect={handleSubmit} />
          </motion.div>
        )}

        {phase === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 w-full px-4 py-16 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setPhase("landing")}
                className="mb-8 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                ← New request
              </button>
              <Dashboard
                sessions={sessions}
                history={history}
                onRevoke={handleRevoke}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compilation overlay floats over whichever phase is current */}
      {compiling && (
        <CompilationOverlay
          intent={intent}
          nodes={SESSION_NODES}
          agents={SESSION_AGENTS}
          onApprove={handleApprove}
          onCancel={() => setCompiling(false)}
        />
      )}
    </main>
  );
}