"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface IFaderProps {
  value: number;
  min: number;
  max: number;
  accent: string;
  onChange: (value: number) => void;
}

const TICKS = [0, 0.25, 0.5, 0.75, 1];

export function Fader({ value, min, max, accent, onChange }: IFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);

  const valueFromPointer = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const ratio = 1 - Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
      return min + ratio * (max - min);
    },
    [min, max, value],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => onChange(valueFromPointer(e.clientY));
    const handleUp = () => setDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, onChange, valueFromPointer]);

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className="relative flex h-full w-7 shrink-0 cursor-pointer touch-none items-center justify-center rounded-sm bg-black/25"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        onChange(valueFromPointer(e.clientY));
      }}
      onKeyDown={(e) => {
        const step = (max - min) / 100;
        if (e.key === "ArrowUp") onChange(Math.min(max, value + step));
        if (e.key === "ArrowDown") onChange(Math.max(min, value - step));
      }}
    >
      {/* Groove / slot */}
      <div className="pointer-events-none absolute inset-y-1.5 w-1 rounded-full bg-black/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]" />

      {/* Tick marks */}
      {TICKS.map((t) => (
        <div
          key={t}
          className="pointer-events-none absolute left-1/2 h-px w-3 -translate-x-1/2 bg-white/12"
          style={{ bottom: `${t * 94 + 3}%` }}
        />
      ))}

      {/* Fader cap */}
      <div
        className="pointer-events-none absolute left-1/2 h-3.5 w-7 -translate-x-1/2 rounded-[3px] border border-black/70 bg-linear-to-b from-neutral-200 via-neutral-400 to-neutral-600 shadow-[0_2px_4px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]"
        style={{ bottom: `${pct * 94 + 1.5}%`, transform: "translate(-50%, 50%)" }}
      >
        <div className="absolute inset-x-0.5 top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}
