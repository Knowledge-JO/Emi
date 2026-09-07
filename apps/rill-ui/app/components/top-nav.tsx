"use client";

import { GearSix } from "@phosphor-icons/react";
import { Logo } from "./logo";
import { WalletButton } from "./wallet-button";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[800px] flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center">
            <Logo />
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent" fill="currentColor" aria-hidden="true">
              <path d="M12 2 6.4 7.6 12 13.2l5.6-5.6L12 2zM2 12l5.6 5.6L12 12 6.4 6.4 2 12zm10 0 5.6 5.6L22 12l-5.6-5.6L12 12zm-4.4 4.4L12 22l4.4-5.6L12 12l-4.4 4.4z" />
            </svg>
            <span className="text-xs text-muted">BNB Chain</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <WalletButton />
          <button
            aria-label="Settings"
            className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-[#3a424c] transition-colors"
          >
            <GearSix size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}