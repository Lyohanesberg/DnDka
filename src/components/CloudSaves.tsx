import React, { useState } from 'react';
import { useGameStore } from '../store';
import { Download, Upload, X, Save, Cloud, Loader2 } from 'lucide-react';
import { saveGameToDrive, loadGameFromDrive, listSaveFiles, signInToGoogle } from '../services/googleDriveService';

interface CloudSavesProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloudSaves: React.FC<CloudSavesProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getGameState = () => {
      const state = useGameStore.getState();
      return {
          character: state.character,
          messages: state.messages,
          location: state.location,
          combatState: state.combatState,
          mapTokens: state.mapTokens,
          mapObjects: state.mapObjects,
          quests: state.quests,
          notes: state.notes
      };
  };

  const handleSaveCloud = async () => {
      setIsLoading(true);
      try {
          await saveGameToDrive(getGameState());
          const list = await listSaveFiles();
          setFiles(list);
      } catch(e) { console.error(e); }
      setIsLoading(false);
  };

  const handleLoadCloud = async (id: string) => {
      setIsLoading(true);
      try {
          const data = await loadGameFromDrive(id);
          useGameStore.getState().setFullMapState(data.mapTokens, data.mapObjects || [], [], data.location);
          useGameStore.getState().setFullChatState(data.messages, data.quests, data.notes, "");
          onClose();
      } catch(e) { console.error(e); }
      setIsLoading(false);
  };

  const handleSignIn = async () => {
      await signInToGoogle();
      const list = await listSaveFiles();
      setFiles(list);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-stone-900 border-2 border-amber-800 rounded-lg p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white"><X /></button>
          <h2 className="text-xl font-bold text-amber-500 mb-6 flex gap-2"><Save /> Save Game</h2>
          
          <div className="flex border-b border-stone-700 mb-4">
              <button onClick={() => setActiveTab('local')} className={`flex-1 py-2 ${activeTab === 'local' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-stone-500'}`}>Local</button>
              <button onClick={() => setActiveTab('cloud')} className={`flex-1 py-2 ${activeTab === 'cloud' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-stone-500'}`}>Cloud</button>
          </div>

          {activeTab === 'local' && (
              <div className="space-y-4">
                  <button onClick={() => {
                      const json = JSON.stringify(getGameState(), null, 2);
                      const blob = new Blob([json], {type:'application/json'});
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `save_${Date.now()}.json`;
                      link.click();
                  }} className="w-full bg-stone-800 p-4 rounded flex items-center justify-center gap-2 hover:bg-stone-700">
                      <Download /> Download JSON
                  </button>
              </div>
          )}

          {activeTab === 'cloud' && (
              <div className="space-y-4">
                  <button onClick={handleSignIn} className="w-full bg-blue-700 p-2 rounded">Sign In with Google</button>
                  <button onClick={handleSaveCloud} disabled={isLoading} className="w-full bg-green-700 p-2 rounded flex justify-center gap-2">
                      {isLoading ? <Loader2 className="animate-spin"/> : <Upload />} Save New
                  </button>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                      {files.map(f => (
                          <div key={f.id} className="flex justify-between p-2 bg-stone-800 rounded">
                              <span>{f.name}</span>
                              <button onClick={() => handleLoadCloud(f.id)} className="text-green-400 font-bold">Load</button>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default CloudSaves;
