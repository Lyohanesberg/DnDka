import React, { useState } from 'react';
import { useGameStore } from '../store';
import { Swords, Skull, User, ChevronDown, ChevronUp } from 'lucide-react';

const CombatTracker: React.FC = () => {
  const { combatState, updateCombatant } = useGameStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!combatState.isActive) return null;

  return (
    <div className="fixed right-4 top-32 z-30 w-64 animate-in slide-in-from-right">
      <div className="bg-stone-950/90 border-2 border-red-900 rounded-lg shadow-lg">
        <div className="bg-red-950/50 p-2 border-b border-red-900 flex justify-between cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-xs"><Swords className="w-4 h-4"/> Combat</div>
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
        {!isCollapsed && (
            <ul className="max-h-60 overflow-y-auto custom-scrollbar">
                {combatState.combatants.map((c, idx) => (
                    <li key={idx} className={`flex items-center justify-between p-2 border-b border-stone-800 ${c.isCurrentTurn ? 'bg-red-900/20' : ''}`}>
                        <div className="flex items-center gap-2">
                            {c.type === 'enemy' ? <Skull className="w-3 h-3 text-red-500" /> : <User className="w-3 h-3 text-blue-400" />}
                            <span className="text-sm font-bold text-stone-300">{c.name}</span>
                        </div>
                        <span className="text-xs font-mono text-stone-500">{c.initiative}</span>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
};

export default CombatTracker;
