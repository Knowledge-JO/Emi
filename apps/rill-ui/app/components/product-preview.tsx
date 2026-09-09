"use client";

import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";

const ROUTE = ["Oracle Check", "PancakeSwap Route", "Venus Repay"];

export function ProductPreview() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2 border-b border-border px-4 h-11">
        <span className="h-2.5 w-2.5 rounded-full bg-border"></span>
        <span className="h-2.5 w-2.5 rounded-full bg-border"></span>
        <span className="h-2.5 w-2.5 rounded-full bg-border"></span>
        <span className="ml-3 font-mono text-[11px] text-muted">rill.app - command center</span>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 rounded-xl bg-surface-deep border border-border px-4 py-3.5">
          <span className="text-sm text-muted">Protect my Venus loan if health factor drops below 1.2</span>
          <span className="ml-1 inline-block h-3.5 w-0.5 bg-accent animate-pulse"></span>
        </div>

        <div className="rounded-xl border border-border bg-background/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={15} weight="fill" className="text-success" />
            <span className="text-xs font-medium text-foreground">Compiled Workflow</span>
            <span className="text-[11px] text-muted">Verified</span>
          </div>
          <div className="space-y-0">
            {ROUTE.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5">
                <div className="flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  {i < ROUTE.length - 1 && <div className="w-px h-4 bg-border"></div>}
                </div>
                <span className="text-xs text-foreground py-0.5">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface-deep border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={15} weight="fill" className="text-accent" />
            <span className="text-xs font-medium text-foreground">Session Policy</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-mono text-sm text-foreground font-medium">$100</div>
              <div className="text-[10px] text-muted mt-0.5">Max budget</div>
            </div>
            <div>
              <div className="font-mono text-sm text-foreground font-medium">24h</div>
              <div className="text-[10px] text-muted mt-0.5">Expiry</div>
            </div>
            <div>
              <div className="font-mono text-sm text-foreground font-medium">2</div>
              <div className="text-[10px] text-muted mt-0.5">Protocols</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-accent text-background h-10 flex items-center justify-center text-sm font-semibold">
          Sign Bounded Session
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/40 px-4 py-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
          </span>
          <span className="text-xs font-medium text-foreground">Monitoring...</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs">
            <span className="text-muted">Health factor</span>
            <span className="font-mono text-accent font-medium">1.35</span>
          </span>
        </div>
      </div>
    </div>
  );
}