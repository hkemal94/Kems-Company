import React, { useState, useMemo } from 'react';
import { 
  Compass, Map, MapPin, Users, ShoppingBag, Tag, 
  Calendar, History, Edit3, Save, Plus, Trash2, 
  Globe, Building, Trees, ArrowRight, BookOpen, Sparkles, CheckCircle2, ChevronRight, MapPinned,
  Search, Key, Check, HelpCircle, Trophy, TrendingUp, AlertCircle, Store
} from 'lucide-react';
import { Item, ItemType, AreaType, WikiSection } from '../types';

export const DEFAULT_QUESTIONS_BY_CAT: Record<string, Array<{ id: string; label: string; question: string; fieldPath: string }>> = {
  kisi: [
    { id: 'title', label: 'Karakter Adı / Unvan', question: 'Karakterin tam adı ve bilinen unvanı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Geçmiş Hikayesi / Özgeçmiş', question: 'Karakterin Düzada\'daki genel geçmişi ve detaylı yaşam hikayesi nedir?', fieldPath: 'notes' },
    { id: 'profession', label: 'Meslek veya Rol', question: 'Karakterin adadaki aktif mesleği, görevi veya rolü nedir?', fieldPath: 'metadata.profile.profession' },
    { id: 'personality', label: 'Mizaç ve Kişilik Özellikleri', question: 'Karakterin mizaç özellikleri, belirgin davranış kalıpları ve alışkanlıkları nelerdir?', fieldPath: 'metadata.profile.personality' },
    { id: 'origin', label: 'Köken ve Soy', question: 'Karakterin kökeni, ailesi, soyu veya adadaki geçmiş bağları nedir?', fieldPath: 'metadata.profile.origin' },
    { id: 'motivation', label: 'Ana Hedef ve Motivasyon', question: 'Bu karakterin adadaki ana amacı, motivasyonu veya sakladığı sırlar nelerdir?', fieldPath: 'metadata.profile.motivation' },
    { id: 'socialClass', label: 'Toplumsal Sınıf ve İtibar', question: 'Karakterin adadaki statüsü, saygınlığı ve diğer ada sakinleri üzerindeki etkisi nedir?', fieldPath: 'metadata.profile.socialClass' }
  ],
  mekan: [
    { id: 'title', label: 'Mekan Adı', question: 'Bu mekanın tam adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Mekan Detayları & Tarihçe', question: 'Mekanın kuruluş hikayesi, adadaki tarihi ve işleyişine dair detaylar nelerdir?', fieldPath: 'notes' },
    { id: 'shopType', label: 'Mekan Türü', question: 'Bu mekanın işlevi veya türü nedir (bar, restoran, fırın, kayalık, deniz feneri vb.)?', fieldPath: 'metadata.profile.shopType' },
    { id: 'manager', label: 'Mekan Sorumlusu veya Sahibi', question: 'Mekanı işleten, mülk sahibi olan ya da oradan sorumlu olan kişi kimdir?', fieldPath: 'metadata.profile.manager' },
    { id: 'style', label: 'Mimari Stil ve Görünüm', question: 'Mekanın dış ve iç mimari tarzı, dekorasyonu ve adadaki genel görünümü nasıldır?', fieldPath: 'metadata.profile.style' },
    { id: 'secrets', label: 'Önemli Sırlar & Gizemler', question: 'Bu mekanda saklanan gizli bölmeler, sırlar veya dedikodular nelerdir?', fieldPath: 'metadata.profile.secrets' },
    { id: 'region', label: 'Mahalle / Coğrafi Bölge', question: 'Bu mekan adanın hangi coğrafi bölgesinde veya mahallesinde yer alıyor? (örn: liman, kuzey, orman vb.)', fieldPath: 'metadata.region' }
  ],
  marka: [
    { id: 'title', label: 'Organizasyon / Kulüp Adı', question: 'Bu kuruluşun, kulübün veya markanın tam adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Tarihçe ve Manifesto', question: 'Organizasyonun adadaki nüfuzu, tarihi ve kuruluş manifestosu nedir?', fieldPath: 'notes' },
    { id: 'purpose', label: 'Kuruluş Amacı ve Misyon', question: 'Bu kulüp veya markanın var oluş amacı ve adadaki ana misyonu nedir?', fieldPath: 'metadata.profile.purpose' },
    { id: 'leader', label: 'Liderlik ve Yönetim Yapısı', question: 'Organizasyonu yöneten lider, kurucu meclis veya hiyerarşik yapı nasıldır?', fieldPath: 'metadata.profile.leader' },
    { id: 'secrecy', label: 'Gizlilik Derecesi ve Üyeler', question: 'Organizasyonun gizlilik derecesi nedir? Üyelik şartları ve üye yapısı nasıldır?', fieldPath: 'metadata.profile.secrecy' },
    { id: 'influence', label: 'Ekonomik & Siyasi Nüfuz', question: 'Bu kuruluşun adadaki ticari veya yönetimsel gücü nedir?', fieldPath: 'metadata.profile.influence' }
  ],
  olay: [
    { id: 'title', label: 'Olay / Şenlik Adı', question: 'Bu tarihi olayın veya şenliğin adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Olay Gelişimi & Hikayesi', question: 'Olayın detaylı gelişi, nasıl sonuçlandığı ve adada bıraktığı miras nedir?', fieldPath: 'notes' },
    { id: 'date', label: 'Gerçekleşme Tarihi', question: 'Olay ne zaman, hangi yıl veya hangi sezonda gerçekleşti? (örn: 12 Eylül, Her Ekinoks vb.)', fieldPath: 'metadata.date' },
    { id: 'recurrence', label: 'Tekrarlanma Düzeni', question: 'Bu olay periyodik olarak tekrarlanıyor mu (yıllık, her ekinoksta vb.) yoksa tek seferlik mi?', fieldPath: 'metadata.recurrence' },
    { id: 'manager', label: 'Ana Aktörler / Katılımcılar', question: 'Olayın merkezindeki ana karakterler, kulüpler veya tanıklar kimlerdir?', fieldPath: 'metadata.profile.manager' },
    { id: 'consequences', label: 'Sonuçlar ve Etkiler', question: 'Bu olayın ada sakinleri ve adanın geleceği üzerindeki kalıcı etkisi ne oldu?', fieldPath: 'metadata.profile.consequences' }
  ],
  urun: [
    { id: 'title', label: 'Eşya / Ürün Adı', question: 'Bu kurgusal eşyanın veya drop ürününün adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Eşyanın Bulunuş Hikayesi ve Efsanesi', question: 'Eşyanın evrendeki hikayesi, kökeni ve adalılar arasındaki önemi nedir?', fieldPath: 'notes' },
    { id: 'rarity', label: 'Nadirlik Derecesi', question: 'Eşyanın evrendeki nadirlik veya bulunabilirlik derecesi nedir (Efsanevi, Sıradan, Eşsiz vb.)?', fieldPath: 'metadata.profile.rarity' },
    { id: 'material', label: 'Köken / Malzeme Yapısı', question: 'Eşya hangi malzemelerden yapılmıştır veya kökeni nereye dayanmaktadır?', fieldPath: 'metadata.profile.material' },
    { id: 'function', label: 'Ana İşlevi ve Gizli Gücü', question: 'Eşyanın kurguda üstlendiği ana işlev, kilit rol veya gizli kullanım amacı nedir?', fieldPath: 'metadata.profile.function' },
    { id: 'owner', label: 'Şu Anki Sahibi / Bulunduğu Yer', question: 'Eşyanın adada saklandığı yer veya şu anki sahibi kimdir?', fieldPath: 'metadata.profile.owner' }
  ],
  oda: [
    { id: 'title', label: 'Oda No / Adı', question: 'Odanın kapı numarası veya adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Oda Durumu & Atmosfer', question: 'Odanın genel düzeni, dekorasyonu ve sezondaki atmosferi nedir?', fieldPath: 'notes' },
    { id: 'roomStatus', label: 'Doluluk Durumu', question: 'Oda şu an boş mu, dolu mu, yoksa rezerve mi?', fieldPath: 'metadata.profile.roomStatus' },
    { id: 'guest', label: 'Odadaki Misafir', question: 'Oda sakinlerinin tam listesi veya odada kalan misafirin adı nedir?', fieldPath: 'metadata.profile.guest' },
    { id: 'clues', label: 'Gizli İpuçları & Eşyalar', question: 'Oda içinde saklanmış veya unutulmuş kilit deliller, sırlar veya belgeler nelerdir?', fieldPath: 'metadata.profile.clues' },
    { id: 'floor', label: 'Bulunduğu Kat', question: 'Oda Imperial otelinin hangi katında yer alıyor?', fieldPath: 'metadata.profile.floor' }
  ],
  yer: [
    { id: 'title', label: 'Mahalle / Bölge Adı', question: 'Mahallenin veya coğrafi bölgenin resmi adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Geçmişi ve Coğrafyası', question: 'Bölgenin coğrafi yapısı, tarihi kökenleri ve adadaki konumu nedir?', fieldPath: 'notes' },
    { id: 'population', label: 'Tahmini Nüfus', question: 'Bölgede aktif olarak kaç hane yaşıyor veya tahmini nüfus dağılımı nedir?', fieldPath: 'metadata.profile.population' },
    { id: 'landmarks', label: 'Önemli Yapılar ve Simgeler', question: 'Bölgede yer alan deniz feneri, kalıntılar veya anıtlar gibi kilit simgeler nelerdir?', fieldPath: 'metadata.profile.landmarks' },
    { id: 'vibe', label: 'Sosyal Atmosfer', question: 'Bölgenin genel hissiyatı ve adadaki sosyal repütasyonu nedir? (Sakin, tekinsiz, asil vb.)', fieldPath: 'metadata.profile.vibe' }
  ]
};

interface DuzadaWikiProps {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Item) => Promise<void>;
  onSelectItem: (id: string | null) => void;
  setActiveTab: (tab: 'wiki' | 'liste' | 'harita') => void;
  setSelectedCategory: (category: string) => void;
  mahalleler: Array<{ id: string; name: string; summary?: string }>;
  sokaklar: Array<{ id: string; name: string; mahalleId: string }>;
}

export default function DuzadaWiki({
  items,
  onUpdateItem,
  onAddItem,
  onSelectItem,
  setActiveTab,
  setSelectedCategory,
  mahalleler,
  sokaklar
}: DuzadaWikiProps) {
  // State for Sub-Tab Toggle: 'atlas' (Library) or 'doluluk' (Completeness Q&A)
  const [activeSubTab, setActiveSubTab] = useState<'atlas' | 'doluluk'>('atlas');

  // State for Edit Mode (Original wiki)
  const [isEditing, setIsEditing] = useState(false);

  // State for Search & Quick Filter
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiSelectedFilter, setWikiSelectedFilter] = useState<'hepsi' | 'kisi' | 'mekân' | 'yer' | 'marka' | 'olay' | 'oda'>('hepsi');
  const [wikiSortBy, setWikiSortBy] = useState<'name' | 'completeness'>('name');

  // Selected item in Completeness Portal
  const [selectedCompletenessId, setSelectedCompletenessId] = useState<string | null>(null);
  const [selectedCompletenessType, setSelectedCompletenessType] = useState<'entity' | 'mahalle' | 'sokak'>('entity');
  
  // Search & Filter state for Completeness Portal
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [compFilterType, setCompFilterType] = useState<string>('Hepsi');

  // Interactive Question Editor State
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [editingQuestionsList, setEditingQuestionsList] = useState<Array<{ id: string; label: string; question: string; fieldPath: string }>>([]);

  // Form states for active completeness Q&A
  const [answersState, setAnswersState] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

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
    const checkValue = (val: any) => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'string' && (val.trim() === '' || val.trim().toLowerCase() === 'belirtilmedi' || val.trim().toLowerCase() === 'bilinmiyor')) return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
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

  const filteredWikiItems = useMemo(() => {
    const list = items.filter(item => {
      if (item.id === 'duzada_world_details' || item.archived || item.isProposal || item.type === 'map_pin' || item.type === 'map_settings') return false;
      
      // Type/tag filtering
      if (wikiSelectedFilter !== 'hepsi') {
        const isRoom = isRoomItem(item);
        if (wikiSelectedFilter === 'oda') {
          if (!isRoom) return false;
        } else if (wikiSelectedFilter === 'yer') {
          if (isRoom) return false;
          // To allow items with tag 'yer' or type 'yer'
          const isYer = item.type === 'yer' || item.tags?.includes('yer');
          if (!isYer) return false;
        } else {
          const type = item.type;
          const tags = item.tags || [];
          if (wikiSelectedFilter === 'kisi' && type !== 'kisi' && type !== 'karakter' && !tags.includes('kisi')) return false;
          if (wikiSelectedFilter === 'mekân') {
            if (isRoom || isMahalleItem(item)) return false;
            if (type !== 'mekân' && type !== 'dükkân' && !tags.includes('mekân')) return false;
          }
          if (wikiSelectedFilter === 'marka' && type !== 'marka' && !tags.includes('marka')) return false;
          if (wikiSelectedFilter === 'olay' && type !== 'olay' && !tags.includes('olay')) return false;
        }
      }
      
      // Search query matching
      if (wikiSearchQuery.trim()) {
        const query = wikiSearchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const tagsMatch = item.tags?.some(t => t.toLowerCase().includes(query));
        const notesMatch = item.notes?.toLowerCase().includes(query);
        return titleMatch || tagsMatch || notesMatch;
      }
      return true;
    });

    if (wikiSortBy === 'name') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
    } else if (wikiSortBy === 'completeness') {
      list.sort((a, b) => getCompletenessScore(b) - getCompletenessScore(a));
    }
    return list;
  }, [items, wikiSearchQuery, wikiSelectedFilter, wikiSortBy]);

  // Default initial Düzada World item
  const defaultWorldDetails = useMemo(() => {
    return {
      id: 'duzada_world_details',
      title: 'Düzada',
      area: 'duzada' as AreaType,
      type: 'yer' as ItemType,
      status: 'Bitti',
      priority: 'yüksek' as const,
      tags: ['evren', 'rehber'],
      links: [],
      notes: `Düzada, Ege Denizi'nin serin sularında saklanmış, zamanın daha yavaş aktığı bir takımadanın kalbidir. Tarihi zeytinlikleri, sarp kayalıkların ucunda yükselen deniz feneri, balıkçı teknelerinin sığındığı limanı ve dar sokaklarıyla kendine has melankolik bir atmosfere sahiptir.\n\nAda, özellikle 1954 kuruluş tarihli görkemli "The Imperial Kemskøy" oteli ve çevresindeki sırlar ile bilinir. Ekim 2003 ("Sezon Sonu") dönemi, rüzgarın sertleştiği, turistlerin elini eteğini çektiği ve adanın kendi iç hesaplaşmalarıyla baş başa kaldığı gizemli bir zaman dilimini temsil eder.`,
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
      isProposal: false,
      userId: 'system',
      metadata: {
        activeEra: 'Ekim 2003, "Sezon Sonu"',
        climate: 'Ege / Akdeniz Mikrokliması - Rüzgarlı, Sert',
        atmosphere: 'Melankolik, Sezon Sonu, Sisli ve Gizemli',
        wikiSections: [
          { id: 'sec_1', title: 'Tarihçe', content: "Düzada yerleşimi antik çağlara uzanmakla birlikte, modern hüviyetini 20. yüzyılın ortalarında kazanmıştır. 1954 yılında açılan The Imperial Kemskøy, adanın güneyindeki Eski Liman bölgesini canlandırmış ve adayı seçkin misafirlerin uğrak noktası haline getirmiştir.", status: 'resmi' as const },
          { id: 'sec_2', title: 'Adaya Ulaşım', content: "Düzada'ya ulaşım yalnızca haftada iki kez kalkan nostaljik Kems ticaret gemileri ve kıyı şeridindeki limandan kalkan özel balıkçı tekneleriyle sağlanır. Fırtınalı sonbahar günlerinde adanın dış dünya ile olan tüm deniz bağı kesilebilir.", status: 'resmi' as const }
        ]
      }
    };
  }, []);

  // Retrieve current Düzada World details from state items or fallback
  const worldItem = useMemo(() => {
    const rawItem = items.find(i => i.id === 'duzada_world_details') || defaultWorldDetails;
    if (rawItem.metadata?.wikiSections) {
      // Dynamically rename "Tarihçe & Kuruluş" to "Tarihçe"
      const updatedSections = rawItem.metadata.wikiSections.map(s => {
        if (s.title === 'Tarihçe & Kuruluş') {
          return { ...s, title: 'Tarihçe' };
        }
        return s;
      });
      return {
        ...rawItem,
        metadata: {
          ...rawItem.metadata,
          wikiSections: updatedSections
        }
      };
    }
    return rawItem;
  }, [items, defaultWorldDetails]);

  // Edit form states, synchronized with selected worldItem
  const [notes, setNotes] = useState(worldItem.notes);
  const [activeEra, setActiveEra] = useState(worldItem.metadata?.activeEra || 'Ekim 2003, "Sezon Sonu"');
  const [climate, setClimate] = useState(worldItem.metadata?.climate || 'Ege / Akdeniz Mikrokliması');
  const [atmosphere, setAtmosphere] = useState(worldItem.metadata?.atmosphere || 'Melankolik, Sezon Sonu');
  const [sections, setSections] = useState<WikiSection[]>(worldItem.metadata?.wikiSections || []);

  // Sync state if worldItem changes
  React.useEffect(() => {
    setNotes(worldItem.notes);
    setActiveEra(worldItem.metadata?.activeEra || 'Ekim 2003, "Sezon Sonu"');
    setClimate(worldItem.metadata?.climate || 'Ege / Akdeniz Mikrokliması');
    setAtmosphere(worldItem.metadata?.atmosphere || 'Melankolik, Sezon Sonu');
    setSections(worldItem.metadata?.wikiSections || []);
  }, [worldItem]);

  // Save changes to db
  const handleSave = async () => {
    const isNew = !items.some(i => i.id === 'duzada_world_details');
    const updatedItem: Item = {
      ...worldItem,
      notes,
      updatedAt: Date.now(),
      metadata: {
        ...worldItem.metadata,
        activeEra,
        climate,
        atmosphere,
        wikiSections: sections
      }
    };

    if (isNew) {
      await onAddItem(updatedItem);
    } else {
      await onUpdateItem(updatedItem);
    }
    setIsEditing(false);
  };

  // Add customized lore wiki section
  const handleAddSection = () => {
    const newSec: WikiSection = {
      id: `custom_sec_${Date.now()}`,
      title: 'Yeni Bölüm Başlığı',
      content: 'İçerik buraya yazılacak...',
      status: 'resmi'
    };
    setSections([...sections, newSec]);
  };

  const handleUpdateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDeleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  // Helper to dynamically match text with entity names and render as clickable links
  const renderWikiText = (content: string) => {
    if (!content) return <span className="italic text-stone-400 dark:text-stone-500">Henüz bilgi girilmemiş.</span>;
    
    // Grab other entities to link automatically (excluding the world details item)
    const entities = items.filter(e => e.id !== 'duzada_world_details' && !e.archived && e.area === 'duzada');
    
    if (entities.length === 0) {
      return <span className="whitespace-pre-wrap">{content}</span>;
    }
    
    // Sort entities longest title first to prevent overlapping matches (e.g. "Liman 54" vs "Liman")
    const sortedEntities = [...entities].sort((a, b) => b.title.length - a.title.length);
    const escapedTitles = sortedEntities.map(e => e.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regexStr = `\\b(${escapedTitles.join('|')})\\b`;
    
    try {
      const regex = new RegExp(regexStr, 'gi');
      const parts = content.split(regex);
      if (parts.length <= 1) return <span className="whitespace-pre-wrap">{content}</span>;
      
      return (
        <span className="whitespace-pre-wrap leading-relaxed">
          {parts.map((part, index) => {
            if (index % 2 === 1) {
              const matched = sortedEntities.find(e => e.title.toLowerCase() === part.toLowerCase());
              if (matched) {
                return (
                  <button
                    key={index}
                    onClick={(evt) => {
                      evt.preventDefault();
                      onSelectItem(matched.id);
                      setActiveTab('liste');
                    }}
                    className="text-[#D35057] dark:text-[#E76F51] hover:underline font-bold cursor-pointer inline bg-transparent p-0 border-none align-baseline text-left font-serif transition-colors"
                    title={`${matched.title} detaylarını görüntülemek için tıkla`}
                  >
                    {part}
                  </button>
                );
              }
            }
            return part;
          })}
        </span>
      );
    } catch (err) {
      return <span className="whitespace-pre-wrap">{content}</span>;
    }
  };

  // Module Connected Entity Counts
  const counts = useMemo(() => {
    return {
      kisi: items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived).length,
      mekan: items.filter(i => (i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân') && !i.archived).length,
      marka: items.filter(i => i.type === 'marka' && !i.archived).length,
      olay: items.filter(i => i.type === 'olay' && !i.archived).length,
      oyun: items.filter(i => i.type === 'map_settings' && !i.archived).length,
    };
  }, [items]);

  // Places mapped to sokaklar/mahalleler
  const placesInSokaklar = useMemo(() => {
    const map: Record<string, Item[]> = {};
    items.forEach(i => {
      if ((i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân') && !i.archived) {
        const sokakId = i.metadata?.sokakId || 'general';
        const regionId = i.metadata?.region || 'general';
        const key = sokakId !== 'general' ? sokakId : `region_${regionId}`;
        if (!map[key]) map[key] = [];
        map[key].push(i);
      }
    });
    return map;
  }, [items]);

  const getEntityIcon = (type: string, isRoom?: boolean) => {
    if (isRoom) return <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    switch (type) {
      case 'kisi':
      case 'karakter':
        return <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'mekân':
      case 'yer':
      case 'dükkân':
      case 'oda':
        return <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'marka':
        return <ShoppingBag className="w-4 h-4 text-[#D35057]" />;
      case 'olay':
        return <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Tag className="w-4 h-4 text-stone-500" />;
    }
  };

  // --- COMPLETENESS & WORLD-BUILDING PORTAL LOGIC ---

  // Helper to calculate completeness and Q&A fields for a regular Item
  const getEntityCompleteness = (item: Item) => {
    const type = item.type;
    const questions: Array<{ id: string; label: string; question: string; isFilled: boolean; value: string; fieldPath: string; readonly?: boolean }> = [];

    const checkValue = (v: any) => {
      if (v === null || v === undefined) return false;
      const s = String(v).trim();
      if (s === '') return false;
      const lower = s.toLowerCase();
      return lower !== 'belirtilmedi' && lower !== 'bilinmiyor' && lower !== 'bilinmemektedir' && lower !== 'n/a' && lower !== 'açıklanmadı';
    };

    if (type === 'kisi' || type === 'karakter') {
      const profile = (item.metadata?.profile || {}) as any;
      const brandKit = (item.metadata?.brandKit || {}) as any;
      
      questions.push({
        id: 'title',
        label: 'Karakter Adı / Unvan',
        question: 'Karakterin tam adı ve bilinen unvanı nedir?',
        isFilled: checkValue(item.title),
        value: item.title || '',
        fieldPath: 'title'
      });
      questions.push({
        id: 'notes',
        label: 'Geçmiş Hikayesi / Özgeçmiş',
        question: 'Karakterin Düzada\'daki genel geçmişi ve detaylı yaşam hikayesi nedir?',
        isFilled: checkValue(item.notes) && item.notes.length > 20,
        value: item.notes || '',
        fieldPath: 'notes'
      });
      questions.push({
        id: 'profession',
        label: 'Meslek veya Rol',
        question: 'Karakterin adadaki aktif mesleği, görevi veya rolü nedir?',
        isFilled: checkValue(profile.profession),
        value: profile.profession || '',
        fieldPath: 'metadata.profile.profession'
      });
      questions.push({
        id: 'personality',
        label: 'Mizaç ve Kişilik Özellikleri',
        question: 'Karakterin mizaç özellikleri, belirgin davranış kalıpları ve alışkanlıkları nelerdir?',
        isFilled: checkValue(profile.personality),
        value: profile.personality || '',
        fieldPath: 'metadata.profile.personality'
      });
      questions.push({
        id: 'origin',
        label: 'Köken ve Soy',
        question: 'Karakterin kökeni, ailesi, soyu veya adadaki geçmiş bağları nedir?',
        isFilled: checkValue(profile.origin),
        value: profile.origin || '',
        fieldPath: 'metadata.profile.origin'
      });
      questions.push({
        id: 'motivation',
        label: 'Ana Hedef ve Motivasyon',
        question: 'Bu karakterin adadaki ana amacı, motivasyonu veya sakladığı sırlar nelerdir?',
        isFilled: checkValue(profile.motivation),
        value: profile.motivation || '',
        fieldPath: 'metadata.profile.motivation'
      });
      questions.push({
        id: 'logoBase64',
        label: 'Profil Görseli / Tasarım',
        question: 'Karaktere ait bir profil fotoğrafı veya çizim yüklendi mi? (Bunu Wikipedia sayfasından yükleyebilirsiniz)',
        isFilled: checkValue(brandKit.logoBase64 || brandKit.selectedLogo),
        value: brandKit.logoBase64 || brandKit.selectedLogo || '',
        fieldPath: 'metadata.brandKit.logoBase64',
        readonly: true
      });

    } else if (type === 'mekân' || type === 'dükkân' || type === 'yer' || type === 'oda') {
      const profile = item.metadata?.profile || {};
      
      questions.push({
        id: 'title',
        label: 'Mekan Adı',
        question: 'Bu mekanın tam adı nedir?',
        isFilled: checkValue(item.title),
        value: item.title || '',
        fieldPath: 'title'
      });
      questions.push({
        id: 'notes',
        label: 'Mekan Detayları & Tarihçe',
        question: 'Mekanın kuruluş hikayesi, adadaki tarihi ve işleyişine dair detaylar nelerdir?',
        isFilled: checkValue(item.notes) && item.notes.length > 20,
        value: item.notes || '',
        fieldPath: 'notes'
      });
      questions.push({
        id: 'shopType',
        label: 'Mekan Türü',
        question: 'Bu mekanın işlevi veya türü nedir (bar, otel odası, fırın, kayalık, deniz feneri vb.)?',
        isFilled: checkValue(profile.shopType),
        value: profile.shopType || '',
        fieldPath: 'metadata.profile.shopType'
      });
      questions.push({
        id: 'manager',
        label: 'Mekan Sorumlusu veya Sahibi',
        question: 'Mekanı işleten, mülk sahibi olan ya da oradan sorumlu olan kişi kimdir?',
        isFilled: checkValue(profile.manager),
        value: profile.manager || '',
        fieldPath: 'metadata.profile.manager'
      });
      questions.push({
        id: 'style',
        label: 'Mimari Stil ve Görünüm',
        question: 'Mekanın dış ve iç mimari tarzı, dekorasyonu ve adadaki genel görünümü nasıldır?',
        isFilled: checkValue(profile.style),
        value: profile.style || '',
        fieldPath: 'metadata.profile.style'
      });
      questions.push({
        id: 'secrets',
        label: 'Önemli Sırlar & Gizemler',
        question: 'Bu mekanda saklanan gizli bölmeler, sırlar veya dedikodular nelerdir?',
        isFilled: checkValue(profile.secrets),
        value: profile.secrets || '',
        fieldPath: 'metadata.profile.secrets'
      });
      questions.push({
        id: 'region',
        label: 'Mahalle / Coğrafi Bölge',
        question: 'Bu mekan adanın hangi coğrafi bölgesinde veya mahallesinde yer alıyor? (örn: liman, kuzey, orman vb.)',
        isFilled: checkValue(item.metadata?.region) && item.metadata?.region !== 'belirlenmemiş',
        value: item.metadata?.region || '',
        fieldPath: 'metadata.region'
      });

    } else if (type === 'marka' || type === 'kulüp') {
      const profile = (item.metadata?.profile || {}) as any;
      const brandKit = (item.metadata?.brandKit || {}) as any;
      
      questions.push({
        id: 'title',
        label: 'Organizasyon / Kulüp Adı',
        question: 'Bu kuruluşun, kulübün veya markanın tam adı nedir?',
        isFilled: checkValue(item.title),
        value: item.title || '',
        fieldPath: 'title'
      });
      questions.push({
        id: 'notes',
        label: 'Tarihçe ve Manifesto',
        question: 'Organizasyonun adadaki nüfuzu, tarihi ve kuruluş manifestosu nedir?',
        isFilled: checkValue(item.notes) && item.notes.length > 20,
        value: item.notes || '',
        fieldPath: 'notes'
      });
      questions.push({
        id: 'purpose',
        label: 'Kuruluş Amacı ve Misyon',
        question: 'Bu kulüp veya markanın var oluş amacı ve adadaki ana misyonu nedir?',
        isFilled: checkValue(profile.purpose),
        value: profile.purpose || '',
        fieldPath: 'metadata.profile.purpose'
      });
      questions.push({
        id: 'leader',
        label: 'Liderlik ve Yönetim Yapısı',
        question: 'Organizasyonu yöneten lider, kurucu meclis veya hiyerarşik yapı nasıldır?',
        isFilled: checkValue(profile.leader),
        value: profile.leader || '',
        fieldPath: 'metadata.profile.leader'
      });
      questions.push({
        id: 'secrecy',
        label: 'Gizlilik Derecesi ve Üyeler',
        question: 'Organizasyonun gizlilik derecesi nedir? Üyelik şartları ve üye yapısı nasıldır?',
        isFilled: checkValue(profile.secrecy),
        value: profile.secrecy || '',
        fieldPath: 'metadata.profile.secrecy'
      });
      questions.push({
        id: 'logo',
        label: 'Görsel Kimlik / Logo',
        question: 'Organizasyona ait bir amblem, logo veya sembol yüklendi mi? (Bunu Wikipedia sayfasından yükleyebilirsiniz)',
        isFilled: checkValue(brandKit.logoBase64 || brandKit.selectedLogo),
        value: brandKit.logoBase64 || brandKit.selectedLogo || '',
        fieldPath: 'metadata.brandKit.logoBase64',
        readonly: true
      });

    } else if (type === 'olay') {
      const profile = item.metadata?.profile || {};
      
      questions.push({
        id: 'title',
        label: 'Olay / Şenlik Adı',
        question: 'Bu tarihi olayın veya şenliğin adı nedir?',
        isFilled: checkValue(item.title),
        value: item.title || '',
        fieldPath: 'title'
      });
      questions.push({
        id: 'notes',
        label: 'Olay Gelişimi & Hikayesi',
        question: 'Olayın detaylı gelişi, nasıl sonuçlandığı ve adada bıraktığı miras nedir?',
        isFilled: checkValue(item.notes) && item.notes.length > 20,
        value: item.notes || '',
        fieldPath: 'notes'
      });
      questions.push({
        id: 'date',
        label: 'Gerçekleşme Tarihi',
        question: 'Olay ne zaman, hangi yıl veya hangi sezonda gerçekleşti? (örn: 12 Eylül, Her Ekinoks vb.)',
        isFilled: checkValue(item.metadata?.date),
        value: item.metadata?.date || '',
        fieldPath: 'metadata.date'
      });
      questions.push({
        id: 'recurrence',
        label: 'Tekrarlanma Düzeni',
        question: 'Bu olay periyodik olarak tekrarlanıyor mu (yıllık, her ekinoksta vb.) yoksa tek seferlik mi?',
        isFilled: checkValue(item.metadata?.recurrence),
        value: item.metadata?.recurrence || '',
        fieldPath: 'metadata.recurrence'
      });
      questions.push({
        id: 'manager', // stores actors on profile
        label: 'Ana Aktörler / Katılımcılar',
        question: 'Olayın merkezindeki ana karakterler, kulüpler veya tanıklar kimlerdir?',
        isFilled: checkValue(profile.manager),
        value: profile.manager || '',
        fieldPath: 'metadata.profile.manager'
      });

    } else if (type === 'ürün' || type === 'drop') {
      const profile = item.metadata?.profile || {};
      
      questions.push({
        id: 'title',
        label: 'Eşya / Ürün Adı',
        question: 'Bu kurgusal eşyanın veya drop ürününün adı nedir?',
        isFilled: checkValue(item.title),
        value: item.title || '',
        fieldPath: 'title'
      });
      questions.push({
        id: 'notes',
        label: 'Eşyanın Bulunuş Hikayesi ve Efsanesi',
        question: 'Eşyanın evrendeki hikayesi, kökeni ve adalılar arasındaki önemi nedir?',
        isFilled: checkValue(item.notes) && item.notes.length > 20,
        value: item.notes || '',
        fieldPath: 'notes'
      });
      questions.push({
        id: 'rarity',
        label: 'Nadirlik Derecesi',
        question: 'Eşyanın evrendeki nadirlik veya bulunabilirlik derecesi nedir (Efsanevi, Sıradan, Eşsiz vb.)?',
        isFilled: checkValue(profile.rarity),
        value: profile.rarity || '',
        fieldPath: 'metadata.profile.rarity'
      });
      questions.push({
        id: 'material',
        label: 'Köken / Malzeme Yapısı',
        question: 'Eşya hangi malzemelerden yapılmıştır veya kökeni nereye dayanmaktadır?',
        isFilled: checkValue(profile.material),
        value: profile.material || '',
        fieldPath: 'metadata.profile.material'
      });
      questions.push({
        id: 'function',
        label: 'Ana İşlevi ve Gizli Gücü',
        question: 'Eşyanın kurguda üstlendiği ana işlev, kilit rol veya gizli kullanım amacı nedir?',
        isFilled: checkValue(profile.function),
        value: profile.function || '',
        fieldPath: 'metadata.profile.function'
      });
    }

    const questionsCount = questions.length;
    const filledCount = questions.filter(q => q.isFilled).length;
    const score = questionsCount > 0 ? Math.round((filledCount / questionsCount) * 100) : 100;

    return { score, questionsCount, filledCount, questions };
  };

  const getMahalleCompleteness = (mah: { id: string; name: string; summary?: string }) => {
    const checkValue = (v: any) => v && String(v).trim().length > 15;
    const questions: Array<{ id: string; label: string; question: string; isFilled: boolean; value: string; fieldPath: string; readonly?: boolean }> = [
      {
        id: 'name',
        label: 'Mahalle / Köy Adı',
        question: 'Mahalle veya köyün resmi adı tam olarak nedir?',
        isFilled: !!mah.name,
        value: mah.name || '',
        fieldPath: 'name'
      },
      {
        id: 'summary',
        label: 'Mahalle Açıklaması & Kültürü',
        question: 'Bu mahallenin genel kültürü, adadaki konumu, yerel tarihi ve nüfusu nedir?',
        isFilled: checkValue(mah.summary),
        value: mah.summary || '',
        fieldPath: 'summary'
      }
    ];
    const questionsCount = questions.length;
    const filledCount = questions.filter(q => q.isFilled).length;
    const score = questionsCount > 0 ? Math.round((filledCount / questionsCount) * 100) : 100;
    return { score, questionsCount, filledCount, questions };
  };

  const getSokakCompleteness = (sok: { id: string; name: string; mahalleId: string }) => {
    const connectedPlaces = items.filter(e => e.metadata?.sokakId === sok.id && !e.archived);
    const questions: Array<{ id: string; label: string; question: string; isFilled: boolean; value: string; fieldPath: string; readonly?: boolean }> = [
      {
        id: 'name',
        label: 'Sokak / Cadde Adı',
        question: 'Sokağın adı nedir?',
        isFilled: !!sok.name,
        value: sok.name || '',
        fieldPath: 'name'
      },
      {
        id: 'places',
        label: 'Sokağa Bağlı Mekanlar',
        question: 'Bu sokak üzerinde kayıtlı en az bir mekan veya dükkan bulunuyor mu?',
        isFilled: connectedPlaces.length > 0,
        value: connectedPlaces.map(p => p.title).join(', ') || 'Kayıtlı mekan bulunamadı.',
        fieldPath: 'places',
        readonly: true
      }
    ];
    const questionsCount = questions.length;
    const filledCount = questions.filter(q => q.isFilled).length;
    const score = questionsCount > 0 ? Math.round((filledCount / questionsCount) * 100) : 100;
    return { score, questionsCount, filledCount, questions };
  };

  // Compile entire completeness universe
  const completenessList = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: string;
      subType: 'entity' | 'mahalle' | 'sokak';
      score: number;
      filledCount: number;
      questionsCount: number;
      originalItem: any;
    }> = [];

    // Add regular wiki items (filter out world details)
    items.forEach(item => {
      if (item.id === 'duzada_world_details' || item.archived || item.isProposal) return;
      if (item.area !== 'duzada') return;
      
      const comp = getEntityCompleteness(item);
      list.push({
        id: item.id,
        title: item.title,
        type: item.type === 'kisi' || item.type === 'karakter' ? 'Kişi' : item.type === 'marka' || item.type === 'kulüp' ? 'Marka' : item.type === 'olay' ? 'Olay' : item.type === 'ürün' ? 'Ürün' : 'Mekân',
        subType: 'entity',
        score: comp.score,
        filledCount: comp.filledCount,
        questionsCount: comp.questionsCount,
        originalItem: item
      });
    });

    // Add mahalleler
    mahalleler.forEach(mah => {
      const comp = getMahalleCompleteness(mah);
      list.push({
        id: mah.id,
        title: mah.name,
        type: 'Mahalle',
        subType: 'mahalle',
        score: comp.score,
        filledCount: comp.filledCount,
        questionsCount: comp.questionsCount,
        originalItem: mah
      });
    });

    // Add sokaklar
    sokaklar.forEach(sok => {
      const comp = getSokakCompleteness(sok);
      list.push({
        id: sok.id,
        title: sok.name,
        type: 'Sokak',
        subType: 'sokak',
        score: comp.score,
        filledCount: comp.filledCount,
        questionsCount: comp.questionsCount,
        originalItem: sok
      });
    });

    return list;
  }, [items, mahalleler, sokaklar]);

  // Global aggregate stats
  const overallCompleteness = useMemo(() => {
    if (completenessList.length === 0) return 0;
    const totalScore = completenessList.reduce((acc, item) => acc + item.score, 0);
    return Math.round(totalScore / completenessList.length);
  }, [completenessList]);

  const stats = useMemo(() => {
    return {
      completed: completenessList.filter(i => i.score >= 80).length,
      developing: completenessList.filter(i => i.score < 80).length,
    };
  }, [completenessList]);

  // Filtering for Completeness Panel
  const filteredCompletenessList = useMemo(() => {
    return completenessList.filter(item => {
      if (compFilterType !== 'Hepsi') {
        if (compFilterType === 'Kişi' && item.type !== 'Kişi') return false;
        if (compFilterType === 'Mekân' && item.type !== 'Mekân') return false;
        if (compFilterType === 'Marka' && item.type !== 'Marka') return false;
        if (compFilterType === 'Olay' && item.type !== 'Olay') return false;
        if (compFilterType === 'Ürün' && item.type !== 'Ürün') return false;
        if (compFilterType === 'Mahalle' && item.type !== 'Mahalle') return false;
        if (compFilterType === 'Sokak' && item.type !== 'Sokak') return false;
      }

      if (compSearchQuery.trim()) {
        const query = compSearchQuery.toLowerCase();
        return item.title.toLowerCase().includes(query) || item.type.toLowerCase().includes(query);
      }

      return true;
    });
  }, [completenessList, compSearchQuery, compFilterType]);

  // Synchronize state when selected completeness entity changes
  React.useEffect(() => {
    if (!selectedCompletenessId) {
      setAnswersState({});
      return;
    }

    const current = completenessList.find(c => c.id === selectedCompletenessId);
    if (!current) return;

    if (current.subType === 'entity') {
      const item = current.originalItem as Item;
      const profile = item.metadata?.profile || {};
      const comp = getEntityCompleteness(item);
      const initialAnswers: Record<string, string> = {};
      
      comp.questions.forEach(q => {
        if (!q.readonly) {
          if (q.id === 'title') {
            initialAnswers[q.id] = item.title || '';
          } else if (q.id === 'notes') {
            initialAnswers[q.id] = item.notes || '';
          } else if (q.id === 'region') {
            initialAnswers[q.id] = item.metadata?.region || '';
          } else {
            initialAnswers[q.id] = profile[q.id] || '';
          }
        }
      });
      setAnswersState(initialAnswers);
      setSelectedCompletenessType('entity');
    } else if (current.subType === 'mahalle') {
      const mah = current.originalItem;
      setAnswersState({
        name: mah.name || '',
        summary: mah.summary || ''
      });
      setSelectedCompletenessType('mahalle');
    } else if (current.subType === 'sokak') {
      const sok = current.originalItem;
      setAnswersState({
        name: sok.name || ''
      });
      setSelectedCompletenessType('sokak');
    }
  }, [selectedCompletenessId, items]);

  const getCatKeyFromCompFilter = (filter: string): string => {
    const f = filter.toLowerCase();
    if (f === 'kişi' || f === 'kişiler') return 'kisi';
    if (f === 'mekân' || f === 'mekânlar') return 'mekan';
    if (f === 'marka' || f === 'markalar') return 'marka';
    if (f === 'olay' || f === 'olaylar') return 'olay';
    if (f === 'ürün' || f === 'ürünler') return 'urun';
    if (f === 'mahalle' || f === 'mahalleler') return 'yer';
    if (f === 'sokak' || f === 'sokaklar') return 'yer';
    return 'kisi';
  };

  const getQuestionsForCategory = (catKey: string): Array<{ id: string; label: string; question: string; fieldPath: string }> => {
    const configItem = items.find(i => i.id === 'wiki_questions_config');
    const config = configItem?.metadata?.questionsByCat;
    if (config && config[catKey]) {
      return config[catKey];
    }
    return DEFAULT_QUESTIONS_BY_CAT[catKey] || [];
  };

  const getValueByPath = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const setValueByPath = (obj: any, path: string, val: any) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = val;
  };

  const handleStartEditingQuestions = () => {
    const catKey = getCatKeyFromCompFilter(compFilterType);
    const currentQuestions = getQuestionsForCategory(catKey);
    setEditingQuestionsList([...currentQuestions]);
    setIsEditingQuestions(true);
    setSelectedCompletenessId(null);
  };

  const handleSaveQuestions = async () => {
    setSaveStatus('saving');
    try {
      const catKey = getCatKeyFromCompFilter(compFilterType);
      
      let configItem = items.find(i => i.id === 'wiki_questions_config');
      if (!configItem) {
        const existingItemWithUserId = items.find(i => i.userId);
        const userId = existingItemWithUserId?.userId || '';
        configItem = {
          id: 'wiki_questions_config',
          title: 'Wiki Questions Config',
          area: 'duzada' as AreaType,
          type: 'map_settings' as ItemType,
          notes: 'Düzada Wiki Questions category configuration',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          archived: false,
          isProposal: false,
          userId,
          status: 'Bitti',
          priority: 'düşük',
          tags: ['config'],
          links: [],
          images: [],
          metadata: {
            questionsByCat: {}
          }
        };
      }

      const questionsByCat = { ...(configItem.metadata?.questionsByCat || {}) };
      questionsByCat[catKey] = editingQuestionsList;

      const updatedConfigItem = {
        ...configItem,
        metadata: {
          ...configItem.metadata,
          questionsByCat
        }
      };

      if (items.some(i => i.id === 'wiki_questions_config')) {
        await onUpdateItem(updatedConfigItem);
      } else {
        await onAddItem(updatedConfigItem);
      }

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditingQuestions(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to save questions config', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const handleResetQuestionsToDefault = () => {
    const catKey = getCatKeyFromCompFilter(compFilterType);
    const defaults = DEFAULT_QUESTIONS_BY_CAT[catKey] || [];
    setEditingQuestionsList([...defaults]);
  };

  const handleSaveCompleteness = async (id: string, subType: 'entity' | 'mahalle' | 'sokak') => {
    setSaveStatus('saving');
    try {
      if (subType === 'entity') {
        const original = items.find(i => i.id === id);
        if (!original) throw new Error('Item not found');

        let updatedItem = JSON.parse(JSON.stringify(original)); // deep clone

        const comp = getEntityCompleteness(original);
        comp.questions.forEach(q => {
          if (!q.readonly && answersState[q.id] !== undefined) {
            setValueByPath(updatedItem, q.fieldPath, answersState[q.id]);
          }
        });

        await onUpdateItem(updatedItem);
      } else if (subType === 'mahalle') {
        const mapSettings = items.find(i => i.type === 'map_settings');
        if (mapSettings) {
          const updatedMahalleler = mapSettings.metadata?.mahalleler?.map((m: any) => {
            if (m.id === id) {
              return {
                ...m,
                name: answersState['name'] !== undefined ? answersState['name'] : m.name,
                summary: answersState['summary'] !== undefined ? answersState['summary'] : m.summary
              };
            }
            return m;
          }) || [];
          
          await onUpdateItem({
            ...mapSettings,
            metadata: {
              ...mapSettings.metadata,
              mahalleler: updatedMahalleler,
              neighborhoods: updatedMahalleler.map((m: any) => ({ id: m.id, name: m.name, regionId: m.id }))
            }
          });
        }
      } else if (subType === 'sokak') {
        const mapSettings = items.find(i => i.type === 'map_settings');
        if (mapSettings) {
          const updatedSokaklar = mapSettings.metadata?.sokaklar?.map((s: any) => {
            if (s.id === id) {
              return {
                ...s,
                name: answersState['name'] !== undefined ? answersState['name'] : s.name
              };
            }
            return s;
          }) || [];
          
          await onUpdateItem({
            ...mapSettings,
            metadata: {
              ...mapSettings.metadata,
              sokaklar: updatedSokaklar,
              roads: updatedSokaklar.map((s: any) => ({ id: s.id, name: s.name }))
            }
          });
        }
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Wiki Dashboard Header */}
      <div className="bg-[#FBF9F6] dark:bg-[#111A2E] border border-[#CFC5B4] dark:border-[#2C3C72] p-6 rounded-xl archive-shadow paper-grain relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Globe className="w-48 h-48 text-[#1B2A4A] dark:text-[#FAF8F5]" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold">
              <Compass className="w-3.5 h-3.5 text-[#D35057]" />
              <span>DÜZADA COĞRAFYA & EVREN ATLASI</span>
            </div>
            <h2 className="font-serif font-bold text-3xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1.5 leading-tight">
              Düzada Dünyası Wiki
            </h2>
            <p className="text-xs text-[#9A8C76] dark:text-[#A6B0C9] mt-1 font-serif italic">
              Tüm karakterler, markalar, konumlar ve sırlar arasındaki bağları barındıran kurgusal şemsiye evren.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              className={`flex items-center gap-2 text-xs font-mono px-4 py-2.5 rounded-lg transition-all cursor-pointer font-bold ${
                isEditing 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                  : 'bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#1E293B] dark:hover:bg-[#334155] border border-[#CFC5B4] dark:border-[#384260] text-[#6A5E4C] dark:text-[#F3EFE8]'
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Değişiklikleri Kaydet</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Dünyayı Düzenle</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATOR: Atlas Library vs. Completeness & Q&A Portal */}
      <div className="flex border-b border-[#CFC5B4]/50 dark:border-[#2C3C72]/50 pb-px font-sans">
        <button
          onClick={() => setActiveSubTab('atlas')}
          className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider py-3 px-6 font-bold border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'atlas'
              ? 'border-[#D35057] text-[#1B2A4A] dark:text-[#F3EFE8] bg-stone-100/50 dark:bg-[#17345A]/20'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D35057]" />
          <span>Düzada Ansiklopedisi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('doluluk')}
          className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider py-3 px-6 font-bold border-b-2 cursor-pointer transition-all relative ${
            activeSubTab === 'doluluk'
              ? 'border-[#D35057] text-[#1B2A4A] dark:text-[#F3EFE8] bg-stone-100/50 dark:bg-[#17345A]/20'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Evren Doluluk Portalı</span>
          <span className="absolute -top-1 -right-1 text-[9px] bg-[#D35057] text-white px-1 py-0.5 rounded-full scale-90 font-bold">
            %{overallCompleteness}
          </span>
        </button>
      </div>

      {/* TAB 1: ORIGINAL ATLAS VIEW */}
      {activeSubTab === 'atlas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns (Genel Bakış & Lore Arka Plan) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section 1: Genel Bakış */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-6 rounded-xl archive-shadow paper-grain space-y-4">
              <div className="border-b border-[#CFC5B4]/40 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#D35057]" />
                  <h3 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8]">
                    Genel Bakış ve Tanım
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#1B2A4A]/5 dark:bg-[#2C3C72]/40 text-[#6A5E4C] dark:text-[#A6B0C9] px-2 py-0.5 rounded font-bold">
                  Giriş Paragrafı
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] font-bold">LORE ÖZETİ & DETAYLI GİRİŞ</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-48 p-3 text-sm rounded-lg bg-white dark:bg-[#12224A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] font-serif focus:ring-1 focus:ring-[#D35057] focus:outline-none leading-relaxed"
                    placeholder="Düzada evrenine dair genel lore özeti..."
                  />
                </div>
              ) : (
                <div className="text-stone-800 dark:text-[#FAF8F5] font-serif text-sm leading-relaxed whitespace-pre-wrap">
                  {renderWikiText(notes)}
                </div>
              )}
            </div>

            {/* Section 2: Lore & Arka Plan parametreleri */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-6 rounded-xl archive-shadow paper-grain space-y-5">
              <div className="border-b border-[#CFC5B4]/40 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D35057]" />
                  <h3 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8]">
                    Kanonik Lore & Atmosfer
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-bold">
                  Düzada Kanonu
                </span>
              </div>

              {/* Bento metadata grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-stone-50 dark:bg-[#12224A]/30 border border-stone-200 dark:border-[#2C3C72]/50 p-3.5 rounded-lg">
                  <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase block font-bold">📅 AKTİF DÖNEM & SEZON</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={activeEra}
                      onChange={(e) => setActiveEra(e.target.value)}
                      className="mt-1.5 w-full p-2 text-xs rounded border border-[#CFC5B4] bg-white dark:bg-[#12224A] text-[#1B2A4A] dark:text-[#F3EFE8] focus:outline-none"
                      placeholder="örn: Ekim 2003, 'Sezon Sonu'"
                    />
                  ) : activeEra ? (
                    <span className="font-serif text-base font-bold text-[#1B2A4A] dark:text-[#F3EFE8] mt-1 block">{activeEra}</span>
                  ) : null}
                </div>

                <div className="bg-stone-50 dark:bg-[#12224A]/30 border border-stone-200 dark:border-[#2C3C72]/50 p-3.5 rounded-lg">
                  <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase block font-bold">🌡️ İKLİM VE COĞRAFİ KONUM</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={climate}
                      onChange={(e) => setClimate(e.target.value)}
                      className="mt-1.5 w-full p-2 text-xs rounded border border-[#CFC5B4] bg-white dark:bg-[#12224A] text-[#1B2A4A] dark:text-[#F3EFE8] focus:outline-none"
                      placeholder="örn: Ege / Akdeniz Mikrokliması"
                    />
                  ) : climate ? (
                    <span className="font-serif text-base font-bold text-[#1B2A4A] dark:text-[#F3EFE8] mt-1 block">{climate}</span>
                  ) : null}
                </div>

                <div className="bg-stone-50 dark:bg-[#12224A]/30 border border-stone-200 dark:border-[#2C3C72]/50 p-3.5 rounded-lg sm:col-span-2">
                  <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase block font-bold">🌌 ESTETİK VE ATMOSFER</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={atmosphere}
                      onChange={(e) => setAtmosphere(e.target.value)}
                      className="mt-1.5 w-full p-2 text-xs rounded border border-[#CFC5B4] bg-white dark:bg-[#12224A] text-[#1B2A4A] dark:text-[#F3EFE8] focus:outline-none"
                      placeholder="örn: Melankolik, Sezon Sonu, Sisli ve Gizemli"
                    />
                  ) : atmosphere ? (
                    <span className="font-serif text-base font-bold text-[#1B2A4A] dark:text-[#F3EFE8] mt-1 block">{atmosphere}</span>
                  ) : null}
                </div>

              </div>

              {/* Custom Wiki Sections */}
              <div className="pt-4 border-t border-[#CFC5B4]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] font-bold">KÜTÜPHANE ALT BÖLÜMLERİ</span>
                  {isEditing && (
                    <button
                      onClick={handleAddSection}
                      className="text-[10px] font-mono font-bold bg-[#D35057] hover:bg-[#B23A40] text-white px-2.5 py-1 rounded cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Bölüm Ekle
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {sections.map((sec) => (
                    <div key={sec.id} className="border-l-2 border-[#D35057] pl-4 py-1 space-y-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => handleUpdateSection(sec.id, 'title', e.target.value)}
                              className="font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8] bg-transparent border-b border-[#CFC5B4] focus:border-[#D35057] focus:outline-none py-0.5 text-sm flex-1"
                              placeholder="Bölüm Başlığı"
                            />
                            <button
                              onClick={() => handleDeleteSection(sec.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <textarea
                            value={sec.content}
                            onChange={(e) => handleUpdateSection(sec.id, 'content', e.target.value)}
                            className="w-full text-xs p-2 rounded bg-white dark:bg-[#12224A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] font-serif focus:outline-none"
                            rows={3}
                            placeholder="Bölüm içeriği..."
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">
                            {sec.title}
                          </h4>
                          <div className="text-xs text-stone-600 dark:text-[#A6B0C9] leading-relaxed font-serif whitespace-pre-wrap">
                            {renderWikiText(sec.content)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {sections.length === 0 && (
                    <span className="text-xs font-serif text-stone-400 italic block">Tanımlanmış bir kütüphane alt bölümü bulunmuyor.</span>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Right Columns (Ansiklopedi Portal, Arama, Coğrafi Dizin) */}
          <div className="space-y-6">
            
            {/* Section 3: Harita Girişi */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain relative group overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-[#D35057]/10 dark:bg-[#D35057]/5 rounded-full blur-xl pointer-events-none transition-all group-hover:scale-125" />
              
              <div className="flex items-center gap-2 mb-3">
                <Map className="w-5 h-5 text-[#D35057]" />
                <h4 className="font-serif font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8]">
                  Harita Arayüzü Portal
                </h4>
              </div>

              <div className="bg-[#E7EBE6] dark:bg-[#0F172A] border border-[#B9C7BD] dark:border-[#334155] rounded-lg p-3 text-center relative overflow-hidden aspect-video flex flex-col items-center justify-center space-y-2">
                <div className="absolute inset-0 opacity-15 pointer-events-none select-none flex items-center justify-center">
                  <MapPinned className="w-24 h-24 text-emerald-800 dark:text-stone-400" />
                </div>
                
                <div className="relative z-10">
                  <span className="text-[10px] font-mono text-[#4A5E68] dark:text-[#A6B0C9] block font-bold">KARTOGRAFİK PLATO</span>
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-serif block mt-1">
                    Harita üzerinde aktif konum ve pinleri görselleştirin.
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('harita')}
                  className="relative z-10 px-3.5 py-1.5 bg-[#1B2A4A] hover:bg-[#111A2E] dark:bg-[#D35057] dark:hover:bg-[#B23A40] text-white text-[10px] font-mono rounded-md font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span>Düzada Haritasını Aç</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Section 4: Ansiklopedi & Arama */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain space-y-4">
              <div className="border-b border-[#CFC5B4]/40 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4.5 h-4.5 text-[#D35057]" />
                  <h4 className="font-serif font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8]">
                    Ansiklopedi &amp; Arama
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-[#D35057]/10 text-[#D35057] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Dizin
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={wikiSearchQuery}
                  onChange={(e) => setWikiSearchQuery(e.target.value)}
                  placeholder="İsim, bilgi veya etiket ara..."
                  className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded-lg pl-8 pr-3 py-2 focus:ring-1 focus:ring-[#D35057] focus:outline-hidden font-sans"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
              </div>

              {/* Filter Pills and Sorting */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#CFC5B4]/20 pb-2">
                <div className="flex flex-wrap gap-1 font-sans">
                  {(['hepsi', 'kisi', 'mekân', 'yer', 'marka', 'olay', 'oda'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setWikiSelectedFilter(filter)}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        wikiSelectedFilter === filter
                          ? 'bg-[#D35057] text-white'
                          : 'bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#1E293B]/60 border border-[#CFC5B4]/40 dark:border-[#384260] text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {filter === 'hepsi' ? 'Tümü' : filter === 'kisi' ? 'Kişi' : filter === 'mekân' ? 'Mekân' : filter === 'marka' ? 'Marka' : filter === 'olay' ? 'Olay' : 'Oda'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
                  <span className="text-[9px] font-mono text-stone-400">Sırala:</span>
                  <select
                    value={wikiSortBy}
                    onChange={(e) => setWikiSortBy(e.target.value as 'name' | 'completeness')}
                    className="text-[10px] font-mono bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    <option value="name">A-Z Alfabetik</option>
                    <option value="completeness">Doluluk Oranı</option>
                  </select>
                </div>
              </div>

              {/* List Results */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredWikiItems.map((item) => {
                  const isRoom = item.type === 'oda' || item.tags?.includes('oda') || item.id.startsWith('kemskoy_room_');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectItem(item.id);
                        setActiveTab('liste');
                      }}
                      className="w-full flex items-start gap-3 p-2.5 bg-white hover:bg-stone-50 dark:bg-[#111A2E]/50 dark:hover:bg-[#111A2E]/80 border border-stone-200 dark:border-[#2C3C72] rounded-lg transition-all text-left cursor-pointer group"
                    >
                      <div className="p-1.5 bg-stone-100 dark:bg-[#1b2a4a]/40 rounded shrink-0 group-hover:bg-[#D35057]/10 transition-all">
                        {getEntityIcon(item.type, isRoom)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-serif font-bold text-stone-800 dark:text-stone-200 block truncate group-hover:text-[#D35057] transition-colors">{item.title}</span>
                          {item.priority === 'yüksek' && (
                            <span className="text-[9px] text-[#D35057] font-mono">★</span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 font-serif line-clamp-1 mt-0.5">
                          {item.notes || 'Açıklama bulunmuyor.'}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {filteredWikiItems.length === 0 && (
                  <div className="text-center py-8 text-stone-400 dark:text-stone-500 font-serif italic text-xs">
                    Aranan kriterlere uygun varlık bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Coğrafya Nested Tree */}
            <div className="bg-[#FAF8F5] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain space-y-4">
              <h4 className="font-serif font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8] border-b border-[#CFC5B4]/40 pb-2 flex items-center gap-2">
                <Trees className="w-4 h-4 text-[#D35057]" />
                <span>Coğrafi Yerleşim Ağacı</span>
              </h4>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {mahalleler.map((m) => {
                  const neighborhoodSokaklar = sokaklar.filter(s => s.mahalleId === m.id);
                  const regionMekansWithoutStreet = placesInSokaklar[`region_${m.id}`] || [];

                  return (
                    <div key={m.id} className="space-y-2 border-l-2 border-stone-200 dark:border-stone-800 pl-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8] tracking-tight">{m.name}</span>
                        <span className="text-[9px] font-mono text-stone-400 font-semibold uppercase">Mahalle</span>
                      </div>

                      <div className="space-y-1.5 pl-2.5">
                        {neighborhoodSokaklar.map((sok) => {
                          const streetPlaces = placesInSokaklar[sok.id] || [];

                          return (
                            <div key={sok.id} className="space-y-1">
                              <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 block font-semibold">↳ {sok.name}</span>
                              
                              <div className="pl-3.5 space-y-1">
                                {streetPlaces.map((pl) => (
                                  <button
                                    key={pl.id}
                                    onClick={() => {
                                      onSelectItem(pl.id);
                                      setActiveTab('liste');
                                    }}
                                    className="flex items-center gap-1.5 text-xs text-[#D35057] dark:text-[#E76F51] hover:underline cursor-pointer text-left font-serif"
                                  >
                                    <MapPin className="w-3 h-3 shrink-0 text-stone-400" />
                                    <span>{pl.title}</span>
                                  </button>
                                ))}
                                
                                {streetPlaces.length === 0 && (
                                  <span className="text-[9px] font-mono text-stone-400 dark:text-stone-600 italic block pl-4">Kayıtlı mekan yok</span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {regionMekansWithoutStreet.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-stone-400 block italic">↳ Diğer Konumlar</span>
                            <div className="pl-3.5 space-y-1">
                              {regionMekansWithoutStreet.map((pl) => (
                                <button
                                  key={pl.id}
                                  onClick={() => {
                                    onSelectItem(pl.id);
                                    setActiveTab('liste');
                                  }}
                                  className="flex items-center gap-1.5 text-xs text-[#D35057] dark:text-[#E76F51] hover:underline cursor-pointer text-left font-serif"
                                >
                                  <MapPin className="w-3 h-3 shrink-0 text-stone-400" />
                                  <span>{pl.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {neighborhoodSokaklar.length === 0 && regionMekansWithoutStreet.length === 0 && (
                          <span className="text-[9px] font-mono text-stone-400 dark:text-stone-600 italic block">Sokak veya konum eklenmemiş</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: BRAND NEW WORLD COMPLETENESS PORTAL */}
      {activeSubTab === 'doluluk' && (
        <div className="space-y-6">
          
          {/* Bento Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
            
            {/* Global Completeness Circle */}
            <div className="bg-[#FBF9F6] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-stone-400 dark:text-stone-400 uppercase font-bold tracking-wider block">
                  Genel Evren Doluluğu
                </span>
                <span className="text-xs text-stone-600 dark:text-stone-300 block font-serif mt-1">
                  Kurgunun tutarlılığı & merch temelleri.
                </span>
              </div>
              
              <div className="relative flex items-center justify-center shrink-0 w-16 h-16 rounded-full border-4 border-stone-200 dark:border-[#2C3C72]">
                <div 
                  className="absolute inset-0 rounded-full border-4 border-emerald-500"
                  style={{ clipPath: `polygon(0 0, 100% 0, 100% ${overallCompleteness}%, 0 ${overallCompleteness}%)` }}
                />
                <span className="text-base font-bold font-mono text-[#1B2A4A] dark:text-[#F3EFE8]">
                  %{overallCompleteness}
                </span>
              </div>
            </div>

            {/* Filled Count */}
            <div className="bg-[#FBF9F6] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-stone-400 dark:text-stone-400 uppercase font-bold tracking-wider block">
                  Dolu Varlık Sayısı (%80+)
                </span>
                <span className="text-2xl font-bold font-mono text-[#1B2A4A] dark:text-[#F3EFE8] block mt-0.5">
                  {stats.completed} <span className="text-xs font-normal text-stone-400">varlık</span>
                </span>
              </div>
            </div>

            {/* Developing Count */}
            <div className="bg-[#FBF9F6] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain flex items-center gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-stone-400 dark:text-stone-400 uppercase font-bold tracking-wider block">
                  Geliştirilecek Eksikler
                </span>
                <span className="text-2xl font-bold font-mono text-[#1B2A4A] dark:text-[#F3EFE8] block mt-0.5">
                  {stats.developing} <span className="text-xs font-normal text-stone-400">varlık</span>
                </span>
              </div>
            </div>

          </div>

          {/* Master Detail Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel: Entity Selection and Filters */}
            <div className="lg:col-span-1 bg-[#FAF8F5] dark:bg-[#1E293B]/40 border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain space-y-4">
              <div className="border-b border-[#CFC5B4]/40 pb-2 flex items-center gap-2">
                <Search className="w-4.5 h-4.5 text-[#D35057]" />
                <h4 className="font-serif font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8]">
                  Varlık &amp; Detay Dizinleri
                </h4>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={compSearchQuery}
                  onChange={(e) => setCompSearchQuery(e.target.value)}
                  placeholder="Varlıklarda ara..."
                  className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded-lg pl-8 pr-3 py-2 focus:ring-1 focus:ring-[#D35057] focus:outline-hidden font-sans"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
              </div>

              {/* Category selector pills */}
              <div className="flex flex-wrap gap-1.5 font-sans">
                {['Hepsi', 'Kişi', 'Mekân', 'Marka', 'Olay', 'Ürün', 'Mahalle', 'Sokak'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCompFilterType(cat)}
                    className={`px-2 py-1 text-[10px] font-mono rounded-md font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      compFilterType === cat
                        ? 'bg-[#D35057] text-white'
                        : 'bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#1E293B]/60 border border-[#CFC5B4]/40 dark:border-[#384260] text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {compFilterType !== 'Hepsi' && (
                <button
                  onClick={handleStartEditingQuestions}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isEditingQuestions
                      ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 border-stone-200 dark:bg-[#1E293B]/60 dark:hover:bg-[#1E293B]/80 dark:border-[#2C3C72] text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingQuestions ? 'Soruları Düzenleme Modu Aktif' : `"${compFilterType}" Sorularını Yönet ⚙️`}
                </button>
              )}

              {/* Scrollable list */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 font-sans">
                {filteredCompletenessList.map((item) => {
                  const isSelected = item.id === selectedCompletenessId;
                  const isSokak = item.subType === 'sokak';
                  const isMahalle = item.subType === 'mahalle';
                  
                  // Color calculation based on completeness
                  let progressColor = 'bg-red-500';
                  let textColor = 'text-red-500';
                  if (item.score >= 80) {
                    progressColor = 'bg-emerald-500';
                    textColor = 'text-emerald-600 dark:text-emerald-400';
                  } else if (item.score >= 40) {
                    progressColor = 'bg-amber-500';
                    textColor = 'text-amber-600 dark:text-amber-400';
                  }

                  return (
                    <button
                      key={`${item.subType}-${item.id}`}
                      onClick={() => {
                        setSelectedCompletenessId(item.id);
                        setIsEditingQuestions(false);
                      }}
                      className={`w-full flex flex-col p-3 border rounded-xl transition-all text-left cursor-pointer group ${
                        isSelected
                          ? 'bg-stone-100 dark:bg-[#17345A] border-[#D35057] shadow-sm'
                          : 'bg-white hover:bg-stone-50 dark:bg-[#111A2E]/50 dark:hover:bg-[#111A2E]/80 border-stone-200 dark:border-[#2C3C72]'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 bg-stone-100 dark:bg-stone-800 rounded shrink-0">
                            {isSokak ? <Trees className="w-3.5 h-3.5 text-emerald-600" /> : isMahalle ? <Building className="w-3.5 h-3.5 text-indigo-600" /> : getEntityIcon(item.originalItem.type)}
                          </span>
                          <span className="text-xs font-serif font-bold text-stone-800 dark:text-stone-200 truncate group-hover:text-[#D35057] transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold shrink-0 ${textColor}`}>
                          %{item.score}
                        </span>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="w-full bg-stone-100 dark:bg-stone-800 h-1 rounded-full mt-2.5 overflow-hidden">
                        <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${item.score}%` }} />
                      </div>

                      {/* Small Description */}
                      <div className="flex justify-between items-center w-full mt-2 text-[9px] font-mono text-stone-400">
                        <span>{item.type}</span>
                        <span>{item.filledCount}/{item.questionsCount} dolu</span>
                      </div>
                    </button>
                  );
                })}

                {filteredCompletenessList.length === 0 && (
                  <div className="text-center py-12 text-stone-400 dark:text-stone-500 font-serif italic text-xs bg-white dark:bg-[#111A2E]/30 rounded-lg border border-dashed border-stone-200 dark:border-stone-800">
                    Kategoriye uygun varlık bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Interactive Q&A / Checklist Form */}
            <div className="lg:col-span-2 bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-6 rounded-xl archive-shadow paper-grain flex flex-col justify-between min-h-[500px]">
              
              {isEditingQuestions ? (
                // Interactive Question Editor UI
                <div className="space-y-6 flex flex-col justify-between h-full font-sans">
                  <div className="space-y-4">
                    <div className="border-b border-[#CFC5B4]/40 pb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
                          <HelpCircle className="w-5 h-5" />
                        </span>
                        <div>
                          <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-bold">
                            Kategori Şablonu
                          </span>
                          <h3 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1">
                            "{compFilterType}" Sorularını Düzenle
                          </h3>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setIsEditingQuestions(false)}
                        className="text-xs text-stone-500 hover:text-[#D35057] transition-all cursor-pointer font-serif border border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700 px-2.5 py-1 rounded-lg"
                      >
                        Kapat
                      </button>
                    </div>

                    <p className="text-xs text-stone-500 dark:text-stone-400 font-serif leading-relaxed italic">
                      Buradan ekleyeceğiniz, düzenleyeceğiniz veya çıkaracağınız tüm sorular, <b>"{compFilterType}"</b> kategorisindeki tüm varlıklar için dinamik olarak sorulacaktır. Bu sayede evrenin doluluğunu ortak standartta sorgulayabilirsiniz.
                    </p>

                    {/* Questions management rows */}
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {editingQuestionsList.map((q, idx) => (
                        <div key={q.id} className="p-3 bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-stone-400 font-bold">SORU #{idx + 1}</span>
                            <button
                              onClick={() => {
                                setEditingQuestionsList(prev => prev.filter(item => item.id !== q.id));
                              }}
                              className="text-stone-400 hover:text-red-500 p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                              title="Soruyu Kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-mono font-bold text-stone-500 block uppercase mb-1">Başlık / Alan Adı</label>
                              <input
                                type="text"
                                value={q.label}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setEditingQuestionsList(prev => prev.map(item => item.id === q.id ? { ...item, label: newVal } : item));
                                }}
                                className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] rounded px-2 py-1 focus:ring-1 focus:ring-[#D35057]"
                                placeholder="Örn: Kişilik Özellikleri"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono font-bold text-stone-500 block uppercase mb-1">Kayıt Yeri (Metadata Alanı)</label>
                              <input
                                type="text"
                                value={q.fieldPath}
                                disabled={q.id === 'title' || q.id === 'notes'}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setEditingQuestionsList(prev => prev.map(item => item.id === q.id ? { ...item, fieldPath: newVal } : item));
                                }}
                                className="w-full text-xs bg-stone-100 dark:bg-[#13204A]/30 border border-stone-200 dark:border-[#2C3C72] text-stone-500 rounded px-2 py-1 cursor-not-allowed font-mono"
                                placeholder="örn: metadata.profile.custom"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-[9px] font-mono font-bold text-stone-500 block uppercase mb-1">Soru Detayı (Soru-Cevap Rehberi)</label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => {
                                const newVal = e.target.value;
                                  setEditingQuestionsList(prev => prev.map(item => item.id === q.id ? { ...item, question: newVal } : item));
                                }}
                                className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] rounded px-2 py-1 focus:ring-1 focus:ring-[#D35057]"
                                placeholder="Karakter hakkında sorulacak detaylı açıklayıcı soru..."
                              />
                            </div>
                          </div>
                        ))}

                        {editingQuestionsList.length === 0 && (
                          <div className="text-center py-6 text-xs text-stone-400 italic">Soru bulunmuyor. Yeni soru ekleyin.</div>
                        )}
                      </div>

                      {/* Add new question block */}
                      <button
                        onClick={() => {
                          const newId = `custom_q_${Date.now()}`;
                          setEditingQuestionsList(prev => [
                            ...prev,
                            {
                              id: newId,
                              label: 'Yeni Bilgi Alanı',
                              question: 'Bu alan hakkında detayları belirtin.',
                              fieldPath: `metadata.profile.${newId}`
                            }
                          ]);
                        }}
                        className="w-full py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200 dark:border-stone-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Yeni Soru Satırı Ekle
                      </button>
                    </div>

                    {/* Actions buttons */}
                    <div className="border-t border-[#CFC5B4]/40 pt-4 mt-4 flex items-center justify-between gap-3 font-mono">
                      <button
                        onClick={handleResetQuestionsToDefault}
                        className="text-xs bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer border border-stone-200 dark:border-stone-700"
                      >
                        Varsayılana Sıfırla
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingQuestions(false)}
                          className="text-xs text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/40 px-3 py-2 rounded-lg font-bold transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleSaveQuestions}
                          disabled={saveStatus === 'saving'}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {saveStatus === 'saving' ? (
                            <span>Kaydediliyor...</span>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Şablonu Kaydet</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !selectedCompletenessId ? (
                  // Onboarding / Empty State
                  <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 px-4 my-auto">
                    <div className="p-4 bg-[#FAF6EE] dark:bg-[#17345A]/30 rounded-full text-[#D35057]">
                      <HelpCircle className="w-12 h-12" />
                    </div>
                    <h3 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8]">
                      Düzada Evren Doluluk Portalı
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-[#A6B0C9] max-w-sm leading-relaxed font-serif">
                      Geliştirdiğiniz tüm kişiler, mekanlar, caddeler, kulüpler ve olaylar arasından bir varlık seçin. 
                      Tasarım aşamasındaki boş detayları tamamlayarak tutarlı bir evren inşa edin.
                    </p>
                    <div className="flex gap-4 p-4 bg-[#FAF8F5] dark:bg-[#111A2E]/50 rounded-xl max-w-md border border-stone-200/50 text-left text-[11px] text-stone-600 dark:text-[#A6B0C9]">
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                      <span>
                        <b>Kültürel Derinlik:</b> Detay seviyesini yükseltmek; ileride tasarlayacağınız merchler, oyun mekanikleri ve yazacağınız hikayeler için köklü ve tutarlı bir rehber hazırlar.
                      </span>
                    </div>
                  </div>
                ) : (
                // Active Entity Checklist & Q&A
                (() => {
                  const currentItem = completenessList.find(c => c.id === selectedCompletenessId);
                  if (!currentItem) return null;

                  const isSokak = currentItem.subType === 'sokak';
                  const isMahalle = currentItem.subType === 'mahalle';
                  
                  const compData = isSokak 
                    ? getSokakCompleteness(currentItem.originalItem)
                    : isMahalle
                    ? getMahalleCompleteness(currentItem.originalItem)
                    : getEntityCompleteness(currentItem.originalItem);

                  return (
                    <div className="space-y-6 flex flex-col justify-between h-full">
                      
                      {/* Active Heading */}
                      <div className="border-b border-[#CFC5B4]/40 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-[#FAF6EE] dark:bg-stone-800 rounded-lg">
                            {isSokak ? <Trees className="w-5 h-5 text-emerald-600" /> : isMahalle ? <Building className="w-5 h-5 text-indigo-600" /> : getEntityIcon(currentItem.originalItem.type)}
                          </span>
                          <div>
                            <span className="text-[9px] font-mono uppercase bg-[#D35057]/10 text-[#D35057] px-2 py-0.5 rounded font-bold">
                              {currentItem.type}
                            </span>
                            <h3 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1">
                              {currentItem.title}
                            </h3>
                          </div>
                        </div>

                        {/* Detail Completion percentage */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-stone-500 dark:text-stone-400">Doluluk Oranı:</span>
                          <span className="text-lg font-bold font-mono text-[#D35057]">
                            %{currentItem.score}
                          </span>
                        </div>
                      </div>

                      {/* List of Questions */}
                      <div className="space-y-5 flex-1 overflow-y-auto max-h-[550px] pr-2">
                        {compData.questions.map((q) => {
                          const isFilled = q.isFilled;
                          return (
                            <div 
                              key={q.id} 
                              className={`p-4 rounded-xl border transition-all ${
                                isFilled 
                                  ? 'bg-stone-50/50 dark:bg-[#1E293B]/20 border-stone-200 dark:border-[#2C3C72]/50'
                                  : 'bg-[#FFFDF9] dark:bg-[#D35057]/5 border-amber-200/50 dark:border-[#D35057]/20 shadow-xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <span className="text-xs font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8] block">
                                    {q.label}
                                  </span>
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed font-sans">
                                    {q.question}
                                  </p>
                                </div>

                                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                  isFilled 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                    : 'bg-red-100 text-[#D35057] dark:bg-[#D35057]/20 dark:text-red-400'
                                }`}>
                                  {isFilled ? 'Dolu' : 'Eksik Bilgi'}
                                </span>
                              </div>

                              {/* Input Box */}
                              <div className="mt-3">
                                {q.readonly ? (
                                  <div className="text-xs font-mono p-2 bg-stone-100 dark:bg-[#111A2E]/80 border border-stone-200 dark:border-stone-800 rounded text-stone-600 dark:text-[#A6B0C9] whitespace-pre-wrap leading-relaxed select-all">
                                    {q.value || 'Gerekli adımlar Wikipedia panelinde tamamlanabilir.'}
                                  </div>
                                ) : q.id === 'notes' || q.id === 'summary' ? (
                                  <textarea
                                    value={answersState[q.id] || ''}
                                    onChange={(e) => setAnswersState(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Detaylı cevabınızı yazın..."
                                    className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-[#12224A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] font-serif focus:ring-1 focus:ring-[#D35057] focus:outline-none leading-relaxed"
                                    rows={4}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={answersState[q.id] || ''}
                                    onChange={(e) => setAnswersState(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Kısa bir cevap girin..."
                                    className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-[#12224A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] font-serif focus:ring-1 focus:ring-[#D35057] focus:outline-none"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action save panel */}
                      <div className="pt-4 border-t border-[#CFC5B4]/30 flex items-center justify-between font-sans">
                        <span className="text-xs text-stone-400 italic">
                          Detaylar kurgusal şemsiye evren geneline anında yansır.
                        </span>

                        <button
                          onClick={() => handleSaveCompleteness(currentItem.id, currentItem.subType)}
                          disabled={saveStatus === 'saving'}
                          className={`flex items-center gap-2 text-xs font-mono px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer ${
                            saveStatus === 'saving'
                              ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                              : saveStatus === 'success'
                              ? 'bg-emerald-600 text-white'
                              : saveStatus === 'error'
                              ? 'bg-red-600 text-white'
                              : 'bg-[#D35057] hover:bg-[#B23A40] text-white'
                          }`}
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-stone-500 border-t-transparent rounded-full" />
                              <span>Kaydediliyor...</span>
                            </>
                          ) : saveStatus === 'success' ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Bilgiler Güncellendi!</span>
                            </>
                          ) : saveStatus === 'error' ? (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              <span>Hata Oluştu!</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Evren Bilgilerini Güncelle</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })()
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
