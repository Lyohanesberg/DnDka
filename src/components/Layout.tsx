import React from 'react';
import { Outlet } from 'react-router-dom';
import { useGameStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { Menu, Scroll, Book, Wand2, ShoppingBag, Settings, Save, Package, Video } from 'lucide-react';
import { Character } from '../types';

// Components
import CharacterSheet from './CharacterSheet';
import DMTools from './DMTools';
import Journal from './Journal';
import Compendium from './Compendium';
import AdventureLog from './AdventureLog';
import CloudSaves from './CloudSaves';
import MerchantShop from './MerchantShop';
import HomebrewManager from './HomebrewManager';
import LootModal from './LootModal';
import MultiplayerConnection from './MultiplayerConnection';
import ModManager from './ModManager';
import VideoChat from './VideoChat';

const Layout: React.FC = () => {
  const { theme } = useTheme();
  const { 
    character, activeTab, showSidebar, modals, mpMode, activeLootChest,
    openModal, closeModal, toggleSidebar, toggleVideoChat, isVideoChatOpen,
    // Actions for DMTools
    sendUserMessage,
    addNote,
    togglePause,
    isGamePaused,
    forceView,
    updateLocation,
    remoteCharacters,
    // Props for MerchantShop
    updateCharacter,
    location
  } = useGameStore();

  const isDM = mpMode === 'host' || mpMode === 'none';
  const isSpectator = character.isSpectator;
  
  const connectedPlayersList = Object.values(remoteCharacters) as Character[];

  return (
    <div className={`flex flex-col h-screen bg-stone-950 text-stone-200 overflow-hidden relative ${theme === 'parchment' ? 'theme-parchment' : theme === 'scifi' ? 'theme-scifi' : ''}`}>
      
      {/* Header */}
      <header className="h-12 bg-stone-900 border-b border-stone-800 flex items-center px-4 justify-between shrink-0 z-40 relative shadow-lg">
          <div className="flex items-center gap-2">
              <button onClick={toggleSidebar} className="p-1.5 hover:bg-stone-800 rounded text-stone-400"><Menu className="w-5 h-5" /></button>
              <span className="text-amber-500 font-bold fantasy-font tracking-widest hidden md:block">AI DUNGEON MASTER</span>
          </div>
          <div className="flex items-center gap-2">
              <MultiplayerConnection />
              <div className="h-6 w-px bg-stone-700 mx-1" />
              {/* Video Chat Toggle */}
              {mpMode !== 'none' && (
                  <button 
                    onClick={toggleVideoChat} 
                    className={`p-1.5 rounded transition-colors ${isVideoChatOpen ? 'bg-stone-800 text-amber-500' : 'text-stone-400 hover:text-amber-500'}`}
                    title="Відеочат"
                  >
                      <Video className="w-5 h-5" />
                  </button>
              )}
              <button onClick={() => openModal('journal')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-500" title="Журнал"><Scroll className="w-5 h-5" /></button>
              <button onClick={() => openModal('compendium')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-500" title="Довідник"><Book className="w-5 h-5" /></button>
              <button onClick={() => openModal('homebrew')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-purple-500" title="Майстерня"><Wand2 className="w-5 h-5" /></button>
              <button onClick={() => openModal('merchant')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-green-500" title="Торговець"><ShoppingBag className="w-5 h-5" /></button>
              <button onClick={() => openModal('adventureLog')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-blue-500" title="Літопис"><Settings className="w-5 h-5" /></button>
              <button onClick={() => openModal('modManager')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-cyan-500" title="Модифікації"><Package className="w-5 h-5" /></button>
              <button onClick={() => openModal('cloudSaves')} className="p-1.5 hover:bg-stone-800 rounded text-stone-400 hover:text-white" title="Збереження"><Save className="w-5 h-5" /></button>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex relative">
          {/* Sidebar */}
          {!isSpectator && (
            <aside className={`absolute md:relative z-20 h-full transition-all duration-300 ease-in-out bg-stone-950 border-r border-stone-800 shrink-0 ${activeTab === 'sheet' ? 'translate-x-0 w-full' : '-translate-x-full w-full md:translate-x-0'} ${showSidebar ? 'md:w-1/3 lg:w-1/4' : 'md:w-0 md:border-r-0 overflow-hidden'}`}>
                <div className={`h-full p-4 ${!showSidebar ? 'hidden' : ''}`}>
                    <CharacterSheet />
                </div>
            </aside>
          )}

          {/* Page Content (Game or Lobby) */}
          <div className="flex-1 h-full overflow-hidden">
             <Outlet />
          </div>
      </main>

      {/* Video Chat Overlay */}
      {mpMode !== 'none' && <VideoChat />}

      {/* Global Modals */}
      {isDM && (
        <DMTools 
            isOpen={modals.dmTools} 
            onClose={() => closeModal('dmTools')} 
            worldSetting={character.worldSetting}
            onSendToChat={(text, imageUrl, recipient) => sendUserMessage(text, imageUrl, recipient)}
            onAddToNotes={(title, content) => addNote({ 
                id: Math.random().toString(36).substr(2, 9), 
                title, 
                content, 
                type: 'other', 
                timestamp: Date.now() 
            })}
            connectedPlayers={connectedPlayersList}
            onTogglePause={togglePause}
            isPaused={isGamePaused}
            onForceView={(x, y) => forceView(x, y)}
            onUpdateWeather={(type) => updateLocation({ weather: type })}
        />
      )}
      <Journal isOpen={modals.journal} onClose={() => closeModal('journal')} />
      <Compendium isOpen={modals.compendium} onClose={() => closeModal('compendium')} />
      <AdventureLog isOpen={modals.adventureLog} onClose={() => closeModal('adventureLog')} />
      <CloudSaves isOpen={modals.cloudSaves} onClose={() => closeModal('cloudSaves')} />
      <MerchantShop 
        isOpen={modals.merchant} 
        onClose={() => closeModal('merchant')} 
        character={character}
        onUpdateCharacter={updateCharacter}
        locationName={location.name}
        worldSetting={character.worldSetting}
      />
      <HomebrewManager isOpen={modals.homebrew} onClose={() => closeModal('homebrew')} />
      <ModManager isOpen={modals.modManager} onClose={() => closeModal('modManager')} />
      {activeLootChest && <LootModal isOpen={true} onClose={() => useGameStore.getState().closeLootModal()} />}
    </div>
  );
};

export default Layout;