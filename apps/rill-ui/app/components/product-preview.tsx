import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";

const ROUTE = ["Oracle Check", "PancakeSwap Route", "Venus Repay"];

export function ProductPreview() {
  return (
    <div className="glass relative overflow-hidden rounded-[28px]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
      <div className="flex h-11 items-center gap-2 border-b border-white/10 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
        <span className="ml-3 font-mono text-[11px] text-muted">emi.app · chat</span>
      </div>

      <div className="space-y-3 p-5">
        <div className="ml-auto max-w-[90%] rounded-2xl bg-accent/15 px-4 py-3 text-sm text-foreground">
          Protect my Venus loan if health factor drops below 1.2
        </div>

        <div className="glass-thin rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle size={15} weight="fill" className="text-success" />
            <span className="text-xs font-medium text-foreground">Loan Guardian · composing</span>
          </div>
          <div className="space-y-0">
            {ROUTE.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5">
                <div className="flex flex-col items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {i < ROUTE.length - 1 ? <div className="h-4 w-px bg-white/15" /> : null}
                </div>
                <span className="py-0.5 text-xs text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-thin rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={15} weight="fill" className="text-accent" />
            <span className="text-xs font-medium text-foreground">Session policy</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-mono text-sm font-medium text-foreground">$100</div>
              <div className="mt-0.5 text-[10px] text-muted">Max budget</div>
            </div>
            <div>
              <div className="font-mono text-sm font-medium text-foreground">24h</div>
              <div className="mt-0.5 text-[10px] text-muted">Expiry</div>
            </div>
            <div>
              <div className="font-mono text-sm font-medium text-foreground">2</div>
              <div className="mt-0.5 text-[10px] text-muted">Protocols</div>
            </div>
          </div>
        </div>

        <div className="flex h-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-background">
          Approve session
        </div>
      </div>
    </div>
  );
}
