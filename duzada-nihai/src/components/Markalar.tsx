import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit3, 
  PlusCircle, 
  Palette, 
  Type, 
  Briefcase, 
  Users, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  X,
  Upload,
  Layers,
  ArrowRight,
  Search
} from 'lucide-react';
import { Item, ItemType, BrandKit, AreaType, WikiSection } from '../types';
import { compressImageBase64 } from '../lib/imageCompressor';
import { resolveAllRelations, cleanupRelationsOnDelete } from '../utils/relations';
import ConsistencyChecker from './ConsistencyChecker';

interface MarkalarProps {
  items: Item[];
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onSelectArea: (area: AreaType, itemId?: string) => void;
}

export default function Markalar({
  items,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSelectArea
}: MarkalarProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Brand creation states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBrandTitle, setNewBrandTitle] = useState('');
  const [newBrandNotes, setNewBrandNotes] = useState('');
  
  // Selected Brand state edits
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editBrandTitle, setEditBrandTitle] = useState('');
  const [editBrandNotes, setEditBrandNotes] = useState('');

  // Deep Brand Kit edit states (for draft/temp editing)
  const [editSlogan, setEditSlogan] = useState('');
  const [editVoiceTone, setEditVoiceTone] = useState('');
  const [editSelectedFont, setEditSelectedFont] = useState('Inter');
  const [editLogoBase64, setEditLogoBase64] = useState('');
  const [editSelectedLogo, setEditSelectedLogo] = useState('');
  const [editIdeaLogos, setEditIdeaLogos] = useState<string[]>([]);
  const [editColorPalette, setEditColorPalette] = useState<string[]>([]);
  const [editExexemplaryWorks, setEditExexemplaryWorks] = useState<string[]>([]);
  const [editAtmosphereMoodboard, setEditAtmosphereMoodboard] = useState<string[]>([]);
  const [editUsageRulesDo, setEditUsageRulesDo] = useState<string[]>([]);
  const [editUsageRulesDont, setEditUsageRulesDont] = useState<string[]>([]);
  const [newDoRule, setNewDoRule] = useState('');
  const [newDontRule, setNewDontRule] = useState('');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Brand Kit input states
  const [newColor, setNewColor] = useState('#1B2A4A');
  const [newExemplar, setNewExemplar] = useState('');
  const [newLogoDescription, setNewLogoDescription] = useState('');

  // Child entity creation modal/form
  const [showAddEntityForm, setShowAddEntityForm] = useState<ItemType | null>(null);
  const [newEntityTitle, setNewEntityTitle] = useState('');
  const [newEntityNotes, setNewEntityNotes] = useState('');
  const [newEntityPlaceId, setNewEntityPlaceId] = useState(''); // optionally belong to a place
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Helper to open the add entity interface
  const handleOpenAddEntity = (type: ItemType) => {
    setSearchQuery('');
    setIsCreatingNew(false);
    setShowAddEntityForm(type);
  };
  
  // Merch creation form state
  const [showMerchForm, setShowMerchForm] = useState(false);
  const [newThemeTitle, setNewThemeTitle] = useState('');
  const [newThemeNotes, setNewThemeNotes] = useState('');

  // AI Recommendation loading
  const [aiGeneratingColors, setAiGeneratingColors] = useState(false);

  // Compute Brands list
  const brands = useMemo(() => {
    return items.filter(i => i.type === 'marka' && !i.archived);
  }, [items]);

  // If no selectedBrandId, default to first brand, or null
  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null) || null;

  const isUnassignedSelected = activeBrandId === 'unassigned';

  const activeBrand = useMemo(() => {
    if (activeBrandId === 'unassigned') {
      return {
        id: 'unassigned',
        title: 'Bağımsız / Markasız Varlıklar',
        area: 'duzada',
        type: 'marka',
        status: 'Bitti',
        priority: 'orta',
        tags: [],
        links: [],
        notes: 'Herhangi bir markaya bağlı olmayan, bağımsız dünya varlıkları (karakterler, mekânlar, olaylar, taslaklar vb.). Bu varlıkları detay sayfasından veya listedeki seçim kutularından istediğiniz markaya bağlayabilirsiniz.',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {}
      } as Item;
    }
    if (!activeBrandId) return null;
    return brands.find(b => b.id === activeBrandId) || null;
  }, [activeBrandId, brands]);

  // Get existing entities of the chosen type that are not currently linked to this brand
  const existingEntitiesToLink = useMemo(() => {
    if (!showAddEntityForm || !activeBrandId) return [];
    
    let candidateTypes: string[] = [];
    if (showAddEntityForm === 'kisi') {
      candidateTypes = ['kisi', 'karakter'];
    } else if (showAddEntityForm === 'yer') {
      candidateTypes = ['yer', 'mekân', 'dükkân', 'oda'];
    } else {
      candidateTypes = [showAddEntityForm];
    }

    return items.filter(i => 
      !i.archived && 
      candidateTypes.includes(i.type) && 
      i.metadata?.brandId !== activeBrandId
    );
  }, [items, showAddEntityForm, activeBrandId]);

  // Filter existing entities by search query
  const filteredExistingEntities = useMemo(() => {
    if (!searchQuery.trim()) return existingEntitiesToLink;
    const query = searchQuery.toLowerCase();
    return existingEntitiesToLink.filter(i => 
      i.title.toLowerCase().includes(query) || 
      (i.notes && i.notes.toLowerCase().includes(query)) ||
      (i.tags && i.tags.some(t => t.toLowerCase().includes(query)))
    );
  }, [existingEntitiesToLink, searchQuery]);

  // Handle linking an existing entity to the brand (two-way)
  const handleLinkExistingEntity = async (entity: Item) => {
    if (!activeBrandId) return;
    const updated = {
      ...entity,
      metadata: {
        ...entity.metadata,
        brandId: activeBrandId === 'unassigned' ? undefined : activeBrandId
      }
    };
    await onUpdateItem(updated);
    setSearchQuery('');
    setShowAddEntityForm(null);
    setIsCreatingNew(false);
  };

  // Get children entities (Kişiler, Yerler, Olaylar) belonging to activeBrand
  const brandKisiler = useMemo(() => {
    return items.filter(i => 
      !i.archived && 
      (i.type === 'kisi' || i.type === 'karakter') && 
      (isUnassignedSelected ? !i.metadata?.brandId : i.metadata?.brandId === activeBrandId)
    );
  }, [items, activeBrandId, isUnassignedSelected]);

  const brandYerler = useMemo(() => {
    return items.filter(i => 
      !i.archived && 
      (i.type === 'yer' || i.type === 'mekân' || i.type === 'dükkân') && 
      (isUnassignedSelected ? !i.metadata?.brandId : i.metadata?.brandId === activeBrandId)
    );
  }, [items, activeBrandId, isUnassignedSelected]);

  const brandOlaylar = useMemo(() => {
    return items.filter(i => 
      !i.archived && 
      i.type === 'olay' && 
      (isUnassignedSelected ? !i.metadata?.brandId : i.metadata?.brandId === activeBrandId)
    );
  }, [items, activeBrandId, isUnassignedSelected]);

  // Merch items for this brand:
  // Temalar belonging to this brand (metadata.brandId === activeBrandId)
  const brandTemalar = useMemo(() => {
    return items.filter(i => 
      !i.archived && 
      i.type === 'tema' && 
      (isUnassignedSelected ? !i.metadata?.brandId : i.metadata?.brandId === activeBrandId)
    );
  }, [items, activeBrandId, isUnassignedSelected]);

  // Drops for this brand:
  // We can find drops whose parent Tema belongs to this brand
  const brandDroplar = useMemo(() => {
    const temaIds = brandTemalar.map(t => t.id);
    return items.filter(i => 
      !i.archived && 
      i.type === 'drop' && 
      (isUnassignedSelected 
        ? (!i.metadata?.brandId && !temaIds.includes(i.metadata?.themeId || ''))
        : (i.metadata?.brandId === activeBrandId || temaIds.includes(i.metadata?.themeId || ''))
      )
    );
  }, [items, activeBrandId, brandTemalar, isUnassignedSelected]);

  // Products for this brand:
  const brandUrunler = useMemo(() => {
    const dropIds = brandDroplar.map(d => d.id);
    return items.filter(i => 
      !i.archived && 
      i.type === 'merch_urun' && 
      (isUnassignedSelected
        ? (!i.metadata?.brandId && !dropIds.includes(i.metadata?.dropId || ''))
        : (i.metadata?.brandId === activeBrandId || dropIds.includes(i.metadata?.dropId || ''))
      )
    );
  }, [items, activeBrandId, brandDroplar, isUnassignedSelected]);

  // Create a brand
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandTitle.trim()) return;

    const id = `marka_${Date.now()}`;
    const newBrand: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      title: newBrandTitle,
      area: 'duzada',
      type: 'marka',
      status: 'Fikir',
      priority: 'orta',
      tags: ['marka', 'brand'],
      links: [],
      notes: newBrandNotes,
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        brandKit: {
          selectedLogo: '',
          ideaLogos: [],
          colorPalette: ['#1B2A4A', '#D35057'],
          exemplaryWorks: [],
          selectedFont: 'Inter'
        }
      }
    };

    await onAddItem(newBrand);
    setNewBrandTitle('');
    setNewBrandNotes('');
    setShowCreateForm(false);
    setSelectedBrandId(id);
    alert('Yeni Marka başarıyla oluşturuldu!');
  };

  // Add child entity (Kişi, Yer, Olay)
  const handleAddChildEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityTitle.trim() || !showAddEntityForm || !activeBrandId) return;

    const id = `${showAddEntityForm}_${Date.now()}`;
    const newItem: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      title: newEntityTitle,
      area: 'duzada',
      type: showAddEntityForm,
      status: 'Fikir',
      priority: 'orta',
      tags: [showAddEntityForm],
      links: [],
      notes: newEntityNotes,
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        brandId: activeBrandId === 'unassigned' ? undefined : activeBrandId,
        placeId: newEntityPlaceId || undefined,
        wikiSections: [],
        haritaKonum: null,
        region: 'merkez'
      }
    };

    await onAddItem(newItem);
    setNewEntityTitle('');
    setNewEntityNotes('');
    setNewEntityPlaceId('');
    setShowAddEntityForm(null);
    alert(activeBrandId === 'unassigned' ? 'Yeni bağımsız varlık başarıyla oluşturuldu!' : 'Yeni varlık markaya bağlı olarak oluşturuldu!');
  };

  // Create Theme bound to Brand ("Merch yap" flow)
  const handleCreateBrandMerch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeTitle.trim() || !activeBrandId) return;

    const id = `merch_tema_${Date.now()}`;
    const itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      title: newThemeTitle,
      area: 'merch',
      type: 'tema',
      status: 'Çalışılıyor',
      priority: 'orta',
      tags: ['merch', 'tema'],
      links: [],
      notes: newThemeNotes,
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        brandId: activeBrandId,
        moodboard: []
      }
    };

    await onAddItem(itemData);
    setNewThemeTitle('');
    setNewThemeNotes('');
    setShowMerchForm(false);
    
    // Redirect to Merch Atölyesi
    onSelectArea('merch', id);
    alert('Marka kiti kullanılarak Tema oluşturuldu ve Merch Atölyesi\'ne yönlendirildiniz!');
  };

  // AI palette generation suggestion
  const handleAiColorPalette = async () => {
    if (!activeBrand) return;
    setAiGeneratingColors(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'logo-renk-cikar',
          data: {
            logoDescription: (isEditingBrand ? editBrandNotes : activeBrand.notes) || activeBrand.title
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        const colors: { hex: string, name: string }[] = JSON.parse(data.result);
        const palette = colors.map(c => c.hex);

        if (isEditingBrand) {
          setEditColorPalette(prev => Array.from(new Set([...prev, ...palette])));
          alert('AI renk önerileri düzenleme formuna eklendi!');
        } else {
          const currentKit = activeBrand.metadata?.brandKit || {
            selectedLogo: '',
            ideaLogos: [],
            colorPalette: [],
            exemplaryWorks: [],
            selectedFont: 'Inter'
          };
          await onUpdateItem({
            ...activeBrand,
            metadata: {
              ...activeBrand.metadata,
              brandKit: {
                ...currentKit,
                colorPalette: Array.from(new Set([...currentKit.colorPalette, ...palette]))
              }
            }
          });
          alert('AI renk önerileri marka kitine eklendi!');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGeneratingColors(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CFC5B4]">
        <div>
          <span className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9]">
            Markalar Şemsiyesi / Umbrella Brand Setup
          </span>
          <h1 className="font-serif font-bold text-2xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1">
            Yaratıcı Markalar & Kimlikler
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ConsistencyChecker 
            module="marka" 
            items={items} 
            onUpdateItem={onUpdateItem} 
            onAddItem={onAddItem}
            buttonClassName="flex items-center gap-1.5 text-xs font-mono px-3.5 py-2 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg cursor-pointer transition-all"
          />
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-2 bg-[#D35057] text-white rounded-lg hover:bg-[#B23A40] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Marka Oluştur</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT BAR: BRAND NAVIGATION */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl p-4 archive-shadow paper-grain space-y-3">
            <h3 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] font-bold">
              Markalar & Kimlikler ({brands.length})
            </h3>

            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {brands.map(b => {
                const isActive = b.id === activeBrandId;
                const logo = b.metadata?.brandKit?.logoBase64 || b.metadata?.brandKit?.selectedLogo;
                const hasLogo = !!(logo && (logo.startsWith('http') || logo.startsWith('data:')));
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBrandId(b.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isActive ? 'bg-[#E7EBE6] dark:bg-[#17345A] border-[#9DB0A4] dark:border-[#2C3C72] shadow-xs font-semibold' : 'bg-white dark:bg-[#112440] border-[#E3DCCF] dark:border-[#2C3C72]/30 hover:bg-stone-50'}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {hasLogo ? (
                        <img src={logo} alt="" className="w-5 h-5 rounded object-cover border border-stone-200 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-[#D35057] shrink-0" />
                      )}
                      <span className="text-xs text-[#1B2A4A] dark:text-[#F3EFE8] truncate">{b.title}</span>
                    </div>
                    {b.isProposal && (
                      <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-mono shrink-0">Öneri</span>
                    )}
                  </div>
                );
              })}

              {brands.length === 0 && (
                <div className="text-center py-6 text-[11px] text-stone-400 italic">
                  Henüz marka bulunmuyor.
                </div>
              )}
            </div>
          </div>

          {/* Bağımsız Varlıklar (Special Section) */}
          <div className="bg-[#FAF8F5] dark:bg-[#13204A]/60 border border-[#CFC5B4] dark:border-[#2C3C72]/60 rounded-xl p-4 archive-shadow paper-grain">
            <div
              onClick={() => setSelectedBrandId('unassigned')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${activeBrandId === 'unassigned' ? 'bg-[#E7EBE6] dark:bg-[#17345A] border-[#9DB0A4] dark:border-[#2C3C72] shadow-xs font-semibold' : 'bg-white dark:bg-[#112440] border-transparent hover:bg-stone-50'}`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-500" />
                <span className="text-xs text-[#1B2A4A] dark:text-[#F3EFE8]">Bağımsız Varlıklar</span>
              </div>
              <span className="text-[9px] font-mono text-stone-400 bg-stone-100 dark:bg-[#13204A] px-1.5 py-0.5 rounded-full">
                {items.filter(i => !i.archived && (i.type === 'kisi' || i.type === 'karakter' || i.type === 'yer' || i.type === 'mekân' || i.type === 'dükkân' || i.type === 'olay') && !i.metadata?.brandId).length}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE: DETAILED ACTIVE BRAND CONTAINER */}
        <div className="lg:col-span-3 space-y-6">
          {activeBrand ? (
            <div className="bg-[#E7EBE6] dark:bg-[#13204A] border-2 border-[#B9C7BD] dark:border-[#2C3C72] rounded-xl p-6 archive-shadow paper-grain space-y-6">
              
              {/* Brand Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-[#B9C7BD]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-[#1B2A4A] text-white px-2 py-0.5 rounded">
                      {activeBrand.id === 'unassigned' ? 'BAĞIMSIZ SÜREÇ' : 'MARKA / KİMLİK'}
                    </span>
                    {activeBrand.isProposal && (
                      <span className="text-[10px] font-mono bg-amber-500 text-white px-2 py-0.5 rounded animate-pulse">
                        ÖNERİ SÜRECİNDE
                      </span>
                    )}
                  </div>
                  
                  {isEditingBrand ? (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={editBrandTitle}
                        onChange={(e) => setEditBrandTitle(e.target.value)}
                        className="text-lg font-serif font-bold bg-white border border-[#B9C7BD] rounded px-2 py-1 focus:outline-hidden"
                      />
                    </div>
                  ) : (
                    <h2 className="font-serif font-bold text-2xl text-[#1B2A4A] dark:text-[#F3EFE8] tracking-tight">
                      {activeBrand.title}
                    </h2>
                  )}
                </div>

                {activeBrand.id !== 'unassigned' && (
                  <div className="flex items-center gap-2">
                    {/* Merch yap button directly bound to Brand Kit! */}
                    <button
                      onClick={() => setShowMerchForm(true)}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs px-3.5 py-2 rounded-lg cursor-pointer shadow-xs"
                      title="Bu markanın kitini kullanarak tema oluşturun"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Merch Yap</span>
                    </button>

                    {isEditingBrand ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            await onUpdateItem({
                              ...activeBrand,
                              title: editBrandTitle,
                              notes: editBrandNotes,
                              metadata: {
                                ...activeBrand.metadata,
                                brandKit: {
                                  slogan: editSlogan,
                                  voiceTone: editVoiceTone,
                                  selectedFont: editSelectedFont,
                                  logoBase64: editLogoBase64,
                                  selectedLogo: editSelectedLogo,
                                  ideaLogos: editIdeaLogos,
                                  colorPalette: editColorPalette,
                                  exemplaryWorks: editExexemplaryWorks,
                                  atmosphereMoodboard: editAtmosphereMoodboard,
                                  usageRulesDo: editUsageRulesDo,
                                  usageRulesDont: editUsageRulesDont
                                }
                              }
                            });
                            setIsEditingBrand(false);
                          }}
                          className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-mono rounded-lg hover:bg-indigo-700 cursor-pointer shadow-xs"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setIsEditingBrand(false)}
                          className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-mono rounded-lg cursor-pointer"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsEditingBrand(true);
                          setEditBrandTitle(activeBrand.title);
                          setEditBrandNotes(activeBrand.notes || '');
                          
                          // Populate deep brand kit fields
                          const bk = activeBrand.metadata?.brandKit || {};
                          setEditSlogan(bk.slogan || '');
                          setEditVoiceTone(bk.voiceTone || '');
                          setEditSelectedFont(bk.selectedFont || 'Inter');
                          setEditLogoBase64(bk.logoBase64 || '');
                          setEditSelectedLogo(bk.selectedLogo || '');
                          setEditIdeaLogos(bk.ideaLogos || []);
                          setEditColorPalette(bk.colorPalette || []);
                          setEditExexemplaryWorks(bk.exemplaryWorks || []);
                          setEditAtmosphereMoodboard(bk.atmosphereMoodboard || []);
                          setEditUsageRulesDo(bk.usageRulesDo || []);
                          setEditUsageRulesDont(bk.usageRulesDont || []);
                        }}
                        className="p-2 bg-white dark:bg-[#17345A] border border-[#B9C7BD] rounded-lg hover:text-[#D35057] transition-all cursor-pointer"
                        title="Tüm Marka Kılavuzunu Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {activeBrand.id !== 'kems_company' && (
                      <button
                        onClick={async () => {
                          if (deleteConfirmId === activeBrand.id) {
                            const activeRelations = resolveAllRelations(activeBrand, items);
                            if (activeRelations.length > 0) {
                              const proceed = window.confirm(`"${activeBrand.title}" markası ${activeRelations.length} diğer varlığa doğrudan bağlıdır. Markayı sildiğinizde bu bağlantılar da kesilecektir. Devam etmek istiyor musunuz?`);
                              if (!proceed) return;
                            }
                            await cleanupRelationsOnDelete(activeBrand.id, items, onUpdateItem);
                            await onDeleteItem(activeBrand.id);
                            setSelectedBrandId(null);
                            setDeleteConfirmId(null);
                          } else {
                            setDeleteConfirmId(activeBrand.id);
                            setTimeout(() => setDeleteConfirmId(prev => prev === activeBrand.id ? null : prev), 4000);
                          }
                        }}
                        className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-mono ${
                          deleteConfirmId === activeBrand.id
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'
                        }`}
                        title="Markayı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteConfirmId === activeBrand.id && 'Emin misiniz?'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Brand Proposals Flow Actions */}
              {activeBrand.isProposal && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <span className="text-amber-800 dark:text-amber-300">
                    ⚠️ Bu marka henüz taslak / öneri aşamasındadır. Resmi onay vererek kiti aktifleştirin.
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await onUpdateItem({ ...activeBrand, isProposal: false, status: 'Bitti' });
                        alert('Marka resmileştirildi ve onaylandı!');
                      }}
                      className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                    >
                      Resmileştir / Onayla
                    </button>
                    <button
                      onClick={async () => {
                        if (deleteConfirmId === `proposal_${activeBrand.id}`) {
                          await cleanupRelationsOnDelete(activeBrand.id, items, onUpdateItem);
                          await onDeleteItem(activeBrand.id);
                          setSelectedBrandId(null);
                          setDeleteConfirmId(null);
                        } else {
                          setDeleteConfirmId(`proposal_${activeBrand.id}`);
                          setTimeout(() => setDeleteConfirmId(prev => prev === `proposal_${activeBrand.id}` ? null : prev), 4000);
                        }
                      }}
                      className={`px-3 py-1 rounded cursor-pointer ${
                        deleteConfirmId === `proposal_${activeBrand.id}`
                          ? 'bg-red-600 text-white animate-pulse font-bold'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {deleteConfirmId === `proposal_${activeBrand.id}` ? '⚠️ Emin misiniz?' : 'Reddet ve Sil'}
                    </button>
                  </div>
                </div>
              )}


              {/* MARKA KİTİ (Brand Kit) */}
              {activeBrand.id !== 'unassigned' && (() => {
                const bk = activeBrand.metadata?.brandKit || {
                  selectedLogo: '',
                  ideaLogos: [],
                  colorPalette: [],
                  exemplaryWorks: [],
                  selectedFont: 'Inter',
                  voiceTone: '',
                  atmosphereMoodboard: [],
                  usageRulesDo: [],
                  usageRulesDont: [],
                  slogan: ''
                };

                const fontMap: Record<string, string> = {
                  'Inter': '"Inter", sans-serif',
                  'Space Grotesk': '"Space Grotesk", sans-serif',
                  'Playfair Display': '"Playfair Display", serif',
                  'JetBrains Mono': '"JetBrains Mono", monospace',
                  'Outfit': '"Outfit", sans-serif'
                };

                const activeFont = fontMap[bk.selectedFont || 'Inter'] || '"Inter", sans-serif';

                return (
                  <div className="bg-white dark:bg-[#13204A]/60 border border-[#B9C7BD] dark:border-[#2C3C72] p-6 rounded-xl space-y-6">
                    
                    {/* Slogan Banner */}
                    {!isEditingBrand ? (
                      <div 
                        onClick={() => {
                          if (!bk.slogan) {
                            setIsEditingBrand(true);
                            setEditSlogan('');
                          }
                        }}
                        className={`text-center py-4 border-b border-stone-100 dark:border-stone-800 cursor-pointer group transition-all`}
                      >
                        {bk.slogan ? (
                          <p className="font-serif italic text-lg text-[#D35057] transition-all group-hover:scale-[1.02]">
                            “{bk.slogan}”
                          </p>
                        ) : (
                          <span className="text-[10px] font-mono text-stone-400 group-hover:text-[#D35057] transition-colors flex items-center justify-center gap-1">
                            ✨ Slogan / Manifesto Ekle
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 pb-4 border-b border-stone-100">
                        <label className="block text-[10px] font-mono text-stone-500 uppercase">
                          Slogan / Manifesto / Misyon
                        </label>
                        <input
                          type="text"
                          value={editSlogan}
                          onChange={(e) => setEditSlogan(e.target.value)}
                          placeholder="Markanın felsefesini özetleyen çarpıcı bir slogan..."
                          className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 rounded p-2 focus:outline-hidden focus:border-[#D35057]"
                        />
                      </div>
                    )}

                    {/* TWO-COLUMN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* LEFT COLUMN */}
                      <div className="space-y-6">
                        
                        {/* 1. LOGO & EMBLEM GUIDE */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                            1. Logolar ve Amblemler
                          </h4>
                          
                          {!isEditingBrand ? (
                            <div className="space-y-4">
                              {/* Main Logo Card */}
                              <div className="p-4 bg-stone-50 dark:bg-[#112440]/30 border border-stone-200/60 dark:border-[#2C3C72]/40 rounded-xl flex flex-col items-center justify-center min-h-[160px] relative group overflow-hidden">
                                {bk.logoBase64 || (bk.selectedLogo && (bk.selectedLogo.startsWith('http') || bk.selectedLogo.startsWith('data:'))) ? (
                                  <div className="max-w-[120px] max-h-[120px] flex items-center justify-center">
                                    <img
                                      src={bk.logoBase64 || bk.selectedLogo}
                                      alt="Seçilen Logo"
                                      className="max-w-full max-h-full object-contain pointer-events-none select-none"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-center space-y-1.5 text-stone-400">
                                    <Upload className="w-8 h-8 mx-auto stroke-1" />
                                    <span className="text-[11px] block font-sans">Henüz seçilen logo bulunmuyor.</span>
                                  </div>
                                )}
                                <span className="absolute bottom-2 left-2 text-[8px] font-mono text-stone-400 uppercase tracking-widest bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded">
                                  Resmi Amblem
                                </span>
                              </div>

                              {/* Idea Logos strip */}
                              <div className="space-y-1.5">
                                <span className="block text-[9px] font-mono uppercase tracking-widest text-stone-400">
                                  Alternatif Fikir Logoları
                                </span>
                                <div className="flex gap-2.5 overflow-x-auto pb-1">
                                  {(bk.ideaLogos || []).map((idea, idx) => (
                                    <div 
                                      key={idx} 
                                      className="w-14 h-14 bg-stone-50 border border-stone-200 rounded flex items-center justify-center shrink-0 relative group/idea cursor-pointer overflow-hidden hover:border-[#D35057]"
                                      title="Ana logo olarak kullan"
                                      onClick={async () => {
                                        const proceed = window.confirm('Bu alternatif tasarımı resmi marka amblemi olarak atamak istiyor musunuz?');
                                        if (proceed) {
                                          await onUpdateItem({
                                            ...activeBrand,
                                            metadata: {
                                              ...activeBrand.metadata,
                                              brandKit: {
                                                ...bk,
                                                logoBase64: idea
                                              }
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <img src={idea} alt={`Fikir ${idx+1}`} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover/idea:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-mono uppercase text-center font-bold">
                                        Seç
                                      </div>
                                    </div>
                                  ))}
                                  {(bk.ideaLogos || []).length === 0 && (
                                    <span className="text-[10px] text-stone-400 italic font-sans py-1">Alternatif tasarım taslağı bulunmuyor.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 bg-stone-50 dark:bg-[#112440]/30 p-4 border border-stone-200 rounded-xl">
                              
                              {/* Main logo inputs */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-mono text-stone-500 uppercase font-bold">
                                  Resmi Amblem Seçin
                                </label>
                                <div className="flex items-center gap-3">
                                  {editLogoBase64 ? (
                                    <div className="w-14 h-14 bg-white border border-stone-300 rounded flex items-center justify-center shrink-0 relative group">
                                      <img src={editLogoBase64} alt="Önizleme" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                      <button
                                        type="button"
                                        onClick={() => setEditLogoBase64('')}
                                        className="absolute inset-0 bg-red-600/80 text-white text-[9px] font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                      >
                                        Kaldır
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-14 h-14 bg-stone-100 border border-dashed border-stone-300 rounded flex items-center justify-center shrink-0 text-stone-400 text-xs">
                                      Boş
                                    </div>
                                  )}
                                  <div className="flex-1 space-y-1">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = async (evt) => {
                                          if (evt.target?.result) {
                                            const base64 = evt.target.result as string;
                                            const comp = await compressImageBase64(base64);
                                            setEditLogoBase64(comp);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                      className="text-[10px] text-stone-500 block w-full"
                                    />
                                    <span className="text-[9px] text-stone-400 block leading-tight">Yüklenen görsel resmi marka logosu olarak belirlenecektir.</span>
                                  </div>
                                </div>
                              </div>

                              {/* Idea Logos array editor */}
                              <div className="space-y-1.5 pt-2 border-t border-stone-200/50">
                                <label className="block text-[10px] font-mono text-stone-500 uppercase font-bold">
                                  Alternatif Fikir / Taslak Havuzu
                                </label>
                                <div className="flex gap-2 flex-wrap items-center">
                                  {editIdeaLogos.map((idea, idx) => (
                                    <div key={idx} className="w-12 h-12 bg-white border border-stone-300 rounded flex items-center justify-center shrink-0 relative group">
                                      <img src={idea} alt="Fikir" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                      <button
                                        type="button"
                                        onClick={() => setEditIdeaLogos(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute inset-0 bg-red-600/80 text-white text-[9px] font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                      >
                                        Kaldır
                                      </button>
                                    </div>
                                  ))}
                                  <label className="w-12 h-12 border-2 border-dashed border-stone-300 hover:border-[#D35057] rounded flex flex-col items-center justify-center cursor-pointer text-stone-400 hover:text-[#D35057] transition-all">
                                    <Plus className="w-4 h-4" />
                                    <span className="text-[7px] font-mono uppercase font-bold">Yükle</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = async (evt) => {
                                          if (evt.target?.result) {
                                            const base64 = evt.target.result as string;
                                            const comp = await compressImageBase64(base64);
                                            setEditIdeaLogos(prev => [...prev, comp]);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. COLOR PALETTE WITH CLICK-TO-COPY */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                              2. Kurumsal Renk Paleti
                            </h4>
                            <button
                              onClick={handleAiColorPalette}
                              disabled={aiGeneratingColors}
                              className="text-[9px] font-mono text-[#D35057] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Sparkles className="w-3 h-3" />
                              {aiGeneratingColors ? 'AI Öneriyor...' : 'AI ile Renk Öner'}
                            </button>
                          </div>

                          {!isEditingBrand ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {(bk.colorPalette || []).map((color, idx) => {
                                const hex = color.split(' ')[0] || '';
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      navigator.clipboard.writeText(hex);
                                      setCopiedColor(hex);
                                      setTimeout(() => setCopiedColor(null), 1200);
                                    }}
                                    className="p-2 bg-stone-50 dark:bg-[#112440]/20 border border-stone-200 dark:border-[#2C3C72]/30 rounded-xl flex items-center gap-2 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all relative overflow-hidden group select-none"
                                    title="Kodu Kopyala"
                                  >
                                    <span 
                                      className="w-7 h-7 rounded-lg border border-stone-200 shrink-0 inline-block" 
                                      style={{ backgroundColor: hex }} 
                                    />
                                    <div className="min-w-0 flex-1 leading-tight">
                                      <span className="block text-[10px] font-mono font-bold text-stone-700 dark:text-[#F3EFE8] uppercase truncate">{hex}</span>
                                      <span className="text-[8px] font-mono text-stone-400 block tracking-widest">KOPYALA</span>
                                    </div>
                                    
                                    {copiedColor === hex && (
                                      <div className="absolute inset-0 bg-[#E8F5E9] dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[8px] font-mono font-bold flex items-center justify-center animate-fade-in uppercase">
                                        ✓ KOPYALANDI
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {(bk.colorPalette || []).length === 0 && (
                                <p className="text-[11px] text-stone-400 italic py-2 col-span-full">Henüz renk paleti tanımlanmadı.</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3 bg-stone-50 dark:bg-[#112440]/30 p-3.5 border border-stone-200 rounded-xl">
                              <div className="flex gap-2 flex-wrap">
                                {editColorPalette.map((color, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-white dark:bg-[#17345A] border border-stone-200 px-2 py-1 rounded shadow-xs text-[10px] font-mono">
                                    <span className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-[#1B2A4A] dark:text-[#F3EFE8] truncate">{color}</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditColorPalette(prev => prev.filter((_, i) => i !== idx))}
                                      className="text-red-500 hover:text-red-700 font-bold shrink-0 text-xs ml-1"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 pt-2 border-t border-dashed border-stone-200">
                                <input
                                  type="color"
                                  value={newColor}
                                  onChange={(e) => setNewColor(e.target.value)}
                                  className="w-7 h-7 rounded cursor-pointer border border-stone-300 shrink-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!editColorPalette.includes(newColor)) {
                                      setEditColorPalette(prev => [...prev, newColor]);
                                    }
                                  }}
                                  className="px-3 py-1 bg-stone-200 text-stone-700 rounded text-xs hover:bg-stone-300 font-mono"
                                >
                                  Palete Ekle
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* RIGHT COLUMN */}
                      <div className="space-y-6">
                        
                        {/* 3. TYPOGRAPHY PREVIEW */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                            3. Tipografi ve Karakter Yüzü
                          </h4>
                          
                          {!isEditingBrand ? (
                            <div className="p-4 bg-stone-50 dark:bg-[#112440]/30 border border-stone-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between text-xs border-b border-stone-200/50 pb-1.5">
                                <span className="font-mono text-stone-500">Tercih Edilen Yazı Tipi:</span>
                                <span className="font-bold font-serif text-[#D35057]">{bk.selectedFont || 'Inter'}</span>
                              </div>
                              <div className="py-4 text-center select-none overflow-hidden">
                                <span 
                                  style={{ fontFamily: activeFont }} 
                                  className="text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100 block truncate"
                                >
                                  {activeBrand.title}
                                </span>
                                <span 
                                  style={{ fontFamily: activeFont }} 
                                  className="text-[10px] text-stone-400 uppercase tracking-widest block mt-1"
                                >
                                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">
                                Tercih Edilen Font Seçin
                              </label>
                              <select
                                value={editSelectedFont}
                                onChange={(e) => setEditSelectedFont(e.target.value)}
                                className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 rounded p-2 focus:outline-hidden"
                              >
                                <option value="Inter">Inter (Swiss/Modern Sans-serif)</option>
                                <option value="Space Grotesk">Space Grotesk (Tech-forward Display)</option>
                                <option value="Playfair Display">Playfair Display (Editorial/Serif)</option>
                                <option value="JetBrains Mono">JetBrains Mono (Technical Minimalist)</option>
                                <option value="Outfit">Outfit (Clean Sans Display)</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* 4. VOICE AND TONE */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                            4. Ton ve Ses Kılavuzu (Voice & Tone)
                          </h4>
                          
                          {!isEditingBrand ? (
                            <div className="p-4 bg-stone-50 dark:bg-[#112440]/30 border border-stone-200 rounded-xl leading-relaxed">
                              {bk.voiceTone ? (
                                <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap font-sans">
                                  {bk.voiceTone}
                                </p>
                              ) : (
                                <span 
                                  onClick={() => setIsEditingBrand(true)}
                                  className="text-[10px] font-mono text-stone-400 hover:text-[#D35057] cursor-pointer block text-center py-2"
                                >
                                  ✨ Ton ve Ses Kılavuzu Ekle...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">
                                Ton ve Ses Tanımı (Nasıl Konuşur, Nasıl İfade Eder?)
                              </label>
                              <textarea
                                rows={3}
                                value={editVoiceTone}
                                onChange={(e) => setEditVoiceTone(e.target.value)}
                                placeholder="Örn: Resmi, soğuk ama entelektüel; gizemli ve kışkırtıcı; her zaman rasyonel..."
                                className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 rounded p-2 focus:outline-hidden font-sans"
                              />
                            </div>
                          )}
                        </div>

                        {/* 5. USAGE RULES (DO & DONT) */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                            5. Marka Kullanım Kuralları
                          </h4>
                          
                          {!isEditingBrand ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Do list */}
                              <div className="p-3 bg-emerald-50/35 dark:bg-emerald-950/10 border border-emerald-200/40 rounded-xl space-y-2">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  ✓ YAPIN (DO)
                                </span>
                                <ul className="space-y-1.5 text-[11px] font-sans text-stone-700 dark:text-stone-300">
                                  {(bk.usageRulesDo || []).map((rule, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 leading-tight">
                                      <span className="text-emerald-500 text-xs mt-0.5 shrink-0">✓</span>
                                      <span>{rule}</span>
                                    </li>
                                  ))}
                                  {(bk.usageRulesDo || []).length === 0 && (
                                    <span className="text-[10px] text-stone-400 italic font-sans block text-center py-1">Kural belirtilmedi.</span>
                                  )}
                                </ul>
                              </div>

                              {/* Dont list */}
                              <div className="p-3 bg-red-50/35 dark:bg-red-950/10 border border-red-200/40 rounded-xl space-y-2">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                  ✕ YAPMAYIN (DON'T)
                                </span>
                                <ul className="space-y-1.5 text-[11px] font-sans text-stone-700 dark:text-stone-300">
                                  {(bk.usageRulesDont || []).map((rule, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 leading-tight">
                                      <span className="text-red-500 text-xs mt-0.5 shrink-0">✕</span>
                                      <span>{rule}</span>
                                    </li>
                                  ))}
                                  {(bk.usageRulesDont || []).length === 0 && (
                                    <span className="text-[10px] text-stone-400 italic font-sans block text-center py-1">Kural belirtilmedi.</span>
                                  )}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 border border-stone-200 rounded-xl">
                              
                              {/* Edit Do rules */}
                              <div className="space-y-2">
                                <label className="block text-[9px] font-mono font-bold uppercase text-emerald-600">✓ YAPIN (DO)</label>
                                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                                  {editUsageRulesDo.map((rule, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-1 rounded border text-[10px] font-sans">
                                      <span className="truncate flex-1 pr-1">{rule}</span>
                                      <button 
                                        type="button" 
                                        onClick={() => setEditUsageRulesDo(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-500 font-bold hover:text-red-700"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={newDoRule}
                                    onChange={(e) => setNewDoRule(e.target.value)}
                                    placeholder="Yeni Yap kuralı..."
                                    className="flex-1 text-[10px] bg-white text-stone-800 border rounded p-1 focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (newDoRule.trim()) {
                                        setEditUsageRulesDo(prev => [...prev, newDoRule.trim()]);
                                        setNewDoRule('');
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white font-mono text-[9px] rounded uppercase"
                                  >
                                    Ekle
                                  </button>
                                </div>
                              </div>

                              {/* Edit Dont rules */}
                              <div className="space-y-2">
                                <label className="block text-[9px] font-mono font-bold uppercase text-red-600">✕ YAPMAYIN (DON'T)</label>
                                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                                  {editUsageRulesDont.map((rule, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-1 rounded border text-[10px] font-sans">
                                      <span className="truncate flex-1 pr-1">{rule}</span>
                                      <button 
                                        type="button" 
                                        onClick={() => setEditUsageRulesDont(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-500 font-bold hover:text-red-700"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={newDontRule}
                                    onChange={(e) => setNewDontRule(e.target.value)}
                                    placeholder="Yeni Yapma kuralı..."
                                    className="flex-1 text-[10px] bg-white text-stone-800 border rounded p-1 focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (newDontRule.trim()) {
                                        setEditUsageRulesDont(prev => [...prev, newDontRule.trim()]);
                                        setNewDontRule('');
                                      }
                                    }}
                                    className="px-2 py-1 bg-red-600 text-white font-mono text-[9px] rounded uppercase"
                                  >
                                    Ekle
                                  </button>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>

                      </div>

                    </div>

                    {/* 6. SAMPLE GALLERY & MOODBOARD (IMAGE SECTIONS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-stone-100 dark:border-stone-800">
                      
                      {/* Exemplary Works Archive */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                          6. Tasarım Örnekleri & İlham Arşivi
                        </h4>
                        
                        {!isEditingBrand ? (
                          <div className="grid grid-cols-3 gap-2.5">
                            {(bk.exemplaryWorks || []).map((work, idx) => (
                              <div key={idx} className="aspect-square bg-stone-50 border border-stone-200 rounded-xl overflow-hidden relative group/work select-none">
                                {work.startsWith('data:image') || work.startsWith('http') ? (
                                  <img src={work} alt={`Örnek Çalışma ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="p-2 text-[10px] font-sans text-stone-500 flex items-center justify-center h-full text-center break-words leading-tight bg-stone-100">
                                    {work}
                                  </div>
                                )}
                              </div>
                            ))}
                            {(bk.exemplaryWorks || []).length === 0 && (
                              <span 
                                onClick={() => setIsEditingBrand(true)}
                                className="text-[10px] font-mono text-stone-400 hover:text-[#D35057] cursor-pointer block text-center py-4 col-span-full"
                              >
                                ➕ Tasarım Örnekleri Ekle...
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 bg-stone-50 p-3.5 border border-stone-200 rounded-xl">
                            <div className="grid grid-cols-4 gap-2">
                              {editExexemplaryWorks.map((work, idx) => (
                                <div key={idx} className="aspect-square bg-white border rounded relative group">
                                  {work.startsWith('data:image') || work.startsWith('http') ? (
                                    <img src={work} alt="Arşiv" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="p-1 text-[8px] flex items-center justify-center h-full text-center overflow-hidden font-sans text-stone-500 leading-tight">
                                      {work}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEditExexemplaryWorks(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute inset-0 bg-red-600/80 text-white text-[9px] font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                  >
                                    Kaldır
                                  </button>
                                </div>
                              ))}
                              <label className="aspect-square border-2 border-dashed border-stone-300 hover:border-[#D35057] rounded flex flex-col items-center justify-center cursor-pointer text-stone-400 hover:text-[#D35057] transition-all">
                                <Plus className="w-4 h-4" />
                                <span className="text-[8px] font-mono font-bold uppercase mt-1">Yükle</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (evt) => {
                                      if (evt.target?.result) {
                                        const base64 = evt.target.result as string;
                                        const comp = await compressImageBase64(base64);
                                        setEditExexemplaryWorks(prev => [...prev, comp]);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            </div>
                            
                            <div className="flex gap-1 pt-1.5 border-t border-dashed border-stone-200">
                              <input
                                type="text"
                                value={newExemplar}
                                onChange={(e) => setNewExemplar(e.target.value)}
                                placeholder="Alternatif metin referansı..."
                                className="flex-1 text-[10px] bg-white border rounded p-1 focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newExemplar.trim()) {
                                    setEditExexemplaryWorks(prev => [...prev, newExemplar.trim()]);
                                    setNewExemplar('');
                                  }
                                }}
                                className="px-2 py-1 bg-stone-300 text-stone-700 rounded text-[10px] hover:bg-stone-400 font-mono"
                              >
                                Ekle
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Atmosphere & Moodboard */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                          7. Moodboard & Atmosfer Kataloğu
                        </h4>
                        
                        {!isEditingBrand ? (
                          <div className="grid grid-cols-3 gap-2.5">
                            {(bk.atmosphereMoodboard || []).map((img, idx) => (
                              <div key={idx} className="aspect-square bg-stone-50 border border-stone-200 rounded-xl overflow-hidden relative group/atmosphere select-none">
                                <img src={img} alt={`Moodboard ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                            {(bk.atmosphereMoodboard || []).length === 0 && (
                              <span 
                                onClick={() => setIsEditingBrand(true)}
                                className="text-[10px] font-mono text-stone-400 hover:text-[#D35057] cursor-pointer block text-center py-4 col-span-full"
                              >
                                ➕ Moodboard Görseli Ekle...
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 bg-stone-50 p-3.5 border border-stone-200 rounded-xl">
                            <div className="grid grid-cols-4 gap-2">
                              {editAtmosphereMoodboard.map((img, idx) => (
                                <div key={idx} className="aspect-square bg-white border rounded relative group">
                                  <img src={img} alt="Mood" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <button
                                    type="button"
                                    onClick={() => setEditAtmosphereMoodboard(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute inset-0 bg-red-600/80 text-white text-[9px] font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                  >
                                    Kaldır
                                  </button>
                                </div>
                              ))}
                              <label className="aspect-square border-2 border-dashed border-stone-300 hover:border-[#D35057] rounded flex flex-col items-center justify-center cursor-pointer text-stone-400 hover:text-[#D35057] transition-all">
                                <Plus className="w-4 h-4" />
                                <span className="text-[8px] font-mono font-bold uppercase mt-1">Yükle</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (evt) => {
                                      if (evt.target?.result) {
                                        const base64 = evt.target.result as string;
                                        const comp = await compressImageBase64(base64);
                                        setEditAtmosphereMoodboard(prev => [...prev, comp]);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                            </div>
                            <span className="text-[9px] font-mono text-stone-400 block leading-tight">İlham verici atmosfer paneli için Base64 görseller ekleyin.</span>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })()}

              {/* Brand Notes Description (Künye Altında) */}
              <div className="bg-white/80 dark:bg-[#13204A]/60 border border-[#B9C7BD] dark:border-[#2C3C72] p-5 rounded-xl space-y-2">
                <h4 className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
                  Marka Hikayesi & Kapsamı
                </h4>
                {isEditingBrand ? (
                  <textarea
                    rows={3}
                    value={editBrandNotes}
                    onChange={(e) => setEditBrandNotes(e.target.value)}
                    className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 rounded p-2 focus:outline-hidden focus:border-[#D35057]"
                  />
                ) : (
                  <p className="text-xs text-[#1B2A4A] dark:text-[#F3EFE8] leading-relaxed">
                    {activeBrand.notes || 'Bu marka için henüz bir tanıtım yazılmadı.'}
                  </p>
                )}
              </div>

              {/* CHILD ENTITIES SEGMENT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* 1. KİŞİLER */}
                <div className="bg-white dark:bg-[#13204A]/60 border border-[#B9C7BD] dark:border-[#2C3C72] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">Kişiler ({brandKisiler.length})</h4>
                    </div>
                    <button 
                      onClick={() => handleOpenAddEntity('kisi')}
                      className="p-1 hover:bg-stone-100 rounded text-[#D35057]"
                      title="Yeni kişi ekle"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {brandKisiler.map(k => (
                      <div 
                        key={k.id} 
                        className="p-1.5 bg-stone-50 dark:bg-[#112440]/40 rounded hover:bg-[#E7EBE6] dark:hover:bg-[#17345A] border border-transparent hover:border-stone-200 transition-all text-xs flex justify-between items-center gap-1"
                      >
                        <span 
                          onClick={() => onSelectArea('duzada', k.id)}
                          className="font-medium text-[#1B2A4A] dark:text-[#F3EFE8] truncate max-w-[120px] hover:underline cursor-pointer flex-1"
                        >
                          {k.title}
                        </span>
                        <select
                          value={k.metadata?.brandId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            await onUpdateItem({
                              ...k,
                              metadata: {
                                ...k.metadata,
                                brandId: e.target.value || undefined
                              }
                            });
                          }}
                          className="text-[9px] bg-white dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-200 dark:border-[#2C3C72] rounded px-1 py-0.5 max-w-[90px] focus:outline-hidden shrink-0"
                        >
                          <option value="">Bağımsız</option>
                          {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {brandKisiler.length === 0 && (
                      <p className="text-[10px] text-stone-400 italic">Bu markaya bağlı kişi tanımlanmadı.</p>
                    )}
                  </div>
                </div>

                {/* 2. MEKANLAR */}
                <div className="bg-white dark:bg-[#13204A]/60 border border-[#B9C7BD] dark:border-[#2C3C72] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">Mekanlar ({brandYerler.length})</h4>
                    </div>
                    <button 
                      onClick={() => handleOpenAddEntity('yer')}
                      className="p-1 hover:bg-stone-100 rounded text-[#D35057]"
                      title="Yeni mekan ekle"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {brandYerler.map(y => (
                      <div 
                        key={y.id} 
                        className="p-1.5 bg-stone-50 dark:bg-[#112440]/40 rounded hover:bg-[#E7EBE6] dark:hover:bg-[#17345A] border border-transparent hover:border-stone-200 transition-all text-xs flex justify-between items-center gap-1"
                      >
                        <span 
                          onClick={() => onSelectArea('duzada', y.id)}
                          className="font-medium text-[#1B2A4A] dark:text-[#F3EFE8] truncate max-w-[120px] hover:underline cursor-pointer flex-1"
                        >
                          {y.title}
                        </span>
                        <select
                          value={y.metadata?.brandId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            await onUpdateItem({
                              ...y,
                              metadata: {
                                ...y.metadata,
                                brandId: e.target.value || undefined
                              }
                            });
                          }}
                          className="text-[9px] bg-white dark:bg-[#112440] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-200 dark:border-[#2C3C72] rounded px-1 py-0.5 max-w-[90px] focus:outline-hidden shrink-0"
                        >
                          <option value="">Bağımsız</option>
                          {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {brandYerler.length === 0 && (
                      <p className="text-[10px] text-stone-400 italic">Bu markaya bağlı mekan tanımlanmadı.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* MERCHANDISING SECTION */}
              <div className="bg-stone-50 dark:bg-[#17345A]/50 border border-[#B9C7BD] dark:border-[#2C3C72]/50 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-[#D35057]" />
                    <h3 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">
                      Marka Merch & Tasarımları
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">
                    Tema → Drop → Ürün Zinciri
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Tema List */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      📁 Temalar ({brandTemalar.length})
                    </span>
                    <div className="space-y-1">
                      {brandTemalar.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => onSelectArea('merch', t.id)}
                          className="p-2 bg-white dark:bg-[#112440] border border-stone-200 rounded-lg text-xs hover:border-[#D35057] transition-all flex justify-between items-center cursor-pointer"
                        >
                          <span className="font-bold text-[#1B2A4A] dark:text-[#F3EFE8] truncate max-w-[120px]">{t.title}</span>
                          <span className="text-[9px] font-mono text-indigo-500">Aç</span>
                        </div>
                      ))}
                      {brandTemalar.length === 0 && (
                        <span className="text-[11px] text-stone-400 italic block">Tanımlı tema bulunamadı.</span>
                      )}
                    </div>
                  </div>

                  {/* Drop List */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      📦 Droplar ({brandDroplar.length})
                    </span>
                    <div className="space-y-1">
                      {brandDroplar.map(d => (
                        <div 
                          key={d.id} 
                          onClick={() => onSelectArea('merch', d.id)}
                          className="p-2 bg-white dark:bg-[#112440] border border-stone-200 rounded-lg text-xs hover:border-[#D35057] transition-all flex justify-between items-center cursor-pointer"
                        >
                          <span className="font-bold text-[#1B2A4A] dark:text-[#F3EFE8] truncate max-w-[120px]">{d.title}</span>
                          <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-1 py-0.5 rounded">{d.status}</span>
                        </div>
                      ))}
                      {brandDroplar.length === 0 && (
                        <span className="text-[11px] text-stone-400 italic block">Aktif Drop bulunmuyor.</span>
                      )}
                    </div>
                  </div>

                  {/* Ürün List */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      👕 Ürünler ({brandUrunler.length})
                    </span>
                    <div className="space-y-1">
                      {brandUrunler.map(u => (
                        <div 
                          key={u.id} 
                          onClick={() => onSelectArea('merch', u.id)}
                          className="p-2 bg-white dark:bg-[#112440] border border-stone-200 rounded-lg text-xs hover:border-[#D35057] transition-all flex justify-between items-center cursor-pointer"
                        >
                          <span className="font-semibold text-[#1B2A4A] dark:text-[#F3EFE8] truncate max-w-[110px]">{u.title}</span>
                          <span className="text-[9px] font-mono text-[#D35057] shrink-0">{u.metadata?.category || 'giyim'}</span>
                        </div>
                      ))}
                      {brandUrunler.length === 0 && (
                        <span className="text-[11px] text-stone-400 italic block">Oluşturulmuş ürün bulunmuyor.</span>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            <div className="bg-[#E7EBE6] border-2 border-dashed border-[#B9C7BD] rounded-xl p-12 text-center text-[#6A5E4C]">
              Sol menüden bir marka seçin veya çatı markayı aktifleştirin.
            </div>
          )}
        </div>

      </div>

      {/* MODAL / FORM OVERLAYS */}
      
      {/* 1. BRAND CREATION MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-[#1B2A4A]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-[#F3EFE8] border-2 border-[#CFC5B4] rounded-2xl shadow-2xl p-6 space-y-4 paper-grain">
            <div className="flex items-center justify-between pb-2 border-b border-[#CFC5B4]">
              <h3 className="font-serif font-bold text-lg text-[#1B2A4A]">Yeni Yaratıcı Marka</h3>
              <button onClick={() => setShowCreateForm(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-[#6A5E4C]">Marka Adı / Başlık *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Küçükçetmi Sürek Kulübü, Ada Dükkânı..."
                  value={newBrandTitle}
                  onChange={(e) => setNewBrandTitle(e.target.value)}
                  className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-[#6A5E4C]">Tanıtım & Kurgusal Hikayesi</label>
                <textarea
                  rows={4}
                  placeholder="Bu markanın evrendeki yeri, felsefesi ve faaliyetleri hakkında özet..."
                  value={newBrandNotes}
                  onChange={(e) => setNewBrandNotes(e.target.value)}
                  className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-2 border border-[#CFC5B4] rounded-lg hover:bg-stone-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D35057] text-white rounded-lg hover:bg-[#B23A40]"
                >
                  Markayı Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MERCH YAP FORM MODAL */}
      {showMerchForm && activeBrand && (
        <div className="fixed inset-0 bg-[#1B2A4A]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-[#F3EFE8] border-2 border-[#CFC5B4] rounded-2xl shadow-2xl p-6 space-y-4 paper-grain">
            <div className="flex items-center justify-between pb-2 border-b border-[#CFC5B4]">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-[#D35057]" />
                <h3 className="font-serif font-bold text-lg text-[#1B2A4A]">{activeBrand.title} Merch Yap</h3>
              </div>
              <button onClick={() => setShowMerchForm(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed font-mono">
              Bu işlem, <strong>{activeBrand.title}</strong> markasının kurumsal logosunu, fontunu ve 
              renk paletini otomatik olarak içe aktararak yeni bir Merch Teması (Theme) başlatacaktır.
            </p>

            <form onSubmit={handleCreateBrandMerch} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-[#6A5E4C]">Yeni Merch Teması Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yaz Sezonu Koleksiyonu, Ekinoks Özel..."
                  value={newThemeTitle}
                  onChange={(e) => setNewThemeTitle(e.target.value)}
                  className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-[#6A5E4C]">Tema Açıklaması / Konsept</label>
                <textarea
                  rows={3}
                  placeholder="Koleksiyonun esin kaynakları, stil rehberi ve hedefleri..."
                  value={newThemeNotes}
                  onChange={(e) => setNewThemeNotes(e.target.value)}
                  className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMerchForm(false)}
                  className="px-3 py-2 border border-[#CFC5B4] rounded-lg hover:bg-stone-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Tema Oluştur ve Atölyeye Git
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CHILD ENTITY ADD MODAL (Search & Link Existing, with Create New option) */}
      {showAddEntityForm && activeBrand && (
        <div className="fixed inset-0 bg-[#1B2A4A]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-md w-full bg-[#F3EFE8] border-2 border-[#CFC5B4] rounded-2xl shadow-2xl p-6 space-y-4 paper-grain">
            <div className="flex items-center justify-between pb-2 border-b border-[#CFC5B4]">
              <div className="flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-indigo-500" />
                <h3 className="font-serif font-bold text-lg text-[#1B2A4A]">
                  {isCreatingNew 
                    ? `Yeni ${showAddEntityForm === 'kisi' ? 'Kişi' : showAddEntityForm === 'yer' ? 'Yer/Mekân' : 'Olay'} Oluştur`
                    : `${showAddEntityForm === 'kisi' ? 'Mevcut Kişi' : showAddEntityForm === 'yer' ? 'Mevcut Yer/Mekân' : 'Mevcut Olay'} İlişkilendir`
                  }
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddEntityForm(null);
                  setIsCreatingNew(false);
                  setSearchQuery('');
                }} 
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isCreatingNew ? (
              // SEARCH & SELECT INTERFACE (Primary option)
              <div className="space-y-4">
                <p className="text-xs text-stone-500 leading-relaxed font-mono">
                  Sistemde kayıtlı olan <strong>{showAddEntityForm === 'kisi' ? 'kişilerden' : 'yer ve mekânlardan'}</strong> birini seçerek doğrudan <strong>{activeBrand.title}</strong> markasına bağlayabilirsiniz.
                </p>

                <div className="space-y-1.5 font-mono">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6A5E4C]">Varlık Ara</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`${showAddEntityForm === 'kisi' ? 'Kişi adı, ünvanı...' : 'Mekân adı, konumu...'} ara...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2.5 pl-8 focus:outline-hidden"
                    />
                    <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6A5E4C] block">
                    Seçilebilir Varlıklar ({filteredExistingEntities.length})
                  </span>
                  
                  <div className="border border-[#CFC5B4] rounded-xl bg-white/50 max-h-[220px] overflow-y-auto divide-y divide-stone-200/60 p-1.5">
                    {filteredExistingEntities.map(ent => (
                      <div
                        key={ent.id}
                        onClick={() => handleLinkExistingEntity(ent)}
                        className="p-2.5 hover:bg-[#E7E0D2] dark:hover:bg-stone-100 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-serif font-bold text-xs text-[#1B2A4A] truncate">{ent.title}</div>
                          {ent.notes && (
                            <div className="text-[10px] text-stone-500 truncate font-mono mt-0.5">{ent.notes}</div>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold shrink-0">
                          Bağla &rarr;
                        </span>
                      </div>
                    ))}
                    {filteredExistingEntities.length === 0 && (
                      <div className="p-4 text-center text-xs text-stone-400 italic font-mono">
                        Seçilebilir varlık bulunamadı.
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Option: Create New */}
                <div className="pt-2 border-t border-dashed border-[#CFC5B4] text-center">
                  <p className="text-[10px] text-stone-500 font-mono mb-2">
                    Aradığınız varlık listede yok mu?
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(true)}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-[#1B2A4A] border border-[#CFC5B4] rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D35057]" />
                    Sıfırdan Yeni Varlık Oluştur &rarr;
                  </button>
                </div>
              </div>
            ) : (
              // CREATE NEW INTERFACE (Secondary option)
              <form onSubmit={handleAddChildEntity} className="space-y-4 font-mono text-xs">
                <p className="text-xs text-stone-500 leading-relaxed">
                  Bu yeni varlık otomatik olarak oluşturulacak ve <strong>{activeBrand.title}</strong> markasına bağlanacaktır.
                </p>

                <div className="space-y-1">
                  <label className="block font-bold text-[#6A5E4C]">Varlık Adı / Başlık *</label>
                  <input
                    type="text"
                    required
                    placeholder={showAddEntityForm === 'kisi' ? 'Örn: Kamil Efendi, Leyla Hanım...' : showAddEntityForm === 'yer' ? 'Örn: Taş Konak Atölye, Zeytinlik Limanı...' : 'Örn: Sürek Festivali 2026...'}
                    value={newEntityTitle}
                    onChange={(e) => setNewEntityTitle(e.target.value)}
                    className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-[#6A5E4C]">Detaylı Açıklama / Hikaye</label>
                  <textarea
                    rows={3}
                    placeholder="Karakter özellikleri, mekân lore özetleri veya etkinlik takvimi..."
                    value={newEntityNotes}
                    onChange={(e) => setNewEntityNotes(e.target.value)}
                    className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                  />
                </div>

                {showAddEntityForm === 'kisi' && (
                  <div className="space-y-1">
                    <label className="block font-bold text-[#6A5E4C]">Bulunduğu Yer / Mekân (Opsiyonel)</label>
                    <select
                      value={newEntityPlaceId}
                      onChange={(e) => setNewEntityPlaceId(e.target.value)}
                      className="w-full text-xs bg-white text-[#1B2A4A] border border-[#CFC5B4] rounded-lg p-2 focus:outline-hidden"
                    >
                      <option value="">-- Bir Yer Seçin --</option>
                      {items.filter(i => (i.type === 'yer' || i.type === 'mekân' || i.type === 'dükkân') && !i.archived).map(y => (
                        <option key={y.id} value={y.id}>{y.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-[#CFC5B4]">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs text-indigo-600 hover:underline font-bold"
                  >
                    &larr; Mevcutlardan Seç
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddEntityForm(null);
                        setIsCreatingNew(false);
                      }}
                      className="px-3 py-2 border border-[#CFC5B4] rounded-lg hover:bg-stone-100"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                    >
                      Varlığı Oluştur &amp; Bağla
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
