import { apiFetch, type RillUser } from "@/lib/api";
import type { WalletResponse } from "@/lib/altana";

export type WalletBalances = {
  address: string;
  chainId: number;
  native: string;
  tokens: Array<{
    address: string;
    ok: boolean;
    raw?: string;
    display?: string;
    symbol?: string;
  }>;
};

export type SessionView = {
  id: string;
  walletId: string;
  publicKey: string;
  status: "active" | "revoked" | "expired" | "pending" | "failed";
  expiry: number;
  grantedToAgentId: string | null;
};

export function getMe() {
  return apiFetch<RillUser>("/users/me");
}

export function getWallet() {
  return apiFetch<WalletResponse>("/wallets/me");
}

export function getBalances() {
  return apiFetch<WalletBalances>("/wallets/me/balances");
}

export function getSession(id: string) {
  return apiFetch<SessionView>(`/wallets/sessions/${id}`);
}

export function recordSessionRevoke(id: string, revokeTxHash?: string) {
  return apiFetch<SessionView>(`/wallets/sessions/${id}/revoke`, {
    method: "POST",
    body: JSON.stringify({ revokeTxHash }),
  });
}
