const PALETTES = [
  ["#fb923c", "#f97316"],
  ["#38bdf8", "#0ea5e9"],
  ["#34d399", "#10b981"],
  ["#a78bfa", "#8b5cf6"],
  ["#f472b6", "#ec4899"],
  ["#facc15", "#eab308"],
];

/** Deterministic placeholder cover for songs without an uploaded image: an
 * equalizer + music note, colored per song id so a list of un-covered songs
 * still reads as visually distinct instead of a wall of identical gray boxes. */
export function DefaultSongCover({ seed = 0, className = "" }: { seed?: number; className?: string }) {
  const [from, to] = PALETTES[Math.abs(seed) % PALETTES.length];
  const bars = [0.5, 0.85, 0.35, 0.7, 0.45];

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ background: `linear-gradient(160deg, ${from}22, transparent 70%)` }}
    >
      <svg viewBox="0 0 64 64" className="h-[55%] w-[55%]" fill="none">
        <circle cx="32" cy="32" r="30" fill={`${from}14`} />
        {bars.map((h, i) => (
          <rect
            key={i}
            x={12 + i * 9}
            y={44 - h * 26}
            width="5"
            height={h * 26}
            rx="2"
            fill={i % 2 === 0 ? from : to}
            opacity={0.85}
          />
        ))}
        <path
          d="M46 14v18.6a5 5 0 1 1-2-4V18l-6 1.5V14l8-2z"
          fill={to}
          opacity={0.95}
        />
      </svg>
    </div>
  );
}
