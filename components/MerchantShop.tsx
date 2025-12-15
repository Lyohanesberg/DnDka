
import React, { useState, useEffect } from 'react';
import { Character, ShopItem } from '../types';
import { Coins, X, ShoppingBag, RefreshCcw, Sparkles, Shield, Sword, FlaskConical, Box, Hand, AlertCircle } from 'lucide-react';
import { generateShopInventory } from '../services/geminiService';
import { useAudio } from '../contexts/AudioContext';

interface MerchantShopProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onUpdateCharacter: (char: Character) => void;
  locationName: string;
  worldSetting: string;
}

const MerchantShop: React.FC<MerchantShopProps> = ({
  isOpen, onClose, character, onUpdateCharacter, locationName, worldSetting
}) => {
  const [shopType, setShopType] = useState<string>('General Store');
  const [inventory, setInventory] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const { playSfx } = useAudio();

  useEffect(() => {
      if (!isOpen) {
          setInventory([]);
          setMessage("");
          setShopType('General Store');
      }
  }, [isOpen]);

  const handleGenerate = async (type: string) => {
      setShopType(type);
      setIsLoading(true);
      setInventory([]);
      setMessage("Торговець розкладає товар...");
      
      try {
          const items = await generateShopInventory(locationName || "Unknown Place", type, worldSetting);
          setInventory(items);
          setMessage(`Ласкаво просимо в ${type}!`);
      } catch (e) {
          setMessage("Торговець сьогодні зачинений (помилка).");
      } finally {
          setIsLoading(false);
      }
  };

  const handleBuy = (item: ShopItem) => {
      if (character.currency.gp >= item.price) {
          const newCurrency = { ...character.currency, gp: character.currency.gp - item.price };
          const newInventory = [...character.inventory, item.name];
          
          onUpdateCharacter({
              ...character,
              currency: newCurrency,
              inventory: newInventory
          });
          playSfx('success');
          setMessage(`Ви купили ${item.name} за ${item.price} gp.`);
      } else {
          playSfx('error');
          setMessage("Недостатньо золота!");
      }
  };

  const handleSell = (itemName: string) => {
      // Simple sell logic: 50% of value? 
      // Since we don't store player item values, we'll guess or give a fixed low amount
      // Better: Ask AI to appraise? Too slow. 
      // Let's give random 1-5 GP for generic items to keep it simple for now
      const sellPrice = Math.floor(Math.random() * 5) + 1; 
      
      if (confirm(`Продати ${itemName} за ${sellPrice} gp?`)) {
          const newCurrency = { ...character.currency, gp: character.currency.gp + sellPrice };
          const newInventory = character.inventory.filter(i => i !== itemName); // Removes all instances? better remove index
          
          // Remove only one instance logic
          const index = character.inventory.indexOf(itemName);
          if (index > -1) {
              const updatedInv = [...character.inventory];
              updatedInv.splice(index, 1);
              
              onUpdateCharacter({
                  ...character,
                  currency: newCurrency,
                  inventory: updatedInv
              });
              playSfx('success');
              setMessage(`Ви продали ${itemName} за ${sellPrice} gp.`);
          }
      }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
      switch (type) {
          case 'weapon': return <Sword className="w-4 h-4 text-red-400" />;
          case 'armor': return <Shield className="w-4 h-4 text-blue-400" />;
          case 'potion': return <FlaskConical className="w-4 h-4 text-green-400" />;
          case 'magic': return <Sparkles className="w-4 h-4 text-purple-400" />;
          default: return <Box className="w-4 h-4 text-stone-400" />;
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[80vh] bg-[#2a2622] border-2 border-[#8b4513] rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#3e2723] p-4 border-b border-[#8b4513] flex justify-between items-center shadow-md relative z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-[#5d4037] rounded-full border border-[#8b4513]">
                    <ShoppingBag className="w-6 h-6 text-[#f5f5dc]" />
                </div>
                <div>
                    <h2 className="text-xl text-[#f5f5dc] fantasy-font tracking-wider">Торгова Лавка</h2>
                    <p className="text-[10px] text-[#d7ccc8] uppercase">{locationName}</p>
                </div>
            </div>
            
            {/* Shop Type Selector */}
            <div className="flex gap-2 hidden md:flex">
                {['General Store', 'Blacksmith', 'Alchemist', 'Magic Shop'].map(type => (
                    <button 
                        key={type}
                        onClick={() => handleGenerate(type)}
                        disabled={isLoading}
                        className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${shopType === type ? 'bg-[#8b4513] text-[#f5f5dc] border-[#5d4037]' : 'bg-[#2a2622] text-[#a1887f] border-[#3e2723] hover:bg-[#3e2723]'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <button onClick={onClose} className="text-[#a1887f] hover:text-[#f5f5dc] transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Mobile Selector */}
        <div className="md:hidden flex overflow-x-auto p-2 bg-[#2a2622] border-b border-[#3e2723] gap-2">
             {['General Store', 'Blacksmith', 'Alchemist', 'Magic Shop'].map(type => (
                <button 
                    key={type}
                    onClick={() => handleGenerate(type)}
                    disabled={isLoading}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded border whitespace-nowrap ${shopType === type ? 'bg-[#8b4513] text-[#f5f5dc]' : 'bg-[#1a1a1a] text-[#a1887f]'}`}
                >
                    {type}
                </button>
            ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]">
            
            {/* Left: Player Inventory */}
            <div className="w-1/2 border-r border-[#3e2723] flex flex-col bg-[#1c1917]/90">
                <div className="p-3 bg-[#2a2622] border-b border-[#3e2723] flex justify-between items-center">
                    <h3 className="text-[#f5f5dc] font-bold text-sm uppercase flex items-center gap-2">
                        <BackpackIcon className="w-4 h-4" /> Ваш Інвентар
                    </h3>
                    <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-[#3e2723]">
                        <span className="text-[#fcd34d] font-bold text-sm">{character.currency.gp}</span>
                        <span className="text-[10px] text-[#a1887f]">GP</span>
                    </div>
                </div>
                <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                    {character.inventory.length === 0 ? (
                        <div className="text-center text-[#5d4037] text-xs italic py-10">Пусто...</div>
                    ) : (
                        <div className="space-y-1">
                            {character.inventory.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-[#2a2622] border border-[#3e2723] rounded hover:bg-[#3e2723] transition-colors group">
                                    <span className="text-[#d7ccc8] text-sm truncate">{item}</span>
                                    <button 
                                        onClick={() => handleSell(item)}
                                        className="opacity-0 group-hover:opacity-100 bg-[#5d4037] text-[#f5f5dc] text-[10px] px-2 py-1 rounded hover:bg-[#8b4513] transition-all"
                                    >
                                        Продати
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Shop Inventory */}
            <div className="w-1/2 flex flex-col bg-[#2a2622]/90">
                <div className="p-3 bg-[#3e2723] border-b border-[#5d4037] flex justify-between items-center">
                    <h3 className="text-[#f5f5dc] font-bold text-sm uppercase flex items-center gap-2">
                        <Coins className="w-4 h-4" /> Асортимент
                    </h3>
                    {isLoading && <RefreshCcw className="w-4 h-4 animate-spin text-[#fcd34d]" />}
                </div>
                
                <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <RefreshCcw className="w-8 h-8 animate-spin text-[#8b4513]" />
                            <span className="text-xs text-[#a1887f]">Торговець оцінює вас...</span>
                        </div>
                    ) : inventory.length === 0 ? (
                        <div className="text-center text-[#5d4037] text-xs italic py-10">
                            Оберіть тип магазину, щоб побачити товари.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {inventory.map((item, idx) => (
                                <div key={idx} className="p-2 bg-[#1c1917] border border-[#3e2723] rounded flex flex-col gap-1 hover:border-[#8b4513] transition-colors group relative">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(item.type)}
                                            <span className="text-[#eaddcf] font-bold text-sm">{item.name}</span>
                                        </div>
                                        <span className="text-[#fcd34d] font-bold text-xs">{item.price} gp</span>
                                    </div>
                                    <p className="text-[10px] text-[#8d6e63] italic pr-16">{item.description}</p>
                                    
                                    <button 
                                        onClick={() => handleBuy(item)}
                                        className="absolute bottom-2 right-2 bg-[#8b4513] hover:bg-[#a1887f] text-[#f5f5dc] text-xs font-bold px-3 py-1 rounded shadow-md flex items-center gap-1 transition-colors"
                                    >
                                        Купити <Hand className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer Log */}
        <div className="bg-[#1c1917] p-2 border-t border-[#3e2723] text-center">
            <span className="text-xs text-[#fcd34d] italic font-serif animate-pulse">
                {message || "Торговець чекає на ваше рішення..."}
            </span>
        </div>

      </div>
    </div>
  );
};

// Simple icon for UI
const BackpackIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"/><path d="M8 10h8"/><path d="M9 18h6"/></svg>
);

export default MerchantShop;
