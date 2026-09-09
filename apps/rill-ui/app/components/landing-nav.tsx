"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { Logo } from "./logo";

export function LandingNav() {
  const reduce = useReducedMotion();

  return (
    <motion.header
      initial={false}
      animate={reduce ? undefined : { y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-40 px-4 pt-4"
    >
      <div className="glass mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-full px-3 pl-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-[11px] text-muted">BNB Chain</span>
          </span>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#protocols" className="hover:text-foreground">
            Rails
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            Flow
          </a>
          <a href="#workflows" className="hover:text-foreground">
            Workflows
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/signin?next=/app"
            className="hidden h-9 items-center px-3 text-sm text-muted hover:text-foreground sm:flex"
          >
            Sign in
          </Link>
          <Link href="/app" className="btn btn-primary h-9 px-4">
            Launch App
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
