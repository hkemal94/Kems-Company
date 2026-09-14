import { useState, useMemo } from 'react';
import { X, Search, Link2, Tag, ArrowRight } from 'lucide-react';
import { Item } from '../types';

interface AramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onSelectResult: (item: Item) => void;
}

export default function AramaModal({ isOpen, onClose, items, onSelectResult }: AramaModalProps) {
  const [queryStr, setQueryStr] = useState('');

  const filteredItems = useMemo(() => {
    if (!queryStr.trim()) return [];
    const searchVal = queryStr.toLowerCase().trim();
    
    return items.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(searchVal);
      const matchNotes = item.notes?.toLowerCase().includes(searchVal);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(searchVal));
      
      // Match by relation/links (checking names of linked items if matching)
      const linkedItems = items.filter(other => (item.links || []).includes(other.id));
      const matchLinks = linkedItems.some(linked => linked.title.toLowerCase().includes(searchVal));

      return matchTitle || matchNotes || matchTags || matchLinks;
    });
  }, [queryStr, items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1B2A4A]/40 backdrop-blur-xs flex items-start justify-center p-4 pt-20 z-50">
      <div className="bg-[#F3EFE8] dark:bg-[#13204A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 paper-grain">
        
        {/* Search Bar Input */}
        <div className="relative flex items-center border-b border-[#CFC5B4] dark:border-[#2C3C72] px-4 py-3">
          <Search className="w-5 h-5 text-[#6A5E4C] dark:text-[#A6B0C9] mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Etiket, bağlantılı varlık veya başlık ara... (ör. 'küçükçetmi')"
            value={queryStr}
            onChange={(e) => setQueryStr(e.target.value)}
            className="w-full bg-transparent text-[#1B2A4A] dark:text-[#F3EFE8] text-base focus:outline-hidden"
          />
          <button 
            onClick={onClose}
            className="text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#D35057] transition-colors p-1 rounded-lg hover:bg-[#CFC5B4]/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
          {queryStr.trim() === '' ? (
            <div className="text-center py-8 text-[#9A8C76] dark:text-[#6E7CA0] text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-55" />
              <p>Aramaya başlamak için bir şeyler yazın.</p>
              <p className="text-xs mt-1 font-mono">İpucu: 'karakter', 'küçükçetmi' veya 'tişört' yazmayı deneyin.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-[#9A8C76] dark:text-[#6E7CA0] text-sm">
              <p>Eşleşen öğe bulunamadı.</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-lg bg-[#F6F1E7]/80 dark:bg-[#17345A]/50 border border-[#CFC5B4]/50 dark:border-[#2C3C72]/50 hover:border-[#D35057] dark:hover:border-[#D35057] hover:bg-[#F6F1E7] dark:hover:bg-[#17345A] cursor-pointer transition-all group"
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase bg-[#CFC5B4]/30 dark:bg-[#2C3C72]/40 text-[#6A5E4C] dark:text-[#A6B0C9] px-2 py-0.5 rounded-sm">
                      {item.type}
                    </span>
                    {item.isProposal && (
                      <span className="text-[10px] font-mono text-[#D35057] border border-dashed border-[#D35057] px-1.5 py-0.5 rounded-xs">
                        Öneri
                      </span>
                    )}
                    <span className="font-serif font-semibold text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-[#D35057] transition-colors">
                      {item.title}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-[#9A8C76] dark:text-[#A6B0C9] line-clamp-1">
                      {item.notes}
                    </p>
                  )}
                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Tag className="w-3 h-3 text-[#9A8C76] dark:text-[#6E7CA0]" />
                      {Array.from(new Set(item.tags)).map((t, idx) => (
                        <span key={`${t}-${idx}`} className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] font-mono bg-[#E4DCCD]/30 px-1 py-0.1 rounded-xs">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[#9A8C76] dark:text-[#6E7CA0] group-hover:text-[#D35057] transition-all shrink-0">
                  <span className="text-[10px] font-mono capitalize">
                    {item.area === 'duzada' ? 'Ada & Lore' : item.area}
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
