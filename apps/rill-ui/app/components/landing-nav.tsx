import Link from "next/link";
import { Logo } from "./logo";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent" fill="currentColor" aria-hidden="true">
              <path d="M12 2 6.4 7.6 12 13.2l5.6-5.6L12 2zM2 12l5.6 5.6L12 12 6.4 6.4 2 12zm10 0 5.6 5.6L22 12l-5.6-5.6L12 12zm-4.4 4.4L12 22l4.4-5.6L12 12l-4.4 4.4z" />
            </svg>
            <span className="text-xs text-muted">BNB Chain</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          <a href="#protocols" className="hover:text-foreground transition-colors">Protocols</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#workflows" className="hover:text-foreground transition-colors">Workflows</a>
        </nav>

        <Link href="/app" className="btn btn-primary h-9 px-4 rounded-full">
          Launch App
        </Link>
      </div>
    </header>
  );
}