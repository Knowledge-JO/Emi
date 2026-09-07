"use client";

import { motion } from "motion/react";

const suggestions = [
  "Protect Venus Loan",
  "Swap BNB for USDT",
  "Provide CAKE Liquidity",
];

interface SuggestionPillsProps {
  onSelect: (value: string) => void;
}

export function SuggestionPills({ onSelect }: SuggestionPillsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-wrap items-center justify-center gap-2 mt-4"
    >
      {suggestions.map((suggestion, i) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.25 }}
          onClick={() => onSelect(suggestion)}
          className="
            px-3.5 py-1.5 rounded-full text-sm
            border border-border text-muted
            hover:text-foreground hover:border-accent/40
            active:scale-95 transition-all duration-150
          "
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}