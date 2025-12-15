
import React from 'react';
import { Character, GameSettings } from '../types';
import { Users, Play, Lock, Unlock, Eye, EyeOff, ShieldAlert, CheckCircle, Clock, Shield, Volume2 } from 'lucide-react';

interface LobbyPanelProps {
  isHost: boolean;
  connectedPlayers: string[]; // Peer IDs
  remoteCharacters: Record<string, Character>;
  playerReadiness: Record<string, boolean>;
  gameSettings: GameSettings;
  onUpdateSettings?: (settings: GameSettings) => void;
  onStartGame?: () => void;
  onToggleReady?: () => void;
  myPeerId: string;
  characterName: string;
}

const LobbyPanel: React.FC<LobbyPanelProps> = ({
  isHost,
  connectedPlayers,
  remoteCharacters,
  playerReadiness,
  gameSettings,
  onUpdateSettings,
  onStartGame,
  onToggleReady,
  myPeerId,
  characterName
}) => {
  
  const allReady = connectedPlayers.every(pid => playerReadiness[pid]);
  const amIReady = playerReadiness[myPeerId] || false;

  const toggleSetting = (key: keyof GameSettings) => {
      if (!onUpdateSettings) return;
      onUpdateSettings({
          ...gameSettings,
          [key]: !gameSettings[key]
      });
  };

  const setDifficulty = (val: GameSettings['difficulty']) => {
      if (!onUpdateSettings) return;
      onUpdateSettings({
          ...gameSettings,
          difficulty: val
      });
  };

  const setVoice = (val: string) => {
      if (!onUpdateSettings) return;
      onUpdateSettings({
          ...gameSettings,
          ttsVoice: val
      });
  };

  return (
    <div className="bg-stone-900 border-2 border-amber-700 rounded-lg p-4 shadow-2xl h-full flex flex-col">
      <h2 className="text-xl font-bold text-amber-500 fantasy-font mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-stone-800 pb-2">
        <Users className="w-6 h-6" /> Лобі Гри
      </h2>

      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* PLAYERS LIST */}
        <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase mb-2">Гравці в кімнаті</h3>
            <div className="space-y-2">
                {/* HOST (Self or Remote) */}
                <div className="flex items-center justify-between p-2 rounded bg-amber-900/20 border border-amber-800/50">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <div>
                            <div className="text-sm font-bold text-amber-100">{isHost ? `${characterName} (Ви)` : "Host (DM)"}</div>
                            <div className="text-[10px] text-stone-500">Dungeon Master</div>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-amber-500">HOST</div>
                </div>

                {/* CLIENTS */}
                {connectedPlayers.map(pid => {
                    const char = remoteCharacters[pid];
                    const isReady = playerReadiness[pid];
                    const isMe = pid === myPeerId; 
                    
                    return (
                        <div key={pid} className="flex items-center justify-between p-2 rounded bg-stone-800 border border-stone-700">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-stone-600'}`} />
                                <div>
                                    <div className="text-sm font-bold text-stone-200">{char?.name || 'Unknown'}</div>
                                    <div className="text-[10px] text-stone-500">{char?.race} {char?.class}</div>
                                </div>
                            </div>
                            {isReady ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-stone-500" />}
                        </div>
                    );
                })}
                
                {/* RENDER SELF IF CLIENT */}
                {!isHost && (
                     <div className="flex items-center justify-between p-2 rounded bg-stone-800 border border-stone-600 shadow-inner">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${amIReady ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-stone-600'}`} />
                            <div>
                                <div className="text-sm font-bold text-stone-200">{characterName} (Ви)</div>
                                <div className="text-[10px] text-stone-500">Герой</div>
                            </div>
                        </div>
                        {amIReady ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-stone-500" />}
                    </div>
                )}
            </div>
        </div>

        {/* SETTINGS */}
        <div className="border-t border-stone-800 pt-4">
            <h3 className="text-xs font-bold text-stone-500 uppercase mb-3">Налаштування Світу</h3>
            
            <div className="space-y-3">
                {/* Difficulty */}
                <div>
                    <label className="text-[10px] text-stone-400 uppercase block mb-1">Рівень Складності</label>
                    {isHost ? (
                        <select 
                            value={gameSettings.difficulty} 
                            onChange={(e) => setDifficulty(e.target.value as any)}
                            className="w-full bg-stone-950 border border-stone-700 rounded p-2 text-sm text-stone-200 focus:border-amber-500 outline-none"
                        >
                            <option value="story">Story (Легкий)</option>
                            <option value="normal">Normal (Стандарт)</option>
                            <option value="hard">Hard (Важкий)</option>
                            <option value="deadly">Deadly (Смертельний)</option>
                        </select>
                    ) : (
                        <div className="bg-stone-950 border border-stone-800 rounded p-2 text-sm text-amber-500 font-bold uppercase">
                            {gameSettings.difficulty}
                        </div>
                    )}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 gap-2">
                    <button 
                        onClick={() => isHost && toggleSetting('fogEnabled')}
                        disabled={!isHost}
                        className={`flex items-center justify-between p-2 rounded border transition-colors ${gameSettings.fogEnabled ? 'bg-stone-800 border-stone-600' : 'bg-stone-900 border-stone-800 opacity-70'}`}
                    >
                        <span className="flex items-center gap-2 text-xs font-bold text-stone-300">
                            {gameSettings.fogEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            Туман Війни
                        </span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${gameSettings.fogEnabled ? 'bg-green-600' : 'bg-red-900'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${gameSettings.fogEnabled ? 'left-4.5' : 'left-0.5'}`} style={{ left: gameSettings.fogEnabled ? '18px' : '2px' }} />
                        </div>
                    </button>

                    <button 
                        onClick={() => isHost && toggleSetting('allowPvp')}
                        disabled={!isHost}
                        className={`flex items-center justify-between p-2 rounded border transition-colors ${gameSettings.allowPvp ? 'bg-red-900/20 border-red-800' : 'bg-stone-900 border-stone-800 opacity-70'}`}
                    >
                        <span className="flex items-center gap-2 text-xs font-bold text-stone-300">
                            <ShieldAlert className="w-4 h-4" />
                            PvP Дозвіл
                        </span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${gameSettings.allowPvp ? 'bg-green-600' : 'bg-red-900'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform`} style={{ left: gameSettings.allowPvp ? '18px' : '2px' }} />
                        </div>
                    </button>
                    
                     <button 
                        onClick={() => isHost && toggleSetting('publicRolls')}
                        disabled={!isHost}
                        className={`flex items-center justify-between p-2 rounded border transition-colors ${gameSettings.publicRolls ? 'bg-stone-800 border-stone-600' : 'bg-stone-900 border-stone-800 opacity-70'}`}
                    >
                        <span className="flex items-center gap-2 text-xs font-bold text-stone-300">
                            {gameSettings.publicRolls ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            Публічні Кидки
                        </span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${gameSettings.publicRolls ? 'bg-green-600' : 'bg-red-900'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform`} style={{ left: gameSettings.publicRolls ? '18px' : '2px' }} />
                        </div>
                    </button>

                    <div className={`flex flex-col gap-2 p-2 rounded border transition-colors ${gameSettings.ttsEnabled ? 'bg-stone-800 border-stone-600' : 'bg-stone-900 border-stone-800 opacity-70'}`}>
                        <button 
                            onClick={() => isHost && toggleSetting('ttsEnabled')}
                            disabled={!isHost}
                            className="flex items-center justify-between w-full"
                        >
                            <span className="flex items-center gap-2 text-xs font-bold text-stone-300">
                                <Volume2 className="w-4 h-4" />
                                AI Озвучка (TTS)
                            </span>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${gameSettings.ttsEnabled ? 'bg-green-600' : 'bg-red-900'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform`} style={{ left: gameSettings.ttsEnabled ? '18px' : '2px' }} />
                            </div>
                        </button>
                        
                        {gameSettings.ttsEnabled && isHost && (
                            <select 
                                value={gameSettings.ttsVoice}
                                onChange={(e) => setVoice(e.target.value)}
                                className="mt-1 w-full bg-stone-950 border border-stone-700 rounded p-1 text-xs text-stone-300 focus:border-amber-500 outline-none"
                            >
                                <option value="Kore">Kore (Жіночий, Спокійний)</option>
                                <option value="Puck">Puck (Чоловічий, Грайливий)</option>
                                <option value="Fenrir">Fenrir (Чоловічий, Глибокий)</option>
                                <option value="Aoede">Aoede (Жіночий, Елегантний)</option>
                                <option value="Charon">Charon (Чоловічий, Похмурий)</option>
                            </select>
                        )}
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="pt-4 mt-2 border-t border-stone-800">
          {isHost ? (
              <button 
                onClick={onStartGame}
                // Host can force start even if not everyone is ready, but usually waits
                className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest transition-all active:scale-95"
              >
                  <Play className="w-5 h-5 fill-current" /> 
                  Почати Гру {!allReady && connectedPlayers.length > 0 && "(Force)"}
              </button>
          ) : (
              <div className="flex flex-col gap-2">
                  <button 
                    onClick={onToggleReady}
                    className={`w-full font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest transition-all active:scale-95 ${amIReady ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-stone-700 hover:bg-stone-600 text-stone-300'}`}
                  >
                      {amIReady ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      {amIReady ? "ГОТОВИЙ!" : "НАТИСНІТЬ ЯКЩО ГОТОВІ"}
                  </button>
                  <div className="text-center text-[10px] text-stone-500 animate-pulse">
                      {amIReady ? "Очікування запуску хостом..." : "Підтвердіть готовність до пригод."}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default LobbyPanel;
