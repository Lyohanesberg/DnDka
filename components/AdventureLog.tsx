import React, { useState } from 'react';
import { Character, LocationState } from '../types';
import { Book, X, Feather, Download, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateCampaignChapter, generateItemImage } from '../services/geminiService';

interface AdventureLogProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  character: Character;
  location: LocationState;
}

const AdventureLog: React.FC<AdventureLogProps> = ({
  isOpen, onClose, summary, character, location
}) => {
  const [activeTab, setActiveTab] = useState<'chronicle' | 'export'>('chronicle');
  const [chronicleText, setChronicleText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [bookCover, setBookCover] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateChapter = async () => {
      setIsGenerating(true);
      try {
          const text = await generateCampaignChapter(summary, character.worldSetting);
          setChronicleText(text);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGenerateCover = async () => {
      setIsGenerating(true);
      try {
          const prompt = `Fantasy book cover art for a story set in ${character.worldSetting}. 
          Featuring a ${character.race} ${character.class}. 
          Title: Chronicles of ${character.name}.
          Style: Leather bound book, cinematic, magical.`;
          
          const url = await generateItemImage(prompt); // Reusing Item Image gen as it's 1:1
          if (url) setBookCover(url);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleExportHtml = () => {
      const date = new Date().toLocaleDateString('uk-UA');
      const htmlContent = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Chronicles of ${character.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap');
        :root {
            --bg: #f5f5dc;
            --text: #2c1810;
            --accent: #8b4513;
        }
        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: 'Cormorant Garamond', serif;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            background-image: url('https://www.transparenttextures.com/patterns/aged-paper.png');
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid var(--accent);
            padding: 40px;
            background: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
        }
        h1, h2, h3 {
            font-family: 'Cinzel', serif;
            color: var(--accent);
            text-align: center;
            text-transform: uppercase;
        }
        h1 { font-size: 3em; border-bottom: 2px double var(--accent); padding-bottom: 20px; }
        .meta { text-align: center; font-style: italic; margin-bottom: 40px; font-size: 0.9em; color: #555; }
        .content { font-size: 1.2em; text-align: justify; }
        .character-card {
            display: flex;
            gap: 20px;
            border: 1px solid var(--accent);
            padding: 20px;
            margin-bottom: 30px;
            background: #e8e4d9;
        }
        .avatar { width: 150px; height: 150px; object-fit: cover; border: 2px solid var(--accent); border-radius: 50%; }
        .stats { flex: 1; }
        .cover-img { width: 100%; max-height: 400px; object-fit: cover; margin-bottom: 30px; border: 5px solid var(--accent); }
        hr { border: 0; height: 1px; background: var(--accent); margin: 30px 0; opacity: 0.5; }
    </style>
</head>
<body>
    <div class="container">
        ${bookCover ? `<img src="${bookCover}" class="cover-img" alt="Cover" />` : ''}
        <h1>Хроніки ${character.name}</h1>
        <div class="meta">Дата експорту: ${date} • Світ: ${character.worldSetting}</div>

        <div class="character-card">
            ${character.avatarUrl ? `<img src="${character.avatarUrl}" class="avatar" />` : ''}
            <div class="stats">
                <h2>${character.name}</h2>
                <p><strong>Раса:</strong> ${character.race} &nbsp; <strong>Клас:</strong> ${character.class} (Lvl ${character.level})</p>
                <p><strong>HP:</strong> ${character.hp}/${character.maxHp} &nbsp; <strong>AC:</strong> ${character.ac}</p>
                <p><strong>Інвентар:</strong> ${character.inventory.join(', ')}</p>
            </div>
        </div>

        <div class="content">
            <h3>Останні Події</h3>
            <div>${chronicleText ? chronicleText.replace(/\n/g, '<br/>') : summary}</div>
        </div>
        
        <hr/>
        
        <div class="content">
            <h3>Поточна Локація</h3>
            <p><strong>${location.name}</strong></p>
            <p><em>${location.description}</em></p>
            ${location.imageUrl ? `<img src="${location.imageUrl}" style="width:100%; border:1px solid #8b4513; margin-top:10px;" />` : ''}
        </div>
    </div>
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Chronicles_${character.name}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#eaddcf] w-full max-w-4xl h-[85vh] rounded-r-lg rounded-l-sm shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex relative overflow-hidden border-l-[12px] border-[#3e2723]">
        
        {/* Book Spine Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#2d1b15] to-[#5d4037] z-20 shadow-inner"></div>

        {/* Right Page (Main Content) */}
        <div className="flex-1 flex flex-col p-8 pl-12 h-full overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#5d4037] hover:text-[#2c1810] z-30"><X className="w-6 h-6" /></button>
            
            <div className="flex justify-center mb-6 border-b border-[#8d6e63] pb-2 gap-8">
                <button onClick={() => setActiveTab('chronicle')} className={`font-serif text-lg font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'chronicle' ? 'text-[#8b4513] underline decoration-2 underline-offset-4' : 'text-[#a1887f] hover:text-[#5d4037]'}`}>
                    <Book className="w-5 h-5" /> Літопис
                </button>
                <button onClick={() => setActiveTab('export')} className={`font-serif text-lg font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === 'export' ? 'text-[#8b4513] underline decoration-2 underline-offset-4' : 'text-[#a1887f] hover:text-[#5d4037]'}`}>
                    <Download className="w-5 h-5" /> Експорт
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                {activeTab === 'chronicle' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            {bookCover ? (
                                <img src={bookCover} alt="Cover" className="w-48 h-64 object-cover mx-auto rounded shadow-md border-4 border-[#5d4037] mb-4" />
                            ) : (
                                <div className="w-48 h-64 mx-auto border-4 border-dashed border-[#a1887f] flex flex-col items-center justify-center text-[#a1887f] mb-4 cursor-pointer hover:bg-[#d7ccc8]/30 transition-colors" onClick={handleGenerateCover}>
                                    {isGenerating ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-12 h-12 mb-2" />}
                                    <span className="text-xs uppercase font-bold">Згенерувати Обкладинку</span>
                                </div>
                            )}
                            <h2 className="text-3xl font-serif font-bold text-[#3e2723] mb-2">{character.name}'s Journey</h2>
                            <p className="text-[#5d4037] italic text-sm">{character.worldSetting}</p>
                        </div>

                        <div className="prose prose-amber max-w-none font-serif text-[#2c1810] leading-relaxed text-lg text-justify">
                            {chronicleText ? (
                                <ReactMarkdown>{chronicleText}</ReactMarkdown>
                            ) : (
                                <div className="opacity-70">
                                    <p className="mb-4">{summary || "Історія лише починається..."}</p>
                                    <div className="text-center mt-8">
                                        <button 
                                            onClick={handleGenerateChapter}
                                            disabled={isGenerating || !summary}
                                            className="bg-[#8d6e63] hover:bg-[#6d4c41] text-[#f5f5dc] px-6 py-2 rounded font-bold uppercase tracking-widest shadow-md transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Feather className="w-4 h-4" />}
                                            Написати художню главу (ШІ)
                                        </button>
                                        <p className="text-xs text-[#8d6e63] mt-2 max-w-xs mx-auto">
                                            ШІ перетворить короткий зміст на повноцінну главу книги для вашого архіву.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'export' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-8">
                        <div className="text-center">
                            <Sparkles className="w-16 h-16 text-[#8b4513] mx-auto mb-4 opacity-50" />
                            <h3 className="text-2xl font-serif font-bold text-[#3e2723] mb-2">Зберегти Спогади</h3>
                            <p className="text-[#5d4037] max-w-md mx-auto">
                                Створіть красивий HTML файл, який містить вашу історію, карту, та зображення персонажа. 
                                Ви зможете відкрити його в будь-якому браузері навіть без інтернету.
                            </p>
                        </div>

                        <button 
                            onClick={handleExportHtml}
                            className="w-full max-w-sm bg-[#5d4037] hover:bg-[#3e2723] text-[#f5f5dc] py-4 rounded shadow-lg flex items-center justify-center gap-3 font-bold text-lg transition-transform hover:scale-105"
                        >
                            <Download className="w-6 h-6" /> Завантажити HTML Книгу
                        </button>

                        <div className="p-4 border border-[#a1887f] rounded bg-[#f5f5dc]/50 text-sm text-[#5d4037]">
                            <strong>Що входить в експорт:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Художній текст історії</li>
                                <li>Характеристики персонажа та інвентар</li>
                                <li>Поточна карта локації</li>
                                <li>Згенерована обкладинка (якщо є)</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdventureLog;