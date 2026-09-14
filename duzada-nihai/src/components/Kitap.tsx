import React, { useState, useMemo } from 'react';
import { Book, Sparkles, CheckSquare, Plus, FileText, Check, Trash2, HelpCircle, Compass, ListTodo, RefreshCw } from 'lucide-react';
import { Item, ItemType, AreaType } from '../types';
import { getCachedAccessToken } from '../lib/firebase';
import { createGoogleDoc } from '../lib/googleApi';
import ConsistencyChecker from './ConsistencyChecker';
import SharedEditor from './SharedEditor';

interface KitapProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export default function Kitap({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}: KitapProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'bölüm_editör'>('home');
  
  // Selection and editing states
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  
  // Manual TODO state
  const [newTodoText, setNewTodoText] = useState('');

  // AI responses
  const [isAiBoxOpen, setIsAiBoxOpen] = useState(true);
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [aiResponseText, setAiResponseText] = useState('');

  // Connected entities selection
  const [selectedEntityId, setSelectedEntityId] = useState('');

  // Google Doc Export state
  const [isExportingDoc, setIsExportingDoc] = useState(false);

  const handleExportChapterToDoc = async () => {
    if (!activeChapter) return;
    const token = getCachedAccessToken();
    if (!token) {
      alert("Google Workspace bağlantısı aktif değil. Lütfen sol taraftaki 'Google Workspace' sekmesinden bağlantınızı kurun.");
      return;
    }
    
    setIsExportingDoc(true);
    try {
      await createGoogleDoc(activeChapter.title, activeChapter.notes || '');
      alert(`"${activeChapter.title}" başarıyla Google Dokümanı olarak aktarıldı! Google Drive klasörünüzde bulabilirsiniz.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Google Dokümanı oluşturulurken hata oluştu.");
    } finally {
      setIsExportingDoc(false);
    }
  };

  // Book and chapters selector
  const books = useMemo(() => items.filter(i => i.area === 'kitap' && i.type === 'kitap_proje' && !i.archived), [items]);
  const chapters = useMemo(() => items.filter(i => i.area === 'kitap' && i.type === 'kitap_bolum' && !i.archived), [items]);
  const entities = useMemo(() => items.filter(i => i.area === 'duzada' && !i.archived && !i.isProposal), [items]);

  // Handle active chapter
  const activeChapter = useMemo(() => {
    if (!activeItemId) return null;
    return chapters.find(c => c.id === activeItemId) || null;
  }, [activeItemId, chapters]);

  // Compute mentioned or linked entities for the active chapter
  const mentionedOrLinkedIds = useMemo(() => {
    if (!activeChapter) return [];
    const links = activeChapter.links || [];
    const text = activeChapter.notes || '';
    const resultIds = new Set<string>(links);
    
    // Strip markdown-style bracket links [Name] or [Name](id)
    const strippedText = text.replace(/\[[^\]]+\](?:\([^)]+\))?/g, ' ');
    
    const dismissed = activeChapter.metadata?.dismissedSuggestions || [];
    const isDismissed = (name: string) => {
      return dismissed.some((dn: string) => dn.toLowerCase() === name.toLowerCase());
    };

    entities.forEach(ent => {
      const titleEscaped = ent.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Whole-word matching with Turkish characters
      const regex = new RegExp(`(?<![\\wğüşıöçĞÜŞİÖÇ])${titleEscaped}(?![\\wğüşıöçĞÜŞİÖÇ])`, 'gi');
      if (regex.test(strippedText) || text.toLowerCase().includes(`[${ent.title.toLowerCase()}]`)) {
        if (links.includes(ent.id) || !isDismissed(ent.title)) {
          resultIds.add(ent.id);
        }
      }
    });
    
    return Array.from(resultIds);
  }, [activeChapter?.notes, activeChapter?.links, activeChapter?.metadata?.dismissedSuggestions, entities]);

  // If no book selected, select first book automatically
  React.useEffect(() => {
    if (!selectedBookId && books.length > 0) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBookId]);

  const activeBook = useMemo(() => {
    return books.find(b => b.id === selectedBookId) || null;
  }, [books, selectedBookId]);

  // Current active book's chapters
  const currentChapters = useMemo(() => {
    if (!selectedBookId) return [];
    return chapters
      .filter(ch => ch.metadata?.bookId === selectedBookId)
      .sort((a, b) => (a.metadata?.chapterIndex || 0) - (b.metadata?.chapterIndex || 0));
  }, [chapters, selectedBookId]);

  // % per chapter helper
  const getChapterPercent = (status: string) => {
    switch (status) {
      case 'düzeltildi': return 100;
      case 'yazıldı': return 70;
      case 'taslak': return 20;
      default: return 20;
    }
  };

  // Overall book % (average of chapters)
  const bookProgressPercent = useMemo(() => {
    if (currentChapters.length === 0) return 0;
    const sum = currentChapters.reduce((acc, ch) => acc + getChapterPercent(ch.status), 0);
    return Math.round(sum / currentChapters.length);
  }, [currentChapters]);

  // Create Book project
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const id = `book_${Date.now()}`;
    await onAddItem({
      title: newBookTitle,
      area: 'kitap',
      type: 'kitap_proje',
      status: 'Planlandı',
      priority: 'orta',
      tags: ['roman', 'kitap-projesi'],
      links: [],
      notes: 'Yeni kitap kurgusu notları...',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {}
    });

    setNewBookTitle('');
    setShowCreateBook(false);
    setSelectedBookId(id);
  };

  // Create chapter
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !selectedBookId) return;

    const nextIndex = currentChapters.length + 1;
    const id = `chapter_${Date.now()}`;
    
    await onAddItem({
      title: `Bölüm ${nextIndex}: ${newChapterTitle}`,
      area: 'kitap',
      type: 'kitap_bolum',
      status: 'taslak',
      priority: 'orta',
      tags: ['bölüm', 'kitap-bölümü'],
      links: [selectedBookId],
      notes: 'Bölüm yazı satırları buraya gelecek...',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        bookId: selectedBookId,
        chapterIndex: nextIndex,
        chapterTodos: []
      }
    });

    setNewChapterTitle('');
    setShowCreateChapter(false);
    onSelectItem(id);
    setActiveTab('bölüm_editör');
  };

  // Add Manual Chapter Todo Task
  const handleAddTodo = async () => {
    if (!activeChapter || !newTodoText.trim()) return;
    const currentTodos = activeChapter.metadata?.chapterTodos || [];
    
    await onUpdateItem({
      ...activeChapter,
      metadata: {
        ...activeChapter.metadata,
        chapterTodos: [...currentTodos, `[ ] ${newTodoText}`] // Custom checkbox representation
      }
    });

    setNewTodoText('');
  };

  const handleToggleTodo = async (idx: number) => {
    if (!activeChapter) return;
    const currentTodos = [...(activeChapter.metadata?.chapterTodos || [])];
    const todo = currentTodos[idx];
    
    if (todo.startsWith('[ ] ')) {
      currentTodos[idx] = todo.replace('[ ] ', '[x] ');
    } else {
      currentTodos[idx] = todo.replace('[x] ', '[ ] ');
    }

    await onUpdateItem({
      ...activeChapter,
      metadata: {
        ...activeChapter.metadata,
        chapterTodos: currentTodos
      }
    });
  };

  const handleDeleteTodo = async (idx: number) => {
    if (!activeChapter) return;
    const currentTodos = (activeChapter.metadata?.chapterTodos || []).filter((_, i) => i !== idx);

    await onUpdateItem({
      ...activeChapter,
      metadata: {
        ...activeChapter.metadata,
        chapterTodos: currentTodos
      }
    });
  };

  // AI Bölüm Özeti (Chapter Summary)
  const handleAiChapterSummary = async () => {
    if (!activeChapter) return;
    setLoadingAi('özet');
    setAiResponseText('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'devam-et',
          data: {
            text: activeChapter.notes,
            notes: `Lütfen bu roman bölümünün edebi bir Türkçe özetini çıkar.`
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        setAiResponseText(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(null);
    }
  };

  // AI Devamı için Fikir/Taslak (Next Ideas)
  const handleAiContinuationIdeas = async () => {
    if (!activeChapter) return;
    setLoadingAi('devam_fikir');
    setAiResponseText('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'devam-et',
          data: {
            text: activeChapter.notes,
            notes: `Bu bölümden sonra hikayenin nasıl akabileceğine dair 3 adet yaratıcı kurgusal fikir üret.`
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        setAiResponseText(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(null);
    }
  };

  // AI Tutarlılık Kontrolü (Consistency with lore)
  const handleAiConsistencyCheck = async () => {
    if (!activeChapter) return;
    setLoadingAi('tutarlılık');
    setAiResponseText('');
    try {
      // Send active entities lore/wiki for consistency checking
      const wikiContext = entities.map(e => ({
        title: e.title,
        type: e.type,
        notes: e.notes,
        wikiSections: e.metadata?.wikiSections || []
      }));

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'tutarlilik-kontrolu',
          data: {
            text: activeChapter.notes,
            wikiContext: wikiContext
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        setAiResponseText(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(null);
    }
  };

  const handleLinkEntity = async () => {
    if (!activeChapter || !selectedEntityId) return;
    const currentLinks = activeChapter.links || [];
    if (currentLinks.includes(selectedEntityId)) return;

    const ent = entities.find(e => e.id === selectedEntityId);
    const dismissed = activeChapter.metadata?.dismissedSuggestions || [];
    const newDismissed = ent ? dismissed.filter((n: string) => n.toLowerCase() !== ent.title.toLowerCase()) : dismissed;

    await onUpdateItem({
      ...activeChapter,
      links: [...currentLinks, selectedEntityId],
      metadata: {
        ...(activeChapter.metadata || {}),
        dismissedSuggestions: newDismissed
      }
    });
    setSelectedEntityId('');
  };

  const handleUnlinkEntity = async (entityId: string) => {
    if (!activeChapter) return;
    const currentLinks = activeChapter.links || [];
    await onUpdateItem({
      ...activeChapter,
      links: currentLinks.filter(id => id !== entityId)
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Breadcrumb row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CFC5B4]">
        <div>
          <span className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9]">
            Kems Company • Hikaye & Söylenceler
          </span>
          <h1 className="font-serif font-bold text-2xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1">
            Yazar Masası (Kitap Taslakları)
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <ConsistencyChecker 
            module="kitap" 
            items={items} 
            onUpdateItem={onUpdateItem} 
            onAddItem={onAddItem} 
            aiContextText={activeChapter?.notes || ''}
            buttonClassName="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg cursor-pointer transition-all flex items-center gap-1"
          />
          <button
            onClick={() => { setActiveTab('home'); onSelectItem(null); }}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'home' ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8]' : 'bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
          >
            Kitap Rafı
          </button>
          {activeChapter && (
            <button
              onClick={() => setActiveTab('bölüm_editör')}
              className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'bölüm_editör' ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8]' : 'bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
            >
              Masaüstü Daktilo
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: HOME BOOKSHELF */}
      {activeTab === 'home' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Book selector panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#CFC5B4]/50">
            <div className="flex items-center gap-3">
              <label className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] shrink-0">
                Aktif Kitap:
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="bg-[#F3EFE8] dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] text-sm border border-[#CFC5B4] dark:border-[#2C3C72] font-serif font-semibold rounded px-3 py-1.5 focus:outline-hidden"
              >
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateBook(true)}
                className="text-xs font-mono px-3 py-1.5 border border-[#CFC5B4] rounded-lg hover:bg-stone-50 cursor-pointer"
              >
                + Kitap Projesi Ekle
              </button>
              {activeBook && (
                <button
                  onClick={() => setShowCreateChapter(true)}
                  className="text-xs font-mono px-3 py-1.5 bg-[#D35057] text-white rounded-lg hover:bg-[#B23A40] cursor-pointer"
                >
                  + Yeni Bölüm Yaz
                </button>
              )}
            </div>
          </div>

          {/* Overlays for creations */}
          {showCreateBook && (
            <form onSubmit={handleCreateBook} className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] p-5 rounded-xl max-w-sm space-y-3 paper-grain">
              <h4 className="font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">Yeni Kitap Projesi</h4>
              <input
                type="text"
                required
                placeholder="Roman adı..."
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2"
              />
              <div className="flex justify-end gap-2 text-xs font-mono">
                <button type="button" onClick={() => setShowCreateBook(false)} className="px-2 py-1 border rounded">Vazgeç</button>
                <button type="submit" className="px-3 py-1 bg-[#D35057] text-white rounded">Ekle</button>
              </div>
            </form>
          )}

          {showCreateChapter && (
            <form onSubmit={handleCreateChapter} className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] p-5 rounded-xl max-w-sm space-y-3 paper-grain">
              <h4 className="font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">Yeni Bölüm Ekle</h4>
              <input
                type="text"
                required
                placeholder="Bölüm Adı..."
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2"
              />
              <div className="flex justify-end gap-2 text-xs font-mono">
                <button type="button" onClick={() => setShowCreateChapter(false)} className="px-2 py-1 border rounded">Vazgeç</button>
                <button type="submit" className="px-3 py-1 bg-[#D35057] text-white rounded">Ekle</button>
              </div>
            </form>
          )}

          {/* Active Book Progress and Chapters Grid */}
          {activeBook ? (
            <div className="space-y-6">
              
              {/* Overall Book progress */}
              <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] p-5 rounded-xl paper-grain archive-shadow space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8]">
                        {activeBook.title}
                      </h3>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (deleteConfirmId === activeBook.id) {
                            // Delete chapters
                            for (const ch of currentChapters) {
                              await onDeleteItem(ch.id);
                            }
                            await onDeleteItem(activeBook.id);
                            setSelectedBookId('');
                            setDeleteConfirmId(null);
                          } else {
                            setDeleteConfirmId(activeBook.id);
                            setTimeout(() => setDeleteConfirmId(prev => prev === activeBook.id ? null : prev), 4000);
                          }
                        }}
                        className={`p-1 rounded transition-colors flex items-center gap-1 text-[10px] font-mono ${
                          deleteConfirmId === activeBook.id
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-red-950/45'
                        }`}
                        title="Kitap Projesini Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteConfirmId === activeBook.id && 'Kataloğu Sil?'}
                      </button>
                    </div>
                    <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] mt-0.5">{activeBook.notes}</p>
                  </div>
                  <span className="text-base font-bold font-mono text-[#D35057]">%{bookProgressPercent}</span>
                </div>
                
                <div className="w-full bg-[#CFC5B4]/30 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#D35057] h-full" style={{ width: `${bookProgressPercent}%` }} />
                </div>
              </div>

              {/* Chapters list */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-[#6A5E4C] tracking-wider">
                  BÖLÜM TASLAKLARI ({currentChapters.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentChapters.map(ch => {
                    const percent = getChapterPercent(ch.status);
                    return (
                      <div 
                        key={ch.id}
                        onClick={() => { onSelectItem(ch.id); setActiveTab('bölüm_editör'); }}
                        className="p-4 bg-[#F6F1E7] dark:bg-[#13204A]/55 border border-[#CFC5B4] hover:border-[#D35057] rounded-xl cursor-pointer transition-all space-y-3 paper-grain archive-shadow group/chapter"
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8] text-sm hover:text-[#D35057] flex-1 min-w-0 pr-2">
                            {ch.title}
                          </h5>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-mono capitalize px-1.5 py-0.5 rounded bg-stone-200 dark:bg-[#17345A] text-stone-700 dark:text-stone-300">
                              {ch.status}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (deleteConfirmId === ch.id) {
                                  onDeleteItem(ch.id);
                                  setDeleteConfirmId(null);
                                } else {
                                  setDeleteConfirmId(ch.id);
                                  setTimeout(() => setDeleteConfirmId(prev => prev === ch.id ? null : prev), 4000);
                                }
                              }}
                              className={`p-1 rounded transition-colors flex items-center gap-1 text-[9px] font-mono ${
                                deleteConfirmId === ch.id
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : 'text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-red-950/40'
                              }`}
                              title="Bölümü Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deleteConfirmId === ch.id && 'Sil?'}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] line-clamp-2 italic leading-relaxed">
                          {ch.notes || "Henüz satırlar yazılmadı..."}
                        </p>

                        <div className="space-y-1.5 pt-2 border-t border-[#CFC5B4]/30">
                          <div className="flex justify-between items-center text-[9px] font-mono text-[#9A8C76]">
                            <span>Yazım İlerlemesi</span>
                            <span>%{percent}</span>
                          </div>
                          <div className="w-full bg-[#CFC5B4]/30 h-1 rounded-full overflow-hidden">
                            <div className="bg-[#BBA591] h-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {currentChapters.length === 0 && (
                    <p className="text-xs text-[#9A8C76] italic">Kitaba bağlı henüz bölüm yazılmadı.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="py-20 text-center text-[#9A8C76] italic">
              Lütfen sol panelden bir kitap projesi seçin veya yeni bir proje ekleyerek yazar masasını başlatın.
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: MASAÜSTÜ DAKTİLO (Story writer workspace) */}
      {activeTab === 'bölüm_editör' && activeChapter && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-200">
          
          {/* LEFT: Massive editorial letter on paper */}
          <div className="lg:col-span-2 bg-[#F6F1E7] dark:bg-[#13204A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-6 md:p-10 paper-grain archive-shadow space-y-6 flex flex-col min-h-[600px]">
            
            {/* Header edit info */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-[#CFC5B4]/50">
              <div className="space-y-1 flex-1 min-w-0">
                <span className="text-xs font-mono uppercase text-[#D35057] font-bold">
                  BÖLÜM YAZIM MASASI
                </span>
                
                <textarea
                  rows={2}
                  value={activeChapter.title}
                  onChange={async (e) => await onUpdateItem({ ...activeChapter, title: e.target.value })}
                  className="font-serif font-bold text-xl md:text-2xl text-[#1B2A4A] dark:text-[#F3EFE8] italic bg-transparent focus:outline-hidden border-b border-transparent focus:border-[#CFC5B4] w-full resize-none leading-tight py-1 overflow-hidden"
                  placeholder="Bölüm Başlığı"
                />
              </div>

              {/* Status Chapter selector */}
              <div className="shrink-0 flex items-center gap-2 font-mono flex-wrap">
                <button
                  type="button"
                  onClick={handleExportChapterToDoc}
                  disabled={isExportingDoc}
                  className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#FAF6EE] dark:bg-stone-900 border border-[#CFC5B4] dark:border-stone-850 text-stone-700 dark:text-[#A6B0C9] hover:text-[#D35057] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Google Dokümanı Olarak Dışa Aktar"
                >
                  {isExportingDoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>Docs'a Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const nextStatus = activeChapter.status === 'Yayında' ? 'taslak' : 'Yayında';
                    await onUpdateItem({ ...activeChapter, status: nextStatus });
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    activeChapter.status === 'Yayında'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                      : 'bg-[#D35057] hover:bg-[#b04046] text-white border border-[#c43b42] animate-pulse'
                  }`}
                  title={activeChapter.status === 'Yayında' ? "Bölümü taslak durumuna geri çek" : "Bölümü evrene bağla ve Düzada'da yayınla!"}
                >
                  {activeChapter.status === 'Yayında' ? '✨ Evrene Bağlandı (Yayında)' : '📖 Evrene Yayınla'}
                </button>

                <select
                  value={activeChapter.status}
                  onChange={async (e) => await onUpdateItem({ ...activeChapter, status: e.target.value })}
                  className="bg-white dark:bg-[#17345A] text-xs border border-[#CFC5B4] dark:border-[#2C3C72] rounded p-1.5 focus:outline-hidden text-[#1B2A4A] dark:text-[#F3EFE8] font-bold"
                >
                  <option value="taslak">Taslak</option>
                  <option value="yazıldı">Yazıldı</option>
                  <option value="düzeltildi">Düzeltildi</option>
                  <option value="Yayında">Yayında (Evrene Bağla)</option>
                </select>
              </div>
            </div>

            {/* Editor Text area */}
            <div className="flex-1 flex flex-col">
              <SharedEditor
                key={activeChapter.id}
                initialValue={activeChapter.notes || ''}
                onSave={async (val) => {
                  await onUpdateItem({ ...activeChapter, notes: val });
                }}
                placeholder="Can, Küçükçetmi köyünün ulu çınarına doğru ağır adımlarla yaklaşıyordu..."
                entities={entities}
                linkedEntityIds={activeChapter.links || []}
                onLinkEntity={async (entId) => {
                  const currentLinks = activeChapter.links || [];
                  if (!currentLinks.includes(entId)) {
                    await onUpdateItem({
                      ...activeChapter,
                      links: [...currentLinks, entId]
                    });
                  }
                }}
                onUnlinkEntity={async (entId) => {
                  const currentLinks = activeChapter.links || [];
                  await onUpdateItem({
                    ...activeChapter,
                    links: currentLinks.filter(id => id !== entId)
                  });
                }}
                onAddEntityProposal={async (name, type) => {
                  const proposalId = `duzada_proposal_${Date.now()}`;
                  let tags = ['kitap_oneri'];
                  let notes = `"${activeChapter.title}" bölümünde geçen ve otomatik olarak önerilen yeni bir varlık.`;
                  if (type === 'kisi') {
                    tags.push('karakter');
                    notes = `"${activeChapter.title}" bölümünde geçen ve otomatik olarak önerilen yeni bir karakter.`;
                  } else if (type === 'mekan') {
                    tags.push('mekan');
                    notes = `"${activeChapter.title}" bölümünde geçen ve otomatik olarak önerilen yeni bir mekan.`;
                  } else if (type === 'marka') {
                    tags.push('marka');
                    notes = `"${activeChapter.title}" bölümünde geçen ve otomatik olarak önerilen yeni bir marka.`;
                  }

                  await onAddItem({
                    id: proposalId,
                    title: name,
                    area: 'duzada',
                    type: type,
                    status: 'Fikir',
                    priority: 'orta',
                    tags: tags,
                    links: [activeChapter.id],
                    notes: notes,
                    images: [],
                    isProposal: true,
                    archived: false,
                    metadata: {}
                  } as any);

                  const currentLinks = activeChapter.links || [];
                  await onUpdateItem({
                    ...activeChapter,
                    links: [...currentLinks, proposalId]
                  });
                }}
                dismissedNames={activeChapter.metadata?.dismissedSuggestions || []}
                onDismissName={async (name) => {
                  const dismissed = activeChapter.metadata?.dismissedSuggestions || [];
                  if (!dismissed.includes(name)) {
                    await onUpdateItem({
                      ...activeChapter,
                      metadata: {
                        ...(activeChapter.metadata || {}),
                        dismissedSuggestions: [...dismissed, name]
                      }
                    });
                  }
                }}
              />
            </div>

            {/* Auto list of entities appearing in this chapter */}
            <div className="pt-4 border-t border-[#CFC5B4]/50 space-y-2">
              <span className="block text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider">
                Bu bölümde geçenler (Varlık Kancaları)
              </span>
              <div className="flex flex-wrap gap-2">
                {entities.filter(e => mentionedOrLinkedIds.includes(e.id)).map(e => {
                  const isExplicitlyLinked = (activeChapter.links || []).includes(e.id);
                  return (
                    <span 
                      key={e.id}
                      onClick={() => onSelectItem(e.id)}
                      className={`group flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-mono cursor-pointer transition-all duration-200 border ${
                        isExplicitlyLinked 
                          ? 'bg-[#1B2A4A] text-white border-transparent hover:bg-[#D35057]' 
                          : 'bg-white hover:bg-[#F3EFE8] dark:bg-stone-900 dark:hover:bg-[#1B2A4A] text-stone-700 dark:text-[#A6B0C9] border-[#CFC5B4] hover:border-[#D35057]'
                      }`}
                      title={isExplicitlyLinked ? "Varlık sayfasına gitmek için tıklayın (Doğrudan kancalanmış)" : "Metinde tespit edildi. Kancalamak veya detayını görmek için tıklayın."}
                    >
                      <Compass className="w-3 h-3 text-[#D35057] group-hover:animate-spin" />
                      <span>{e.title}</span>
                      <span className="text-[9px] opacity-75">
                        ({e.type === 'kisi' ? 'Kişi' : e.type === 'mekan' ? 'Mekan' : 'Marka'})
                      </span>
                      {isExplicitlyLinked ? (
                        <button 
                          onClick={(evt) => {
                            evt.stopPropagation();
                            handleUnlinkEntity(e.id);
                          }}
                          className="hover:text-red-300 font-bold ml-1 text-xs"
                          title="Bağlantıyı Kaldır"
                        >
                          ×
                        </button>
                      ) : (
                        <button
                          onClick={async (event) => {
                            event.stopPropagation();
                            const currentLinks = activeChapter.links || [];
                            if (!currentLinks.includes(e.id)) {
                              await onUpdateItem({
                                ...activeChapter,
                                links: [...currentLinks, e.id]
                              });
                            }
                          }}
                          className="hover:text-[#D35057] font-mono text-[9px] border border-[#CFC5B4] px-1 rounded hover:bg-[#1B2A4A] hover:text-white ml-1 transition-all font-bold"
                          title="Resmi olarak bölüme kancala"
                        >
                          + Kancala
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Manual Todos & AI checkouts */}
          <div className="space-y-6">
            
            {/* MANUAL TODOS - Kalan işler */}
            <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl paper-grain space-y-4">
              <div className="flex items-center gap-2 border-b border-[#CFC5B4]/50 pb-2">
                <ListTodo className="w-5 h-5 text-[#D35057]" />
                <h4 className="font-serif font-bold text-base text-[#1B2A4A] dark:text-[#F3EFE8]">
                  Kalan İşler / Yapılacaklar
                </h4>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {(activeChapter.metadata?.chapterTodos || []).map((todo, idx) => {
                  const isChecked = todo.startsWith('[x] ');
                  const text = todo.replace('[ ] ', '').replace('[x] ', '');
                  
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs p-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTodo(idx)}
                          className="rounded border-[#CFC5B4] text-[#D35057] focus:ring-[#D35057]"
                        />
                        <span className={`text-stone-700 ${isChecked ? 'line-through opacity-55' : ''}`}>
                          {text}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteTodo(idx)} className="text-red-500 hover:underline">
                        Sil
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Görev satırı..."
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  className="flex-1 text-xs bg-white border border-[#CFC5B4] rounded p-1.5"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTodo(); }}
                />
                <button
                  onClick={handleAddTodo}
                  className="px-3 bg-[#1B2A4A] text-white text-xs rounded hover:opacity-90"
                >
                  Ekle
                </button>
              </div>
            </div>

            {/* AI kurgusal consistency and checkout center */}
            <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl paper-grain space-y-4">
              <div 
                className="flex items-center justify-between border-b border-[#CFC5B4]/50 pb-2 cursor-pointer select-none group"
                onClick={() => setIsAiBoxOpen(!isAiBoxOpen)}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D35057]" />
                  <span className="font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-[#D35057] transition-colors">Yapay Zeka Editörü</span>
                </div>
                <span className="text-[10px] font-mono text-[#D35057] hover:underline bg-[#D35057]/10 px-2 py-0.5 rounded">
                  {isAiBoxOpen ? 'Kapat [-]' : 'Aç [+]'}
                </span>
              </div>

              {isAiBoxOpen && (
                <>
                  <div className="flex flex-col gap-2 text-xs font-mono">
                    <button
                      onClick={handleAiChapterSummary}
                      className="py-2 px-3 bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] hover:border-[#D35057] rounded-lg text-left"
                    >
                      Bölüm Özetini Hazırla
                    </button>
                    <button
                      onClick={handleAiContinuationIdeas}
                      className="py-2 px-3 bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] hover:border-[#D35057] rounded-lg text-left"
                    >
                      Gelecek Bölüm Fikirleri Üret
                    </button>
                    <button
                      onClick={handleAiConsistencyCheck}
                      className="py-2 px-3 bg-[#D35057]/10 text-[#D35057] border border-[#D35057]/30 hover:bg-[#D35057]/20 rounded-lg text-left font-bold"
                    >
                      Tutarlılık Kontrolü Yap (Anti-Contradiction)
                    </button>
                  </div>

                  {loadingAi && (
                    <div className="p-3 bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] rounded border border-[#CFC5B4] dark:border-[#2C3C72] text-center text-xs animate-pulse font-mono text-[#D35057]">
                      AI kurgusal evreni tarıyor... ({loadingAi})
                    </div>
                  )}

                  {aiResponseText && !loadingAi && (
                    <div className="p-3.5 bg-[#FBF3E4] dark:bg-amber-950/20 text-[#1B2A4A] dark:text-[#F3EFE8] border border-dashed border-[#D35057] rounded-lg text-xs leading-relaxed space-y-2">
                      <span className="text-[10px] font-mono uppercase text-[#D35057] font-bold block">Editör Değerlendirmesi:</span>
                      <p className="whitespace-pre-line font-serif">{aiResponseText}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Link varlık kancası */}
            <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl space-y-3 w-full overflow-hidden box-border">
              <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8] truncate">
                Bölüme Karakter/Yer Kancala
              </h4>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="flex-1 text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded p-2 min-w-0 max-w-full truncate"
                >
                  <option value="">Varlık Seçin...</option>
                  {entities.filter(e => !(activeChapter.links || []).includes(e.id)).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.type === 'kisi' ? 'Kişi' : e.type === 'mekan' ? 'Mekan' : 'Marka'})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLinkEntity}
                  disabled={!selectedEntityId}
                  className="px-3.5 py-2 bg-[#1B2A4A] hover:bg-slate-800 dark:bg-[#D35057] dark:hover:bg-[#b04046] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  Kancala
                </button>
              </div>

              {/* Dismissed list for un-dismissing */}
              {activeChapter.metadata?.dismissedSuggestions?.length > 0 && (
                <div className="pt-2.5 border-t border-[#CFC5B4]/40 space-y-1">
                  <span className="text-[10px] font-mono text-[#D35057] uppercase font-bold tracking-wider block">Yoksayılan Öneriler:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeChapter.metadata.dismissedSuggestions.map((name: string) => (
                      <span 
                        key={name}
                        className="inline-flex items-center gap-1.5 text-[10px] bg-white dark:bg-stone-900 text-[#1B2A4A] dark:text-[#A6B0C9] border border-[#CFC5B4]/50 dark:border-stone-800 px-2 py-0.5 rounded-md shadow-3xs"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const dismissed = activeChapter.metadata?.dismissedSuggestions || [];
                            await onUpdateItem({
                              ...activeChapter,
                              metadata: {
                                ...activeChapter.metadata,
                                dismissedSuggestions: dismissed.filter((n: string) => n !== name)
                              }
                            });
                          }}
                          className="text-stone-400 hover:text-red-500 font-bold ml-1 transition-colors cursor-pointer text-xs"
                          title="Öneriyi Geri Al (Yoksaymayı Kaldır)"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
