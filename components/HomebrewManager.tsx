
import React, { useState } from 'react';
import { CustomSpell, CustomMonster } from '../types';
import { X, Zap, Skull, Plus, Trash2, GripVertical, Wand2, Loader2, Info } from 'lucide-react';
import { generateMonsterStatBlock } from '../services/geminiService';

interface HomebrewManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customSpells: CustomSpell[];
  onAddSpell: (spell: CustomSpell) => void;
  onRemoveSpell: (id: string) => void;
  customMonsters: CustomMonster[];
  onAddMonster: (monster: CustomMonster) => void;
  onRemoveMonster: (id: string) => void;
}

const HomebrewManager: React.FC<HomebrewManagerProps> = ({
  isOpen, onClose,
  customSpells, onAddSpell, onRemoveSpell,
  customMonsters, onAddMonster, onRemoveMonster
}) => {
  const [activeTab, setActiveTab] = useState<'spells' | 'monsters'>('spells');
  const [isGenerating, setIsGenerating] = useState(false);

  // Spell Form
  const [spellName, setSpellName] = useState('');
  const [spellLevel, setSpellLevel] = useState(1);
  const [spellType, setSpellType] = useState<any>('Attack');
  const [spellSchool, setSpellSchool] = useState('Evocation');
  const [spellDesc, setSpellDesc] = useState('');

  // Monster Form
  const [monsterDesc, setMonsterDesc] = useState('');

  const handleAddSpell = () => {
    if (!spellName) return;
    const newSpell: CustomSpell = {
      id: Math.random().toString(36).substr(2, 9),
      name: spellName,
      level: spellLevel,
      type: spellType,
      school: spellSchool,
      description: spellDesc
    };
    onAddSpell(newSpell);
    setSpellName('');
    setSpellDesc('');
  };

  const handleGenerateMonster = async () => {
    if (!monsterDesc) return;
    setIsGenerating(true);
    try {
      const monster = await generateMonsterStatBlock(monsterDesc);
      if (monster) {
        onAddMonster(monster);
        setMonsterDesc('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragMonster = (e: React.DragEvent, monster: CustomMonster) => {
      const dragData = {
          name: monster.name,
          hp: monster.hp,
          ac: monster.ac,
          size: monster.size,
          type: 'custom_monster'
      };
      e.dataTransfer.setData('dnd-monster', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border-2 border-purple-800 rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-purple-950/30 p-4 border-b border-purple-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-purple-300 fantasy-font tracking-widest flex items-center gap-2">
            <Wand2 className="w-6 h-6" /> Майстерня (Homebrew)
          </h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-700">
          <button 
            onClick={() => setActiveTab('spells')}
            className={`flex-1 py-3 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'spells' ? 'bg-stone-800 text-purple-400 border-b-2 border-purple-500' : 'text-stone-500 hover:bg-stone-800'}`}
          >
            <Zap className="w-4 h-4" /> Мої Закляття
          </button>
          <button 
            onClick={() => setActiveTab('monsters')}
            className={`flex-1 py-3 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'monsters' ? 'bg-stone-800 text-red-400 border-b-2 border-red-500' : 'text-stone-500 hover:bg-stone-800'}`}
          >
            <Skull className="w-4 h-4" /> Мої Монстри
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-stone-950">
          
          {/* SPELLS TAB */}
          {activeTab === 'spells' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Form */}
              <div className="bg-stone-900 p-4 rounded border border-stone-700">
                <h3 className="text-stone-300 font-bold mb-4 border-b border-stone-700 pb-2">Створити Закляття</h3>
                <div className="space-y-3">
                  <input 
                    type="text" placeholder="Назва Закляття"
                    value={spellName} onChange={e => setSpellName(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
                  />
                  <div className="flex gap-2">
                    <select value={spellLevel} onChange={e => setSpellLevel(Number(e.target.value))} className="bg-stone-800 border border-stone-600 rounded px-2 py-2 text-sm text-stone-300 flex-1">
                      <option value={0}>Cantrip</option>
                      {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                    <select value={spellType} onChange={e => setSpellType(e.target.value)} className="bg-stone-800 border border-stone-600 rounded px-2 py-2 text-sm text-stone-300 flex-1">
                      <option value="Attack">Attack</option>
                      <option value="Save">Save</option>
                      <option value="Heal">Heal</option>
                      <option value="Utility">Utility</option>
                      <option value="Buff">Buff</option>
                      <option value="Debuff">Debuff</option>
                    </select>
                  </div>
                  <select value={spellSchool} onChange={e => setSpellSchool(e.target.value)} className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-2 text-sm text-stone-300">
                      <option value="Evocation">Evocation</option>
                      <option value="Conjuration">Conjuration</option>
                      <option value="Necromancy">Necromancy</option>
                      <option value="Illusion">Illusion</option>
                      <option value="Enchantment">Enchantment</option>
                      <option value="Divination">Divination</option>
                      <option value="Abjuration">Abjuration</option>
                      <option value="Transmutation">Transmutation</option>
                  </select>
                  <textarea 
                    placeholder="Опис ефекту..."
                    value={spellDesc} onChange={e => setSpellDesc(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 h-24"
                  />
                  <button onClick={handleAddSpell} className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Додати
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                {customSpells.map(spell => (
                  <div key={spell.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex justify-between items-start group">
                    <div>
                      <div className="font-bold text-purple-300 text-sm">{spell.name}</div>
                      <div className="text-[10px] text-stone-500 uppercase">{spell.school} • {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`} • {spell.type}</div>
                      <div className="text-xs text-stone-400 mt-1">{spell.description}</div>
                    </div>
                    <button onClick={() => onRemoveSpell(spell.id)} className="text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {customSpells.length === 0 && <div className="text-stone-600 italic text-center text-sm mt-10">Немає власних заклять.</div>}
              </div>
            </div>
          )}

          {/* MONSTERS TAB */}
          {activeTab === 'monsters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Generator Form */}
               <div className="bg-stone-900 p-4 rounded border border-stone-700">
                <h3 className="text-stone-300 font-bold mb-4 border-b border-stone-700 pb-2">ШІ Генератор Монстрів</h3>
                <div className="space-y-3">
                  <p className="text-xs text-stone-500">Опишіть монстра, і ШІ створить його характеристики для використання на мапі.</p>
                  <textarea 
                    placeholder="Наприклад: Кібернетичний орк з лазерною гарматою замість руки..."
                    value={monsterDesc} onChange={e => setMonsterDesc(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 h-32"
                  />
                  <button 
                    onClick={handleGenerateMonster} 
                    disabled={isGenerating || !monsterDesc}
                    className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Згенерувати Стат-блок
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                {customMonsters.map(monster => (
                  <div 
                    key={monster.id} 
                    className="bg-stone-800 p-3 rounded border border-stone-700 flex justify-between items-center group cursor-grab active:cursor-grabbing hover:border-amber-500"
                    draggable
                    onDragStart={(e) => handleDragMonster(e, monster)}
                  >
                    <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-stone-600" />
                        <div>
                            <div className="font-bold text-red-300 text-sm">{monster.name}</div>
                            <div className="text-[10px] text-stone-500 flex gap-2">
                                <span>HP: {monster.hp}</span>
                                <span>AC: {monster.ac}</span>
                                <span>{monster.size}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-stone-500 italic max-w-[100px] truncate mr-2 hidden md:block" title={monster.description}>{monster.description}</div>
                        <button onClick={() => onRemoveMonster(monster.id)} className="text-stone-600 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                ))}
                
                {customMonsters.length === 0 ? (
                    <div className="text-stone-600 italic text-center text-sm mt-10">Немає власних монстрів.</div>
                ) : (
                    <div className="mt-4 text-center text-[10px] text-amber-500 flex items-center justify-center gap-1">
                        <Info className="w-3 h-3" /> Перетягніть монстра на мапу, щоб додати токен.
                    </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HomebrewManager;
