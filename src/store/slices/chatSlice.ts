
import { StateCreator } from 'zustand';
import { StoreState, ChatSlice } from '../types';
import { resumeDMSession, sendStreamWithRetry, generateStorySummary, generateLocationImage, analyzeBattleMap } from '../../services/geminiService';
import { ragService } from '../../services/ragService';
import { Message, Sender } from '../../types';
import { peerService } from '../../services/peerService';
import { crdtService } from '../../services/crdtService';

export const createChatSlice: StateCreator<StoreState, [], [], ChatSlice> = (set, get) => ({
  messages: [],
  storySummary: "",
  quests: [],
  notes: [],
  pendingRoll: null,
  actionBuffer: [],
  bufferExpiry: null,
  chatSession: null,
  isSearchingRAG: false,

  addMessage: (msg) => {
      // Use CRDT for shared message history
      crdtService.addMessage(msg);
  },

  sendUserMessage: async (text, imageUrl, recipient) => {
      const state = get();
      
      // Handle Pending Roll Interception (Single Player)
      if (state.pendingRoll && state.mpMode !== 'client') {
          const responses = state.pendingRoll.otherResponses.filter(r => r.name !== 'request_roll');
          responses.push({
              name: 'request_roll',
              response: { result: `User action instead of roll: "${text}"` }
          });
          set({ pendingRoll: null });
          
          const msg: Message = {
              id: Math.random().toString(36).substr(2, 9),
              text,
              sender: Sender.User,
              timestamp: Date.now(),
              imageUrl,
              isWhisper: !!recipient,
              recipient
          };
          crdtService.addMessage(msg); // SYNC
          
          await state.processAIResponse(null, null, responses);
          return;
      }

      // Record Manual Roll (heuristic)
      if (text.includes('🎲')) {
          const match = text.match(/\*\*(\d+)\*\*/);
          const val = match ? parseInt(match[1]) : null;
          if (val !== null && !isNaN(val)) {
              state.recordRoll(val);
          }
      }

      const msg: Message = {
          id: Math.random().toString(36).substr(2, 9),
          text,
          sender: Sender.User,
          timestamp: Date.now(),
          imageUrl,
          isWhisper: !!recipient,
          recipient
      };
      
      // Add to CRDT immediately (Local Echo + Sync)
      crdtService.addMessage(msg);

      if (state.mpMode === 'host') {
          // No need to broadcast manually, CRDT handles it
      } else if (state.mpMode === 'client') {
          peerService.sendToHost({ type: 'CHAT', payload: { text, senderName: state.character.name, timestamp: Date.now(), recipientId: recipient, imageUrl } });
      } else {
          // Single Player
          await state.processAIResponse(text, state.character.name);
      }
  },

  addQuest: (quest) => {
      crdtService.addQuest(quest);
      ragService.indexDocument(quest.id, `${quest.title}: ${quest.description}`, 'quest');
  },
  
  updateQuest: (id, updates) => {
      crdtService.updateQuest(id, updates);
  },
  
  addNote: (note) => {
      crdtService.addNote(note);
      ragService.indexDocument(note.id, `${note.title}: ${note.content}`, note.type);
  },
  
  setPendingRoll: (roll) => set({ pendingRoll: roll }),
  
  resolvePendingRoll: async (resultMsg) => {
      const state = get();
      
      // Record Roll Logic
      const match = resultMsg.match(/\*\*(\d+)\*\*/);
      const val = match ? parseInt(match[1]) : parseInt(resultMsg.replace(/\D/g, ''));
      if (!isNaN(val) && state.pendingRoll) {
           state.recordRoll(val, state.pendingRoll.dc);
      }

      if (state.pendingRoll) {
          const responses = state.pendingRoll.otherResponses.filter(r => r.name !== 'request_roll');
          responses.push({ name: 'request_roll', response: { result: resultMsg } });
          set({ pendingRoll: null });
          await state.processAIResponse(null, null, responses);
      }
  },

  flushActionBuffer: async () => {
      const state = get();
      if (state.actionBuffer.length === 0) return;
      const combined = state.actionBuffer.map(a => `${a.sender}: ${a.text}`).join('\n');
      set({ actionBuffer: [], bufferExpiry: null });
      await state.processAIResponse(combined, "Party");
  },

  setFullChatState: (messages, quests, notes, summary) => {
      // Sync CRDT
      crdtService.setMessages(messages);
      set({ storySummary: summary });
  },

  // --- THE AI LOGIC ---
  processAIResponse: async (userParams, userName, toolResponse) => {
      const state = get();
      
      const party = [state.character, ...Object.values(state.remoteCharacters)];
      const session = await resumeDMSession(party, state.messages, state.storySummary);
      
      if (!session) return;

      try {
          // Context
          const context = `[CURRENT GAME STATE]\nActive Combat: ${state.combatState.isActive}\nTokens: ${state.mapTokens.map(t => `${t.id} at [${t.position.x},${t.position.y}]`).join(', ')}`;
          
          let ragContext = "";
          if (userParams && !toolResponse && !get().isSearchingRAG) { 
              set({ isSearchingRAG: true });
              const results = await ragService.search(userParams);
              if (results.length > 0) {
                  ragContext = `\n[RETRIEVED CONTEXT (MEMORY)]:\n${results.join('\n')}\n`;
              }
              set({ isSearchingRAG: false });
          }

          const momentum = state.getPartyMomentum();
          let adaptiveNote = "";
          if (momentum === 'struggling') {
              adaptiveNote = `\n[ADAPTIVE DIRECTOR NOTE]: The party is STRUGGLING. Reduce difficulty slightly.`;
          } else if (momentum === 'dominating') {
              adaptiveNote = `\n[ADAPTIVE DIRECTOR NOTE]: The party is DOMINATING. Increase difficulty slightly.`;
          }

          let promptInput;
          if (toolResponse) {
              const responseParts = toolResponse.map((tr: any) => ({
                  functionResponse: { name: tr.name, response: tr.response }
              }));
              promptInput = responseParts;
          } else {
              promptInput = `${context}${ragContext}${adaptiveNote}\n${userName}: ${userParams}`;
          }

          const messageId = Math.random().toString(36).substr(2, 9);
          
          const aiMsg: Message = {
              id: messageId,
              text: "",
              sender: Sender.AI,
              timestamp: Date.now(),
              isStreaming: true
          };
          
          // NOTE: We do NOT add this placeholder to CRDT to avoid flickering for other clients.
          // We only update local Zustand state for streaming feedback.
          set(s => ({ messages: [...s.messages, aiMsg] }));

          const result = await sendStreamWithRetry(
              session, 
              promptInput,
              (chunkText) => {
                  set(s => ({
                      messages: s.messages.map(m => 
                          m.id === messageId ? { ...m, text: m.text + chunkText } : m
                      )
                  }));
              }
          );

          // Once complete, add the finalized message to CRDT
          // This ensures one solid update for everyone else, while local user saw streaming.
          // We need to fetch the final text because 'result.text' contains everything.
          // We remove the local placeholder first to avoid duplication when CRDT syncs back.
          
          set(s => ({ messages: s.messages.filter(m => m.id !== messageId) }));

          crdtService.addMessage({
              ...aiMsg,
              text: result.text || "",
              isStreaming: false
          });

          // 2. Tools
          if (result.functionCalls && result.functionCalls.length > 0) {
              const responses = [];
              let shouldPause = false;
              let pendingRollData = null;

              for (const call of result.functionCalls) {
                  const args = call.args as any;
                  let toolResult = { result: "Done" };

                  if (call.name === 'update_hp') {
                      state.updateCombatant(args.target || state.character.name, { 
                          hp: (c: any) => (c.hp || 0) + args.amount 
                      });
                      if (args.target === state.character.name || !args.target) {
                          state.updateCharacter({ hp: state.character.hp + args.amount });
                      }
                      toolResult = { result: "HP Updated" };
                  }
                  else if (call.name === 'update_location') {
                      state.updateLocation({ name: args.name, description: args.description, isGenerating: true });
                      generateLocationImage(args.description).then(async (url) => {
                          if (url) {
                              state.updateLocation({ imageUrl: url, isGenerating: false });
                              const objs = await analyzeBattleMap(url);
                              state.setMapObjects(objs);
                          }
                      });
                      toolResult = { result: "Location generating..." };
                  }
                  else if (call.name === 'request_roll') {
                      const target = (args.target || state.character.name).toLowerCase();
                      const isLocal = target === state.character.name.toLowerCase();
                      if (isLocal || state.mpMode === 'host') {
                          shouldPause = true;
                          pendingRollData = {
                              callId: Math.random().toString(36),
                              ability: args.ability,
                              skill: args.skill,
                              dc: args.dc,
                              reason: args.reason,
                              otherResponses: []
                          };
                      }
                      toolResult = { result: "Waiting for roll" };
                  }
                  else if (call.name === 'spawn_token') {
                      crdtService.addToken({ id: args.name, position: {x: args.x, y: args.y}, type: args.type, size: args.size || 1 });
                      state.startCombat(); 
                      toolResult = { result: "Spawned" };
                  }
                  else if (call.name === 'update_quest') {
                      crdtService.addQuest({ id: args.id === 'new' ? Math.random().toString(36) : args.id, title: args.title, description: args.description, status: args.status });
                      toolResult = { result: "Quest Updated" };
                  }
                  else if (call.name === 'add_note') {
                      crdtService.addNote({ id: Math.random().toString(36), title: args.title, content: args.content, type: args.type, timestamp: Date.now() });
                      toolResult = { result: "Note Added" };
                  }
                  else if (call.name === 'move_token') {
                      crdtService.moveToken(args.target, {x: args.x, y: args.y}, 0);
                      toolResult = { result: "Token Moved" };
                  }
                  else if (call.name === 'remove_token') {
                      crdtService.removeToken(args.target);
                      toolResult = { result: "Token Removed" };
                  }
                  
                  responses.push({ name: call.name, response: toolResult });
              }

              if (shouldPause && pendingRollData) {
                  (pendingRollData as any).otherResponses = responses;
                  set({ pendingRoll: pendingRollData as any });
              } else {
                  await state.processAIResponse(null, null, responses);
              }
          }
          
          // Summary Check
          if (state.messages.length % 10 === 0) {
              const newSum = await generateStorySummary(state.storySummary, state.messages.slice(-10));
              set({ storySummary: newSum });
          }

      } catch (e) {
          console.error("AI Error", e);
          set({ isSearchingRAG: false });
      }
  }
});
