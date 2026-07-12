"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-end justify-center gap-2 pb-24 opacity-40">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="w-2 rounded-full bg-orange-500/60 animate-pulse"
          style={{
            height: `${20 + ((i * 37) % 60)}%`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  ),
});

export default function HeroSceneLoader() {
  return (
    <div className="absolute inset-0">
      <HeroScene />
    </div>
  );
}
