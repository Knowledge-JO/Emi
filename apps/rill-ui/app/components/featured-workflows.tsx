"use client";

import { motion } from "motion/react";

interface FeaturedWorkflowsProps {
  onSelect: (workflow: string) => void;
}

const workflows = [
  {
    title: "Token Creation + LP Funding",
    description: "Launch a token and provide initial liquidity in one transaction",
    agents: ["Token Agent", "Swap Agent", "LP Agent"],
    successRate: "98.7%",
  },
  {
    title: "Loan Health Monitor",
    description: "Continuously monitor your Venus position and auto-repay if needed",
    agents: ["Monitor Agent", "Risk Agent", "Repay Agent"],
    successRate: "99.1%",
  },
  {
    title: "Yield Optimizer",
    description: "Find and move to the highest yielding stablecoin pool",
    agents: ["Research Agent", "Swap Agent", "LP Agent"],
    successRate: "97.8%",
  },
];

export function FeaturedWorkflows({ onSelect }: FeaturedWorkflowsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-20"
    >
      <h2 className="text-sm uppercase tracking-wider text-foreground-muted text-center mb-8">
        Featured Workflows
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workflows.map((workflow, i) => (
          <motion.button
            key={workflow.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.1, duration: 0.4 }}
            onClick={() => onSelect(workflow.title)}
            className="
              p-5 rounded-xl border border-border
              bg-background-elevated hover:bg-background-surface
              hover:border-accent-cyan/30
              text-left transition-all duration-200
            "
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <h3 className="font-medium text-foreground mb-2">
              {workflow.title}
            </h3>
            <p className="text-sm text-foreground-muted mb-4">
              {workflow.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {workflow.agents.map((agent) => (
                <span
                  key={agent}
                  className="px-2 py-1 text-xs rounded bg-background-surface text-foreground-muted"
                >
                  {agent}
                </span>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-accent-cyan"></span>
              <span className="text-accent-cyan font-data">{workflow.successRate}</span>
              <span className="text-foreground-muted">success rate</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
