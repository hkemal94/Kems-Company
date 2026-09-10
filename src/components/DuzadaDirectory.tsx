import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Users, 
  Shield, 
  MapPin, 
  Store, 
  Calendar, 
  Sparkles, 
  Plus, 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Archive, 
  Check, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { Item, ItemType } from '../types';

interface DuzadaDirectoryProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: any) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (itemData: any) => Promise<void>;
}

export default function DuzadaDirectory({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}: DuzadaDirectoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Hepsi');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ItemType>('kisi');
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'completeness'>('name');
  const [subClassFilter, setSubClassFilter] = useState<'hepsi' | 'sakin' | 'misafir' | 'personel'>('hepsi');
  
  // Safe confirmation states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState(false);

  // Group Collapsible States
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    mahalleler: true,
    mekanlar: true,
    kisiler: true,
    olaylar: false,
    urunler: false,
  });

  // Nesting Collapsible States
  const [expandedMahalles, setExpandedMahalles] = useState<Record<string, boolean>>({
    merkez: true,
    eski_liman: true,
  });
  const [expandedSokaklar, setExpandedSokaklar] = useState<Record<string, boolean>>({});

  // Static hierarchies matching Duzada.tsx
  const defaultMahalleler = useMemo(() => [
    { id: 'merkez', name: 'Merkez' },
    { id: 'liman', name: 'Liman' },
    { id: 'fener', name: 'Fener' },
    { id: 'stad', name: 'Stad' },
    { id: 'çiftlik', name: 'Çiftlik' },
    { id: 'eski_liman', name: 'Eski Liman' }
  ], []);

  const defaultSokaklar = useMemo(() => [
    { id: 'sok_1', name: 'Kuvayi Milliye Caddesi', mahalleId: 'merkez' },
    { id: 'sok_2', name: 'Çarşı Sokak', mahalleId: 'merkez' },
    { id: 'sok_3', name: 'Liman Kordonu', mahalleId: 'liman' },
    { id: 'sok_4', name: 'Fener Yolu', mahalleId: 'fener' },
    { id: 'sok_5', name: 'Stadyum Caddesi', mahalleId: 'stad' },
    { id: 'sok_6', name: 'Zeytinlik Yolu', mahalleId: 'çiftlik' },
    { id: 'sok_7', name: 'Kems Rıhtımı', mahalleId: 'eski_liman' }
  ], []);

  // Filter entities
  const entities = useMemo(() => {
    return items.filter(i => i.area === 'duzada' && !i.archived);
  }, [items]);

  const isRoomItem = (ent: Item) => {
    return (
      ent.type === 'oda' ||
      (ent.type === 'yer' &&
       (ent.tags?.includes('oda') ||
        ent.id.startsWith('kemskoy_room_') ||
        ent.title.startsWith('Oda ')))
    );
  };

  const isMahalleItem = (ent: Item) => {
    return (
      ent.type === 'yer' &&
      (ent.id.startsWith('region_') ||
       ent.tags?.includes('mahalle') ||
       ent.tags?.includes('bölge') ||
       ['merkez', 'liman', 'fener', 'stad', 'çiftlik', 'eski_liman', 'eski liman / kemskoy'].includes(ent.id))
    );
  };

  const getCompletenessScore = (item: Item) => {
    const type = item.type;
    const checkValue = (v: any) => {
      if (v === null || v === undefined) return false;
      const s = String(v).trim();
      return s !== '' && s.toLowerCase() !== 'belirtilmedi' && s.toLowerCase() !== 'bilinmiyor';
    };
    
    let fields = [item.title, item.notes];
    if (type === 'kisi' || type === 'karakter') {
      const p = item.metadata?.profile || {};
      fields.push(p.profession, p.personality, p.origin, p.motivation);
    } else if (type === 'mekân' || type === 'dükkân' || type === 'yer' || type === 'oda') {
      const p = item.metadata?.profile || {};
      fields.push(p.shopType, p.manager, p.style, p.secrets);
    } else if (type === 'marka' || type === 'kulüp') {
      const p = item.metadata?.profile || {};
      fields.push(p.purpose, p.leader, p.secrecy);
    } else if (type === 'olay') {
      const p = item.metadata?.profile || {};
      fields.push(item.metadata?.date, item.metadata?.recurrence, p.manager);
    } else if (type === 'ürün' || type === 'drop') {
      const p = item.metadata?.profile || {};
      fields.push(p.rarity, p.material, p.function);
    }
    
    const filled = fields.filter(checkValue).length;
    return fields.length > 0 ? Math.round((filled / fields.length) * 100) : 100;
  };

  const filteredEntities = useMemo(() => {
    return entities.filter(ent => {
      // 1. Map pins and settings are hidden from directories unless selecting 'Harita'
      if (ent.type === 'map_pin' && selectedCategory !== 'Harita') return false;
      if (ent.type === 'map_settings') return false;

      // 2. Rooms are excluded from top-level directory unless 'Odalar' is selected
      if (isRoomItem(ent) && selectedCategory !== 'Odalar') return false;

      // 3. Category Filter
      if (selectedCategory !== 'Hepsi') {
        if (selectedCategory === 'Odalar') {
          if (!isRoomItem(ent)) return false;
        } else if (selectedCategory === 'Harita') {
          if (ent.type !== 'map_pin') return false;
        } else {
          const catMap: { [key: string]: string } = {
            'Kişiler': 'kisi,karakter',
            'Markalar': 'marka,kulüp',
            'Mekânlar': 'mekân,dükkân',
            'Yerler': 'yer',
            'Olaylar': 'olay',
            'Ürünler': 'ürün'
          };
          const allowedTypes = (catMap[selectedCategory] || '').split(',');
          const matchesType = allowedTypes.includes(ent.type);
          const matchesTag = ent.tags?.some(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (selectedCategory === 'Kişiler') return ['kisi', 'karakter', 'sakin', 'ada-sakini', 'misafir', 'otel-misafiri', 'personel', 'otel-personeli'].includes(cleanTag);
            if (selectedCategory === 'Markalar') return ['marka', 'kulüp', 'şirket', 'firma'].includes(cleanTag);
            if (selectedCategory === 'Mekânlar') return ['mekân', 'dükkân', 'işletme', 'otel', 'pansiyon', 'restoran', 'cafe'].includes(cleanTag);
            if (selectedCategory === 'Yerler') return ['yer', 'bölge', 'coğrafi', 'mevki', 'mahalle'].includes(cleanTag);
            if (selectedCategory === 'Olaylar') return ['olay', 'tarih', 'festival', 'şenlik', 'lore'].includes(cleanTag);
            if (selectedCategory === 'Ürünler') return ['ürün', 'merch', 'drop', 'tişört', 'giyim'].includes(cleanTag);
            return false;
          });

          if (!matchesType && !matchesTag) return false;
          
          // Exclude rooms and mahalleler from other categories
          if (isRoomItem(ent)) return false;
          if (isMahalleItem(ent) && selectedCategory !== 'Yerler') return false;
        }
      }

      // 4. Kişiler Sub-classifications Filter
      if (selectedCategory === 'Kişiler' && subClassFilter !== 'hepsi') {
        const tags = ent.tags || [];
        const matches = (subClassFilter === 'sakin' && (tags.includes('sakin') || tags.includes('ada-sakini'))) ||
                        (subClassFilter === 'misafir' && (tags.includes('misafir') || tags.includes('otel-misafiri'))) ||
                        (subClassFilter === 'personel' && (tags.includes('personel') || tags.includes('otel-personeli')));
        if (!matches) return false;
      }

      // 5. Search filter
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesTitle = ent.title?.toLowerCase().includes(query);
        const matchesType = ent.type?.toLowerCase().includes(query);
        const matchesStatus = ent.status?.toLowerCase().includes(query);
        const matchesNotes = ent.notes?.toLowerCase().includes(query);
        return matchesTitle || matchesType || matchesStatus || matchesNotes;
      }

      return true;
    });
  }, [entities, selectedCategory, searchFilter, subClassFilter]);

  const sortedEntities = useMemo(() => {
    const list = [...filteredEntities];
    if (sortBy === 'name') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
    } else if (sortBy === 'completeness') {
      list.sort((a, b) => getCompletenessScore(b) - getCompletenessScore(a));
    }
    return list;
  }, [filteredEntities, sortBy]);

  const showAllOnSearch = searchFilter.trim().length > 0;

  // Groups
  const mahalleGroup = useMemo(() => {
    return sortedEntities.filter(ent => isMahalleItem(ent));
  }, [sortedEntities]);

  const mekanGroup = useMemo(() => {
    return sortedEntities.filter(ent => 
      (ent.type === 'mekân' || ent.type === 'dükkân') && !isMahalleItem(ent)
    );
  }, [sortedEntities]);

  const kisilerGroup = useMemo(() => {
    return sortedEntities.filter(ent => 
      ent.type === 'kisi' || ent.type === 'karakter' || ent.type === 'marka' || ent.type === 'kulüp'
    );
  }, [sortedEntities]);

  const olaylarGroup = useMemo(() => {
    return sortedEntities.filter(ent => ent.type === 'olay');
  }, [sortedEntities]);

  const urunlerGroup = useMemo(() => {
    return sortedEntities.filter(ent => ent.type === 'ürün');
  }, [sortedEntities]);

  // Find a specific mahalle item from the database
  const findMahalleItem = (mahId: string) => {
    return entities.find(ent => 
      isMahalleItem(ent) && 
      (ent.id === `region_${mahId}` || 
       ent.metadata?.region === mahId || 
       ent.title.toLowerCase() === mahId.replace('_', ' '))
    );
  };

  const getEntityIcon = (type: ItemType) => {
    switch (type) {
      case 'marka':
      case 'kulüp': 
        return <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
      case 'kisi':
      case 'karakter': 
        return <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />;
      case 'yer': 
        return <Compass className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
      case 'mekân':
      case 'dükkân': 
        return <Store className="w-3 h-3 text-rose-600 dark:text-rose-400" />;
      case 'olay': 
        return <Calendar className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
      case 'ürün': 
        return <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
      default: 
        return <FileText className="w-3 h-3 text-stone-600 dark:text-stone-400" />;
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const id = `entity_${Date.now()}`;
    const newEntity: any = {
      id,
      title: newTitle,
      area: 'duzada',
      type: newType,
      status: 'Fikir',
      priority: 'orta',
      tags: [newType],
      links: [],
      notes: '',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        region: 'belirlenmemiş',
        haritaKonum: { x: 50, y: 50 },
        wikiSections: [],
        brandKit: {
          selectedLogo: '',
          ideaLogos: [],
          colorPalette: [],
          exemplaryWorks: [],
          selectedFont: ''
        }
      }
    };

    await onAddItem(newEntity);
    setNewTitle('');
    setShowCreateForm(false);
    onSelectItem(id);
  };

  const renderEntityRow = (ent: Item, depth: number = 0) => {
    const isActive = activeItemId === ent.id;
    const isSelected = selectedEntityIds.includes(ent.id);
    const isDeleting = deleteConfirmId === ent.id;

    return (
      <div
        key={ent.id}
        onClick={() => onSelectItem(ent.id)}
        className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all group ${
          isActive 
            ? 'bg-[#EAE4D7] dark:bg-[#1A2E65] border-l-2 border-[#D35057] shadow-3xs' 
            : 'hover:bg-[#FAF8F5] dark:hover:bg-[#13204A]/60'
        }`}
        style={{ paddingLeft: `${Math.max(6, depth * 12)}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedEntityIds([...selectedEntityIds, ent.id]);
              } else {
                setSelectedEntityIds(selectedEntityIds.filter(id => id !== ent.id));
              }
            }}
            className="rounded text-[#D35057] focus:ring-[#D35057] cursor-pointer w-2.5 h-2.5 shrink-0"
          />
          <div className="shrink-0">{getEntityIcon(ent.type)}</div>
          <div className="min-w-0">
            <p className={`text-[11px] truncate font-serif font-bold leading-tight ${isActive ? 'text-[#1B2A4A] dark:text-[#F3EFE8]' : 'text-stone-800 dark:text-stone-200'}`}>
              {ent.title}
            </p>
            <div className="flex items-center gap-1 text-[8px] font-mono text-stone-400">
              <span className="uppercase">{ent.type}</span>
              {ent.status && (
                <>
                  <span>·</span>
                  <span className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 capitalize">{ent.status}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inline Deletion */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          {isDeleting ? (
            <button
              onClick={async () => {
                await onDeleteItem(ent.id);
                if (isActive) onSelectItem(null);
                setDeleteConfirmId(null);
              }}
              className="text-[8px] font-mono font-bold bg-red-600 text-white px-1 py-0.2 rounded animate-pulse"
            >
              Sil
            </button>
          ) : (
            <button
              onClick={() => setDeleteConfirmId(ent.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-red-500 rounded transition-all cursor-pointer"
              title="Sil"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#FAF9F5] dark:bg-[#11224A]/40 border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl overflow-hidden shadow-xs transition-all duration-300 font-sans">
      
      {/* Collapsible Header */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#F4EFE6] dark:bg-[#1C2C5E] border-b border-[#CFC5B4]/55 dark:border-[#2C3C72] text-left hover:bg-[#EAE4D7] dark:hover:bg-[#253975] transition-all cursor-pointer"
      >
        <span className="text-[11px] font-mono font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-[#D35057]" /> Düzada Dizinleri
        </span>
        {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-[#6A5E4C]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#6A5E4C]" />}
      </button>

      {/* Directory Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0 pointer-events-none hidden' : 'p-3 space-y-3'}`}>
        
        {/* Actions header (Add new) */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 font-bold uppercase">
            Sakinler &amp; Mekanlar
          </span>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-0.5 text-[10px] font-mono px-2 py-1 bg-[#D35057] text-white rounded hover:bg-[#B23A40] transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Yeni Madde
          </button>
        </div>

        {/* Quick Entity Creation Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateEntity} className="p-2.5 bg-[#F1EADF] dark:bg-[#1A2E65] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg space-y-2 text-xs">
            <div>
              <label className="block text-[9px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">
                Madde Adı / Başlık *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Kamil Efendi, Han"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded p-1 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">
                Varlık Türü
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ItemType)}
                className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded p-1 focus:outline-hidden"
              >
                <option value="kisi">Kişi / Sakin</option>
                <option value="marka">Marka / Kulüp</option>
                <option value="mekân">Mekân / İşletme</option>
                <option value="yer">Yer / Coğrafi Nokta</option>
                <option value="olay">Olay / Tarih (Lore)</option>
                <option value="ürün">Ürün / Drop</option>
              </select>
            </div>

            <div className="flex justify-end gap-1.5 text-[9px] font-mono pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-2 py-0.5 border border-[#CFC5B4] rounded hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-2.5 py-0.5 bg-[#D35057] text-white rounded hover:bg-[#B23A40]"
              >
                Oluştur
              </button>
            </div>
          </form>
        )}

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Maddelerde ara..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-hidden hover:border-[#D35057] focus:border-[#D35057] transition-all"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Categories Tab Row */}
        <div className="flex flex-wrap gap-1 border-b border-[#CFC5B4]/30 pb-2">
          {['Hepsi', 'Kişiler', 'Markalar', 'Mekânlar', 'Yerler', 'Olaylar', 'Ürünler', 'Odalar', 'Harita'].map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSubClassFilter('hepsi');
              }}
              className={`text-[9px] font-mono px-2 py-1 rounded transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-white font-bold' 
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub-classifications for Kişiler */}
        {selectedCategory === 'Kişiler' && (
          <div className="flex flex-wrap items-center gap-1 bg-[#FAF8F5] dark:bg-[#12224A]/20 p-1.5 rounded-lg border border-[#CFC5B4]/30">
            <span className="text-[9px] text-stone-500 font-mono font-bold uppercase mr-1">Sınıf:</span>
            {([
              { key: 'hepsi', label: 'Tümü' },
              { key: 'sakin', label: 'Ada Sakini' },
              { key: 'misafir', label: 'Otel Misafiri' },
              { key: 'personel', label: 'Otel Personeli' }
            ] as const).map(sub => (
              <button
                key={sub.key}
                onClick={() => setSubClassFilter(sub.key)}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  subClassFilter === sub.key
                    ? 'bg-[#D35057] text-white font-bold'
                    : 'bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 border border-[#CFC5B4]/20'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Sorting Control */}
        <div className="flex items-center justify-between gap-2 bg-[#FAF8F5]/50 dark:bg-stone-900/10 p-1 rounded">
          <span className="text-[9px] text-stone-400 font-mono">Sıralama:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-colors cursor-pointer ${
                sortBy === 'name' 
                  ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-white font-bold border-transparent' 
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
            >
              A-Z Sırala
            </button>
            <button
              onClick={() => setSortBy('completeness')}
              className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-colors cursor-pointer ${
                sortBy === 'completeness' 
                  ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-white font-bold border-transparent' 
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
            >
              Doluluğa Göre
            </button>
          </div>
        </div>

        {/* Bulk Selection Header */}
        <div className="bg-[#FAF8F5] dark:bg-[#12224A]/20 p-2 border border-[#CFC5B4]/30 rounded-lg space-y-1.5 text-[9px] font-mono">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="select_all_dir"
                checked={selectedEntityIds.length === filteredEntities.length && filteredEntities.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedEntityIds(filteredEntities.map(ent => ent.id));
                  } else {
                    setSelectedEntityIds([]);
                  }
                }}
                className="rounded text-[#D35057] focus:ring-[#D35057] cursor-pointer w-3 h-3"
              />
              <label htmlFor="select_all_dir" className="cursor-pointer select-none font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                Tümünü Seç ({filteredEntities.length})
              </label>
            </div>
            {selectedEntityIds.length > 0 && (
              <span className="text-[#D35057] font-bold">
                {selectedEntityIds.length} Seçili
              </span>
            )}
          </div>

          {/* Bulk Actions with Safe Confirmations */}
          {selectedEntityIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-[#CFC5B4]/20">
              {bulkDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      for (const id of selectedEntityIds) {
                        await onDeleteItem(id);
                      }
                      setSelectedEntityIds([]);
                      onSelectItem(null);
                      setBulkDeleteConfirm(false);
                    }}
                    className="bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse"
                  >
                    Kalıcı Sil?
                  </button>
                  <button onClick={() => setBulkDeleteConfirm(false)} className="bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded">Vazgeç</button>
                </div>
              ) : bulkArchiveConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      for (const id of selectedEntityIds) {
                        const ent = entities.find(e => e.id === id);
                        if (ent) {
                          await onUpdateItem({ ...ent, archived: true });
                        }
                      }
                      setSelectedEntityIds([]);
                      onSelectItem(null);
                      setBulkArchiveConfirm(false);
                    }}
                    className="bg-amber-600 text-white px-2 py-0.5 rounded font-bold"
                  >
                    Arşivle?
                  </button>
                  <button onClick={() => setBulkArchiveConfirm(false)} className="bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded">Vazgeç</button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-0.5 rounded border border-red-200 transition-all font-bold"
                  >
                    Sil
                  </button>
                  <button
                    onClick={() => setBulkArchiveConfirm(true)}
                    className="bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white px-2 py-0.5 rounded border border-amber-200 transition-all font-bold"
                  >
                    Arşivle
                  </button>
                  <button
                    onClick={async () => {
                      const newStatus = prompt("Yeni durum ne olsun? (örn: Taslak, Geliştiriliyor, Bitti, Yayınlandı):");
                      if (newStatus !== null) {
                        for (const id of selectedEntityIds) {
                          const ent = entities.find(e => e.id === id);
                          if (ent) {
                            await onUpdateItem({ ...ent, status: newStatus });
                          }
                        }
                        setSelectedEntityIds([]);
                      }
                    }}
                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-2 py-0.5 rounded border border-indigo-200 transition-all font-bold"
                  >
                    Durum Değiştir
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Grouped & Collapsible List Container */}
        <div className="max-h-[480px] overflow-y-auto space-y-3.5 pr-1 font-serif select-none">
          
          {/* GROUP 1: MAHALLELER & NESTING */}
          {(selectedCategory === 'Hepsi' || selectedCategory === 'Yerler') && (
            <div className="space-y-1.5">
              <button
                onClick={() => setExpandedGroups(prev => ({ ...prev, mahalleler: !prev.mahalleler }))}
                className="w-full flex items-center justify-between py-1 px-1.5 bg-[#F4EFE6] dark:bg-[#1A2E65]/50 hover:bg-[#EAE4D7] dark:hover:bg-[#1A2E65] rounded text-left text-[11px] font-mono font-bold text-[#6A5E4C] dark:text-[#A6B0C9] transition-all cursor-pointer border border-[#CFC5B4]/30"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-[#D35057]" />
                  Mahalleler &amp; Sokaklar ({defaultMahalleler.length})
                </span>
                {expandedGroups.mahalleler ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {expandedGroups.mahalleler && (
                <div className="space-y-2.5 pl-1.5 border-l border-dashed border-[#CFC5B4]/50 dark:border-stone-800">
                  {defaultMahalleler.map(mah => {
                    const mahItem = findMahalleItem(mah.id);
                    const isMahExpanded = expandedMahalles[mah.id] || showAllOnSearch;
                    const isMahActive = mahItem && activeItemId === mahItem.id;

                    const streetList = defaultSokaklar.filter(s => s.mahalleId === mah.id);
                    const unassignedMekans = entities.filter(ent => 
                      (ent.type === 'mekân' || ent.type === 'dükkân') && 
                      !isRoomItem(ent) &&
                      (ent.metadata?.region === mah.id || (ent.metadata?.region === 'eski liman / kemskoy' && mah.id === 'eski_liman')) && 
                      !ent.metadata?.sokakId
                    );

                    return (
                      <div key={mah.id} className="space-y-1">
                        {/* Mahalle Row */}
                        <div className="flex items-center gap-1.5 py-0.5">
                          <button
                            onClick={() => setExpandedMahalles(prev => ({ ...prev, [mah.id]: !prev[mah.id] }))}
                            className="p-0.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-stone-500 shrink-0 cursor-pointer"
                          >
                            {isMahExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                          </button>
                          
                          <div 
                            onClick={() => {
                              if (mahItem) {
                                onSelectItem(mahItem.id);
                              } else {
                                setExpandedMahalles(prev => ({ ...prev, [mah.id]: !prev[mah.id] }));
                              }
                            }}
                            className={`text-[11px] font-bold font-serif cursor-pointer hover:underline flex-1 truncate ${
                              isMahActive ? 'text-[#D35057] underline' : 'text-[#1B2A4A] dark:text-[#F3EFE8]'
                            }`}
                          >
                            📍 {mah.name} Bölgesi
                          </div>
                          <span className="text-[8px] font-mono text-stone-400 shrink-0">({streetList.length} Sokak)</span>
                        </div>

                        {/* Indented Sokaklar & Mekanlar */}
                        {isMahExpanded && (
                          <div className="pl-3.5 space-y-1.5 border-l border-[#CFC5B4]/40 dark:border-stone-800/40">
                            {/* Listed Streets */}
                            {streetList.map(sok => {
                              const isSokExpanded = expandedSokaklar[sok.id] || showAllOnSearch;
                              const streetMekans = entities.filter(ent => 
                                (ent.type === 'mekân' || ent.type === 'dükkân') && 
                                !isRoomItem(ent) &&
                                ent.metadata?.sokakId === sok.id
                              );

                              if (showAllOnSearch && streetMekans.length === 0) return null;

                              return (
                                <div key={sok.id} className="space-y-1">
                                  {/* Street Row */}
                                  <div className="flex items-center gap-1 py-0.5">
                                    <button
                                      onClick={() => setExpandedSokaklar(prev => ({ ...prev, [sok.id]: !prev[sok.id] }))}
                                      className="p-0.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-stone-400 shrink-0 cursor-pointer"
                                    >
                                      {isSokExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                                    </button>
                                    <span className="text-[10px] font-serif font-bold text-stone-600 dark:text-stone-300 flex-1 truncate">
                                      🛣️ {sok.name}
                                    </span>
                                    <span className="text-[8px] font-mono text-stone-400 shrink-0">({streetMekans.length})</span>
                                  </div>

                                  {/* Street Mekanlar */}
                                  {isSokExpanded && (
                                    <div className="pl-3 space-y-1 border-l border-stone-200 dark:border-stone-800">
                                      {streetMekans.map(mekan => {
                                        const isHotel = mekan.id === 'kemskoy_hotel' || mekan.title === 'The Imperial Kemskøy';
                                        
                                        return (
                                          <div key={mekan.id} className="space-y-1">
                                            {renderEntityRow(mekan, 0)}
                                            
                                            {/* Nest Rooms only inside the hotel */}
                                            {isHotel && (
                                              <div className="pl-3.5 space-y-0.5">
                                                <button
                                                  onClick={() => setExpandedGroups(prev => ({ ...prev, hotelRooms: !prev.hotelRooms }))}
                                                  className="text-[9px] font-mono text-[#D35057] hover:underline flex items-center gap-1 py-0.5"
                                                >
                                                  {expandedGroups.hotelRooms ? '▼ Odaları Gizle' : '▶ Otel Odalarını Göster'}
                                                </button>
                                                {expandedGroups.hotelRooms && (
                                                  <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-stone-50 dark:bg-black/10 rounded border border-stone-200/50 dark:border-stone-800/50">
                                                    {items.filter(i => isRoomItem(i) && (i.links?.includes(mekan.id) || i.metadata?.placeId === mekan.id))
                                                          .sort((a,b) => a.title.localeCompare(b.title))
                                                          .map(room => (
                                                            <div
                                                              key={room.id}
                                                              onClick={() => onSelectItem(room.id)}
                                                              className={`text-[9px] p-1 rounded border text-center transition-all truncate cursor-pointer ${
                                                                activeItemId === room.id 
                                                                  ? 'bg-[#EAE4D7] dark:bg-[#1A2E65] border-[#D35057] font-bold text-[#D35057]'
                                                                  : 'bg-white dark:bg-[#13204A]/30 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                                                              }`}
                                                            >
                                                              🔑 {room.title}
                                                            </div>
                                                          ))}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Unassigned Mekanlar in this District */}
                            {unassignedMekans.map(mekan => (
                              <div key={mekan.id} className="pl-4">
                                {renderEntityRow(mekan, 0)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GROUP 2: MEKANLAR */}
          {(selectedCategory === 'Hepsi' || selectedCategory === 'Mekânlar') && (
            <div className="space-y-1.5">
              <button
                onClick={() => setExpandedGroups(prev => ({ ...prev, mekanlar: !prev.mekanlar }))}
                className="w-full flex items-center justify-between py-1 px-1.5 bg-[#F4EFE6] dark:bg-[#1A2E65]/50 hover:bg-[#EAE4D7] dark:hover:bg-[#1A2E65] rounded text-left text-[11px] font-mono font-bold text-[#6A5E4C] dark:text-[#A6B0C9] transition-all cursor-pointer border border-[#CFC5B4]/30"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5 text-rose-500" />
                  Mekânlar &amp; İşletmeler ({mekanGroup.length})
                </span>
                {expandedGroups.mekanlar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {expandedGroups.mekanlar && (
                <div className="space-y-1 pl-1">
                  {mekanGroup.map(ent => renderEntityRow(ent, 0))}
                  {mekanGroup.length === 0 && (
                    <div className="text-[10px] text-stone-400 italic pl-3">Mekân bulunmuyor.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GROUP 3: KISILER & MARKALAR */}
          {(selectedCategory === 'Hepsi' || selectedCategory === 'Kişiler' || selectedCategory === 'Markalar') && (
            <div className="space-y-1.5">
              <button
                onClick={() => setExpandedGroups(prev => ({ ...prev, kisiler: !prev.kisiler }))}
                className="w-full flex items-center justify-between py-1 px-1.5 bg-[#F4EFE6] dark:bg-[#1A2E65]/50 hover:bg-[#EAE4D7] dark:hover:bg-[#1A2E65] rounded text-left text-[11px] font-mono font-bold text-[#6A5E4C] dark:text-[#A6B0C9] transition-all cursor-pointer border border-[#CFC5B4]/30"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  Sakinler, Karakterler &amp; Markalar ({kisilerGroup.length})
                </span>
                {expandedGroups.kisiler ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {expandedGroups.kisiler && (
                <div className="space-y-1 pl-1">
                  {kisilerGroup.map(ent => renderEntityRow(ent, 0))}
                  {kisilerGroup.length === 0 && (
                    <div className="text-[10px] text-stone-400 italic pl-3">Kişi veya marka bulunmuyor.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GROUP 4: OLAYLAR */}
          {(selectedCategory === 'Hepsi' || selectedCategory === 'Olaylar') && (
            <div className="space-y-1.5">
              <button
                onClick={() => setExpandedGroups(prev => ({ ...prev, olaylar: !prev.olaylar }))}
                className="w-full flex items-center justify-between py-1 px-1.5 bg-[#F4EFE6] dark:bg-[#1A2E65]/50 hover:bg-[#EAE4D7] dark:hover:bg-[#1A2E65] rounded text-left text-[11px] font-mono font-bold text-[#6A5E4C] dark:text-[#A6B0C9] transition-all cursor-pointer border border-[#CFC5B4]/30"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  Tarihi Olaylar &amp; Lore ({olaylarGroup.length})
                </span>
                {expandedGroups.olaylar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {expandedGroups.olaylar && (
                <div className="space-y-1 pl-1">
                  {olaylarGroup.map(ent => renderEntityRow(ent, 0))}
                  {olaylarGroup.length === 0 && (
                    <div className="text-[10px] text-stone-400 italic pl-3">Olay bulunmuyor.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GROUP 5: URUNLER */}
          {(selectedCategory === 'Hepsi' || selectedCategory === 'Ürünler') && (
            <div className="space-y-1.5">
              <button
                onClick={() => setExpandedGroups(prev => ({ ...prev, urunler: !prev.urunler }))}
                className="w-full flex items-center justify-between py-1 px-1.5 bg-[#F4EFE6] dark:bg-[#1A2E65]/50 hover:bg-[#EAE4D7] dark:hover:bg-[#1A2E65] rounded text-left text-[11px] font-mono font-bold text-[#6A5E4C] dark:text-[#A6B0C9] transition-all cursor-pointer border border-[#CFC5B4]/30"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Ürünler &amp; Drops ({urunlerGroup.length})
                </span>
                {expandedGroups.urunler ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {expandedGroups.urunler && (
                <div className="space-y-1 pl-1">
                  {urunlerGroup.map(ent => renderEntityRow(ent, 0))}
                  {urunlerGroup.length === 0 && (
                    <div className="text-[10px] text-stone-400 italic pl-3">Ürün bulunmuyor.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GROUP 6: ODALAR */}
          {(selectedCategory === 'Odalar') && (
            <div className="space-y-1.5">
              <div className="bg-[#FAF8F5] dark:bg-[#12224A]/20 p-2 border border-[#CFC5B4]/30 rounded-lg text-xs">
                <span className="font-serif font-bold text-[#1B2A4A] dark:text-white">🔑 Imperial Odaları</span>
                <p className="text-[10px] text-stone-500 font-sans mt-0.5">The Imperial Kemskøy bünyesindeki tüm odalar.</p>
              </div>
              <div className="space-y-1 pl-1">
                {sortedEntities.map(ent => renderEntityRow(ent, 0))}
                {sortedEntities.length === 0 && (
                  <div className="text-[10px] text-stone-400 italic pl-3">Oda bulunmuyor.</div>
                )}
              </div>
            </div>
          )}

          {/* GROUP 7: HARITA ETIKETLERI */}
          {(selectedCategory === 'Harita') && (
            <div className="space-y-1.5">
              <div className="bg-[#FAF8F5] dark:bg-[#12224A]/20 p-2 border border-[#CFC5B4]/30 rounded-lg text-xs">
                <span className="font-serif font-bold text-[#1B2A4A] dark:text-white">🗺️ Harita Etiketleri</span>
                <p className="text-[10px] text-stone-500 font-sans mt-0.5">Harita üzerindeki görsel pinler ve işaretçiler.</p>
              </div>
              <div className="space-y-1 pl-1">
                {sortedEntities.map(ent => renderEntityRow(ent, 0))}
                {sortedEntities.length === 0 && (
                  <div className="text-[10px] text-stone-400 italic pl-3">Harita etiketi bulunmuyor.</div>
                )}
              </div>
            </div>
          )}

          {filteredEntities.length === 0 && (
            <div className="text-center py-6 text-stone-400 italic text-[11px]">
              Kriterlere uygun madde bulunamadı.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
