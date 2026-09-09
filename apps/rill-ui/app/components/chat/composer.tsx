"use client";

import { ArrowUp } from "@phosphor-icons/react";
import { useRef } from "react";

type ComposerProps = {
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
};

export function Composer({
  value,
  disabled,
  placeholder,
  onChange,
  onSubmit,
}: ComposerProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  function send() {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
  }

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2 focus-within:border-accent/70">
        <textarea
          ref={field}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length < 3}
          aria-label="Send"
          className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-background disabled:opacity-30"
        >
          <ArrowUp size={16} weight="bold" />
        </button>
      </div>
    </form>
  );
}
