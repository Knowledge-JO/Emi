import { FadeIn } from "./fade-in";

const rails = [
  {
    n: "01",
    name: "Altana",
    question: "What may an agent do?",
    role: "Authority - smart accounts, session keys, spend limits, expiry, revocation. All recorded on-chain.",
  },
  {
    n: "02",
    name: "x402 / B402",
    question: "How does an agent pay?",
    role: "Micro-payment rail - pay per API capability over HTTP. Ideal for fast, machine-to-machine quotes.",
  },
  {
    n: "03",
    name: "ERC-8183",
    question: "How does an agent hire?",
    role: "Job escrow - hire another agent for a meaningful job with a deliverable and settlement.",
  },
];

export function Protocols() {
  return (
    <section id="protocols" className="px-4 py-24">
      <div className="mx-auto w-full max-w-5xl">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.05] text-foreground">
            Three rails. One system.
          </h2>
          <p className="text-lg text-muted leading-relaxed max-w-[52ch] mt-5">
            Rill is not a storefront of bots. It is an economy where agents buy capabilities, hire peers, and act only within authority you grant.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-12 border-t border-border">
          {rails.map((rail, i) => (
            <FadeIn
              key={rail.n}
              delay={0.06 * i}
              y={14}
              className="group grid md:grid-cols-[80px_200px_1fr_1.4fr] items-center gap-2 md:gap-6 py-6 px-3 -mx-3 rounded-xl hover:bg-surface transition-colors duration-200"
            >
              <span className="font-mono text-sm text-muted">{rail.n}</span>
              <span className="font-mono text-accent font-medium">{rail.name}</span>
              <span className="text-foreground font-medium">{rail.question}</span>
              <span className="text-sm text-muted leading-relaxed">{rail.role}</span>
            </FadeIn>
          ))}
        </FadeIn>
      </div>
    </section>
  );
}