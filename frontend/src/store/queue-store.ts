import { create } from "zustand";

interface IQueueState {
  queue: number[];
  setActiveSong: (songId: number) => void;
  addToQueue: (songId: number) => void;
  removeFromQueue: (songId: number) => void;
  setQueue: (songIds: number[]) => void;
}

/** Session-only playback queue — intentionally NOT persisted (no zustand
 * `persist` middleware), so it resets whenever the page is reloaded, mirroring
 * how a typical player's "up next" queue behaves. Opening a saved playlist
 * (see setQueue) re-seeds this same session queue rather than being a
 * separate concept — that's what lets the player auto-advance through it. */
export const useQueueStore = create<IQueueState>((set) => ({
  queue: [],
  // Only collapses the queue down to a single song when that song isn't
  // already part of it — otherwise opening song 2 of a 5-song playlist (or
  // auto-advancing into it) would wipe songs 3-5 the moment its page mounts.
  setActiveSong: (songId) => set((state) => (state.queue.includes(songId) ? state : { queue: [songId] })),
  addToQueue: (songId) =>
    set((state) => (state.queue.includes(songId) ? state : { queue: [...state.queue, songId] })),
  removeFromQueue: (songId) => set((state) => ({ queue: state.queue.filter((id) => id !== songId) })),
  setQueue: (songIds) => set({ queue: songIds }),
}));
