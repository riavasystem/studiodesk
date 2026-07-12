"use client";

import { useEffect, useRef } from "react";
import type { ILyricLine } from "@/hooks/use-lyrics";

interface ILyricsPanelProps {
  lines: ILyricLine[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export function LyricsPanel({ lines, currentTime, onSeek }: ILyricsPanelProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time_seconds <= currentTime) activeIndex = i;
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  if (lines.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/6 bg-black/20 p-6 text-center">
        <p className="text-sm text-white/40">
          Todavía no hay letras/acordes cargados para esta canción.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-2xl border border-white/6 bg-black/20 p-4">
      {lines.map((line, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={line.id}
            ref={active ? activeRef : undefined}
            onClick={() => onSeek(line.time_seconds)}
            className={`flex items-baseline gap-2 rounded-md px-2 py-1 text-left transition-colors ${
              active ? "bg-orange-400/10 text-orange-300" : "text-white/40 hover:text-white/70"
            }`}
          >
            {line.chord && (
              <span className="w-10 shrink-0 font-mono text-xs font-semibold text-sky-400/80">{line.chord}</span>
            )}
            <span className={`text-sm ${active ? "font-medium" : ""}`}>{line.text}</span>
          </button>
        );
      })}
    </div>
  );
}
