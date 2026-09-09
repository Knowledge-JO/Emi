"use client";

import { useState, type FormEvent } from "react";
import { useLoginWithEmail, useLoginWithOAuth } from "@privy-io/react-auth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm() {
  const oauth = useLoginWithOAuth();
  const emailLogin = useLoginWithEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const oauthBusy = oauth.state.status === "loading";
  const sending = emailLogin.state.status === "sending-code";
  const awaitingCode = emailLogin.state.status === "awaiting-code-input";
  const submitting = emailLogin.state.status === "submitting-code";
  const busy = oauthBusy || sending || submitting;

  const oauthError =
    oauth.state.status === "error" ? oauth.state.error?.message : null;
  const emailError =
    emailLogin.state.status === "error" ? emailLogin.state.error?.message : null;

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) return;
    try {
      await emailLogin.sendCode({ email: value });
    } catch {
      // `state.error` is set by the hook.
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length < 4) return;
    try {
      await emailLogin.loginWithCode({ code: code.trim() });
    } catch {
      // `state.error` is set by the hook.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void oauth.initOAuth({ provider: "google" }).catch(() => undefined)}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-sm font-medium text-foreground hover:border-[#3a424c] disabled:opacity-50"
      >
        <GoogleMark />
        Continue with Google
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void oauth.initOAuth({ provider: "apple" }).catch(() => undefined)}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        <AppleMark />
        Continue with Apple
      </button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {awaitingCode ? (
        <form onSubmit={(event) => void verifyCode(event)} className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            Enter the code sent to <span className="text-foreground">{email}</span>
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="h-12 rounded-xl border border-border bg-surface-deep px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || code.trim().length < 4}
            className="btn btn-primary h-12 w-full"
          >
            {submitting ? "Verifying…" : "Verify email"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void emailLogin
                .sendCode({ email: email.trim().toLowerCase() })
                .catch(() => undefined)
            }
            className="text-xs text-muted hover:text-foreground"
          >
            Resend code
          </button>
        </form>
      ) : (
        <form onSubmit={(event) => void sendCode(event)} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-xl border border-border bg-surface-deep px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !EMAIL.test(email.trim())}
            className="btn btn-primary h-12 w-full"
          >
            {sending ? "Sending code…" : "Continue with email"}
          </button>
        </form>
      )}

      {oauthError || emailError ? (
        <p className="text-xs text-danger">{oauthError ?? emailError}</p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden>
      <path d="M13.1 9.4c.02 2.2 1.93 2.93 1.95 2.94-.02.06-.3 1.05-1 2.08-.6.89-1.23 1.77-2.21 1.79-.97.02-1.28-.57-2.39-.57-1.1 0-1.45.55-2.36.59-.95.04-1.67-1-2.28-1.88-1.25-1.81-2.2-5.11-.92-7.34.64-1.11 1.78-1.81 3.02-1.83.94-.02 1.83.63 2.39.63.57 0 1.64-.78 2.76-.67.47.02 1.79.19 2.64 1.43-.07.04-1.58.92-1.56 2.83ZM10.9 3.1c.51-.62.85-1.48.76-2.34-.73.03-1.62.49-2.14 1.1-.47.54-.88 1.41-.77 2.24.82.06 1.65-.42 2.15-1Z" />
    </svg>
  );
}
