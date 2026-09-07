"use client";

import { motion, AnimatePresence } from "motion/react";

export interface LiveJob {
  id: string;
  title: string;
  status: "monitoring" | "executing";
  healthFactor: string;
  updatedAt: string;
}

interface LiveJobsProps {
  jobs: LiveJob[];
  onRevoke: (id: string) => void;
}

export function LiveJobs({ jobs, onRevoke }: LiveJobsProps) {
  return (
    <motion.section layout className="mt-8">
      <h2 className="text-sm font-semibold text-foreground mb-3">Active Jobs</h2>
      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }}
              className="rounded-2xl border border-border bg-surface p-5"
            >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span>
                </span>
                <span className="text-sm font-medium text-foreground">
                  {job.status === "monitoring" ? "Monitoring..." : "Executing..."}
                </span>
              </div>
              <button
                onClick={() => onRevoke(job.id)}
                className="shrink-0 text-danger border border-danger/40 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-danger/10 active:scale-95 transition-all duration-150"
              >
                Revoke Authority
              </button>
            </div>

            <p className="text-muted text-sm mt-3">{job.title}</p>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-3 text-xs">
              <span className="text-muted">Current Health Factor</span>
              <span className="font-mono text-accent font-medium">{job.healthFactor}</span>
              <span className="text-muted">Standing by</span>
              <span className="ml-auto text-muted">{job.updatedAt}</span>
            </div>
          </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}