"use client";

import Link from "next/link";
import { FadeIn } from "./fade-in";
import { ArrowRight } from "@phosphor-icons/react";

export function Cta() {
  return (
    <section className="px-4 py-24">
      <FadeIn>
        <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 md:py-20 text-center">
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.05] text-foreground">
              Your intent, your rules.
            </h2>
            <p className="text-lg text-muted leading-relaxed max-w-[44ch] mx-auto mt-5">
              Type a goal. Set the boundaries. Watch on-chain. Get on with your day.
            </p>
            <div className="mt-9">
              <Link href="/app" className="btn btn-primary">
                Launch App
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}