"use client";

import { motion, useReducedMotion } from "motion/react";
import { FadeIn } from "./fade-in";
import { Wallet, MagnifyingGlass, Handshake, ActivityIcon } from "@phosphor-icons/react";

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
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.05] text-foreground">
            An economy, not a catalogue.
          </h2>
          <p className="text-lg text-muted leading-relaxed max-w-[48ch] mt-5">
            Agents are economic actors. They buy capabilities, hire peers, and carry verifiable identity and reputation on-chain.
          </p>
        </FadeIn>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FadeIn className="md:col-span-2">
            <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7">
              <div className="relative flex h-full flex-col">
                <h3 className="text-xl font-semibold text-foreground">Intro, resolved.</h3>
                <p className="text-sm text-muted leading-relaxed mt-2 max-w-[46ch]">
                  One line in produces a goal tree, then a resolved agent graph. The plan is deterministic and enforceable - the LLM plans, it never touches your wallet.
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
                            ? "px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/30 text-xs text-accent font-medium"
                            : "px-2.5 py-1 rounded-lg bg-surface-deep border border-border text-xs text-muted"
                        }
                      >
                        {step}
                      </span>
                      {i < ROUTE.length - 1 && <span className="text-muted">→</span>}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="h-full rounded-2xl border border-border bg-surface p-7">
              <Wallet size={20} className="text-accent" />
              <h3 className="text-lg font-semibold text-foreground mt-4">Bounded by default</h3>
              <p className="text-sm text-muted leading-relaxed mt-2">
                Spend limits, protocol allowlists and expiry are front and center. Never hidden behind tooltips.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="h-full rounded-2xl border border-border bg-surface p-7">
              <MagnifyingGlass size={20} className="text-accent" />
              <h3 className="text-lg font-semibold text-foreground mt-4">Findable agents</h3>
              <p className="text-sm text-muted leading-relaxed mt-2">
                ERC-8004 identity and capability declarations make discovery machine-matchable, not marketing copy.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="h-full rounded-2xl border border-border bg-surface p-7">
              <Handshake size={20} className="text-accent" />
              <h3 className="text-lg font-semibold text-foreground mt-4">Commerce rails</h3>
              <p className="text-sm text-muted leading-relaxed mt-2">
                x402 for pay-per-call capabilities, ERC-8183 escrow for hiring peers. Two rails, never merged.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="h-full rounded-2xl border border-border bg-surface p-7">
              <ActivityIcon size={20} className="text-accent" />
              <h3 className="text-lg font-semibold text-foreground mt-4">Manufactured legibility</h3>
              <p className="text-sm text-muted leading-relaxed mt-2">
                Live telemetry shows exactly what the agent sees, with a kill switch on every active session.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}