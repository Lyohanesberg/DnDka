
import { Character, Message, CombatState, MapToken, MapObject, MapTemplate, Quest, Note, LocationState, GameSettings, PendingRoll, Ping, TurnState, Drawing, VisualEffect, CustomSpell, CustomMonster, GameMod, ClassPreset, RacePreset, RollRecord } from '../types';
import { Chat } from "@google/genai";

export interface UISlice {
  activeTab: 'chat' | 'sheet';
  viewMode: 'chat' | 'map';
  showSidebar: boolean;
  isVideoChatOpen: boolean; // NEW
  
  // Modals
  modals: {
    dmTools: boolean;
    journal: boolean;
    compendium: boolean;
    adventureLog: boolean;
    cloudSaves: boolean;
    merchant: boolean;
    homebrew: boolean;
    loot: boolean;
    modManager: boolean;
  };
  
  activeLootChest: MapObject | null;
  
  setActiveTab: (tab: 'chat' | 'sheet') => void;
  setViewMode: (mode: 'chat' | 'map') => void;
  toggleSidebar: () => void;
  toggleVideoChat: () => void; // NEW
  openModal: (modal: keyof UISlice['modals']) => void;
  closeModal: (modal: keyof UISlice['modals']) => void;
  openLootModal: (chest: MapObject) => void;
  closeLootModal: () => void;
}

export interface GameSlice {
  appPhase: 'setup' | 'creation' | 'game';
  mpMode: 'none' | 'host' | 'client';
  isGamePaused: boolean;
  gameSettings: GameSettings;
  
  // Multiplayer
  connectedPlayers: string[];
  remoteCharacters: Record<string, Character>;
  playerReadiness: Record<string, boolean>;
  peerStatus: Record<string, 'online' | 'reconnecting' | 'offline'>;
  pendingJoinRequests: {connId: string, char: Character, connObj: any}[];
  
  // Adaptive Difficulty
  rollHistory: RollRecord[];
  recordRoll: (value: number, dc?: number) => void;
  getPartyMomentum: () => 'struggling' | 'balanced' | 'dominating';

  setAppPhase: (phase: 'setup' | 'creation' | 'game') => void;
  setMpMode: (mode: 'none' | 'host' | 'client') => void;
  togglePause: () => void;
  updateSettings: (settings: GameSettings) => void;
  
  // MP Actions
  addPlayer: (id: string) => void;
  removePlayer: (id: string) => void;
  updateRemoteCharacter: (id: string, char: Character) => void;
  setPlayerReady: (id: string, isReady: boolean) => void;
  updatePeerStatus: (id: string, status: 'online' | 'reconnecting' | 'offline') => void;
  addJoinRequest: (req: {connId: string, char: Character, connObj: any}) => void;
  removeJoinRequest: (connId: string) => void;
  
  // Handling Network Data
  processIncomingData: (data: any, connId: string) => void;
}

export interface MapSlice {
  mapTokens: MapToken[];
  mapObjects: MapObject[];
  mapTemplates: MapTemplate[];
  drawings: Drawing[];
  location: LocationState;
  activePings: Ping[];
  visualEffects: VisualEffect[];
  mapFocusTarget: {x: number, y: number, timestamp: number} | null;
  
  // Mesh Network Cursors
  remoteCursors: Record<string, {x: number, y: number, color: string}>;
  updateRemoteCursor: (id: string, x: number, y: number, color: string) => void;
  
  moveToken: (id: string, pos: {x: number, y: number}, cost: number, isRemote?: boolean) => void;
  updateMapObject: (obj: MapObject) => void;
  setMapObjects: (objects: MapObject[]) => void;
  addToken: (token: MapToken) => void;
  removeToken: (id: string) => void;
  
  addTemplate: (template: MapTemplate) => void;
  removeTemplate: (id: string) => void;
  updateTemplates: (templates: MapTemplate[]) => void;
  
  updateLocation: (loc: Partial<LocationState>) => void;
  updateFog: (base64: string) => void;
  
  pingMap: (x: number, y: number, sender: string) => void;
  addDrawing: (drawing: Drawing) => void;
  triggerEffect: (x: number, y: number, type: any) => void;
  forceView: (x, y) => void;
  
  uploadMap: (file: File) => Promise<void>; 
  
  // Sync
  setFullMapState: (tokens: MapToken[], objects: MapObject[], templates: MapTemplate[], loc: LocationState) => void;
}

export interface CharacterSlice {
  character: Character;
  updateCharacter: (updates: Partial<Character>) => void;
  // Actions that affect character logic
  modifyInventory: (item: string, action: 'add' | 'remove') => void;
  updateHp: (amount: number) => void;
  consumeSpellSlot: (level: number) => void;
  shortRest: () => void;
  longRest: () => void;
}

export interface CombatSlice {
  combatState: CombatState;
  turnState: TurnState;
  lastMove: { tokenId: string, from: {x: number, y: number}, to: {x: number, y: number}, cost: number, timestamp: number } | null;
  
  startCombat: () => void;
  endCombat: () => void;
  updateCombatant: (name: string, updates: Partial<any>) => void;
  nextTurn: () => void;
  setTurnState: (state: Partial<TurnState>) => void;
  undoMove: () => void;
  
  useAction: (type: 'main' | 'bonus' | 'move' | 'reaction') => void;
}

export interface ChatSlice {
  messages: Message[];
  storySummary: string;
  quests: Quest[];
  notes: Note[];
  
  // Logic
  pendingRoll: PendingRoll | null;
  actionBuffer: {sender: string, text: string}[];
  bufferExpiry: number | null;
  isSearchingRAG: boolean;
  
  // AI
  chatSession: Chat | null;
  
  addMessage: (msg: Message) => void;
  sendUserMessage: (text: string, imageUrl?: string, recipient?: string) => Promise<void>;
  processAIResponse: (userParams: string | null, userName: string | null, toolResponse?: any) => Promise<void>;
  
  addQuest: (quest: Quest) => void;
  updateQuest: (id: string, updates: Partial<Quest>) => void;
  addNote: (note: Note) => void;
  
  setPendingRoll: (roll: PendingRoll | null) => void;
  resolvePendingRoll: (resultMsg: string) => Promise<void>;
  
  flushActionBuffer: () => Promise<void>;
  
  // Sync
  setFullChatState: (messages: Message[], quests: Quest[], notes: Note[], summary: string) => void;
}

export interface HomebrewSlice {
    customSpells: CustomSpell[];
    customMonsters: CustomMonster[];
    addCustomSpell: (spell: CustomSpell) => void;
    removeCustomSpell: (id: string) => void;
    addCustomMonster: (monster: CustomMonster) => void;
    removeCustomMonster: (id: string) => void;
}

export interface ModSlice {
    activeMods: GameMod[];
    loadMod: (jsonString: string) => Promise<void>;
    unloadMod: (id: string) => void;
    
    // Selectors
    getAllClasses: () => string[];
    getAllRaces: () => string[];
    getClassPreset: (className: string) => ClassPreset | undefined;
    getRacePreset: (raceName: string) => RacePreset | undefined;
}

export type StoreState = UISlice & GameSlice & MapSlice & CharacterSlice & CombatSlice & ChatSlice & HomebrewSlice & ModSlice;
