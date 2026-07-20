"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Timer } from "lucide-react";

const UNAVAILABLE_MESSAGE = "No disponible en esta versión";

function FooterToggle({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 items-center rounded-md border px-2.5 font-mono text-[10px] font-bold tracking-wide transition-colors ${
        active
          ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
          : "border-white/10 text-white/40 hover:text-white/65"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 size-1.5 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "bg-white/15"}`}
      />
    </button>
  );
}

function EditableField({
  label,
  value,
  onCommit,
  width = "w-14",
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  width?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className={`${width} rounded border border-orange-400/40 bg-black/40 px-1 text-center font-mono text-[12px] font-bold text-white outline-none`}
        />
      ) : (
        <button
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className={`${width} rounded font-mono text-[12px] font-bold text-white/85 hover:text-orange-300`}
        >
          {value || "--"}
        </button>
      )}
      <span className="font-mono text-[8px] tracking-widest text-white/35 uppercase">{label}</span>
    </div>
  );
}

function Stepper({
  label,
  display,
  onIncrement,
  onDecrement,
}: {
  label: string;
  display: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          className="flex size-4 items-center justify-center rounded border border-white/12 text-[10px] text-white/50 hover:text-white"
        >
          −
        </button>
        <span className="w-10 text-center font-mono text-[12px] font-bold text-white/85 tabular-nums">
          {display}
        </span>
        <button
          onClick={onIncrement}
          className="flex size-4 items-center justify-center rounded border border-white/12 text-[10px] text-white/50 hover:text-white"
        >
          +
        </button>
      </div>
      <span className="font-mono text-[8px] tracking-widest text-white/35 uppercase">{label}</span>
    </div>
  );
}

function Dial({
  label,
  display,
  ratio,
  accent,
  onClick,
}: {
  label: string;
  display: string;
  ratio: number;
  accent: string;
  onClick: () => void;
}) {
  const deg = Math.round(Math.min(Math.max(ratio, 0), 1) * 270);
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span
        className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-black/30"
        style={{
          backgroundImage: `conic-gradient(${accent} ${deg}deg, rgba(255,255,255,0.06) ${deg}deg)`,
        }}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-[#161616] font-mono text-[8px] font-bold text-white/70">
          {display}
        </span>
      </span>
      <span className="font-mono text-[8px] tracking-widest text-white/35 uppercase">{label}</span>
    </button>
  );
}

interface IBottomBarProps {
  metronomeOn: boolean;
  onToggleMetronome: () => void;
  bpm: number | null;
  tempo: number;
  onTempoChange: (value: number) => void;
  transpose: number;
  onTransposeChange: (value: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (value: string) => void;
  masterVolume: number;
  onMasterVolumeChange: (value: number) => void;
}

export function BottomBar({
  metronomeOn,
  onToggleMetronome,
  bpm,
  tempo,
  onTempoChange,
  transpose,
  onTransposeChange,
  timeSignature,
  onTimeSignatureChange,
  masterVolume,
  onMasterVolumeChange,
}: IBottomBarProps) {
  const [automix, setAutomix] = useState(false);
  const [pitchLock, setPitchLock] = useState(true);
  const [midiClock, setMidiClock] = useState(true);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-white/8 bg-linear-to-b from-white/4 to-transparent px-5 py-3">
      <FooterToggle
        label="METRÓNOMO"
        active={metronomeOn}
        onClick={onToggleMetronome}
        title={bpm ? undefined : "BPM no definido — metrónomo a 120 por defecto"}
      />

      <div className="h-8 w-px bg-white/8" />

      <Stepper
        label="Tempo"
        display={`${Math.round(tempo * 100)}%`}
        onIncrement={() => onTempoChange(Math.min(1.5, +(tempo + 0.01).toFixed(2)))}
        onDecrement={() => onTempoChange(Math.max(0.5, +(tempo - 0.01).toFixed(2)))}
      />

      <Stepper
        label="Transpose"
        display={transpose > 0 ? `+${transpose}` : `${transpose}`}
        onIncrement={() => onTransposeChange(Math.min(12, transpose + 1))}
        onDecrement={() => onTransposeChange(Math.max(-12, transpose - 1))}
      />

      <EditableField label="Compás" value={timeSignature} onCommit={onTimeSignatureChange} width="w-12" />

      <div className="h-8 w-px bg-white/8" />

      <Dial
        label="Reverb"
        display="30%"
        ratio={0.3}
        accent="#38bdf8"
        onClick={() => toast(UNAVAILABLE_MESSAGE)}
      />
      <Dial
        label="Delay"
        display="20%"
        ratio={0.2}
        accent="#a78bfa"
        onClick={() => toast(UNAVAILABLE_MESSAGE)}
      />
      <Dial
        label="Master Vol"
        display={`${Math.round((masterVolume / 1.5) * 100)}%`}
        ratio={masterVolume / 1.5}
        accent="#ff8a1f"
        onClick={() => onMasterVolumeChange(masterVolume >= 1.5 ? 0 : Math.min(1.5, +(masterVolume + 0.1).toFixed(2)))}
      />

      <div className="h-8 w-px bg-white/8" />

      <FooterToggle label="AUTOMIX" active={automix} onClick={() => setAutomix((v) => !v)} />
      <FooterToggle label="PITCH LOCK" active={pitchLock} onClick={() => setPitchLock((v) => !v)} />
      <button
        onClick={() => setMidiClock((v) => !v)}
        className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[10px] font-bold tracking-wide transition-colors ${
          midiClock
            ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
            : "border-white/10 text-white/40 hover:text-white/65"
        }`}
      >
        <Timer className="size-3" /> MIDI CLOCK
      </button>
    </div>
  );
}
