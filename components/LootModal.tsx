

import React, { useState, useEffect } from 'react';
import { MapObject, Character } from '../types';
import { X, Box, Loader2, Hand, Sparkles } from 'lucide-react';
import { generateDMContent } from '../services/geminiService';

interface LootModalProps {
  isOpen: boolean;
  onClose: () => void;
  chest: MapObject;
  character: Character;
  onLootTake: (item: string) => void;
  onLootUpdate: (loot: string[]) => void;
}

const LootModal: React.FC<LootModalProps> = ({ 
    isOpen, onClose, chest, character, onLootTake, onLootUpdate 
}) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<string[]>(chest.loot || []);

    useEffect(() => {
        if (isOpen && !chest.lootGenerated && items.length === 0 && !loading) {
            generateLoot();
        } else if (chest.loot) {
            setItems(chest.loot);
        }
    }, [isOpen, chest]);

    const generateLoot = async () => {
        setLoading(true);
        const prompt = `Generate a list of 3-6 interesting fantasy loot items found in a container described as "${chest.description || 'Chest'}". 
        Context: D&D 5e. Level ${character.level}.
        Format: Plain text list, one item per line. No bullets, no numbers.`;
        
        try {
            const text = await generateDMContent(prompt, character.worldSetting);
            const newItems = text.split('\n')
                .map(line => line.replace(/^[-*•\d\.]+\s*/, '').trim())
                .filter(line => line.length > 2);
            
            setItems(newItems);
            onLootUpdate(newItems);
        } catch (e) {
            console.error(e);
            setItems(["Old boot", "Rusty dagger"]);
        } finally {
            setLoading(false);
        }
    };

    const handleTake = (item: string) => {
        onLootTake(item);
        const newItems = items.filter(i => i !== item);
        setItems(newItems);
        onLootUpdate(newItems);
    };

    const handleTakeAll = () => {
        items.forEach(item => onLootTake(item));
        setItems([]);
        onLootUpdate([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transform scale-100">
                {/* Header */}
                <div className="bg-amber-950/50 p-4 border-b border-amber-800 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-amber-500 font-bold uppercase tracking-widest">
                        <Box className="w-6 h-6" /> {chest.description || "Скриня"}
                    </div>
                    <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 min-h-[200px] max-h-[60vh] overflow-y-auto custom-scrollbar bg-stone-900/95 relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-amber-600/80 py-10">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <span className="text-xs uppercase font-bold tracking-widest animate-pulse">Ідентифікація предметів...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center text-stone-600 italic py-10 flex flex-col items-center gap-2">
                            <Box className="w-12 h-12 opacity-20" />
                            Тут пусто.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {items.map((item, idx) => (
                                <li key={idx} className="flex items-center justify-between p-3 bg-stone-800/50 border border-stone-700 rounded-lg group hover:bg-stone-800 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-4 h-4 text-amber-500/50 group-hover:text-amber-400" />
                                        <span className="text-stone-300 font-serif group-hover:text-white transition-colors">{item}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleTake(item)}
                                        className="p-2 bg-stone-700 hover:bg-green-900/50 text-stone-400 hover:text-green-400 rounded transition-colors"
                                        title="Забрати"
                                    >
                                        <Hand className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-stone-950 border-t border-stone-800 flex justify-between gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-400 font-bold rounded border border-stone-700 transition-colors"
                    >
                        Закрити
                    </button>
                    {items.length > 0 && (
                        <button 
                            onClick={handleTakeAll}
                            className="flex-1 py-3 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded shadow-lg border border-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Hand className="w-4 h-4" /> Забрати Все
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LootModal;
