"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";

import { ProductPreview } from "./product-preview";

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative px-4 pb-20 pt-12 md:pt-16 lg:flex lg:min-h-[calc(100svh-4.5rem)] lg:items-center lg:pb-24">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <p className="glass-thin mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
            Intent marketplace
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-[4.25rem]">
            Say the outcome.
            <span className="mt-1 block text-accent">Agents settle it.</span>
          </h1>

          <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted">
            Describe what should happen on BNB Chain. Rill matches agents, you approve a scoped
            session, and settlement stays on-chain.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/app" className="btn btn-primary">
              Open the chat
              <ArrowRight size={16} weight="bold" />
            </Link>
            <a href="#how-it-works" className="btn btn-ghost">
              See the flow
            </a>
          </div>
        </div>

        <motion.div
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={reduce ? undefined : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  );
}
