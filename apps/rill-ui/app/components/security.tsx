"use client";

import { motion, useReducedMotion } from "motion/react";
import { FadeIn } from "./fade-in";
import { Check, WarningOctagon } from "@phosphor-icons/react";

const guarantees = [
  { label: "Hard spend limits", detail: "Capped USD value, set before signing" },
  { label: "Protocol allowlist", detail: "Venus, PancakeSwap - no arbitrary contracts" },
  { label: "Session expiry", detail: "Auto-revokes on-chain, no action needed" },
  { label: "One-click revoke", detail: "Kill the session instantly, any time" },
];

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const } },
};

export function Security() {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 py-24 border-t border-border">
      <div className="mx-auto w-full max-w-5xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.05] text-foreground">
            Bounded by default.
          </h2>
          <p className="text-lg text-muted leading-relaxed max-w-[46ch] mt-5">
            The safety layer is the product. Before anything runs, you review a plain-language authorization receipt with hard, visible boundaries.
          </p>
          <ul className="mt-8 space-y-4">
            {guarantees.map((g) => (
              <li key={g.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check size={12} weight="bold" />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{g.label}</div>
                  <div className="text-sm text-muted mt-0.5">{g.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl bg-surface-deep border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-foreground">Session Policy</span>
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-2.5 py-1 text-[11px] text-accent font-medium">
                <WarningOctagon size={12} weight="fill" />
                You approve this
              </span>
            </div>
            <motion.ul
              initial={reduce ? false : "hidden"}
              whileInView={reduce ? undefined : "show"}
              viewport={{ once: true, amount: 0.2 }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              className="space-y-2.5"
            >
              {[
                { label: "Max Budget", value: "$100", valueClass: "" },
                { label: "Allowed Protocols", value: "Venus, PancakeSwap", valueClass: "" },
                { label: "Expiry", value: "24h", valueClass: "" },
                { label: "Status", value: "Not signed", valueClass: "text-success" },
              ].map((row) => (
                <motion.li
                  key={row.label}
                  variants={rowVariants}
                  className="flex items-center justify-between rounded-lg bg-background/40 border border-border px-4 py-3"
                >
                  <span className="text-sm text-muted">{row.label}</span>
                  <span className={`font-mono text-sm text-foreground font-medium ${row.valueClass}`}>
                    {row.value}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
            <div className="mt-5 rounded-xl bg-accent text-background h-11 flex items-center justify-center text-sm font-semibold">
              Sign Bounded Session
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
              <span className="font-mono text-danger">Revoke authority</span>
              <span className="text-muted">any time, on-chain</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}