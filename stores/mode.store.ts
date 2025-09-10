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
  setActiveMode: (modeId: string) => void;
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

  setActiveMode: (modeId: string) => {
    set((state) => {
      const updatedModes = state.modes.map(mode => ({
        ...mode,
        isActive: mode.id === modeId,
      }));
      
      const newActiveMode = updatedModes.find(mode => mode.isActive) || null;
      
      return {
        modes: updatedModes,
        activeMode: newActiveMode,
      };
    });
  },

  initializeModes: () => {
    set({
      modes: defaultModes,
      activeMode: defaultModes.find(mode => mode.isActive) || null,
    });
  },
}));
