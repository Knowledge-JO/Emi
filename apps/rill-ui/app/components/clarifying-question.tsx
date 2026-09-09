"use client";

import { motion } from "motion/react";
import { Question } from "@phosphor-icons/react";
import type { MarketPlan } from "../lib/marketplace-mock";

interface ClarifyingQuestionProps {
  intent: string;
  question: string;
  choices: { id: string; amount: string }[];
  onAnswer: (choice: { id: string; amount: string }) => void;
  onEdit: () => void;
  onBack: () => void;
}

export function ClarifyingQuestion({
  intent,
  question,
  choices,
  onAnswer,
  onEdit,
  onBack,
}: ClarifyingQuestionProps) {
  void onEdit;
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 rounded-2xl border border-border bg-surface p-6"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-accent/15 text-accent p-1.5">
            <Question size={16} weight="fill" />
          </span>
          <h2 className="text-base font-semibold text-foreground leading-tight">Clarifying question</h2>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <span aria-hidden className="text-sm leading-none">✕</span> Cancel
        </button>
      </div>

      <p className="text-sm text-muted mt-3">"{intent}"</p>
      <p className="text-base text-foreground mt-3 font-medium">{question}</p>

      <div className="mt-5 space-y-2.5">
        {choices.map((choice, i) => (
          <motion.button
            key={choice.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.25 }}
            onClick={() => onAnswer(choice)}
            className="
              w-full rounded-xl border border-border bg-surface-deep px-4 py-3
              flex items-center gap-3 group
              hover:border-accent/40 hover:bg-surface
              active:scale-[0.985] transition-all duration-150
            "
          >
            <span
              className="
                h-2 w-2 rounded-full border border-muted shrink-0
                group-hover:border-accent group-hover:bg-accent
                transition-colors duration-150
              "
            />
            <span className="text-sm text-foreground">{choice.amount}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}