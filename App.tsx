import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useGameStore } from './src/store';
import { peerService } from './src/services/peerService';
import { useAudio } from './src/contexts/AudioContext';
import { useGameController } from './src/hooks/useGameController';
import { UserPlus } from 'lucide-react';

// Components
import Layout from './src/components/Layout';
import GameSetup from './src/components/GameSetup';
import LobbyPanel from './src/components/LobbyPanel';
import GameArea from './src/components/GameArea';

const App = () => {
  const { playSfx } = useAudio();
  const navigate = useNavigate();

  // Initialize Game Logic & Listeners
  useGameController();

  // Store Selectors
  const { 
    pendingJoinRequests,
    removeJoinRequest,
    updateRemoteCharacter,
    appPhase
  } = useGameStore();

  // Route Guard based on Phase
  useEffect(() => {
      if (appPhase === 'game') {
          navigate('/game');
      } else if (appPhase === 'creation') {
          navigate('/lobby');
      } else if (appPhase === 'setup') {
          navigate('/');
      }
  }, [appPhase, navigate]);

  // Handle Accept/Reject Join Requests
  const handleAcceptJoin = (req: any) => {
      peerService.acceptConnection(req.connObj);
      updateRemoteCharacter(req.connId, req.char);
      removeJoinRequest(req.connId);
      playSfx('success');
  };

  const handleRejectJoin = (req: any) => {
      peerService.rejectConnection(req.connObj);
      removeJoinRequest(req.connId);
  };

  return (
    <>
      {/* Global Notifications Layer */}
      {pendingJoinRequests.length > 0 && (
          <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 animate-in slide-in-from-right">
              {pendingJoinRequests.map((req, idx) => (
                  <div key={idx} className="bg-stone-900 border border-amber-500 shadow-2xl p-3 rounded-lg flex flex-col gap-2 w-64 backdrop-blur-md">
                      <div className="flex items-center gap-2 border-b border-stone-700 pb-2">
                          <div className="bg-amber-900/50 p-1 rounded"><UserPlus className="w-4 h-4 text-amber-500" /></div>
                          <div>
                              <div className="font-bold text-sm text-stone-200">{req.char.name}</div>
                              <div className="text-[10px] text-stone-500">{req.char.race} {req.char.class}</div>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleAcceptJoin(req)} className="flex-1 bg-green-900/80 hover:bg-green-800 text-green-100 text-xs font-bold py-1.5 rounded transition-colors border border-green-700">Прийняти</button>
                          <button onClick={() => handleRejectJoin(req)} className="flex-1 bg-red-900/80 hover:bg-red-800 text-red-100 text-xs font-bold py-1.5 rounded transition-colors border border-red-700">Відхилити</button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<GameSetup />} />
        <Route element={<Layout />}>
          <Route path="/lobby" element={<LobbyPanel />} />
          <Route path="/game" element={<GameArea />} />
        </Route>
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;