"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { WorkspaceHeader } from "./workspace-header";
import { useWallet } from "../providers";
import { useRillSession } from "@/lib/use-rill-session";

export function SignedInGate({ children }: { children: ReactNode }) {
  const { enabled } = useWallet();
  if (!enabled) {
    return (
      <div className="flex h-dvh items-center justify-center px-6">
        <p className="max-w-md text-center text-sm text-muted">
          Set <span className="font-mono text-foreground">NEXT_PUBLIC_PRIVY_APP_ID</span> to
          sign in and use the marketplace.
        </p>
      </div>
    );
  }
  return <VerifiedGate>{children}</VerifiedGate>;
}

function VerifiedGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useRillSession();

  useEffect(() => {
    if (session.status === "signed-out") {
      router.replace("/signin?next=/app");
    }
  }, [session.status, router]);

  if (session.status === "loading" || session.status === "verifying") {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted">
        Connecting to Rill…
      </div>
    );
  }

  if (session.status === "signed-out") {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted">
        Redirecting to sign in…
      </div>
    );
  }

  if (session.status === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-danger">Privy signed in, but the API rejected the token.</p>
        <p className="font-mono text-xs text-muted">{session.error}</p>
        <button type="button" onClick={() => void session.signOut()} className="btn btn-ghost">
          Sign out
        </button>
      </div>
    );
  }

  return children;
}

export function WorkspaceFrame({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const [sideOpen, setSideOpen] = useState(true);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <Sidebar open={sideOpen} onToggle={() => setSideOpen((open) => !open)} onCloseMobile={() => setSideOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader title={title} onMenuOpen={() => setSideOpen(true)} />
        {children}
      </div>
    </div>
  );
}

export function WorkspacePage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <WorkspaceFrame title={title}>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-6">{children}</div>
      </div>
    </WorkspaceFrame>
  );
}
