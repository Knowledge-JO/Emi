"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TopNav } from "../components/top-nav";
import { OmniInput } from "../components/omn-input";
import { SuggestionPills } from "../components/suggestion-pills";
import { CompiledWorkflow } from "../components/compiled-workflow";
import { LiveJobs, type LiveJob } from "../components/live-jobs";
import { History, type HistoryEntry } from "../components/history";

type Phase = "idle" | "compiled";

function randomTxHash() {
  return "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export default function AppHome() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [intent, setIntent] = useState("");
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const submitIntent = (text: string) => {
    setInput(text);
    setIntent(text);
    setPhase("compiled");
  };

  const handleSign = () => {
    const id = Math.random().toString(36).slice(2);
    setJobs((prev) => [
      {
        id,
        title: intent,
        status: "monitoring",
        healthFactor: "1.35",
        updatedAt: "just now",
      },
      ...prev,
    ]);
    setHistory((prev) => [
      {
        id,
        action: `${intent} - bounded session authorized`,
        txHash: randomTxHash(),
        timestamp: "just now",
      },
      ...prev,
    ]);
    setPhase("idle");
    setInput("");
  };

  const handleRevoke = (id: string) => {
    const target = jobs.find((j) => j.id === id);
    if (target) {
      setHistory((prev) => [
        {
          id,
          action: `${target.title} - authority revoked`,
          txHash: randomTxHash(),
          timestamp: "just now",
        },
        ...prev,
      ]);
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleBack = () => {
    setPhase("idle");
  };

  return (
    <main className="flex flex-1 flex-col">
      <TopNav />

      <div className="mx-auto w-full max-w-[800px] px-4 pb-24">
        <motion.div
          layout
          className={`flex flex-col ${phase === "idle" && jobs.length === 0 ? "pt-14 md:pt-20" : "pt-8"}`}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          <OmniInput value={input} onChange={setInput} onSubmit={submitIntent} />

          <AnimatePresence>
            {phase === "idle" && jobs.length === 0 && (
              <SuggestionPills onSelect={submitIntent} />
            )}
            {phase === "compiled" && (
              <CompiledWorkflow intent={intent} onSign={handleSign} onBack={handleBack} />
            )}
          </AnimatePresence>
        </motion.div>

        {jobs.length > 0 && (
          <LiveJobs jobs={jobs} onRevoke={handleRevoke} />
        )}

        {history.length > 0 && (
          <History entries={history} />
        )}
      </div>
    </main>
  );
}