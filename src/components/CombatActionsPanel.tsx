import React, { useState } from 'react';
import { useGameStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Sword, Zap, Footprints, Shield, RefreshCw, Play, FastForward, Wind, Crosshair, Trees } from 'lucide-react';
import DiceRoller from './DiceRoller';

const CombatActionsPanel = React.memo(() => {
  const { 
    turnState, character, combatState, mapTokens, mapObjects, customSpells,
    useAction, nextTurn, consumeSpellSlot, sendUserMessage
  } = useGameStore(useShallow(state => ({
    turnState: state.turnState,
    character: state.character,
    combatState: state.combatState,
    mapTokens: state.mapTokens,
    mapObjects: state.mapObjects,
    customSpells: state.customSpells,
    useAction: state.useAction,
    nextTurn: state.nextTurn,
    consumeSpellSlot: state.consumeSpellSlot,
    sendUserMessage: state.sendUserMessage
  })));

  const isMyTurn = combatState.isActive && combatState.combatants.find(c => c.isCurrentTurn)?.name === character.name;

  const handleAction = (type: 'main'|'bonus'|'move'|'reaction', name: string) => {
      useAction(type);
      sendUserMessage(`**[${type.toUpperCase()}]** ${name}`);
  };

  const handleDiceRoll = (msg: string, isBlind?: boolean) => {
      if (useGameStore.getState().pendingRoll) {
          useGameStore.getState().resolvePendingRoll(msg);
      }
  };

  return (
    <div className="w-full z-30 flex justify-center pointer-events-auto mb-2 px-2">
        <div className="bg-stone-900 border-t-2 border-l-2 border-r-2 border-amber-700/50 rounded-t-xl w-full max-w-4xl flex flex-col md:flex-row">
            {/* Resources */}
            <div className="flex md:flex-col gap-4 items-center justify-center bg-stone-950 p-2 px-4 md:w-24 border-b md:border-b-0 md:border-r border-stone-800 shrink-0">
                <div className={`flex flex-col items-center gap-1 ${isMyTurn && turnState.hasAction ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="w-8 h-8 rounded-full bg-stone-800 border border-red-500 flex items-center justify-center"><Sword className="w-4 h-4 text-white"/></div>
                    <span className="text-[9px] font-bold">ACT</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${isMyTurn && turnState.hasBonusAction ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="w-8 h-8 rounded-full bg-stone-800 border border-amber-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white"/></div>
                    <span className="text-[9px] font-bold">BNS</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-green-400">{turnState.movementRemaining}ft</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex-1 flex flex-col">
                <div className={`p-2 grid grid-cols-4 sm:grid-cols-6 gap-1 border-b border-stone-800 bg-stone-900/50 ${!isMyTurn ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={() => handleAction('main', 'Attack')} disabled={!turnState.hasAction} className="bg-red-900/30 border border-red-900 text-red-200 text-xs p-2 rounded">Attack</button>
                    <button onClick={() => handleAction('main', 'Cast Spell')} disabled={!turnState.hasAction} className="bg-purple-900/30 border border-purple-900 text-purple-200 text-xs p-2 rounded">Cast</button>
                    <button onClick={() => handleAction('move', 'Dash')} disabled={!turnState.hasAction} className="bg-green-900/30 border border-green-900 text-green-200 text-xs p-2 rounded">Dash</button>
                    <button onClick={() => handleAction('main', 'Dodge')} disabled={!turnState.hasAction} className="bg-blue-900/30 border border-blue-900 text-blue-200 text-xs p-2 rounded">Dodge</button>
                </div>
                <div className="flex-1 bg-stone-900 p-2">
                    <DiceRoller onRoll={handleDiceRoll} hideHeader={true} />
                </div>
            </div>

            {/* End Turn */}
            <button onClick={nextTurn} disabled={!isMyTurn} className={`bg-red-900 text-white w-full md:w-24 flex items-center justify-center ${!isMyTurn ? 'opacity-50' : ''}`}>
                <span className="text-xs font-bold uppercase tracking-widest">{isMyTurn ? "End Turn" : "Wait"}</span>
            </button>
        </div>
    </div>
  );
});

export default CombatActionsPanel;