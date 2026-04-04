import { create } from 'zustand';

export interface Mode {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface ModeStore {
  modes: Mode[];
  activeMode: Mode | null;
  isLoading: boolean;
  error: string | null;
  setActiveMode: (modeId: string, userId?: string) => Promise<void>;
  initializeModes: () => void;
}

const defaultModes: Mode[] = [
  {
    id: 'sleep',
    name: 'Sleep Mode',
    description: 'Optimized monitoring for sleep patterns and quality',
    isActive: true,
  },
  {
    id: 'fall',
    name: 'Fall Detection',
    description: 'Advanced fall detection with emergency response',
    isActive: false,
  },
];

export const useModeStore = create<ModeStore>((set, get) => ({
  modes: defaultModes,
  activeMode: defaultModes.find(mode => mode.isActive) || null,
  isLoading: false,
  error: null,

  setActiveMode: async (modeId: string, userId?: string) => {
    const mode = get().modes.find(m => m.id === modeId);
    if (!mode) {
      set({ error: `Mode ${modeId} not found` });
      return;
    }

    set({ isLoading: true, error: null });

    // IMU firmware has no server mode switch; this only updates in-app focus (sleep vs fall UI).
    set((state) => {
      const updatedModes = state.modes.map((m) => ({
        ...m,
        isActive: m.id === modeId,
      }));
      const newActiveMode = updatedModes.find((m) => m.isActive) || null;
      return {
        modes: updatedModes,
        activeMode: newActiveMode,
        isLoading: false,
        error: null,
      };
    });
  },

  initializeModes: () => {
    set({
      modes: defaultModes,
      activeMode: defaultModes.find(mode => mode.isActive) || null,
      error: null,
    });
  },
}));
