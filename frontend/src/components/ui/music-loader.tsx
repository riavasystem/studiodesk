import { Music2 } from "lucide-react";

interface IMusicLoaderProps {
  label: string;
}

/** Animated music-note loader used for long-running operations (stem
 * separation can take several minutes) so the UI doesn't look frozen. */
export function MusicLoader({ label }: IMusicLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex items-end gap-1.5">
        <Music2 className="size-7 animate-bounce text-orange-400" style={{ animationDelay: "0ms" }} />
        <Music2
          className="size-9 animate-bounce text-orange-400"
          style={{ animationDelay: "150ms" }}
        />
        <Music2 className="size-7 animate-bounce text-orange-400" style={{ animationDelay: "300ms" }} />
      </div>
      <p className="text-sm text-white/70">{label}</p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/8">
        <div className="h-full w-full animate-pulse rounded-full bg-orange-400/60" />
      </div>
    </div>
  );
}
