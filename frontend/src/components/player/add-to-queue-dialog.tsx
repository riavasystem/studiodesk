"use client";

import { Music2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { useQueueStore } from "@/store/queue-store";
import type { ISong } from "@/hooks/use-songs";

interface IAddToQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allSongs: ISong[];
  queue: number[];
}

export function AddToQueueDialog({ open, onOpenChange, allSongs, queue }: IAddToQueueDialogProps) {
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const available = allSongs.filter((s) => !queue.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar a la lista de reproducción</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex max-h-96 flex-col gap-1.5 overflow-y-auto">
          {available.length === 0 && (
            <p className="py-6 text-center text-sm text-white/40">No hay más canciones para agregar.</p>
          )}
          {available.map((s) => (
            <button
              key={s.id}
              onClick={() => addToQueue(s.id)}
              className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/8">
                {s.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveCoverImageUrl(s.cover_image_url) ?? undefined}
                    alt={s.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <Music2 className="size-4 text-white/30" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{s.title}</p>
                <p className="truncate text-xs text-white/40">{s.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
