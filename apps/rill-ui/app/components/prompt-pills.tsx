"use client";

import { motion } from "motion/react";

interface PromptPillsProps {
  onSelect: (prompt: string) => void;
}

const suggestions = [
  "Protect my Venus loan",
  "Swap 5 BNB for USDT",
  "Monitor health factor below 1.2",
  "LP position on PancakeSwap",
];

export function PromptPills({ onSelect }: PromptPillsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-wrap justify-center gap-3 mt-6"
    >
      {suggestions.map((suggestion, i) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
          onClick={() => onSelect(suggestion)}
          className="
            px-4 py-2 rounded-full text-sm
            border border-border hover:border-accent-cyan/40
            bg-background-surface hover:bg-background-elevated
            text-foreground-muted hover:text-foreground
            transition-all duration-200
          "
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}
