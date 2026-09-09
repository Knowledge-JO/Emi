"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";

import { Logo } from "../components/logo";
import { SignInForm } from "../components/sign-in-form";
import { useWallet } from "../providers";
import { safeNext } from "@/lib/safe-next";
import { useRillSession } from "@/lib/use-rill-session";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <SignInScreen />
    </Suspense>
  );
}

function SignInScreen() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { enabled } = useWallet();

  if (!enabled) {
    return (
      <Shell>
        <p className="text-sm text-muted">
          Set <span className="font-mono text-foreground">NEXT_PUBLIC_PRIVY_APP_ID</span> to
          enable Google, Apple, and email sign-in.
        </p>
      </Shell>
    );
  }

  return <AuthenticatedSignIn next={next} />;
}

function AuthenticatedSignIn({ next }: { next: string }) {
  const router = useRouter();
  const session = useRillSession();

  useEffect(() => {
    if (session.status === "verified") router.replace(next);
  }, [session.status, next, router]);

  if (session.status === "loading" || session.status === "verifying") {
    return (
      <Shell>
        <p className="text-sm text-muted">
          {session.status === "verifying" ? "Creating your Emi account…" : "Loading…"}
        </p>
      </Shell>
    );
  }

  if (session.status === "error") {
    return (
      <Shell>
        <p className="text-sm text-danger">Signed in with Privy, but the API rejected the token.</p>
        <p className="mt-2 font-mono text-xs text-muted">{session.error}</p>
        <button
          type="button"
          onClick={() => void session.signOut()}
          className="btn btn-ghost mt-6 w-full"
        >
          Sign out
        </button>
      </Shell>
    );
  }

  if (session.status === "verified") {
    return (
      <Shell>
        <p className="text-sm text-muted">Redirecting…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Sign in to Emi
      </h1>
      <p className="mt-2 text-sm text-muted">
        Use Google, Apple, or email. On-chain authority still comes from a session you approve
        later — this step only says who you are.
      </p>
      <div className="mt-8">
        <SignInForm />
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        After sign-in you will continue to{" "}
        <span className="font-mono text-foreground">{next}</span>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between border-r border-border bg-surface-deep px-10 py-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-faint opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <Link href="/" className="relative">
          <Logo size={24} />
        </Link>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            Describe an outcome. Agents do the work.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Sign in is identity only. Spending still needs an Altana session you approve in the
            chat.
          </p>
        </div>
        <p className="relative text-xs text-muted">BNB Chain · Altana · x402 · ERC-8183</p>
      </aside>

      <main className="flex flex-col px-6 py-8">
        <div className="mb-10 flex items-center justify-between lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <div className="m-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
