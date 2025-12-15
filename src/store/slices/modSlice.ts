import { StateCreator } from 'zustand';
import { StoreState, ModSlice } from '../types';
import { GameMod, DND_CLASSES, DND_RACES, CLASS_PRESETS, RACE_PRESETS } from '../../types';

export const createModSlice: StateCreator<StoreState, [], [], ModSlice> = (set, get) => ({
  activeMods: [],

  loadMod: async (jsonString: string) => {
      try {
          const modData: GameMod = JSON.parse(jsonString);
          if (!modData.id || !modData.name) throw new Error("Invalid Mod Format: Missing ID or Name");
          
          // Prevent duplicates
          const exists = get().activeMods.some(m => m.id === modData.id);
          if (exists) throw new Error("Mod already loaded");

          // Apply Theme if present
          if (modData.theme) {
              const root = document.documentElement;
              Object.entries(modData.theme).forEach(([key, val]) => {
                  root.style.setProperty(key, val);
              });
          }

          set(state => ({ activeMods: [...state.activeMods, modData] }));
      } catch (e) {
          console.error("Failed to load mod", e);
          throw e;
      }
  },

  unloadMod: (id: string) => {
      // Revert theme if necessary? For simplicity, we just reload page or leave artifacts. 
      // Ideally we should track original theme values, but reloading themes is complex.
      // We will just remove it from the list for content purposes.
      set(state => ({ activeMods: state.activeMods.filter(m => m.id !== id) }));
  },

  getAllClasses: () => {
      const state = get();
      const modClasses = state.activeMods.flatMap(m => m.content?.classes ? Object.keys(m.content.classes) : []);
      // Use Set to unique
      return Array.from(new Set([...DND_CLASSES, ...modClasses]));
  },

  getAllRaces: () => {
      const state = get();
      const modRaces = state.activeMods.flatMap(m => m.content?.races ? Object.keys(m.content.races) : []);
      return Array.from(new Set([...DND_RACES, ...modRaces]));
  },

  getClassPreset: (className: string) => {
      const state = get();
      // 1. Check Mods (Reverse order so later mods overwrite)
      for (let i = state.activeMods.length - 1; i >= 0; i--) {
          const mod = state.activeMods[i];
          if (mod.content?.classes && mod.content.classes[className]) {
              return mod.content.classes[className];
          }
      }
      // 2. Check Core
      return CLASS_PRESETS[className];
  },

  getRacePreset: (raceName: string) => {
      const state = get();
      for (let i = state.activeMods.length - 1; i >= 0; i--) {
          const mod = state.activeMods[i];
          if (mod.content?.races && mod.content.races[raceName]) {
              return mod.content.races[raceName];
          }
      }
      return RACE_PRESETS[raceName];
  }
});
