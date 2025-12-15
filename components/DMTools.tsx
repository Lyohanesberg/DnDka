
import React, { useState } from 'react';
import { generateDMContent, generateItemImage } from '../services/geminiService';
import { Wand2, UserPlus, Coins, Lightbulb, Send, Copy, X, Loader2, BookPlus, Image as ImageIcon, Lock, Unlock, Target, MessageSquare, CloudRain, CloudSnow, CloudFog, Sun, Flame } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Character, WeatherType } from '../types';

interface DMToolsProps {
  isOpen: boolean;
  onClose: () => void;
  worldSetting: string;
  onSendToChat: (text: string, imageUrl?: string, recipient?: string) => void;
  onAddToNotes: (title: string, content: string) => void;
  connectedPlayers?: Character[];
  onTogglePause?: () => void;
  isPaused?: boolean;
  onForceView?: (x: number, y: number) => void;
  onUpdateWeather?: (type: WeatherType) => void; // NEW
}

type GenMode = 'npc' | 'loot' | 'hook' | 'item_art' | 'handout' | 'control';

const DMTools: React.FC<DMToolsProps> = ({ 
    isOpen, onClose, worldSetting, onSendToChat, onAddToNotes, 
    connectedPlayers = [], onTogglePause, isPaused, onForceView, onUpdateWeather 
}) => {
  const [mode, setMode] = useState<GenMode>('npc');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Params
  const [npcRace, setNpcRace] = useState("");
  const [npcClass, setNpcClass] = useState("");
  const [lootCR, setLootCR] = useState("1-4");
  const [hookTheme, setHookTheme] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  
  // Handout Params
  const [handoutRecipient, setHandoutRecipient] = useState("");
  const [handoutText, setHandoutText] = useState("");
  const [handoutImage, setHandoutImage] = useState("");

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult("");
    setImageUrl(null);
    
    try {
        if (mode === 'item_art') {
            if (!itemDesc) {
                setResult("Please enter item description.");
                setIsLoading(false);
                return;
            }
            const url = await generateItemImage(itemDesc);
            if (url) {
                setImageUrl(url);
                setResult(`Generated artwork for: ${itemDesc}`);
            } else {
                setResult("Failed to generate image.");
            }
        } else {
            let prompt = "";
            if (mode === 'npc') {
                prompt = `Generate a random NPC. 
                ${npcRace ? `Race: ${npcRace}.` : ""} 
                ${npcClass ? `Class/Role: ${npcClass}.` : ""}
                Include: Name, Appearance, Personality, Secret/Goal, and simple Stats (AC, HP) if relevant.`;
            } else if (mode === 'loot') {
                prompt = `Generate a random loot pile for a party of level ${lootCR}.
                Include 1-2 interesting magic items and some currency/valuables.`;
            } else if (mode === 'hook') {
                prompt = `Generate a plot hook or random encounter idea.
                Theme: ${hookTheme || "Unexpected Twist"}.
                Make it immediately actionable.`;
            }

            const text = await generateDMContent(prompt, worldSetting);
            setResult(text);
        }
    } catch (e) {
        setResult("Error generating content.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendHandout = () => {
      if (!handoutText && !handoutImage) return;
      onSendToChat(handoutText, handoutImage || undefined, handoutRecipient || undefined);
      setHandoutText("");
      setHandoutImage("");
  };

  const getTitle = () => {
      if (mode === 'npc') return "Новий NPC";
      if (mode === 'loot') return "Лут / Скарби";
      if (mode === 'hook') return "Сюжетний Хід";
      if (mode === 'item_art') return "Арт Предметів";
      if (mode === 'handout') return "Роздатковий Матеріал";
      if (mode === 'control') return "Керування Грою";
      return "Generated";
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
        <div className="bg-stone-900 border-2 border-amber-700 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in zoom-in duration-200">
            
            {/* Header */}
            <div className="bg-amber-950/50 p-3 border-b border-amber-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider">
                    <Wand2 className="w-5 h-5" /> Інструменти Майстра
                </div>
                <button onClick={onClose} className="text-stone-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-16 bg-stone-950 border-r border-stone-800 flex flex-col items-center py-4 gap-4 shrink-0">
                    <button 
                        onClick={() => { setMode('npc'); setResult(""); }}
                        className={`p-2 rounded transition-colors ${mode === 'npc' ? 'bg-amber-900 text-amber-200' : 'text-stone-500 hover:text-amber-500'}`}
                        title="Генератор NPC"
                    >
                        <UserPlus className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => { setMode('loot'); setResult(""); }}
                        className={`p-2 rounded transition-colors ${mode === 'loot' ? 'bg-amber-900 text-amber-200' : 'text-stone-500 hover:text-amber-500'}`}
                        title="Генератор Луту"
                    >
                        <Coins className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => { setMode('hook'); setResult(""); }}
                        className={`p-2 rounded transition-colors ${mode === 'hook' ? 'bg-amber-900 text-amber-200' : 'text-stone-500 hover:text-amber-500'}`}
                        title="Сюжетний Гачок"
                    >
                        <Lightbulb className="w-6 h-6" />
                    </button>
                    <div className="w-full h-px bg-stone-800 my-1" />
                    <button 
                        onClick={() => { setMode('item_art'); setResult(""); }}
                        className={`p-2 rounded transition-colors ${mode === 'item_art' ? 'bg-amber-900 text-amber-200' : 'text-stone-500 hover:text-amber-500'}`}
                        title="Арт Предметів"
                    >
                        <ImageIcon className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => { setMode('handout'); setResult(""); }}
                        className={`p-2 rounded transition-colors ${mode === 'handout' ? 'bg-amber-900 text-amber-200' : 'text-stone-500 hover:text-amber-500'}`}
                        title="Роздатковий матеріал (Handouts)"
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>
                    <div className="w-full h-px bg-stone-800 my-1" />
                    <button 
                        onClick={() => { setMode('control'); setResult(""); }}
                        className={`p-2 rounded transition-colors ${mode === 'control' ? 'bg-red-900 text-red-200' : 'text-stone-500 hover:text-red-500'}`}
                        title="Керування (Control)"
                    >
                        <Lock className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Area */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden bg-stone-900">
                    
                    {/* Controls */}
                    <div className="mb-4 space-y-3">
                        <h3 className="text-stone-300 font-bold border-b border-stone-700 pb-1 mb-2">{getTitle()}</h3>
                        
                        {mode === 'npc' && (
                            <div className="grid grid-cols-2 gap-2">
                                <input 
                                    type="text" placeholder="Раса (Випадкова)" 
                                    value={npcRace} onChange={e => setNpcRace(e.target.value)}
                                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                                />
                                <input 
                                    type="text" placeholder="Клас/Роль (Випадковий)" 
                                    value={npcClass} onChange={e => setNpcClass(e.target.value)}
                                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                                />
                            </div>
                        )}

                        {mode === 'loot' && (
                            <select 
                                value={lootCR} onChange={e => setLootCR(e.target.value)}
                                className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                            >
                                <option value="1-4">Рівень Групи 1-4</option>
                                <option value="5-10">Рівень Групи 5-10</option>
                                <option value="11-16">Рівень Групи 11-16</option>
                                <option value="17+">Рівень Групи 17+</option>
                            </select>
                        )}

                        {mode === 'hook' && (
                             <input 
                                type="text" placeholder="Тема (Засідка, Загадка...)" 
                                value={hookTheme} onChange={e => setHookTheme(e.target.value)}
                                className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                            />
                        )}

                        {mode === 'item_art' && (
                             <input 
                                type="text" placeholder="Опис предмету (напр. Палаючий меч з рунами)" 
                                value={itemDesc} onChange={e => setItemDesc(e.target.value)}
                                className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                            />
                        )}

                        {mode === 'handout' && (
                            <div className="space-y-2">
                                <select 
                                    value={handoutRecipient} 
                                    onChange={e => setHandoutRecipient(e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                                >
                                    <option value="">Усім гравцям (Public)</option>
                                    {connectedPlayers.map(p => (
                                        <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <textarea 
                                    placeholder="Текст нотатки..."
                                    value={handoutText}
                                    onChange={e => setHandoutText(e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200 h-20"
                                />
                                <input 
                                    type="text" 
                                    placeholder="URL Зображення (опціонально)"
                                    value={handoutImage}
                                    onChange={e => setHandoutImage(e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                                />
                                <button 
                                    onClick={handleSendHandout}
                                    className="w-full bg-amber-800 hover:bg-amber-700 text-stone-200 font-bold py-2 rounded flex items-center justify-center gap-2 text-sm"
                                >
                                    <Send className="w-4 h-4" /> Надіслати
                                </button>
                            </div>
                        )}

                        {mode === 'control' && (
                            <div className="space-y-4">
                                <button 
                                    onClick={onTogglePause}
                                    className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 border transition-all ${isPaused ? 'bg-red-900 border-red-500 text-white animate-pulse' : 'bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700'}`}
                                >
                                    {isPaused ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                    {isPaused ? "ВІДНОВИТИ ГРУ" : "ПОСТАВИТИ НА ПАУЗУ"}
                                </button>
                                
                                <div className="border-t border-stone-800 pt-4">
                                    <h4 className="text-sm font-bold text-stone-400 mb-2 flex items-center gap-2">Погода (Візуальні Ефекти)</h4>
                                    <div className="grid grid-cols-5 gap-2">
                                        <button onClick={() => onUpdateWeather && onUpdateWeather('none')} className="bg-stone-800 hover:bg-stone-700 p-2 rounded flex items-center justify-center text-amber-500" title="Сонячно/Ясно"><Sun className="w-4 h-4" /></button>
                                        <button onClick={() => onUpdateWeather && onUpdateWeather('rain')} className="bg-stone-800 hover:bg-stone-700 p-2 rounded flex items-center justify-center text-blue-400" title="Дощ"><CloudRain className="w-4 h-4" /></button>
                                        <button onClick={() => onUpdateWeather && onUpdateWeather('snow')} className="bg-stone-800 hover:bg-stone-700 p-2 rounded flex items-center justify-center text-white" title="Сніг"><CloudSnow className="w-4 h-4" /></button>
                                        <button onClick={() => onUpdateWeather && onUpdateWeather('fog')} className="bg-stone-800 hover:bg-stone-700 p-2 rounded flex items-center justify-center text-stone-400" title="Туман"><CloudFog className="w-4 h-4" /></button>
                                        <button onClick={() => onUpdateWeather && onUpdateWeather('ash')} className="bg-stone-800 hover:bg-stone-700 p-2 rounded flex items-center justify-center text-orange-800" title="Попіл"><Flame className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="border-t border-stone-800 pt-4">
                                    <h4 className="text-sm font-bold text-stone-400 mb-2 flex items-center gap-2"><Target className="w-4 h-4"/> Force Focus</h4>
                                    <button 
                                        onClick={() => { onClose(); if(onForceView) onForceView(10, 7); }}
                                        className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded text-sm font-bold border border-stone-600"
                                    >
                                        Активувати Фокус (Клік на Мапі)
                                    </button>
                                </div>
                            </div>
                        )}

                        {(mode === 'npc' || mode === 'loot' || mode === 'hook' || mode === 'item_art') && (
                            <button 
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full bg-amber-800 hover:bg-amber-700 text-stone-200 font-bold py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                Згенерувати
                            </button>
                        )}
                    </div>

                    {/* Result */}
                    {(mode === 'npc' || mode === 'loot' || mode === 'hook' || mode === 'item_art') && (
                        <div className="flex-1 bg-stone-950 border border-stone-800 rounded p-3 overflow-y-auto custom-scrollbar shadow-inner flex flex-col items-center">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Generated Item" className="max-w-full max-h-60 rounded shadow-lg border border-stone-700 mb-2 object-contain" />
                            ) : result ? (
                                <div className="markdown-content prose prose-invert prose-sm prose-p:my-1 w-full">
                                    <ReactMarkdown>{result}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-stone-600 text-xs italic">
                                    Результат з'явиться тут...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    {(result || imageUrl) && (mode !== 'handout' && mode !== 'control') && (
                        <div className="mt-4 flex gap-2">
                            <button 
                                onClick={() => onSendToChat(imageUrl ? `[ITEM ART] ${itemDesc}` : `**[DM Tool - ${getTitle()}]:**\n${result}`, imageUrl || undefined)}
                                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold border border-stone-600"
                            >
                                <Send className="w-3 h-3" /> В Чат
                            </button>
                            {!imageUrl && (
                                <button 
                                    onClick={() => onAddToNotes(getTitle(), result)}
                                    className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold border border-stone-600"
                                >
                                    <BookPlus className="w-3 h-3" /> В Нотатки
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default DMTools;
