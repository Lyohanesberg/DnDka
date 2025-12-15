
import { StateCreator } from 'zustand';
import { StoreState, UISlice } from '../types';

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (set) => ({
  activeTab: 'sheet',
  viewMode: 'chat',
  showSidebar: true,
  isVideoChatOpen: false, // Default closed
  
  modals: {
    dmTools: false,
    journal: false,
    compendium: false,
    adventureLog: false,
    cloudSaves: false,
    merchant: false,
    homebrew: false,
    loot: false,
    modManager: false
  },
  
  activeLootChest: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  toggleVideoChat: () => set((state) => ({ isVideoChatOpen: !state.isVideoChatOpen })),
  
  openModal: (modal) => set((state) => ({ 
    modals: { ...state.modals, [modal]: true } 
  })),
  
  closeModal: (modal) => set((state) => ({ 
    modals: { ...state.modals, [modal]: false } 
  })),
  
  openLootModal: (chest) => set((state) => ({
      activeLootChest: chest,
      modals: { ...state.modals, loot: true }
  })),
  
  closeLootModal: () => set((state) => ({
      activeLootChest: null,
      modals: { ...state.modals, loot: false }
  }))
});
