

import React, { useState } from 'react';
import { CombatState, Combatant, Condition } from '../types';
import { Swords, Skull, User, Shield, ChevronDown, ChevronUp, Droplets, EyeOff, Zap, Activity, AlertCircle, Anchor, CloudFog, Ghost, Lock, MicOff, Battery, Sparkles, Skull as DeadSkull } from 'lucide-react';

interface CombatTrackerProps {
  combatState: CombatState;
  onUpdateCombatant?: (name: string, updates: Partial<Combatant>) => void;
}

const CombatTracker: React.FC<CombatTrackerProps> = ({ combatState, onUpdateCombatant }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeConditionMenu, setActiveConditionMenu] = useState<string | null>(null);

  if (!combatState.isActive) return null;

  const CONDITIONS: { id: Condition; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'poisoned', label: 'Отруєний', icon: <Droplets className="w-3 h-3" />, color: 'text-green-500' },
    { id: 'blinded', label: 'Осліплений', icon: <EyeOff className="w-3 h-3" />, color: 'text-stone-500' },
    { id: 'stunned', label: 'Приголомшений', icon: <Zap className="w-3 h-3" />, color: 'text-yellow-500' },
    { id: 'unconscious', label: 'Без свідомості', icon: <Activity className="w-3 h-3" />, color: 'text-red-600' },
    { id: 'frightened', label: 'Наляканий', icon: <AlertCircle className="w-3 h-3" />, color: 'text-purple-500' },
    { id: 'grappled', label: 'Схоплений', icon: <Anchor className="w-3 h-3" />, color: 'text-orange-500' },
    { id: 'invisible', label: 'Невидимий', icon: <Ghost className="w-3 h-3" />, color: 'text-blue-300' },
    { id: 'paralyzed', label: 'Паралізований', icon: <Lock className="w-3 h-3" />, color: 'text-yellow-600' },
    { id: 'prone', label: 'Збитий з ніг', icon: <User className="w-3 h-3 rotate-90" />, color: 'text-stone-400' },
    { id: 'silenced', label: 'Німота', icon: <MicOff className="w-3 h-3" />, color: 'text-stone-500' },
    { id: 'exhaustion', label: 'Виснаження', icon: <Battery className="w-3 h-3" />, color: 'text-orange-600' },
    { id: 'blessed', label: 'Благословення', icon: <Sparkles className="w-3 h-3" />, color: 'text-yellow-400' },
    { id: 'baned', label: 'Прокляття (Bane)', icon: <Skull className="w-3 h-3" />, color: 'text-purple-400' },
  ];

  const toggleCondition = (combatant: Combatant, condition: Condition) => {
      if (!onUpdateCombatant) return;
      
      const currentConditions = combatant.conditions || [];
      let newConditions;
      
      if (currentConditions.includes(condition)) {
          newConditions = currentConditions.filter(c => c !== condition);
      } else {
          newConditions = [...currentConditions, condition];
      }
      
      onUpdateCombatant(combatant.name, { conditions: newConditions });
      setActiveConditionMenu(null); // Close menu
  };

  return (
    <div className="fixed right-4 top-32 md:top-36 z-30 w-64 md:w-72 animate-in slide-in-from-right duration-500">
      <div className="bg-stone-950/90 border-2 border-red-900 rounded-lg shadow-[0_0_20px_rgba(153,27,27,0.5)] overflow-visible transition-all">
        {/* Header */}
        <div 
            className="bg-gradient-to-r from-red-950 to-stone-900 p-3 border-b border-red-900 flex items-center justify-between cursor-pointer hover:bg-red-900/30"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Розгорнути" : "Згорнути"}
        >
          <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-red-500" /> 
              <h3 className="text-red-500 font-bold fantasy-font tracking-widest text-sm uppercase">
                Бій
              </h3>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-500 uppercase hidden md:inline">Ініціатива</span>
              {isCollapsed ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronUp className="w-4 h-4 text-stone-400" />}
          </div>
        </div>

        {/* List */}
        {!isCollapsed && (
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
            {combatState.combatants.length === 0 ? (
                <div className="p-4 text-center text-stone-500 text-xs italic">
                Очікування кидків ініціативи...
                </div>
            ) : (
                <ul className="divide-y divide-stone-800">
                {combatState.combatants.map((c, idx) => {
                    const isCurrent = c.isCurrentTurn;
                    const isPlayer = c.type === 'player';
                    const isEnemy = c.type === 'enemy';
                    const showMenu = activeConditionMenu === c.name;

                    return (
                    <li 
                        key={idx} 
                        className={`
                        relative p-3 flex items-center justify-between transition-all duration-300
                        ${isCurrent ? 'bg-red-900/20' : 'bg-transparent'}
                        `}
                    >
                        {/* Active Indicator Strip */}
                        {isCurrent && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_8px_#dc2626]" />
                        )}

                        <div className="flex items-center gap-3 pl-2">
                            {/* Avatar/Icon */}
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center border shadow-inner relative
                                ${isPlayer ? 'bg-amber-900/50 border-amber-600 text-amber-500' : ''}
                                ${isEnemy ? 'bg-stone-800 border-stone-600 text-red-500' : ''}
                                ${c.type === 'ally' ? 'bg-blue-900/30 border-blue-600 text-blue-400' : ''}
                            `}>
                                {isPlayer ? <User className="w-4 h-4" /> : isEnemy ? <Skull className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                
                                {/* Add Condition Trigger */}
                                {onUpdateCombatant && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveConditionMenu(showMenu ? null : c.name); }}
                                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-stone-900 border border-stone-600 rounded-full flex items-center justify-center text-[8px] text-stone-400 hover:text-white hover:border-amber-500 hover:bg-stone-800 transition-colors z-10"
                                        title="Додати стан"
                                    >
                                        +
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-stone-400'}`}>
                                    {c.name}
                                </span>
                                
                                {/* HP Status & Conditions */}
                                <div className="flex flex-wrap items-center gap-1">
                                    {c.hpStatus && (
                                        <span className={`text-[10px] font-bold uppercase ${
                                            c.hpStatus.toLowerCase().includes('смерт') || c.hpStatus.toLowerCase().includes('dead') 
                                            ? 'text-stone-600' 
                                            : 'text-red-400'
                                        }`}>
                                            {c.hpStatus}
                                        </span>
                                    )}
                                    {c.conditions && c.conditions.length > 0 && (
                                        <div className="flex gap-0.5">
                                            {c.conditions.map(cond => {
                                                const def = CONDITIONS.find(def => def.id === cond);
                                                return def ? <span key={cond} title={def.label} className={def.color}>{def.icon}</span> : null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-stone-500 font-mono text-sm font-bold">
                           {c.initiative}
                        </div>

                        {/* Condition Popup Menu */}
                        {showMenu && (
                            <div className="absolute left-0 top-full mt-1 z-50 bg-stone-900 border border-stone-700 rounded shadow-xl w-48 p-2 grid grid-cols-2 gap-1 animate-in zoom-in duration-150">
                                {CONDITIONS.map(cond => (
                                    <button 
                                        key={cond.id}
                                        onClick={() => toggleCondition(c, cond.id)}
                                        className={`flex items-center gap-2 p-1 rounded text-[10px] font-bold hover:bg-stone-800 ${c.conditions?.includes(cond.id) ? 'bg-stone-800 border border-amber-900' : ''}`}
                                    >
                                        <span className={cond.color}>{cond.icon}</span>
                                        <span className={c.conditions?.includes(cond.id) ? 'text-amber-500' : 'text-stone-400'}>{cond.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                    </li>
                    );
                })}
                </ul>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CombatTracker;