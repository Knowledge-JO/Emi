"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { WorkspacePage } from "../../components/workspace-shell";
import { ApiError } from "@/lib/api";
import {
  getBalances,
  getMe,
  getWallet,
  type WalletBalances,
} from "@/lib/account";
import { ensurePasskeyWallet, type WalletResponse } from "@/lib/altana";
import { notifyWalletChanged } from "@/lib/chat-store";
import { errorText, formatBase, shortAddress } from "@/lib/format";
import type { RillUser } from "@/lib/api";

export default function AccountPage() {
  const [user, setUser] = useState<RillUser | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError(null);
    try {
      setUser(await getMe());
    } catch (err) {
      setError(errorText(err));
    }
    try {
      const row = await getWallet();
      setWallet(row);
      setBalances(await getBalances());
    } catch (err) {
      setWallet(null);
      setBalances(null);
      if (!(err instanceof ApiError) || err.status !== 404) {
        setError(errorText(err));
      }
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createWallet() {
    setBusy(true);
    setError(null);
    try {
      const row = await ensurePasskeyWallet();
      setWallet(row);
      notifyWalletChanged();
      try {
        setBalances(await getBalances());
      } catch {
        setBalances(null);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspacePage title="Account">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Account</h2>
      <p className="text-sm text-muted">
        Identity is Privy. Authority is the Altana passkey wallet. This page reads{" "}
        <span className="font-mono">GET /users/me</span> and{" "}
        <span className="font-mono">GET /wallets/me</span>.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {user ? (
        <section className="rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Profile</p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="User id" value={user.id} mono />
            <Row label="Email" value={user.email ?? "—"} />
            <Row label="Name" value={user.displayName ?? "—"} />
            <Row label="Status" value={user.status} />
          </dl>
        </section>
      ) : (
        <p className="text-sm text-muted">Loading profile…</p>
      )}

      <section className="rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Altana wallet</p>
        {wallet ? (
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Address" value={wallet.address} mono />
            <Row label="Signer" value={wallet.signerKind} />
            <Row label="Admin key" value={wallet.adminKeyRegistered ? "registered" : "pending"} />
          </dl>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted">No passkey wallet on this account yet.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createWallet()}
              className="btn btn-primary mt-3 h-10 px-4"
            >
              {busy ? "Creating…" : "Create passkey wallet"}
            </button>
          </div>
        )}
      </section>

      {balances ? (
        <section className="rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Balances</p>
          <p className="mt-3 font-mono text-sm text-foreground">
            {formatBase(balances.native)} BNB
          </p>
          <ul className="mt-3 space-y-1 font-mono text-xs text-muted">
            {balances.tokens.map((token) => (
              <li key={token.address}>
                {token.ok
                  ? `${token.display ?? token.raw ?? "0"} ${token.symbol ?? shortAddress(token.address)}`
                  : `${shortAddress(token.address)} · unread`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        Chat history is restored from saved intent and plan ids on this device.{" "}
        <Link href="/app" className="text-accent hover:underline">
          Back to chat
        </Link>
      </p>
    </WorkspacePage>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
