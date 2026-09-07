"use client";

import { useEffect } from "react";
import { X, Cube } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { CAPABILITIES } from "../lib/marketplace-mock";

interface CapabilityDirectoryProps {
  open: boolean;
  onClose: () => void;
}

export function CapabilityDirectory({ open, onClose }: CapabilityDirectoryProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Capabilities and agents"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] md:w-[680px] max-w-full max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Cube size={16} className="text-accent" /> Capabilities and Agents
                </h2>
                <p className="text-xs text-muted mt-1">BSC production agents verified on-chain · ERC-8004 reputation</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close capabilities"
                className="p-1.5 -mr-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-deep transition-colors active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CAPABILITIES.map((proto, i) => (
                <motion.div
                  key={proto.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.04 * i }}
                  className="rounded-xl border border-border p-3.5 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{proto.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted">{proto.category}</span>
                  </div>
                  <div className="space-y-1">
                    {proto.agents.map((a) => (
                      <a
                        key={a.handle}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-deep transition-colors"
                      >
                        <span className="font-mono text-xs text-foreground">{a.handle}</span>
                        <span className="flex items-center gap-2 text-[11px] text-muted font-mono">
                          <span className="text-accent">{a.reputation.toFixed(1)}</span>
                          <span>{a.jobs.toLocaleString()} jobs</span>
                        </span>
                      </a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}