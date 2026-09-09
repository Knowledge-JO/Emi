import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-4 pb-10">
      <div className="glass-thin mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 rounded-3xl px-5 py-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-accent">
            Rill
          </Link>
          <span className="text-xs text-muted">Intent-driven DeFi on BNB Chain</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted">
          <span>Altana · x402 · ERC-8183</span>
          <span>Not financial advice</span>
        </div>
      </div>
    </footer>
  );
}
