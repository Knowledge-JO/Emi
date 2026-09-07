"use client";

import { SignOut, Wallet } from "@phosphor-icons/react";
import { useWallet } from "../providers";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { enabled, ready, authenticated, address, login, logout } = useWallet();

  if (!enabled) {
    return (
      <button
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface border border-border text-sm text-foreground cursor-pointer transition-colors hover:border-[#3a424c]"
        aria-label="Wallet connection not configured"
        title="Set NEXT_PUBLIC_PRIVY_APP_ID to enable wallet connection"
      >
        <Wallet size={15} className="text-muted" />
        <span className="text-xs">Connect Wallet</span>
      </button>
    );
  }

  if (!ready) {
    return (
      <button
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface border border-border text-sm text-muted"
        aria-label="Loading wallet"
      >
        <span className="font-mono text-xs">Loading…</span>
      </button>
    );
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface border border-border text-sm text-foreground transition-colors hover:border-[#3a424c]"
          aria-label={`Wallet ${shortAddr(address)}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
          <span className="font-mono text-xs">{shortAddr(address)}</span>
        </button>
        <button
          aria-label="Disconnect wallet"
          onClick={logout}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted transition-colors hover:text-danger hover:border-danger/40"
        >
          <SignOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-accent text-background text-sm font-semibold transition-all active:scale-[0.97] hover:bg-accent/90"
    >
      <Wallet size={15} weight="bold" />
      <span>Connect</span>
    </button>
  );
}