"use client";

import { usePrivy } from "@privy-io/react-auth";

import { IntentComposer } from "@/components/intent-composer";
import { useRillSession } from "@/lib/use-rill-session";

export function SignInPanel() {
  const { login } = usePrivy();
  const session = useRillSession();

  if (session.status === "loading") {
    return <Card>Loading…</Card>;
  }

  if (session.status === "signed-out") {
    return (
      <Card>
        <p className="text-zinc-600 dark:text-zinc-400">
          Sign in to describe an outcome and let the marketplace resolve it.
        </p>
        <button
          type="button"
          onClick={() => login()}
          className="mt-6 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
        >
          Sign in
        </button>
      </Card>
    );
  }

  if (session.status === "verifying") {
    return <Card>Verifying with Rill…</Card>;
  }

  if (session.status === "error") {
    return (
      <Card>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Signed in with Privy, but the backend rejected the token.
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
          {session.error}
        </p>
        <button
          type="button"
          onClick={() => void session.signOut()}
          className="mt-6 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </Card>
    );
  }

  const { user } = session;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in and verified by the Rill API.
        </p>
        <dl className="mt-6 grid gap-2 text-sm">
          <Row label="Account" value={user.id} />
          <Row label="Privy DID" value={user.privyUserId ?? "—"} />
          <Row label="Email" value={user.email ?? "not linked"} />
          <Row label="Status" value={user.status} />
        </dl>
        <button
          type="button"
          onClick={() => void session.signOut()}
          className="mt-6 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </Card>
      <IntentComposer />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="truncate font-mono text-xs text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}
