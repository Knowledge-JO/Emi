"use client";

import { motion, useReducedMotion } from "motion/react";
import { FadeIn } from "./fade-in";
import { ShieldCheck } from "@phosphor-icons/react";

const steps = [
  {
    n: "01",
    title: "Describe",
    body: "Type an outcome in plain language. No dashboards, no menus, no setup.",
    visual: (
      <div className="rounded-lg bg-surface-deep border border-border px-3 py-2.5 text-xs text-muted">
        Protect my Venus loan if health factor drops
        <span className="ml-1 inline-block h-3 w-0.5 bg-accent align-middle animate-pulse"></span>
      </div>
    ),
  },
  {
    n: "02",
    title: "Bound",
    body: "Review the compiled route and the hard limits. Nothing runs until you sign.",
    visual: (
      <div className="rounded-lg bg-surface-deep border border-border p-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">Budget</span>
          <span className="font-mono text-foreground font-medium">$100</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">Protocols</span>
          <span className="font-mono text-foreground font-medium">Venus, PancakeSwap</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">Expiry</span>
          <span className="font-mono text-foreground font-medium">24h</span>
        </div>
      </div>
    ),
  },
  {
    n: "03",
    title: "Watch",
    body: "Follow live telemetry and revoke authority in one click, any time, on-chain.",
    visual: (
      <div className="flex items-center gap-2 rounded-lg bg-surface-deep border border-border px-3 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
        </span>
        <span className="text-[11px] text-foreground font-medium">Monitoring...</span>
        <span className="ml-auto font-mono text-[11px] text-accent">1.35</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="how-it-works" className="px-4 py-24 border-t border-border">
      <div className="mx-auto w-full max-w-5xl">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.05] text-foreground">
            From intent to execution in three steps.
          </h2>
          <p className="text-lg text-muted leading-relaxed max-w-[48ch] mt-5">
            You stay anchored in your request the whole way. The platform handles everything in between.
          </p>
        </FadeIn>

        <div className="relative mt-14">
          <div aria-hidden="true" className="hidden lg:block absolute top-8 left-[15%] right-[15%] h-px bg-border/70">
            <motion.div
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={reduce ? undefined : { scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{ transformOrigin: "left" }}
              className="h-full bg-accent/80"
            />
          </div>
          <div className="grid lg:grid-cols-3 gap-4 relative">
            {steps.map((step, i) => (
              <FadeIn key={step.n} delay={0.08 * i}>
                <div className="h-full rounded-2xl border border-border bg-surface p-6">
                  <span className="font-mono text-sm text-accent">{step.n}</span>
                  <h3 className="text-lg font-semibold text-foreground mt-3">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed mt-2 mb-5">{step.body}</p>
                  {step.visual}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.2} className="mt-10 flex items-center justify-center">
          <span className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck size={16} className="text-success" weight="fill" />
            Funds stay in your wallet. Sessions are revocable and expire on-chain.
          </span>
        </FadeIn>
      </div>
    </section>
  );
}