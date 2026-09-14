import React, { useState, useMemo } from 'react';
import { Sparkles, Archive, Plus, Lightbulb, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Item, ItemType, AreaType } from '../types';

interface BrainstormProps {
  items: Item[];
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export default function Brainstorm({
  items,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}: BrainstormProps) {
  const [brainstormMode, setBrainstormMode] = useState<'hızlı' | 'derin'>('hızlı');
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [isGeneratedOpen, setIsGeneratedOpen] = useState(true);
  const [contextInput, setContextInput] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [ideas, setIdeas] = useState<{ title: string; notes: string; type: string }[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // List of saved brainstorm/ideas items
  const savedIdeas = useMemo(() => {
    return items.filter(i => i.area === 'brainstorm' && !i.archived);
  }, [items]);

  // Entities/Themes as context presets
  const contextPresets = useMemo(() => {
    return items.filter(i => (i.type === 'karakter' || i.type === 'mekân' || i.type === 'tema') && !i.archived);
  }, [items]);

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextInput.trim()) return;

    setLoadingAi(true);
    setIdeas([]);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'fikir-uret',
          data: {
            context: contextInput,
            mode: brainstormMode
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        setIdeas(JSON.parse(data.result));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Convert brainstorm idea directly to official Düzada/Merch entity!
  const handleConvertIdea = async (idea: { title: string; notes: string; type: string } | Item, targetType: 'karakter' | 'mekân' | 'olay' | 'drop') => {
    let targetArea: AreaType = 'duzada';
    if (targetType === 'drop') targetArea = 'merch';

    const id = `official_${Date.now()}`;
    const newOfficialItem: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      title: idea.title,
      area: targetArea,
      type: targetType,
      status: targetType === 'drop' ? 'Konsept' : 'Fikir',
      priority: 'orta',
      tags: [targetType, 'brainstorm-born'],
      links: [],
      notes: idea.notes,
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        ...(targetType === 'drop' ? {
          editionCount: 1,
          editionNotes: "Brainstorm kurgusundan doğan drop."
        } : {
          region: 'merkez',
          wikiSections: [
            { id: `wiki_${Date.now()}`, title: 'Kökeni & Lore', content: idea.notes, status: 'resmi' }
          ]
        })
      }
    };

    await onAddItem(newOfficialItem);
    
    // Archive the source brainstorm idea if it's already a saved Item
    if ('id' in idea) {
      await onUpdateItem({
        ...(idea as Item),
        archived: true
      });
    }

    alert(`"${idea.title}" fikri başarıyla resmi bir ${targetType.toUpperCase()} varlığı haline getirildi!`);
  };

  // Keep idea in local Fikir Havuzu
  const handleSaveToHavuz = async (idea: { title: string; notes: string; type: string }) => {
    await onAddItem({
      title: idea.title,
      area: 'brainstorm',
      type: 'fikir',
      status: 'Fikir',
      priority: 'orta',
      tags: ['beyin-fırtınası'],
      links: [],
      notes: idea.notes,
      images: [],
      isProposal: false,
      archived: false,
      metadata: {}
    });

    // Remove from active brainstorm results
    setIdeas(prev => prev.filter(i => i.title !== idea.title));
  };

  const handleArchiveSavedIdea = async (item: Item) => {
    await onUpdateItem({
      ...item,
      archived: true
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header breadcrumb */}
      <div className="pb-4 border-b border-[#CFC5B4]">
        <span className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9]">
          Kems Company • Yaratıcı Atölye
        </span>
        <h1 className="font-serif font-bold text-2xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1">
          Brainstorm & Fikir Havuzu
        </h1>
      </div>

      {/* Brainstorm setup workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: Fikir Üretici Trigger */}
        <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl paper-grain archive-shadow space-y-4">
          <div 
            className="flex items-center justify-between border-b border-[#CFC5B4]/50 pb-2 cursor-pointer select-none group"
            onClick={() => setIsSetupOpen(!isSetupOpen)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D35057]" />
              <h3 className="font-serif font-bold text-base text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-[#D35057] transition-colors">
                Beyin Fırtınası Başlat
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#D35057] hover:underline bg-[#D35057]/10 px-2 py-0.5 rounded">
              {isSetupOpen ? 'Kapat [-]' : 'Aç [+]'}
            </span>
          </div>

          {isSetupOpen && (
            <>
              <div className="flex items-center justify-between text-xs font-mono bg-white dark:bg-[#17345A] p-1.5 rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72]">
                <span className="pl-2 text-[#6A5E4C] dark:text-[#A6B0C9]">Mod:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setBrainstormMode('hızlı')}
                    className={`px-3 py-1 rounded-md capitalize font-bold transition-all ${brainstormMode === 'hızlı' ? 'bg-[#D35057] text-white' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
                  >
                    Hızlı (Çok Fikir)
                  </button>
                  <button
                    onClick={() => setBrainstormMode('derin')}
                    className={`px-3 py-1 rounded-md capitalize font-bold transition-all ${brainstormMode === 'derin' ? 'bg-[#D35057] text-white' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
                  >
                    Derin (Derinlikli)
                  </button>
                </div>
              </div>

              {/* Presets selecting click */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase">
                  Hızlı Bağlam Preseti Seç
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {contextPresets.slice(0, 5).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setContextInput(`"${item.title}" ${item.type} kurgusu üzerine fikir üret...`)}
                      className="text-[10px] font-mono bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] px-2 py-1 rounded hover:border-[#D35057]"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleGenerateIdeas} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                    Bağlam: üstüne fikir üret *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    placeholder="Örn: Küçükçetmi köyündeki eski şarap mahzenine gizemli bir olay ekleyelim... "
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingAi || !contextInput.trim()}
                  className="w-full py-2 bg-[#D35057] text-white font-mono text-xs hover:bg-[#B23A40] disabled:bg-[#D35057]/50 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  {loadingAi ? "Fikirler Damıtılıyor..." : "Yaratıcı Fikir Havuzunu Tetikle"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* CENTER & RIGHT: Ideas results display and conversion */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI generated ideas results */}
          {ideas.length > 0 && (
            <div className="bg-[#FBF3E4] dark:bg-amber-950/20 text-[#1B2A4A] dark:text-[#F3EFE8] border-2 border-dashed border-[#D35057] rounded-xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
              <div 
                className="flex items-center justify-between border-b border-[#D35057]/20 pb-2 cursor-pointer select-none group"
                onClick={() => setIsGeneratedOpen(!isGeneratedOpen)}
              >
                <h4 className="font-serif font-bold text-base text-[#1B2A4A] dark:text-[#F3EFE8] flex items-center gap-1.5 group-hover:text-[#D35057] transition-colors">
                  <Sparkles className="w-4 h-4 text-[#D35057]" />
                  Üretilen Kıvılcımlar ({ideas.length})
                </h4>
                <span className="text-[10px] font-mono text-[#D35057] hover:underline bg-[#D35057]/10 px-2 py-0.5 rounded">
                  {isGeneratedOpen ? 'Kapat [-]' : 'Aç [+]'}
                </span>
              </div>

              {isGeneratedOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ideas.map((idea, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] p-4 rounded-xl space-y-3 shadow-xs">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono bg-stone-100 dark:bg-[#112440] px-2 py-0.5 rounded text-stone-600 dark:text-[#A6B0C9] uppercase">
                          {idea.type || 'Fikir'}
                        </span>
                      </div>
                      <h5 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">{idea.title}</h5>
                      <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] leading-relaxed line-clamp-3">{idea.notes}</p>
                      
                      <div className="pt-2 border-t border-stone-100 dark:border-[#2C3C72] flex items-center justify-between flex-wrap gap-1">
                        <button 
                          onClick={() => handleSaveToHavuz(idea)}
                          className="text-[10px] font-mono text-[#9A8C76] dark:text-[#A6B0C9] hover:underline cursor-pointer"
                        >
                          Havuza At
                        </button>

                        <div className="flex gap-1 text-[9px] font-mono">
                          <button
                            onClick={() => handleConvertIdea(idea, 'karakter')}
                            className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-700 hover:text-white rounded transition-colors cursor-pointer"
                          >
                            + Karakter Yap
                          </button>
                          <button
                            onClick={() => handleConvertIdea(idea, 'olay')}
                            className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-700 hover:text-white rounded transition-colors cursor-pointer"
                          >
                            + Olay Yap
                          </button>
                          <button
                            onClick={() => handleConvertIdea(idea, 'drop')}
                            className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-[#D35057] hover:bg-[#D35057] hover:text-white rounded transition-colors cursor-pointer"
                          >
                            + Drop Yap
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FIKIR HAVUZU - Saved ideas archive bookshelf */}
          <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] p-5 rounded-xl paper-grain archive-shadow space-y-4">
            <h4 className="font-serif font-bold text-base text-[#1B2A4A] dark:text-[#F3EFE8] flex items-center gap-1.5">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              FİKİR HAVUZU / ARŞİV
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedIdeas.map(item => (
                <div key={item.id} className="p-4 bg-white/60 dark:bg-[#17345A]/40 border border-[#CFC5B4]/60 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono uppercase bg-[#1B2A4A]/10 text-[#1B2A4A] dark:text-[#F3EFE8] px-2 py-0.5 rounded">
                      FİKİR
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleArchiveSavedIdea(item)}
                        className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded hover:bg-stone-100 dark:hover:bg-[#17345A]/60"
                        title="Arşivle"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (deleteConfirmId === item.id) {
                            await onDeleteItem(item.id);
                            setDeleteConfirmId(null);
                          } else {
                            setDeleteConfirmId(item.id);
                            setTimeout(() => setDeleteConfirmId(prev => prev === item.id ? null : prev), 4000);
                          }
                        }}
                        className={`transition-colors p-1 rounded flex items-center gap-0.5 text-[9px] font-mono cursor-pointer ${
                          deleteConfirmId === item.id
                            ? 'bg-red-600 text-white animate-pulse px-1'
                            : 'text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                        }`}
                        title="Tamamen Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteConfirmId === item.id && 'Sil?'}
                      </button>
                    </div>
                  </div>

                  <h5 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">{item.title}</h5>
                  <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] line-clamp-3 leading-relaxed">
                    {item.notes}
                  </p>

                  <div className="pt-2 border-t border-stone-200/50 flex justify-end gap-1.5 text-[9px] font-mono">
                    <button
                      onClick={() => handleConvertIdea(item, 'karakter')}
                      className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-700 hover:text-white transition-all"
                    >
                      + Karakter Yap
                    </button>
                    <button
                      onClick={() => handleConvertIdea(item, 'olay')}
                      className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded hover:bg-rose-700 hover:text-white transition-all"
                    >
                      + Olay Yap
                    </button>
                    <button
                      onClick={() => handleConvertIdea(item, 'drop')}
                      className="px-1.5 py-0.5 bg-amber-50 text-[#D35057] rounded hover:bg-[#D35057] hover:text-white transition-all"
                    >
                      + Drop Yap
                    </button>
                  </div>
                </div>
              ))}
              {savedIdeas.length === 0 && (
                <div className="md:col-span-2 text-center py-10 text-[#9A8C76] italic">
                  Fikir havuzunda kayıtlı taslak bulunmuyor. Sol panelden fikir üretmeye başlayabilirsiniz.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
