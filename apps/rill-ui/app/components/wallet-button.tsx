"use client";

import Link from "next/link";
import { SignOut } from "@phosphor-icons/react";

import { useWallet } from "../providers";
import { useRillSession } from "@/lib/use-rill-session";

export function WalletButton() {
  const { enabled, ready } = useWallet();
  const session = useRillSession();

  if (!enabled) {
    return (
      <Link
        href="/signin"
        className="flex h-9 items-center rounded-full border border-border bg-surface px-3.5 text-xs text-foreground"
      >
        Sign in
      </Link>
    );
  }

  if (!ready || session.status === "loading" || session.status === "verifying") {
    return (
      <button className="flex h-9 items-center rounded-full border border-border bg-surface px-3.5">
        <span className="font-mono text-xs text-muted">Loading…</span>
      </button>
    );
  }

  if (session.status === "verified") {
    return (
      <button
        aria-label="Sign out"
        onClick={() => void session.signOut()}
        className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs text-muted hover:border-danger/40 hover:text-danger"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Sign out
        <SignOut size={14} />
      </button>
    );
  }

  return (
    <Link href="/signin?next=/app" className="btn btn-primary h-9 px-4">
      Sign in
    </Link>
  );
}
