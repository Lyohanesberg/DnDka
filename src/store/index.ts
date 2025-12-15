import { create } from 'zustand';
import { StoreState } from './types';
import { createUISlice } from './slices/uiSlice';
import { createGameSlice } from './slices/gameSlice';
import { createMapSlice } from './slices/mapSlice';
import { createCharacterSlice } from './slices/characterSlice';
import { createCombatSlice } from './slices/combatSlice';
import { createChatSlice } from './slices/chatSlice';
import { createModSlice } from './slices/modSlice';
import { CustomSpell, CustomMonster } from '../types';

export const useGameStore = create<StoreState>()((...a) => {
  const [set, get] = a;
  return {
    ...createUISlice(...a),
    ...createGameSlice(...a),
    ...createMapSlice(...a),
    ...createCharacterSlice(...a),
    ...createCombatSlice(...a),
    ...createChatSlice(...a),
    ...createModSlice(...a),
    
    // Homebrew slice inline
    customSpells: [],
    customMonsters: [],
    addCustomSpell: (spell: CustomSpell) => {
        const state = get();
        const newSpells = [...state.customSpells, spell];
        set({ customSpells: newSpells });
        localStorage.setItem('dnd_custom_spells', JSON.stringify(newSpells));
    },
    removeCustomSpell: (id: string) => {
        const state = get();
        const newSpells = state.customSpells.filter(s => s.id !== id);
        set({ customSpells: newSpells });
        localStorage.setItem('dnd_custom_spells', JSON.stringify(newSpells));
    },
    addCustomMonster: (monster: CustomMonster) => {
        const state = get();
        const newMonsters = [...state.customMonsters, monster];
        set({ customMonsters: newMonsters });
        localStorage.setItem('dnd_custom_monsters', JSON.stringify(newMonsters));
    },
    removeCustomMonster: (id: string) => {
        const state = get();
        const newMonsters = state.customMonsters.filter(m => m.id !== id);
        set({ customMonsters: newMonsters });
        localStorage.setItem('dnd_custom_monsters', JSON.stringify(newMonsters));
    },
  };
});
