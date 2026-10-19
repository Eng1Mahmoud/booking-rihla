import { createStore } from 'zustand/vanilla';
export function createBookingStore() {
  return createStore<{
    selectedIds: string[];
    toggle: (id: string) => void;
    clear: () => void;
  }>()((set) => ({
    selectedIds: [],
    toggle: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((value) => value !== id)
          : [...state.selectedIds, id],
      })),
    clear: () => set({ selectedIds: [] }),
  }));
}
