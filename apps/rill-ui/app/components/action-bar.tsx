"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface ActionBarProps {
  onSubmit: (intent: string) => void;
}

export function ActionBar({ onSubmit }: ActionBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className={`
          relative rounded-2xl border transition-all duration-300
          ${isFocused 
            ? "border-accent-cyan/50 shadow-[0_0_30px_rgba(0,240,255,0.15)]" 
            : "border-border hover:border-border-active"
          }
          bg-background-elevated
        `}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="What do you want to get done?"
          className="
            w-full bg-transparent px-6 py-5 text-lg
            text-foreground placeholder:text-foreground-muted
            focus:outline-none font-sans
          "
        />
        
        <motion.button
          type="submit"
          disabled={!value.trim()}
          className={`
            absolute right-3 top-1/2 -translate-y-1/2
            px-4 py-2 rounded-xl font-medium text-sm
            transition-all duration-200
            ${value.trim()
              ? "bg-accent-magenta text-white hover:bg-accent-magenta/90"
              : "bg-background-surface text-foreground-muted cursor-not-allowed"
            }
          `}
          whileHover={value.trim() ? { scale: 1.02 } : {}}
          whileTap={value.trim() ? { scale: 0.98 } : {}}
        >
          Execute
        </motion.button>
      </div>
    </motion.form>
  );
}
