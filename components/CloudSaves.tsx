import React, { useState, useEffect } from 'react';
import { Download, Upload, X, Check, FileJson, Save, HardDrive, Cloud, LogIn, LogOut, Trash2, Loader2, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { 
    isDriveConfigured, initGoogleServices, signInToGoogle, 
    signOutFromGoogle, listSaveFiles, saveGameToDrive, 
    loadGameFromDrive, deleteGameFromDrive, setClientId 
} from '../services/googleDriveService';
import { DriveFile } from '../types';

interface CloudSavesProps {
  isOpen: boolean;
  onClose: () => void;
  getCurrentGameState: () => any;
  onLoadGame: (data: any) => void;
}

const CloudSaves: React.FC<CloudSavesProps> = ({ isOpen, onClose, getCurrentGameState, onLoadGame }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Cloud State
  const [isDriveReady, setIsDriveReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Manual Config
  const [manualClientId, setManualClientId] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
      if (isOpen && activeTab === 'cloud') {
          // Check for saved ID in local storage
          const savedId = localStorage.getItem('dnd_google_client_id');
          if (savedId) {
              setClientId(savedId);
          }
          
          if (isDriveConfigured() || savedId) {
              initDrive();
          } else {
              setIsDriveReady(false);
          }
      }
  }, [isOpen, activeTab]);

  const initDrive = async () => {
      setIsDriveReady(true);
      try {
          await initGoogleServices();
          // Check if we have a token (simple check)
          const token = window.gapi?.client?.getToken();
          if (token) {
              setIsSignedIn(true);
              refreshFiles();
          }
      } catch (e) {
          console.error("Drive init failed", e);
          setStatusMsg("Не вдалося ініціалізувати Google Drive.");
          setIsDriveReady(false); // Revert if init fails seriously
      }
  };

  const handleSaveConfig = () => {
      if (manualClientId.trim()) {
          setClientId(manualClientId.trim());
          localStorage.setItem('dnd_google_client_id', manualClientId.trim());
          setShowConfig(false);
          initDrive();
      }
  };

  const handleSignIn = async () => {
      setIsLoading(true);
      try {
          await signInToGoogle();
          setIsSignedIn(true);
          await refreshFiles();
      } catch (e) {
          console.error(e);
          setStatusMsg("Помилка входу в Google.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleSignOut = () => {
      signOutFromGoogle();
      setIsSignedIn(false);
      setDriveFiles([]);
      setStatusMsg("Ви вийшли з облікового запису.");
      setTimeout(() => setStatusMsg(null), 2000);
  };

  const refreshFiles = async () => {
      setIsRefreshing(true);
      try {
          const files = await listSaveFiles();
          setDriveFiles(files);
      } catch (e) {
          console.error(e);
          // Handle token expiry by signing out visually
          if ((e as any)?.status === 401) {
              setIsSignedIn(false);
              setStatusMsg("Сесія вичерпана. Увійдіть знову.");
          } else {
              setStatusMsg("Не вдалося оновити список файлів.");
          }
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleSaveToDrive = async () => {
      setIsLoading(true);
      try {
          const data = getCurrentGameState();
          await saveGameToDrive(data);
          setStatusMsg("Гру успішно збережено у хмару!");
          await refreshFiles();
      } catch (e) {
          console.error(e);
          setStatusMsg("Помилка збереження.");
      } finally {
          setIsLoading(false);
          setTimeout(() => setStatusMsg(null), 3000);
      }
  };

  const handleLoadFromDrive = async (fileId: string) => {
      setIsLoading(true);
      try {
          const data = await loadGameFromDrive(fileId);
          onLoadGame(data);
          setStatusMsg("Гру успішно завантажено!");
          setTimeout(() => {
              onClose();
              setStatusMsg(null);
          }, 1500);
      } catch (e) {
          console.error(e);
          setStatusMsg("Помилка завантаження файлу.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDelete = async (fileId: string) => {
      if (!confirm("Ви впевнені, що хочете видалити це збереження назавжди?")) return;
      
      setIsRefreshing(true);
      try {
          await deleteGameFromDrive(fileId);
          await refreshFiles();
          setStatusMsg("Файл видалено.");
          setTimeout(() => setStatusMsg(null), 2000);
      } catch (e) {
          console.error(e);
          setStatusMsg("Помилка видалення.");
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleDownloadLocal = () => {
      try {
        const data = getCurrentGameState();
        const fileName = `dnd_save_${data.character?.name?.replace(/\s+/g, '_') || 'hero'}_${new Date().toISOString().slice(0,10)}.json`;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatusMsg("Файл збережено на пристрій!");
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (e) {
          console.error(e);
          setStatusMsg("Помилка створення файлу.");
      }
  };

  const handleUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const result = event.target?.result;
              if (typeof result === 'string') {
                  const data = JSON.parse(result);
                  onLoadGame(data);
                  setStatusMsg("Файл успішно завантажено!");
                  setTimeout(() => {
                      onClose();
                      setStatusMsg(null);
                  }, 1500);
              }
          } catch (err) {
              console.error(err);
              setStatusMsg("Помилка читання файлу.");
          } finally {
              setIsLoading(false);
          }
      };
      reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border-2 border-amber-800 rounded-lg shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 to-stone-900 p-4 border-b border-amber-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl text-amber-500 fantasy-font flex items-center gap-2 tracking-wider">
             <Save className="w-6 h-6" /> Меню Збережень
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950">
            <button 
                onClick={() => setActiveTab('local')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'local' ? 'bg-stone-800 text-amber-500 border-b-2 border-amber-500' : 'text-stone-500 hover:bg-stone-900'}`}
            >
                <HardDrive className="w-4 h-4" /> Цей Пристрій
            </button>
            <button 
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'cloud' ? 'bg-stone-800 text-blue-400 border-b-2 border-blue-500' : 'text-stone-500 hover:bg-stone-900'}`}
            >
                <Cloud className="w-4 h-4" /> Google Drive
            </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-stone-900 flex flex-col relative overflow-y-auto custom-scrollbar min-h-[350px]">
            
            {/* Status Bar */}
            {statusMsg && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-amber-900/90 border border-amber-500 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 w-max max-w-[90%]">
                    <Check className="w-3 h-3" /> {statusMsg}
                </div>
            )}

            {/* LOCAL TAB */}
            {activeTab === 'local' && (
                <div className="flex flex-col items-center justify-center space-y-8 h-full py-4">
                    <div className="p-6 bg-stone-950 rounded-full border border-stone-700 relative shadow-lg group">
                        <div className="absolute inset-0 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
                        <FileJson className="w-16 h-16 text-stone-400 group-hover:text-amber-500 transition-colors" />
                    </div>

                    <div className="space-y-2 text-center">
                        <h3 className="text-stone-200 font-bold text-lg">Локальний файл (.json)</h3>
                        <p className="text-stone-500 text-sm max-w-xs mx-auto leading-relaxed">
                        Збережіть гру як файл на цьому пристрої. Ідеально для бекапів.
                        </p>
                    </div>

                    <div className="w-full space-y-4">
                        <button 
                            onClick={handleDownloadLocal}
                            className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded shadow flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                        >
                            <Download className="w-5 h-5" />
                            Завантажити Файл
                        </button>

                        <div className="relative group w-full">
                            <input 
                                type="file" 
                                accept=".json"
                                onChange={handleUploadLocal}
                                disabled={isLoading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button className="w-full bg-stone-800 group-hover:bg-stone-700 text-stone-300 font-bold py-3 px-4 rounded border border-stone-600 flex items-center justify-center gap-3 transition-colors">
                                <Upload className="w-5 h-5" />
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Відкрити Файл"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CLOUD TAB */}
            {activeTab === 'cloud' && (
                <div className="flex flex-col h-full relative">
                    {/* Config Button */}
                    <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className="absolute top-0 right-0 p-2 text-stone-600 hover:text-stone-400 transition-colors"
                        title="Налаштування Client ID"
                    >
                        <Settings className="w-4 h-4" />
                    </button>

                    {showConfig ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4 bg-stone-950/50 rounded border border-stone-800">
                            <h3 className="text-stone-300 font-bold text-sm">Налаштування Google Cloud</h3>
                            <p className="text-[10px] text-stone-500 max-w-xs">
                                Введіть ваш Google Client ID для доступу до Drive API.
                            </p>
                            <input 
                                type="text" 
                                value={manualClientId}
                                onChange={(e) => setManualClientId(e.target.value)}
                                placeholder="000000-xxxxxx.apps.googleusercontent.com"
                                className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-xs text-stone-300 focus:border-blue-500 outline-none"
                            />
                            <div className="flex gap-2 w-full">
                                <button onClick={() => setShowConfig(false)} className="flex-1 bg-stone-800 text-stone-400 text-xs py-2 rounded">Скасувати</button>
                                <button onClick={handleSaveConfig} className="flex-1 bg-blue-900 text-blue-200 text-xs py-2 rounded font-bold hover:bg-blue-800">Зберегти</button>
                            </div>
                        </div>
                    ) : !isDriveReady ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
                            <AlertCircle className="w-16 h-16 text-red-500" />
                            <h3 className="text-stone-300 font-bold">Інтеграція не налаштована</h3>
                            <p className="text-stone-500 text-sm max-w-xs">
                                Google Client ID відсутній. Натисніть шестерню зверху, щоб ввести його вручну, або налаштуйте змінні середовища.
                            </p>
                        </div>
                    ) : !isSignedIn ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in duration-300">
                            <div className="p-6 bg-stone-950 rounded-full border border-blue-900 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
                                <Cloud className="w-16 h-16 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-stone-200 font-bold text-lg mb-2">Google Drive</h3>
                                <p className="text-stone-500 text-sm max-w-xs mx-auto">
                                    Увійдіть, щоб синхронізувати прогрес між пристроями.
                                </p>
                            </div>
                            <button 
                                onClick={handleSignIn}
                                disabled={isLoading}
                                className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-3 transition-transform hover:scale-105 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                                Увійти через Google
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-4 border-b border-stone-800 pb-2">
                                <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                                    <Cloud className="w-4 h-4" /> Підключено
                                </div>
                                <button onClick={handleSignOut} className="text-xs text-stone-500 hover:text-red-400 flex items-center gap-1">
                                    <LogOut className="w-3 h-3" /> Вийти
                                </button>
                            </div>

                            <button 
                                onClick={handleSaveToDrive}
                                disabled={isLoading}
                                className="w-full bg-stone-800 hover:bg-blue-900/30 border border-stone-700 hover:border-blue-500 text-stone-200 font-bold py-3 rounded mb-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Зберегти поточну гру в Хмару
                            </button>

                            <div className="flex justify-between items-center mb-2 text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                                <span>Ваші Збереження</span>
                                <button onClick={refreshFiles} disabled={isRefreshing} className="hover:text-white transition-colors">
                                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 bg-stone-950/50 rounded p-2 border border-stone-800 min-h-[150px]">
                                {driveFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-stone-600 text-xs italic gap-2">
                                        <Cloud className="w-8 h-8 opacity-20" />
                                        {isRefreshing ? "Завантаження списку..." : "Немає збережень у хмарі."}
                                    </div>
                                ) : (
                                    driveFiles.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-stone-900 border border-stone-700 rounded hover:border-stone-500 transition-colors group">
                                            <div className="overflow-hidden">
                                                <div className="text-sm font-bold text-stone-300 truncate">
                                                    {file.name.replace('dnd_ai_save_', '').replace('.json', '').replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-[10px] text-stone-500">
                                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'Unknown date'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleLoadFromDrive(file.id)}
                                                    className="p-2 bg-stone-800 hover:bg-green-900/50 text-stone-400 hover:text-green-400 rounded transition-colors"
                                                    title="Завантажити"
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(file.id)}
                                                    className="p-2 bg-stone-800 hover:bg-red-900/50 text-stone-400 hover:text-red-400 rounded transition-colors"
                                                    title="Видалити"
                                                    disabled={isLoading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CloudSaves;