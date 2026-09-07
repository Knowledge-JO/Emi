"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  CaretDown,
  ArrowSquareOut,
  GasPump,
  SealCheck,
  Key,
  ArrowLeft,
} from "@phosphor-icons/react";
import type { MarketPlan, TraceStep, JobReceipt, PermissionScope } from "../lib/marketplace-mock";

export interface LiveJob {
  id: string;
  intent: string;
  plan: MarketPlan;
  steps: TraceStep[];
  progress: number;
  status: "running" | "done";
  monitoring?: boolean;
  healthFactor?: string;
  receipt?: JobReceipt;
  updatedAt: string;
}

interface SessionDashboardProps {
  job: LiveJob;
  onBack: () => void;
  onRevoke: (id: string) => void;
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-deep border border-border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted/70">{label}</div>
      <div className={`font-mono text-base font-semibold mt-1.5 truncate ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function RunningBody({ job }: { job: LiveJob }) {
  const [traceOpen, setTraceOpen] = useState(true);
  const p = job.plan.permission;
  const monitorTiles = job.monitoring
    ? [
        { label: "Health factor", value: job.healthFactor ?? "—", accent: true },
        { label: "Trigger at", value: "1.30" },
        { label: "Last checked", value: "12s ago" },
        { label: "Session expiry", value: p.expiry },
      ]
    : [
        { label: "Quoted total", value: job.plan.cost.quoted, accent: true },
        { label: "Gas estimate", value: job.plan.cost.gas },
        { label: "Agent fee", value: job.plan.cost.agentCommission },
        { label: "Max spend", value: p.maxSpend },
      ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {monitorTiles.map((t) => (
          <Tile key={t.label} label={t.label} value={t.value} accent={t.accent} />
        ))}
      </div>

      <PermissionSummary permission={p} />

      <button
        onClick={() => setTraceOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted hover:text-foreground transition-colors mt-5"
      >
        <CaretDown size={12} className={`transition-transform duration-200 ${traceOpen ? "" : "-rotate-90"}`} />
        Execution trace
      </button>
      <AnimatePresence initial={false}>
        {traceOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 mb-4 space-y-0">
              {job.steps.map((step, i) => {
                const state = i < job.progress ? "done" : i === job.progress ? "active" : "pending";
                return (
                  <StepRow
                    key={`${job.id}-${step.id}`}
                    step={step}
                    state={state}
                    detail={step.detail}
                    last={i === job.steps.length - 1}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PermissionSummary({ permission }: { permission: PermissionScope }) {
  return (
    <motion.div
      layout
      className="rounded-xl border border-border p-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
          <Key size={13} /> Altana session
        </div>
        <span className="text-[11px] font-mono text-accent border border-accent/40 rounded px-1.5 py-0.5">
          0x7f3c…e109
        </span>
      </div>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Max spend</span>
          <span className="font-mono text-foreground font-medium">{permission.maxSpend}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Expiry</span>
          <span className="font-mono text-foreground font-medium">{permission.expiry}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Protocols</span>
          <span className="font-mono text-foreground text-right">{permission.protocols.join(", ")}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Method scope</span>
          <span className="font-mono text-foreground text-right">{permission.scope}</span>
        </div>
      </div>
    </motion.div>
  );
}

function StepRow({
  step,
  state,
  detail,
  last,
}: {
  step: TraceStep;
  state: "done" | "active" | "pending";
  detail: string;
  last?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-start gap-3 px-1.5 py-1"
    >
      <div className="flex flex-col items-center mt-0.5">
        {state === "done" ? (
          <CheckCircle size={14} weight="fill" className="text-success mt-0.5" />
        ) : state === "active" ? (
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-accent mt-[1px]"></span>
          </span>
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-border mt-[2px]"></span>
        )}
        {state !== "done" && !last && <div className="w-px h-[26px] bg-border"></div>}
      </div>
      <div className="min-w-0 pb-2">
        <div
          className={`text-sm font-medium ${
            state === "active" ? "text-accent" : state === "done" ? "text-foreground" : "text-muted"
          }`}
        >
          {step.label}
        </div>
        <div className={`text-xs mt-0.5 font-mono ${state === "done" ? "text-muted" : "text-muted/80"}`}>{detail}</div>
      </div>
    </motion.div>
  );
}

function ReceiptBlock({ receipt, agent }: { receipt: JobReceipt; agent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden"
    >
      <div className="rounded-xl bg-surface-deep border border-success/25 p-4">
        <div className="flex items-center gap-2 mb-3">
          <SealCheck size={15} weight="fill" className="text-success" />
          <span className="text-sm font-semibold text-foreground">Executed · receipt</span>
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted text-xs">Transaction</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-foreground">
                {receipt.txHash.slice(0, 10)}…{receipt.txHash.slice(-6)}
              </span>
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on BscScan"
                className="text-muted hover:text-foreground transition-colors"
              >
                <ArrowSquareOut size={14} />
              </a>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted text-xs">Actual vs quoted</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-success font-medium">{receipt.actualCost}</span>
              <span className="text-xs text-muted">quoted {receipt.quotedCost}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted text-xs flex items-center gap-1.5">
              <GasPump size={12} /> Gas used
            </span>
            <span className="font-mono text-xs text-foreground">{receipt.gas}</span>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3 pt-3 border-t border-border/60">
          {agent} settled via x402 · ERC-8004 reputation crediting +2. Under-quote refund: {receipt.quotedCost} →{" "}
          {receipt.actualCost}.
        </p>
      </div>
    </motion.div>
  );
}

export function SessionDashboard({ job, onBack, onRevoke }: SessionDashboardProps) {
  const selected = job.plan.agents.find((a) => a.selected);
  const agent = selected ? selected.handle : job.plan.agents[0]?.handle ?? "unknown";

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="w-full max-w-[720px] mx-auto rounded-2xl border border-border bg-surface p-6"
    >
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-2.5">
          {job.status === "running" ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
          ) : (
            <CheckCircle size={15} weight="fill" className="text-success" />
          )}
          <h2 className="text-base font-semibold text-foreground">
            {job.status === "running" ? (job.monitoring ? "Guard active" : "Executing") : "Completed"}
          </h2>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} /> Close
        </button>
      </div>

      <p className="text-sm text-muted border-l-2 border-accent/50 pl-3 mt-4 mb-5 py-0.5">{job.intent}</p>

      {job.status === "running" ? (
        <>
          <RunningBody job={job} />
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => onRevoke(job.id)}
              className="
                rounded-xl border border-danger/40 text-danger font-semibold text-sm
                px-4 py-2.5 hover:bg-danger/10 active:scale-[0.98]
                transition-all duration-150 mr-auto
              "
            >
              Revoke Authority
            </button>
            <span className="text-xs text-muted font-mono">{agent} · under x402 guard</span>
          </div>
        </>
      ) : (
        <>
          {job.receipt && <ReceiptBlock receipt={job.receipt} agent={agent} />}
          <button
            onClick={onBack}
            className="btn btn-ghost mt-4"
          >
            <ArrowLeft size={14} /> New Intent
          </button>
        </>
      )}
    </motion.section>
  );
}