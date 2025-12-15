
import { StateCreator } from 'zustand';
import { StoreState, GameSlice } from '../types';
import { DEFAULT_SETTINGS, Character, Sender } from '../../types';
import { peerService } from '../../services/peerService';

export const createGameSlice: StateCreator<StoreState, [], [], GameSlice> = (set, get) => ({
  appPhase: 'setup',
  mpMode: 'none',
  isGamePaused: false,
  gameSettings: DEFAULT_SETTINGS,
  
  connectedPlayers: [],
  remoteCharacters: {},
  playerReadiness: {},
  peerStatus: {},
  pendingJoinRequests: [],
  
  // Adaptive Difficulty
  rollHistory: [],
  
  recordRoll: (value, dc) => set(state => {
      let type: 'success' | 'fail' | 'neutral' = 'neutral';
      if (dc !== undefined) {
          type = value >= dc ? 'success' : 'fail';
      } else {
          // Heuristic for manual rolls without explicit DC in context
          if (value >= 15) type = 'success';
          else if (value <= 8) type = 'fail';
      }
      // Keep last 20 rolls
      const newHistory = [...state.rollHistory, { value, type, timestamp: Date.now() }].slice(-20);
      return { rollHistory: newHistory };
  }),
  
  getPartyMomentum: () => {
      const state = get();
      const recent = state.rollHistory.slice(-10); // Last 10 rolls
      if (recent.length < 3) return 'balanced';

      const successCount = recent.filter(r => r.type === 'success').length;
      const failCount = recent.filter(r => r.type === 'fail').length;
      
      if (failCount >= recent.length * 0.5) return 'struggling'; // >50% failure
      if (successCount >= recent.length * 0.6) return 'dominating'; // >60% success
      return 'balanced';
  },

  setAppPhase: (phase) => set({ appPhase: phase }),
  
  setMpMode: (mode) => {
      set({ mpMode: mode });
      // Side effect: update service host flag
      peerService.isHost = mode === 'host';
  },
  
  togglePause: () => {
      const newState = !get().isGamePaused;
      set({ isGamePaused: newState });
      if (get().mpMode === 'host') {
          peerService.broadcast({ type: 'GAME_PAUSE', payload: { isPaused: newState } });
      }
  },
  
  updateSettings: (settings) => {
      set({ gameSettings: settings });
      if (get().mpMode === 'host') {
          peerService.broadcast({ type: 'UPDATE_SETTINGS', payload: { settings } });
      }
  },

  addPlayer: (id) => set((state) => ({ 
      connectedPlayers: [...state.connectedPlayers, id],
      playerReadiness: { ...state.playerReadiness, [id]: false },
      peerStatus: { ...state.peerStatus, [id]: 'online' }
  })),
  
  removePlayer: (id) => set((state) => {
      const newChars = { ...state.remoteCharacters };
      delete newChars[id];
      const newReadiness = { ...state.playerReadiness };
      delete newReadiness[id];
      const newStatus = { ...state.peerStatus };
      delete newStatus[id];
      
      return {
          connectedPlayers: state.connectedPlayers.filter(p => p !== id),
          remoteCharacters: newChars,
          playerReadiness: newReadiness,
          peerStatus: newStatus
      };
  }),
  
  updateRemoteCharacter: (id, char) => set((state) => ({
      remoteCharacters: { ...state.remoteCharacters, [id]: char }
  })),
  
  setPlayerReady: (id, isReady) => set((state) => ({
      playerReadiness: { ...state.playerReadiness, [id]: isReady }
  })),
  
  updatePeerStatus: (id, status) => set((state) => ({
      peerStatus: { ...state.peerStatus, [id]: status }
  })),
  
  addJoinRequest: (req) => set((state) => ({
      pendingJoinRequests: [...state.pendingJoinRequests, req]
  })),
  
  removeJoinRequest: (connId) => set((state) => ({
      pendingJoinRequests: state.pendingJoinRequests.filter(r => r.connId !== connId)
  })),

  // Central Hub for Incoming Network Data
  processIncomingData: (data, connId) => {
      const state = get();
      
      switch (data.type) {
          case 'CHAT':
              // Whisper logic
              if (data.payload.recipientId) {
                  if (data.payload.recipientId === state.character.name) {
                      state.addMessage({
                          id: Math.random().toString(36).substr(2, 9),
                          text: data.payload.text,
                          sender: Sender.User,
                          timestamp: Date.now(),
                          isWhisper: true,
                          recipient: state.character.name,
                          imageUrl: data.payload.imageUrl
                      });
                  } else if (state.mpMode === 'host') {
                      // Relay
                      const targetId = Object.keys(state.remoteCharacters).find(cid => state.remoteCharacters[cid].name === data.payload.recipientId);
                      if (targetId) {
                          peerService.sendDirect(targetId, data);
                          // Spy message for DM
                          state.addMessage({
                              id: Math.random().toString(36).substr(2, 9),
                              text: `[RELAY] ${data.payload.senderName} -> ${data.payload.recipientId}: ${data.payload.text}`,
                              sender: Sender.System,
                              timestamp: Date.now(),
                              isWhisper: true
                          });
                      }
                  }
              } else {
                  // Normal Chat / Action
                  // Add to chat and Action Buffer
                  const msg = {
                      id: Math.random().toString(36).substr(2, 9),
                      text: `**${data.payload.senderName}**: ${data.payload.text}`,
                      sender: Sender.User,
                      timestamp: Date.now(),
                      imageUrl: data.payload.imageUrl
                  };
                  state.addMessage(msg);
                  
                  // Add to buffer for AI if Host
                  if (state.mpMode === 'host') {
                      set((s) => ({
                          actionBuffer: [...s.actionBuffer, { sender: data.payload.senderName, text: data.payload.text }],
                          bufferExpiry: s.actionBuffer.length === 0 ? Date.now() + 60000 : s.bufferExpiry
                      }));
                  }
              }
              break;
              
          case 'ROLL':
              const rollMsg = {
                  id: Math.random().toString(36).substr(2, 9),
                  text: data.payload.isBlind 
                      ? `[BLIND ROLL] ${data.payload.senderName}: ${data.payload.result} (${data.payload.message})` 
                      : data.payload.message,
                  sender: Sender.System,
                  timestamp: Date.now()
              };
              state.addMessage(rollMsg);
              
              if (state.pendingRoll && state.mpMode === 'host') {
                  state.resolvePendingRoll(rollMsg.text);
              }
              
              // Record Remote Rolls if Host
              if (state.mpMode === 'host') {
                  if (data.payload.result) {
                      state.recordRoll(data.payload.result, state.pendingRoll?.dc);
                  }
              }
              break;
              
          case 'DELTA_UPDATE':
              if (data.payload.type === 'TOKEN_MOVE') {
                  const { id, pos } = data.payload;
                  state.moveToken(id, pos, 0, true);
                  if (state.mpMode === 'host') peerService.broadcast(data, connId);
              }
              break;
              
          case 'MAP_PING':
              state.pingMap(data.payload.x, data.payload.y, data.payload.sender);
              if (state.mpMode === 'host') peerService.broadcast(data, connId);
              break;
              
          case 'DRAW_LINE':
              state.addDrawing({
                  id: Math.random().toString(36).substr(2, 9),
                  points: data.payload.points,
                  color: data.payload.color,
                  width: data.payload.width,
                  timestamp: Date.now()
              });
              if (state.mpMode === 'host') peerService.broadcast(data, connId);
              break;
              
          case 'TRADE':
              // Simplified trade handling for store
              if (data.payload.to === state.character.name) {
                  state.addMessage({
                      id: Math.random().toString(36).substr(2, 9),
                      text: `[TRADE] ${data.payload.from} wants to give you ${data.payload.item}`,
                      sender: Sender.System,
                      timestamp: Date.now()
                  });
              } else if (state.mpMode === 'host') {
                  const targetId = Object.keys(state.remoteCharacters).find(cid => state.remoteCharacters[cid].name === data.payload.to);
                  if (targetId) peerService.sendDirect(targetId, data);
              }
              break;
              
          case 'PLAYER_READY':
              state.setPlayerReady(connId, data.payload.isReady);
              break;
              
          case 'STATE_SYNC':
              // Client Receiving Full Sync
              const sync = data.payload;
              if (sync.messages) set({ messages: sync.messages });
              if (sync.location) set({ location: sync.location });
              if (sync.combatState) set({ combatState: sync.combatState });
              if (sync.mapObjects) set({ mapObjects: sync.mapObjects });
              if (sync.mapTemplates) set({ mapTemplates: sync.mapTemplates });
              if (sync.storySummary) set({ storySummary: sync.storySummary });
              if (sync.isGamePaused !== undefined) set({ isGamePaused: sync.isGamePaused });
              if (sync.gameSettings) set({ gameSettings: sync.gameSettings });
              break;
              
          case 'START_GAME':
              state.setAppPhase('game');
              break;
              
          case 'PLAYER_JOIN':
              state.addMessage({
                  id: Math.random().toString(36).substr(2, 9),
                  text: `**${data.payload.character.name}** joined the game.`,
                  sender: Sender.System,
                  timestamp: Date.now()
              });
              if (state.mpMode === 'client' && data.payload.peerId) {
                  // Initiate Mesh Connection if not already existing
                  peerService.connectToMeshPeers([data.payload.peerId]);
              }
              break;
              
          case 'GAME_PAUSE':
              set({ isGamePaused: data.payload.isPaused });
              break;
              
          case 'FORCE_VIEW':
              state.forceView(data.payload.x, data.payload.y);
              break;
              
          case 'UPDATE_SETTINGS':
              set({ gameSettings: data.payload.settings });
              break;
              
          case 'CURSOR_MOVE':
              state.updateRemoteCursor(data.payload.peerId, data.payload.x, data.payload.y, data.payload.color);
              break;
      }
  }
});
