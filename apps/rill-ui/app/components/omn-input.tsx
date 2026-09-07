"use client";

import { useState } from "react";

interface OmniInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function OmniInput({ value, onChange, onSubmit }: OmniInputProps) {
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`
          relative rounded-2xl bg-surface border transition-all duration-200
          ${focused
            ? "border-accent shadow-[0_0_0_1px_rgba(243,186,47,0.4)]"
            : "border-border hover:border-[#3a424c]"
          }
        `}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What do you want to get done on BNB Chain?"
          className="
            w-full bg-transparent px-5 py-4 text-base md:text-lg
            text-foreground placeholder:text-muted
            focus:outline-none
          "
        />
        {value.trim() && (
          <button
            type="submit"
            aria-label="Compile intent"
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              h-9 w-9 rounded-xl bg-accent text-background
              font-semibold text-sm flex items-center justify-center
              hover:bg-accent/90 active:scale-95
              transition-all duration-150
            "
          >
            ↵
          </button>
        )}
      </div>
    </form>
  );
}