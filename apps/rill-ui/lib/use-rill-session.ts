"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";

import { apiFetch, type RillUser, type SessionResponse } from "./api";

export type RillSession =
  | { status: "loading"; user: null; error: null }
  | { status: "signed-out"; user: null; error: null }
  | { status: "verifying"; user: null; error: null }
  | { status: "verified"; user: RillUser; error: null }
  | { status: "error"; user: null; error: string };

/** The outcome of one handshake, tagged with the Privy user it belongs to. */
type Handshake = {
  did: string;
  user?: RillUser;
  error?: string;
};

/**
 * Bridges a Privy login to an Emi account.
 *
 * Being logged in with Privy is not the same as being known to Emi: the backend has to verify
 * the token itself before it will act for this user. That handshake happens here, once per login,
 * and its result — not Privy's client-side state — is what the app should trust.
 */
export function useRillSession(): RillSession & {
  signOut: () => Promise<void>;
} {
  const { ready, authenticated, user: privyUser, logout } = usePrivy();
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const did = privyUser?.id ?? null;

  useEffect(() => {
    if (!ready || !authenticated || !did) return;

    let cancelled = false;

    apiFetch<SessionResponse>("/auth/session", { method: "POST" })
      .then((response) => {
        if (!cancelled) setHandshake({ did, user: response.user });
      })
      .catch((error: Error) => {
        if (!cancelled) setHandshake({ did, error: error.message });
      });

    return () => {
      cancelled = true;
    };
    // Re-runs when a different Privy user logs in, not on every render of the same one.
  }, [ready, authenticated, did]);

  const signOut = useCallback(async () => {
    // Tell the backend first: it needs a still-valid token to record the sign-out.
    try {
      await apiFetch<void>("/auth/session", { method: "DELETE" });
    } catch {
      // A failed audit record must not trap the user in a signed-in state.
    }
    await logout();
  }, [logout]);

  // Derived rather than stored, so a stale result from a previous login can never be shown as
  // the current one.
  const current = handshake?.did === did ? handshake : null;

  return { ...describe(ready, authenticated, current), signOut };
}

function describe(
  ready: boolean,
  authenticated: boolean,
  handshake: Handshake | null,
): RillSession {
  if (!ready) return { status: "loading", user: null, error: null };
  if (!authenticated) return { status: "signed-out", user: null, error: null };
  if (!handshake) return { status: "verifying", user: null, error: null };

  return handshake.user
    ? { status: "verified", user: handshake.user, error: null }
    : {
        status: "error",
        user: null,
        error: handshake.error ?? "Verification failed",
      };
}
