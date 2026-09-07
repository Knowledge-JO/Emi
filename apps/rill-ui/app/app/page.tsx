"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { OmniInput } from "../components/omn-input";
import { SuggestionPills } from "../components/suggestion-pills";
import { PlanCard } from "../components/plan-card";
import { ClarifyingQuestion } from "../components/clarifying-question";
import { Sidebar, type Network, type HistoryEntry } from "../components/sidebar";
import { WorkspaceHeader } from "../components/workspace-header";
import { SessionDashboard, type LiveJob } from "../components/session-dashboard";
import { CapabilityDirectory } from "../components/capability-directory";
import {
  parseSwap,
  planFor,
  traceFor,
  isMonitoringIntent,
  swapQuestionFor,
  swapChoicesFor,
  swapResultFor,
  type MarketPlan,
  type JobReceipt,
} from "../lib/marketplace-mock";

type View = "intake" | "clarify" | "plan" | "session";

function randomTxHash() {
  return "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

const TITLES: Record<View, string> = {
  intake: "Command Center",
  clarify: "Compile Intent",
  plan: "Compile Intent",
  session: "Active Session",
};

export default function AppHome() {
  const [input, setInput] = useState("");
  const [view, setView] = useState<View>("intake");
  const [intent, setIntent] = useState("");
  const [plan, setPlan] = useState<MarketPlan | null>(null);
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [network, setNetwork] = useState<Network>("mainnet");
  const [capsOpen, setCapsOpen] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    return () => timers.current.forEach((t) => clearTimeout(t));
  }, []);

  const submitIntent = (text: string) => {
    setInput(text);
    setIntent(text);
    const swap = parseSwap(text);
    if (swap && !swap.amount) {
      setView("clarify");
    } else {
      setPlan(planFor(text));
      setView("plan");
    }
  };

  const handleClarify = (choice: { id: string; amount: string }) => {
    const swap = parseSwap(intent);
    const amount = choice.amount.split(" · ")[0];
    const to = swap?.to ?? "USDT";
    const full = `Swap ${amount} for ${to}`;
    setIntent(full);
    setPlan(planFor(full, choice.amount));
    setView("plan");
  };

  const finalizeJob = (job: LiveJob) => {
    const txHash = randomTxHash();
    const result = swapResultFor(job.intent);
    const receipt: JobReceipt = {
      txHash,
      actualCost: job.plan.cost.quoted,
      quotedCost: job.plan.cost.quoted,
      gas: job.plan.cost.gas,
      explorerUrl: `https://bscscan.com/tx/${txHash}`,
      result,
    };
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, progress: j.steps.length, status: "done", receipt } : j))
    );
    setHistory((prev) => [
      { id: job.id, action: `${job.intent} - executed`, txHash, timestamp: "just now", tag: "executed" },
      ...prev,
    ]);
    timers.current.delete(job.id);
  };

  const startJobTimers = (job: LiveJob) => {
    let step = 0;
    const tick = () => {
      step += 1;
      if (job.monitoring && step >= job.steps.length - 1) {
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress: job.steps.length - 1 } : j)));
        timers.current.delete(job.id);
        return;
      }
      if (!job.monitoring && step >= job.steps.length) {
        finalizeJob(job);
        return;
      }
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress: step } : j)));
      timers.current.set(job.id, setTimeout(tick, 1350));
    };
    timers.current.set(job.id, setTimeout(tick, 1350));
  };

  const handleApprove = () => {
    if (!plan) return;
    const snapshot = plan;
    const id = Math.random().toString(36).slice(2);
    const job: LiveJob = {
      id,
      intent: snapshot.intent,
      plan: snapshot,
      steps: traceFor(snapshot.intent),
      progress: 0,
      status: "running",
      monitoring: isMonitoringIntent(snapshot.intent),
      healthFactor: isMonitoringIntent(snapshot.intent) ? "1.31" : undefined,
      updatedAt: "just now",
    };
    setJobs((prev) => [job, ...prev]);
    setSelectedId(id);
    setView("session");
    setInput("");
    setSideOpen(false);
    startJobTimers(job);
  };

  const handleRevoke = (id: string) => {
    const target = jobs.find((j) => j.id === id);
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    if (target) {
      setHistory((prev) => [
        {
          id,
          action: `${target.intent} - authority revoked`,
          txHash: randomTxHash(),
          timestamp: "just now",
          tag: "revoked",
        },
        ...prev,
      ]);
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setView("intake");
    }
  };

  const handleBack = () => {
    setView("intake");
    setInput("");
    setIntent("");
    setPlan(null);
  };

  const selectSession = (id: string) => {
    setSelectedId(id);
    setView("session");
    setSideOpen(false);
  };

  const selectedJob = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null;
  const swap = parseSwap(intent);
  const guards = jobs.filter((j) => j.status === "running");
  const done = jobs.filter((j) => j.status === "done");

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar
        open={sideOpen}
        onToggle={() => setSideOpen((o) => !o)}
        guards={guards}
        done={done}
        recents={history}
        selectedId={selectedId}
        network={network}
        onNetworkChange={(n) => {
          setNetwork(n);
          setView("intake");
        }}
        onNewIntent={handleBack}
        onSelectSession={selectSession}
        onOpenCapabilities={() => setCapsOpen(true)}
        onCloseMobile={() => setSideOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <WorkspaceHeader
          title={TITLES[view]}
          network={network}
          onNetworkChange={setNetwork}
          onMenuOpen={() => setSideOpen(true)}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[820px] px-4 md:px-6 pb-24">
            <motion.div
              layout
              className={`flex flex-col ${view === "intake" && jobs.length === 0 ? "pt-10 md:pt-16" : "pt-6 md:pt-8"}`}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <AnimatePresence mode="wait">
                {view === "intake" && (
                  <motion.div key="intake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <OmniInput value={input} onChange={setInput} onSubmit={submitIntent} />
                    <SuggestionPills onSelect={submitIntent} />
                  </motion.div>
                )}

                {view === "clarify" && (
                  <motion.div key="clarify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ClarifyingQuestion
                      intent={intent}
                      question={swapQuestionFor(swap?.from ?? "USDT", swap?.to ?? "BNB")}
                      choices={swapChoicesFor(swap?.from ?? "USDT")}
                      onAnswer={handleClarify}
                      onEdit={() => {}}
                      onBack={handleBack}
                    />
                  </motion.div>
                )}

                {view === "plan" && plan && (
                  <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <PlanCard plan={plan} intent={intent} onApprove={handleApprove} onBack={handleBack} />
                  </motion.div>
                )}

                {view === "session" && selectedJob && (
                  <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SessionDashboard job={selectedJob} onBack={handleBack} onRevoke={handleRevoke} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      <CapabilityDirectory open={capsOpen} onClose={() => setCapsOpen(false)} />
    </div>
  );
}