"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckCircle,
  CircleNotch,
  ArrowLeft,
  UsersThree,
  Key,
  Coins,
  GasPump,
  Receipt,
  SealCheck,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import type { MarketPlan } from "../lib/marketplace-mock";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const } },
};

interface PlanCardProps {
  plan: MarketPlan;
  intent: string;
  onApprove: () => void;
  onBack: () => void;
}

export function PlanCard({ plan, intent, onApprove, onBack }: PlanCardProps) {
  const [signing, setSigning] = useState(false);
  const reduce = useReducedMotion();
  const [traceOpen, setTraceOpen] = useState(true);

  const handleApprove = () => {
    if (signing) return;
    setSigning(true);
    setTimeout(onApprove, 900);
  };

  const selected = plan.agents.find((a) => a.selected)!;
  const alternates = plan.agents.filter((a) => !a.selected);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 rounded-2xl border border-border bg-surface overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-accent/15 text-accent p-1.5">
            <SealCheck size={16} weight="fill" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">Plan · ready to approve</h2>
            <p className="text-xs mt-0.5 text-muted">
              {plan.agents.length} agents matched · {plan.actions.length} actions · quote {plan.cost.quoted}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </button>
      </div>

      {/* Intent echo */}
      <div className="px-6 pb-2">
        <p className="text-sm text-muted border-l-2 border-accent/50 pl-3 py-0.5">{intent}</p>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Agents hired */}
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted mb-3">
            <UsersThree size={13} /> Agents hired
          </div>
          <motion.div
            variants={stagger}
            initial={reduce ? false : "hidden"}
            animate={reduce ? undefined : "show"}
            className="space-y-2.5"
          >
            {/* Selected agent */}
            <motion.div
              variants={item}
              className="rounded-xl border border-accent/40 bg-surface-deep p-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-accent">
                      <CheckCircle size={14} weight="fill" />
                      <span className="text-xs font-medium">Selected</span>
                    </span>
                    <span className="font-mono text-sm text-foreground font-medium truncate">{selected.handle}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {selected.role} · {selected.protocol} · {selected.fee}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-accent text-sm font-semibold">{selected.reputation}%</div>
                  <div className="text-[11px] text-muted mt-0.5">ERC-8004 rep</div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${selected.reputation}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted">{selected.jobsCompleted.toLocaleString()} jobs done</span>
              </div>
              <p className="text-xs text-muted mt-2.5">{selected.why}</p>
            </motion.div>

            {/* Alternates: agent economy visible */}
            {alternates.length > 0 && (
              <motion.div variants={item} className="rounded-xl border border-border bg-surface-deep/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-mono text-sm text-muted">
                    <span className="text-xs bg-border/60 px-1.5 py-0.5 rounded font-sans font-medium">Passed</span>
                    {alternates[0].handle}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-muted">
                    <span className="font-mono">{alternates[0].reputation}% rep</span>
                    <span className="font-mono">{alternates[0].jobsCompleted.toLocaleString()} jobs</span>
                  </div>
                </div>
                <p className="text-xs text-muted mt-1.5">{alternates[0].why}</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Execution plan */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider text-muted">Execution plan</div>
            <button
              onClick={() => setTraceOpen((o) => !o)}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {traceOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          <div className="space-y-0">
            {plan.actions.map((action, i) => (
              <div key={action.id} className="flex items-start gap-3 px-1.5 py-1">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-4 h-4 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-accent font-semibold">{i + 1}</span>
                  </div>
                  {i < plan.actions.length - 1 && <div className="w-px h-5 bg-border"></div>}
                </div>
                <div className="pb-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground font-medium">{action.label}</span>
                    <span className="text-[11px] font-mono text-muted border border-border rounded px-1.5 py-0.5">
                      {action.agent}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">{action.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="rounded-xl bg-surface-deep border border-border p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted mb-3">
            <Coins size={13} /> Settlement quote
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <GasPump size={12} /> Gas
              </span>
              <span className="font-mono text-xs text-foreground">{plan.cost.gas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Receipt size={12} /> x402 / ERC-8183 settlement
              </span>
              <span className="font-mono text-xs text-foreground">{plan.cost.x402Fee}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <SealCheck size={12} /> Agent commission
              </span>
              <span className="font-mono text-xs text-foreground">{plan.cost.agentCommission}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-baseline justify-between">
            <span className="text-xs text-muted">Quoted total</span>
            <span className="font-mono text-lg font-semibold text-accent">{plan.cost.quoted}</span>
          </div>
          <p className="text-[11px] text-muted mt-2">
            Final settles at execution via x402, under-quote gets refunded to your session wallet.
          </p>
        </div>

        {/* Permission scope - Altana session key */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
              <Key size={13} /> Altana session key
            </div>
            <span className="text-[11px] font-mono text-accent border border-accent/40 rounded px-1.5 py-0.5">
              session 0x7f3c…e109
            </span>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Max spend</span>
              <span className="font-mono text-foreground font-medium">{plan.permission.maxSpend}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Expiry</span>
              <span className="font-mono text-foreground font-medium">{plan.permission.expiry}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Allowed protocols</span>
              <span className="font-mono text-foreground text-right">{plan.permission.protocols.join(", ")}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Method scope</span>
              <span className="font-mono text-foreground text-right">{plan.permission.scope}</span>
            </div>
          </div>
          <button className="mt-3 text-xs flex items-center gap-1 text-muted hover:text-foreground transition-colors">
            <ArrowSquareOut size={12} /> View full capability policy
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleApprove}
            disabled={signing}
            className="
              flex-1 rounded-xl bg-accent text-background font-semibold text-base
              py-3.5 flex items-center justify-center gap-2
              hover:bg-accent/90 active:scale-[0.985] disabled:opacity-80
              transition-all duration-200
            "
          >
            {signing ? (
              <>
                <CircleNotch size={18} className="animate-spin" />
                Approving...
              </>
            ) : (
              `Approve Plan · ${plan.cost.quoted}`
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
}