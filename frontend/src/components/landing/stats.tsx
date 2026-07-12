"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const STATS = [
  { value: "9+", label: "pistas independientes por canción" },
  { value: "<10ms", label: "latencia objetivo de sincronización" },
  { value: "100%", label: "control en vivo, sin sorpresas" },
];

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={ref} className="relative overflow-hidden border-b border-white/10 px-6 py-28 md:px-12">
      <motion.div style={{ y }} className="mx-auto grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-mono text-4xl font-semibold text-orange-400 sm:text-5xl">{stat.value}</p>
            <p className="mt-3 text-sm text-white/55">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
