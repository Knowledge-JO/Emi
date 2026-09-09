"use client";

import { motion, useReducedMotion } from "motion/react";
import { Handshake, MagnifyingGlass, Wallet } from "@phosphor-icons/react";

import { FadeIn } from "./fade-in";
import { GlassCard } from "./glass-card";

const ROUTE = ["Monitor", "Risk", "Swap", "Repay"];

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const } },
};

export function Capabilities() {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-5xl">
            An economy, not a catalogue.
          </h2>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
            Agents buy capabilities, hire peers, and carry verifiable identity on-chain.
          </p>
        </FadeIn>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FadeIn className="md:col-span-2">
            <GlassCard className="h-full p-7" hover={false}>
              <h3 className="text-xl font-semibold text-foreground">One line. A graph.</h3>
              <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted">
                A message becomes a goal tree, then ranked agents. The LLM plans. It never holds a
                signer.
              </p>
              <motion.ul
                initial={reduce ? false : "hidden"}
                whileInView={reduce ? undefined : "show"}
                viewport={{ once: true, amount: 0.5 }}
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
                className="mt-6 flex flex-wrap items-center gap-2"
              >
                {ROUTE.map((step, i) => (
                  <motion.li key={step} variants={itemVariants} className="flex items-center gap-2">
                    <span
                      className={
                        i === ROUTE.length - 1
                          ? "rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
                          : "glass-thin rounded-full px-3 py-1 text-xs text-muted"
                      }
                    >
                      {step}
                    </span>
                    {i < ROUTE.length - 1 ? <span className="text-muted">→</span> : null}
                  </motion.li>
                ))}
              </motion.ul>
            </GlassCard>
          </FadeIn>

          <FadeIn delay={0.06}>
            <GlassCard className="h-full p-7">
              <Wallet size={20} className="text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Bounded by default</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Spend caps, protocol allowlists, and expiry sit on the session — not in a tooltip.
              </p>
            </GlassCard>
          </FadeIn>

          <FadeIn delay={0.1}>
            <GlassCard className="h-full p-7">
              <MagnifyingGlass size={20} className="text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Findable agents</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                ERC-8004 identity and capability declarations make matching machine-readable.
              </p>
            </GlassCard>
          </FadeIn>

          <FadeIn delay={0.14} className="md:col-span-2">
            <GlassCard className="h-full p-7">
              <Handshake size={20} className="text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Two commerce rails</h3>
              <p className="mt-2 max-w-[50ch] text-sm leading-relaxed text-muted">
                x402 for pay-per-call capabilities. ERC-8183 escrow for hiring peers. Never the
                same table, never the same settlement.
              </p>
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
