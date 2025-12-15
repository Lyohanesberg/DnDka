
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { playUiClick, playDiceShake, playDiceRoll, playNotification } from '../utils/audioSynth';
import { generateSpeech } from '../services/geminiService';

// --- Music Tracks ---
const TRACKS = {
  exploration: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=fantasy-atmosphere-116630.mp3", 
  combat: "https://cdn.pixabay.com/download/audio/2022/03/22/audio_c0316b8627.mp3?filename=action-drum-loop-103568.mp3",
  tavern: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=medieval-market-16571.mp3", 
  dungeon: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_4f719e8c6b.mp3?filename=dark-drone-26755.mp3",
};

export const AMBIENCE_TRACKS = {
  rain: "https://cdn.pixabay.com/download/audio/2022/05/17/audio_331393f0b2.mp3?filename=heavy-rain-112338.mp3",
  fire: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_03d651762e.mp3?filename=fire-crackling-9692.mp3",
  wind: "https://cdn.pixabay.com/download/audio/2021/08/09/audio_8347f3844f.mp3?filename=wind-outside-sound-ambient-14290.mp3",
  crowd: "https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c63b5e1b.mp3?filename=people-talking-background-8697.mp3",
};

type MusicType = keyof typeof TRACKS;
export type AmbienceType = keyof typeof AMBIENCE_TRACKS;

interface AudioContextType {
  isMuted: boolean;
  volume: number;
  currentTrack: MusicType;
  isPlaying: boolean;
  
  // Ambience
  ambienceState: Record<AmbienceType, { isPlaying: boolean; volume: number }>;
  toggleAmbience: (type: AmbienceType) => void;
  setAmbienceVolume: (type: AmbienceType, vol: number) => void;

  // TTS
  isSpeaking: boolean;
  speak: (text: string, voice: string) => Promise<void>;
  stopSpeaking: () => void;

  toggleMute: () => void;
  setVolume: (val: number) => void;
  playTrack: (type: MusicType) => void;
  playSfx: (type: 'click' | 'dice_shake' | 'dice_roll' | 'success' | 'error' | 'neutral') => void;
  initializeAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Helper to decode Gemini PCM Data
const decodeBase64PCM = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const sampleRate = 24000; // Gemini TTS default
    const numChannels = 1;
    const frameCount = dataInt16.length;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3); // Default 30%
  const [currentTrack, setCurrentTrack] = useState<MusicType>('exploration');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Ambience State
  const [ambienceState, setAmbienceState] = useState<Record<AmbienceType, { isPlaying: boolean; volume: number }>>({
    rain: { isPlaying: false, volume: 0.4 },
    fire: { isPlaying: false, volume: 0.4 },
    wind: { isPlaying: false, volume: 0.4 },
    crowd: { isPlaying: false, volume: 0.3 },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRefs = useRef<Record<string, HTMLAudioElement>>({});
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize Music
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    // Initialize Ambience
    Object.entries(AMBIENCE_TRACKS).forEach(([key, src]) => {
        const amb = new Audio(src);
        amb.loop = true;
        ambienceRefs.current[key] = amb;
    });
    
    return () => {
      audio.pause();
      audioRef.current = null;
      Object.values(ambienceRefs.current).forEach(a => a.pause());
      if (ttsSourceRef.current) ttsSourceRef.current.stop();
    };
  }, []);

  // Sync Music Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync Ambience State
  useEffect(() => {
    Object.entries(ambienceState).forEach(([key, state]) => {
        const audio = ambienceRefs.current[key];
        if (audio) {
            // Volume
            audio.volume = isMuted ? 0 : state.volume;

            // Play/Pause logic
            if (state.isPlaying && isInitialized && !isMuted) {
                if (audio.paused) audio.play().catch(e => console.warn("Ambience autoplay blocked", e));
            } else {
                if (!audio.paused) audio.pause();
            }
        }
    });
  }, [ambienceState, isMuted, isInitialized]);

  const getAudioContext = () => {
      if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) audioContextRef.current = new AudioCtx();
      }
      return audioContextRef.current;
  };

  const initializeAudio = () => {
     if (isInitialized) return;
     setIsInitialized(true);
     getAudioContext()?.resume();
     if (!isPlaying && audioRef.current) {
         playTrack(currentTrack);
     }
  };

  const playTrack = async (type: MusicType) => {
    if (!audioRef.current) return;
    
    if (currentTrack !== type || !isPlaying) {
        setCurrentTrack(type);
        audioRef.current.src = TRACKS[type];
        audioRef.current.volume = isMuted ? 0 : volume;
        
        try {
            await audioRef.current.play();
            setIsPlaying(true);
        } catch (e) {
            console.warn("Autoplay blocked or failed", e);
            setIsPlaying(false);
        }
    }
  };

  const toggleMute = () => {
      setIsMuted(prev => !prev);
  };

  const toggleAmbience = (type: AmbienceType) => {
      setAmbienceState(prev => ({
          ...prev,
          [type]: { ...prev[type], isPlaying: !prev[type].isPlaying }
      }));
  };

  const setAmbienceVolume = (type: AmbienceType, vol: number) => {
      setAmbienceState(prev => ({
          ...prev,
          [type]: { ...prev[type], volume: vol }
      }));
  };

  const playSfx = (type: string) => {
      if (isMuted) return;
      
      switch (type) {
          case 'click': playUiClick(); break;
          case 'dice_shake': playDiceShake(); break;
          case 'dice_roll': playDiceRoll(); break;
          case 'success': playNotification('success'); break;
          case 'error': playNotification('error'); break;
          default: playNotification('neutral');
      }
  };

  const speak = async (text: string, voice: string) => {
      if (isMuted) return;
      
      // Stop current speech
      stopSpeaking();
      setIsSpeaking(true);

      try {
          const base64 = await generateSpeech(text, voice);
          if (!base64) {
              setIsSpeaking(false);
              return;
          }

          const ctx = getAudioContext();
          if (!ctx) return;
          
          const buffer = await decodeBase64PCM(base64, ctx);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          
          // Connect to gain node for volume control
          const gainNode = ctx.createGain();
          gainNode.gain.value = volume + 0.2; // Boost TTS slightly
          gainNode.connect(ctx.destination);
          
          source.connect(gainNode);
          
          source.onended = () => {
              setIsSpeaking(false);
              ttsSourceRef.current = null;
          };
          
          ttsSourceRef.current = source;
          source.start();

      } catch (e) {
          console.error("TTS Playback error", e);
          setIsSpeaking(false);
      }
  };

  const stopSpeaking = () => {
      if (ttsSourceRef.current) {
          try {
              ttsSourceRef.current.stop();
          } catch (e) {}
          ttsSourceRef.current = null;
      }
      setIsSpeaking(false);
  };

  return (
    <AudioContext.Provider value={{
      isMuted,
      volume,
      currentTrack,
      isPlaying,
      ambienceState,
      toggleAmbience,
      setAmbienceVolume,
      toggleMute,
      setVolume,
      playTrack,
      playSfx,
      initializeAudio,
      isSpeaking,
      speak,
      stopSpeaking
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
