"use client";

import { FadeIn } from "./fade-in";
import { GlassCard } from "./glass-card";

const workflows = [
  {
    name: "Loan health",
    route: ["Monitor", "Venus repay"],
    rate: "99.1%",
  },
  {
    name: "Token + LP",
    route: ["Factory", "PancakeSwap"],
    rate: "98.7%",
  },
  {
    name: "Yield path",
    route: ["Research", "Swap", "LP"],
    rate: "97.8%",
  },
];

export function Showcase() {
  return (
    <section id="workflows" className="px-4 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-5xl">
            One command. Whole workflows.
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
            Multi-agent combinations composed by the marketplace — not isolated bots.
          </p>
        </FadeIn>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {workflows.map((workflow, i) => (
            <FadeIn key={workflow.name} delay={0.08 * i}>
              <GlassCard className="flex h-full flex-col justify-between p-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{workflow.name}</h3>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {workflow.route.map((step, index) => (
                      <span key={step} className="flex items-center gap-2">
                        <span className="glass-thin rounded-full px-2.5 py-1 text-xs text-muted">
                          {step}
                        </span>
                        {index < workflow.route.length - 1 ? (
                          <span className="text-muted">→</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
                  <span className="font-mono text-sm font-medium text-accent">{workflow.rate}</span>
                  <span className="text-xs text-muted">verified success rate</span>
                </div>
              </GlassCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
