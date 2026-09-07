"use client";

import { motion } from "motion/react";

const metrics = [
  { label: "Active Sessions", value: "1,247", trend: "+12%" },
  { label: "Agent Executions", value: "48,392", trend: "+8%" },
  { label: "Success Rate", value: "99.2%", trend: "+0.3%" },
];

export function MetricTicker() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="flex justify-center gap-12 mt-16"
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="text-center">
          <div className="font-data text-2xl font-semibold text-foreground">
            {metric.value}
          </div>
          <div className="text-sm text-foreground-muted mt-1">
            {metric.label}
          </div>
          <div className="text-xs text-accent-cyan mt-1">
            {metric.trend}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
