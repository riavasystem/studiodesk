import { create } from "zustand";

interface IQueueState {
  queue: number[];
  setActiveSong: (songId: number) => void;
  addToQueue: (songId: number) => void;
  removeFromQueue: (songId: number) => void;
}

/** Session-only playback queue — intentionally NOT persisted (no zustand
 * `persist` middleware), so it resets whenever the page is reloaded, mirroring
 * how a typical player's "up next" queue behaves. */
export const useQueueStore = create<IQueueState>((set) => ({
  queue: [],
  setActiveSong: (songId) => set({ queue: [songId] }),
  addToQueue: (songId) =>
    set((state) => (state.queue.includes(songId) ? state : { queue: [...state.queue, songId] })),
  removeFromQueue: (songId) => set((state) => ({ queue: state.queue.filter((id) => id !== songId) })),
}));
