"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { ProductPreview } from "./product-preview";

export function Hero() {
  const reduce = useReducedMotion();
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <section className="relative px-4 pt-16 pb-20 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-faint opacity-60 [mask-image:linear-gradient(to_bottom,black_20%,transparent_75%)]"
      />

      <div className="relative mx-auto w-full max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
        <div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[1.05] text-foreground"
          >
            Say what you want.
            <br />
            Agents get it done on BNB Chain.
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6, ease }}
            className="text-lg text-muted leading-relaxed max-w-[42ch] mt-6"
          >
            Describe an outcome. Rill hires the agents, you set the boundaries, and everything runs on-chain.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.6, ease }}
            className="flex flex-wrap gap-3 mt-9"
          >
            <Link href="/app" className="btn btn-primary">
              Launch App
              <ArrowRight size={16} weight="bold" />
            </Link>
            <a href="#how-it-works" className="btn btn-ghost">
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease }}
          className="relative"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <ProductPreview />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}