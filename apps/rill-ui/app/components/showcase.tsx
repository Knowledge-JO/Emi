"use client";

import { motion, useReducedMotion } from "motion/react";
import { FadeIn } from "./fade-in";
import { ArrowUpRight } from "@phosphor-icons/react";

const workflows = [
  {
    name: "Loan Health Monitor",
    route: ["Monitor", "Venus Repay"],
    rate: "99.1%",
  },
  {
    name: "Token Creation + LP Funding",
    route: ["Token Factory", "PancakeSwap"],
    rate: "98.7%",
  },
  {
    name: "Yield Optimizer",
    route: ["Research", "Swap", "LP"],
    rate: "97.8%",
  },
];

export function Showcase() {
  const reduce = useReducedMotion();

  return (
    <section id="workflows" className="px-4 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.05] text-foreground">
            One command. Whole workflows.
          </h2>
          <p className="text-lg text-muted leading-relaxed max-w-[46ch] mt-5">
            Multi-agent combinations composed and executed by the platform - not isolated bots in a storefront.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <FadeIn key={wf.name} delay={0.08}>
              <motion.div
                whileHover={reduce ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="group h-full flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-[#3a424c]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{wf.name}</h3>
                    <ArrowUpRight
                      size={18}
                      className="text-muted transition-all duration-200 group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {wf.route.map((step, i) => (
                      <span key={step} className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-surface-deep border border-border text-xs text-muted">
                          {step}
                        </span>
                        {i < wf.route.length - 1 && <span className="text-muted">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
                  <span className="font-mono text-sm text-accent font-medium">{wf.rate}</span>
                  <span className="text-xs text-muted">verified success rate</span>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </FadeIn>
      </div>
    </section>
  );
}