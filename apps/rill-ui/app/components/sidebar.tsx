"use client";

import { useEffect } from "react";
import { Plus, SidebarSimple, GridFour, GearSix, Clock, ShieldCheck } from "@phosphor-icons/react";
import { Logo } from "./logo";
import { useWallet } from "../providers";
import { shortLabelFor } from "../lib/marketplace-mock";
import type { LiveJob } from "./session-dashboard";

export type Network = "mainnet" | "testnet";

export interface HistoryEntry {
  id: string;
  action: string;
  txHash: string;
  timestamp: string;
  tag?: "executed" | "revoked";
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  guards: LiveJob[];
  done: LiveJob[];
  recents: HistoryEntry[];
  selectedId: string | null;
  network: Network;
  onNetworkChange: (n: Network) => void;
  onNewIntent: () => void;
  onSelectSession: (id: string) => void;
  onOpenCapabilities: () => void;
  onCloseMobile: () => void;
}

function pulsingDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

export function Sidebar({
  open,
  onToggle,
  guards,
  done,
  recents,
  selectedId,
  network,
  onNetworkChange,
  onNewIntent,
  onSelectSession,
  onOpenCapabilities,
  onCloseMobile,
}: SidebarProps) {
  useEffect(() => {
    if (window.innerWidth < 768) onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = open ? "" : " pointer-events-none opacity-0";
  const group = "px-3 uppercase tracking-wider text-[10px] font-semibold text-muted/70";

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 md:hidden transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
        aria-hidden
      />
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-surface border-r border-border
          transition-[transform,width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
          md:static md:inset-auto md:z-auto
          ${open ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"}
        `}
        aria-label="Command center"
      >
        {/* Header: logo + collapse */}
        <div className={`flex items-center gap-2 h-14 px-3 border-b border-border shrink-0 ${open ? "" : "justify-center"}`}>
          {open ? <Logo withText size={20} /> : <Logo withText={false} size={22} />}
          {open && (
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="ml-auto text-muted hover:text-foreground p-1.5 -mr-1 transition-colors active:scale-95"
            >
              <SidebarSimple size={18} />
            </button>
          )}
        </div>

        {/* New intent CTA */}
        <div className="p-3 border-b border-border shrink-0">
          <button
            onClick={onNewIntent}
            className={`
              w-full rounded-xl bg-accent text-background font-semibold
              flex items-center gap-2 transition-all duration-150 hover:bg-accent/90 active:scale-[0.97]
              ${open ? "justify-center h-10 text-sm px-2" : "justify-center h-10"}
            `}
            aria-label="New intent"
          >
            <Plus size={16} weight="bold" />
            {open && "New Intent"}
          </button>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5">
          {/* Active guards */}
          <div>
            <div className={`${group} ${label} mb-2 flex items-center gap-1.5`}>
              <ShieldCheck size={13} className="text-success" /> Active Guards
            </div>
            <div className="space-y-0.5">
              {guards.length === 0 && (
                <p className={`text-xs text-muted/60 px-3 ${label}`}>No running guards</p>
              )}
              {guards.map((g) => (
                <button
                  key={`${g.id}-${g.status}`}
                  onClick={() => onSelectSession(g.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                    transition-colors duration-100
                    ${selectedId === g.id ? "bg-surface-deep border border-accent/30" : "border border-transparent hover:bg-surface-deep/60"}
                    ${open ? "" : "justify-center px-0"}
                  `}
                >
                  {pulsingDot()}
                  <span className={`min-w-0 flex-1 ${label}`}>
                    <span className="block text-sm text-foreground truncate leading-tight">
                      {shortLabelFor(g.intent)}
                    </span>
                    <span className="block text-[11px] text-muted truncate mt-0.5">
                      {g.monitoring ? `HF ${g.healthFactor ?? "1.35"} · guard armed` : `tx in flight · ${g.updatedAt}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent intents */}
          <div>
            <div className={`${group} ${label} mb-2 flex items-center gap-1.5`}>
              <Clock size={13} /> Recent Intents
            </div>
            <div className="space-y-0.5">
              {done.slice(0, 3).map((g) => (
                <button
                  key={g.id}
                  onClick={() => onSelectSession(g.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                    transition-colors duration-100
                    ${selectedId === g.id ? "bg-surface-deep border border-accent/30" : "border border-transparent hover:bg-surface-deep/60"}
                    ${open ? "" : "justify-center px-0"}
                  `}
                >
                  <span className="h-2 w-2 rounded-full bg-border shrink-0" />
                  <span className={`min-w-0 flex-1 ${label}`}>
                    <span className="block text-sm text-foreground truncate leading-tight">
                      {shortLabelFor(g.intent)}
                    </span>
                    <span className="block text-[11px] text-muted truncate mt-0.5">receipt · {g.updatedAt}</span>
                  </span>
                </button>
              ))}
              {recents.slice(0, 4).map((r) => (
                <div
                  key={`${r.id}-${r.tag}`}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg ${open ? "" : "justify-center px-0"}`}
                >
                  <span className="h-2 w-2 rounded-full bg-border shrink-0" />
                  <span className={`min-w-0 flex-1 ${label}`}>
                    <span className="block text-sm text-foreground truncate leading-tight">
                      {r.action.replace(" - ", " · ")}
                    </span>
                    <span className="block text-[11px] text-muted truncate mt-0.5">
                      {r.timestamp}
                      {r.tag ? ` · ${r.tag}` : ""}
                    </span>
                  </span>
                </div>
              ))}
              {done.length === 0 && recents.length === 0 && (
                <p className={`text-xs text-muted/60 px-3 ${label}`}>Nothing executed yet</p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <div className={`${group} ${label} mb-2 flex items-center gap-1.5`}>
              <GridFour size={13} /> Discover
            </div>
            <button
              onClick={onOpenCapabilities}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                border border-transparent transition-colors duration-100
                hover:bg-surface-deep/60 ${open ? "" : "justify-center px-0"}
              `}
            >
              <GridFour size={16} className="text-muted shrink-0" />
              <span className={`block text-sm text-foreground truncate ${label}`}>
                Capabilities & Agents
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2 shrink-0">
          <WalletPill open={open} />
          <div className={open ? "flex items-center gap-2" : "flex flex-col items-stretch gap-2"}>
            <select
              value={network}
              onChange={(e) => onNetworkChange(e.target.value as Network)}
              aria-label="Network"
              className="
                flex-1 min-w-0 h-8 rounded-lg bg-surface-deep border border-border
                text-xs font-mono text-foreground px-2 focus:outline-none focus:border-accent
                appearance-none cursor-pointer
              "
            >
              <option value="mainnet">BSC Mainnet</option>
              <option value="testnet">BSC Testnet</option>
            </select>
            <button
              onClick={onToggle}
              aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
              className="shrink-0 p-2 rounded-lg text-muted hover:text-foreground transition-colors active:scale-95 flex items-center justify-center"
            >
              <SidebarSimple size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function WalletPill({ open }: { open: boolean }) {
  const { address, ready } = useWallet();
  const display = ready && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "not connected";
  return (
    <button
      onClick={() => {
        if (address) navigator.clipboard?.writeText(address);
      }}
      title={address ?? "Connect wallet"}
      className={`
        w-full flex items-center gap-2 rounded-lg bg-surface-deep border border-border
        h-8 transition-colors hover:border-[#3a424c] active:scale-[0.98]
        ${open ? "px-2" : "justify-center px-0"}
      `}
    >
      <span
        className={`h-2 w-2 rounded-full shrink-0 ${ready && address ? "bg-success" : "bg-border"}`}
        aria-hidden
      />
      <span className={`font-mono text-xs text-foreground truncate ${open ? "" : "hidden"}`}>{display}</span>
    </button>
  );
}