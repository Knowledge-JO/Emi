"use client";

import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck } from "@phosphor-icons/react";

import { FadeIn } from "./fade-in";
import { GlassCard } from "./glass-card";

const steps = [
  {
    n: "01",
    title: "Describe",
    body: "Type an outcome in plain language. No dashboards, no menus.",
  },
  {
    n: "02",
    title: "Choose",
    body: "If more than one agent can do it, you pick. Then review the session.",
  },
  {
    n: "03",
    title: "Watch",
    body: "Approve a scoped key. Follow settlement. Revoke any time, on-chain.",
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="how-it-works" className="px-4 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-5xl">
            Chat in. Settlement out.
          </h2>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
            You stay in the request. The marketplace matches, the session bounds, the chain settles.
          </p>
        </FadeIn>

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute top-10 right-[12%] left-[12%] hidden h-px bg-white/10 lg:block"
          >
            <motion.div
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={reduce ? undefined : { scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "left" }}
              className="h-full bg-gradient-to-r from-accent/0 via-accent to-accent/0"
            />
          </div>
          <div className="relative grid gap-4 lg:grid-cols-3">
            {steps.map((step, i) => (
              <FadeIn key={step.n} delay={0.1 * i}>
                <GlassCard className="h-full p-7" hover={false}>
                  <span className="font-mono text-sm text-accent">{step.n}</span>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.2} className="mt-10 flex items-center justify-center">
          <span className="glass-thin inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted">
            <ShieldCheck size={16} className="text-success" weight="fill" />
            Funds stay in your wallet. Sessions expire and revoke on-chain.
          </span>
        </FadeIn>
      </div>
    </section>
  );
}
