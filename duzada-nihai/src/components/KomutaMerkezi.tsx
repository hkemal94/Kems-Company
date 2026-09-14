import React, { useState, useMemo, useRef } from 'react';
import { 
  Bookmark, 
  Sparkles, 
  FolderOpen, 
  Flame, 
  Youtube, 
  Instagram, 
  Twitter, 
  ExternalLink, 
  Check, 
  Trash2, 
  Edit3, 
  X, 
  CheckSquare, 
  Upload, 
  Clipboard, 
  Download, 
  Link2, 
  Plus, 
  Search, 
  Sunset, 
  Sun, 
  Moon, 
  MapPin, 
  Tag, 
  Shield, 
  BookOpen, 
  PenTool, 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Calendar,
  Gamepad2,
  Users
} from 'lucide-react';
import { Item, AreaType, ItemType } from '../types';
import { isEntityUnlinked, resolveAllRelations } from '../utils/relations';

interface KomutaMerkeziProps {
  items: Item[];
  onSelectArea: (area: AreaType, itemId?: string) => void;
  onAcceptProposal: (itemId: string) => Promise<void>;
  onRejectProposal: (itemId: string) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  
  // Header controls passed from App.tsx
  onOpenSearch?: () => void;
  onOpenHizliNot?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'arşiv' | 'dark';
}

export default function KomutaMerkezi({
  items,
  onSelectArea,
  onAcceptProposal,
  onRejectProposal,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onOpenSearch,
  onOpenHizliNot,
  onToggleTheme,
  currentTheme = 'arşiv'
}: KomutaMerkeziProps) {
  // General priority state
  const [newPriorityText, setNewPriorityText] = useState('');
  const [newPriorityArea, setNewPriorityArea] = useState<AreaType | 'oyun'>('duzada');
  const [isAddingPriority, setIsAddingPriority] = useState(false);

  // Proposal states
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [proposalCategoryTab, setProposalCategoryTab] = useState<'hepsi' | 'duzada' | 'merch' | 'kitap' | 'blog' | 'brainstorm' | 'ilham'>('hepsi');

  // Daily thought states
  const [isEditingDailyNote, setIsEditingDailyNote] = useState(false);
  const [dailyNoteText, setDailyNoteText] = useState('');

  // Customizable Channels states
  const [isEditingChannels, setIsEditingChannels] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'custom'>('custom');
  
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelTitle, setEditChannelTitle] = useState('');
  const [editChannelUrl, setEditChannelUrl] = useState('');
  const [editChannelPlatform, setEditChannelPlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'custom'>('custom');

  // Safe confirmation states (avoiding native confirm blocked in iframes)
  const [deleteConfirmPriorityId, setDeleteConfirmPriorityId] = useState<string | null>(null);
  const [deleteConfirmDailyNote, setDeleteConfirmDailyNote] = useState(false);
  const [confirmAcceptCategory, setConfirmAcceptCategory] = useState(false);
  const [confirmAcceptSelected, setConfirmAcceptSelected] = useState(false);
  const [confirmRejectSelected, setConfirmRejectSelected] = useState(false);
  const [deleteConfirmChannelId, setDeleteConfirmChannelId] = useState<string | null>(null);

  // Bulk Import panel states
  const [isAiCornerOpen, setIsAiCornerOpen] = useState(true);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DYNAMIC CALCULATIONS ---

  // Date formatted in Turkish
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // 2. BU HAFTA ÖNCELİK (High priority or manually tagged items as prioritized)
  const priorityItems = useMemo(() => {
    return items.filter(item => !item.archived && !item.isProposal && item.priority === 'yüksek').slice(0, 10);
  }, [items]);

  // 3. BEKLEYEN AI ÖNERİLERİ (Proposals across the app)
  const aiProposals = useMemo(() => {
    return items.filter(item => !item.archived && item.isProposal);
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      hepsi: aiProposals.length,
      duzada: 0,
      merch: 0,
      kitap: 0,
      blog: 0,
      brainstorm: 0,
      ilham: 0,
    };
    aiProposals.forEach(p => {
      const area = p.area as string;
      if (counts[area] !== undefined) {
        counts[area]++;
      } else {
        counts[area] = 1;
      }
    });
    return counts;
  }, [aiProposals]);

  const filteredProposals = useMemo(() => {
    if (proposalCategoryTab === 'hepsi') return aiProposals;
    return aiProposals.filter(p => p.area === proposalCategoryTab);
  }, [aiProposals, proposalCategoryTab]);

  // G3: AI Suggestions Adapt to the User (Tailoring style)
  const userAITailorMessage = useMemo(() => {
    // Look at the area of the 8 most recently updated items
    const recentItems = [...items]
      .filter(i => !i.archived && !i.isProposal)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8);
    
    const areaCounts: Record<string, number> = {};
    recentItems.forEach(i => {
      areaCounts[i.area] = (areaCounts[i.area] || 0) + 1;
    });

    let primaryArea = '';
    let maxCount = 0;
    Object.entries(areaCounts).forEach(([area, count]) => {
      if (count > maxCount) {
        maxCount = count;
        primaryArea = area;
      }
    });

    switch (primaryArea) {
      case 'duzada':
        return '✨ Düzada Lore & Karakter tasarımı tercihleriniz doğrultusunda uyarlandı.';
      case 'merch':
        return '✨ Merch drop ve kapsül koleksiyon tasarımlarınız doğrultusunda uyarlandı.';
      case 'blog':
        return '✨ Blog yazı dizisi ve editoryal içerik üretim ritminize göre uyarlandı.';
      case 'kitap':
        return '✨ Kitap kurgu akışı ve roman yazım stiliniz doğrultusunda uyarlandı.';
      default:
        return '✨ Kems evreni yaratım tarzınız ve son çalışmalarınız doğrultusunda uyarlandı.';
    }
  }, [items]);

  // Unlinked floaters
  const unlinkedItems = useMemo(() => {
    return items.filter(item => isEntityUnlinked(item, items));
  }, [items]);

  const linkTargets = useMemo(() => {
    return items.filter(i => !i.archived && !i.isProposal && (i.type === 'yer' || i.type === 'marka'));
  }, [items]);

  // 4. PROJELER PROGRESS CALCULATION (Including Oyun!)
  const projectStats = useMemo(() => {
    // Düzada progress: Bitti/Yayınlandı entities over total entities
    const duzadaItems = items.filter(i => i.area === 'duzada' && !i.isProposal && i.type !== 'map_settings' && i.type !== 'map_pin');
    const duzadaFinished = duzadaItems.filter(i => i.status === 'Bitti' || i.status === 'Yayınlandı').length;
    const duzadaProgress = duzadaItems.length ? Math.round((duzadaFinished / duzadaItems.length) * 100) : 0;

    // Merch progress: products that are Satışta / total products
    const merchProducts = items.filter(i => i.area === 'merch' && i.type === 'merch_urun' && !i.isProposal);
    const merchSelling = merchProducts.filter(i => i.status === 'Satışta').length;
    const merchProgress = merchProducts.length ? Math.round((merchSelling / merchProducts.length) * 100) : 0;

    // Blog progress: Yayında posts over total posts
    const blogPosts = items.filter(i => i.area === 'blog' && !i.isProposal);
    const blogPublished = blogPosts.filter(i => i.status === 'Yayında').length;
    const blogProgress = blogPosts.length ? Math.round((blogPublished / blogPosts.length) * 100) : 0;

    // Kitap progress: Average % per chapter (exlcuding Oyun elements)
    const chapters = items.filter(i => i.area === 'kitap' && i.type === 'kitap_bolum' && !i.isProposal && !i.tags.includes('oyun-tasarimi'));
    const chapterProgressSum = chapters.reduce((sum, ch) => {
      if (ch.status === 'düzeltildi') return sum + 100;
      if (ch.status === 'yazıldı') return sum + 70;
      return sum + 20; // taslak
    }, 0);
    const kitapProgress = chapters.length ? Math.round(chapterProgressSum / chapters.length) : 0;

    // Oyun progress: Average % per chapter/day with 'oyun-tasarimi' tag
    const oyunChapters = items.filter(i => i.area === 'kitap' && i.type === 'kitap_bolum' && !i.isProposal && i.tags.includes('oyun-tasarimi'));
    const oyunProgressSum = oyunChapters.reduce((sum, ch) => {
      if (ch.status === 'düzeltildi') return sum + 100;
      if (ch.status === 'yazıldı') return sum + 70;
      return sum + 20; // taslak
    }, 0);
    const oyunProgress = oyunChapters.length ? Math.round(oyunProgressSum / oyunChapters.length) : 0;

    return {
      duzada: { progress: duzadaProgress, count: duzadaItems.length },
      merch: { progress: merchProgress, count: merchProducts.length },
      blog: { progress: blogProgress, count: blogPosts.length },
      kitap: { progress: kitapProgress, count: chapters.length },
      oyun: { progress: oyunProgress, count: oyunChapters.length }
    };
  }, [items]);

  const proposalCounts = useMemo(() => {
    return {
      duzada: items.filter(i => i.isProposal && i.area === 'duzada').length,
      merch: items.filter(i => i.isProposal && i.area === 'merch').length,
      blog: items.filter(i => i.isProposal && i.area === 'blog').length,
      kitap: items.filter(i => i.isProposal && i.area === 'kitap' && !i.tags.includes('oyun-tasarimi')).length,
      oyun: items.filter(i => i.isProposal && i.tags.includes('oyun-tasarimi')).length,
    };
  }, [items]);

  // 5. SON DOKUNULAN VARLIKLAR
  const recentlyTouched = useMemo(() => {
    return [...items]
      .filter(i => !i.archived && !i.isProposal && i.type !== 'channel' && !i.tags.includes('gunluk-not'))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3);
  }, [items]);

  // 6. EVREN ÖZETİ (Live counts of the world)
  const statsSummary = useMemo(() => {
    return {
      karakter: items.filter(i => !i.archived && !i.isProposal && (i.type === 'karakter' || i.type === 'kisi')).length,
      yer: items.filter(i => !i.archived && !i.isProposal && (i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân')).length,
      marka: items.filter(i => !i.archived && !i.isProposal && i.type === 'marka').length,
      olay: items.filter(i => !i.archived && !i.isProposal && i.type === 'olay').length,
      tema: items.filter(i => !i.archived && !i.isProposal && i.type === 'tema').length,
      drop: items.filter(i => !i.archived && !i.isProposal && i.type === 'drop').length,
      urun: items.filter(i => !i.archived && !i.isProposal && i.type === 'merch_urun').length,
      yazi: items.filter(i => !i.archived && !i.isProposal && i.type === 'blog_post').length,
      bolum: items.filter(i => !i.archived && !i.isProposal && i.type === 'kitap_bolum' && !i.tags.includes('oyun-tasarimi')).length,
    };
  }, [items]);

  // 7. GÜNLÜK NOT / BUGÜNÜN DÜŞÜNCESİ
  const dailyNoteItem = useMemo(() => {
    return items.find(i => !i.archived && i.tags.includes('gunluk-not'));
  }, [items]);

  // Set initial text when dailyNoteItem loads or changes
  React.useEffect(() => {
    if (dailyNoteItem) {
      setDailyNoteText(dailyNoteItem.notes);
    } else {
      setDailyNoteText('');
    }
  }, [dailyNoteItem]);

  const handleSaveDailyNote = async () => {
    if (!dailyNoteText.trim()) return;

    if (dailyNoteItem) {
      await onUpdateItem({
        ...dailyNoteItem,
        notes: dailyNoteText,
        updatedAt: Date.now()
      });
    } else {
      await onAddItem({
        title: 'Bugünün Düşüncesi',
        area: 'komuta',
        type: 'fikir',
        status: 'Bitti',
        priority: 'orta',
        tags: ['gunluk-not', 'bugunun-dusuncesi'],
        notes: dailyNoteText,
        links: [],
        images: [],
        isProposal: false,
        archived: false,
        metadata: {}
      });
    }
    setIsEditingDailyNote(false);
  };

  const handleDeleteDailyNote = async () => {
    if (dailyNoteItem) {
      if (onDeleteItem) {
        await onDeleteItem(dailyNoteItem.id);
      } else {
        await onUpdateItem({ ...dailyNoteItem, archived: true });
      }
      setDailyNoteText('');
    }
  };

  // --- PRIORITY HANDLERS ---
  const handleAddPriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityText.trim()) return;

    const area = newPriorityArea === 'oyun' ? 'kitap' : newPriorityArea;
    const tags = ['öncelikli'];
    if (newPriorityArea === 'oyun') {
      tags.push('oyun-tasarimi');
    }

    await onAddItem({
      title: newPriorityText,
      area,
      type: newPriorityArea === 'duzada' ? 'olay' : newPriorityArea === 'merch' ? 'merch_urun' : newPriorityArea === 'blog' ? 'blog_post' : 'kitap_bolum',
      status: newPriorityArea === 'duzada' ? 'Fikir' : newPriorityArea === 'merch' ? 'Fikir' : newPriorityArea === 'blog' ? 'Taslak' : 'taslak',
      priority: 'yüksek',
      tags: tags,
      links: [],
      notes: 'Bu hafta tamamlanacak öncelikli iş kartı.',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {}
    });

    setNewPriorityText('');
    setIsAddingPriority(false);
  };

  const handleCompletePriority = async (item: Item) => {
    let finishedStatus = 'Bitti';
    if (item.area === 'merch') finishedStatus = 'Satışta';
    if (item.area === 'blog') finishedStatus = 'Yayında';
    if (item.area === 'kitap') finishedStatus = 'düzeltildi';

    await onUpdateItem({
      ...item,
      status: finishedStatus,
      priority: 'orta'
    });
  };

  const handleDeletePriorityDirect = async (itemId: string) => {
    if (onDeleteItem) {
      await onDeleteItem(itemId);
    } else {
      const target = items.find(i => i.id === itemId);
      if (target) {
        await onUpdateItem({ ...target, archived: true });
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* 1. HEADER SECTION (Calm Arşiv Layout, Wordmark, Date, Actions, Theme Toggle) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#CFC5B4] dark:border-[#2C3C72] gap-4">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2.5">
            <span className="font-sans font-black text-2xl tracking-tighter text-[#1B2A4A] dark:text-[#F3EFE8] select-none">KEMS</span>
            <div className="h-4 w-px bg-[#CFC5B4] dark:bg-[#2C3C72] self-center" />
            <h1 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8] italic">Komuta Merkezi</h1>
          </div>
          <p className="text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-wider">
            {currentDate}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#D35057] rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Temayı Değiştir"
            >
              {currentTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>


      {/* 4. PROJELER (Folder Cards per area, click to go, auto progress %) */}
      <div className="mb-6">
        <h2 className="text-[12px] font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-[#D35057]" /> PROJELER
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          {/* DÜZADA FOLDER (Sage) */}
          <div 
            onClick={() => onSelectArea('duzada')}
            className="bg-[#E7EBE6] dark:bg-[#13204A] border border-[#B9C7BD] dark:border-[#2C3C72] rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer flex flex-col h-[180px] justify-between archive-shadow paper-grain relative overflow-hidden group"
          >
            {proposalCounts.duzada > 0 && (
              <div className="absolute -right-4 -top-1 bg-[#D35057] text-[#F3EFE8] text-[9px] px-6 py-1 rotate-[35deg] font-bold uppercase tracking-tight shadow-xs z-10">
                {proposalCounts.duzada} Öneri
              </div>
            )}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-[#4A5E68] transition-colors">Düzada</h3>
                <span className="text-xs font-mono text-[#4A5E68] dark:text-[#A6B0C9] font-bold">%{projectStats.duzada.progress}</span>
              </div>
              <p className="text-[11px] text-[#4A5E68] dark:text-[#A6B0C9] mt-0.5 italic">Ada & Lore Arşivi</p>
            </div>
            
            <div className="space-y-1.5">
              <div className="w-full bg-[#CFC5B4]/30 dark:bg-[#17345A] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#4A5E68] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${projectStats.duzada.progress}%` }}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[9px] bg-white/50 dark:bg-black/20 text-[#4A5E68] dark:text-[#A6B0C9] px-2 py-0.5 rounded-full font-bold">{projectStats.duzada.count} Varlık</span>
              </div>
            </div>
          </div>

          {/* MERCH FOLDER (Coral) */}
          <div 
            onClick={() => onSelectArea('merch')}
            className="bg-[#FDFBF7] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer flex flex-col h-[180px] justify-between archive-shadow paper-grain relative overflow-hidden group"
          >
            {proposalCounts.merch > 0 && (
              <div className="absolute -right-4 -top-1 bg-[#D35057] text-[#F3EFE8] text-[9px] px-6 py-1 rotate-[35deg] font-bold uppercase tracking-tight shadow-xs z-10">
                {proposalCounts.merch} Öneri
              </div>
            )}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-[#D35057] transition-colors">Merch</h3>
                <span className="text-xs font-mono text-[#D35057] dark:text-[#A6B0C9] font-bold">%{projectStats.merch.progress}</span>
              </div>
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] mt-0.5 italic">Tema & Drop Atölyesi</p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-[#CFC5B4]/30 dark:bg-[#17345A] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#D35057] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${projectStats.merch.progress}%` }}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[9px] bg-white/50 dark:bg-black/20 text-[#D35057] px-2 py-0.5 rounded-full font-bold">{projectStats.merch.count} Ürün</span>
              </div>
            </div>
          </div>

          {/* BLOG & İÇERİK FOLDER (Navy) */}
          <div 
            onClick={() => onSelectArea('blog')}
            className="bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer flex flex-col h-[180px] justify-between archive-shadow paper-grain relative overflow-hidden group"
          >
            {proposalCounts.blog > 0 && (
              <div className="absolute -right-4 -top-1 bg-[#D35057] text-[#F3EFE8] text-[9px] px-6 py-1 rotate-[35deg] font-bold uppercase tracking-tight shadow-xs z-10">
                {proposalCounts.blog} Öneri
              </div>
            )}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-indigo-600 transition-colors">Blog</h3>
                <span className="text-xs font-mono text-[#1B2A4A] dark:text-[#A6B0C9] font-bold">%{projectStats.blog.progress}</span>
              </div>
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] mt-0.5 italic">Kemsinblogu</p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-[#CFC5B4]/30 dark:bg-[#17345A] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1B2A4A] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${projectStats.blog.progress}%` }}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[9px] bg-white/50 dark:bg-black/20 text-[#1B2A4A] dark:text-stone-300 px-2 py-0.5 rounded-full font-bold">{projectStats.blog.count} Yazı</span>
              </div>
            </div>
          </div>

          {/* KİTAP FOLDER (Tan) */}
          <div 
            onClick={() => onSelectArea('kitap')}
            className="bg-[#FDFBF7] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer flex flex-col h-[180px] justify-between archive-shadow paper-grain relative overflow-hidden group"
          >
            {proposalCounts.kitap > 0 && (
              <div className="absolute -right-4 -top-1 bg-[#D35057] text-[#F3EFE8] text-[9px] px-6 py-1 rotate-[35deg] font-bold uppercase tracking-tight shadow-xs z-10">
                {proposalCounts.kitap} Öneri
              </div>
            )}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8] group-hover:text-amber-700 transition-colors">Kitap</h3>
                <span className="text-xs font-mono text-[#BBA591] dark:text-[#A6B0C9] font-bold">%{projectStats.kitap.progress}</span>
              </div>
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] mt-0.5 italic">Roman Projeleri</p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-[#CFC5B4]/30 dark:bg-[#17345A] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#BBA591] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${projectStats.kitap.progress}%` }}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[9px] bg-white/50 dark:bg-black/20 text-[#BBA591] px-2 py-0.5 rounded-full font-bold">{projectStats.kitap.count} Bölüm</span>
              </div>
            </div>
          </div>

          {/* OYUN FOLDER (Purple) */}
          <div 
            onClick={() => onSelectArea('oyun')}
            className="bg-[#FAF5FF] dark:bg-[#1C142C] border border-[#D6C4E9] dark:border-[#4E3966] rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer flex flex-col h-[180px] justify-between archive-shadow paper-grain relative overflow-hidden group"
          >
            {proposalCounts.oyun > 0 && (
              <div className="absolute -right-4 -top-1 bg-[#D35057] text-[#F3EFE8] text-[9px] px-6 py-1 rotate-[35deg] font-bold uppercase tracking-tight shadow-xs z-10">
                {proposalCounts.oyun} Öneri
              </div>
            )}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-[#553880] dark:text-[#D6C4E9] group-hover:text-[#7C50D3] transition-colors">Oyun</h3>
                <span className="text-xs font-mono text-[#7C50D3] dark:text-[#D6C4E9] font-bold">%{projectStats.oyun.progress}</span>
              </div>
              <p className="text-[11px] text-[#553880] dark:text-[#A28CB8] mt-0.5 italic">Rol Yapma & Mekanik</p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-[#E5D7F5] dark:bg-[#251A3A] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#7C50D3] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${projectStats.oyun.progress}%` }}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[9px] bg-white/50 dark:bg-black/20 text-[#7C50D3] dark:text-[#D6C4E9] px-2 py-0.5 rounded-full font-bold">{projectStats.oyun.count} Senaryo</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Side-by-side grid container for "BU HAFTA ÖNCELİK" and "BEKLEYEN AI ÖNERİLERİ" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-6">

      {/* 2. BU HAFTA ÖNCELİK */}
      <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-6 archive-shadow paper-grain flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#D35057] rounded-full animate-pulse"></span>
            <h2 className="text-[12px] font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-[0.2em]">
              BU HAFTA ÖNCELİK
            </h2>
          </div>
          <button 
            onClick={() => setIsAddingPriority(!isAddingPriority)}
            className="text-[11px] font-mono px-3 py-1 bg-[#D35057] text-[#F3EFE8] rounded-md hover:bg-[#B23A40] transition-colors cursor-pointer font-bold shadow-2xs"
          >
            {isAddingPriority ? 'Kapat' : '+ Öncelik Ekle'}
          </button>
        </div>

        {/* Add priority inline form */}
        {isAddingPriority && (
          <form onSubmit={handleAddPriority} className="mb-4 p-4 bg-[#FAF6EE] dark:bg-[#17345A] rounded-lg border border-[#CFC5B4]/60 dark:border-[#2C3C72] space-y-3 animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              required
              placeholder="Öncelikli yapılacak işi yazın..."
              value={newPriorityText}
              onChange={(e) => setNewPriorityText(e.target.value)}
              className="w-full bg-[#F3EFE8] dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded px-3 py-2 text-xs focus:outline-hidden focus:border-[#D35057]"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2 text-xs">
                <select 
                  value={newPriorityArea}
                  onChange={(e) => setNewPriorityArea(e.target.value as any)}
                  className="bg-[#F3EFE8] dark:bg-[#13204A] text-xs border border-[#CFC5B4] dark:border-[#2C3C72] rounded px-2.5 py-1 text-[#1B2A4A] dark:text-[#F3EFE8]"
                >
                  <option value="duzada">Düzada & Lore</option>
                  <option value="merch">Merch / Drop</option>
                  <option value="blog">Blog & İçerik</option>
                  <option value="kitap">Kitap / Roman</option>
                  <option value="oyun">Oyun Projeleri</option>
                </select>
              </div>
              <button type="submit" className="px-4 py-1.5 bg-[#1B2A4A] dark:bg-[#D35057] text-white text-xs rounded hover:opacity-90 font-bold">
                Ekle
              </button>
            </div>
          </form>
        )}

        {/* Priority Rows */}
        <div className="space-y-2.5 flex-1">
          {priorityItems.length === 0 ? (
            <div className="text-center py-10 text-[#9A8C76] dark:text-[#6E7CA0] text-sm italic">
              Harika! Bu hafta için kritik yüksek öncelikli bekleyen iş yok.
            </div>
          ) : (
            priorityItems.map(item => {
              // Border and area name colors
              let borderCol = 'border-l-[#8F9E8B]'; // Düzada (sage)
              let areaName = 'Düzada';
              
              const isOyun = item.tags.includes('oyun-tasarimi') || item.id.includes('oyun');

              if (isOyun) {
                borderCol = 'border-l-[#7C50D3]'; // Oyun (purple)
                areaName = 'Oyun';
              } else if (item.area === 'merch') {
                borderCol = 'border-l-[#D35057]'; // Merch (coral)
                areaName = 'Merch';
              } else if (item.area === 'blog') {
                borderCol = 'border-l-[#1B2A4A]'; // Blog (navy)
                areaName = 'Blog';
              } else if (item.area === 'kitap') {
                borderCol = 'border-l-[#BBA591]'; // Kitap (tan)
                areaName = 'Kitap';
              }

              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3.5 bg-[#F6F1E7]/90 dark:bg-[#17345A]/40 border border-[#CFC5B4]/40 dark:border-[#2C3C72]/50 border-l-4 ${borderCol} rounded-lg hover:bg-[#F6F1E7] dark:hover:bg-[#17345A]/75 transition-all group`}
                >
                  <div className="space-y-1.5 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono uppercase text-[#D35057] bg-[#D35057]/10 px-2 py-0.5 rounded-sm font-bold">
                        YÜKSEK
                      </span>
                      <span className="text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] font-bold">
                        {areaName}
                      </span>
                      <span className="text-[10px] font-mono text-[#9A8C76] dark:text-[#6E7CA0] opacity-80">
                        • {item.type}
                      </span>
                    </div>
                    <h4 
                      onClick={() => onSelectArea(isOyun ? 'oyun' : item.area, item.id)}
                      className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8] hover:text-[#D35057] cursor-pointer transition-colors"
                    >
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCompletePriority(item)}
                      className="p-1.5 bg-[#DDEBE0] text-[#3E8E5E] hover:bg-[#3E8E5E] hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Tamamlandı olarak işaretle"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (deleteConfirmPriorityId === item.id) {
                          handleDeletePriorityDirect(item.id);
                          setDeleteConfirmPriorityId(null);
                        } else {
                          setDeleteConfirmPriorityId(item.id);
                        }
                      }}
                      className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold ${
                        deleteConfirmPriorityId === item.id
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                      }`}
                      title={deleteConfirmPriorityId === item.id ? "Kalıcı olarak silmek için tekrar tıklayın" : "Sil"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleteConfirmPriorityId === item.id && <span>Emin misiniz?</span>}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* 3. BEKLEYEN AI ÖNERİLERİ (Dashed Coral Corner, App-wide, Adaptive, Verified UX) */}
      <div className="bg-[#FBF3E4] dark:bg-[#13204A]/60 border-2 border-dashed border-[#D35057] rounded-xl p-6 flex flex-col relative archive-shadow">
        <div className="absolute -top-3 left-6 bg-[#D35057] text-[#F3EFE8] text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider shadow-xs">
          henüz resmi değil
        </div>
        
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-[#CFC5B4]/30 pb-3 cursor-pointer select-none group"
          onClick={() => setIsAiCornerOpen(!isAiCornerOpen)}
        >
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-[#1B2A4A] dark:text-[#F3EFE8] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-[#D35057] transition-colors">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              Yapay Zeka Karar Köşesi ({aiProposals.length})
            </h2>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
              {userAITailorMessage}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#D35057] hover:underline bg-[#D35057]/10 px-2.5 py-1 rounded font-bold">
              {isAiCornerOpen ? 'Kapat [-]' : 'Aç [+]'}
            </span>
            {isAiCornerOpen && aiProposals.length > 0 && (
              <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={async () => {
                    if (confirmAcceptCategory) {
                      const targetProposals = filteredProposals;
                      for (const prop of targetProposals) {
                        await onAcceptProposal(prop.id);
                      }
                      setSelectedProposalIds([]);
                      setConfirmAcceptCategory(false);
                    } else {
                      setConfirmAcceptCategory(true);
                    }
                  }}
                  className={`text-[10px] font-bold transition-all px-2.5 py-1 rounded cursor-pointer shadow-2xs ${
                    confirmAcceptCategory
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-[#E1F2E5] text-[#2E7247] hover:bg-[#2E7247] hover:text-white'
                  }`}
                >
                  {confirmAcceptCategory ? 'Emin misiniz?' : (proposalCategoryTab === 'hepsi' ? 'Tümünü Kabul Et' : 'Kategoriyi Kabul Et')}
                </button>
                {selectedProposalIds.length > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        if (confirmAcceptSelected) {
                          for (const id of selectedProposalIds) {
                            await onAcceptProposal(id);
                          }
                          setSelectedProposalIds([]);
                          setConfirmAcceptSelected(false);
                        } else {
                          setConfirmAcceptSelected(true);
                          setConfirmRejectSelected(false);
                        }
                      }}
                      className={`text-[10px] font-bold transition-all px-2.5 py-1 rounded cursor-pointer ${
                        confirmAcceptSelected
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white'
                      }`}
                    >
                      {confirmAcceptSelected ? 'Kabul Et? (Emin misiniz)' : `Kabul Et (${selectedProposalIds.length})`}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirmRejectSelected) {
                          for (const id of selectedProposalIds) {
                            await onRejectProposal(id);
                          }
                          setSelectedProposalIds([]);
                          setConfirmRejectSelected(false);
                        } else {
                          setConfirmRejectSelected(true);
                          setConfirmAcceptSelected(false);
                        }
                      }}
                      className={`text-[10px] font-bold transition-all px-2.5 py-1 rounded cursor-pointer ${
                        confirmRejectSelected
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      {confirmRejectSelected ? 'Reddet? (Emin misiniz)' : `Reddet (${selectedProposalIds.length})`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {isAiCornerOpen && (
          <>

        {/* Category Tabs */}
        {aiProposals.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-4 border-b border-[#CFC5B4]/20 scrollbar-none">
            {(['hepsi', 'duzada', 'merch', 'kitap', 'blog', 'brainstorm', 'ilham'] as const).map(tabKey => {
              const count = categoryCounts[tabKey] || 0;
              const isActive = proposalCategoryTab === tabKey;
              const labelMap: Record<string, string> = {
                hepsi: 'Tümü',
                duzada: 'Düzada',
                merch: 'Merch',
                kitap: 'Kitap',
                blog: 'Blog',
                brainstorm: 'Beyin Fırtınası',
                ilham: 'İlham'
              };
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    setProposalCategoryTab(tabKey);
                    setSelectedProposalIds([]);
                  }}
                  className={`text-[10px] font-bold py-1 px-3 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#D35057] text-[#F3EFE8] shadow-xs'
                      : 'bg-white dark:bg-[#13204A]/40 text-[#1B2A4A] dark:text-[#A6B0C9] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <span>{labelMap[tabKey]}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-[#D35057]/10 text-[#D35057]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {filteredProposals.length > 0 && (
          <div className="flex items-center justify-between mb-3 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-[#6A5E4C] dark:text-[#A6B0C9]">
              <input
                type="checkbox"
                id="select_all_proposals"
                checked={selectedProposalIds.length === filteredProposals.length && filteredProposals.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProposalIds(filteredProposals.map(p => p.id));
                  } else {
                    setSelectedProposalIds([]);
                  }
                }}
                className="rounded text-[#D35057] focus:ring-[#D35057] cursor-pointer w-3.5 h-3.5"
              />
              <label htmlFor="select_all_proposals" className="cursor-pointer select-none">Tümünü Seç ({filteredProposals.length})</label>
            </div>
            {selectedProposalIds.length > 0 && (
              <div className="font-bold text-[#D35057]">
                {selectedProposalIds.length} Öneri Seçildi
              </div>
            )}
          </div>
        )}

        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-10 text-[#9A8C76] dark:text-[#A6B0C9] text-xs">
              <p>Bu kategoride bekleyen yapay zeka önerisi bulunmamaktadır.</p>
              <p className="text-[10px] mt-1.5 opacity-85">İçerik yazarken veya dünya kurarken AI yardımı talep edebilirsiniz.</p>
            </div>
          ) : (
            filteredProposals.map(prop => (
              <div key={prop.id} className="p-3.5 bg-white dark:bg-[#17345A]/40 border border-[#CFC5B4]/40 dark:border-[#2C3C72] rounded-lg flex gap-3 items-start transition-all hover:bg-stone-50/50">
                <input
                  type="checkbox"
                  checked={selectedProposalIds.includes(prop.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProposalIds(prev => [...prev, prop.id]);
                    } else {
                      setSelectedProposalIds(prev => prev.filter(id => id !== prop.id));
                    }
                  }}
                  className="mt-1 rounded text-[#D35057] focus:ring-[#D35057] cursor-pointer w-3.5 h-3.5"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold bg-[#E7EBE6] dark:bg-[#1B2A4A] px-2 py-0.5 rounded text-[#4A5E68] dark:text-[#7FB8B3] uppercase">
                      {prop.area === 'duzada' ? 'DÜZADA' : prop.area.toUpperCase()}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => onAcceptProposal(prop.id)}
                        className="text-[10px] font-bold text-[#3E8E5E] bg-[#DDEBE0] px-2.5 py-0.5 rounded cursor-pointer hover:opacity-90"
                      >
                        Kabul et
                      </button>
                      <button 
                        onClick={() => onRejectProposal(prop.id)}
                        className="text-[10px] font-bold text-[#D35057] border border-[#D35057] px-2.5 py-0.5 rounded cursor-pointer hover:bg-[#D35057]/5"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                  <h4 className="font-serif font-bold text-xs text-[#1B2A4A] dark:text-[#F3EFE8]">
                    {prop.title}
                  </h4>
                  {prop.notes && (
                    <p className="text-xs italic leading-relaxed text-[#6A5E4C] dark:text-[#A6B0C9] line-clamp-3">
                      "{prop.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Link Suggestions - Integrated Floater Relations box */}
        {unlinkedItems.length > 0 && (
          <div className="mt-5 border-t border-dashed border-[#D35057]/40 pt-4 space-y-3.5">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#D35057] font-bold flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Yüzen Bağlantı Önerileri ({unlinkedItems.filter(i => (i.metadata?.relations || []).some((r: any) => r.isProposal)).length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[220px] overflow-y-auto pr-1">
              {unlinkedItems
                .filter(item => (item.metadata?.relations || []).some((r: any) => r.isProposal))
                .map(item => {
                  const proposedRelations = (item.metadata?.relations || []).filter((r: any) => r.isProposal);
                  
                  return (
                    <div key={item.id} className="p-3 bg-[#FAF6EE]/80 dark:bg-[#1E294B]/35 border border-[#CFC5B4]/50 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono font-bold bg-[#F3EFE8] text-[#9A8C76] px-1.5 py-0.5 rounded uppercase">
                          {item.type}
                        </span>
                        <button
                          onClick={() => onSelectArea(item.area, item.id)}
                          className="text-[9px] font-mono font-bold text-[#D35057] hover:underline"
                        >
                          Git ↗
                        </button>
                      </div>
                      <h4 className="font-serif font-bold text-xs text-[#1B2A4A] dark:text-[#F3EFE8] line-clamp-1">
                        {item.title}
                      </h4>

                      {proposedRelations.map((rel: any, idx: number) => {
                        const targetItem = items.find(i => i.id === rel.targetId);
                        const targetTitle = targetItem ? targetItem.title : rel.targetId;
                        
                        return (
                          <div key={idx} className="p-2 bg-white/70 dark:bg-black/15 rounded text-[10px] space-y-1.5 border border-dashed border-[#D35057]/20">
                            <span className="font-bold text-[#1B2A4A] dark:text-stone-300">
                              → {targetTitle} ({rel.type === 'çalışanı' ? 'Çalışanı' : 'Bulunduğu Yer'})
                            </span>
                            {rel.reason && <p className="text-[9px] leading-tight text-stone-500">{rel.reason}</p>}
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={async () => {
                                  const relations = [...(item.metadata?.relations || [])];
                                  const updated = relations.map((r: any) => {
                                    if (r.targetId === rel.targetId && r.type === rel.type) {
                                      return { ...r, isProposal: false };
                                    }
                                    return r;
                                  });
                                  await onUpdateItem({
                                    ...item,
                                    metadata: { ...item.metadata, relations: updated }
                                  });
                                }}
                                className="text-[9px] font-bold bg-[#3E8E5E] text-white px-2 py-0.5 rounded hover:opacity-90 cursor-pointer"
                              >
                                Kabul Et
                              </button>
                              <button
                                onClick={async () => {
                                  const relations = [...(item.metadata?.relations || [])];
                                  const updated = relations.filter((r: any) => !(r.targetId === rel.targetId && r.type === rel.type));
                                  const ignoredProposals = [...(item.metadata?.ignoredProposals || [])];
                                  const valToIgnore = `${rel.targetId}::${rel.type}`;
                                  if (!ignoredProposals.includes(valToIgnore)) {
                                    ignoredProposals.push(valToIgnore);
                                  }
                                  if (!ignoredProposals.includes(rel.targetId)) {
                                    ignoredProposals.push(rel.targetId);
                                  }
                                  await onUpdateItem({
                                    ...item,
                                    metadata: { 
                                      ...item.metadata, 
                                      relations: updated, 
                                      ignoredProposals 
                                    }
                                  });

                                  // Bidirectional update for target item
                                  const otherItem = items.find(i => i.id === rel.targetId);
                                  if (otherItem) {
                                    const otherRels = [...(otherItem.metadata?.relations || [])].filter((r: any) => !(r.targetId === item.id && r.type === rel.type));
                                    const otherIgnored = [...(otherItem.metadata?.ignoredProposals || [])];
                                    const otherValToIgnore = `${item.id}::${rel.type}`;
                                    if (!otherIgnored.includes(otherValToIgnore)) {
                                      otherIgnored.push(otherValToIgnore);
                                    }
                                    if (!otherIgnored.includes(item.id)) {
                                      otherIgnored.push(item.id);
                                    }
                                    await onUpdateItem({
                                      ...otherItem,
                                      metadata: {
                                        ...otherItem.metadata,
                                        relations: otherRels,
                                        ignoredProposals: otherIgnored
                                      }
                                    });
                                  }
                                }}
                                className="text-[9px] font-bold text-[#D35057] border border-[#D35057]/30 px-2 py-0.5 rounded hover:bg-[#D35057]/5 cursor-pointer"
                              >
                                Yoksay
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      </div>


      {/* 5. SON DOKUNULAN VARLIKLAR */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#6A5E4C] dark:text-[#A6B0C9] mb-3 flex items-center gap-1.5 font-bold">
          <Bookmark className="w-4 h-4 text-[#D35057]" />
          Son dokunulan varlıklar
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {recentlyTouched.length === 0 ? (
            <span className="text-xs text-[#9A8C76] dark:text-[#6E7CA0] italic">Henüz son dokunulan varlık bulunmuyor.</span>
          ) : (
            recentlyTouched.map(item => {
              const isOyun = item.tags.includes('oyun-tasarimi') || item.id.includes('oyun');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectArea(isOyun ? 'oyun' : item.area, item.id)}
                  className="flex items-center gap-2 text-xs bg-[#FAF8F5] dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4]/60 dark:border-[#2C3C72] hover:bg-[#1B2A4A] hover:text-[#F3EFE8] dark:hover:bg-[#D35057] dark:hover:text-white px-3 py-1.5 rounded-full transition-all font-mono cursor-pointer shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D35057]" />
                  <span className="font-bold text-[9px] uppercase opacity-70">[{item.type}]</span>
                  <span>{item.title}</span>
                </button>
              );
            })
          )}
        </div>
      </div>


      {/* 6. EVREN ÖZETİ (Live Stats Panel, Clickable Counters) */}
      <div className="bg-white/80 dark:bg-[#13204A]/40 border border-[#CFC5B4]/80 dark:border-[#2C3C72]/80 rounded-xl p-6 archive-shadow paper-grain">
        <h2 className="text-[12px] font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#D35057]" /> EVREN ÖZETİ (Varlık Sayımları)
        </h2>
        
        <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] mb-5">
          Kems Company kurgusal evreninde kayıtlı olan toplam <strong className="text-[#D35057] font-bold">{items.length}</strong> varlığın canlı dağılımı. İlgili listeye gitmek için sayımlara tıklayın.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-4 text-center font-mono">
          
          {/* Kişi */}
          <div 
            onClick={() => onSelectArea('duzada')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.karakter}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Kişi / Karakter</span>
          </div>

          {/* Yer */}
          <div 
            onClick={() => onSelectArea('duzada')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.yer}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Yer / Mekân</span>
          </div>

          {/* Marka */}
          <div 
            onClick={() => onSelectArea('markalar')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#D35057] block">{statsSummary.marka}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Marka</span>
          </div>

          {/* Olay */}
          <div 
            onClick={() => onSelectArea('duzada')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.olay}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Olay / Lore</span>
          </div>

          {/* Tema */}
          <div 
            onClick={() => onSelectArea('merch')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.tema}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Tema / Koleksiyon</span>
          </div>

          {/* Drop */}
          <div 
            onClick={() => onSelectArea('merch')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#D35057] block">{statsSummary.drop}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Süreli Drop</span>
          </div>

          {/* Ürün */}
          <div 
            onClick={() => onSelectArea('merch')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.urun}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Ürün</span>
          </div>

          {/* Yazı */}
          <div 
            onClick={() => onSelectArea('blog')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.yazi}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Blog Yazısı</span>
          </div>

          {/* Kitap Bölümü */}
          <div 
            onClick={() => onSelectArea('kitap')}
            className="p-3 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#17345A]/40 border border-[#CFC5B4]/50 rounded-lg cursor-pointer transition-all hover:scale-[1.03] shadow-3xs"
          >
            <span className="text-2xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">{statsSummary.bolum}</span>
            <span className="text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold block mt-1">Kitap Bölümü</span>
          </div>

        </div>
      </div>


      {/* 7. GÜNLÜK NOT / BUGÜNÜN DÜŞÜNCESİ (Persistent free-text, editable & deletable) */}
      <div className="bg-[#FAF6EE] dark:bg-[#172554]/30 border-2 border-dashed border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-6 paper-grain archive-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#1B2A4A] dark:text-[#F3EFE8] font-bold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            GÜNLÜK NOT / BUGÜNÜN DÜŞÜNCESİ
          </h3>
          
          <div className="flex gap-2 text-xs font-mono">
            {dailyNoteItem && !isEditingDailyNote && (
              <>
                <button 
                  onClick={() => setIsEditingDailyNote(true)}
                  className="px-2.5 py-1 text-[#6A5E4C] hover:text-[#D35057] transition-all flex items-center gap-1 cursor-pointer hover:bg-stone-100 rounded"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>
                <button 
                  onClick={async () => {
                    if (deleteConfirmDailyNote) {
                      await handleDeleteDailyNote();
                      setDeleteConfirmDailyNote(false);
                    } else {
                      setDeleteConfirmDailyNote(true);
                    }
                  }}
                  className={`px-2.5 py-1 transition-all flex items-center gap-1 cursor-pointer rounded ${
                    deleteConfirmDailyNote 
                      ? "bg-red-600 text-white font-bold animate-pulse" 
                      : "text-red-500 hover:text-red-700 hover:bg-red-50"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteConfirmDailyNote ? "Emin misiniz?" : "Sil"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {isEditingDailyNote || !dailyNoteItem ? (
          <div className="space-y-3">
            <textarea
              value={dailyNoteText}
              onChange={(e) => setDailyNoteText(e.target.value)}
              placeholder="Bugünün odağını, aklınızdaki bir fikri veya lore esintisini buraya serbest not alın. Bulut veritabanında saklanır."
              className="w-full h-28 p-3.5 text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg focus:outline-hidden focus:border-[#D35057] leading-relaxed font-sans"
            />
            <div className="flex justify-end gap-2 text-xs font-mono">
              {dailyNoteItem && (
                <button 
                  onClick={() => {
                    setIsEditingDailyNote(false);
                    setDailyNoteText(dailyNoteItem.notes);
                  }}
                  className="px-3.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-[#1B2A4A] rounded-md cursor-pointer"
                >
                  İptal
                </button>
              )}
              <button 
                onClick={handleSaveDailyNote}
                className="px-4 py-1.5 bg-[#D35057] hover:bg-[#B23A40] text-white font-bold rounded-md shadow-2xs cursor-pointer"
              >
                Notu Kaydet
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white/70 dark:bg-black/15 border border-[#CFC5B4]/30 rounded-lg relative group">
            <div className="text-xs leading-relaxed font-serif text-[#1B2A4A] dark:text-stone-200 italic whitespace-pre-wrap">
              "{dailyNoteItem.notes}"
            </div>
            <div className="mt-3 text-[10px] font-mono text-stone-400 dark:text-stone-500 flex justify-between items-center">
              <span>Güncelleme: {new Date(dailyNoteItem.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              <button 
                onClick={() => setIsEditingDailyNote(true)}
                className="text-[10px] text-[#D35057] hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
              >
                Hızlı Düzenle
              </button>
            </div>
          </div>
        )}
      </div>


      {/* 8. KANALLAR (Dashed Strip, Label Kanallar (NOT Analitik), External Links, Editable) */}
      <div className="border-2 border-dashed border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5]/80 dark:bg-[#13204A]/30 rounded-xl p-6 space-y-4 paper-grain archive-shadow">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-xs font-mono uppercase tracking-widest text-[#1B2A4A] dark:text-[#F3EFE8] font-bold flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-[#D35057]" />
              Kanallar
            </h4>
            <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9]">
              Kems Company kurgu evreninin sosyal medya yayın ağları ve dijital kanalları.
            </p>
          </div>
          
          <button
            onClick={() => setIsEditingChannels(!isEditingChannels)}
            className="text-xs font-mono bg-white dark:bg-[#17345A] hover:bg-stone-50 border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs font-bold"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#D35057]" />
            <span>{isEditingChannels ? 'Kanalları Kilitle' : 'Düzenle'}</span>
          </button>
        </div>

        {/* Channels display / editing container */}
        {isEditingChannels ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-2 max-h-60 overflow-y-auto bg-white/40 dark:bg-black/15 p-3 rounded-lg border border-[#CFC5B4]/50">
              <span className="text-[10px] font-mono uppercase text-[#9A8C76] dark:text-[#A6B0C9] font-bold">Aktif Yayınlar:</span>
              
              {items.filter(i => i.type === 'channel' && !i.archived).map(ch => (
                <div key={ch.id} className="p-2.5 bg-white dark:bg-[#17345A] border border-[#CFC5B4]/50 rounded-lg text-xs font-mono">
                  {editingChannelId === ch.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-stone-400 font-bold">Kanal İsmi</label>
                          <input
                            type="text"
                            value={editChannelTitle}
                            onChange={(e) => setEditChannelTitle(e.target.value)}
                            className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-1 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-stone-400 font-bold">Platform URL</label>
                          <input
                            type="url"
                            value={editChannelUrl}
                            onChange={(e) => setEditChannelUrl(e.target.value)}
                            className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-1 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-stone-400 font-bold">İkon Türü</label>
                          <select
                            value={editChannelPlatform}
                            onChange={(e) => setEditChannelPlatform(e.target.value as any)}
                            className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-1 focus:outline-hidden"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter</option>
                            <option value="custom">Diğer</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingChannelId(null)}
                          className="px-2 py-1 text-[10px] bg-stone-200 text-stone-700 rounded hover:bg-stone-300 cursor-pointer"
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editChannelTitle.trim() || !editChannelUrl.trim()) return;
                            await onUpdateItem({
                              ...ch,
                              title: editChannelTitle,
                              notes: editChannelUrl,
                              metadata: {
                                ...ch.metadata,
                                platform: editChannelPlatform
                              }
                            });
                            setEditingChannelId(null);
                          }}
                          className="px-2 py-1 text-[10px] bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer font-bold"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="capitalize font-bold text-[#D35057] shrink-0">[{ch.metadata?.platform || 'custom'}]</span>
                        <span className="font-semibold text-[#1B2A4A] dark:text-[#F3EFE8] shrink-0">{ch.title}</span>
                        <span className="text-[10px] text-stone-400 truncate max-w-[150px] sm:max-w-xs">{ch.notes}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingChannelId(ch.id);
                            setEditChannelTitle(ch.title);
                            setEditChannelUrl(ch.notes || '');
                            setEditChannelPlatform((ch.metadata?.platform as any) || 'custom');
                          }}
                          className="text-stone-500 hover:text-[#D35057] p-1 cursor-pointer"
                          title="Düzenle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async () => {
                            if (deleteConfirmChannelId === ch.id) {
                              if (onDeleteItem) {
                                await onDeleteItem(ch.id);
                              } else {
                                await onUpdateItem({ ...ch, archived: true });
                              }
                              setDeleteConfirmChannelId(null);
                            } else {
                              setDeleteConfirmChannelId(ch.id);
                            }
                          }}
                          className={`p-1 cursor-pointer transition-all rounded text-[11px] font-mono font-bold flex items-center gap-0.5 ${
                            deleteConfirmChannelId === ch.id
                              ? "text-white bg-red-600 px-1.5 animate-pulse"
                              : "text-red-500 hover:text-red-700"
                          }`}
                          title={deleteConfirmChannelId === ch.id ? "Silmek için tekrar tıklayın" : "Sil"}
                        >
                          {deleteConfirmChannelId === ch.id ? "Emin misiniz?" : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {items.filter(i => i.type === 'channel' && !i.archived).length === 0 && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-stone-400 italic">Veritabanında özelleştirilmiş kanal bulunamadı.</p>
                  <button
                    onClick={async () => {
                      const DEFAULTS = [
                        { title: 'YouTube (Eylül)', notes: 'https://youtube.com/@eylul', platform: 'youtube' },
                        { title: 'TikTok (Eylül)', notes: 'https://tiktok.com/@eylul', platform: 'custom' },
                        { title: 'Instagram (Kems)', notes: 'https://instagram.com/kems', platform: 'instagram' },
                        { title: 'Twitter (Kems)', notes: 'https://twitter.com/kems', platform: 'twitter' },
                      ];
                      for (const d of DEFAULTS) {
                        await onAddItem({
                          title: d.title,
                          area: 'komuta',
                          type: 'channel',
                          status: 'Yayında',
                          priority: 'orta',
                          tags: ['sosyal-medya'],
                          links: [],
                          notes: d.notes,
                          images: [],
                          isProposal: false,
                          archived: false,
                          metadata: { platform: d.platform }
                        });
                      }
                      alert("Varsayılan kanallar veritabanına eklendi!");
                    }}
                    className="text-[11px] font-mono bg-[#D35057] text-white px-3 py-1.5 rounded hover:bg-[#B23A40] transition-colors cursor-pointer font-bold"
                  >
                    Varsayılan Kanalları Klonla
                  </button>
                </div>
              )}
            </div>

            {/* Form to add a new channel link */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newChannelTitle.trim() || !newChannelUrl.trim()) return;
                
                await onAddItem({
                  title: newChannelTitle,
                  area: 'komuta',
                  type: 'channel',
                  status: 'Yayında',
                  priority: 'orta',
                  tags: ['sosyal-medya'],
                  links: [],
                  notes: newChannelUrl,
                  images: [],
                  isProposal: false,
                  archived: false,
                  metadata: { platform: newChannelPlatform }
                });

                setNewChannelTitle('');
                setNewChannelUrl('');
                setNewChannelPlatform('custom');
                alert("Yeni kanal başarıyla eklendi!");
              }}
              className="bg-white/45 dark:bg-[#17345A]/15 border border-[#CFC5B4] p-4 rounded-lg space-y-3"
            >
              <span className="text-[10px] font-mono font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block uppercase">
                Yeni Kanal / Bağlantı Ekle
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">Kanal Başlığı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Spotify Çalma Listesi"
                    value={newChannelTitle}
                    onChange={(e) => setNewChannelTitle(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">Bağlantı Adresi (URL) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={newChannelUrl}
                    onChange={(e) => setNewChannelUrl(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">Platform İkonu</label>
                  <select
                    value={newChannelPlatform}
                    onChange={(e) => setNewChannelPlatform(e.target.value as any)}
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2 text-[#1B2A4A]"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok (Custom)</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="custom">Özel Bağlantı</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#D35057] hover:bg-[#B23A40] text-white px-4 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  + Kanalı Ekle
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Render Active Channels List (Dashed strip format) */
          <div className="flex flex-wrap gap-3 animate-in fade-in duration-200">
            {items.filter(i => i.type === 'channel' && !i.archived).length > 0 ? (
              items.filter(i => i.type === 'channel' && !i.archived).map(ch => {
                const isYoutube = ch.metadata?.platform === 'youtube';
                const isInstagram = ch.metadata?.platform === 'instagram';
                const isTwitter = ch.metadata?.platform === 'twitter';
                
                let icon = <ExternalLink className="w-4 h-4" />;
                let btnClass = "bg-stone-500/10 text-stone-700 dark:text-stone-300 border border-dashed border-stone-500/40 hover:bg-stone-500 hover:text-white";
                
                if (isYoutube) {
                  icon = <Youtube className="w-4 h-4" />;
                  btnClass = "bg-[#D35057]/10 text-[#D35057] border border-dashed border-[#D35057]/40 hover:bg-[#D35057] hover:text-white";
                } else if (isInstagram) {
                  icon = <Instagram className="w-4 h-4" />;
                  btnClass = "bg-pink-600/10 text-pink-600 dark:text-pink-400 border border-dashed border-pink-600/40 hover:bg-pink-600 hover:text-white";
                } else if (isTwitter) {
                  icon = <Twitter className="w-4 h-4" />;
                  btnClass = "bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-dashed border-sky-500/40 hover:bg-sky-500 hover:text-white";
                }

                return (
                  <a 
                    key={ch.id}
                    href={ch.notes} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`flex items-center gap-2.5 text-xs font-mono px-4 py-2 rounded-lg transition-all cursor-pointer ${btnClass}`}
                  >
                    {icon}
                    <span className="font-bold">{ch.title}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                );
              })
            ) : (
              /* Hardcoded defaults when database collection is empty */
              <>
                <a 
                  href="https://youtube.com/@eylul" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2.5 text-xs font-mono bg-[#D35057]/10 text-[#D35057] border border-dashed border-[#D35057]/40 px-4 py-2 rounded-lg hover:bg-[#D35057] hover:text-white transition-all cursor-pointer"
                >
                  <Youtube className="w-4 h-4" />
                  <span className="font-bold">YouTube (Eylül)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a 
                  href="https://tiktok.com/@eylul" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2.5 text-xs font-mono bg-stone-500/10 text-stone-700 dark:text-stone-300 border border-dashed border-stone-500/40 px-4 py-2 rounded-lg hover:bg-stone-500 hover:text-white transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="font-bold">TikTok (Eylül)</span>
                </a>
                <a 
                  href="https://instagram.com/kems" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2.5 text-xs font-mono bg-pink-600/10 text-pink-600 dark:text-pink-400 border border-dashed border-pink-600/40 px-4 py-2 rounded-lg hover:bg-pink-600 hover:text-white transition-all cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                  <span className="font-bold">Instagram (Kems)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a 
                  href="https://twitter.com/kems" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2.5 text-xs font-mono bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-dashed border-sky-500/40 px-4 py-2 rounded-lg hover:bg-sky-500 hover:text-white transition-all cursor-pointer"
                >
                  <Twitter className="w-4 h-4" />
                  <span className="font-bold">Twitter (Kems)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        )}
      </div>


      {/* 9. TOPLU YÜKLEME PANELİ (Preserved completely intact as requested) */}
      <div className="border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F9F7F1]/70 dark:bg-[#13204A]/25 rounded-xl p-5 space-y-4 paper-grain">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-mono uppercase tracking-widest text-[#1B2A4A] dark:text-[#F3EFE8] font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#D35057]" />
              Toplu Karakter & Veri Yükleme (Sheet / Excel / CSV / JSON)
            </h4>
            <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9]">
              Excel'den kopyaladığınız tabloları, CSV dosyalarını veya JSON datalarını toplu olarak evreninize yükleyin.
            </p>
          </div>
          <button
            onClick={() => setIsBulkImportOpen(!isBulkImportOpen)}
            className="text-xs font-mono bg-[#1B2A4A]/5 hover:bg-[#1B2A4A]/10 text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            {isBulkImportOpen ? 'Paneli Gizle' : 'Yükleme Panelini Aç'}
          </button>
        </div>

        {isBulkImportOpen && (
          <div className="space-y-4 border-t border-[#CFC5B4]/50 dark:border-[#2C3C72]/50 pt-4 animate-in fade-in duration-200">
            {/* Sheet Template Box */}
            <div className="bg-white/60 dark:bg-[#17345A]/30 border border-[#CFC5B4] rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block uppercase">
                  Doldurmanız Gereken Sütun Yapısı (Sheet Şablonu)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const csvContent = "Başlık;Alan;Tür;Durum;Öncelik;Etiketler;Bölge;Notlar\nKamil Efendi;duzada;karakter;Fikir;yüksek;müzisyen,efsane;orman;Küçükçetmi köyünün eski klarnetçisi.\nLiman Kahvesi;duzada;mekân;Tasarım;orta;sosyal,liman;liman;Tüm balıkçıların toplandığı sıcak mekan.";
                      navigator.clipboard.writeText(csvContent);
                      alert("Şablon CSV içeriği panoya kopyalandı! Excel veya Google Sheets'e yapıştırıp doldurabilirsiniz.");
                    }}
                    className="text-[10px] font-mono bg-[#D35057] text-white px-2.5 py-1 rounded hover:bg-[#B23A40] flex items-center gap-1 cursor-pointer"
                  >
                    <Clipboard className="w-3 h-3" />
                    Şablonu Kopyala
                  </button>
                  <button
                    onClick={() => {
                      const csvContent = "\uFEFFBaşlık;Alan;Tür;Durum;Öncelik;Etiketler;Bölge;Notlar\nKamil Efendi;duzada;karakter;Fikir;yüksek;müzisyen,efsane;orman;Küçükçetmi köyünün eski klarnetçisi.\nLiman Kahvesi;duzada;mekân;Tasarım;orta;sosyal,liman;liman;Tüm balıkçıların toplandığı sıcak mekan.";
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", "kems_sablon.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-[10px] font-mono bg-[#1B2A4A] text-white px-2.5 py-1 rounded hover:bg-[#111C32] flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Şablonu İndir (Excel/CSV)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-[#1B2A4A]/10 dark:bg-[#1B2A4A]/45 border-b border-[#CFC5B4]">
                      <th className="p-1.5 font-bold">Başlık *</th>
                      <th className="p-1.5 font-bold">Alan *</th>
                      <th className="p-1.5 font-bold">Tür *</th>
                      <th className="p-1.5 font-bold">Durum</th>
                      <th className="p-1.5 font-bold">Öncelik</th>
                      <th className="p-1.5 font-bold">Etiketler</th>
                      <th className="p-1.5 font-bold">Bölge</th>
                      <th className="p-1.5 font-bold">Notlar</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#6A5E4C] dark:text-[#A6B0C9]">
                    <tr className="border-b border-[#CFC5B4]/30">
                      <td className="p-1.5 font-serif italic">Örn: Kamil Efendi</td>
                      <td className="p-1.5">duzada</td>
                      <td className="p-1.5">karakter</td>
                      <td className="p-1.5">Fikir</td>
                      <td className="p-1.5">yüksek</td>
                      <td className="p-1.5">efsane,ada</td>
                      <td className="p-1.5">orman</td>
                      <td className="p-1.5">Klarnet virtüözü...</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-serif italic">Örn: Şenlik T-Shirt</td>
                      <td className="p-1.5">merch</td>
                      <td className="p-1.5">merch_urun</td>
                      <td className="p-1.5">Fikir</td>
                      <td className="p-1.5">orta</td>
                      <td className="p-1.5">giyim,tasarım</td>
                      <td className="p-1.5">-</td>
                      <td className="p-1.5">100% organik pamuk...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[#9A8C76] dark:text-[#6E7CA0]">
                * <strong>Alan listesi:</strong> duzada, merch, blog, kitap. <strong>Tür listesi:</strong> karakter, mekân, kulüp, dükkân, olay, merch_urun, blog_post, kitap_bolum.
              </p>
            </div>

            {/* Upload Area / Text Paste */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">
                Tablo Verilerini Buraya Yapıştırın (CSV / Excel formatı) veya JSON listesi
              </label>
              <textarea
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder="Örn:&#10;Başlık;Alan;Tür;Durum;Öncelik;Etiketler;Bölge;Notlar&#10;Kamil Efendi;duzada;karakter;Fikir;yüksek;müzisyen;orman;Klarnetçi&#10;Liman Kahvesi;duzada;mekân;Tasarım;orta;sosyal;liman;Canlı kahve"
                className="w-full h-36 font-mono text-xs bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] p-3 rounded-lg focus:outline-hidden"
              />

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.txt,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        if (evt.target?.result) {
                          setBulkInputText(evt.target.result as string);
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-mono bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] px-3.5 py-2 rounded-lg hover:bg-stone-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs font-bold"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D35057]" />
                    <span>Dosyadan Yükle (.csv, .json)</span>
                  </button>
                  {bulkInputText && (
                    <button
                      onClick={() => setBulkInputText('')}
                      className="text-xs font-mono text-red-500 hover:underline"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (!bulkInputText.trim()) {
                      alert("Lütfen önce veri yapıştırın veya dosya yükleyin.");
                      return;
                    }
                    
                    try {
                      // Parse JSON
                      if (bulkInputText.trim().startsWith('[')) {
                        const parsed = JSON.parse(bulkInputText);
                        if (Array.isArray(parsed)) {
                          let successCount = 0;
                          for (const row of parsed) {
                            await onAddItem({
                              title: row.title || row.Başlık || 'İsimsiz Varlık',
                              area: row.area || row.Alan || 'duzada',
                              type: row.type || row.Tür || 'karakter',
                              status: row.status || row.Durum || 'Fikir',
                              priority: row.priority || row.Öncelik || 'orta',
                              tags: Array.isArray(row.tags) ? row.tags : (row.tags || row.Etiketler || '').split(',').map((t: string) => t.trim()).filter(Boolean),
                              links: [],
                              notes: row.notes || row.Notlar || '',
                              images: [],
                              isProposal: false,
                              archived: false,
                              metadata: {
                                region: row.region || row.Bölge || 'merkez'
                              }
                            });
                            successCount++;
                          }
                          alert(`${successCount} adet varlık başarıyla evreninize eklendi!`);
                          setBulkInputText('');
                          setIsBulkImportOpen(false);
                          return;
                        }
                      }

                      // Parse CSV / Text lines
                      const lines = bulkInputText.split('\n').map(l => l.trim()).filter(Boolean);
                      if (lines.length < 2) {
                        alert("Geçersiz CSV yapısı! En az bir başlık satırı ve veri satırı olmalı.");
                        return;
                      }

                      // Auto detect delimiter
                      const headerLine = lines[0];
                      const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
                      const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
                      
                      let successCount = 0;
                      for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(delimiter).map(v => v.trim());
                        const row: Record<string, string> = {};
                        headers.forEach((h, idx) => {
                          row[h] = values[idx] || '';
                        });

                        const title = row['başlık'] || row['title'] || row['name'] || 'Yeni Varlık';
                        const area = (row['alan'] || row['area'] || 'duzada').toLowerCase();
                        const type = (row['tür'] || row['type'] || 'karakter').toLowerCase();
                        const status = row['durum'] || row['status'] || 'Fikir';
                        const priority = (row['öncelik'] || row['priority'] || 'orta').toLowerCase();
                        const tags = (row['etiketler'] || row['tags'] || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                        const notes = row['notlar'] || row['notes'] || '';
                        const region = row['bölge'] || row['region'] || 'merkez';

                        await onAddItem({
                          title,
                          area: area as any,
                          type: type as any,
                          status,
                          priority: priority as any,
                          tags,
                          links: [],
                          notes,
                          images: [],
                          isProposal: false,
                          archived: false,
                          metadata: { region }
                        });
                        successCount++;
                      }

                      alert(`${successCount} adet kayıtlı varlık başarıyla içeri aktarıldı!`);
                      setBulkInputText('');
                      setIsBulkImportOpen(false);
                    } catch (err: any) {
                      alert(`İçe aktarma hatası: ${err.message || err}`);
                    }
                  }}
                  className="bg-[#D35057] hover:bg-[#B23A40] text-white px-5 py-2 rounded-lg font-mono text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Varlıkları Toplu Yükle</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
