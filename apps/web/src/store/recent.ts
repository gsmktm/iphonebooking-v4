import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface RecentDevices {
  ids: string[];
  record: (id: string) => void;
  clear: () => void;
}

// Browsing history stays in this browser tab and contains public product IDs only.
export const useRecentDevices = create<RecentDevices>()(
  persist(
    (set) => ({
      ids: [],
      record: (id) =>
        set((s) => ({ ids: [id, ...s.ids.filter((item) => item !== id)].slice(0, 8) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'iphonebooking-recent-devices',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ ids: state.ids }),
      merge: (persisted, current) => {
        const ids = (persisted as Partial<RecentDevices> | null)?.ids;
        return {
          ...current,
          ids: Array.isArray(ids)
            ? [
                ...new Set(
                  ids.filter(
                    (id): id is string =>
                      typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id),
                  ),
                ),
              ].slice(0, 8)
            : [],
        };
      },
    },
  ),
);
