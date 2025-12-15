import { StateCreator } from 'zustand';
import { StoreState, CombatSlice } from '../types';

export const createCombatSlice: StateCreator<StoreState, [], [], CombatSlice> = (set, get) => ({
  combatState: { isActive: false, combatants: [] },
  turnState: {
      hasAction: true,
      hasBonusAction: true,
      hasReaction: true,
      movementRemaining: 30,
      maxMovement: 30,
      isDashUsed: false
  },
  lastMove: null,

  startCombat: () => set((state) => {
      // Logic to ensure player is in combatants
      const playerExists = state.combatState.combatants.some(c => c.name === state.character.name);
      let newCombatants = [...state.combatState.combatants];
      
      if (!playerExists) {
          newCombatants.push({
              name: state.character.name,
              initiative: 0,
              type: 'player',
              isCurrentTurn: false,
              hp: state.character.hp,
              maxHp: state.character.maxHp,
              hpStatus: 'Healthy'
          });
      }
      return { combatState: { isActive: true, combatants: newCombatants } };
  }),

  endCombat: () => set((state) => ({ combatState: { ...state.combatState, isActive: false } })),

  updateCombatant: (name, updates) => set((state) => ({
      combatState: {
          ...state.combatState,
          combatants: state.combatState.combatants.map(c => c.name === name ? { ...c, ...updates } : c)
      }
  })),

  nextTurn: () => set((state) => {
      const currentIndex = state.combatState.combatants.findIndex(c => c.isCurrentTurn);
      const nextIndex = (currentIndex + 1) % state.combatState.combatants.length;
      
      const nextCombatant = state.combatState.combatants[nextIndex];
      // Reset turn state if it's my turn next
      if (nextCombatant.name === state.character.name) {
          return {
              combatState: {
                  ...state.combatState,
                  combatants: state.combatState.combatants.map((c, i) => ({ ...c, isCurrentTurn: i === nextIndex }))
              },
              turnState: {
                  hasAction: true,
                  hasBonusAction: true,
                  hasReaction: true,
                  movementRemaining: state.character.speed,
                  maxMovement: state.character.speed,
                  isDashUsed: false
              },
              lastMove: null
          };
      }
      
      return {
          combatState: {
              ...state.combatState,
              combatants: state.combatState.combatants.map((c, i) => ({ ...c, isCurrentTurn: i === nextIndex }))
          }
      };
  }),

  setTurnState: (updates) => set((state) => ({ turnState: { ...state.turnState, ...updates } })),

  undoMove: () => set((state) => {
      if (state.lastMove) {
          const { tokenId, from, cost } = state.lastMove;
          // Revert map position
          // We need to call map slice logic, but we are inside the store, so we can access mapTokens state directly
          const newTokens = state.mapTokens.map(t => t.id === tokenId ? { ...t, position: from } : t);
          
          return {
              mapTokens: newTokens,
              turnState: { ...state.turnState, movementRemaining: state.turnState.movementRemaining + cost },
              lastMove: null
          };
      }
      return {};
  }),

  useAction: (type) => set((state) => {
      const updates: any = {};
      if (type === 'main') updates.hasAction = false;
      if (type === 'bonus') updates.hasBonusAction = false;
      if (type === 'reaction') updates.hasReaction = false;
      return { turnState: { ...state.turnState, ...updates } };
  })
});
