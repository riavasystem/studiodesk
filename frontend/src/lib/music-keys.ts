export const KEY_NAMES = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;

const SEMITONE_INDEX: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** Nearest semitone shift (−6..+6) to go from `fromKey` to `toKey` — tempo
 * unaffected, just pitch, so the register shift stays as small as possible. */
export function semitoneShiftBetweenKeys(fromKey: string, toKey: string): number {
  const from = SEMITONE_INDEX[fromKey] ?? 0;
  const to = SEMITONE_INDEX[toKey] ?? 0;
  let diff = (to - from + 12) % 12;
  if (diff > 6) diff -= 12;
  return diff;
}

export function normalizeKeyName(raw: string | null | undefined): string {
  if (!raw) return "C";
  const trimmed = raw.trim();
  return trimmed in SEMITONE_INDEX ? trimmed : "C";
}
