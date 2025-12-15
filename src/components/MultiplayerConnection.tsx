
import React, { useState } from 'react';
import { Users, Copy, Wifi, Shield, UserCheck, Play, Share2, WifiOff } from 'lucide-react';
import { peerService } from '../services/peerService';
import { Character } from '../types';
import { useGameStore } from '../store';

interface MultiplayerConnectionProps {
  character?: Character;
  connectedPlayers?: string[];
  remoteCharacters?: Record<string, Character>;
  mpMode?: 'none' | 'host' | 'client';
}

const MultiplayerConnection: React.FC<MultiplayerConnectionProps> = () => {
  const { character, connectedPlayers, remoteCharacters, mpMode, peerStatus } = useGameStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  
  if (mpMode === 'none') return null;

  const generatedId = peerService.myPeerId;

  const copyId = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId);
      setStatusMsg("Код скопійовано!");
      setTimeout(() => setStatusMsg(""), 2000);
    }
  };

  const shareLink = async () => {
    if (!generatedId) return;
    const url = `${window.location.origin}${window.location.pathname}?code=${generatedId}`;
    
    const shareData = {
        title: 'D&D AI Dungeon Master',
        text: `Приєднуйся до гри! Код кімнати: ${generatedId}`,
        url: url
    };

    try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(url);
            setStatusMsg("Посилання скопійовано!");
            setTimeout(() => setStatusMsg(""), 2000);
        }
    } catch (err) {
        console.error("Error sharing:", err);
        // If share is aborted or fails, fallback to clipboard if possible
        if (!(err instanceof DOMException && err.name === "AbortError")) {
            try {
                await navigator.clipboard.writeText(url);
                setStatusMsg("Посилання скопійовано!");
                setTimeout(() => setStatusMsg(""), 2000);
            } catch (e) {
                console.error("Clipboard fallback failed", e);
            }
        }
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded flex items-center gap-2 transition-colors border bg-green-900/30 text-green-400 border-green-800 animate-pulse-slow`}
        title="Статус Мультиплеєра"
      >
        <Wifi className="w-5 h-5" />
        <span className="text-xs font-bold hidden md:inline">
           {`ONLINE (${connectedPlayers.length + 1})`}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-stone-900 border border-stone-700 rounded shadow-2xl p-4 animate-in fade-in zoom-in duration-200 z-[100]">
          <h3 className="text-stone-200 font-bold mb-4 flex items-center gap-2 border-b border-stone-800 pb-2">
             <Users className="w-4 h-4 text-amber-500" /> Статус Кімнати
          </h3>

          <div className="space-y-4">
                {mpMode === 'host' && (
                    <div className="bg-black/40 p-3 rounded border border-stone-800 text-center animate-pulse-once">
                        <div className="text-[10px] text-stone-500 uppercase mb-1">Код Вашої Кімнати</div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <code className="text-xl text-amber-500 font-bold tracking-widest select-all">
                                {generatedId}
                            </code>
                            <button onClick={copyId} className="text-stone-400 hover:text-white" title="Копіювати код">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <button 
                            onClick={shareLink}
                            className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs py-2 rounded border border-stone-600 flex items-center justify-center gap-2 transition-colors group"
                        >
                            <Share2 className="w-3 h-3 group-hover:text-amber-500" /> 
                            Поділитися Запрошенням
                        </button>

                        {statusMsg && <div className="text-xs text-green-500 mt-2">{statusMsg}</div>}
                        <div className="text-[10px] text-stone-600 mt-2">
                            Поділіться цим кодом або посиланням з гравцями.
                        </div>
                    </div>
                )}

                {/* Players List */}
                <div className="bg-stone-950/50 rounded border border-stone-800 overflow-hidden">
                    <div className="bg-stone-800/50 p-2 text-[10px] font-bold text-stone-400 uppercase flex justify-between items-center">
                        <span>Гравці в кімнаті</span>
                        <span className="bg-stone-900 px-1.5 rounded text-stone-500">{connectedPlayers.length + 1}</span>
                    </div>
                    <ul className="p-2 space-y-1">
                        {/* Host (Me or Remote) */}
                        <li className="flex items-center gap-2 text-xs p-1.5 bg-amber-900/10 border border-amber-900/30 rounded">
                            <Shield className="w-3 h-3 text-amber-500" />
                            <span className="text-amber-200 font-bold">
                                {mpMode === 'host' ? `${character.name} (Ви)` : 'Host (DM)'}
                            </span>
                        </li>
                        
                        {/* Connected Players */}
                        {connectedPlayers.map((playerId) => {
                            const char = remoteCharacters[playerId];
                            const status = peerStatus[playerId] || 'online';
                            const isReconnecting = status === 'reconnecting';

                            return (
                                <li key={playerId} className={`flex items-center justify-between text-xs p-1.5 rounded border ${isReconnecting ? 'bg-yellow-900/20 border-yellow-800' : 'bg-stone-900 border-stone-800'}`}>
                                    <div className="flex items-center gap-2">
                                        {isReconnecting ? <WifiOff className="w-3 h-3 text-yellow-500 animate-pulse" /> : <UserCheck className="w-3 h-3 text-green-500" />}
                                        <div>
                                            <span className={`font-bold block ${isReconnecting ? 'text-yellow-500' : 'text-stone-300'}`}>{char?.name || 'Unknown Hero'}</span>
                                            {char && <span className="text-[9px] text-stone-500">{char.race} {char.class}</span>}
                                        </div>
                                    </div>
                                    {isReconnecting && <span className="text-[9px] text-yellow-500 uppercase font-bold animate-pulse">Reconnecting...</span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-xs border-t border-stone-800 pt-3">
                   <div className="flex flex-col items-center">
                       <span className={`w-2 h-2 rounded-full mb-1 bg-green-500 shadow-[0_0_5px_#22c55e]`}></span>
                       <span className="font-bold text-stone-200">{mpMode === 'host' ? "SERVER ONLINE" : "CLIENT CONNECTED"}</span>
                   </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerConnection;
