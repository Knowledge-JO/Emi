"use client";

import { List } from "@phosphor-icons/react";

import { WalletButton } from "./wallet-button";

type WorkspaceHeaderProps = {
  title: string;
  onMenuOpen: () => void;
};

export function WorkspaceHeader({ title, onMenuOpen }: WorkspaceHeaderProps) {
  const chain = process.env.NEXT_PUBLIC_ALTANA_CHAIN ?? "bnb";
  const netLabel =
    chain === "bnb-testnet"
      ? "BSC Testnet"
      : chain === "ethereum"
        ? "Ethereum"
        : "BSC Mainnet";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface/40 px-4 md:px-6">
      <button
        onClick={onMenuOpen}
        aria-label="Open menu"
        className="-ml-1 rounded-lg p-1.5 text-muted hover:bg-surface-deep hover:text-foreground md:hidden"
      >
        <List size={16} />
      </button>
      <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2.5">
        <span className="hidden h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 font-mono text-xs text-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          {netLabel}
        </span>
        <WalletButton />
      </div>
    </header>
  );
}
