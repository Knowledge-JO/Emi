"use client";

import { FadeIn } from "./fade-in";
import { GlassCard } from "./glass-card";

const rails = [
  {
    n: "01",
    name: "Altana",
    question: "What may an agent do?",
    role: "Authority — smart accounts, session keys, spend caps, expiry, revocation. All on-chain.",
  },
  {
    n: "02",
    name: "x402 / B402",
    question: "How does an agent pay?",
    role: "Micro-payment rail — pay per capability over HTTP. Fast machine-to-machine quotes.",
  },
  {
    n: "03",
    name: "ERC-8183",
    question: "How does an agent hire?",
    role: "Job escrow — hire another agent for a job with a deliverable and settlement.",
  },
];

export function Protocols() {
  return (
    <section id="protocols" className="px-4 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-5xl">
            Three rails. One economy.
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
            Agents buy capabilities, hire peers, and act only inside the authority you grant.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {rails.map((rail, i) => (
            <FadeIn key={rail.n} delay={0.08 * i} y={18}>
              <GlassCard className="h-full p-6">
                <p className="font-mono text-xs text-accent">{rail.n}</p>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{rail.name}</h3>
                <p className="mt-2 text-sm font-medium text-foreground">{rail.question}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{rail.role}</p>
              </GlassCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
