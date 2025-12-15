




import React, { useState, useMemo } from 'react';
import { TurnState, Character, Combatant, MapToken, MapObject, CustomSpell } from '../types';
import { Sword, Zap, Footprints, Shield, RefreshCw, Play, FastForward, Wind, X, Crosshair, User, Skull, Flame, Book, ChevronRight, HeartPulse, Dna, Box, DoorClosed, Trees, Mountain } from 'lucide-react';
import DiceRoller from './DiceRoller';
import { findSpell, SpellDefinition } from '../data/spells';

interface CombatActionsPanelProps {
  turnState: TurnState;
  character: Character;
  combatants: Combatant[];
  onAction: (type: 'main' | 'bonus' | 'move' | 'reaction', actionName: string) => void;
  onDiceRoll: (msg: string, isBlind?: boolean) => void;
  onEndTurn: () => void;
  onConsumeSlot: (level: number) => void;
  onUpdateCharacter?: (char: Character) => void;
  isMyTurn: boolean;
  mapTokens?: MapToken[];
  mapObjects?: MapObject[];
  customSpells?: CustomSpell[]; // NEW: Injected custom spells
}

type ModalType = 'spells' | 'weapons' | 'potions' | 'targets' | 'context' | null;

const CombatActionsPanel: React.FC<CombatActionsPanelProps> = ({ 
    turnState, character, combatants, onAction, onEndTurn, onDiceRoll, 
    onConsumeSlot, onUpdateCharacter, isMyTurn, mapTokens, mapObjects, 
    customSpells = [] 
}) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [pendingAction, setPendingAction] = useState<{type: 'main' | 'bonus' | 'move' | 'reaction', name: string} | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<SpellDefinition | {name: string, level: number, school: string, type: string} | null>(null);
  const [castingStep, setCastingStep] = useState<'select_spell' | 'select_level'>('select_spell');

  // Detect nearby objects for contextual actions
  const nearbyObjects = useMemo(() => {
      if (!mapTokens || !mapObjects) return [];
      const myToken = mapTokens.find(t => t.id === character.name);
      if (!myToken) return [];

      return mapObjects.filter(obj => {
          const dx = Math.abs(obj.position.x - myToken.position.x);
          const dy = Math.abs(obj.position.y - myToken.position.y);
          return dx <= 1 && dy <= 1; // Adjacent
      });
  }, [mapTokens, mapObjects, character.name]);

  // Helper to find spell (including custom)
  const getSpellDefinition = (spellName: string): {name: string, level: number, school: string, type: string} | null => {
      const custom = customSpells.find(s => s.name.toLowerCase() === spellName.toLowerCase());
      if (custom) return custom as any; // CustomSpell fits the shape roughly
      
      const standard = findSpell(spellName);
      if (standard) return standard;
      
      return null;
  };

  // Group spells by level for better UI - MOVED BEFORE EARLY RETURN
  const spellsByLevel = useMemo(() => {
      const groups: Record<number, string[]> = {};
      if (!character.spells) return groups;

      character.spells.forEach(spellName => {
          const def = getSpellDefinition(spellName);
          const level = def ? def.level : 0; 
          if (!groups[level]) groups[level] = [];
          groups[level].push(spellName);
      });
      return groups;
  }, [character.spells, customSpells]);

  // Death Saves Logic
  const handleDeathSave = () => {
     const roll = Math.floor(Math.random() * 20) + 1;
     let resultMsg = "";
     let newSaves = { ...(character.deathSaves || { successes: 0, failures: 0 }) };
     let stabilized = false;
     let dead = false;
     let hpUpdate = 0;

     if (roll === 1) {
        resultMsg = `[DEATH SAVE] **${roll}** (CRITICAL FAILURE - 2 Fails)`;
        newSaves.failures += 2;
     } else if (roll === 20) {
        resultMsg = `[DEATH SAVE] **${roll}** (CRITICAL SUCCESS - Regain 1 HP)`;
        hpUpdate = 1;
        newSaves = { successes: 0, failures: 0 }; // Reset on revive
     } else if (roll < 10) {
        resultMsg = `[DEATH SAVE] **${roll}** (Failure)`;
        newSaves.failures += 1;
     } else {
        resultMsg = `[DEATH SAVE] **${roll}** (Success)`;
        newSaves.successes += 1;
     }

     if (!hpUpdate) {
        if (newSaves.failures >= 3) {
            resultMsg += " -> **DEAD** 💀";
            dead = true;
        } else if (newSaves.successes >= 3) {
            resultMsg += " -> **STABILIZED** 🛡️";
            stabilized = true;
            newSaves = { successes: 0, failures: 0 };
        }
     }

     onDiceRoll(resultMsg);
     
     if (onUpdateCharacter) {
         const updatedChar = {
             ...character,
             deathSaves: newSaves,
             hp: hpUpdate > 0 ? hpUpdate : character.hp
         };
         onUpdateCharacter(updatedChar);
     }

     onEndTurn();
  };

  // If dead/dying, show Death Save Interface
  if (character.hp <= 0) {
      return (
          <div className="w-full z-30 flex justify-center pointer-events-auto mb-2 animate-in slide-in-from-bottom-2 duration-300 px-2">
              <div className="bg-stone-950 border-t-2 border-l-2 border-r-2 border-red-900 rounded-t-xl shadow-[0_-5px_30px_rgba(150,0,0,0.5)] w-full max-w-4xl p-6 flex flex-col items-center justify-center gap-4">
                  <div className="flex items-center gap-2 text-red-500 animate-pulse">
                      <HeartPulse className="w-8 h-8" />
                      <h3 className="text-2xl fantasy-font font-bold tracking-widest">ПРИ СМЕРТІ</h3>
                  </div>
                  <p className="text-stone-400 text-sm text-center max-w-md">
                      Ви без свідомості. Кидайте рятівні кидки від смерті на початку свого ходу.
                  </p>
                  
                  {/* Tracker visualization */}
                  <div className="flex gap-8 my-2">
                      <div className="flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-green-500 uppercase">Успіхи</span>
                          <div className="flex gap-2">
                              {Array.from({length: 3}).map((_, i) => (
                                  <div key={i} className={`w-4 h-4 rounded-full border border-green-900 ${i < (character.deathSaves?.successes || 0) ? 'bg-green-500' : 'bg-stone-900'}`} />
                              ))}
                          </div>
                      </div>
                       <div className="flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-red-500 uppercase">Невдачі</span>
                          <div className="flex gap-2">
                              {Array.from({length: 3}).map((_, i) => (
                                  <div key={i} className={`w-4 h-4 rounded-full border border-red-900 ${i < (character.deathSaves?.failures || 0) ? 'bg-red-500' : 'bg-stone-900'}`} />
                              ))}
                          </div>
                      </div>
                  </div>

                  <button 
                      onClick={handleDeathSave}
                      disabled={!isMyTurn}
                      className="bg-red-900 hover:bg-red-800 text-white px-8 py-3 rounded font-bold uppercase tracking-widest border border-red-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                  >
                      <Dna className="w-5 h-5" />
                      {isMyTurn ? "КИНУТИ DEATH SAVE" : "ОЧІКУВАННЯ ХОДУ..."}
                  </button>
              </div>
          </div>
      );
  }

  // --- DATA HELPERS ---

  const getWeapons = () => {
      return character.inventory.filter(item => {
          const i = item.toLowerCase();
          return i.includes('меч') || i.includes('sword') || 
                 i.includes('лук') || i.includes('bow') || 
                 i.includes('сокира') || i.includes('axe') ||
                 i.includes('кинджал') || i.includes('dagger') ||
                 i.includes('молот') || i.includes('hammer') ||
                 i.includes('арбалет') || i.includes('crossbow') ||
                 i.includes('рапіра') || i.includes('rapier') ||
                 i.includes('булава') || i.includes('mace') ||
                 i.includes('staff') || i.includes('посох') ||
                 i.includes('спис') || i.includes('spear');
      });
  };

  const getPotions = () => {
       return character.inventory.filter(item => {
           const i = item.toLowerCase();
           return i.includes('зілля') || i.includes('potion') || i.includes('flask') || i.includes('фляга');
       });
  };

  // --- ACTIONS ---

  const initiateAction = (type: 'main' | 'bonus' | 'move' | 'reaction', name: string, requiresTarget: boolean) => {
    if (requiresTarget && combatants.length > 0) {
        setPendingAction({ type, name });
        setActiveModal('targets');
    } else {
        onAction(type, name);
        setActiveModal(null);
    }
  };

  const startSpellCast = (spellName: string) => {
      const def = getSpellDefinition(spellName);
      // If not in DB, treat as level 1 generic
      const spellObj = def || { name: spellName, level: 0, school: 'Unknown', type: 'Utility' };
      
      setSelectedSpell(spellObj as any);

      // If Cantrip (Level 0), cast immediately (no slot needed)
      if (spellObj.level === 0) {
          confirmCast(spellName, 0);
      } else {
          // Leveled Spell -> Ask for Slot Level
          setCastingStep('select_level');
      }
  };

  const confirmCast = (spellName: string, level: number) => {
      // 1. Consume Slot (if level > 0)
      if (level > 0) {
          onConsumeSlot(level);
      }

      // 2. Construct Action String
      // Format: [CAST] Fireball (Level 3)
      const actionStr = `[CAST] ${spellName} ${level > 0 ? `(Level ${level})` : '(Cantrip)'}`;
      
      // 3. Determine if we need a target
      const def = getSpellDefinition(spellName);
      const needsTarget = def ? (def.type === 'Attack' || def.type === 'Debuff' || def.type === 'Heal') : true;

      // 4. Execute
      initiateAction('main', actionStr, needsTarget);
      
      // Reset
      setCastingStep('select_spell');
      setSelectedSpell(null);
  };

  const handleTargetSelect = (targetName: string) => {
      if (pendingAction) {
          const actionString = targetName ? `${pendingAction.name} -> ${targetName}` : pendingAction.name;
          onAction(pendingAction.type, actionString);
          setPendingAction(null);
          setActiveModal(null);
      }
  };

  const getSchoolColor = (school: string) => {
      switch (school) {
          case 'Evocation': return 'text-red-400';
          case 'Necromancy': return 'text-stone-400';
          case 'Divination': return 'text-blue-300';
          case 'Enchantment': return 'text-pink-400';
          case 'Illusion': return 'text-purple-400';
          case 'Transmutation': return 'text-green-400';
          case 'Abjuration': return 'text-blue-500';
          case 'Conjuration': return 'text-amber-400';
          default: return 'text-stone-400';
      }
  };

  return (
    <>
        {/* SUB-MENUS / MODALS */}
        {activeModal && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center pb-48 md:pb-32 pointer-events-none">
                <div className="bg-stone-950 border border-amber-700 rounded-lg shadow-2xl p-4 w-[95%] md:w-[600px] pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-200 flex flex-col max-h-[60vh]">
                    
                    {/* Modal Header */}
                    <div className="flex justify-between items-center border-b border-stone-700 pb-2 mb-2">
                         <h3 className="text-amber-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                            {activeModal === 'spells' && <><Zap className="w-4 h-4"/> Книга Заклять</>}
                            {activeModal === 'weapons' && <><Sword className="w-4 h-4"/> Вибір Зброї</>}
                            {activeModal === 'potions' && <><RefreshCw className="w-4 h-4"/> Зілля</>}
                            {activeModal === 'targets' && <><Crosshair className="w-4 h-4"/> Оберіть Ціль</>}
                            {activeModal === 'context' && <><Trees className="w-4 h-4"/> Оточення</>}
                         </h3>
                         <button onClick={() => { setActiveModal(null); setCastingStep('select_spell'); }} className="text-stone-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {/* TARGET SELECTION */}
                        {activeModal === 'targets' && (
                            <>
                                <button onClick={() => handleTargetSelect("На себе / Без цілі")} className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded mb-2 text-sm font-bold italic border border-stone-700 border-dashed">
                                    • На себе / Без цілі
                                </button>
                                <div className="space-y-1">
                                    {combatants.map((c, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleTargetSelect(c.name)}
                                            className={`w-full text-left px-3 py-2 rounded transition-colors text-sm font-bold flex items-center justify-between border border-transparent hover:border-amber-500/50
                                                ${c.type === 'enemy' ? 'bg-red-950/30 text-red-200 hover:bg-red-900/50' : 'bg-blue-950/30 text-blue-200 hover:bg-blue-900/50'}
                                            `}
                                        >
                                            <span className="flex items-center gap-2">
                                                {c.type === 'enemy' ? <Skull className="w-4 h-4"/> : <User className="w-4 h-4"/>}
                                                {c.name}
                                            </span>
                                            {c.hpStatus && <span className="text-[10px] opacity-70 uppercase">{c.hpStatus}</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* CONTEXT ACTIONS */}
                        {activeModal === 'context' && (
                             <div className="space-y-2">
                                 {nearbyObjects.length > 0 ? nearbyObjects.map((obj, i) => {
                                     let actionName = "";
                                     let actionType: 'main' | 'bonus' = 'main';
                                     let Icon = Box;

                                     if (obj.type === 'door') {
                                         actionName = obj.state === 'open' ? "Закрити двері" : "Відкрити двері";
                                         actionType = 'main'; // Usually free object interaction, but for simplicity
                                         Icon = DoorClosed;
                                     } else if (obj.type === 'chest') {
                                         actionName = "Відкрити скриню";
                                         Icon = Box;
                                     } else if (obj.type === 'fire') {
                                         actionName = "Спробувати загасити вогонь";
                                         Icon = Flame;
                                     } else if (obj.type === 'tree' || obj.type === 'rock' || obj.type === 'wall') {
                                         actionName = "Сховатися за укриттям (+AC)";
                                         Icon = Shield;
                                         actionType = 'bonus';
                                     } else {
                                         actionName = `Взаємодіяти з ${obj.type}`;
                                     }

                                     return (
                                         <button 
                                            key={i}
                                            onClick={() => initiateAction(actionType, `${actionName} [${obj.type}]`, false)}
                                            className="w-full text-left px-3 py-2 hover:bg-amber-900/30 bg-stone-900/50 border border-stone-700 hover:border-amber-500 rounded transition-colors text-sm font-bold flex items-center gap-2 text-amber-100"
                                         >
                                             <Icon className="w-4 h-4 text-amber-500" />
                                             {actionName}
                                         </button>
                                     )
                                 }) : (
                                     <div className="text-center text-stone-500 italic py-4">Немає інтерактивних об'єктів поруч.</div>
                                 )}
                             </div>
                        )}

                        {/* SPELLS MECHANIC */}
                        {activeModal === 'spells' && (
                            <div className="flex flex-col h-full">
                                {castingStep === 'select_spell' ? (
                                    <div className="space-y-4">
                                        {/* Available Slots Indicator */}
                                        <div className="flex flex-wrap gap-1.5 bg-black/30 p-2 rounded border border-stone-800">
                                            {character.spellSlots && Object.entries(character.spellSlots).map(([lvl, slot]) => {
                                                if (slot.max === 0) return null;
                                                const isEmpty = slot.current <= 0;
                                                return (
                                                    <div key={lvl} className={`flex flex-col items-center px-2 py-1 rounded border ${isEmpty ? 'bg-stone-900 border-stone-800 opacity-50' : 'bg-amber-900/30 border-amber-800'}`}>
                                                        <span className="text-[8px] text-stone-500 uppercase">LVL {lvl}</span>
                                                        <div className="flex gap-0.5">
                                                            {Array.from({length: slot.max}).map((_, i) => (
                                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < slot.current ? 'bg-amber-500 shadow-[0_0_5px_#f59e0b]' : 'bg-stone-700'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        
                                        {/* Spell List Grouped */}
                                        {Object.keys(spellsByLevel).length === 0 ? (
                                            <div className="text-stone-500 italic text-center py-4">Ви не знаєте жодного закляття.</div>
                                        ) : (
                                            Object.entries(spellsByLevel).sort(([a], [b]) => Number(a) - Number(b)).map(([level, list]) => (
                                                <div key={level} className="space-y-1">
                                                    <h4 className="text-xs font-bold text-stone-500 uppercase border-b border-stone-800 pb-1 mt-2">
                                                        {level === '0' ? 'Cantrips (∞)' : `Level ${level}`}
                                                    </h4>
                                                    {list.map(spellName => {
                                                        const def = getSpellDefinition(spellName);
                                                        return (
                                                            <button 
                                                                key={spellName}
                                                                onClick={() => startSpellCast(spellName)}
                                                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-stone-800 bg-stone-900/50 rounded border border-transparent hover:border-stone-600 transition-all group"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Flame className={`w-3 h-3 ${def ? getSchoolColor(def.school) : 'text-stone-500'}`} />
                                                                    <span className="text-stone-300 font-bold text-sm group-hover:text-white">{spellName}</span>
                                                                </div>
                                                                {def && <span className="text-[10px] text-stone-500">{def.type}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    // STEP 2: SELECT LEVEL (UPCASTING)
                                    <div className="animate-in slide-in-from-right duration-200">
                                        <div className="flex items-center gap-2 mb-4 text-stone-300">
                                            <button onClick={() => setCastingStep('select_spell')} className="hover:text-white"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                                            <span className="font-bold">Кастувати: <span className="text-amber-500">{selectedSpell?.name}</span></span>
                                        </div>
                                        
                                        <p className="text-xs text-stone-500 mb-2">Оберіть рівень чарунки для витрати:</p>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            {character.spellSlots && Object.entries(character.spellSlots).map(([lvlStr, slot]) => {
                                                const lvl = Number(lvlStr);
                                                // Can only cast if slot level >= spell base level
                                                const baseLevel = selectedSpell?.level || 1;
                                                if (lvl < baseLevel || slot.max === 0) return null;
                                                
                                                const isDisabled = slot.current <= 0;

                                                return (
                                                    <button 
                                                        key={lvl}
                                                        onClick={() => confirmCast(selectedSpell!.name, lvl)}
                                                        disabled={isDisabled}
                                                        className={`
                                                            p-3 rounded border text-left transition-all flex flex-col gap-1
                                                            ${isDisabled 
                                                                ? 'bg-stone-900 border-stone-800 opacity-40 cursor-not-allowed' 
                                                                : 'bg-stone-800 border-stone-600 hover:bg-amber-900/40 hover:border-amber-600 text-stone-200'}
                                                        `}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-sm">Рівень {lvl}</span>
                                                            <span className={`text-xs font-mono ${slot.current > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                                {slot.current}/{slot.max}
                                                            </span>
                                                        </div>
                                                        {lvl > baseLevel && <span className="text-[10px] text-amber-500 uppercase tracking-wide">+ Посилення</span>}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* WEAPONS */}
                        {activeModal === 'weapons' && (
                            <>
                            <button onClick={() => initiateAction('main', 'Беззбройна атака', true)} className="w-full text-left px-3 py-2 hover:bg-stone-800 text-stone-300 hover:text-red-400 rounded transition-colors text-sm font-bold">
                                👊 Беззбройна атака (Unarmed)
                            </button>
                            {getWeapons().length > 0 ? (
                                getWeapons().map((weapon, i) => (
                                    <button key={i} onClick={() => initiateAction('main', `Атакує зброєю: ${weapon}`, true)} className="w-full text-left px-3 py-2 hover:bg-stone-800 text-stone-300 hover:text-red-400 rounded transition-colors text-sm font-bold">
                                        ⚔️ {weapon}
                                    </button>
                                ))
                            ) : <div className="text-stone-500 italic text-center py-2">Зброї не знайдено.</div>}
                            </>
                        )}

                        {/* POTIONS */}
                        {activeModal === 'potions' && (
                             getPotions().length > 0 ? (
                                getPotions().map((item, i) => (
                                    <button key={i} onClick={() => initiateAction('bonus', `Випиває: ${item}`, false)} className="w-full text-left px-3 py-2 hover:bg-stone-800 text-stone-300 hover:text-green-400 rounded transition-colors text-sm font-bold">
                                        🧪 {item}
                                    </button>
                                ))
                            ) : <div className="text-stone-500 italic text-center py-4">У вас немає зілля.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MAIN PANEL (Static Flow) */}
        <div className="w-full z-30 flex justify-center pointer-events-auto mb-2 animate-in slide-in-from-bottom-2 duration-300 px-2 md:px-0">
            <div className="bg-stone-900 border-t-2 border-l-2 border-r-2 border-amber-700/50 rounded-t-xl shadow-[0_-5px_30px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-w-[100vw]">
                    
                {/* LEFT: Resources */}
                <div className="flex md:flex-col gap-4 items-center justify-center bg-stone-950 p-2 px-4 md:w-24 border-b md:border-b-0 md:border-r border-stone-800 shrink-0">
                    <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${isMyTurn && turnState.hasAction ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow ${isMyTurn && turnState.hasAction ? 'bg-red-900 border-red-500 text-white shadow-red-500/20' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                            <Sword className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold uppercase text-stone-400">Action</span>
                    </div>
                        <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${isMyTurn && turnState.hasBonusAction ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow ${isMyTurn && turnState.hasBonusAction ? 'bg-amber-900 border-amber-500 text-white shadow-amber-500/20' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                            <Zap className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold uppercase text-stone-400">Bonus</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow ${isMyTurn && turnState.movementRemaining > 0 ? 'bg-green-900/50 border-green-600 text-green-400' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                            <Footprints className="w-4 h-4" />
                        </div>
                        <span className={`text-[9px] font-bold ${turnState.movementRemaining > 0 ? 'text-green-400' : 'text-red-500'}`}>{turnState.movementRemaining}ft</span>
                    </div>
                </div>

                {/* CENTER: Actions & Dice */}
                <div className="flex-1 flex flex-col min-w-0">
                    
                    {/* TOP: Action Buttons */}
                    <div className={`p-2 grid grid-cols-4 sm:grid-cols-7 gap-1 border-b border-stone-800 bg-stone-900/50 transition-opacity overflow-x-auto scrollbar-thin ${!isMyTurn ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <button onClick={() => setActiveModal(activeModal === 'weapons' ? null : 'weapons')} disabled={!turnState.hasAction} className="action-btn bg-red-950/30 border-red-900/50 text-red-200">
                            <Sword className="w-4 h-4 mb-1 text-red-500" /> Атака
                            </button>
                            <button onClick={() => setActiveModal(activeModal === 'spells' ? null : 'spells')} disabled={!turnState.hasAction} className="action-btn bg-purple-950/30 border-purple-900/50 text-purple-200 pointer-events-auto">
                            <Zap className="w-4 h-4 mb-1 text-purple-500" /> Магія
                            </button>
                            <button onClick={() => setActiveModal(activeModal === 'potions' ? null : 'potions')} disabled={!turnState.hasBonusAction} className="action-btn bg-amber-950/30 border-amber-900/50 text-amber-200">
                            <RefreshCw className="w-4 h-4 mb-1 text-amber-500" /> Зілля
                            </button>
                            <button onClick={() => initiateAction('move', 'Ривок (Dash)', false)} disabled={!turnState.hasAction || turnState.isDashUsed} className="action-btn bg-green-950/30 border-green-900/50 text-green-200">
                            <FastForward className="w-4 h-4 mb-1 text-green-500" /> Ривок
                            </button>
                            <button onClick={() => initiateAction('main', 'Ухилення (Dodge)', false)} disabled={!turnState.hasAction} className="action-btn bg-blue-950/30 border-blue-900/50 text-blue-200">
                            <Shield className="w-4 h-4 mb-1 text-blue-500" /> Ухил
                            </button>
                            <button onClick={() => initiateAction('main', 'Відхід (Disengage)', false)} disabled={!turnState.hasAction} className="action-btn bg-stone-800/30 border-stone-700 text-stone-300">
                            <Wind className="w-4 h-4 mb-1 text-stone-500" /> Відхід
                            </button>
                            {/* Contextual Actions Button */}
                            <button 
                                onClick={() => setActiveModal(activeModal === 'context' ? null : 'context')} 
                                className={`action-btn ${nearbyObjects.length > 0 ? 'bg-amber-600/20 border-amber-500 text-amber-200 animate-pulse' : 'bg-stone-800/30 border-stone-700 text-stone-500 opacity-50'}`}
                                disabled={nearbyObjects.length === 0}
                            >
                                <Trees className="w-4 h-4 mb-1" /> Оточення
                            </button>
                    </div>

                    {/* BOTTOM: Dice Roller Integration */}
                    <div className="flex-1 bg-stone-900 relative">
                        <DiceRoller onRoll={onDiceRoll} hideHeader={true} className="p-2 flex justify-center gap-2" />
                    </div>

                </div>

                {/* RIGHT: End Turn */}
                <button 
                    onClick={onEndTurn}
                    disabled={!isMyTurn}
                    className={`
                        bg-gradient-to-b from-red-900 to-red-950 text-white border-l border-red-800 shadow-[-5px_0_10px_rgba(0,0,0,0.5)] w-full md:w-24 py-3 md:py-0 flex flex-row md:flex-col items-center justify-center gap-2 transition-all active:scale-95 shrink-0
                        ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-800 hover:to-red-900'}
                    `}
                >
                    <Play className="w-6 h-6 fill-white" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {isMyTurn ? "Кінець Ходу" : "Очікування..."}
                    </span>
                </button>

            </div>

            <style>{`
                .action-btn {
                    @apply flex flex-col items-center justify-center p-2 rounded border transition-all text-[10px] md:text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-50 whitespace-nowrap min-w-0;
                }
            `}</style>
        </div>
    </>
  );
};

export default CombatActionsPanel;
