"use client";

import { List } from "@phosphor-icons/react";
import { WalletButton } from "./wallet-button";
import type { Network } from "./sidebar";

interface WorkspaceHeaderProps {
  title: string;
  network: Network;
  onNetworkChange: (n: Network) => void;
  onMenuOpen: () => void;
}

export function WorkspaceHeader({ title, network, onNetworkChange, onMenuOpen }: WorkspaceHeaderProps) {
  const netLabel = network === "mainnet" ? "BSC Mainnet" : "BSC Testnet";
  return (
    <header className="flex items-center gap-4 h-14 px-4 md:px-6 border-b border-border bg-surface/40 shrink-0">
      <button
        onClick={onMenuOpen}
        aria-label="Open menu"
        className="md:hidden p-1.5 -ml-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-deep transition-colors active:scale-95"
      >
        <List size={16} />
      </button>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-muted hidden sm:inline font-mono">rill://</span>
        <h1 className="text-sm font-semibold text-foreground tracking-tight truncate">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          onClick={() => onNetworkChange(network === "mainnet" ? "testnet" : "mainnet")}
          className="flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-surface text-xs font-mono text-foreground hover:border-[#3a424c] transition-colors active:scale-[0.97]"
          title="Switch network"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${network === "mainnet" ? "bg-success" : "bg-accent"}`}
            aria-hidden
          />
          {netLabel}
        </button>
        <WalletButton />
      </div>
    </header>
  );
}