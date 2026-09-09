"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Plus,
  SidebarSimple,
  GridFour,
  ChatCircle,
  Wallet,
  Briefcase,
  Lightning,
  User,
  Cube,
  Broadcast,
} from "@phosphor-icons/react";

import { Logo } from "./logo";
import { ApiError } from "@/lib/api";
import { getBalances, getWallet, type WalletBalances } from "@/lib/account";
import type { WalletResponse } from "@/lib/altana";
import {
  CHATS_CHANGED,
  NEW_CHAT,
  WALLET_CHANGED,
  loadChats,
  type StoredChat,
} from "@/lib/chat-store";
import { formatBase, shortAddress } from "@/lib/format";
import { useRillSession } from "@/lib/use-rill-session";

type SidebarProps = {
  open: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
};

const NAV = [
  { href: "/app", label: "Chat", icon: ChatCircle, exact: true },
  { href: "/app/agents", label: "Agents", icon: GridFour },
  { href: "/app/skills", label: "Skills", icon: Cube },
  { href: "/app/jobs", label: "Jobs", icon: Briefcase },
  { href: "/app/payments", label: "Payments", icon: Lightning },
  { href: "/app/publisher", label: "Publish", icon: Broadcast },
  { href: "/app/account", label: "Account", icon: User },
];

export function Sidebar({ open, onToggle, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useRillSession();
  const userId = session.status === "verified" ? session.user.id : null;
  const [chats, setChats] = useState<StoredChat[]>([]);

  useEffect(() => {
    if (window.innerWidth < 768) onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => setChats(loadChats(userId));
    refresh();
    window.addEventListener(CHATS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHATS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);

  const label = open ? "" : " pointer-events-none opacity-0";
  const onChat = pathname === "/app";

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
        aria-hidden
      />
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface
          transition-[transform,width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
          md:static md:inset-auto md:z-auto
          ${open ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"}
        `}
        aria-label="Workspace"
      >
        <div className={`flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 ${open ? "" : "justify-center"}`}>
          {open ? <Logo withText size={20} /> : <Logo withText={false} size={22} />}
          {open ? (
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="ml-auto p-1.5 text-muted hover:text-foreground"
            >
              <SidebarSimple size={18} />
            </button>
          ) : null}
        </div>

        <div className="shrink-0 border-b border-border p-3">
          <button
            onClick={() => {
              window.dispatchEvent(new Event(NEW_CHAT));
              router.push("/app");
              onCloseMobile();
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-background hover:bg-accent/90"
            aria-label="New chat"
          >
            <Plus size={16} weight="bold" />
            {open ? "New chat" : null}
          </button>
        </div>

        <nav className="shrink-0 space-y-1 border-b border-border p-2">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
                  active
                    ? "border border-accent/30 bg-surface-deep"
                    : "border border-transparent hover:bg-surface-deep/60"
                } ${open ? "" : "justify-center"}`}
              >
                <Icon size={16} className="shrink-0 text-muted" />
                <span className={`text-sm text-foreground ${label}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {onChat ? (
            chats.length === 0 ? (
              <p className={`px-2 py-3 text-xs text-muted ${label}`}>No chats yet</p>
            ) : (
              chats.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(`/app?c=${item.id}`);
                    onCloseMobile();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-deep/60 ${open ? "" : "justify-center"}`}
                >
                  <ChatCircle size={16} className="shrink-0 text-muted" />
                  <span className={`min-w-0 flex-1 truncate text-sm text-foreground ${label}`}>
                    {item.title}
                  </span>
                </button>
              ))
            )
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          <WalletPill open={open} />
          <button
            onClick={onToggle}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted hover:text-foreground"
          >
            <SidebarSimple size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}

function WalletPill({ open }: { open: boolean }) {
  const [wallet, setWallet] = useState<WalletResponse | null | "loading">("loading");
  const [balances, setBalances] = useState<WalletBalances | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const row = await getWallet();
        if (cancelled) return;
        setWallet(row);
        try {
          setBalances(await getBalances());
        } catch {
          setBalances(null);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setWallet(null);
        else setWallet(null);
      }
    }
    void load();
    const refresh = () => void load();
    window.addEventListener(WALLET_CHANGED, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(WALLET_CHANGED, refresh);
    };
  }, []);

  const address = wallet && wallet !== "loading" ? wallet.address : null;
  const native = balances ? `${formatBase(balances.native)} BNB` : null;

  return (
    <Link
      href="/app/account"
      title={address ?? "No Altana wallet yet"}
      className={`flex min-h-8 w-full items-center gap-2 rounded-lg border border-border bg-surface-deep ${
        open ? "px-2 py-1.5" : "justify-center px-0"
      }`}
    >
      <Wallet size={14} className={`shrink-0 ${address ? "text-success" : "text-muted"}`} />
      <span className={`min-w-0 ${open ? "" : "hidden"}`}>
        <span className="block truncate font-mono text-xs text-foreground">
          {wallet === "loading" ? "…" : address ? shortAddress(address) : "no wallet"}
        </span>
        {native ? <span className="block truncate font-mono text-[10px] text-muted">{native}</span> : null}
      </span>
    </Link>
  );
}
