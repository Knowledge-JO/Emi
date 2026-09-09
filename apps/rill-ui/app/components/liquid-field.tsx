"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

export function LiquidField() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const yGold = useTransform(scrollY, [0, 900], [0, 140]);
  const yMint = useTransform(scrollY, [0, 900], [0, -80]);
  const yViolet = useTransform(scrollY, [0, 1200], [0, 90]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(243,186,47,0.18),transparent_55%),radial-gradient(900px_circle_at_90%_10%,rgba(14,203,129,0.12),transparent_50%),linear-gradient(180deg,#07090c_0%,#0b0e11_40%,#0b0e11_100%)]" />
      <motion.div
        style={reduce ? undefined : { y: yGold }}
        className="liquid-orb -left-40 top-[-18%] h-[28rem] w-[28rem] bg-[#f3ba2f]"
      />
      <motion.div
        style={reduce ? undefined : { y: yMint }}
        className="liquid-orb liquid-orb-slow -right-20 top-[18%] h-[22rem] w-[22rem] bg-[#0ecb81]"
      />
      <motion.div
        style={reduce ? undefined : { y: yViolet }}
        className="liquid-orb left-[30%] top-[58%] h-[26rem] w-[26rem] bg-[#5b6cff]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(11,14,17,0.35)_70%,#0b0e11)]" />
    </div>
  );
}
