
import React, { useState, useEffect, useMemo } from 'react';
import { dndApi, ApiReference, ApiDetail } from '../services/dndApiService';
import { BookOpen, Search, X, Loader2, ChevronRight, Flame, Skull, Shield, Scroll, GripVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CompendiumProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = 'spells' | 'monsters' | 'equipment' | 'rules' | 'classes';

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: 'spells', label: 'Закляття', icon: <Flame className="w-4 h-4" /> },
  { id: 'monsters', label: 'Бестіарій', icon: <Skull className="w-4 h-4" /> },
  { id: 'equipment', label: 'Спорядження', icon: <Shield className="w-4 h-4" /> },
  { id: 'classes', label: 'Класи', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'rules', label: 'Правила', icon: <Scroll className="w-4 h-4" /> },
];

const Compendium: React.FC<CompendiumProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('spells');
  const [list, setList] = useState<ApiReference[]>([]);
  const [selectedItem, setSelectedItem] = useState<ApiDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch list when category changes
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchList = async () => {
      setIsLoadingList(true);
      setSelectedItem(null); // Reset selection
      setSearchQuery(''); // Reset search
      
      // Rules endpoint is slightly different in structure, usually 'rule-sections' or specific rules
      // For simplicity we map our category IDs to API endpoints
      let endpoint: string = activeCategory;
      if (activeCategory === 'rules') endpoint = 'rule-sections';
      
      const data = await dndApi.getList(endpoint);
      setList(data);
      setIsLoadingList(false);
    };

    fetchList();
  }, [activeCategory, isOpen]);

  const handleSelectItem = async (item: ApiReference) => {
    setIsLoadingDetail(true);
    const detail = await dndApi.getDetail(item.url);
    setSelectedItem(detail);
    setIsLoadingDetail(false);
  };

  const handleDragStart = (e: React.DragEvent, item: ApiReference) => {
      if (activeCategory === 'monsters') {
          const dragData = {
              name: item.name,
              url: item.url,
              type: 'monster'
          };
          e.dataTransfer.setData('dnd-monster', JSON.stringify(dragData));
          e.dataTransfer.effectAllowed = 'copy';
      }
  };

  const filteredList = useMemo(() => {
    if (!searchQuery) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [list, searchQuery]);

  // Helper to render complex JSON data recursively
  const renderDetailValue = (key: string, value: any): React.ReactNode => {
    if (!value) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <span className="text-stone-300">{value.toString()}</span>;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        if (typeof value[0] === 'string') {
             return <ul className="list-disc pl-4 space-y-1">{value.map((v, i) => <li key={i} className="text-stone-300 text-sm">{v}</li>)}</ul>;
        }
        if (typeof value[0] === 'object') {
            // specialized rendering for damage, dc, etc could go here, simplified for now
             return (
                <div className="pl-2 space-y-2 border-l-2 border-stone-800">
                    {value.map((v: any, i: number) => (
                        <div key={i}>{renderObject(v)}</div>
                    ))}
                </div>
             );
        }
    }
    if (typeof value === 'object') {
        return renderObject(value);
    }
    return null;
  };

  const renderObject = (obj: any) => {
      return (
          <div className="space-y-1">
              {Object.entries(obj).map(([k, v]) => {
                  if (k === 'index' || k === 'url' || k === 'name' || k === 'desc') return null;
                  return (
                      <div key={k} className="text-sm">
                          <span className="text-amber-600 font-bold uppercase text-[10px] mr-2">{k.replace(/_/g, ' ')}:</span>
                          {renderDetailValue(k, v)}
                      </div>
                  )
              })}
          </div>
      )
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-stone-900 border-2 border-amber-800 rounded-lg shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-950/80 p-4 border-b border-amber-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-900/50 rounded border border-amber-700 text-amber-500">
                 <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl text-amber-500 fantasy-font tracking-wider">База Знань (SRD)</h2>
                <p className="text-[10px] text-stone-400 uppercase">Dungeons & Dragons 5th Edition</p>
              </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Left Sidebar (Categories & List) */}
            <div className="w-1/3 md:w-1/4 bg-stone-950 border-r border-stone-800 flex flex-col">
                
                {/* Tabs */}
                <div className="flex overflow-x-auto scrollbar-thin border-b border-stone-800">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-1 min-w-[60px] p-3 flex flex-col items-center gap-1 text-xs font-bold transition-colors
                                ${activeCategory === cat.id ? 'bg-stone-900 text-amber-500 border-b-2 border-amber-500' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/30'}
                            `}
                            title={cat.label}
                        >
                            {cat.icon}
                            <span className="hidden md:block">{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="p-3 border-b border-stone-800 bg-stone-900/50">
                    <div className="relative">
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Пошук..."
                            className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded pl-8 pr-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                        />
                        <Search className="w-4 h-4 text-stone-500 absolute left-2.5 top-2" />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {isLoadingList ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center text-stone-600 text-xs italic py-4">Нічого не знайдено</div>
                    ) : (
                        filteredList.map(item => (
                            <div
                                key={item.index}
                                className={`w-full flex group items-center rounded px-2 py-1 hover:bg-stone-900 transition-colors ${selectedItem?.index === item.index ? 'bg-amber-900/30' : ''}`}
                            >
                                {activeCategory === 'monsters' && (
                                    <div 
                                        className="cursor-grab text-stone-600 hover:text-amber-500 mr-2"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        title="Перетягніть на мапу"
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                )}
                                <button
                                    onClick={() => handleSelectItem(item)}
                                    className={`flex-1 text-left text-sm flex items-center justify-between
                                        ${selectedItem?.index === item.index ? 'text-amber-400' : 'text-stone-400 group-hover:text-stone-200'}
                                    `}
                                >
                                    <span className="truncate">{item.name}</span>
                                    <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${selectedItem?.index === item.index ? 'opacity-100 text-amber-500' : ''}`} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Content (Details) */}
            <div className="flex-1 bg-stone-900 overflow-y-auto custom-scrollbar p-6 relative">
                {!selectedItem ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-600 opacity-30 select-none">
                        <BookOpen className="w-24 h-24 mb-4" />
                        <p className="text-lg font-serif italic">Оберіть запис зі списку...</p>
                    </div>
                ) : isLoadingDetail ? (
                    <div className="flex items-center justify-center h-full">
                         <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                        {/* Detail Header */}
                        <div className="border-b-2 border-amber-700 pb-4 mb-6">
                             <h1 className="text-3xl font-bold text-amber-500 fantasy-font tracking-wide mb-2">{selectedItem.name}</h1>
                             
                             {/* Meta Tags */}
                             <div className="flex flex-wrap gap-2">
                                 {selectedItem.level !== undefined && (
                                     <span className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-300 border border-stone-700">
                                         Рівень: {selectedItem.level}
                                     </span>
                                 )}
                                 {selectedItem.school && (
                                     <span className="px-2 py-0.5 bg-purple-900/30 rounded text-xs text-purple-300 border border-purple-800">
                                         {selectedItem.school.name}
                                     </span>
                                 )}
                                 {selectedItem.type && (
                                     <span className="px-2 py-0.5 bg-red-900/30 rounded text-xs text-red-300 border border-red-800">
                                         {selectedItem.type}
                                     </span>
                                 )}
                                 {selectedItem.armor_class && (
                                    <span className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-300 border border-stone-700">
                                        AC: {Array.isArray(selectedItem.armor_class) ? selectedItem.armor_class[0].value : selectedItem.armor_class}
                                    </span>
                                 )}
                                  {selectedItem.hit_points && (
                                    <span className="px-2 py-0.5 bg-red-950 rounded text-xs text-red-400 border border-red-900">
                                        HP: {selectedItem.hit_points}
                                    </span>
                                 )}
                                  {selectedItem.challenge_rating !== undefined && (
                                    <span className="px-2 py-0.5 bg-amber-950 rounded text-xs text-amber-400 border border-amber-900">
                                        CR: {selectedItem.challenge_rating}
                                    </span>
                                 )}
                             </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4 text-stone-300 leading-relaxed font-serif text-lg">
                             {selectedItem.desc && selectedItem.desc.map((paragraph: string, idx: number) => (
                                 <div key={idx} className="markdown-content">
                                     <ReactMarkdown>{paragraph}</ReactMarkdown>
                                 </div>
                             ))}
                             
                             {/* Higher Levels */}
                             {selectedItem.higher_level && selectedItem.higher_level.length > 0 && (
                                 <div className="mt-4 bg-stone-800/50 p-3 rounded border border-stone-700">
                                     <h4 className="text-amber-500 font-bold text-sm uppercase mb-1">На вищих рівнях</h4>
                                     {selectedItem.higher_level.map((p: string, i: number) => (
                                         <p key={i} className="text-sm italic">{p}</p>
                                     ))}
                                 </div>
                             )}
                        </div>

                        {/* Stat Block (Dynamic) */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t border-stone-800 pt-6">
                            {renderObject(selectedItem)}
                        </div>
                    </div>
                )}
            </div>
        </div>

         {/* Footer */}
        <div className="bg-stone-950 p-2 border-t border-stone-800 text-center text-[10px] text-stone-600 uppercase tracking-widest">
           Data provided by D&D 5e API (SRD)
        </div>
      </div>
    </div>
  );
};

export default Compendium;
