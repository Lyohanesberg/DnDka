import React, { useState, useEffect } from 'react';
import { Character, AbilityScores, SpellSlots, ClassItem, SKILL_DEFINITIONS } from '../types';
import { Shield, Heart, Zap, Backpack, Sword, Save, Download, User, Loader2, Sparkles, Eye, ChevronDown, RefreshCw, Dna, Footprints, Flame, Upload, Plus, Minus, Globe, Moon, Sunrise, Battery, GraduationCap, X, BookOpen, Feather, Axe, Music, Crosshair, Wand2, Ghost, Leaf, Skull, HandMetal, Brain, Star, HelpingHand, Coins } from 'lucide-react';
import { generateCharacterAvatar, generateBackstory } from '../services/geminiService';
import { findSpell } from '../data/spells';
import { getAbilityModifier, getModifierString, calculateAC, calculateProficiencyBonus, calculateDistance } from '../utils/mechanics';
import { useGameStore } from '../store';

interface CharacterSheetProps {
  character?: Character;
  onChange?: (char: Character) => void;
  readOnly?: boolean;
  onStartGame?: () => void;
  onSaveGame?: () => void;
  onLoadGame?: () => void;
  onLoadFromFile?: (file: File) => void;
  mapTokens?: any[]; 
  onTrade?: (recipientName: string, item: string) => void; 
  isMultiplayer?: boolean; 
}

// Multiclass Spell Slot Calculator
const calculateMulticlassSlots = (classes: ClassItem[]): SpellSlots => {
    let effectiveLevel = 0;
    let warlockSlots: SpellSlots = { 1: {current:0, max:0} };

    const fullCasters = ['бард', 'bard', 'жрець', 'cleric', 'druid', 'друїд', 'сорцерер', 'sorcerer', 'чародій', 'wizard', 'чарівник'];
    const halfCasters = ['paladin', 'паладин', 'ranger', 'слідопит'];
    const warlock = ['warlock', 'чаклун'];
    
    classes.forEach(c => {
        const className = c.name.toLowerCase();
        if (fullCasters.some(fc => className.includes(fc))) {
            effectiveLevel += c.level;
        } else if (halfCasters.some(hc => className.includes(hc))) {
            effectiveLevel += Math.floor(c.level / 2);
        }
        if (warlock.some(w => className.includes(w))) {
            let qty = 1;
            if (c.level >= 2) qty = 2;
            if (c.level >= 11) qty = 3;
            if (c.level >= 17) qty = 4;
            
            let lvl = 1;
            if (c.level >= 3) lvl = 2;
            if (c.level >= 5) lvl = 3;
            if (c.level >= 7) lvl = 4;
            if (c.level >= 9) lvl = 5;
            
            warlockSlots[lvl] = { current: qty, max: qty };
        }
    });

    const slots: SpellSlots = {
        1: { current: 0, max: 0 }, 2: { current: 0, max: 0 }, 3: { current: 0, max: 0 },
        4: { current: 0, max: 0 }, 5: { current: 0, max: 0 }, 6: { current: 0, max: 0 },
        7: { current: 0, max: 0 }, 8: { current: 0, max: 0 }, 9: { current: 0, max: 0 }
    };

    if (effectiveLevel === 0) {
        return Object.values(warlockSlots).some(s => s.max > 0) ? warlockSlots : slots;
    }

    if (effectiveLevel >= 1) slots[1] = { current: 2, max: 2 };
    if (effectiveLevel >= 2) slots[1] = { current: 3, max: 3 };
    if (effectiveLevel >= 3) { slots[1] = { current: 4, max: 4 }; slots[2] = { current: 2, max: 2 }; }
    if (effectiveLevel >= 4) { slots[2] = { current: 3, max: 3 }; }
    if (effectiveLevel >= 5) { slots[3] = { current: 2, max: 2 }; }
    if (effectiveLevel >= 6) { slots[3] = { current: 3, max: 3 }; }
    if (effectiveLevel >= 7) { slots[4] = { current: 1, max: 1 }; }
    if (effectiveLevel >= 8) { slots[4] = { current: 2, max: 2 }; }
    if (effectiveLevel >= 9) { slots[4] = { current: 3, max: 3 }; slots[5] = { current: 1, max: 1 }; }
    if (effectiveLevel >= 10) { slots[5] = { current: 2, max: 2 }; }
    
    Object.keys(warlockSlots).forEach((lvlStr) => {
        const lvl = parseInt(lvlStr);
        if (warlockSlots[lvl] && warlockSlots[lvl].max > 0) {
            slots[lvl].max += warlockSlots[lvl].max;
            slots[lvl].current += warlockSlots[lvl].current;
        }
    });
    
    return slots;
};

const getClassIcon = (className: string) => {
    const c = className.toLowerCase();
    if (c.includes('варвар') || c.includes('barbarian')) return <Axe className="w-5 h-5 text-red-500" />;
    if (c.includes('бард') || c.includes('bard')) return <Music className="w-5 h-5 text-pink-500" />;
    if (c.includes('воїн') || c.includes('fighter')) return <Sword className="w-5 h-5 text-stone-400" />;
    if (c.includes('друїд') || c.includes('druid')) return <Leaf className="w-5 h-5 text-green-500" />;
    if (c.includes('жрець') || c.includes('cleric')) return <Plus className="w-5 h-5 text-yellow-200" />;
    if (c.includes('монах') || c.includes('monk')) return <HandMetal className="w-5 h-5 text-blue-300" />;
    if (c.includes('паладин') || c.includes('paladin')) return <Shield className="w-5 h-5 text-amber-400" />;
    if (c.includes('плут') || c.includes('rogue')) return <Ghost className="w-5 h-5 text-stone-500" />;
    if (c.includes('слідопит') || c.includes('ranger')) return <Crosshair className="w-5 h-5 text-green-600" />;
    if (c.includes('чародій') || c.includes('sorcerer')) return <Flame className="w-5 h-5 text-orange-500" />;
    if (c.includes('чаклун') || c.includes('warlock')) return <Skull className="w-5 h-5 text-purple-500" />;
    if (c.includes('чарівник') || c.includes('wizard')) return <BookOpen className="w-5 h-5 text-blue-500" />;
    
    return <GraduationCap className="w-5 h-5 text-stone-400" />;
};

const CharacterSheet: React.FC<CharacterSheetProps> = ({ 
  character: propCharacter, 
  onChange: propOnChange, 
  readOnly = false, 
  onStartGame,
  onSaveGame,
  onLoadGame,
  onLoadFromFile,
  mapTokens,
  onTrade,
  isMultiplayer
}) => {
  const { getAllClasses, getAllRaces, getClassPreset, getRacePreset, character: storeCharacter, updateCharacter: storeUpdateCharacter } = useGameStore();
  
  const character = propCharacter || storeCharacter;
  const onChange = propOnChange || storeUpdateCharacter;

  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingBackstory, setIsGeneratingBackstory] = useState(false);

  const availableClasses = getAllClasses();
  const availableRaces = getAllRaces();

  const proficiencyBonus = calculateProficiencyBonus(character.level);

  const adjacentPlayers = React.useMemo(() => {
      if (!mapTokens || !character.name) return [];
      const myToken = mapTokens.find(t => t.id === character.name);
      if (!myToken) return [];

      return mapTokens.filter(t => {
          if (t.id === character.name || t.type === 'enemy') return false;
          const dist = calculateDistance(myToken.position, t.position);
          return dist <= 7.5; 
      });
  }, [mapTokens, character.name]);

  useEffect(() => {
      if (!character.classes || character.classes.length === 0) {
          if (character.class) {
              const preset = getClassPreset(character.class);
              const hitDie = preset ? preset.hitDie : 8;
              const initialClass: ClassItem = {
                  name: character.class,
                  level: character.level || 1,
                  hitDie: hitDie
              };
              onChange({
                  ...character,
                  classes: [initialClass]
              });
          }
      }
      
      if (!character.proficientSkills) {
          onChange({
              ...character,
              proficientSkills: []
          });
      }

      if (!character.currency) {
          onChange({
              ...character,
              currency: { pp: 0, gp: 10, ep: 0, sp: 0, cp: 0 }
          });
      }
  }, []);

  const handleStatChange = (stat: keyof AbilityScores, value: string) => {
    const numValue = parseInt(value) || 0;
    const newStats = {
      ...character.stats,
      [stat]: numValue
    };
    
    onChange({
      ...character,
      stats: newStats
    });
  };

  const handleCurrencyChange = (type: keyof typeof character.currency, value: string) => {
      const num = Math.max(0, parseInt(value) || 0);
      onChange({
          ...character,
          currency: { ...character.currency, [type]: num }
      });
  };

  const calculateStats = (className: string, raceName: string): AbilityScores => {
    let baseStats: AbilityScores = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
    
    const classPreset = getClassPreset(className);
    if (classPreset) {
       const standardArray = [15, 14, 13, 12, 10, 8];
       classPreset.primaryStats.forEach((stat, index) => {
          if (index < standardArray.length) {
            baseStats[stat] = standardArray[index];
          }
       });
    }

    const racePreset = getRacePreset(raceName);
    if (racePreset && racePreset.bonuses) {
        (Object.keys(racePreset.bonuses) as Array<keyof AbilityScores>).forEach(stat => {
            if (racePreset.bonuses[stat]) {
                baseStats[stat] += racePreset.bonuses[stat]!;
            }
        });
    }

    return baseStats;
  };

  const updateCharacterDerivedStats = (primaryClass: string, raceName: string, stats: AbilityScores) => {
    const classPreset = getClassPreset(primaryClass);
    const racePreset = getRacePreset(raceName);

    if (!classPreset) return;

    const conMod = getAbilityModifier(stats.constitution);
    const maxHp = Math.max(1, classPreset.hitDie + conMod);
    const hasShield = classPreset.inventory.some(i => i.toLowerCase().includes('щит'));

    const ac = calculateAC(
      stats.dexterity,
      stats.constitution,
      stats.wisdom,
      classPreset.armorType,
      classPreset.baseAc,
      hasShield
    );

    const speed = racePreset ? racePreset.speed : 30;
    
    const newClasses: ClassItem[] = [{
        name: primaryClass,
        level: 1,
        hitDie: classPreset.hitDie
    }];
    
    const initialSlots = calculateMulticlassSlots(newClasses);

    onChange({
        ...character,
        class: primaryClass,
        race: raceName,
        classes: newClasses,
        level: 1,
        stats: stats,
        hp: maxHp,
        maxHp: maxHp,
        ac: ac,
        speed: speed,
        inventory: classPreset.inventory,
        currency: { pp: 0, gp: 10, ep: 0, sp: 0, cp: 0 }, 
        spells: classPreset.spells || [],
        spellSlots: initialSlots,
        hitDice: { current: 1, max: 1, dieSize: classPreset.hitDie },
        deathSaves: { successes: 0, failures: 0 },
        proficientSkills: []
    });
  };

  const handlePrimaryClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClass = e.target.value;
    const newStats = calculateStats(newClass, character.race);
    updateCharacterDerivedStats(newClass, character.race, newStats);
  };

  const handleRaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRace = e.target.value;
      const newStats = calculateStats(character.class, newRace);
      if (character.class) {
          updateCharacterDerivedStats(character.class, newRace, newStats);
      } else {
          const racePreset = getRacePreset(newRace);
          onChange({
              ...character,
              race: newRace,
              stats: newStats,
              speed: racePreset ? racePreset.speed : 30
          });
      }
  };

  const handleAddClass = (className: string) => {
      if (!className) return;
      if (character.classes.some(c => c.name === className)) return; 
      
      const preset = getClassPreset(className);
      const newClass: ClassItem = {
          name: className,
          level: 1,
          hitDie: preset ? preset.hitDie : 8
      };
      
      const updatedClasses = [...character.classes, newClass];
      const totalLevel = updatedClasses.reduce((acc, c) => acc + c.level, 0);
      const newSlots = calculateMulticlassSlots(updatedClasses);

      const conMod = getAbilityModifier(character.stats.constitution);
      const hpGain = Math.floor(newClass.hitDie / 2) + 1 + conMod;

      onChange({
          ...character,
          classes: updatedClasses,
          level: totalLevel,
          spellSlots: newSlots,
          maxHp: character.maxHp + hpGain,
          hp: character.hp + hpGain
      });
  };

  const handleLevelChange = (className: string, delta: number) => {
      const updatedClasses = character.classes.map(c => {
          if (c.name === className) {
              const newLevel = c.level + delta;
              return { ...c, level: Math.max(1, newLevel) }; 
          }
          return c;
      });
      
      const totalLevel = updatedClasses.reduce((acc, c) => acc + c.level, 0);
      if (totalLevel > 20 && delta > 0) return; 

      const newSlots = calculateMulticlassSlots(updatedClasses);
      
      const targetClass = character.classes.find(c => c.name === className);
      let hpChange = 0;
      if (targetClass) {
          const conMod = getAbilityModifier(character.stats.constitution);
          const perLevel = Math.floor(targetClass.hitDie / 2) + 1 + conMod;
          hpChange = delta * Math.max(1, perLevel);
      }

      onChange({
          ...character,
          classes: updatedClasses,
          level: totalLevel,
          spellSlots: newSlots,
          maxHp: character.maxHp + hpChange,
          hp: character.hp + hpChange
      });
  };

  const handleRemoveClass = (className: string) => {
      if (character.classes.length <= 1) return; 
      
      const targetClass = character.classes.find(c => c.name === className);
      const updatedClasses = character.classes.filter(c => c.name !== className);
      const totalLevel = updatedClasses.reduce((acc, c) => acc + c.level, 0);
      const newSlots = calculateMulticlassSlots(updatedClasses);

      let hpLoss = 0;
      if (targetClass) {
          const conMod = getAbilityModifier(character.stats.constitution);
          const perLevel = Math.floor(targetClass.hitDie / 2) + 1 + conMod;
          hpLoss = targetClass.level * Math.max(1, perLevel);
      }

      onChange({
          ...character,
          classes: updatedClasses,
          level: totalLevel,
          spellSlots: newSlots,
          maxHp: Math.max(1, character.maxHp - hpLoss),
          hp: Math.max(1, character.hp - hpLoss)
      });
  };

  const handleInfoChange = <K extends keyof Character>(field: K, value: Character[K]) => {
    onChange({
      ...character,
      [field]: value
    });
  };

  const toggleSkill = (skillName: string) => {
      if (readOnly) return;
      const currentSkills = character.proficientSkills || [];
      if (currentSkills.includes(skillName)) {
          handleInfoChange('proficientSkills', currentSkills.filter(s => s !== skillName));
      } else {
          handleInfoChange('proficientSkills', [...currentSkills, skillName]);
      }
  };

  const toggleSpellSlot = (level: number, index: number) => {
      if (!character.spellSlots) return;
      const slot = character.spellSlots[level];
      if (!slot) return;
      
      let newCurrent = slot.current;
      if (index < slot.current) {
          newCurrent = slot.current - 1;
      } else {
          newCurrent = slot.current + 1;
      }

      onChange({
          ...character,
          spellSlots: {
              ...character.spellSlots,
              [level]: { ...slot, current: Math.max(0, Math.min(slot.max, newCurrent)) }
          }
      });
  };

  const recalculateSlots = () => {
      const slots = calculateMulticlassSlots(character.classes || []);
      onChange({ ...character, spellSlots: slots });
  };
  
  const handleShortRest = () => {
      const hitDieSize = character.classes?.[0]?.hitDie || 8;

      if (character.hitDice.current > 0) {
          const roll = Math.floor(Math.random() * hitDieSize) + 1;
          const conMod = getAbilityModifier(character.stats.constitution);
          const healAmount = Math.max(0, roll + conMod);
          
          const newHp = Math.min(character.maxHp, character.hp + healAmount);
          
          onChange({
              ...character,
              hp: newHp,
              hitDice: { ...character.hitDice, current: character.hitDice.current - 1 },
              deathSaves: { successes: 0, failures: 0 } 
          });
          alert(`Короткий відпочинок: Відновлено ${healAmount} HP (Roll: ${roll} + Con: ${conMod}).`);
      } else {
          alert("У вас закінчилися Кістки Хітів (Hit Dice).");
      }
  };

  const handleLongRest = () => {
      const newHp = character.maxHp;
      const newSlots = { ...character.spellSlots };
      Object.keys(newSlots).forEach((lvl: any) => {
          newSlots[lvl].current = newSlots[lvl].max;
      });
      const regainedHD = Math.max(1, Math.floor(character.hitDice.max / 2));
      const newHDCurrent = Math.min(character.hitDice.max, character.hitDice.current + regainedHD);

      onChange({
          ...character,
          hp: newHp,
          spellSlots: newSlots,
          hitDice: { ...character.hitDice, current: newHDCurrent },
          deathSaves: { successes: 0, failures: 0 }
      });
  };

  const handleSaveClick = () => {
    if (onSaveGame) {
      onSaveGame();
      setSaveFeedback("Гру збережено!");
      setTimeout(() => setSaveFeedback(null), 2000);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!character.race || !character.class) {
      alert("Вкажіть Расу та Клас перед генерацією портрету.");
      return;
    }
    
    setIsGeneratingAvatar(true);
    try {
      const avatarUrl = await generateCharacterAvatar(character);
      if (avatarUrl) {
        handleInfoChange('avatarUrl', avatarUrl);
      } else {
        alert("Не вдалося згенерувати зображення. Спробуйте пізніше або перевірте API ключ.");
      }
    } catch (e) {
      console.error(e);
      alert("Помилка генерації.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleGenerateBackstory = async () => {
      if (!character.race || !character.class || !character.name) {
          alert("Спочатку заповніть базові дані.");
          return;
      }
      setIsGeneratingBackstory(true);
      try {
          const story = await generateBackstory(character);
          if (story) {
              handleInfoChange('backstory', story);
          }
      } catch (e) {
          console.error(e);
          alert("Помилка генерації історії.");
      } finally {
          setIsGeneratingBackstory(false);
      }
  };

  const renderSpellItem = (spellName: string, idx: number) => {
      const def = findSpell(spellName);
      return (
          <li key={idx} className="flex items-center justify-between text-xs text-stone-300 bg-stone-900/40 px-2 py-1 rounded mb-1">
              <span>{spellName}</span>
              {def && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 ${def.level === 0 ? 'text-stone-400' : 'text-amber-500'}`}>
                      {def.level === 0 ? 'C' : `L${def.level}`}
                  </span>
              )}
          </li>
      );
  };

  const inputClass = "w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 focus:border-amber-500 focus:outline-none transition-colors text-sm";
  const labelClass = "block text-xs text-stone-500 uppercase mb-1 font-bold tracking-wider";

  const availableClassesToAdd = availableClasses.filter(c => !character.classes?.some(existing => existing.name === c));

  return (
    <div className="bg-stone-800 rounded-lg shadow-lg overflow-hidden border border-stone-700 h-full flex flex-col">
      <div className="bg-stone-900 p-4 border-b border-stone-700 flex justify-between items-center">
        <h2 className="text-xl text-amber-500 fantasy-font flex items-center gap-2">
           <Shield className="w-5 h-5" /> Лист Персонажа
        </h2>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center mb-4 relative group">
          <div className="w-32 h-32 rounded-full border-4 border-stone-700 bg-stone-900 overflow-hidden shadow-xl relative transition-transform hover:scale-105">
            {character.avatarUrl ? (
              <img src={character.avatarUrl} alt="Character Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600">
                <User className="w-16 h-16" />
              </div>
            )}
            
            {isGeneratingAvatar && (
               <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                 <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
               </div>
            )}

            {!isGeneratingAvatar && (
              <div 
                 className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" 
                 onClick={handleGenerateAvatar}
                 title="Клікніть, щоб оновити портрет на основі спорядження"
              >
                 <span className="text-amber-500 text-xs font-bold flex flex-col items-center gap-1 text-center px-2">
                    <Sparkles className="w-4 h-4" />
                    {readOnly ? "ОНОВИТИ" : "СТВОРИТИ"}
                 </span>
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                    <label className={labelClass}>Ім'я</label>
                    <input 
                    type="text" 
                    value={character.name} 
                    onChange={(e) => handleInfoChange('name', e.target.value)}
                    disabled={readOnly}
                    className={inputClass}
                    placeholder="Введіть ім'я..."
                    />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Стать</label>
                    <select
                        value={character.gender}
                        onChange={(e) => handleInfoChange('gender', e.target.value)}
                        disabled={readOnly}
                        className={inputClass}
                    >
                        <option value="Чоловіча">Чоловіча</option>
                        <option value="Жіноча">Жіноча</option>
                        <option value="Невизначена">Невизначена</option>
                    </select>
                </div>
                 <div className="md:col-span-4 relative">
                    <label className={labelClass}>Світ / Сеттинг</label>
                     <input 
                     type="text" 
                     value={character.worldSetting || "Стандартний"} 
                     disabled={true}
                     className={`${inputClass} opacity-70 cursor-not-allowed`}
                     />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <label className={labelClass}>Раса</label>
                    {readOnly ? (
                    <input 
                    type="text" 
                    value={character.race} 
                    disabled={true}
                    className={inputClass}
                    />
                    ) : (
                    <div className="relative group">
                        <select 
                            value={character.race} 
                            onChange={handleRaceChange}
                            className={`${inputClass} appearance-none cursor-pointer pr-8 ${!character.race ? 'text-stone-500' : ''}`}
                        >
                            <option value="" disabled>Оберіть расу...</option>
                            {availableRaces.map((r) => (
                                <option key={r} value={r} className="text-stone-200">{r}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1.5 w-4 h-4 text-stone-500 pointer-events-none" />
                    </div>
                    )}
                </div>

                {!readOnly && (!character.classes || character.classes.length === 0) && (
                    <div className="relative">
                        <label className={labelClass}>Початковий Клас</label>
                        <div className="flex items-center gap-2">
                            {character.class && (
                                <div className="w-7 h-7 flex items-center justify-center bg-stone-900 rounded border border-stone-700 shrink-0">
                                    {getClassIcon(character.class)}
                                </div>
                            )}
                            <div className="relative group flex-1">
                                <select 
                                    value={character.class} 
                                    onChange={handlePrimaryClassChange}
                                    className={`${inputClass} appearance-none cursor-pointer pr-8 ${!character.class ? 'text-stone-500' : ''}`}
                                >
                                    <option value="" disabled>Оберіть клас...</option>
                                    {availableClasses.map((cls) => (
                                        <option key={cls} value={cls} className="text-stone-200">{cls}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1.5 w-4 h-4 text-stone-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

             {character.classes && character.classes.length > 0 && (
                 <div className="bg-stone-900/50 p-2 rounded border border-stone-700/50">
                    <label className={`${labelClass} flex justify-between`}>
                        <span className="flex items-center gap-2"><GraduationCap className="w-3 h-3"/> Класи та Рівні</span>
                        <div className="flex items-center gap-3">
                           <span className="text-amber-500 text-[10px] bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-900/50">
                              PB: +{proficiencyBonus}
                           </span>
                           <span className="text-stone-300">Total Level: {character.level}</span>
                        </div>
                    </label>
                    <div className="space-y-2">
                        {character.classes.map((cls, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-stone-800 p-2 rounded border border-stone-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex items-center justify-center bg-stone-900 rounded border border-stone-700 shadow-inner">
                                        {getClassIcon(cls.name)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-stone-200">{cls.name}</span>
                                        <span className="text-[10px] text-stone-500">Hit Die: d{cls.hitDie}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!readOnly && (
                                        <button 
                                            onClick={() => handleLevelChange(cls.name, -1)}
                                            className="w-5 h-5 flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-stone-400 hover:text-white"
                                            disabled={cls.level <= 1}
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                    )}
                                    <span className="w-6 text-center text-sm font-bold text-amber-500">{cls.level}</span>
                                    {!readOnly && (
                                        <button 
                                            onClick={() => handleLevelChange(cls.name, 1)}
                                            className="w-5 h-5 flex items-center justify-center bg-stone-900 border border-stone-600 rounded text-stone-400 hover:text-white"
                                            disabled={character.level >= 20}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    )}
                                    {!readOnly && character.classes.length > 1 && (
                                        <button 
                                            onClick={() => handleRemoveClass(cls.name)}
                                            className="ml-2 w-5 h-5 flex items-center justify-center hover:bg-red-900/50 rounded text-stone-600 hover:text-red-500 transition-colors"
                                            title="Видалити клас"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {!readOnly && character.level < 20 && (
                            <div className="relative group">
                                <select 
                                    value=""
                                    onChange={(e) => handleAddClass(e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 border-dashed rounded p-1 text-xs text-stone-400 text-center hover:text-amber-500 hover:border-amber-700 cursor-pointer appearance-none"
                                >
                                    <option value="" disabled>+ Додати Мультиклас</option>
                                    {availableClassesToAdd.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                 </div>
             )}
        </div>

        <div className="bg-stone-900/50 p-3 rounded border border-stone-700/50">
          <h3 className="text-stone-400 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Heart className="w-4 h-4 text-red-600" /> Бойові Параметри
          </h3>
          <div className="flex gap-4">
             <div className="flex-1 text-center">
                <label className={labelClass}>AC (Захист)</label>
                <div className="relative flex items-center justify-center h-12">
                    <Shield className="w-10 h-10 text-stone-700 absolute" />
                    <input 
                        type="number" 
                        value={character.ac}
                        onChange={(e) => handleInfoChange('ac', parseInt(e.target.value) || 10)}
                        disabled={readOnly}
                        className="w-full text-center bg-transparent text-xl font-bold text-amber-500 focus:outline-none z-10 relative"
                    />
                </div>
             </div>
             <div className="flex-1 text-center border-l border-r border-stone-700 px-2">
                <label className={labelClass}>Швидкість</label>
                 <div className="flex items-center justify-center h-12 gap-1 text-stone-400">
                    <Footprints className="w-5 h-5" />
                    <span className="text-xl font-bold text-stone-200">{character.speed || 30}</span>
                    <span className="text-xs mt-2">ft</span>
                 </div>
             </div>
             <div className="flex-1 text-center pl-2">
                <label className={labelClass}>HP</label>
                <div className="flex items-center justify-center gap-2 h-12">
                    <input 
                        type="number" 
                        value={character.hp}
                        onChange={(e) => handleInfoChange('hp', parseInt(e.target.value) || 0)}
                        className="w-14 text-right bg-stone-800/50 rounded px-1 text-xl font-bold text-red-500 border border-stone-600 focus:border-red-500 focus:outline-none"
                    />
                    <span className="text-stone-500 text-xl">/</span>
                    <input 
                        type="number" 
                        value={character.maxHp}
                        onChange={(e) => handleInfoChange('maxHp', parseInt(e.target.value) || 1)}
                        disabled={readOnly}
                        className="w-14 text-left bg-transparent text-sm font-bold text-stone-400 focus:outline-none"
                    />
                </div>
             </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end border-b border-stone-700 pb-1 mb-3">
             <h3 className="text-stone-400 text-sm font-bold flex items-center gap-2">
               <Zap className="w-4 h-4 text-amber-600" /> Характеристики
             </h3>
             {!readOnly && character.class && character.race && character.classes.length <= 1 && (
                <button 
                  onClick={() => {
                      const newStats = calculateStats(character.class, character.race);
                      updateCharacterDerivedStats(character.class, character.race, newStats);
                  }}
                  className="text-[10px] text-amber-600 hover:text-amber-500 flex items-center gap-1 uppercase font-bold tracking-wider transition-colors"
                  title="Скинути до стандартних значень класу + раси"
                >
                  <RefreshCw className="w-3 h-3" /> Скинути
                </button>
             )}
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(character.stats) as Array<keyof AbilityScores>).map((stat) => (
              <div key={stat} className="bg-stone-900 p-2 rounded border border-stone-700 text-center relative">
                <label className="block text-[10px] text-stone-500 uppercase mb-1 truncate">
                  {stat.slice(0,3)}
                </label>
                {readOnly ? (
                  <div className="text-lg font-bold text-stone-200">{character.stats[stat]}</div>
                ) : (
                  <input 
                    type="number" 
                    value={character.stats[stat]}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-stone-200 focus:outline-none"
                  />
                )}
                <div className="text-xs text-amber-600 font-bold mt-1">
                  {getModifierString(character.stats[stat])}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
           <h3 className="text-stone-400 text-sm font-bold mb-3 border-b border-stone-700 pb-1 flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-600" /> Навички
           </h3>
           <div className="bg-stone-900/50 rounded border border-stone-800 p-2 text-xs space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
               {SKILL_DEFINITIONS.map(skill => {
                   const isProficient = character.proficientSkills?.includes(skill.name);
                   const abilityMod = getAbilityModifier(character.stats[skill.ability]);
                   const totalMod = abilityMod + (isProficient ? proficiencyBonus : 0);
                   const modString = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

                   return (
                       <div key={skill.name} className={`flex items-center justify-between p-1.5 rounded hover:bg-stone-800 ${isProficient ? 'bg-amber-900/10' : ''}`}>
                           <div className="flex items-center gap-2">
                               <button 
                                  onClick={() => toggleSkill(skill.name)}
                                  disabled={readOnly}
                                  className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${isProficient ? 'bg-amber-500 border-amber-500' : 'bg-stone-900 border-stone-600 hover:border-stone-400'}`}
                               >
                                   {isProficient && <div className="w-1.5 h-1.5 bg-stone-900 rounded-full" />}
                               </button>
                               <span className={`text-stone-300 ${isProficient ? 'font-bold text-amber-100' : ''}`}>{skill.name}</span>
                           </div>
                           <span className={`font-mono font-bold ${isProficient ? 'text-amber-500' : 'text-stone-500'}`}>
                               {modString}
                           </span>
                       </div>
                   );
               })}
           </div>
        </div>

        {/* Spells */}
        <div>
           <div className="flex justify-between items-center border-b border-stone-700 pb-1 mb-3">
                <h3 className="text-stone-400 text-sm font-bold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-600" /> Закляття
                </h3>
                <button 
                    onClick={recalculateSlots}
                    className="text-[10px] text-stone-500 hover:text-amber-500 flex items-center gap-1 uppercase"
                    title="Авто-розрахунок чарунок на основі мультикласу"
                >
                    <RefreshCw className="w-3 h-3" /> Чарунки
                </button>
           </div>

           {character.spellSlots && Object.values(character.spellSlots).some(s => s.max > 0) && (
               <div className="mb-4 bg-stone-900/50 p-2 rounded border border-stone-800">
                   <label className={labelClass}>Чарунки Заклинань</label>
                   <div className="grid grid-cols-3 gap-2">
                       {[1,2,3,4,5,6,7,8,9].map(lvl => {
                           const slot = character.spellSlots[lvl];
                           if (!slot || slot.max === 0) return null;
                           return (
                               <div key={lvl} className="flex items-center justify-between bg-stone-950 px-2 py-1 rounded border border-stone-800">
                                   <span className="text-xs text-stone-400 font-bold">L{lvl}</span>
                                   <div className="flex gap-1">
                                       {Array.from({length: slot.max}).map((_, i) => (
                                           <button 
                                              key={i}
                                              onClick={() => toggleSpellSlot(lvl, i)}
                                              className={`w-3 h-3 rounded-full border transition-colors ${i < slot.current ? 'bg-amber-500 border-amber-600' : 'bg-stone-900 border-stone-700'}`}
                                              title={i < slot.current ? "Доступна (Клік щоб витратити)" : "Витрачена (Клік щоб відновити)"}
                                           />
                                       ))}
                                   </div>
                               </div>
                           )
                       })}
                   </div>
               </div>
           )}

          {readOnly ? (
            <ul className="space-y-1 pl-2">
               {character.spells && character.spells.length > 0 ? character.spells.map((spell, idx) => (
                  renderSpellItem(spell, idx)
               )) : <li className="text-stone-500 italic text-xs">Пусто</li>}
            </ul>
          ) : (
             <textarea 
              value={character.spells ? character.spells.join('\n') : ''}
              onChange={(e) => handleInfoChange('spells', e.target.value.split('\n'))}
              className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-300 h-24 focus:border-amber-500 focus:outline-none"
              placeholder="Одне закляття на рядок..."
             />
          )}
        </div>

        {/* Inventory */}
        <div>
           <h3 className="text-stone-400 text-sm font-bold mb-3 border-b border-stone-700 pb-1 flex items-center gap-2">
            <Backpack className="w-4 h-4 text-amber-600" /> Інвентар
          </h3>
          
          <div className="bg-stone-900 border border-stone-800 rounded p-2 mb-3 flex justify-between items-center text-xs">
              <div className="flex flex-col items-center w-1/5">
                  <span className="text-[10px] text-stone-500 uppercase">PP</span>
                  <input 
                    type="number" 
                    value={character.currency?.pp || 0}
                    onChange={(e) => handleCurrencyChange('pp', e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-stone-300 focus:outline-none"
                  />
              </div>
              <div className="flex flex-col items-center w-1/5 border-l border-stone-800">
                  <span className="text-[10px] text-amber-500 uppercase">GP</span>
                  <input 
                    type="number" 
                    value={character.currency?.gp || 0}
                    onChange={(e) => handleCurrencyChange('gp', e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-amber-400 focus:outline-none"
                  />
              </div>
              <div className="flex flex-col items-center w-1/5 border-l border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase">EP</span>
                  <input 
                    type="number" 
                    value={character.currency?.ep || 0}
                    onChange={(e) => handleCurrencyChange('ep', e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-stone-300 focus:outline-none"
                  />
              </div>
              <div className="flex flex-col items-center w-1/5 border-l border-stone-800">
                  <span className="text-[10px] text-gray-400 uppercase">SP</span>
                  <input 
                    type="number" 
                    value={character.currency?.sp || 0}
                    onChange={(e) => handleCurrencyChange('sp', e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-gray-300 focus:outline-none"
                  />
              </div>
              <div className="flex flex-col items-center w-1/5 border-l border-stone-800">
                  <span className="text-[10px] text-orange-800 uppercase">CP</span>
                  <input 
                    type="number" 
                    value={character.currency?.cp || 0}
                    onChange={(e) => handleCurrencyChange('cp', e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-orange-700 focus:outline-none"
                  />
              </div>
          </div>

          {readOnly ? (
            <ul className="list-disc list-inside text-sm text-stone-300 space-y-1 pl-2">
              {character.inventory.length > 0 ? character.inventory.map((item, idx) => {
                  const canTrade = adjacentPlayers.length > 0 && onTrade;
                  return (
                    <li key={idx} className="flex items-center justify-between group">
                        <span>{item}</span>
                        {canTrade && (
                            <div className="relative group/trade">
                                <button className="text-stone-500 hover:text-amber-500 p-1"><HelpingHand className="w-3 h-3" /></button>
                                <div className="absolute right-0 top-full z-50 bg-stone-900 border border-stone-700 rounded shadow-xl hidden group-hover/trade:block p-1 min-w-[100px]">
                                    <div className="text-[8px] text-stone-500 uppercase p-1 border-b border-stone-800">Передати:</div>
                                    {adjacentPlayers.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => onTrade && onTrade(p.id, item)}
                                            className="block w-full text-left text-[10px] p-1 hover:bg-stone-800 text-stone-300"
                                        >
                                            {p.id}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </li>
                  );
              }) : <li className="text-stone-500 italic">Пусто</li>}
            </ul>
          ) : (
            <textarea 
              value={character.inventory.join('\n')}
              onChange={(e) => handleInfoChange('inventory', e.target.value.split('\n'))}
              className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-300 h-32 focus:border-amber-500 focus:outline-none"
              placeholder="Один предмет на рядок..."
            />
          )}
        </div>

         {/* Bio */}
         <div>
            <div className="flex justify-between items-center border-b border-stone-700 pb-1 mb-3">
               <h3 className="text-stone-400 text-sm font-bold flex items-center gap-2">
                   <BookOpen className="w-4 h-4 text-amber-600" /> Біографія
               </h3>
               {!readOnly && (
                   <button 
                      onClick={handleGenerateBackstory}
                      disabled={isGeneratingBackstory}
                      className="text-[10px] bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-500 px-2 py-0.5 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                   >
                       {isGeneratingBackstory ? <Loader2 className="w-3 h-3 animate-spin" /> : <Feather className="w-3 h-3" />}
                       ШІ Генерація
                   </button>
               )}
            </div>
            
            <textarea 
               value={character.backstory || ""}
               onChange={(e) => handleInfoChange('backstory', e.target.value)}
               disabled={readOnly && !character.backstory}
               className={`w-full bg-stone-900 border border-stone-700 rounded p-2 text-xs md:text-sm text-stone-300 h-40 focus:border-amber-500 focus:outline-none font-serif leading-relaxed italic ${readOnly ? 'resize-none border-transparent bg-transparent pl-0' : ''}`}
               placeholder={readOnly ? "Історія невідома..." : "Напишіть або згенеруйте передісторію..."}
            />
         </div>
      </div>
      
      {/* Footer Buttons */}
      <div className="p-4 bg-stone-900 border-t border-stone-700 flex flex-col gap-3">
        {!readOnly && (
          <div className="flex flex-col gap-2">
            {!isMultiplayer && onStartGame && (
              <button 
                onClick={onStartGame}
                disabled={!character.name || !character.class || !character.race}
                className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded shadow-lg border border-amber-500 text-lg fantasy-font tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sword className="w-5 h-5" /> ПОЧАТИ ПРИГОДУ
              </button>
            )}
            
            <div className="flex gap-2">
                {onLoadGame && (
                <button 
                    onClick={onLoadGame}
                    className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 font-bold py-2 px-2 rounded border border-stone-600 text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                    title="Продовжити останню гру з браузера"
                >
                    <Download className="w-4 h-4" /> Продовжити
                </button>
                )}
                
                {onLoadFromFile && (
                    <label className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 font-bold py-2 px-2 rounded border border-stone-600 text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" /> З Файлу
                        <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    onLoadFromFile(e.target.files[0]);
                                    e.target.value = '';
                                }
                            }} 
                        />
                    </label>
                )}
            </div>
          </div>
        )}

        {readOnly && (
          <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                  <button 
                     onClick={handleShortRest}
                     className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 py-2 rounded text-xs font-bold flex items-center justify-center gap-2"
                     title={`Витратити 1 Hit Die для відновлення HP`}
                  >
                     <Battery className="w-3 h-3" /> Короткий Відп.
                  </button>
                  <button 
                     onClick={handleLongRest}
                     className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 py-2 rounded text-xs font-bold flex items-center justify-center gap-2"
                     title="Відновити всі HP, Чарунки та 1/2 Hit Dice"
                  >
                     <Moon className="w-3 h-3" /> Довгий Відп.
                  </button>
              </div>
              
              {onSaveGame && (
                <button 
                    onClick={handleSaveClick}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-amber-500 font-bold py-2 px-4 rounded border border-stone-600 shadow text-sm tracking-wider transition-all flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" /> 
                    {saveFeedback || "ЗБЕРЕГТИ ГРУ"}
                </button>
               )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;