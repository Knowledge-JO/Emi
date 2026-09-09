"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

import { FadeIn } from "./fade-in";
import { GlassCard } from "./glass-card";

export function Cta() {
  return (
    <section className="px-4 py-24">
      <FadeIn>
        <GlassCard className="relative mx-auto max-w-4xl overflow-hidden px-6 py-16 text-center md:py-20" hover={false}>
          <div
            aria-hidden
            className="liquid-orb left-1/2 top-[-40%] h-64 w-64 -translate-x-1/2 bg-accent/80"
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-5xl">
              Your intent. Your rules.
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-lg leading-relaxed text-muted">
              Type a goal. Pick an agent if there is a choice. Approve the session. Get on with your
              day.
            </p>
            <div className="mt-9">
              <Link href="/app" className="btn btn-primary">
                Open the chat
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </div>
        </GlassCard>
      </FadeIn>
    </section>
  );
}
