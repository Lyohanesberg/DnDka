import React, { useState } from 'react';
import { useGameStore } from '../store';
import { X, Upload, Package, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface ModManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModManager: React.FC<ModManagerProps> = ({ isOpen, onClose }) => {
  const { activeMods, loadMod, unloadMod } = useGameStore();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              await loadMod(text);
              setError(null);
          } catch (err: any) {
              setError(err.message || "Invalid Mod File");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border-2 border-cyan-800 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-cyan-950/30 p-4 border-b border-cyan-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-cyan-400 fantasy-font tracking-widest flex items-center gap-2">
            <Package className="w-6 h-6" /> Менеджер Модів
          </h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6">
            {/* Upload Area */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-stone-700 border-dashed rounded-lg cursor-pointer bg-stone-800 hover:bg-stone-700 hover:border-cyan-500 transition-colors group mb-6">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-stone-400 group-hover:text-cyan-400 mb-2" />
                    <p className="mb-2 text-sm text-stone-400"><span className="font-bold">Натисніть для завантаження</span> .json файлу</p>
                    <p className="text-xs text-stone-500">Модифікації тем або правил</p>
                </div>
                <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
            </label>

            {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded mb-4 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Active Mods List */}
            <h3 className="text-sm font-bold text-stone-400 uppercase mb-3">Активні Моди</h3>
            {activeMods.length === 0 ? (
                <div className="text-center text-stone-600 italic py-4">Немає активних модифікацій.</div>
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {activeMods.map(mod => (
                        <div key={mod.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                                    {mod.name} <span className="text-[10px] text-stone-500 bg-stone-900 px-1 rounded">v{mod.version}</span>
                                </div>
                                {mod.description && <div className="text-xs text-stone-500">{mod.description}</div>}
                            </div>
                            <button onClick={() => unloadMod(mod.id)} className="text-stone-500 hover:text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ModManager;
