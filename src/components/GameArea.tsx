

import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Sender } from '../types';
import ReactMarkdown from 'react-markdown';
import BattleMap from './BattleMap';
import CombatActionsPanel from './CombatActionsPanel';
import Typewriter from './Typewriter'; // Ensure Typewriter is imported if used
import { Loader2, Brain } from 'lucide-react';

const GameArea: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Selective subscription
  const { 
    messages, viewMode, combatState, location, 
    actionBuffer, connectedPlayers, mpMode, pendingRoll, isSearchingRAG,
    setViewMode, flushActionBuffer
  } = useGameStore(useShallow(state => ({
    messages: state.messages,
    viewMode: state.viewMode,
    combatState: state.combatState,
    location: state.location,
    actionBuffer: state.actionBuffer,
    connectedPlayers: state.connectedPlayers,
    mpMode: state.mpMode,
    pendingRoll: state.pendingRoll,
    isSearchingRAG: state.isSearchingRAG,
    setViewMode: state.setViewMode,
    flushActionBuffer: state.flushActionBuffer
  })));

  const isLoading = useGameStore(state => {
      const lastMsg = state.messages[state.messages.length - 1];
      return lastMsg?.sender === Sender.User && !state.pendingRoll && !lastMsg.isStreaming;
  }); 

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, viewMode]);

  return (
      <section className={`flex-1 h-full flex flex-col transition-all duration-500 bg-cover bg-center relative ${viewMode === 'chat' ? 'block' : 'flex'}`} style={{ backgroundImage: location.imageUrl ? `url(${location.imageUrl})` : "url('https://www.transparenttextures.com/patterns/dark-matter.png')" }}>
          <div className={`absolute inset-0 backdrop-blur-[1px] pointer-events-none transition-colors duration-1000 ${combatState.isActive ? 'bg-red-950/80' : 'bg-stone-950/90'}`} />
          
          {/* View Toggle */}
          <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0">
              <div className="flex items-center gap-3">
                  <h2 className="text-amber-100 font-bold text-lg fantasy-font tracking-wide leading-none drop-shadow-md">{location.name}</h2>
              </div>
              <div className="flex bg-black/50 rounded-lg p-1 backdrop-blur-md border border-stone-700">
                  <button onClick={() => setViewMode('chat')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase ${viewMode === 'chat' ? 'bg-stone-700 text-amber-500' : 'text-stone-400'}`}>Чат</button>
                  <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase ${viewMode === 'map' ? 'bg-stone-700 text-amber-500' : 'text-stone-400'}`}>Мапа</button>
              </div>
          </div>

          {/* Views */}
          {viewMode === 'map' && (
              <div className="flex-1 relative z-10 p-4 overflow-hidden">
                  <div className="w-full h-full bg-stone-900 border border-stone-700 rounded-lg overflow-hidden shadow-2xl relative">
                      <BattleMap />
                  </div>
              </div>
          )}

          {viewMode === 'chat' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-4 relative z-10 scrollbar-thin mb-2">
                  {messages.map((msg, index) => {
                      const isLastMessage = index === messages.length - 1;
                      return (
                      <div key={msg.id} className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[90%] md:max-w-[80%] rounded-lg p-4 text-base leading-relaxed shadow-lg backdrop-blur-sm relative group ${msg.isWhisper ? 'bg-purple-900/60 border border-purple-500 text-purple-100 italic' : msg.sender === Sender.User ? 'bg-stone-800/90 text-stone-200 border border-stone-600' : msg.sender === Sender.System ? 'bg-stone-900/80 text-amber-500 text-sm italic' : 'bg-stone-950/85 text-stone-300 border border-amber-900/50'}`}>
                              {msg.isWhisper && <div className="text-purple-400 text-[10px] font-bold mb-1 uppercase">Private</div>}
                              {msg.sender === Sender.User && !msg.isWhisper && <div className="text-stone-500 text-xs font-bold mb-1 uppercase text-right">{msg.text.startsWith('**') && msg.text.includes(':') ? 'Гравець' : 'Герой'}</div>}
                              {msg.imageUrl && (
                                  <div className="mb-2">
                                      <img src={msg.imageUrl} alt="Content" className="max-w-full max-h-64 rounded border border-stone-700 object-contain shadow-md" />
                                  </div>
                              )}
                              
                              {/* Only use Typewriter if it's the last message, from AI, not streaming, and not error */}
                              {isLastMessage && msg.sender === Sender.AI && !msg.isError && !msg.isStreaming ? (
                                  <Typewriter text={msg.text} />
                              ) : (
                                  <div className="markdown-content prose prose-invert prose-p:my-1 prose-strong:text-amber-500 relative">
                                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                                      {msg.isStreaming && (
                                          <span className="inline-block w-2 h-4 bg-amber-500 ml-1 animate-pulse align-middle"></span>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                  )})}
                  
                  {/* AI Loading & RAG Indicator */}
                  {isLoading && !pendingRoll && (
                      <div className="flex justify-start animate-pulse">
                          <div className="bg-stone-900/90 rounded-lg p-4 border border-stone-800 flex items-center gap-3">
                              {isSearchingRAG ? (
                                <>
                                  <Brain className="w-5 h-5 text-purple-500 animate-pulse" />
                                  <span className="text-stone-500 text-sm italic">Searching Archives...</span>
                                </>
                              ) : (
                                <>
                                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                                  <span className="text-stone-500 text-sm italic">Майстер думає...</span>
                                </>
                              )}
                          </div>
                      </div>
                  )}

                  {actionBuffer.length > 0 && connectedPlayers.length > 0 && (
                      <div className="flex justify-center sticky bottom-0 pb-2">
                          <div className="bg-stone-900/90 border border-amber-700/50 rounded-lg p-3 flex flex-col items-center gap-2 shadow-lg max-w-sm w-full">
                              <span className="text-xs text-stone-300 font-bold">Дії в черзі: {actionBuffer.length}</span>
                              {mpMode === 'host' && <button onClick={flushActionBuffer} className="text-[10px] bg-amber-900/50 hover:bg-amber-800 text-amber-200 px-3 py-1 rounded border border-amber-800 w-full">ВИКОНАТИ</button>}
                          </div>
                      </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>
          )}

          {/* Actions Panel */}
          <div className="bg-stone-950 p-0 shrink-0 z-30 relative border-t border-stone-800">
              <CombatActionsPanel />
          </div>
      </section>
  );
};

export default GameArea;