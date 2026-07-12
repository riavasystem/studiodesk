"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

interface ITrackWaveformProps {
  url: string;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  onSeek: (seconds: number) => void;
  height?: number;
}

export function TrackWaveform({ url, currentTime, duration, isMuted, onSeek, height = 48 }: ITrackWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      url,
      height,
      waveColor: "rgba(255,255,255,0.45)",
      progressColor: "#ff8a1f",
      cursorColor: "rgba(255,255,255,0.6)",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      interact: true,
      normalize: true,
      fillParent: true,
    });
    wavesurfer.setMuted(true);
    wavesurfer.on("interaction", (time) => onSeek(time));
    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer || !duration) return;
    wavesurfer.seekTo(Math.min(currentTime / duration, 1));
  }, [currentTime, duration]);

  return (
    <div
      className={`w-full ${isMuted ? "opacity-40 transition-opacity" : "transition-opacity"}`}
      style={{ minHeight: height }}
    >
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />
    </div>
  );
}
