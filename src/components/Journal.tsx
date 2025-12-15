import React from 'react';
import { useGameStore } from '../store';
import { Scroll, X } from 'lucide-react';

interface JournalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Journal: React.FC<JournalProps> = ({ isOpen, onClose }) => {
  const { quests, notes, storySummary } = useGameStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[70vh] bg-stone-900 border-2 border-amber-800 rounded-lg shadow-2xl flex flex-col relative">
        <div className="bg-amber-950/40 p-4 border-b border-amber-800 flex justify-between items-center">
            <h2 className="text-amber-500 font-bold flex gap-2"><Scroll /> Journal</h2>
            <button onClick={onClose}><X className="text-stone-500 hover:text-white" /></button>
        </div>
        <div className="p-6 overflow-y-auto text-stone-300">
            <h3 className="font-bold text-amber-500 mb-2">Quests</h3>
            {quests.length === 0 && <p className="italic text-stone-600">No active quests.</p>}
            {quests.map(q => <div key={q.id} className="mb-2 p-2 bg-stone-800 rounded">{q.title}</div>)}
            
            <h3 className="font-bold text-amber-500 mt-6 mb-2">Notes</h3>
            {notes.map(n => <div key={n.id} className="mb-2 p-2 bg-stone-800 rounded">{n.title}</div>)}
        </div>
      </div>
    </div>
  );
};

export default Journal;
