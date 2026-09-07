export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10">
      <div className="mx-auto w-full max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-accent">Rill</span>
          <span className="text-xs text-muted">Intent-driven DeFi on BNB Chain</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted">
          <span>Built on Altana, x402 and ERC-8183</span>
          <span>Not financial advice</span>
        </div>
      </div>
    </footer>
  );
}