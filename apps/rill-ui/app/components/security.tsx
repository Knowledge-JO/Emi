"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, WarningOctagon } from "@phosphor-icons/react";

import { FadeIn } from "./fade-in";
import { GlassCard } from "./glass-card";

const guarantees = [
  { label: "Hard spend limits", detail: "Capped value, set before you sign" },
  { label: "Protocol allowlist", detail: "Only the contracts on the plan" },
  { label: "Session expiry", detail: "Auto-revokes on-chain" },
  { label: "One-click revoke", detail: "Kill the session instantly" },
];

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const } },
};

export function Security() {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 py-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <FadeIn>
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-5xl">
            The receipt is the product.
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
            Before anything runs, you review a plain-language authorization with hard, visible
            boundaries.
          </p>
          <ul className="mt-8 space-y-4">
            {guarantees.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check size={12} weight="bold" />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="mt-0.5 text-sm text-muted">{item.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.1}>
          <GlassCard className="p-6" hover={false}>
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Session policy</span>
              <span className="flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
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
                { label: "Max budget", value: "$100" },
                { label: "Allowed protocols", value: "Venus, PancakeSwap" },
                { label: "Expiry", value: "24h" },
                { label: "Status", value: "Not signed" },
              ].map((row) => (
                <motion.li
                  key={row.label}
                  variants={rowVariants}
                  className="glass-thin flex items-center justify-between rounded-2xl px-4 py-3"
                >
                  <span className="text-sm text-muted">{row.label}</span>
                  <span className="font-mono text-sm font-medium text-foreground">{row.value}</span>
                </motion.li>
              ))}
            </motion.ul>
            <div className="mt-5 flex h-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-background">
              Approve session
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    </section>
  );
}
