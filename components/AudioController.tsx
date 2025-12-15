
import React, { useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { Volume2, VolumeX, Music, CloudRain, Flame, Wind, Users, Sliders, X } from 'lucide-react';
import { AmbienceType } from '../contexts/AudioContext';

const AudioController: React.FC = () => {
  const { isMuted, volume, toggleMute, setVolume, isPlaying, ambienceState, toggleAmbience, setAmbienceVolume } = useAudio();
  const [showMixer, setShowMixer] = useState(false);

  const getAmbienceIcon = (type: AmbienceType) => {
      switch(type) {
          case 'rain': return <CloudRain className="w-4 h-4" />;
          case 'fire': return <Flame className="w-4 h-4" />;
          case 'wind': return <Wind className="w-4 h-4" />;
          case 'crowd': return <Users className="w-4 h-4" />;
      }
  };

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setShowMixer(!showMixer)}
        className={`p-2 rounded transition-colors flex items-center gap-2 ${showMixer ? 'bg-stone-800 text-amber-500' : 'text-stone-400 hover:text-amber-500'}`}
        title="Аудіо Мікшер"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Mixer Popup */}
      {showMixer && (
          <div className="absolute top-full right-0 mt-2 bg-stone-900 border border-stone-700 p-4 rounded-lg shadow-2xl z-50 w-64 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-stone-800 pb-2">
                 <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                     <Sliders className="w-4 h-4" /> Мікшер
                 </h3>
                 <button onClick={() => setShowMixer(false)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            {/* Master / Music */}
            <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-300">
                    <div className="flex items-center gap-2 font-bold">
                        <Music className="w-4 h-4 text-amber-600" /> Музика
                    </div>
                    <button onClick={toggleMute} className={`${isMuted ? 'text-red-500' : 'text-green-500'} font-bold uppercase text-[10px]`}>
                        {isMuted ? "Muted" : "Active"}
                    </button>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
            </div>

            {/* Ambience List */}
            <div className="space-y-3">
                <h4 className="text-[10px] text-stone-500 uppercase font-bold border-b border-stone-800 pb-1">Атмосфера</h4>
                {(Object.keys(ambienceState) as AmbienceType[]).map((type) => (
                    <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between">
                             <button 
                                onClick={() => toggleAmbience(type)}
                                className={`flex items-center gap-2 text-xs font-bold transition-colors ${ambienceState[type].isPlaying ? 'text-blue-400' : 'text-stone-500'}`}
                             >
                                 {getAmbienceIcon(type)}
                                 <span className="capitalize">{type}</span>
                             </button>
                             <span className="text-[9px] text-stone-600 font-mono">
                                 {Math.round(ambienceState[type].volume * 100)}%
                             </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={ambienceState[type].volume}
                            onChange={(e) => setAmbienceVolume(type, parseFloat(e.target.value))}
                            disabled={!ambienceState[type].isPlaying}
                            className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${ambienceState[type].isPlaying ? 'bg-stone-700 accent-blue-500' : 'bg-stone-800 accent-stone-600'}`}
                        />
                    </div>
                ))}
            </div>
          </div>
      )}
    </div>
  );
};

export default AudioController;
