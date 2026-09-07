"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle, CircleNotch, ArrowLeft } from "@phosphor-icons/react";

const ROUTE = ["Oracle Check", "PancakeSwap Route", "Venus Repay"];

const routeVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const } },
};

interface CompiledWorkflowProps {
  intent: string;
  onSign: () => void;
  onBack: () => void;
}

export function CompiledWorkflow({ intent, onSign, onBack }: CompiledWorkflowProps) {
  const [signing, setSigning] = useState(false);
  const reduce = useReducedMotion();

  const handleSign = () => {
    if (signing) return;
    setSigning(true);
    setTimeout(onSign, 900);
  };

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 rounded-2xl border border-border bg-surface p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} weight="fill" className="text-success" />
          <h2 className="text-base font-semibold text-foreground">Compiled Workflow</h2>
          <span className="text-xs text-muted">Verified</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </button>
      </div>

      <p className="text-muted text-sm mt-2 mb-5">{intent}</p>

      <div className="mb-5">
        <div className="text-xs uppercase tracking-wider text-muted mb-3">Execution Route</div>
        <motion.div
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          className="space-y-0"
        >
          {ROUTE.map((step, i) => (
            <motion.div key={step} variants={routeVariants} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                {i < ROUTE.length - 1 && <div className="w-px h-5 bg-border"></div>}
              </div>
              <span className="text-sm text-foreground py-0.5">{step}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="mb-6 rounded-xl bg-surface-deep border border-border p-4">
        <div className="text-xs uppercase tracking-wider text-muted mb-3">Session Policy</div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Max Budget</span>
            <span className="font-mono text-sm text-foreground font-medium">$100</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Allowed Protocols</span>
            <span className="font-mono text-sm text-foreground font-medium">Venus, PancakeSwap</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Expiry</span>
            <span className="font-mono text-sm text-foreground font-medium">24 Hours</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSign}
        disabled={signing}
        className="
          w-full rounded-xl bg-accent text-background font-semibold text-base
          py-3.5 flex items-center justify-center gap-2
          hover:bg-accent/90 active:scale-[0.98] disabled:opacity-80
          transition-all duration-200
        "
      >
        {signing ? (
          <>
            <CircleNotch size={18} className="animate-spin" />
            Signing...
          </>
        ) : (
          "Sign Bounded Session"
        )}
      </button>
    </motion.section>
  );
}