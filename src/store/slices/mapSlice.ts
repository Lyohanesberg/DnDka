import { StateCreator } from 'zustand';
import { StoreState, MapSlice } from '../types';
import { peerService } from '../../services/peerService';
import { analyzeBattleMap } from '../../services/geminiService';
import { crdtService } from '../../services/crdtService';

export const createMapSlice: StateCreator<StoreState, [], [], MapSlice> = (set, get) => ({
  mapTokens: [],
  mapObjects: [],
  mapTemplates: [],
  drawings: [],
  location: {
      name: "Невідома Локація",
      description: "Тьмяне світло факелів...",
      isGenerating: false,
      isAnalyzing: false,
      weather: 'none'
  },
  activePings: [],
  visualEffects: [],
  mapFocusTarget: null,
  remoteCursors: {},

  updateRemoteCursor: (id, x, y, color) => set((state) => ({
      remoteCursors: { ...state.remoteCursors, [id]: { x, y, color } }
  })),

  moveToken: (id, pos, cost, isRemote = false) => {
      // 1. Update CRDT (Single Source of Truth)
      // This will trigger the CRDT subscription callback in useGameController,
      // which will then update the Zustand store.
      // We do NOT update `set` here manually for state to avoid race conditions.
      crdtService.moveToken(id, pos, cost);

      // We still update local turn state for mechanics validation
      const state = get();
      const isMyTurn = state.combatState.isActive && state.combatState.combatants.find(c => c.isCurrentTurn)?.name === state.character.name;
      
      if (!isRemote && id === state.character.name && isMyTurn) {
          set((s) => ({ 
              turnState: { 
                  ...s.turnState, 
                  movementRemaining: Math.max(0, s.turnState.movementRemaining - cost) 
              } 
          }));
      }
  },

  updateMapObject: (obj) => set((state) => ({
      mapObjects: state.mapObjects.map(o => o.id === obj.id ? obj : o)
  })),

  setMapObjects: (objects) => set({ mapObjects: objects }),

  addToken: (token) => {
      crdtService.addToken(token);
  },
  
  removeToken: (id) => {
      crdtService.removeToken(id);
  },

  addTemplate: (template) => set((state) => ({ mapTemplates: [...state.mapTemplates, template] })),
  
  removeTemplate: (id) => set((state) => ({ 
      mapTemplates: state.mapTemplates.filter(t => t.id !== id) 
  })),
  
  updateTemplates: (templates) => set({ mapTemplates: templates }),

  updateLocation: (loc) => set((state) => ({ location: { ...state.location, ...loc } })),
  
  updateFog: (base64) => set((state) => ({ location: { ...state.location, fogOfWar: base64 } })),

  pingMap: (x, y, sender) => {
      const id = Math.random().toString(36).substr(2, 9);
      set((state) => ({ activePings: [...state.activePings, { id, x, y, color: 'amber', sender, timestamp: Date.now() }] }));
      
      // Auto remove after 3s
      setTimeout(() => {
          set((state) => ({ activePings: state.activePings.filter(p => p.id !== id) }));
      }, 3000);

      // Network: Pings are transient, so we keep using peerService directly instead of CRDT
      const { mpMode, character } = get();
      if (sender === character.name && mpMode !== 'none') {
          const payload = { type: 'MAP_PING', payload: { x, y, color: 'amber', sender } };
          if (mpMode === 'host') peerService.broadcast(payload as any);
          else peerService.sendToHost(payload as any);
      }
  },

  addDrawing: (drawing) => {
      set((state) => ({ drawings: [...state.drawings, drawing] }));
  },

  triggerEffect: (x, y, type) => set((state) => ({
      visualEffects: [...state.visualEffects, { id: Math.random().toString(36).substr(2, 9), x, y, type, timestamp: Date.now() }]
  })),

  forceView: (x, y) => {
      set({ mapFocusTarget: { x, y, timestamp: Date.now() }, viewMode: 'map' });
  },

  uploadMap: async (file: File) => {
      const reader = new FileReader();
      
      const readPromise = new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
              if (e.target?.result) resolve(e.target.result as string);
              else reject("Read failed");
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });

      try {
          const base64Url = await readPromise;
          set((state) => ({
              location: { ...state.location, imageUrl: base64Url, name: "Завантажена Мапа", isAnalyzing: true }
          }));

          const objects = await analyzeBattleMap(base64Url);
          
          set((state) => ({
              mapObjects: objects,
              location: { ...state.location, isAnalyzing: false }
          }));

      } catch (e) {
          console.error("Map Upload Failed", e);
          set((state) => ({ location: { ...state.location, isAnalyzing: false } }));
      }
  },

  setFullMapState: (tokens, objects, templates, loc) => {
      // Sync CRDT for tokens
      crdtService.setTokens(tokens);
      set({
          mapObjects: objects,
          mapTemplates: templates,
          location: loc
      });
  }
});