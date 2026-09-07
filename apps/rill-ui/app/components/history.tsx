"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CaretRight, ArrowSquareOut } from "@phosphor-icons/react";

export interface HistoryEntry {
  id: string;
  action: string;
  txHash: string;
  timestamp: string;
}

interface HistoryProps {
  entries: HistoryEntry[];
}

export function History({ entries }: HistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between group"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CaretRight
            size={14}
            weight="bold"
            className={`text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
          History
        </span>
        <span className="text-xs text-muted">{entries.length} entries</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{entry.action}</div>
                    <div className="text-xs text-muted mt-0.5 font-mono truncate">
                      {entry.txHash.slice(0, 12)}…{entry.txHash.slice(-6)} · {entry.timestamp}
                    </div>
                  </div>
                  <a
                    href={`https://bscscan.com/tx/${entry.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on BSCScan"
                    className="shrink-0 text-muted hover:text-foreground transition-colors p-1"
                  >
                    <ArrowSquareOut size={16} />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}