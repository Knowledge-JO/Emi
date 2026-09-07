"use client";

import { motion, AnimatePresence } from "motion/react";

interface ActiveSession {
  id: string;
  title: string;
  status: "monitoring" | "executing" | "completed";
  healthFactor?: string;
  updatedAt: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  txHash: string;
  timestamp: string;
}

interface DashboardProps {
  sessions: ActiveSession[];
  history: HistoryEntry[];
  onRevoke: (id: string) => void;
}

export function Dashboard({ sessions, history, onRevoke }: DashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-foreground">Active Sessions</h2>
        <div className="px-3 py-1 rounded-full bg-background-surface border border-border">
          <span className="text-sm text-foreground-muted">BNB Chain</span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 bg-background-elevated rounded-2xl border border-border">
          <p className="text-foreground-muted">No active sessions</p>
        </div>
      ) : (
        <div className="space-y-4 mb-12">
          <AnimatePresence>
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="
                  p-5 rounded-xl bg-background-elevated
                  border border-border hover:border-accent-cyan/20
                  transition-all duration-200
                "
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`
                      relative w-3 h-3 rounded-full
                      ${session.status === "monitoring" && "bg-accent-cyan"}
                      ${session.status === "executing" && "bg-accent-magenta"}
                      ${session.status === "completed" && "bg-emerald-500"}
                    `}>
                      {session.status === "monitoring" && (
                        <span className="absolute inset-0 rounded-full bg-accent-cyan animate-ping"></span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{session.title}</h3>
                      <div className="text-xs text-foreground-muted mt-0.5">
                        Updated {session.updatedAt}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRevoke(session.id)}
                    className="
                      px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-accent-magenta/10 text-accent-magenta
                      border border-accent-magenta/30
                      hover:bg-accent-magenta/20
                      active:scale-[0.98]
                      transition-all duration-200
                    "
                  >
                    Kill Session
                  </button>
                </div>

                {session.healthFactor && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-foreground-muted">Current Health Factor</div>
                    <div className="font-data text-sm text-accent-cyan font-semibold">
                      {session.healthFactor}
                    </div>
                    <div className="text-xs text-foreground-muted">Standing by</div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <h3 className="text-xl font-semibold text-foreground mb-6">History</h3>
          <div className="bg-background-elevated rounded-xl border border-border divide-y divide-border">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{entry.action}</div>
                  <div className="text-xs text-foreground-muted mt-0.5">
                    {entry.timestamp}
                  </div>
                </div>
                <a
                  href={`https://bscscan.com/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    shrink-0 font-data text-xs text-accent-cyan
                    hover:text-accent-cyan/80 underline underline-offset-2
                    transition-colors
                  "
                >
                  View on BSCScan ↗
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}