import { create } from "zustand";

/** UI-only state shared across the shell (never server data). */
interface UiState {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  /** Number of mounted StickyActionBars; the chat launcher hides while > 0. */
  stickyBars: number;
  addStickyBar: () => () => void;
}

export const useUiStore = create<UiState>((set) => ({
  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  stickyBars: 0,
  addStickyBar: () => {
    set((s) => ({ stickyBars: s.stickyBars + 1 }));
    return () => set((s) => ({ stickyBars: s.stickyBars - 1 }));
  },
}));
