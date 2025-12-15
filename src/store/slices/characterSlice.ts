import { StateCreator } from 'zustand';
import { StoreState, CharacterSlice } from '../types';
import { DEFAULT_CHARACTER } from '../../types';
import { getAbilityModifier } from '../../utils/mechanics';

export const createCharacterSlice: StateCreator<StoreState, [], [], CharacterSlice> = (set, get) => ({
  character: DEFAULT_CHARACTER,

  updateCharacter: (updates) => {
      set((state) => ({ character: { ...state.character, ...updates } }));
      
      // If we are in MP, we might need to sync character updates to host?
      // Usually done via periodic sync or specific actions. 
      // For MVP, we rely on game loop or specific actions.
  },

  modifyInventory: (item, action) => set((state) => {
      let newInv = [...state.character.inventory];
      if (action === 'add') newInv.push(item);
      else newInv = newInv.filter(i => i !== item); // Simple remove all instances logic or specific?
      
      return { character: { ...state.character, inventory: newInv } };
  }),

  updateHp: (amount) => set((state) => {
      const newHp = Math.max(0, Math.min(state.character.maxHp, state.character.hp + amount));
      return { character: { ...state.character, hp: newHp } };
  }),

  consumeSpellSlot: (level) => set((state) => {
      const slots = { ...state.character.spellSlots };
      if (slots[level] && slots[level].current > 0) {
          slots[level] = { ...slots[level], current: slots[level].current - 1 };
      }
      return { character: { ...state.character, spellSlots: slots } };
  }),

  shortRest: () => set((state) => {
      if (state.character.hitDice.current > 0) {
          const hitDie = state.character.classes[0]?.hitDie || 8;
          const roll = Math.floor(Math.random() * hitDie) + 1;
          const con = getAbilityModifier(state.character.stats.constitution);
          const heal = Math.max(0, roll + con);
          const newHp = Math.min(state.character.maxHp, state.character.hp + heal);
          
          return {
              character: {
                  ...state.character,
                  hp: newHp,
                  hitDice: { ...state.character.hitDice, current: state.character.hitDice.current - 1 }
              }
          };
      }
      return {};
  }),

  longRest: () => set((state) => {
      const slots = { ...state.character.spellSlots };
      Object.keys(slots).forEach((key: any) => {
          slots[key].current = slots[key].max;
      });
      const regainedHD = Math.max(1, Math.floor(state.character.hitDice.max / 2));
      const newHD = Math.min(state.character.hitDice.max, state.character.hitDice.current + regainedHD);
      
      return {
          character: {
              ...state.character,
              hp: state.character.maxHp,
              spellSlots: slots,
              hitDice: { ...state.character.hitDice, current: newHD },
              deathSaves: { successes: 0, failures: 0 }
          }
      };
  })
});
