"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { type MouseEvent, type ReactNode, useRef } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function GlassCard({ children, className = "", hover = true }: GlassCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, rgba(255,255,255,0.16), transparent 42%)`;

  function onMove(event: MouseEvent<HTMLDivElement>) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    x.set(event.clientX - box.left);
    y.set(event.clientY - box.top);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={reduce ? undefined : onMove}
      whileHover={
        reduce || !hover
          ? undefined
          : { y: -6, transition: { type: "spring", stiffness: 320, damping: 22 } }
      }
      className={`glass group relative overflow-hidden rounded-3xl ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
      {reduce ? null : (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: sheen }}
        />
      )}
      {children}
    </motion.div>
  );
}
