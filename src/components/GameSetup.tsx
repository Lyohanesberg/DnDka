
import React, { useState, useEffect } from 'react';
import { User, Users, Globe, Play, Loader2, Wifi, Sword, ArrowLeft, Eye, Upload, RefreshCw } from 'lucide-react';
import { WORLD_PRESETS } from '../types';
import { peerService } from '../services/peerService';
import { useGameStore } from '../store';

type SetupPhase = 'mode_select' | 'host_setup' | 'client_setup';

const GameSetup: React.FC = () => {
  const { 
    character, 
    updateCharacter, 
    setAppPhase, 
    setMpMode,
    setFullMapState,
    setFullChatState
  } = useGameStore();

  const [phase, setPhase] = useState<SetupPhase>('mode_select');
  const [isLoading, setIsLoading] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(character.name);
  const [worldSetting, setWorldSetting] = useState(character.worldSetting || WORLD_PRESETS[0]);
  const [isSpectator, setIsSpectator] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);

  // Check for invitation code in URL and backups
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
          setRoomCode(code);
          setPhase('client_setup');
      }

      const backup = localStorage.getItem('dnd_client_backup');
      if (backup) setHasBackup(true);
  }, []);

  // --- Handlers ---

  const handleHostSubmit = async (isSinglePlayer: boolean) => {
    if (!playerName.trim()) {
        setError("Введіть ім'я персонажа/гравця");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    // Update Global State
    updateCharacter({ name: playerName, worldSetting: worldSetting, isSpectator: false });

    if (isSinglePlayer) {
        // Single player mode - no network overhead
        setMpMode('none');
        setAppPhase('game');
        setIsLoading(false);
    } else {
        // Host mode - initialize PeerJS
        try {
            const shortId = `dnd-${Math.random().toString(36).substring(2, 7)}`;
            await peerService.initialize(shortId);
            setMpMode('host');
            setAppPhase('creation');
            setIsLoading(false);
        } catch (e) {
            console.error(e);
            setError("Помилка створення кімнати (PeerJS error). Спробуйте ще раз.");
            setIsLoading(false);
        }
    }
  };

  const handleClientSubmit = async () => {
    if (!playerName.trim()) {
        setError("Введіть ім'я");
        return;
    }
    if (!roomCode.trim()) {
        setError("Введіть код кімнати");
        return;
    }

    setIsLoading(true);
    setError(null);

    // Update Global State
    const tempChar = { ...character, name: playerName, isSpectator: isSpectator }; 
    updateCharacter({ name: playerName, isSpectator: isSpectator });

    try {
        await peerService.connectToHost(roomCode.trim(), tempChar);
        setMpMode('client');
        setAppPhase('creation');
        setIsLoading(false);
    } catch (e: any) {
        console.error(e);
        setError(e.message || "Не вдалося підключитися до кімнати. Можливо, Хост відхилив запит.");
        setIsLoading(false);
    }
  };

  const loadGameData = (data: any) => {
      // Update Character
      if(data.character) updateCharacter(data.character);
      
      // Update Map
      if(data.mapTokens) setFullMapState(data.mapTokens, data.mapObjects||[], data.mapTemplates||[], data.location);
      
      // Update Chat
      if(data.messages) setFullChatState(data.messages, data.quests||[], data.notes||[], data.storySummary||"");
      
      // Update Combat via direct state setting
      useGameStore.setState({ combatState: data.combatState || { isActive: false, combatants: [] } });
      
      setMpMode('none');
      setAppPhase('game');
  };

  const handleLoadFromFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              loadGameData(json);
          } catch (err) {
              console.error(err);
              alert("Помилка читання файлу.");
          }
      };
      reader.readAsText(file);
  };

  const handleLoadBackup = () => {
      const backupStr = localStorage.getItem('dnd_client_backup');
      if (backupStr) {
          try {
              const json = JSON.parse(backupStr);
              loadGameData(json);
          } catch(e) {
              console.error(e);
          }
      }
  };

  // --- Renders ---

  if (phase === 'mode_select') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-in fade-in duration-500 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed relative">
            
            <h1 className="text-4xl md:text-6xl text-amber-500 fantasy-font mb-4 text-center drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                D&D AI Dungeon Master
            </h1>
            <p className="text-stone-400 mb-8 text-center max-w-md font-serif text-lg leading-relaxed">
                Оберіть свій шлях: вирушайте в пригоду наодинці з ШІ або зберіть друзів у спільну подорож.
            </p>

            {hasBackup && (
                <div className="mb-6 animate-pulse">
                    <button 
                        onClick={handleLoadBackup}
                        className="flex items-center gap-2 px-4 py-2 bg-red-900/50 border border-red-600 text-red-200 rounded-lg hover:bg-red-900 hover:text-white transition-colors shadow-lg"
                    >
                        <RefreshCw className="w-4 h-4" /> Відновити перервану сесію (Backup)
                    </button>
                </div>
            )}

            <div className="mb-10">
                <label className="cursor-pointer flex items-center gap-3 px-6 py-3 bg-stone-900/60 hover:bg-stone-800 border border-stone-700 hover:border-amber-500 rounded-full transition-all group shadow-lg hover:shadow-amber-500/10 backdrop-blur-sm">
                     <div className="p-1.5 bg-stone-800 rounded-full group-hover:bg-amber-900/50 transition-colors">
                        <Upload className="w-4 h-4 text-stone-400 group-hover:text-amber-500" />
                     </div>
                     <span className="text-sm font-bold uppercase tracking-wider text-stone-300 group-hover:text-amber-100 transition-colors">
                         Завантажити гру з файлу (.json)
                     </span>
                     <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleLoadFromFile(e.target.files[0]);
                                e.target.value = '';
                            }
                        }}
                     />
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
                {/* Single Player */}
                <button 
                    onClick={() => setPhase('host_setup')} 
                    className="group relative bg-stone-900/80 border-2 border-stone-700 hover:border-amber-500 rounded-xl p-8 flex flex-col items-center gap-6 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] backdrop-blur-sm"
                >
                    <div className="p-5 bg-stone-800 rounded-full group-hover:bg-amber-900/40 transition-colors border border-stone-600 group-hover:border-amber-500/50">
                        <User className="w-12 h-12 text-stone-300 group-hover:text-amber-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-stone-200 mb-2 fantasy-font tracking-wide">Самітня Гра</h3>
                        <p className="text-sm text-stone-500 font-serif">Ви проти світу. ШІ веде пригоду персонально для вас.</p>
                    </div>
                    <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        Почати <Sword className="w-3 h-3" />
                    </div>
                </button>

                {/* Host */}
                <button 
                    onClick={() => { setPhase('host_setup'); setMpMode('host'); }}
                    className="group relative bg-stone-900/80 border-2 border-stone-700 hover:border-amber-500 rounded-xl p-8 flex flex-col items-center gap-6 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] backdrop-blur-sm"
                >
                    <div className="p-5 bg-stone-800 rounded-full group-hover:bg-amber-900/40 transition-colors border border-stone-600 group-hover:border-amber-500/50">
                        <Users className="w-12 h-12 text-stone-300 group-hover:text-amber-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-stone-200 mb-2 fantasy-font tracking-wide">Створити Кімнату</h3>
                        <p className="text-sm text-stone-500 font-serif">Ви — Хост. Створіть світ і запросіть друзів за посиланням.</p>
                    </div>
                    <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        Створити <Sword className="w-3 h-3" />
                    </div>
                </button>

                {/* Join */}
                <button 
                    onClick={() => setPhase('client_setup')}
                    className="group relative bg-stone-900/80 border-2 border-stone-700 hover:border-amber-500 rounded-xl p-8 flex flex-col items-center gap-6 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] backdrop-blur-sm"
                >
                    <div className="p-5 bg-stone-800 rounded-full group-hover:bg-amber-900/40 transition-colors border border-stone-600 group-hover:border-amber-500/50">
                        <Wifi className="w-12 h-12 text-stone-300 group-hover:text-amber-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-stone-200 mb-2 fantasy-font tracking-wide">Приєднатися</h3>
                        <p className="text-sm text-stone-500 font-serif">Введіть код кімнати, щоб увійти в існуючу гру.</p>
                    </div>
                    <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        Увійти <Sword className="w-3 h-3" />
                    </div>
                </button>
            </div>
            
            <div className="mt-12 text-stone-600 text-xs font-mono">v1.2.0 • Powered by Gemini AI</div>
        </div>
      );
  }

  // --- HOST SETUP (Name + Setting) ---
  if (phase === 'host_setup') {
      const isMp = peerService.isHost;

      return (
        <div className="flex items-center justify-center min-h-screen p-4 animate-in slide-in-from-right duration-500 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
             <div className="w-full max-w-md bg-stone-900/95 border-2 border-amber-700/50 rounded-xl p-8 shadow-2xl backdrop-blur-md relative">
                 <button onClick={() => { setPhase('mode_select'); setMpMode('none'); }} className="absolute top-4 left-4 text-stone-500 hover:text-amber-500 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                 </button>

                 <h2 className="text-3xl fantasy-font text-amber-500 mb-2 text-center tracking-wide">
                     {isMp ? "Налаштування Кімнати" : "Налаштування Гри"}
                 </h2>
                 <p className="text-center text-stone-500 text-sm mb-6 font-serif italic">
                     Перш ніж створити персонажа, визначте параметри світу.
                 </p>

                 {error && (
                     <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm p-3 rounded mb-6 flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" /> {error}
                     </div>
                 )}

                 <div className="space-y-6">
                     <div>
                         <label className="block text-stone-400 text-xs font-bold uppercase mb-2 tracking-widest">Ваше Ім'я / Ім'я Героя</label>
                         <input 
                            type="text" 
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Наприклад: Елеріон..."
                            className="w-full bg-black/50 border border-stone-700 rounded p-3 text-stone-200 focus:border-amber-500 focus:outline-none transition-colors placeholder-stone-700"
                         />
                     </div>

                     <div>
                         <label className="block text-stone-400 text-xs font-bold uppercase mb-2 tracking-widest">Сеттинг (Світ)</label>
                         <div className="relative group">
                             <select 
                                value={worldSetting}
                                onChange={(e) => setWorldSetting(e.target.value)}
                                className="w-full bg-black/50 border border-stone-700 rounded p-3 text-amber-100 appearance-none focus:border-amber-500 focus:outline-none cursor-pointer transition-colors"
                             >
                                 {WORLD_PRESETS.map(w => (
                                     <option key={w} value={w} className="bg-stone-900">{w}</option>
                                 ))}
                             </select>
                             <Globe className="absolute right-3 top-3 text-stone-500 pointer-events-none w-5 h-5 group-hover:text-amber-500 transition-colors" />
                         </div>
                         <p className="text-[10px] text-stone-500 mt-2 italic border-l-2 border-stone-700 pl-2">
                             Це задасть тон, технології та атмосферу для ШІ Майстра.
                         </p>
                     </div>

                     <button 
                        onClick={() => handleHostSubmit(!isMp)}
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-white font-bold rounded shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 mt-4"
                     >
                         {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                         <span className="uppercase tracking-widest text-sm">Далі: Персонаж</span>
                     </button>
                 </div>
             </div>
        </div>
      );
  }

  // --- CLIENT SETUP (Name + Code) ---
  if (phase === 'client_setup') {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 animate-in slide-in-from-right duration-500 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
             <div className="w-full max-w-md bg-stone-900/95 border-2 border-stone-700 rounded-xl p-8 shadow-2xl backdrop-blur-md relative">
                 <button onClick={() => setPhase('mode_select')} className="absolute top-4 left-4 text-stone-500 hover:text-amber-500 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                 </button>

                 <h2 className="text-3xl fantasy-font text-stone-200 mb-2 text-center tracking-wide">
                     Вхід у Кімнату
                 </h2>
                 <p className="text-center text-stone-500 text-sm mb-6 font-serif italic">
                     Приєднайтесь до вже створеної пригоди. Хост повинен підтвердити ваш запит.
                 </p>

                 {error && (
                     <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm p-3 rounded mb-6 flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" /> {error}
                     </div>
                 )}

                 <div className="space-y-6">
                     <div>
                         <label className="block text-stone-400 text-xs font-bold uppercase mb-2 tracking-widest">Ім'я Вашого Героя</label>
                         <input 
                            type="text" 
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Введіть ім'я..."
                            className="w-full bg-black/50 border border-stone-700 rounded p-3 text-stone-200 focus:border-amber-500 focus:outline-none transition-colors placeholder-stone-700"
                         />
                     </div>

                     <div>
                         <label className="block text-stone-400 text-xs font-bold uppercase mb-2 tracking-widest">Код Кімнати</label>
                         <input 
                            type="text" 
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            placeholder="Наприклад: DND-X9Z2"
                            className="w-full bg-black/50 border border-stone-700 rounded p-3 text-amber-400 font-mono uppercase tracking-wider focus:border-amber-500 focus:outline-none text-center text-lg placeholder-stone-800"
                         />
                         <p className="text-[10px] text-stone-500 mt-2 italic text-center">
                             Отримайте цей код від Хоста гри.
                         </p>
                     </div>

                     <div className="flex items-center gap-3 bg-stone-800/50 p-3 rounded border border-stone-700">
                        <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isSpectator ? 'bg-amber-600' : 'bg-stone-600'}`} onClick={() => setIsSpectator(!isSpectator)}>
                           <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isSpectator ? 'translate-x-4' : ''}`} />
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => setIsSpectator(!isSpectator)}>
                           <div className="flex items-center gap-2 font-bold text-stone-300 text-sm"><Eye className="w-4 h-4"/> Режим Глядача</div>
                           <p className="text-[10px] text-stone-500">Без персонажа, тільки чат та мапа.</p>
                        </div>
                     </div>

                     <button 
                        onClick={handleClientSubmit}
                        disabled={isLoading}
                        className="w-full py-4 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 mt-4"
                     >
                         {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sword className="w-5 h-5 fill-current" />}
                         <span className="uppercase tracking-widest text-sm">Надіслати Запит</span>
                     </button>
                 </div>
             </div>
        </div>
      );
  }

  return null;
};

export default GameSetup;
