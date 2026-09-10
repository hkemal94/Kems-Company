import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, Shield, Users, Compass, Store, ShoppingBag, Calendar, BookOpen, ChevronDown, ChevronUp, Sparkles, Plus, Check, Trash2, Edit3, Save, Eye, EyeOff, MoreVertical, Database, Trash, AlertTriangle, Link } from 'lucide-react';
import { Item, ItemType, WikiSection, BrandKit, AreaType } from '../types';
import { 
  KEMSKOY_HOTEL, 
  KEMSKOY_PEOPLE 
} from '../data/kemskoyData';
import { CHARACTERS_IMPORT_DATA } from '../data/charactersImportData';
import { compressImageBase64 } from '../lib/imageCompressor';
import { resolveAllRelations, getRelationLabels, cleanupRelationsOnDelete } from '../utils/relations';
import ConsistencyChecker from './ConsistencyChecker';
import DuzadaWiki from './DuzadaWiki';
import DuzadaDirectory from './DuzadaDirectory';

interface DuzadaProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
}

export function getCharacterKunye(activeEntity: any) {
  if (!activeEntity) {
    return {
      ad: '', yas: '', rol: '', uyruk: '', fizik: '', sac: '', gozler: '',
      kisilik: '', sevdikleri: '', sevmedikleri: '', hobiler: '', summaryText: ''
    };
  }

  // Inner clean helper for short fields (Ad, Yaş, Rol, Uyruk) to keep them clean and short
  const cleanShortField = (val: string, maxLen: number = 35): string => {
    if (!val) return '';
    const cleanVal = val.trim();
    
    // Check if it's "Belirtilmedi" or equivalent
    const l = cleanVal.toLowerCase();
    if (l === 'belirtilmedi' || l === 'bilinmiyor' || l === 'bilinmemektedir' || l === 'n/a' || l === 'açıklanmadı') {
      return '';
    }
    
    if (cleanVal.length <= maxLen && !cleanVal.includes('.') && !cleanVal.includes(';')) {
      return cleanVal;
    }
    
    // Split on common sentence boundaries
    const sentenceEnd = cleanVal.match(/[.!?]/);
    let firstSentence = cleanVal;
    if (sentenceEnd && sentenceEnd.index !== undefined) {
      firstSentence = cleanVal.substring(0, sentenceEnd.index).trim();
    }
    
    // Also split on common clause delimiters like comma, semicolon, "ve", "veya", "ile"
    const parts = firstSentence.split(/[,;|]|\s+(?:ve|veya|ile|ama)\s+/i);
    let candidate = parts[0].trim();
    
    if (candidate.length > maxLen) {
      const words = candidate.split(/\s+/);
      if (words.length > 3) {
        candidate = words.slice(0, 3).join(' ');
      } else {
        candidate = candidate.substring(0, maxLen);
      }
    }
    
    return candidate.replace(/[.,;:\-_]+$/, '').trim();
  };

  // Dedicated cleaning for Uyruk to guarantee it remains a short phrase/abbreviation
  const cleanUyruk = (val: string): string => {
    if (!val) return '';
    const cleanVal = val.trim();
    const lower = cleanVal.toLowerCase();

    if (lower.startsWith('t.c.') || lower.startsWith('t.c') || lower.startsWith('tc') || lower.includes('türk') || lower.includes('turkish')) {
      return 'T.C.';
    }
    
    const mappings = [
      { keys: ['alman', 'germany', 'german'], value: 'Alman' },
      { keys: ['hint', 'india'], value: 'Hint' },
      { keys: ['çin', 'china', 'chinese'], value: 'Çin' },
      { keys: ['tunus'], value: 'Tunuslu' },
      { keys: ['lübnan'], value: 'Lübnanlı' },
      { keys: ['türkmen'], value: 'Türkmen' },
      { keys: ['rus', 'russia'], value: 'Rus' },
      { keys: ['fas'], value: 'Faslı' },
      { keys: ['italy', 'italyan'], value: 'İtalyan' },
      { keys: ['mısır', 'egypt'], value: 'Mısırlı' },
      { keys: ['yunan'], value: 'Yunan' },
      { keys: ['fransız', 'french'], value: 'Fransız' },
      { keys: ['ingiliz', 'british', 'english'], value: 'İngiliz' },
      { keys: ['amerikan', 'american'], value: 'Amerikan' },
    ];

    for (const mapping of mappings) {
      for (const key of mapping.keys) {
        if (lower.includes(key)) {
          return mapping.value;
        }
      }
    }

    const firstWord = cleanVal.split(/\s+/)[0];
    const cleanedWord = firstWord.replace(/[.,;:]+$/, '').trim();
    if (cleanedWord.length > 0 && cleanedWord.length < 15) {
      return cleanedWord;
    }

    return cleanVal.slice(0, 15);
  };

  // Inner helper for descriptive fields (Fizik, Saç, Gözler, Kişilik, Sevdikleri, Sevmedikleri, Hobiler)
  // Ensure no field is a full paragraph
  const cleanDescriptiveField = (val: string): string => {
    if (!val) return '';
    const cleanVal = val.trim();
    
    const lower = cleanVal.toLowerCase();
    if (lower === 'belirtilmedi' || lower === 'bilinmiyor' || lower === 'bilinmemektedir' || lower === 'n/a' || lower === 'açıklanmadı') {
      return '';
    }
    
    if (cleanVal.length <= 100) {
      return cleanVal;
    }
    
    const sentenceEnd = cleanVal.match(/[.!?]/);
    if (sentenceEnd && sentenceEnd.index !== undefined && sentenceEnd.index > 10) {
      return cleanVal.substring(0, sentenceEnd.index + 1).trim();
    }
    
    return cleanVal.substring(0, 97).trim() + '...';
  };

  const imported = CHARACTERS_IMPORT_DATA.find(
    c => c.ad.trim().toLowerCase() === activeEntity.title.trim().toLowerCase()
  );

  let ad = cleanShortField(activeEntity.title);
  let yas: string | number = '';
  let rol = '';
  let uyruk = '';
  let fizik = '';
  let sac = '';
  let gozler = '';
  let kisilik = '';
  let sevdikleri = '';
  let sevmedikleri = '';
  let hobiler = '';

  const notesStr = activeEntity.notes || '';
  const lines = notesStr.split('\n');
  
  // Try to parse Uyruk: T.C. or similar from notes
  const uyrukMatch = notesStr.match(/Uyruk:\s*([^,\n\r*]+)/i);
  if (uyrukMatch) {
    uyruk = cleanUyruk(uyrukMatch[1]);
  } else if (activeEntity.metadata?.profile?.nationality) {
    uyruk = cleanUyruk(activeEntity.metadata.profile.nationality);
  }

  // Try to parse Yaş from notes
  const yasMatch = notesStr.match(/Yaş:\s*(\d+)/i);
  if (yasMatch) {
    yas = parseInt(yasMatch[1]);
  } else if (activeEntity.metadata?.profile?.age) {
    const ageVal = activeEntity.metadata.profile.age;
    if (typeof ageVal === 'number') {
      yas = ageVal;
    } else {
      const match = String(ageVal).match(/(\d+)/);
      yas = match ? parseInt(match[1]) : cleanShortField(String(ageVal), 10);
    }
  }

  // Try to parse Rol / Meslek / Görev
  if (activeEntity.metadata?.profile?.profession) {
    rol = cleanShortField(activeEntity.metadata.profile.profession);
  } else if (activeEntity.metadata?.profile?.role_tag) {
    rol = cleanShortField(activeEntity.metadata.profile.role_tag);
  } else if (activeEntity.metadata?.profile?.role) {
    rol = cleanShortField(activeEntity.metadata.profile.role);
  }

  // Robust field matcher for bullet items
  const getFieldVal = (lbl: string) => {
    for (const line of lines) {
      const cl = line.trim();
      const lower = cl.toLowerCase();
      const index = lower.indexOf(lbl.toLowerCase() + ':');
      if (index === 0 || (index > 0 && ['*', '-', ' ', '•'].includes(cl[0]))) {
        return cl.substring(cl.indexOf(':') + 1).trim();
      }
    }
    return '';
  };

  const rolFromNotes = getFieldVal('rol') || getFieldVal('meslek') || getFieldVal('görev') || getFieldVal('iş');
  if (rolFromNotes) {
    rol = cleanShortField(rolFromNotes);
  }

  fizik = cleanDescriptiveField(getFieldVal('fizik'));
  sac = cleanDescriptiveField(getFieldVal('saç'));
  gozler = cleanDescriptiveField(getFieldVal('gözler'));
  kisilik = cleanDescriptiveField(getFieldVal('kişilik'));
  sevdikleri = cleanDescriptiveField(getFieldVal('sevdikleri'));
  sevmedikleri = cleanDescriptiveField(getFieldVal('sevmedikleri'));
  hobiler = cleanDescriptiveField(getFieldVal('hobiler'));

  // Override/enrich with imported data if available
  if (imported) {
    if (imported.yas) yas = imported.yas;
    if (imported.rol) rol = cleanShortField(imported.rol);
    if (imported.fizik) fizik = cleanDescriptiveField(imported.fizik);
    if (imported.sac) sac = cleanDescriptiveField(imported.sac);
    if (imported.gozler) gozler = cleanDescriptiveField(imported.gozler);
    if (imported.kisilik) kisilik = cleanDescriptiveField(imported.kisilik);
    if (imported.sevdikleri) sevdikleri = cleanDescriptiveField(imported.sevdikleri);
    if (imported.sevmedikleri) sevmedikleri = cleanDescriptiveField(imported.sevmedikleri);
    if (imported.hobiler) hobiler = cleanDescriptiveField(imported.hobiler);

    if (!uyruk) {
      uyruk = "T.C.";
    }
  }

  // Metadata fallbacks
  if (!fizik && activeEntity.metadata?.profile?.physics) fizik = cleanDescriptiveField(activeEntity.metadata.profile.physics);
  if (!sac && activeEntity.metadata?.profile?.hair) sac = cleanDescriptiveField(activeEntity.metadata.profile.hair);
  if (!gozler && activeEntity.metadata?.profile?.eyes) gozler = cleanDescriptiveField(activeEntity.metadata.profile.eyes);
  if (!kisilik && activeEntity.metadata?.profile?.personality) kisilik = cleanDescriptiveField(activeEntity.metadata.profile.personality);
  if (!sevdikleri && activeEntity.metadata?.profile?.likes) sevdikleri = cleanDescriptiveField(activeEntity.metadata.profile.likes);
  if (!sevmedikleri && activeEntity.metadata?.profile?.dislikes) sevmedikleri = cleanDescriptiveField(activeEntity.metadata.profile.dislikes);
  if (!hobiler && activeEntity.metadata?.profile?.hobbies) hobiler = cleanDescriptiveField(activeEntity.metadata.profile.hobbies);

  // Form Kısa Özet (1-2 sentences maximum, no field repetition!)
  let summaryLines: string[] = [];
  for (const line of lines) {
    const cl = line.trim();
    if (!cl) continue;
    // Skip bullet fields and headers
    if (cl.startsWith('*') || cl.startsWith('-')) continue;
    if (cl.toLowerCase().includes(activeEntity.title.toLowerCase()) && (cl.includes('—') || cl.includes('-') || cl.includes('('))) {
      continue;
    }
    if (cl.match(/Yaş:\s*\d+/i) && cl.match(/Uyruk:/i)) {
      continue;
    }
    if (cl === '---') continue;
    
    // Check if it is a field start line without * marker
    const lower = cl.toLowerCase();
    if (lower.startsWith('fizik:') || lower.startsWith('saç:') || lower.startsWith('gözler:') || lower.startsWith('kişilik:') || lower.startsWith('sevdikleri:') || lower.startsWith('sevmedikleri:') || lower.startsWith('hobiler:')) {
      continue;
    }

    summaryLines.push(cl);
  }

  let summaryText = summaryLines.join('\n').trim();

  if (imported && (!summaryText || summaryText.length < 10)) {
    if (imported.ayrinti && imported.ayrinti.length > 0) {
      summaryText = imported.ayrinti.slice(0, 2).join(' ');
    }
  }

  if (!summaryText) {
    if (rol) {
      summaryText = `${ad}, The Imperial Kemskøy bünyesinde ${rol.toLowerCase()} olarak görev almaktadır.`;
    } else {
      summaryText = `${ad}, Düzada sakinlerinden ve The Imperial Kemskøy misafirlerinden biridir.`;
    }
  }

  summaryText = summaryText.replace(/^\*\s*Ayrıntı:\s*/i, '').replace(/^Ayrıntı:\s*/i, '').trim();

  // Keep to 1-2 sentences maximum
  const sentences = summaryText.split(/(?<=[.!?])\s+/);
  if (sentences.length > 2) {
    summaryText = sentences.slice(0, 2).join(' ');
  }

  // Ensure "Belirtilmedi" / empty values are set to empty string
  const isValueValid = (val: any) => {
    if (val === undefined || val === null || val === '') return false;
    const l = String(val).trim().toLowerCase();
    return l !== 'belirtilmedi' && l !== 'bilinmiyor' && l !== 'bilinmemektedir' && l !== 'n/a' && l !== 'açıklanmadı';
  };

  return {
    ad: isValueValid(ad) ? ad : '',
    yas: isValueValid(yas) ? yas : '',
    rol: isValueValid(rol) ? rol : '',
    uyruk: isValueValid(uyruk) ? uyruk : '',
    fizik: isValueValid(fizik) ? fizik : '',
    sac: isValueValid(sac) ? sac : '',
    gozler: isValueValid(gozler) ? gozler : '',
    kisilik: isValueValid(kisilik) ? kisilik : '',
    sevdikleri: isValueValid(sevdikleri) ? sevdikleri : '',
    sevmedikleri: isValueValid(sevmedikleri) ? sevmedikleri : '',
    hobiler: isValueValid(hobiler) ? hobiler : '',
    summaryText
  };
}

export default function Duzada({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}: DuzadaProps) {
  // Navigation / Tabs inside Düzada
  const [activeTab, setActiveTab] = useState<'wiki' | 'liste' | 'harita'>('wiki');
  
  const regionsCreatedRef = useRef(false);
  const worldDetailsSyncedRef = useRef(false);
  
  // State for secure, custom confirmation dialog within iframe sandbox
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };
  
  // Wikipedia-specific states
  const [wikiMode, setWikiMode] = useState<'oku' | 'degistir'>('oku');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Hepsi');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [wikiConfirmId, setWikiConfirmId] = useState<string | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [isRelationsCollapsed, setIsRelationsCollapsed] = useState(true);

  // Reset read mode on item change
  React.useEffect(() => {
    setWikiMode('oku');
  }, [activeItemId]);

  // Creation States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ItemType>('kisi');
  
  // Wiki Editing States
  const [editingWikiId, setEditingWikiId] = useState<string | null>(null);
  const [editingWikiTitle, setEditingWikiTitle] = useState('');
  const [editingWikiContent, setEditingWikiContent] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [aiGeneratingSections, setAiGeneratingSections] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Map Region Selected
  const [selectedRegion, setSelectedRegion] = useState<string>('merkez');
  const [aiSummarizingRegion, setAiSummarizingRegion] = useState(false);

  // Filter entities
  const entities = useMemo(() => {
    return items.filter(i => i.area === 'duzada' && !i.archived);
  }, [items]);

  const mapPins = useMemo(() => {
    return items.filter(i => i.type === 'map_pin' && !i.archived);
  }, [items]);

  const mapSettingsItem = useMemo(() => {
    return items.find(i => i.type === 'map_settings' && i.area === 'duzada');
  }, [items]);

  const unpinnedEntities = useMemo(() => {
    const linkedEntityIds = new Set(mapPins.map(p => p.metadata?.linkedEntityId).filter(Boolean));
    return items.filter(i => 
      i.area === 'duzada' && 
      i.type !== 'map_pin' && 
      i.type !== 'map_settings' && 
      !i.archived && 
      !i.isProposal && 
      !linkedEntityIds.has(i.id)
    );
  }, [items, mapPins]);
  
  const mahalleler = useMemo(() => {
    return mapSettingsItem?.metadata?.mahalleler || [
      { id: 'merkez', name: 'Merkez', summary: "Düzada'nın tam ortasında yer alan, sokak ağları ve yerel dükkanlarla kaplı hareketli şehir merkezi. İdari binalar, köy meydanı ve sosyal hayatın merkez üssüdür." },
      { id: 'liman', name: 'Liman', summary: "Adanın batı kıyısındaki korunaklı koyda yer alan modern liman alanı. Ticaret gemileri, balıkçı tekneleri, Kems ticaret gemileri ve kıyı kahveleriyle hareketli, adanın dış dünyaya açılan kapısıdır." },
      { id: 'fener', name: 'Fener', summary: "Düzada'nın en kuzey ucundaki sarp kayalıklarda yükselen tarihi deniz feneri bölgesi. Adanın simgelerinden biridir ve sert rüzgarları, hırçın dalgaları ve izole atmosferiyle bilinir." },
      { id: 'stad', name: 'Stad', summary: "Adanın kuzeydoğu ucundaki düzlük burunda konumlanmış modern spor sahası ve stadyumu. Adadaki kültürel, sportif ve sosyal rekreasyon etkinliklerinin odağıdır." },
      { id: 'çiftlik', name: 'Çiftlik', summary: "Adanın verimli doğu ve güneydoğu düzlüklerinde uzanan geniş tarım arazileri, zeytinlikler ve yerel çiftlik evleri. Adanın tarımsal üretim kalbidir." },
      { id: 'eski_liman', name: 'Eski Liman', summary: "Adanın güneybatı kıyısındaki tarihi yerleşim ve rıhtım bölgesi. Görkemli 'The Imperial Kemskøy' oteline, rıhtımlara ve gizemli tarihi kalıntılara ev sahipliği yapar. EST. 1954 kuruluş tarihiyle adanın en prestijli bölgesidir." }
    ];
  }, [mapSettingsItem]);

  const sokaklar = useMemo(() => {
    return mapSettingsItem?.metadata?.sokaklar || [
      { id: 'sok_1', name: 'Kuvayi Milliye Caddesi', mahalleId: 'merkez' },
      { id: 'sok_2', name: 'Çarşı Sokak', mahalleId: 'merkez' },
      { id: 'sok_3', name: 'Liman Kordonu', mahalleId: 'liman' },
      { id: 'sok_4', name: 'Fener Yolu', mahalleId: 'fener' },
      { id: 'sok_5', name: 'Stadyum Caddesi', mahalleId: 'stad' },
      { id: 'sok_6', name: 'Zeytinlik Yolu', mahalleId: 'çiftlik' },
      { id: 'sok_7', name: 'Kems Rıhtımı', mahalleId: 'eski_liman' }
    ];
  }, [mapSettingsItem]);

  const neighborhoods = useMemo(() => {
    return mahalleler.map(m => ({ id: m.id, name: m.name, regionId: m.id }));
  }, [mahalleler]);

  const roads = useMemo(() => {
    return sokaklar.map(s => ({ id: s.id, name: s.name }));
  }, [sokaklar]);

  const activeRegionSummaries = useMemo(() => {
    const summaries: Record<string, string> = {};
    mahalleler.forEach(m => {
      summaries[m.id] = m.summary || `${m.name} bölgesi hakkında henüz bir açıklama yazılmadı.`;
    });
    // Add legacy key if missing, for backwards compatibility
    if (!summaries['eski liman / kemskoy']) {
      const eskiLiman = mahalleler.find(m => m.id === 'eski_liman' || m.id === 'eski liman / kemskoy');
      if (eskiLiman) {
        summaries['eski liman / kemskoy'] = eskiLiman.summary || '';
      }
    }
    return summaries;
  }, [mahalleler]);

  const activeRegionList = useMemo(() => {
    return mahalleler.map(m => m.id);
  }, [mahalleler]);

  // States to make regions editable
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [editingRegionName, setEditingRegionName] = useState('');
  const [editingRegionSummary, setEditingRegionSummary] = useState('');
  const [showAddRegionForm, setShowAddRegionForm] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionSummary, setNewRegionSummary] = useState('');

  // Hierarchy specific addition/editing states
  const [editingMahalleId, setEditingMahalleId] = useState<string | null>(null);
  const [editingMahalleName, setEditingMahalleName] = useState('');
  const [editingMahalleSummary, setEditingMahalleSummary] = useState('');
  const [showAddMahalleForm, setShowAddMahalleForm] = useState(false);
  const [newMahalleName, setNewMahalleName] = useState('');
  const [newMahalleSummary, setNewMahalleSummary] = useState('');

  const [editingSokakId, setEditingSokakId] = useState<string | null>(null);
  const [editingSokakName, setEditingSokakName] = useState('');
  const [showAddSokakForm, setShowAddSokakForm] = useState(false);
  const [newSokakName, setNewSokakName] = useState('');

  const [addingMekanSokakId, setAddingMekanSokakId] = useState<string | null>(null);
  const [newMekanName, setNewMekanName] = useState('');
  const [newMekanType, setNewMekanType] = useState<'mekân' | 'dükkân' | 'yer'>('mekân');

  const [linkingMekanSokakId, setLinkingMekanSokakId] = useState<string | null>(null);
  const [selectedMekanToLink, setSelectedMekanToLink] = useState('');

  // NEW Interactive Map Pin & Structure States
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isAddingPinMode, setIsAddingPinMode] = useState(false);
  const [newPinCoords, setNewPinCoords] = useState<{ x: number, y: number } | null>(null);
  
  // New Pin form fields
  const [newPinTitle, setNewPinTitle] = useState('');
  const [newPinCategory, setNewPinCategory] = useState<'lokasyon' | 'coğrafi' | 'kişi' | 'işletme'>('lokasyon');
  const [newPinLinkedId, setNewPinLinkedId] = useState('');
  const [newPinRegion, setNewPinRegion] = useState('merkez');
  const [newPinNotes, setNewPinNotes] = useState('');

  // Drag states for pin
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [dragCoords, setDragCoords] = useState<{ x: number, y: number } | null>(null);

  // Simple, editable structures
  const [showAddNeighborhoodForm, setShowAddNeighborhoodForm] = useState(false);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [newNeighborhoodRegionId, setNewNeighborhoodRegionId] = useState('merkez');

  const [showAddRoadForm, setShowAddRoadForm] = useState(false);
  const [newRoadName, setNewRoadName] = useState('');

  // Logo color extraction / font suggestion loading
  const [loadingAiBrand, setLoadingAiBrand] = useState(false);

  // Import / Cleanup Feedback States
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [cleanupFeedback, setCleanupFeedback] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  // States for AI Künye Suggestions
  const [loadingKunyaAi, setLoadingKunyaAi] = useState(false);
  const [kunyaAiSuggestions, setKunyaAiSuggestions] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    setKunyaAiSuggestions(null);
  }, [activeItemId]);

  const activeEntity = useMemo(() => {
    if (!activeItemId) return null;
    return entities.find(e => e.id === activeItemId) || items.find(i => i.id === activeItemId) || null;
  }, [activeItemId, entities, items]);

  // Ensure the 6 region items exist in Firestore
  useEffect(() => {
    if (!items || items.length === 0 || regionsCreatedRef.current) return;
    
    // Check which ones are already present as type 'yer' (matching by metadata.region or title)
    const existingRegions = items.filter(i => i.area === 'duzada' && i.type === 'yer');
    const regionKeys = Object.keys(activeRegionSummaries);
    
    // If the user already has some regions in the database, we do not auto-create missing ones.
    // This allows the user to delete or archive specific regions without them being automatically recreated!
    const hasAnyRegion = existingRegions.some(reg => 
      regionKeys.includes(reg.metadata?.region || '') ||
      regionKeys.includes(reg.title.toLowerCase()) ||
      reg.id === 'region_eski_liman_kemskoy'
    );
    
    if (hasAnyRegion) {
      regionsCreatedRef.current = true;
      return;
    }

    const missingKeys = regionKeys.filter(key => {
      return !existingRegions.some(reg => 
        reg.metadata?.region === key || 
        reg.title.toLowerCase() === key ||
        (key === 'eski liman / kemskoy' && reg.id === 'region_eski_liman_kemskoy')
      );
    });

    if (missingKeys.length > 0) {
      regionsCreatedRef.current = true;
      console.log("Auto-creating missing region items as 'yer':", missingKeys);
      missingKeys.forEach(async (key) => {
        const title = key === 'eski liman / kemskoy' ? 'Eski Liman / Kemsköy' : key.charAt(0).toUpperCase() + key.slice(1);
        const id = `region_${key.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
        const description = activeRegionSummaries[key] || "";
        
        await onAddItem({
          id,
          title,
          area: 'duzada',
          type: 'yer',
          status: 'Bitti',
          priority: 'orta',
          tags: ['bölge', 'coğrafya', 'yer', key.replace(/\s+/g, '-')],
          links: [],
          notes: description,
          images: key === 'fener' ? ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=512&auto=format&fit=crop"] :
                  key === 'liman' ? ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=512&auto=format&fit=crop"] :
                  key === 'eski liman / kemskoy' ? ["https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=512&auto=format&fit=crop"] : [],
          isProposal: false,
          archived: false,
          metadata: {
            region: key,
            wikiSections: [
              { id: "coğrafi_yapı", title: "Coğrafi Yapı ve Genel Özellikler", content: `${title} bölgesi, Düzada'nın önemli referans noktalarından biridir. ${description}`, status: "resmi" }
            ]
          }
        });
      });
    }
  }, [items, activeRegionSummaries]);

  // Synchronize 'duzada_world_details' umbrella container and establish two-way links
  useEffect(() => {
    if (!items || items.length === 0 || worldDetailsSyncedRef.current) return;

    const worldItem = items.find(i => i.id === 'duzada_world_details');
    if (!worldItem) {
      worldDetailsSyncedRef.current = true;
      console.log("Auto-creating 'duzada_world_details' as the world umbrella container");
      const defaultWorldDetails = {
        id: 'duzada_world_details',
        title: 'Düzada',
        area: 'duzada' as const,
        type: 'yer' as const,
        status: 'Bitti',
        priority: 'yüksek' as const,
        tags: ['evren', 'rehber', 'şemsiye-konteyner'],
        links: [],
        notes: `Düzada, Ege Denizi'nin serin sularında saklanmış, zamanın daha yavaş aktığı bir takımadanın kalbidir. Tarihi zeytinlikleri, sarp kayalıkların ucunda yükselen deniz feneri, balıkçı teknelerinin sığındığı limanı ve dar sokaklarıyla kendine has melankolik bir atmosfere sahiptir.\n\nAda, özellikle 1954 kuruluş tarihli görkemli "The Imperial Kemskøy" oteli ve çevresindeki sırlar ile bilinir. Ekim 2003 ("Sezon Sonu") dönemi, rüzgarın sertleştiği, turistlerin elini eteğini çektiği ve adanın kendi iç hesaplaşmalarıyla baş başa kaldığı gizemli bir zaman dilimini temsil eder.`,
        images: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=512&auto=format&fit=crop"],
        isProposal: false,
        archived: false,
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
      onAddItem(defaultWorldDetails);
      return;
    }

    // Filter all OTHER active entities belonging to Düzada
    const otherDuzadaEntities = items.filter(i => 
      i.area === 'duzada' && 
      i.id !== 'duzada_world_details' && 
      !i.archived && 
      i.type !== 'map_pin'
    );

    const expectedWorldLinks = otherDuzadaEntities.map(e => e.id);
    const currentWorldLinks = worldItem.links || [];

    // Check if worldItem links are fully synced
    const missingInWorld = expectedWorldLinks.filter(id => !currentWorldLinks.includes(id));
    const extraInWorld = currentWorldLinks.filter(id => !expectedWorldLinks.includes(id));

    const needsWorldUpdate = missingInWorld.length > 0 || extraInWorld.length > 0;

    // Check other entities that need 'duzada_world_details' added to their links
    const entitiesToUpdate: Item[] = [];
    for (const ent of otherDuzadaEntities) {
      const links = ent.links || [];
      if (!links.includes('duzada_world_details')) {
        entitiesToUpdate.push({
          ...ent,
          links: [...links, 'duzada_world_details']
        });
      }
    }

    // Trigger updates
    if (entitiesToUpdate.length > 0) {
      entitiesToUpdate.forEach(async (updatedEnt) => {
        await onUpdateItem(updatedEnt);
      });
    }

    if (needsWorldUpdate) {
      const newWorldLinks = Array.from(new Set([
        ...currentWorldLinks.filter(id => expectedWorldLinks.includes(id)),
        ...expectedWorldLinks
      ]));
      
      onUpdateItem({
        ...worldItem,
        links: newWorldLinks
      });
    }

    worldDetailsSyncedRef.current = true;
  }, [items]);

  // Import Kemskoy Lore to Wiki (as actual entities)
  const handleImportKemskoyLore = async () => {
    setIsImporting(true);
    setImportFeedback("Kemskøy verileri hazırlanıyor...");
    try {
      const existingIds = new Set(items.map(i => i.id));
      const toImport: any[] = [];

      // 1. Hotel (Yer/Mekan)
      if (!existingIds.has(KEMSKOY_HOTEL.id)) {
        toImport.push({
          ...KEMSKOY_HOTEL,
          area: 'duzada'
        });
      }

      // 2. People (Kişiler)
      for (const p of KEMSKOY_PEOPLE) {
        if (!existingIds.has(p.id)) {
          toImport.push({
            ...p,
            area: 'duzada',
            metadata: {
              ...p.metadata,
              region: 'eski liman / kemskoy',
              haritaKonum: { x: 20, y: 78 }
            }
          });
        }
      }

      if (toImport.length === 0) {
        setImportFeedback("Kemskøy verileri zaten aktarılmış durumda (0 yeni veri eklendi).");
        setTimeout(() => setImportFeedback(null), 5000);
        return;
      }

      // Import in parallel chunks of 10 to be extremely fast and robust
      const batchSize = 10;
      for (let i = 0; i < toImport.length; i += batchSize) {
        const chunk = toImport.slice(i, i + batchSize);
        const percent = Math.round((i / toImport.length) * 100);
        setImportFeedback(`Aktarılıyor: %${percent} tamamlandı (${i}/${toImport.length})...`);
        await Promise.all(chunk.map(item => onAddItem(item)));
      }

      setImportFeedback(`Başarıyla ${toImport.length} adet Kemskøy Lore verisi aktarıldı!`);
      setTimeout(() => setImportFeedback(null), 6000);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setImportFeedback(`Aktarım hatası: ${errMsg}`);
      setTimeout(() => setImportFeedback(null), 10000);
    } finally {
      setIsImporting(false);
    }
  };

  // Cleanup Mock Seed Data
  const handleCleanupMockData = async () => {
    setIsCleaning(true);
    setCleanupFeedback("Örnek veriler siliniyor...");
    try {
      const defaultPrefixes = [
        'kamil_efendi',
        'kucukcetmi_meydan',
        'surek_komitesi',
        'surek_senligi',
        'ege_ruzgarlari',
        'kucukcetmi_drop',
        'senlik_tisort',
        'kayip_amblemler_post',
        'duzada_kitap_proje',
        'duzada_kitap_bolum_1',
        'proposal_wiki_amblem'
      ];

      const toDelete: string[] = [];
      for (const item of items) {
        const isMock = defaultPrefixes.some(prefix => item.id.startsWith(prefix));
        // Ensure we do NOT delete kems_company
        if (isMock && item.id !== 'kems_company' && item.title.toLowerCase() !== 'kems company') {
          toDelete.push(item.id);
        }
      }

      if (toDelete.length === 0) {
        setCleanupFeedback("Silinecek örnek veri bulunamadı.");
        setTimeout(() => setCleanupFeedback(null), 5000);
        setShowCleanupConfirm(false);
        return;
      }

      // Delete in parallel chunks of 10
      const batchSize = 10;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const chunk = toDelete.slice(i, i + batchSize);
        const percent = Math.round((i / toDelete.length) * 100);
        setCleanupFeedback(`Temizleniyor: %${percent} tamamlandı (${i}/${toDelete.length})...`);
        await Promise.all(chunk.map(id => onDeleteItem(id)));
      }
      
      onSelectItem(null);
      setCleanupFeedback(`Başarıyla ${toDelete.length} adet örnek veri temizlendi!`);
      setTimeout(() => setCleanupFeedback(null), 6000);
      setShowCleanupConfirm(false);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setCleanupFeedback(`Temizleme hatası: ${errMsg}`);
      setTimeout(() => setCleanupFeedback(null), 10000);
    } finally {
      setIsCleaning(false);
    }
  };

  // Helper function to return default coordinate pinning for a given region (auto-pin on region selection)
  const getDefaultCoordsForRegion = (region: string): { x: number, y: number } => {
    const r = region.toLowerCase();
    if (r.includes('kuzey')) return { x: 50, y: 18 };
    if (r.includes('liman')) return { x: 22, y: 48 };
    if (r.includes('orman')) return { x: 68, y: 62 };
    if (r.includes('fener')) return { x: 15, y: 12 };
    if (r.includes('eski liman') || r.includes('kemskoy')) return { x: 20, y: 78 };
    if (r.includes('merkez')) return { x: 48, y: 50 };
    if (r.includes('çiftlik')) return { x: 82, y: 55 };
    if (r.includes('stad')) return { x: 80, y: 22 };
    return { 
      x: 45 + (region.length % 10), 
      y: 45 + (region.length % 15)
    };
  };

  // Handle entity creation (ONLY name + type first as requested!)
  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const id = `entity_${Date.now()}`;
    const newEntity: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
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
    
    // Reset form and select the newly created entity
    setNewTitle('');
    setShowCreateForm(false);
    
    // Find the newly created item ID (we generated it locally but since the DB generates it or uses ours,
    // let's wait a moment and try to auto-select it, or we can look it up in the subscriber)
    // Actually we supplied the id in setDoc in firebase.ts, so we can select it immediately using our id!
    onSelectItem(id);
  };

  // Helper icons based on entity type
  const getEntityIcon = (type: ItemType) => {
    switch (type) {
      case 'marka':
      case 'kulüp': return <Shield className="w-5 h-5 text-emerald-500" />;
      case 'kisi':
      case 'karakter': return <Users className="w-5 h-5 text-indigo-500" />;
      case 'yer': return <Compass className="w-5 h-5 text-amber-500" />;
      case 'mekân':
      case 'dükkân': return <MapPin className="w-5 h-5 text-red-500" />;
      case 'olay': return <Calendar className="w-5 h-5 text-rose-500" />;
      case 'ürün': return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      default: return <Compass className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'lokasyon': return '#D35057'; // Red
      case 'coğrafi': return '#F59E0B'; // Amber
      case 'kişi': return '#6366F1'; // Indigo
      case 'işletme': return '#10B981'; // Emerald
      default: return '#1B2A4A'; // Navy
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPinId) return; // ignore click when dragging ends
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));

    setNewPinCoords({ x: boundedX, y: boundedY });
    setSelectedPinId(null);
    setIsAddingPinMode(false);
    
    // Autofill title or clear
    setNewPinTitle('');
    setNewPinNotes('');
    setNewPinLinkedId('');
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingPinId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    setDragCoords({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleSvgMouseUp = async () => {
    if (!draggingPinId || !dragCoords) {
      setDraggingPinId(null);
      setDragCoords(null);
      return;
    }
    const pin = items.find(i => i.id === draggingPinId);
    if (pin) {
      await onUpdateItem({
        ...pin,
        metadata: {
          ...pin.metadata,
          haritaKonum: dragCoords
        }
      });
    }
    setDraggingPinId(null);
    setDragCoords(null);
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinLinkedId || !newPinTitle.trim() || !newPinCoords) return;

    await onAddItem({
      title: newPinTitle.trim(),
      area: 'duzada',
      type: 'map_pin',
      status: 'Yayında',
      priority: 'orta',
      tags: ['harita-pin', newPinCategory],
      links: [newPinLinkedId],
      notes: newPinNotes || '',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        category: newPinCategory,
        linkedEntityId: newPinLinkedId,
        haritaKonum: newPinCoords,
        region: newPinRegion || 'merkez'
      }
    });

    // Update the linked entity so that its own metadata stays perfectly in sync
    const linkedEntity = items.find(i => i.id === newPinLinkedId);
    if (linkedEntity) {
      await onUpdateItem({
        ...linkedEntity,
        metadata: {
          ...linkedEntity.metadata,
          haritaKonum: newPinCoords,
          region: newPinRegion || 'merkez'
        }
      });
    }

    setNewPinTitle('');
    setNewPinCategory('lokasyon');
    setNewPinLinkedId('');
    setNewPinNotes('');
    setNewPinCoords(null);
  };

  // Draggable or Clickable pin selection on Map (legacy, kept for fallback)
  const handleMapClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    // Falls back to handleSvgClick if no active entity selected
    if (!activeEntity) {
      handleSvgClick(e);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Save pin location
    await onUpdateItem({
      ...activeEntity,
      metadata: {
        ...activeEntity.metadata,
        haritaKonum: { x, y },
        region: selectedRegion
      }
    });
  };

  // AI Sections generator based on entity type
  const handleAiGenerateWikiSections = async () => {
    if (!activeEntity) return;
    setAiGeneratingSections(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'wiki-section-oner',
          data: {
            title: activeEntity.title,
            type: activeEntity.type,
            notes: activeEntity.notes || activeEntity.title
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        const sections: { title: string, content: string }[] = JSON.parse(data.result);
        const newSections: WikiSection[] = sections.map((s, idx) => ({
          id: `wiki_${Date.now()}_${idx}`,
          title: s.title,
          content: s.content,
          status: 'öneri' // Marks as proposal
        }));

        await onUpdateItem({
          ...activeEntity,
          metadata: {
            ...activeEntity.metadata,
            wikiSections: [...(activeEntity.metadata?.wikiSections || []), ...newSections]
          }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGeneratingSections(false);
    }
  };

  // AI Profile (Künye) Suggestions Generator
  const handleAiGenerateKunya = async () => {
    if (!activeEntity) return;
    setLoadingKunyaAi(true);
    setKunyaAiSuggestions(null);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'kunya-cikar',
          data: {
            title: activeEntity.title,
            type: activeEntity.type,
            notes: activeEntity.notes || ""
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        const parsed = JSON.parse(data.result);
        if (parsed.profile) {
          setKunyaAiSuggestions(parsed.profile);
        }
      }
    } catch (err) {
      console.error(err);
      alert("AI künye önerisi alınırken bir hata oluştu.");
    } finally {
      setLoadingKunyaAi(false);
    }
  };

  // AI Palette extraction or suggestion based on brand notes
  const handleAiBrandKit = async () => {
    if (!activeEntity) return;
    setLoadingAiBrand(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'logo-renk-cikar',
          data: {
            logoDescription: activeEntity.metadata?.brandKit?.selectedLogo || activeEntity.notes || activeEntity.title
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        const colors: { hex: string, name: string }[] = JSON.parse(data.result);
        const palette = colors.map(c => `${c.hex} (${c.name})`);

        // Suggest Font choices also
        const fontRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: 'baslik-oner',
            data: {
              notes: `Typography suggestions for brand: ${activeEntity.title}`
            }
          })
        });
        const fontData = await fontRes.json();
        const suggestedFonts = fontData.result ? JSON.parse(fontData.result) : ['Inter', 'Space Grotesk'];

        await onUpdateItem({
          ...activeEntity,
          metadata: {
            ...activeEntity.metadata,
            brandKit: {
              ...(activeEntity.metadata?.brandKit || { selectedLogo: '', ideaLogos: [], colorPalette: [], exemplaryWorks: [] }),
              colorPalette: palette,
              selectedFont: suggestedFonts[0] || 'Inter'
            }
          }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAiBrand(false);
    }
  };

  // AI Text continuation helper
  const handleWikiSectionDevamEt = async (sectionId: string) => {
    if (!activeEntity) return;
    const section = activeEntity.metadata?.wikiSections?.find(s => s.id === sectionId);
    if (!section) return;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'devam-et',
          data: {
            text: section.content,
            notes: `Varlık: ${activeEntity.title}, Türü: ${activeEntity.type}, Açıklama: ${activeEntity.notes}`
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        const updatedSections = (activeEntity.metadata?.wikiSections || []).map(s => {
          if (s.id === sectionId) {
            return { ...s, content: s.content + ' ' + data.result };
          }
          return s;
        });

        await onUpdateItem({
          ...activeEntity,
          metadata: {
            ...activeEntity.metadata,
            wikiSections: updatedSections
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWikiSection = async (sectionId: string) => {
    if (!activeEntity) return;
    const updatedSections = (activeEntity.metadata?.wikiSections || []).map(s => {
      if (s.id === sectionId) {
        return { ...s, title: editingWikiTitle, content: editingWikiContent, status: 'resmi' as const };
      }
      return s;
    });

    await onUpdateItem({
      ...activeEntity,
      metadata: {
        ...activeEntity.metadata,
        wikiSections: updatedSections
      }
    });

    setEditingWikiId(null);
  };

  const handleAcceptWikiProposal = async (sectionId: string) => {
    if (!activeEntity) return;
    const updatedSections = (activeEntity.metadata?.wikiSections || []).map(s => {
      if (s.id === sectionId) {
        return { ...s, status: 'resmi' as const };
      }
      return s;
    });

    await onUpdateItem({
      ...activeEntity,
      metadata: {
        ...activeEntity.metadata,
        wikiSections: updatedSections
      }
    });
  };

  const handleRejectWikiProposal = (sectionId: string) => {
    if (!activeEntity) return;
    triggerConfirm(
      "Öneriyi Reddet",
      "Bu AI önerisini reddetmek istediğinize emin misiniz?",
      async () => {
        const updatedSections = (activeEntity.metadata?.wikiSections || []).filter(s => s.id !== sectionId);
        await onUpdateItem({
          ...activeEntity,
          metadata: {
            ...activeEntity.metadata,
            wikiSections: updatedSections
          }
        });
      }
    );
  };

  const handleDeleteWikiSection = (sectionId: string) => {
    if (!activeEntity) return;
    triggerConfirm(
      "Bölümü Sil",
      "Bu wiki bölümünü silmek istediğinize emin misiniz?",
      async () => {
        const updatedSections = (activeEntity.metadata?.wikiSections || []).filter(s => s.id !== sectionId);
        await onUpdateItem({
          ...activeEntity,
          metadata: {
            ...activeEntity.metadata,
            wikiSections: updatedSections
          }
        });
      }
    );
  };

  const handleAddCustomWikiSection = async () => {
    if (!activeEntity || !newSectionTitle.trim()) return;
    const newSection: WikiSection = {
      id: `wiki_${Date.now()}`,
      title: newSectionTitle,
      content: 'Henüz bir içerik yazılmadı.',
      status: 'resmi'
    };

    await onUpdateItem({
      ...activeEntity,
      metadata: {
        ...activeEntity.metadata,
        wikiSections: [...(activeEntity.metadata?.wikiSections || []), newSection]
      }
    });

    setNewSectionTitle('');
  };

  const handleSaveRegionSummaries = async (updatedSummaries: Record<string, string>) => {
    if (mapSettingsItem) {
      await onUpdateItem({
        ...mapSettingsItem,
        metadata: {
          ...mapSettingsItem.metadata,
          regionSummaries: updatedSummaries
        }
      });
    } else {
      await onAddItem({
        title: 'Düzada Özel Haritası',
        area: 'duzada',
        type: 'map_settings',
        status: 'Yayında',
        priority: 'orta',
        tags: ['harita'],
        links: [],
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {
          regionSummaries: updatedSummaries
        }
      });
    }
  };

  const handleSaveMahalleler = async (newMah: any[]) => {
    if (mapSettingsItem) {
      await onUpdateItem({
        ...mapSettingsItem,
        metadata: {
          ...mapSettingsItem.metadata,
          mahalleler: newMah,
          neighborhoods: newMah.map(m => ({ id: m.id, name: m.name, regionId: m.id }))
        }
      });
    } else {
      await onAddItem({
        title: 'Düzada Özel Haritası',
        area: 'duzada',
        type: 'map_settings',
        status: 'Yayında',
        priority: 'orta',
        tags: ['harita'],
        links: [],
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {
          mahalleler: newMah,
          neighborhoods: newMah.map(m => ({ id: m.id, name: m.name, regionId: m.id }))
        }
      });
    }
  };

  const handleSaveSokaklar = async (newSok: any[]) => {
    if (mapSettingsItem) {
      await onUpdateItem({
        ...mapSettingsItem,
        metadata: {
          ...mapSettingsItem.metadata,
          sokaklar: newSok,
          roads: newSok.map(s => ({ id: s.id, name: s.name }))
        }
      });
    } else {
      await onAddItem({
        title: 'Düzada Özel Haritası',
        area: 'duzada',
        type: 'map_settings',
        status: 'Yayında',
        priority: 'orta',
        tags: ['harita'],
        links: [],
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {
          sokaklar: newSok,
          roads: newSok.map(s => ({ id: s.id, name: s.name }))
        }
      });
    }
  };

  const handleSaveNeighborhoods = async (newNbh: any[]) => {
    await handleSaveMahalleler(newNbh.map(n => ({ id: n.id, name: n.name, summary: activeRegionSummaries[n.regionId] || '' })));
  };

  const handleSaveRoads = async (newRoads: any[]) => {
    await handleSaveSokaklar(newRoads.map(r => ({ id: r.id, name: r.name, mahalleId: 'merkez' })));
  };

  // --- NESTED HIERARCHY TREE HELPERS ---

  // 1. Add Mahalle
  const handleAddMahalle = async () => {
    if (!newMahalleName.trim()) return;
    const id = `mah_${Date.now()}`;
    const newMah = {
      id,
      name: newMahalleName.trim(),
      summary: newMahalleSummary.trim() || `${newMahalleName} bölgesi hakkında henüz detaylı bilgi girilmedi.`
    };
    const updated = [...mahalleler, newMah];
    await handleSaveMahalleler(updated);

    setSelectedRegion(id);
    setNewMahalleName('');
    setNewMahalleSummary('');
    setShowAddMahalleForm(false);
  };

  // 2. Update Mahalle
  const handleUpdateMahalle = async (id: string, name: string, summary: string) => {
    const updated = mahalleler.map(m => m.id === id ? { ...m, name, summary } : m);
    await handleSaveMahalleler(updated);
    setEditingMahalleId(null);
  };

  // 3. Delete Mahalle
  const handleDeleteMahalleInTree = async (id: string) => {
    const updated = mahalleler.filter(m => m.id !== id);
    await handleSaveMahalleler(updated);

    const updatedSokaklar = sokaklar.filter(s => s.mahalleId !== id);
    await handleSaveSokaklar(updatedSokaklar);

    for (const ent of entities) {
      if (ent.metadata?.mahalleId === id || ent.metadata?.region === id) {
        await onUpdateItem({
          ...ent,
          metadata: {
            ...ent.metadata,
            mahalleId: null,
            sokakId: null,
            region: 'belirlenmemiş'
          }
        });
      }
    }

    const nextMah = updated[0]?.id || 'merkez';
    setSelectedRegion(nextMah);
  };

  // 4. Add Sokak
  const handleAddSokak = async (mahId: string) => {
    if (!newSokakName.trim()) return;
    const newSok = {
      id: `sok_${Date.now()}`,
      name: newSokakName.trim(),
      mahalleId: mahId
    };
    const updated = [...sokaklar, newSok];
    await handleSaveSokaklar(updated);
    setNewSokakName('');
    setShowAddSokakForm(false);
  };

  // 5. Update Sokak
  const handleUpdateSokak = async (id: string, name: string) => {
    const updated = sokaklar.map(s => s.id === id ? { ...s, name } : s);
    await handleSaveSokaklar(updated);
    setEditingSokakId(null);
  };

  // 6. Delete Sokak
  const handleDeleteSokakInTree = async (id: string) => {
    const updated = sokaklar.filter(s => s.id !== id);
    await handleSaveSokaklar(updated);

    for (const ent of entities) {
      if (ent.metadata?.sokakId === id) {
        await onUpdateItem({
          ...ent,
          metadata: {
            ...ent.metadata,
            sokakId: null,
            mahalleId: null,
            region: 'belirlenmemiş'
          }
        });
      }
    }
  };

  // 7. Add Mekan to Sokak
  const handleAddMekanToSokak = async (sokId: string, mahId: string) => {
    if (!newMekanName.trim()) return;
    await onAddItem({
      title: newMekanName.trim(),
      area: 'duzada',
      type: newMekanType,
      status: 'Yayınlandı',
      priority: 'orta',
      tags: ['coğrafya', 'mekan', newMekanType],
      links: [],
      notes: '',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        sokakId: sokId,
        mahalleId: mahId,
        region: mahId,
        ada: "Düzada"
      }
    });

    setNewMekanName('');
    setAddingMekanSokakId(null);
  };

  // 8. Link existing Mekan to Sokak
  const handleLinkMekanToSokak = async (mekanId: string, sokId: string, mahId: string) => {
    const mekanItem = entities.find(e => e.id === mekanId);
    if (!mekanItem) return;

    await onUpdateItem({
      ...mekanItem,
      metadata: {
        ...(mekanItem.metadata || {}),
        sokakId: sokId,
        mahalleId: mahId,
        region: mahId,
        ada: "Düzada"
      }
    });

    setLinkingMekanSokakId(null);
    setSelectedMekanToLink('');
  };

  // 9. Unplace Mekan from Sokak
  const handleUnplaceMekanFromSokak = async (mekanId: string) => {
    const mekanItem = entities.find(e => e.id === mekanId);
    if (!mekanItem) return;

    await onUpdateItem({
      ...mekanItem,
      metadata: {
        ...(mekanItem.metadata || {}),
        sokakId: null,
        mahalleId: null,
        region: 'belirlenmemiş'
      }
    });
  };

  // AI Region Summarizer
  const handleAiRegionLore = async () => {
    setAiSummarizingRegion(true);
    try {
      const regionEntities = entities.filter(e => e.metadata?.region === selectedRegion);
      const entitySummary = regionEntities.map(e => `${e.title} (${e.type})`).join(", ");

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'devam-et',
          data: {
            text: activeRegionSummaries[selectedRegion] || "",
            notes: `Ege bölgesindeki ${selectedRegion} bölgesi için zengin lore özeti yap. Bölgedeki varlıklar: ${entitySummary}`
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        await handleSaveRegionSummaries({
          ...activeRegionSummaries,
          [selectedRegion]: data.result
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiSummarizingRegion(false);
    }
  };

  // Warning for links before delete or archive
  const handleDeleteEntity = (entity: Item) => {
    const activeRelations = resolveAllRelations(entity, items);
    const hasRelations = activeRelations.length > 0;
    
    const warningMessage = hasRelations
      ? `"${entity.title}" maddesi ${activeRelations.length} diğer varlığa doğrudan veya dolaylı olarak bağlıdır. Bu maddeyi silerseniz bağlı olan diğer tüm varlıklardaki ilişkiler de otomatik olarak güvenli bir şekilde kesilecektir.\n\nYine de KALICI olarak silmek istediğinize emin misiniz?`
      : `"${entity.title}" maddesini ve buna bağlı tüm verileri KALICI olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`;

    triggerConfirm(
      "Maddeyi Kalıcı Olarak Sil",
      warningMessage,
      async () => {
        try {
          // Clean up relations first
          await cleanupRelationsOnDelete(entity.id, items, onUpdateItem);
          // Delete item
          await onDeleteItem(entity.id);
          onSelectItem(null);
        } catch (err) {
          console.error("Error deleting entity:", entity.id, err);
          alert("Madde silinirken bir hata oluştu.");
        }
      }
    );
  };

  // Action helper for three-dots menu on wiki sections in Read Mode
  const renderSectionActions = (id: string, isIntro: boolean, sec?: WikiSection) => {
    return (
      <div className="relative inline-block text-left font-sans shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdownId(activeDropdownId === id ? null : id);
          }}
          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title="Bölüm İşlemleri"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {activeDropdownId === id && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownId(null);
              }}
            />
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#17345A] border border-stone-200 dark:border-[#2C3C72] rounded-lg shadow-lg py-1 z-20 text-[11px] font-semibold text-stone-700 dark:text-stone-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingWikiId(id);
                  if (isIntro) {
                    setEditingWikiTitle("1. Genel Bilgiler & Özet");
                    const isChar = activeEntity && (activeEntity.type === 'kisi' || activeEntity.type === 'karakter');
                    if (isChar) {
                      const kunye = getCharacterKunye(activeEntity);
                      setEditingWikiContent(kunye.summaryText);
                    } else {
                      setEditingWikiContent(activeEntity?.notes || '');
                    }
                  } else if (sec) {
                    setEditingWikiTitle(sec.title);
                    setEditingWikiContent(sec.content);
                  }
                  setActiveDropdownId(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-[#13204A] flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Bölümü Düzenle</span>
              </button>

              {!isIntro && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWikiSectionDevamEt(id);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-[#13204A] flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D35057]" />
                    <span>AI ile Devam Yazdır</span>
                  </button>

                  <div className="border-t border-stone-100 dark:border-stone-800 my-1" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWikiSection(id);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Bölümü Sil</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Cross links: Merch or Blog items linked to active entity
  const connectedMerchItems = useMemo(() => {
    if (!activeEntity) return [];
    return items.filter(i => i.area === 'merch' && ((i.links || []).includes(activeEntity.id) || (activeEntity.links || []).includes(i.id)));
  }, [activeEntity, items]);

  const connectedBlogPosts = useMemo(() => {
    if (!activeEntity) return [];
    return items.filter(i => i.area === 'blog' && ((i.links || []).includes(activeEntity.id) || (activeEntity.links || []).includes(i.id)));
  }, [activeEntity, items]);

  const connectedChapters = useMemo(() => {
    if (!activeEntity) return [];
    return items.filter(i => 
      i.area === 'kitap' && 
      i.type === 'kitap_bolum' && 
      (i.status === 'Yayında' || i.status === 'yayında') && 
      ((i.links || []).includes(activeEntity.id) || (activeEntity.links || []).includes(i.id))
    );
  }, [activeEntity, items]);

  return (
    <div className="space-y-6">
      
      {/* Header breadcrumb & view switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CFC5B4]">
        <div>
          <span className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9]">
            Düzada · Ada & Lore
          </span>
          <h1 className="font-serif font-bold text-2xl text-[#1B2A4A] dark:text-[#F3EFE8] mt-1">
            Ada Evreni & Karakterler
          </h1>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <ConsistencyChecker 
            module="duzada" 
            items={items} 
            onUpdateItem={onUpdateItem} 
            onAddItem={onAddItem} 
            buttonClassName="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg cursor-pointer transition-all flex items-center gap-1"
          />
          <button
            onClick={() => setActiveTab('wiki')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'wiki' ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8]' : 'bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
          >
            Düzada Wiki
          </button>
          <button
            onClick={() => setActiveTab('liste')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'liste' ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8]' : 'bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
          >
            Varlık Arşivi
          </button>
          <button
            onClick={() => setActiveTab('harita')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'harita' ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8]' : 'bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
          >
            Düzada Haritası
          </button>
        </div>
      </div>

      {/* VIEW 1: HARİTA MODU */}
      {activeTab === 'harita' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visual SVG Parchment map */}
          <div className="lg:col-span-2 bg-[#E7EBE6] border border-[#B9C7BD] rounded-xl p-4 archive-shadow relative paper-grain">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-[#4A5E68] font-bold">
                EGE HARİTA ARAYÜZÜ v1
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPinMode(!isAddingPinMode);
                    setNewPinCoords(null);
                    setSelectedPinId(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md border cursor-pointer transition-all ${isAddingPinMode ? 'bg-[#D35057] text-white border-transparent animate-pulse' : 'bg-white hover:bg-stone-50 text-[#1B2A4A] border-stone-300'}`}
                >
                  {isAddingPinMode ? '📍 Haritaya Tıklayın...' : '＋ Pin Ekle'}
                </button>
                <span className="text-xs text-[#6A5E4C] max-w-[200px] truncate sm:max-w-none">
                  {draggingPinId ? "Pini bırakmak için fareyi bırakın." : "Yeni pin için boş bir yere tıklayın."}
                </span>
              </div>
            </div>

            {/* Hand-drawn SVG Map */}
            <div className="border-4 border-double border-[#856C4A]/60 rounded-xl overflow-hidden bg-[#E2D6BE] dark:bg-[#182330] relative shadow-md">
              <svg 
                viewBox="0 0 500 400" 
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    handleSvgClick(e);
                  }
                }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                className="w-full h-auto cursor-crosshair opacity-95 select-none transition-all duration-300"
              >
                {/* Custom Map Image Overlay */}
                {mapSettingsItem?.notes && (
                  <image 
                    href={mapSettingsItem.notes} 
                    x="0" 
                    y="0" 
                    width="500" 
                    height="400" 
                    preserveAspectRatio="none" 
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Sea lines / waves & gorgeous antique map detailing (Only draw if no custom image is loaded) */}
                {!mapSettingsItem?.notes && (
                  <>
                    {/* Background Parchment Grid Overlay */}
                    <path 
                      d="M 0,50 L 500,50 M 0,100 L 500,100 M 0,150 L 500,150 M 0,200 L 500,200 M 0,250 L 500,250 M 0,300 L 500,300 M 0,350 L 500,350 M 50,0 L 50,400 M 100,0 L 100,400 M 150,0 L 150,400 M 200,0 L 200,400 M 250,0 L 250,400 M 300,0 L 300,400 M 350,0 L 350,400 M 400,0 L 400,400 M 450,0 L 450,400" 
                      stroke="#C9BCA3" 
                      strokeWidth="0.5" 
                      strokeDasharray="2,3" 
                      opacity="0.5" 
                    />

                    {/* Concentric Coastal Waves (Classic Cartography Wave Ripples) */}
                    <path 
                      d="M 120 140 C 130 90, 200 70, 290 85 C 380 100, 420 70, 440 120 C 460 170, 470 230, 430 270 C 390 310, 410 360, 360 380 C 310 400, 230 380, 160 350 C 100 320, 60 270, 70 210 C 75 170, 110 190, 120 140 Z" 
                      fill="none" 
                      stroke="#C9BCA3" 
                      strokeWidth="15" 
                      opacity="0.15" 
                      strokeLinejoin="round" 
                    />
                    <path 
                      d="M 120 140 C 130 90, 200 70, 290 85 C 380 100, 420 70, 440 120 C 460 170, 470 230, 430 270 C 390 310, 410 360, 360 380 C 310 400, 230 380, 160 350 C 100 320, 60 270, 70 210 C 75 170, 110 190, 120 140 Z" 
                      fill="none" 
                      stroke="#C9BCA3" 
                      strokeWidth="8" 
                      opacity="0.3" 
                      strokeLinejoin="round" 
                    />

                    {/* Secondary Islet coastal ripples */}
                    <path 
                      d="M 60 65 C 75 55, 95 65, 85 85 C 70 95, 50 85, 60 65 Z" 
                      fill="none" 
                      stroke="#C9BCA3" 
                      strokeWidth="6" 
                      opacity="0.25" 
                      strokeLinejoin="round" 
                    />

                    {/* Beautiful landmass fills */}
                    {/* Main Island: Düzada */}
                    <path 
                      d="M 120 140 C 130 90, 200 70, 290 85 C 380 100, 420 70, 440 120 C 460 170, 470 230, 430 270 C 390 310, 410 360, 360 380 C 310 400, 230 380, 160 350 C 100 320, 60 270, 70 210 C 75 170, 110 190, 120 140 Z" 
                      fill="#FFFBF0" 
                      stroke="#856C4A" 
                      strokeWidth="2" 
                      strokeLinejoin="round" 
                    />

                    {/* Lighthouse Islet */}
                    <path 
                      d="M 60 65 C 75 55, 95 65, 85 85 C 70 95, 50 85, 60 65 Z" 
                      fill="#FFFBF0" 
                      stroke="#856C4A" 
                      strokeWidth="1.5" 
                      strokeLinejoin="round" 
                    />

                    {/* Bottom Reef Islet */}
                    <path 
                      d="M 410 320 C 430 315, 440 330, 425 340 C 410 345, 405 325, 410 320 Z" 
                      fill="#FFFBF0" 
                      stroke="#856C4A" 
                      strokeWidth="1.5" 
                      strokeLinejoin="round" 
                    />

                    {/* Sailboat Illustration in upper sea */}
                    <g transform="translate(140, 100) scale(0.65)" className="pointer-events-none">
                      <path d="M -25,12 C -15,10 15,10 25,12" stroke="#A99B83" strokeWidth="1" fill="none" opacity="0.6" />
                      <path d="M -15 8 C -10 14, 10 14, 15 8 L 18 0 L -18 0 Z" fill="#8C7355" stroke="#4A3B2C" strokeWidth="1.2" />
                      <rect x="-8" y="-4" width="14" height="4" fill="#F4EFE6" stroke="#4A3B2C" strokeWidth="0.8" />
                      <line x1="2" y1="0" x2="2" y2="-22" stroke="#4A3B2C" strokeWidth="1.5" />
                      <path d="M 2 -22 C 10 -15, 12 -5, 2 -2 Z" fill="#FFFBF0" stroke="#856C4A" strokeWidth="1" />
                      <path d="M 1 -20 C -6 -14, -8 -6, 1 -3 Z" fill="#FFFBF0" stroke="#856C4A" strokeWidth="1" />
                      <polygon points="2,-22 -4,-20 2,-18" fill="#D35057" />
                    </g>

                    {/* Sea Monster Splashing in lower right corner */}
                    <g transform="translate(380, 335) scale(0.7)" opacity="0.8" className="pointer-events-none">
                      <path d="M -30,10 C -15,5 15,5 30,10" stroke="#A99B83" strokeWidth="1.2" fill="none" strokeDasharray="2 2" />
                      <path d="M -15,8 Q -10,-12 -5,8" fill="none" stroke="#856C4A" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M 0,8 Q 5,-18 10,8" fill="none" stroke="#856C4A" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M 15,8 Q 20,-8 25,8" fill="none" stroke="#856C4A" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M 30,8 Q 36,-14 42,-18 Q 38,-8 35,8" fill="#856C4A" stroke="#4A3B2C" strokeWidth="1" />
                    </g>

                    {/* Mountain Ranges Detail */}
                    <g stroke="#856C4A" strokeWidth="1.2" fill="#EADCC1" strokeLinejoin="round" className="pointer-events-none">
                      {/* Central Peaks */}
                      <polygon points="240,140 255,115 270,140" />
                      <polygon points="255,115 270,140 255,140" fill="#D2BE9B" opacity="0.8" />
                      <line x1="255" y1="115" x2="255" y2="140" />
                      
                      <polygon points="215,150 230,125 245,150" />
                      <polygon points="230,125 245,150 230,150" fill="#D2BE9B" opacity="0.8" />
                      <line x1="230" y1="125" x2="230" y2="150" />

                      <polygon points="260,145 275,120 290,145" />
                      <polygon points="275,120 290,145 275,145" fill="#D2BE9B" opacity="0.8" />
                      <line x1="275" y1="120" x2="275" y2="145" />
                    </g>

                    {/* Pine Forest Vegetation Icons */}
                    <g stroke="#5C6F52" strokeWidth="0.8" fill="#7E9273" opacity="0.9" className="pointer-events-none">
                      {/* Forest near Çiftlik */}
                      <path d="M 310 220 L 314 212 L 318 220 Z" />
                      <path d="M 315 224 L 319 216 L 323 224 Z" />
                      <path d="M 305 226 L 309 218 L 313 226 Z" />

                      {/* Forest near Merkez */}
                      <path d="M 180 180 L 184 172 L 188 180 Z" />
                      <path d="M 185 184 L 189 176 L 193 184 Z" />
                      <path d="M 175 186 L 179 178 L 183 186 Z" />
                      
                      {/* Forest near Eski Liman */}
                      <path d="M 150 290 L 154 282 L 158 290 Z" />
                      <path d="M 155 294 L 159 286 L 163 294 Z" />
                      <path d="M 145 296 L 149 288 L 153 296 Z" />
                    </g>

                    {/* Lighthouse (FENER) Tower Graphics */}
                    <g transform="translate(68, 70) scale(0.6)" className="pointer-events-none">
                      <polygon points="10,-25 150,-50 145,5 10,-20" fill="#FCD34D" opacity="0.22" />
                      <polygon points="-10,-25 -150,-50 -145,5 -10,-20" fill="#FCD34D" opacity="0.12" />
                      <path d="M -15 15 C -10 10, 10 10, 15 15 Z" fill="#A1A1AA" stroke="#856C4A" strokeWidth="1" />
                      <path d="M -8 15 L -4 -25 L 4 -25 L 8 15 Z" fill="#FFF" stroke="#856C4A" strokeWidth="1.2" />
                      <path d="M -6 -5 L -5 -15 L 5 -15 L 6 -5 Z" fill="#D35057" stroke="#856C4A" strokeWidth="1" />
                      <rect x="-6" y="-29" width="12" height="4" fill="#3F3F46" stroke="#856C4A" strokeWidth="1" />
                      <rect x="-3" y="-35" width="6" height="6" fill="#F59E0B" opacity="0.9" stroke="#856C4A" strokeWidth="1" />
                      <path d="M -4 -35 L 0 -43 L 4 -35 Z" fill="#3F3F46" stroke="#856C4A" strokeWidth="1" />
                    </g>

                    {/* Harbor Jetty at Liman */}
                    <path d="M 104 180 L 125 170 L 120 162 L 98 172 Z" fill="#E4D5B7" stroke="#856C4A" strokeWidth="1.2" className="pointer-events-none" />
                    <g transform="translate(130, 162) scale(0.35) rotate(-30)" className="pointer-events-none">
                      <path d="M -15 0 Q 0 8 15 0 L 10 -5 L -10 -5 Z" fill="#8C7355" stroke="#4A3B2C" strokeWidth="1.5" />
                      <path d="M 0 -5 L 0 -18 Q 8 -12 0 -5 Z" fill="#FFFBF0" stroke="#856C4A" />
                    </g>

                    {/* Windmill / Farm structure at Çiftlik */}
                    <g transform="translate(370, 235) scale(0.6)" className="pointer-events-none">
                      <path d="M -6 10 L -4 -12 L 4 -12 L 6 10 Z" fill="#F4EFE6" stroke="#856C4A" strokeWidth="1.2" />
                      <path d="M -4 -12 C -4 -17, 4 -17, 4 -12 Z" fill="#D35057" stroke="#856C4A" strokeWidth="1" />
                      <g transform="rotate(30)">
                        <line x1="-20" y1="0" x2="20" y2="0" stroke="#856C4A" strokeWidth="1.2" />
                        <line x1="0" y1="-20" x2="0" y2="20" stroke="#856C4A" strokeWidth="1.2" />
                        <polygon points="-20,0 -12,-3 -12,0" fill="#FFF" stroke="#856C4A" strokeWidth="0.8" />
                        <polygon points="20,0 12,3 12,0" fill="#FFF" stroke="#856C4A" strokeWidth="0.8" />
                        <polygon points="0,-20 -3,-12 0,-12" fill="#FFF" stroke="#856C4A" strokeWidth="0.8" />
                        <polygon points="0,20 3,12 0,12" fill="#FFF" stroke="#856C4A" strokeWidth="0.8" />
                      </g>
                    </g>

                    {/* Antik Arena structure at Stad */}
                    <g transform="translate(395, 92) scale(0.5)" className="pointer-events-none">
                      <ellipse cx="0" cy="5" rx="16" ry="10" fill="#E4D5B7" stroke="#856C4A" strokeWidth="1.2" />
                      <ellipse cx="0" cy="2" rx="14" ry="8" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                      <path d="M -16 5 L -16 0 M -12 6 L -12 1 M -8 7 L -8 2 M -4 8 L -4 3 M 0 8 L 0 3 M 4 8 L 4 3 M 8 7 L 8 2 M 12 6 L 12 1 M 16 5 L 16 0" stroke="#856C4A" strokeWidth="1" />
                    </g>

                    {/* Beautifully Crafted Geographic Text Labels */}
                    <text x="80" y="112" className="fill-[#5c4a37] dark:fill-[#C9BCA3] font-serif italic text-[9px] font-bold" stroke="#FFFBF0" strokeWidth="3" paintOrder="stroke" textAnchor="middle">
                      FENER ADASI
                    </text>

                    <text x="110" y="196" className="fill-[#5c4a37] dark:fill-[#C9BCA3] font-serif italic text-[9px] font-bold" stroke="#FFFBF0" strokeWidth="3" paintOrder="stroke" textAnchor="middle">
                      LİMAN KOYU
                    </text>

                    <text x="135" y="325" className="fill-[#5c4a37] dark:fill-[#C9BCA3] font-serif italic text-[9px] font-bold" stroke="#FFFBF0" strokeWidth="3" paintOrder="stroke" textAnchor="middle">
                      KEMSKÖY / ESKİ LİMAN
                    </text>

                    <text x="245" y="192" className="fill-[#1B2A4A] dark:fill-[#FFFBF0] font-serif italic text-[11px] font-bold tracking-wider" stroke="#FFFBF0" strokeWidth="3.5" paintOrder="stroke" textAnchor="middle">
                      DÜZADA MERKEZ
                    </text>

                    <text x="365" y="262" className="fill-[#5c4a37] dark:fill-[#C9BCA3] font-serif italic text-[10px] font-bold" stroke="#FFFBF0" strokeWidth="3" paintOrder="stroke" textAnchor="middle">
                      ÇİFTLİK / DEĞİRMEN
                    </text>

                    <text x="395" y="115" className="fill-[#5c4a37] dark:fill-[#C9BCA3] font-serif italic text-[9px] font-bold" stroke="#FFFBF0" strokeWidth="3" paintOrder="stroke" textAnchor="middle">
                      ANTİK ARENA
                    </text>
                  </>
                )}

                {/* Stunning Classical Compass Rose */}
                <g transform="translate(435, 70) scale(0.65)" className="pointer-events-none">
                  <circle cx="0" cy="0" r="30" stroke="#856C4A" strokeWidth="1" fill="none" />
                  <circle cx="0" cy="0" r="27" stroke="#856C4A" strokeWidth="0.6" strokeDasharray="2,2" fill="none" />
                  
                  <polygon points="0,0 -4,-4 0,-24 4,-4" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 -4,4 0,24 4,4" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 -4,-4 -24,0 -4,4" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 4,-4 24,0 4,4" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                  
                  {/* Main Points */}
                  <polygon points="0,0 -6,-6 0,-32" fill="#D35057" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 6,-6 0,-32" fill="#856C4A" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 -6,6 0,32" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 6,6 0,32" fill="#856C4A" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 6,-6 32,0" fill="#D35057" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 6,6 32,0" fill="#856C4A" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 -6,-6 -32,0" fill="#D8C5A4" stroke="#856C4A" strokeWidth="0.8" />
                  <polygon points="0,0 -6,6 -32,0" fill="#856C4A" stroke="#856C4A" strokeWidth="0.8" />
                  
                  <circle cx="0" cy="0" r="4" fill="#FCF8F0" stroke="#856C4A" strokeWidth="1.2" />
                  <text x="0" y="-36" className="fill-[#1B2A4A] font-serif text-[10px] font-bold" textAnchor="middle">N</text>
                </g>

                {/* Render Interactive Map Pins */}
                {mapPins.map(p => {
                  const isDragging = draggingPinId === p.id;
                  const pos = isDragging ? (dragCoords || p.metadata?.haritaKonum) : p.metadata?.haritaKonum;
                  if (!pos) return null;
                  
                  const isSelected = p.id === selectedPinId || (activeEntity && p.metadata?.linkedEntityId === activeEntity.id);
                  
                  return (
                    <g 
                      key={p.id}
                      transform={`translate(${(pos.x / 100) * 500}, ${(pos.y / 100) * 400})`}
                      className="cursor-pointer group"
                      onMouseDown={(evt) => {
                        evt.stopPropagation();
                        setDraggingPinId(p.id);
                        setDragCoords(p.metadata?.haritaKonum || { x: 50, y: 50 });
                      }}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        if (draggingPinId && draggingPinId !== p.id) return;
                        setSelectedPinId(p.id);
                        setNewPinCoords(null);
                        setIsAddingPinMode(false);
                        if (p.metadata?.linkedEntityId) {
                          onSelectItem(p.metadata.linkedEntityId);
                        } else {
                          onSelectItem(null);
                        }
                      }}
                    >
                      <circle 
                        r={isSelected ? "10" : "7"} 
                        fill={getCategoryColor(p.metadata?.category)} 
                        className="animate-pulse opacity-30" 
                      />
                      <circle 
                        r={isSelected ? "7.5" : "5"} 
                        fill={getCategoryColor(p.metadata?.category)} 
                        stroke="#FFF" 
                        strokeWidth="1.5" 
                      />
                      
                      {/* Name Label Pop up */}
                      <g transform="translate(0, -14)" className="opacity-90 pointer-events-none transition-opacity">
                        <rect 
                          x="-45" 
                          y="-10" 
                          width="90" 
                          height="16" 
                          rx="3" 
                          fill="#1B2A4A" 
                        />
                        <text 
                          className="fill-[#F3EFE8] font-sans text-[8px] font-bold" 
                          textAnchor="middle" 
                          y="1"
                        >
                          {p.title}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Custom Map Upload Controls (Section 3) */}
            <div className="mt-3.5 bg-white/50 dark:bg-[#13204A]/30 border border-[#B9C7BD]/80 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="font-bold text-[#1B2A4A] dark:text-[#F3EFE8] uppercase text-[10px] tracking-wider">
                  🗺️ Kendi Harita Görselinizi Yükleyin
                </span>
                {mapSettingsItem?.notes && (
                  <button
                    onClick={() => {
                      triggerConfirm(
                        "Haritayı Sıfırla",
                        "Kendi harita görselinizi kaldırıp varsayılan haritaya dönmek istediğinize emin misiniz?",
                        async () => {
                          await onDeleteItem(mapSettingsItem.id);
                        }
                      );
                    }}
                    className="text-[10px] cursor-pointer font-bold text-red-500 hover:underline"
                  >
                    Kendi Haritamı Kaldır / Sıfırla
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
                Adanızın el çizimi haritasını veya tasarım görselini yükleyerek karakter konumlarını onun üzerine iğneleyebilirsiniz.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Görsel URL adresi yapıştırın..."
                    className="flex-1 text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#B9C7BD] rounded p-2 focus:outline-hidden"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const val = e.currentTarget.value.trim();
                        if (mapSettingsItem) {
                          await onUpdateItem({
                            ...mapSettingsItem,
                            notes: val
                          });
                        } else {
                          await onAddItem({
                            title: 'Düzada Özel Haritası',
                            area: 'duzada',
                            type: 'map_settings',
                            status: 'Yayında',
                            priority: 'orta',
                            tags: ['harita'],
                            links: [],
                            notes: val,
                            images: [],
                            isProposal: false,
                            archived: false,
                            metadata: {}
                          });
                        }
                        e.currentTarget.value = '';
                        alert("Harita görseli güncellendi!");
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#9A8C76]">veya</span>
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
                          const compressed = await compressImageBase64(base64);
                          if (mapSettingsItem) {
                            await onUpdateItem({
                              ...mapSettingsItem,
                              notes: compressed
                            });
                          } else {
                            await onAddItem({
                              title: 'Düzada Özel Haritası',
                              area: 'duzada',
                              type: 'map_settings',
                              status: 'Yayında',
                              priority: 'orta',
                              tags: ['harita'],
                              links: [],
                              notes: compressed,
                              images: [],
                              isProposal: false,
                              archived: false,
                              metadata: {}
                            });
                          }
                          alert("Özel harita görseliniz başarıyla yüklendi!");
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Region side bar lore & selected pin card */}
          <div className="space-y-4">
            
            {/* New Pin creation form card */}
            {newPinCoords && (
              <div className="bg-[#FFFDF9] dark:bg-[#13204A] border-2 border-dashed border-[#856C4A]/50 p-5 rounded-xl shadow-md paper-grain space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-200 dark:border-[#2C3C72] pb-2">
                  <MapPin className="w-5 h-5 text-[#D35057]" />
                  <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">
                    Yeni Pin Konumlandır
                  </h4>
                </div>
                <div className="text-[11px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 p-1.5 rounded inline-block">
                  Koordinat: X: {newPinCoords.x}% / Y: {newPinCoords.y}%
                </div>
                
                <form onSubmit={handleSaveNewPin} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1 font-bold text-[#D35057]">
                      📍 Konumlandırılacak Viki Maddesi *
                    </label>
                    {unpinnedEntities.length === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded border border-amber-200 dark:border-amber-900/50 leading-relaxed">
                        Haritaya yerleştirilebilecek boşta Viki maddesi kalmadı! Önce Dizin sekmesinden yeni bir madde oluşturun, ardından haritaya tıklayarak buraya yerleştirin.
                      </p>
                    ) : (
                      <select
                        required
                        value={newPinLinkedId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPinLinkedId(val);
                          const chosen = unpinnedEntities.find(ent => ent.id === val);
                          if (chosen) {
                            setNewPinTitle(chosen.title);
                            // Pre-fill notes if they exist, or use a default
                            setNewPinNotes(chosen.notes || '');
                            
                            // Pre-fill region if it exists
                            if (chosen.metadata?.region) {
                              setNewPinRegion(chosen.metadata.region);
                            }

                            // Smart category mapping based on entity type
                            if (chosen.type === 'kisi' || chosen.type === 'karakter') {
                              setNewPinCategory('kişi');
                            } else if (chosen.type === 'mekân' || chosen.type === 'dükkân') {
                              setNewPinCategory('işletme');
                            } else if (chosen.type === 'yer') {
                              setNewPinCategory('coğrafi');
                            } else {
                              setNewPinCategory('lokasyon');
                            }
                          } else {
                            setNewPinTitle('');
                            setNewPinNotes('');
                          }
                        }}
                        className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded font-sans text-xs focus:ring-[#D35057] focus:border-[#D35057]"
                      >
                        <option value="">-- Bir Viki Maddesi Seçin --</option>
                        {unpinnedEntities.map(ent => (
                          <option key={ent.id} value={ent.id}>
                            [{ent.type.toUpperCase()}] {ent.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {newPinLinkedId && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Kategori / Görünüm Simgesi</label>
                        <select
                          value={newPinCategory}
                          onChange={(e) => setNewPinCategory(e.target.value as any)}
                          className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded"
                        >
                          <option value="lokasyon">🔴 Lokasyon (Kırmızı)</option>
                          <option value="coğrafi">🟠 Coğrafi Nokta (Turuncu)</option>
                          <option value="kişi">🔵 Kişi/Sakin Evi (İndigo)</option>
                          <option value="işletme">🟢 İşletme/Dükkan (Zümrüt)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Bağlı Olduğu Bölge</label>
                        <select
                          value={newPinRegion}
                          onChange={(e) => setNewPinRegion(e.target.value)}
                          className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded capitalize"
                        >
                          {activeRegionList.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Harita Açıklaması (İsteğe Bağlı)</label>
                        <textarea
                          placeholder="Harita iğnesi üzerine tıklandığında gösterilecek ek notlar..."
                          value={newPinNotes}
                          onChange={(e) => setNewPinNotes(e.target.value)}
                          className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded h-16"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setNewPinCoords(null)}
                      className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-[#2C3C72] rounded text-stone-700 dark:text-stone-200 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      disabled={!newPinLinkedId}
                      className={`px-3 py-1.5 text-white rounded font-bold cursor-pointer transition-colors ${newPinLinkedId ? 'bg-[#D35057] hover:bg-[#b04046]' : 'bg-stone-300 dark:bg-stone-700 cursor-not-allowed text-stone-500'}`}
                    >
                      Pini Kaydet
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Selected Pin Details / Editing Panel */}
            {selectedPinId && items.find(i => i.id === selectedPinId) && (() => {
              const selectedPin = items.find(i => i.id === selectedPinId)!;
              return (
                <div className="bg-[#FBF9F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain space-y-4">
                  <div className="flex items-center justify-between border-b border-[#CFC5B4]/50 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse" 
                        style={{ backgroundColor: getCategoryColor(selectedPin.metadata?.category) }} 
                      />
                      <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">
                        📍 Seçili Pin Detayları
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerConfirm(
                          "Pini Sil",
                          `"${selectedPin.title}" pinini haritadan tamamen kaldırmak istediğinize emin misiniz? Bağımlı ansiklopedi varlığı SİLİNMEYECEKTİR.`,
                          async () => {
                            await onDeleteItem(selectedPin.id);
                            setSelectedPinId(null);
                          }
                        );
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Pini Sil
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Pin Adı</label>
                      <input 
                        type="text" 
                        value={selectedPin.title}
                        onChange={async (e) => {
                          await onUpdateItem({ ...selectedPin, title: e.target.value });
                        }}
                        className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded font-serif font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Kategori</label>
                      <select
                        value={selectedPin.metadata?.category || 'lokasyon'}
                        onChange={async (e) => {
                          await onUpdateItem({
                            ...selectedPin,
                            metadata: { ...selectedPin.metadata, category: e.target.value }
                          });
                        }}
                        className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded"
                      >
                        <option value="lokasyon">📍 Lokasyon (Kırmızı)</option>
                        <option value="coğrafi">🌄 Coğrafi Nokta (Turuncu)</option>
                        <option value="kişi">👤 Kişi/Sakin Evi (İndigo)</option>
                        <option value="işletme">💼 İşletme/Dükkan (Zümrüt)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Bölge</label>
                      <select
                        value={selectedPin.metadata?.region || 'merkez'}
                        onChange={async (e) => {
                          await onUpdateItem({
                            ...selectedPin,
                            metadata: { ...selectedPin.metadata, region: e.target.value }
                          });
                        }}
                        className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded capitalize"
                      >
                        {activeRegionList.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">İlişkili Ansiklopedi Varlığı</label>
                      <select
                        value={selectedPin.metadata?.linkedEntityId || ''}
                        onChange={async (e) => {
                          await onUpdateItem({
                            ...selectedPin,
                            metadata: { ...selectedPin.metadata, linkedEntityId: e.target.value || null },
                            links: e.target.value ? [e.target.value] : []
                          });
                        }}
                        className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded"
                      >
                        <option value="">-- Bağlantı Yok --</option>
                        {entities.filter(ent => ent.type !== 'map_pin').map(ent => (
                          <option key={ent.id} value={ent.id}>[{ent.type.toUpperCase()}] {ent.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-stone-500 dark:text-stone-300 mb-1">Pin Açıklaması</label>
                      <textarea
                        placeholder="Pin lore detayları..."
                        value={selectedPin.notes || ''}
                        onChange={async (e) => {
                          await onUpdateItem({ ...selectedPin, notes: e.target.value });
                        }}
                        className="w-full p-2 border border-stone-300 dark:border-[#2C3C72] bg-white dark:bg-stone-900 rounded h-16 text-xs"
                      />
                    </div>

                    <div className="pt-2 flex justify-between items-center text-[11px] font-mono text-stone-400">
                      <span>Koordinat: X: {selectedPin.metadata?.haritaKonum?.x || 0} / Y: {selectedPin.metadata?.haritaKonum?.y || 0}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPinId(null)}
                        className="text-[#D35057] hover:underline cursor-pointer font-bold"
                      >
                        Seçimi Kapat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Active Pin mini card (If no direct pin selected, shows entity's pin) */}
            {!selectedPinId && activeEntity && activeEntity.metadata?.haritaKonum && (
              <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-4 rounded-xl archive-shadow paper-grain space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#D35057]" />
                  <div>
                    <span className="text-[9px] font-mono uppercase bg-[#1B2A4A]/15 dark:bg-[#2C3C72] px-1.5 py-0.5 rounded-sm">
                      {activeEntity.type}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8]">
                      {activeEntity.title}
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] line-clamp-3">
                  {activeEntity.notes || "Bu konum için bir not veya wiki içeriği henüz girilmedi."}
                </p>
                
                <div className="flex justify-between items-center text-[10px] font-mono text-[#9A8C76]">
                  <span>Bölge: <span className="capitalize text-[#1B2A4A] dark:text-[#F3EFE8] font-bold">{activeEntity.metadata?.region || 'Bilinmiyor'}</span></span>
                  <span>X: {activeEntity.metadata?.haritaKonum.x} / Y: {activeEntity.metadata?.haritaKonum.y}</span>
                </div>

                <button
                  onClick={() => setActiveTab('liste')}
                  className="w-full text-center text-xs font-mono py-1.5 border border-[#CFC5B4] hover:bg-[#CFC5B4]/10 rounded-lg transition-colors cursor-pointer"
                >
                  Detaylı Sayfaya Git
                </button>
              </div>
            )}

            {/* Düzada Coğrafi Yerleşim Ağacı (Hierarchy Tree) */}
            <div className="bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 rounded-xl archive-shadow paper-grain space-y-4">
              <div className="flex items-center justify-between border-b border-[#CFC5B4]/50 pb-2">
                <div>
                  <span className="text-[9px] font-mono uppercase bg-[#1B2A4A]/10 dark:bg-[#2C3C72] px-1.5 py-0.5 rounded-sm font-bold tracking-wider text-stone-600 dark:text-stone-300">
                    COĞRAFYA SİSTEMİ
                  </span>
                  <h3 className="font-serif font-bold text-base text-[#1B2A4A] dark:text-[#F3EFE8] mt-0.5">
                    Düzada Yerleşim Ağacı
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-500 font-bold">🏝️ Düzada (Ada)</span>
              </div>

              {/* MAHALLE SEÇİMİ VE YÖNETİMİ */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold tracking-wider">
                    🏡 1. Seviye: Mahalleler / Köyler ({mahalleler.length})
                  </span>
                  <button
                    onClick={() => {
                      setShowAddMahalleForm(!showAddMahalleForm);
                      setEditingMahalleId(null);
                    }}
                    className="text-[10px] font-mono text-[#D35057] hover:underline cursor-pointer font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddMahalleForm ? 'Kapat' : 'Mahalle Ekle'}
                  </button>
                </div>

                {/* Add Mahalle Form */}
                {showAddMahalleForm && (
                  <div className="p-3 bg-white dark:bg-[#12224A]/40 border border-stone-200 dark:border-[#2C3C72] rounded-lg space-y-2 text-xs">
                    <h4 className="font-bold font-serif text-[#1B2A4A] dark:text-[#F3EFE8]">Yeni Mahalle / Köy Ekle</h4>
                    <input
                      type="text"
                      placeholder="Mahalle Adı (örn: Kuzey Yamacı)"
                      value={newMahalleName}
                      onChange={(e) => setNewMahalleName(e.target.value)}
                      className="w-full p-1.5 border border-stone-300 dark:border-[#2C3C72] bg-transparent rounded text-xs text-stone-800 dark:text-stone-100 font-medium"
                    />
                    <textarea
                      placeholder="Mahalle Açıklaması / Hikayesi..."
                      value={newMahalleSummary}
                      onChange={(e) => setNewMahalleSummary(e.target.value)}
                      className="w-full p-1.5 border border-stone-300 dark:border-[#2C3C72] bg-transparent rounded text-xs h-16 text-stone-800 dark:text-stone-100"
                    />
                    <button
                      onClick={handleAddMahalle}
                      className="w-full py-1.5 bg-[#D35057] text-white rounded text-xs font-mono font-bold cursor-pointer"
                    >
                      Mahalleyi Kaydet
                    </button>
                  </div>
                )}

                {/* Edit Mahalle Form */}
                {editingMahalleId && (
                  <div className="p-3 bg-white dark:bg-[#12224A]/40 border border-stone-200 dark:border-[#2C3C72]/50 rounded-lg space-y-2 text-xs">
                    <h4 className="font-bold font-serif text-[#1B2A4A] dark:text-[#F3EFE8]">Mahalleyi Düzenle</h4>
                    <input
                      type="text"
                      value={editingMahalleName}
                      onChange={(e) => setEditingMahalleName(e.target.value)}
                      className="w-full p-1.5 border border-stone-300 dark:border-[#2C3C72] bg-transparent rounded text-xs text-stone-800 dark:text-stone-100 font-medium"
                    />
                    <textarea
                      value={editingMahalleSummary}
                      onChange={(e) => setEditingMahalleSummary(e.target.value)}
                      className="w-full p-1.5 border border-stone-300 dark:border-[#2C3C72] bg-transparent rounded text-xs h-20 text-stone-800 dark:text-stone-100"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingMahalleId(null)}
                        className="flex-1 py-1 bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-100 rounded text-[11px] font-mono"
                      >
                        İptal
                      </button>
                      <button
                        onClick={() => handleUpdateMahalle(editingMahalleId, editingMahalleName, editingMahalleSummary)}
                        className="flex-1 py-1 bg-[#D35057] text-white rounded text-[11px] font-mono font-bold"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                )}

                {/* Mahalle Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  {mahalleler.map(mah => (
                    <button
                      key={mah.id}
                      onClick={() => setSelectedRegion(mah.id)}
                      className={`py-1.5 px-2 rounded-md transition-all border text-center truncate relative group ${selectedRegion === mah.id ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-white border-transparent' : 'bg-[#F6F1E7] dark:bg-[#17345A] text-[#6A5E4C] dark:text-[#A6B0C9] border-[#CFC5B4] dark:border-[#2C3C72]'}`}
                    >
                      <span className="block truncate font-bold text-[11px]">{mah.name}</span>
                    </button>
                  ))}
                </div>

                {/* Active Mahalle Details & Action Bar */}
                {(() => {
                  const activeMah = mahalleler.find(m => m.id === selectedRegion);
                  if (!activeMah) return null;
                  return (
                    <div className="p-3 bg-[#F6F1E7] dark:bg-[#17345A]/30 border border-[#CFC5B4]/50 dark:border-[#2C3C72]/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-serif font-bold text-[#1B2A4A] dark:text-[#F3EFE8] uppercase">
                          {activeMah.name} Açıklaması
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingMahalleId(activeMah.id);
                              setEditingMahalleName(activeMah.name);
                              setEditingMahalleSummary(activeMah.summary || '');
                              setShowAddMahalleForm(false);
                            }}
                            className="text-[10px] font-mono text-[#D35057] hover:underline cursor-pointer"
                          >
                            Düzenle
                          </button>
                          {mahalleler.length > 1 && (
                            <button
                              onClick={() => {
                                triggerConfirm(
                                  "Mahalleyi Sil",
                                  `"${activeMah.name}" mahallesini silmek istediğinize emin misiniz? Mahalledeki tüm sokaklar ve buradaki mekanların konum bağlantıları kaldırılacaktır.`,
                                  () => handleDeleteMahalleInTree(activeMah.id)
                                );
                              }}
                              className="text-[10px] font-mono text-red-500 hover:underline cursor-pointer"
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-relaxed italic">
                        {activeMah.summary || "Bu mahalle hakkında henüz bir hikaye yazılmadı."}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* CADDE VE SOKAKLAR (LEVEL 2) */}
              <div className="border-t border-[#CFC5B4]/50 pt-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold tracking-wider">
                    🛣️ 2. Seviye: Cadde & Sokaklar ({sokaklar.filter(s => s.mahalleId === selectedRegion).length})
                  </span>
                  <button
                    onClick={() => {
                      setShowAddSokakForm(!showAddSokakForm);
                      setEditingSokakId(null);
                    }}
                    className="text-[10px] font-mono text-[#D35057] hover:underline cursor-pointer font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    {showAddSokakForm ? 'Kapat' : 'Sokak Ekle'}
                  </button>
                </div>

                {/* Add Sokak Form */}
                {showAddSokakForm && (
                  <div className="p-3 bg-white dark:bg-[#12224A]/40 border border-stone-200 dark:border-[#2C3C72] rounded-lg space-y-2 text-xs">
                    <h4 className="font-bold font-serif text-[#1B2A4A] dark:text-[#F3EFE8]">Yeni Cadde / Sokak Ekle</h4>
                    <p className="text-[10px] text-[#6A5E4C] dark:text-stone-400">Bu sokak, seçili mahalle olan <b>{mahalleler.find(m => m.id === selectedRegion)?.name}</b> içinde oluşturulacaktır.</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Yol/Sokak Adı (örn: Liman Yolu)"
                        value={newSokakName}
                        onChange={(e) => setNewSokakName(e.target.value)}
                        className="flex-1 p-1.5 border border-stone-300 dark:border-[#2C3C72] bg-transparent rounded text-xs text-stone-800 dark:text-stone-100 font-medium"
                      />
                      <button
                        onClick={() => handleAddSokak(selectedRegion)}
                        className="px-3 bg-[#D35057] text-white rounded text-xs font-mono font-bold cursor-pointer"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                )}

                {/* Sokaklar Accordion Tree */}
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {sokaklar.filter(s => s.mahalleId === selectedRegion).length === 0 && (
                    <span className="text-xs text-stone-400 italic block text-center py-4 bg-[#F6F1E7]/40 rounded-lg">Bu mahallede henüz tanımlanmış bir cadde/sokak yok.</span>
                  )}

                  {sokaklar.filter(s => s.mahalleId === selectedRegion).map(sok => {
                    const sokMekanlari = entities.filter(e => 
                      e.metadata?.sokakId === sok.id && e.metadata?.mahalleId === selectedRegion
                    );

                    return (
                      <div key={sok.id} className="bg-white/80 dark:bg-[#12224A]/20 border border-[#CFC5B4]/50 dark:border-[#2C3C72]/40 rounded-lg p-2.5 space-y-2">
                        {/* Sokak Row */}
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#2C3C72]/30 pb-1.5">
                          {editingSokakId === sok.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editingSokakName}
                                onChange={(e) => setEditingSokakName(e.target.value)}
                                className="p-1 border border-[#D35057] rounded text-xs bg-transparent flex-1 text-stone-800 dark:text-stone-100"
                              />
                              <button
                                onClick={() => handleUpdateSokak(sok.id, editingSokakName)}
                                className="p-1 bg-[#D35057] text-white rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif font-bold text-xs text-[#1B2A4A] dark:text-[#F3EFE8]">{sok.name}</span>
                              <span className="text-[9px] font-mono text-stone-400 bg-stone-100 dark:bg-[#17345A] px-1 rounded-sm">
                                {sokMekanlari.length} Mekan
                              </span>
                            </div>
                          )}

                          {editingSokakId !== sok.id && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingSokakId(sok.id);
                                  setEditingSokakName(sok.name);
                                }}
                                className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] hover:underline cursor-pointer"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={() => {
                                  triggerConfirm(
                                    "Sokağı Sil",
                                    `"${sok.name}" sokağını silmek istediğinize emin misiniz? Sokağa bağlı mekanların sokak bağlantısı kaldırılacaktır.`,
                                    () => handleDeleteSokakInTree(sok.id)
                                  );
                                }}
                                className="text-[10px] text-red-500 hover:underline cursor-pointer"
                              >
                                Sil
                              </button>
                            </div>
                          )}
                        </div>

                        {/* MEKANLAR (LEVEL 3) LIST ON THIS STREET */}
                        <div className="pl-1.5 space-y-1">
                          {sokMekanlari.length === 0 ? (
                            <span className="text-[10px] text-stone-400 italic block py-1">Bu sokakta henüz mekan bulunmuyor.</span>
                          ) : (
                            sokMekanlari.map(mekan => {
                              let typeIcon = <MapPin className="w-3 h-3 text-[#D35057]" />;
                              if (mekan.type === 'dükkân') {
                                typeIcon = <Store className="w-3 h-3 text-amber-500" />;
                              } else if (mekan.type === 'yer') {
                                typeIcon = <Compass className="w-3 h-3 text-indigo-500" />;
                              }

                              return (
                                <div key={mekan.id} className="flex items-center justify-between group py-1 border-b border-dashed border-stone-100 dark:border-stone-800/40 last:border-0">
                                  <div 
                                    onClick={() => {
                                      setActiveTab('liste');
                                      onSelectItem(mekan.id);
                                    }}
                                    className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#1B2A4A] dark:text-[#A6B0C9] hover:text-[#D35057] hover:underline truncate"
                                  >
                                    {typeIcon}
                                    <span className="truncate font-medium">{mekan.title}</span>
                                    <span className="text-[8px] font-mono opacity-50 uppercase scale-90 text-stone-400">({mekan.type})</span>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                      title="Sokaktan Kaldır"
                                      onClick={() => handleUnplaceMekanFromSokak(mekan.id)}
                                      className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-100 text-[9px] font-mono px-1 border border-stone-200 dark:border-stone-700 rounded bg-white/50 dark:bg-[#12224A]/40 cursor-pointer"
                                    >
                                      Bağlantıyı Kes
                                    </button>
                                    <button
                                      title="Tamamen Sil"
                                      onClick={() => {
                                        triggerConfirm(
                                          "Varlığı Sil",
                                          `"${mekan.title}" varlığını ansiklopediden tamamen silmek istediğinize emin misiniz?`,
                                          () => onDeleteItem(mekan.id)
                                        );
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* ADD / LINK MEKAN ACTIONS ON SOKAK */}
                        <div className="pt-2 flex items-center justify-between text-[10px] gap-2 border-t border-dotted border-stone-200 dark:border-stone-700/50">
                          <button
                            onClick={() => {
                              setAddingMekanSokakId(addingMekanSokakId === sok.id ? null : sok.id);
                              setLinkingMekanSokakId(null);
                            }}
                            className="text-[#D35057] hover:underline font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Yeni Mekan Ekle
                          </button>
                          <button
                            onClick={() => {
                              setLinkingMekanSokakId(linkingMekanSokakId === sok.id ? null : sok.id);
                              setAddingMekanSokakId(null);
                              const unplaced = entities.filter(e => 
                                (e.type === 'yer' || e.type === 'mekân' || e.type === 'dükkân') && 
                                e.metadata?.sokakId !== sok.id
                              );
                              if (unplaced.length > 0) {
                                setSelectedMekanToLink(unplaced[0].id);
                              }
                            }}
                            className="text-[#1B2A4A] dark:text-[#A6B0C9] hover:underline font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Link className="w-2.5 h-2.5" />
                            Mevcut Mekan Yerleştir
                          </button>
                        </div>

                        {/* Inline Form: Add Mekan */}
                        {addingMekanSokakId === sok.id && (
                          <div className="p-2 bg-[#F6F1E7]/40 dark:bg-stone-900/40 rounded-md border border-stone-200 dark:border-stone-700 space-y-1.5 text-[10px]">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Mekan / Dükkan Adı"
                                value={newMekanName}
                                onChange={(e) => setNewMekanName(e.target.value)}
                                className="flex-1 p-1 border border-stone-300 dark:border-stone-700 bg-transparent rounded text-[10px] text-stone-800 dark:text-stone-100 font-medium"
                              />
                              <select
                                value={newMekanType}
                                onChange={(e) => setNewMekanType(e.target.value as any)}
                                className="p-1 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 rounded text-[10px]"
                              >
                                <option value="mekân">Mekân</option>
                                <option value="dükkân">Dükkân</option>
                                <option value="yer">Yer</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handleAddMekanToSokak(sok.id, selectedRegion)}
                              className="w-full py-1 bg-[#D35057] text-white rounded font-mono font-bold cursor-pointer"
                            >
                              Yeni Mekanı Kaydet ve Yerleştir
                            </button>
                          </div>
                        )}

                        {/* Inline Form: Link Existing Mekan */}
                        {linkingMekanSokakId === sok.id && (() => {
                          const unplacedMekanlar = entities.filter(e => 
                            (e.type === 'yer' || e.type === 'mekân' || e.type === 'dükkân') && 
                            e.metadata?.sokakId !== sok.id
                          );

                          return (
                            <div className="p-2 bg-[#F6F1E7]/40 dark:bg-stone-900/40 rounded-md border border-stone-200 dark:border-stone-700 space-y-1.5 text-[10px]">
                              {unplacedMekanlar.length === 0 ? (
                                <span className="text-stone-400 italic block">Yerleştirilebilecek boşta mekan bulunamadı.</span>
                              ) : (
                                <>
                                  <select
                                    value={selectedMekanToLink}
                                    onChange={(e) => setSelectedMekanToLink(e.target.value)}
                                    className="w-full p-1 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 rounded text-[10px]"
                                  >
                                    {unplacedMekanlar.map(m => (
                                      <option key={m.id} value={m.id}>
                                        {m.title} ({m.type})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleLinkMekanToSokak(selectedMekanToLink, sok.id, selectedRegion)}
                                    className="w-full py-1 bg-[#1B2A4A] dark:bg-stone-700 text-white rounded font-mono font-bold cursor-pointer"
                                  >
                                    Mevcut Mekanı Buraya Yerleştir
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })()}

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SOKAK DIŞI MEKANLAR */}
              {(() => {
                const unassignedMekanlar = entities.filter(e => 
                  e.metadata?.region === selectedRegion &&
                  (e.type === 'yer' || e.type === 'mekân' || e.type === 'dükkân') &&
                  !e.metadata?.sokakId &&
                  !e.id.startsWith('region_')
                );

                if (unassignedMekanlar.length === 0) return null;

                return (
                  <div className="border-t border-[#CFC5B4]/50 pt-3 flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase font-bold tracking-wider">
                      🗺️ Sokak Belirtilmemiş Varlıklar ({unassignedMekanlar.length})
                    </span>
                    <div className="bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 rounded-lg p-2.5 space-y-1.5">
                      {unassignedMekanlar.map(mekan => (
                        <div key={mekan.id} className="flex items-center justify-between text-xs">
                          <span 
                            onClick={() => {
                              setActiveTab('liste');
                              onSelectItem(mekan.id);
                            }}
                            className="font-medium text-[#1B2A4A] dark:text-[#A6B0C9] hover:text-[#D35057] hover:underline truncate cursor-pointer"
                          >
                            {mekan.title}
                          </span>
                          <span className="text-[9px] text-stone-400 font-mono italic">Sokaksız</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* VIEW 1.5: WIKI MODU (Düzada World Wikipedia Hub) */}
      {activeTab === 'wiki' && (
        <DuzadaWiki
          items={items}
          onUpdateItem={onUpdateItem}
          onAddItem={onAddItem}
          onSelectItem={onSelectItem}
          setActiveTab={setActiveTab}
          setSelectedCategory={setSelectedCategory}
          mahalleler={mahalleler}
          sokaklar={sokaklar}
        />
      )}

      {/* VIEW 2: LİSTE MODU (Wikipedia-Style Encyclopedic Archive) */}
      {activeTab === 'liste' && (() => {
        // Filter and categorize directory entries
        const filteredEntities = (() => {
          if (selectedCategory === 'Bölümler') {
            return items.filter(i => 
              i.area === 'kitap' && 
              i.type === 'kitap_bolum' && 
              (i.status === 'Yayında' || i.status === 'yayında') && 
              !i.archived
            );
          }
          return entities.filter(e => {
            // Category filter
            if (selectedCategory !== 'Hepsi') {
              const typeMap: Record<string, ItemType[]> = {
                'Kişiler': ['kisi', 'karakter'],
                'Markalar': ['marka', 'kulüp'],
                'Mekânlar': ['mekân', 'dükkân'],
                'Yerler': ['yer'],
                'Olaylar': ['olay'],
                'Ürünler': ['ürün']
              };
              const allowedTypes = typeMap[selectedCategory] || [];
              if (!allowedTypes.includes(e.type)) return false;
            }
            
            // Search string filter
            if (searchFilter.trim() !== '') {
              const query = searchFilter.toLowerCase();
              const matchTitle = e.title.toLowerCase().includes(query);
              const matchNotes = e.notes?.toLowerCase().includes(query);
              const matchTags = e.tags.some(t => t.toLowerCase().includes(query));
              return matchTitle || matchNotes || matchTags;
            }
            
            return true;
          });
        })();

        // Helper to dynamically match text with other entity names and render them as interactive links
        const renderWikiContentWithLinks = (content: string) => {
          if (!content) return <span className="italic text-stone-400">Henüz bilgi girilmemiş.</span>;
          
          const otherEntities = entities
            .filter(e => e.id !== activeEntity?.id)
            .sort((a, b) => b.title.length - a.title.length); // match longest titles first
            
          if (otherEntities.length === 0) {
            return <span>{content}</span>;
          }
          
          // Escape regex characters
          const escapedTitles = otherEntities.map(e => e.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
          const regexStr = `\\b(${escapedTitles.join('|')})\\b`;
          
          try {
            const regex = new RegExp(regexStr, 'gi');
            const parts = content.split(regex);
            if (parts.length <= 1) return <span>{content}</span>;
            
            return (
              <span>
                {parts.map((part, index) => {
                  // Captured matches are placed on odd indices
                  if (index % 2 === 1) {
                    const matched = otherEntities.find(e => e.title.toLowerCase() === part.toLowerCase());
                    if (matched) {
                      return (
                        <button
                          key={index}
                          onClick={(evt) => {
                            evt.preventDefault();
                            onSelectItem(matched.id);
                          }}
                          className="text-[#D35057] dark:text-[#E76F51] hover:underline font-semibold cursor-pointer inline bg-transparent p-0 border-none align-baseline text-left"
                          title={`${matched.title} maddesini oku`}
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
            return <span>{content}</span>;
          }
        };

        const renderInlineStyles = (text: string, otherEnts: any[]): React.ReactNode => {
          if (!text) return '';

          // Sort other entities by title length desc to prevent partial matches
          const sortedEntities = [...otherEnts].sort((a, b) => b.title.length - a.title.length);

          const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\](?:\(.*?\))?)/g;
          const parts = text.split(regex);

          return (
            <>
              {parts.map((part, pIdx) => {
                if (!part) return null;

                // 1. Bold Check
                if (part.startsWith('**') && part.endsWith('**')) {
                  const inner = part.slice(2, -2);
                  return <strong key={pIdx} className="font-bold text-stone-900 dark:text-white">{renderInlineStyles(inner, otherEnts)}</strong>;
                }

                // 2. Italic Check
                if (part.startsWith('*') && part.endsWith('*')) {
                  const inner = part.slice(1, -1);
                  return <em key={pIdx} className="italic text-stone-800 dark:text-stone-200">{renderInlineStyles(inner, otherEnts)}</em>;
                }

                // 3. Bracket Link Check
                if (part.startsWith('[') && part.includes(']')) {
                  const match = part.match(/^\[([^\]]+)\](?:\(([^)]+)\))?/);
                  if (match) {
                    const title = match[1];
                    const explicitId = match[2];
                    
                    let matchedEnt = sortedEntities.find(e => {
                      if (explicitId) return e.id === explicitId;
                      return e.title.toLowerCase() === title.toLowerCase();
                    });
                    
                    if (!matchedEnt && activeEntity) {
                      if (activeEntity.title.toLowerCase() === title.toLowerCase()) {
                        matchedEnt = activeEntity;
                      }
                    }

                    if (matchedEnt) {
                      return (
                        <button
                          key={pIdx}
                          onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            onSelectItem(matchedEnt.id);
                          }}
                          className="text-[#D35057] dark:text-[#E76F51] hover:underline font-semibold cursor-pointer inline bg-transparent p-0 border-none align-baseline text-left font-serif text-[15px]"
                          title={`${matchedEnt.title} maddesini oku`}
                        >
                          {title}
                        </button>
                      );
                    } else {
                      return <span key={pIdx} className="text-[#1B2A4A] dark:text-stone-300 font-serif font-semibold">[{title}]</span>;
                    }
                  }
                }

                // 4. Fallback Auto-linking of un-bracketed entity names
                const escapedTitles = sortedEntities.map(e => e.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                if (escapedTitles.length === 0) {
                  return <span key={pIdx}>{part}</span>;
                }

                const nameRegexStr = `\\b(${escapedTitles.join('|')})\\b`;
                try {
                  const nameRegex = new RegExp(nameRegexStr, 'gi');
                  const subParts = part.split(nameRegex);
                  if (subParts.length <= 1) {
                    return <span key={pIdx}>{part}</span>;
                  }

                  return (
                    <span key={pIdx}>
                      {subParts.map((sub, sIdx) => {
                        if (sIdx % 2 === 1) {
                          const matched = sortedEntities.find(e => e.title.toLowerCase() === sub.toLowerCase());
                          if (matched) {
                            return (
                              <button
                                key={sIdx}
                                onClick={(evt) => {
                                  evt.preventDefault();
                                  evt.stopPropagation();
                                  onSelectItem(matched.id);
                                }}
                                className="text-[#D35057] dark:text-[#E76F51] hover:underline font-semibold cursor-pointer inline bg-transparent p-0 border-none align-baseline text-left font-serif text-[15px]"
                                title={`${matched.title} maddesini oku`}
                              >
                                {sub}
                              </button>
                            );
                          }
                        }
                        return sub;
                      })}
                    </span>
                  );
                } catch {
                  return <span key={pIdx}>{part}</span>;
                }
              })}
            </>
          );
        };

        const renderRichTextContent = (content: string, otherEnts: any[]) => {
          if (!content) return <span className="italic text-stone-400">Henüz bilgi girilmemiş.</span>;

          const blocks = content.split(/\n\n+/);

          return (
            <div className="space-y-4 font-serif text-sm md:text-base leading-relaxed text-[#1B2A4A] dark:text-[#F3EFE8] max-w-2xl">
              {blocks.map((block, bIdx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // Headings
                if (trimmed.startsWith('## ')) {
                  return (
                    <h3 key={bIdx} className="font-serif text-lg md:text-xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] mt-6 mb-2 border-b border-stone-200 dark:border-stone-800 pb-1">
                      {renderInlineStyles(trimmed.slice(3), otherEnts)}
                    </h3>
                  );
                }
                if (trimmed.startsWith('### ')) {
                  return (
                    <h4 key={bIdx} className="font-serif text-base md:text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8] mt-4 mb-2">
                      {renderInlineStyles(trimmed.slice(4), otherEnts)}
                    </h4>
                  );
                }

                // Blockquotes
                if (trimmed.startsWith('>')) {
                  const quoteText = trimmed.replace(/^>\s*/, '');
                  return (
                    <blockquote key={bIdx} className="border-l-4 border-[#D35057] pl-4 py-1 italic bg-[#FAF6EE]/50 dark:bg-stone-900/30 text-stone-600 dark:text-stone-300 rounded-r-lg my-4">
                      {renderInlineStyles(quoteText, otherEnts)}
                    </blockquote>
                  );
                }

                // Standard paragraph
                return (
                  <p key={bIdx} className="indent-4 leading-relaxed text-justify whitespace-pre-line">
                    {renderInlineStyles(trimmed, otherEnts)}
                  </p>
                );
              })}
            </div>
          );
        };

        // Select featured article for portal
        const featuredEntity = entities.find(e => e.priority === 'yuksek') || entities[0] || null;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* LEFT SIDEBAR: Wikipedia Directory Index */}
            <div className="lg:col-span-1">
              <DuzadaDirectory
                items={items}
                activeItemId={activeEntity?.id || null}
                onSelectItem={onSelectItem}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onAddItem={onAddItem}
              />
            </div>

            {/* RIGHT & CENTER: Wikipedia Article Workspace */}
            <div className="lg:col-span-3 space-y-6">
              {activeEntity ? (
                <div className="bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-6 min-h-[750px] shadow-xs relative paper-grain flex flex-col justify-between">
                  
                  {/* Wikipedia Tabs & Metadata Row */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-1">
                      <div className="flex gap-4 text-xs font-mono">
                        <button
                          onClick={() => setWikiMode('oku')}
                          className={`pb-2 px-2 transition-all relative ${wikiMode === 'oku' ? 'font-bold text-[#1B2A4A] dark:text-[#F3EFE8] border-b-2 border-[#D35057]' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                          Maddenin Kendisi (Oku)
                        </button>
                        <button
                          onClick={() => setWikiMode('degistir')}
                          className={`pb-2 px-2 transition-all relative ${wikiMode === 'degistir' ? 'font-bold text-[#1B2A4A] dark:text-[#F3EFE8] border-b-2 border-[#D35057]' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                          Değiştir (Düzenle)
                        </button>
                      </div>

                      <span className="text-[10px] font-mono text-stone-400 uppercase">
                        Sürüm: v1.02 · {activeEntity.status}
                      </span>
                    </div>

                    {/* WIKIPEDIA "OKU" (READ-ONLY VIEW) MODE */}
                    {wikiMode === 'oku' && (() => {
                      const isValueKnown = (val: any): boolean => {
                        if (val === null || val === undefined) return false;
                        const s = String(val).trim();
                        if (s === '') return false;
                        const lower = s.toLowerCase();
                        return lower !== 'belirtilmedi' && lower !== 'bilinmiyor' && lower !== 'bilinmemektedir' && lower !== 'n/a' && lower !== 'açıklanmadı';
                      };

                      const renderInfoboxRow = (label: string, value: any) => {
                        if (!isValueKnown(value)) return null;
                        return (
                          <tr className="border-b border-stone-200/60 dark:border-[#2C3C72]/50 last:border-b-0 transition-colors hover:bg-stone-50/50">
                            <td className="font-bold text-[#6A5E4C] dark:text-[#A6B0C9] py-2 w-1/3 text-left font-sans text-[10px] uppercase tracking-wider">{label}</td>
                            <td className="py-2 text-[#1B2A4A] dark:text-[#F3EFE8] text-left font-serif text-xs font-medium">{value}</td>
                          </tr>
                        );
                      };

                      const renderLinkedItemRow = (label: string, itemId: string | undefined) => {
                        if (!itemId) return null;
                        const linked = items.find(i => i.id === itemId);
                        if (!linked) return null;
                        return (
                          <tr className="border-b border-stone-200/60 dark:border-[#2C3C72]/50 last:border-b-0 transition-colors hover:bg-stone-50/50">
                            <td className="font-bold text-[#6A5E4C] dark:text-[#A6B0C9] py-2 w-1/3 text-left font-sans text-[10px] uppercase tracking-wider">{label}</td>
                            <td className="py-2 text-left">
                              <button 
                                onClick={() => onSelectItem(linked.id)}
                                className="text-[#D35057] hover:underline text-left cursor-pointer font-serif text-xs font-bold transition-all"
                              >
                                {linked.title}
                              </button>
                            </td>
                          </tr>
                        );
                      };

                      const imgSrc = activeEntity.metadata?.brandKit?.logoBase64 || activeEntity.metadata?.brandKit?.selectedLogo || activeEntity.images?.[0];
                      const kunye = getCharacterKunye(activeEntity);

                      return (
                        <div className="space-y-8 animate-in fade-in duration-200">
                          
                          {activeEntity.isProposal && (
                            <div className="p-4 bg-[#FBF3E4] dark:bg-[#1E274A] border-2 border-dashed border-[#D35057] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-[#D35057] uppercase tracking-wider block">📌 Öneri Karakter / Varlık</span>
                                <p className="text-xs text-[#1B2A4A] dark:text-[#F3EFE8] leading-relaxed">
                                  Bu madde (<strong>{activeEntity.title}</strong>), roman yazımı veya blog girişi sırasında otomatik olarak tespit edilip önerilmiştir. Evren arşivine resmen katılsın mı?
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={async () => {
                                    await onUpdateItem({
                                      ...activeEntity,
                                      isProposal: false,
                                      status: 'Fikir'
                                    });
                                    alert(`"${activeEntity.title}" başarıyla evrene eklendi!`);
                                  }}
                                  className="px-3 py-1.5 bg-[#3E8E5E] hover:bg-[#2E6C46] text-white text-xs font-mono font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                                >
                                  Kabul Et (Ekle)
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`"${activeEntity.title}" önerisini silmek istediğinize emin misiniz?`)) {
                                      await onDeleteItem(activeEntity.id);
                                      onSelectItem(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-[#D35057] border border-stone-300 dark:border-stone-700 text-xs font-mono font-bold rounded-lg cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
                                >
                                  Reddet / Sil
                                </button>
                              </div>
                            </div>
                          )}

                          {activeEntity.type === 'kitap_bolum' ? (() => {
                            const bookProj = items.find(b => b.id === (activeEntity.links || [])[0]);
                            const linkedEntities = entities.filter(e => (activeEntity.links || []).includes(e.id));
                            return (
                              <div className="space-y-8 font-sans">
                                <div className="border-b border-[#CFC5B4]/50 pb-4">
                                  <span className="text-[10px] font-mono font-bold text-[#D35057] uppercase tracking-wider block mb-1">
                                    📖 {bookProj ? bookProj.title : 'Roman Projesi'} · Yayınlanmış Bölüm
                                  </span>
                                  <h1 className="font-serif text-3xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] tracking-tight leading-tight">
                                    {activeEntity.title}
                                  </h1>
                                  <p className="text-xs text-stone-400 mt-1 font-mono italic">
                                    Yazar Atölyesi'nden evrene resmen bağlanmış edebi eser.
                                  </p>
                                </div>

                                {/* Chapter Body */}
                                <div className="py-4 border-b border-[#CFC5B4]/30">
                                  {renderRichTextContent(activeEntity.notes || '', entities.filter(e => e.id !== activeEntity?.id))}
                                </div>

                                {/* Linked Entities */}
                                <div className="space-y-3">
                                  <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 font-bold">
                                    🔗 Bu Bölümde Geçen Varlıklar ve Karakterler
                                  </h3>
                                  {linkedEntities.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {linkedEntities.map(ent => (
                                        <button
                                          key={ent.id}
                                          onClick={() => onSelectItem(ent.id)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-[#FAF6EE] dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-700 dark:text-[#A6B0C9] hover:text-[#D35057] text-xs font-mono font-bold rounded-lg border border-[#CFC5B4]/40 cursor-pointer transition-all"
                                        >
                                          <span>{ent.title}</span>
                                          <span className="text-[8px] opacity-65">({ent.type})</span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-stone-400 italic">Bu bölümde henüz hiçbir evren varlığı kancalanmamış.</p>
                                  )}
                                </div>
                              </div>
                            );
                          })() : (
                            <>
                              {/* Title block */}
                              <div>
                                <h1 className="font-serif text-3xl font-bold text-[#1B2A4A] dark:text-[#F3EFE8] tracking-tight">
                                  {activeEntity.title}
                                </h1>
                                <p className="text-[11px] font-mono text-stone-400 dark:text-[#A6B0C9] italic mt-1">
                                  Düzada Ansiklopedisi'nden, özgür kurgusal evren lore kütüphanesi
                                </p>
                            
                            {activeEntity.id === 'duzada_world_details' && (
                              <div className="mt-4 p-4 bg-[#FAF6F0] dark:bg-[#121A33] border border-[#D35057]/30 dark:border-[#2C3C72] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                                <div className="flex items-start gap-3">
                                  <BookOpen className="w-5 h-5 text-[#D35057] dark:text-[#EFA39F] shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="text-xs font-bold text-[#1B2A4A] dark:text-[#F3EFE8] font-sans">
                                      Düzada Evreni Wiki Portalı Aktif
                                    </h4>
                                    <p className="text-[11px] text-stone-600 dark:text-[#A6B0C9] font-serif leading-relaxed mt-0.5">
                                      Bu varlık tüm kurgusal dünyamızın ana şemsiyesidir. Mahalleler, sokaklar, lore katmanları ve bağlı her şeye entegre olan tam sürüm Wikipedia portalına tek tıkla ulaşabilirsiniz.
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setActiveTab('wiki')}
                                  className="self-end sm:self-auto px-4 py-2 bg-[#D35057] hover:bg-[#B23A40] text-white text-xs font-semibold font-mono rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap"
                                >
                                  📖 Wiki Sayfasına Git
                                </button>
                              </div>
                            )}

                            <hr className="border-stone-200 dark:border-[#2C3C72] mt-4" />
                          </div>

                          {/* Responsive grid: Left Column (Details) and Right Column (Künye) */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            
                            {/* LEFT SIDEBAR/COLUMN: Wiki Sections */}
                            <div className="lg:col-span-2 space-y-6">

                          {/* 1. Kısa Özet */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                              <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                                1. Kısa Özet ve Tanım
                              </h3>
                              {renderSectionActions('intro', true)}
                            </div>
                            
                            {editingWikiId === 'intro' ? (
                              <div className="space-y-3 p-4 bg-[#F8F9FA] dark:bg-[#17345A]/20 border border-stone-200 dark:border-[#2C3C72] rounded-lg animate-in zoom-in-95 duration-150 font-sans">
                                <div>
                                  <label className="block text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 uppercase font-bold">Giriş Paragrafını Düzenle (Genel Bilgiler & Özet)</label>
                                  <textarea
                                    rows={4}
                                    value={editingWikiContent}
                                    onChange={(e) => setEditingWikiContent(e.target.value)}
                                    className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2.5 focus:outline-hidden font-serif leading-relaxed"
                                  />
                                </div>
                                <div className="flex justify-end gap-2 text-xs font-mono">
                                  <button
                                    onClick={() => setEditingWikiId(null)}
                                    className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                                  >
                                    Vazgeç
                                  </button>
                                  <button
                                    onClick={async () => {
                                      let finalNotes = editingWikiContent;
                                      const isChar = activeEntity.type === 'kisi' || activeEntity.type === 'karakter';
                                      if (isChar) {
                                        const currentNotes = activeEntity.notes || '';
                                        const bulletLines = currentNotes.split('\n').filter((l: string) => {
                                          const cl = l.trim();
                                          if (cl.startsWith('*') || cl.startsWith('-')) return true;
                                          const clLower = cl.toLowerCase();
                                          if (clLower.startsWith('fizik:') || clLower.startsWith('saç:') || clLower.startsWith('gözler:') || clLower.startsWith('kişilik:') || clLower.startsWith('sevdikleri:') || clLower.startsWith('sevmedikleri:') || clLower.startsWith('hobiler:')) {
                                            return true;
                                          }
                                          return false;
                                        });
                                        finalNotes = editingWikiContent + '\n\n' + bulletLines.join('\n');
                                      }
                                      await onUpdateItem({ ...activeEntity, notes: finalNotes });
                                      setEditingWikiId(null);
                                    }}
                                    className="px-4 py-1.5 bg-[#D35057] text-white rounded hover:bg-[#B23A40]"
                                  >
                                    ✓ Kaydet
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="leading-relaxed font-serif text-sm text-stone-800 dark:text-stone-200">
                                {renderRichTextContent(
                                  ((activeEntity.type === 'kisi' || activeEntity.type === 'karakter')
                                    ? kunye.summaryText
                                    : activeEntity.notes) || '',
                                  entities.filter(e => e.id !== activeEntity?.id)
                                )}
                              </div>
                            )}
                          </div>

                          {/* Room Guest History Section */}
                          {(() => {
                            const isRoom = activeEntity.type === 'oda' || activeEntity.tags?.includes('oda') || activeEntity.id.startsWith('kemskoy_room_') || activeEntity.title.startsWith('Oda ');
                            if (!isRoom) return null;
                            
                            const roomNum = activeEntity.metadata?.roomNumber || activeEntity.title.replace(/\D/g, '') || '101';
                            
                            const getRoomGuestHistory = (num: string) => {
                              switch (num) {
                                case '101':
                                  return [
                                    { dates: '10-15 Eylül 2003', guestName: 'Ahmet Karadeniz', status: 'Ayrıldı', notes: 'Sessiz bir fener bekçisi adayı. Eski Liman hakkında sorular sordu.' },
                                    { dates: '22-25 Eylül 2003', guestName: 'Hakan Kaya', status: 'Ayrıldı', notes: 'Jeolog. Kuzey Kayalıkları çevresinde araştırmalar yaptı.' },
                                    { dates: '1-6 Ekim 2003', guestName: 'Murat Demir', status: 'Ayrıldı', notes: 'Haftalık dinlenme tatili. Oda temizliğinden memnun kaldı.' },
                                  ];
                                case '102':
                                  return [
                                    { dates: '12-18 Eylül 2003', guestName: 'Selin Yılmaz', status: 'Ayrıldı', notes: 'Ressam, deniz fenerinin eskizlerini çizmekle vakit geçirdi.' },
                                    { dates: '24-29 Eylül 2003', guestName: 'Derin Aksoy', status: 'Ayrıldı', notes: 'Yazar. Ada sessizliğini romanı için tercih etti.' },
                                    { dates: '1-4 Ekim 2003', guestName: 'Elif Şahin', status: 'Ayrıldı', notes: 'Kısa konaklama. Ada fırınını çok beğendi.' },
                                  ];
                                case '201':
                                  return [
                                    { dates: '15-20 Eylül 2003', guestName: 'Emre Çelik', status: 'Ayrıldı', notes: 'İş adamı. Kems ticaret gemisiyle adadan ayrıldı.' },
                                    { dates: '2-5 Ekim 2003', guestName: 'Can Sabancı', status: 'Ayrıldı', notes: 'Kısa süreli tatilci.' },
                                  ];
                                case '202':
                                  return [
                                    { dates: '14-19 Eylül 2003', guestName: 'Oğuzhan Mert', status: 'Ayrıldı', notes: 'Kuş gözlemcisi. Kuzey ormanlarını ziyaret etti.' },
                                    { dates: '27 Eylül - 1 Ekim 2003', guestName: 'Zeynep Solak', status: 'Ayrıldı', notes: 'Eski Liman şantiyesinde çalışan mühendis.' },
                                  ];
                                case '203':
                                  return [
                                    { dates: '10-12 Eylül 2003', guestName: 'Fuat Akbaş', status: 'Ayrıldı', notes: 'Oda tavanındaki akıntı nedeniyle şikayette bulundu.' },
                                    { dates: '15-24 Eylül 2003', guestName: 'Bilinmeyen Misafir', status: 'Acil Çıkış', notes: 'Oda boşaltıldı. Bakım çalışması başlatılması kararlaştırıldı.' },
                                    { dates: '25 Eylül - Günümüz', guestName: 'Yok', status: 'Bakımda', notes: 'Tesisat sızıntısı tamiri yapılıyor.' },
                                  ];
                                case '301':
                                  return [
                                    { dates: '8-15 Eylül 2003', guestName: 'Gisela V.', status: 'Ayrıldı', notes: 'İgor V.\'nin kız kardeşi. Gizemli tavırlarıyla dikkat çekti.' },
                                    { dates: '18-25 Eylül 2003', guestName: 'Deniz Fırat', status: 'Ayrıldı', notes: 'Otel müdürüyle özel toplantılar yaptı.' },
                                    { dates: '1-5 Ekim 2003', guestName: 'Lara Karas', status: 'Ayrıldı', notes: 'Miras işleri için adada bulunuyordu.' },
                                  ];
                                case '302':
                                  return [
                                    { dates: '12-22 Eylül 2003', guestName: 'İgor V.', status: 'Ayrıldı', notes: 'The Imperial Kemskøy\'un en sadık ve en gizemli daimi misafirlerinden biri.' },
                                    { dates: '28 Eylül - 3 Ekim 2003', guestName: 'Melis Doğan', status: 'Ayrıldı', notes: 'Kısa iş seyahati.' },
                                  ];
                                case '303':
                                  return [
                                    { dates: '5-12 Eylül 2003', guestName: 'Hasan Uzun', status: 'Ayrıldı', notes: 'Ada tarihçisi. İmparatorluk arşivleri hakkında araştırma yapıyor.' },
                                    { dates: '18-28 Eylül 2003', guestName: 'Banu Yıldız', status: 'Ayrıldı', notes: 'Müzisyen.' },
                                  ];
                                case '304':
                                  return [
                                    { dates: '1-10 Eylül 2003', guestName: 'Ahmet Hamdi', status: 'Ayrıldı', notes: 'Eski antika satıcısı. Oteldeki tabloları inceledi.' },
                                    { dates: '15-18 Eylül 2003', guestName: 'Bilinmeyen Misafir', status: 'Tahliye', notes: 'Elektrik kontağı yangını riski nedeniyle oda boşaltıldı.' },
                                    { dates: '19 Eylül - Günümüz', guestName: 'Yok', status: 'Bakımda', notes: 'Elektrik tesisat yenileme çalışması var.' },
                                  ];
                                default:
                                  return [
                                    { dates: '1-5 Ekim 2003', guestName: 'Ada Ziyaretçisi', status: 'Ayrıldı', notes: 'Genel sezonsal konaklama.' },
                                  ];
                              }
                            };
                            
                            const history = getRoomGuestHistory(roomNum);
                            
                            return (
                              <div className="space-y-4 pt-2">
                                <div className="border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                                  <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8] flex items-center gap-2">
                                    🏨 Konaklama ve Giriş-Çıkış Geçmişi
                                  </h3>
                                </div>
                                
                                <div className="overflow-x-auto border border-stone-200 dark:border-[#2C3C72] rounded-xl">
                                  <table className="w-full text-xs font-serif text-left">
                                    <thead className="bg-stone-50 dark:bg-[#12224A]/60 text-stone-600 dark:text-stone-300 font-mono text-[10px] uppercase">
                                      <tr>
                                        <th className="p-3 border-b border-stone-200 dark:border-[#2C3C72]">Tarih</th>
                                        <th className="p-3 border-b border-stone-200 dark:border-[#2C3C72]">Konuk / Misafir</th>
                                        <th className="p-3 border-b border-stone-200 dark:border-[#2C3C72]">Durum</th>
                                        <th className="p-3 border-b border-stone-200 dark:border-[#2C3C72]">Gözlemler / Notlar</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40 text-stone-800 dark:text-stone-200">
                                      {history.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30">
                                          <td className="p-3 font-mono text-[11px] font-semibold whitespace-nowrap">{row.dates}</td>
                                          <td className="p-3 font-bold text-[#D35057] dark:text-[#E76F51]">
                                            {(() => {
                                              const matchedEntity = entities.find(e => e.title.toLowerCase() === row.guestName.toLowerCase());
                                              if (matchedEntity) {
                                                return (
                                                  <button
                                                    onClick={() => onSelectItem(matchedEntity.id)}
                                                    className="hover:underline font-bold text-left cursor-pointer"
                                                  >
                                                    {row.guestName}
                                                  </button>
                                                );
                                              }
                                              return row.guestName;
                                            })()}
                                          </td>
                                          <td className="p-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                              row.status === 'Ayrıldı' 
                                                ? 'bg-stone-100 text-stone-600'
                                                : row.status === 'Bakımda'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : 'bg-red-100 text-red-800'
                                            }`}>
                                              {row.status}
                                            </span>
                                          </td>
                                          <td className="p-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{row.notes}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}



                          {/* 3. Profil */}
                          {(() => {
                            const profileSections = (activeEntity.metadata?.wikiSections || []).filter(
                              s => s.status !== 'öneri' && 
                              /(profil|biyografi|özgeçmiş|görev|karakter|mimari|oda yapısı|konum|özellikler|kişilik|mizaç)/i.test(s.title)
                            );
                            
                            const hasProfileSections = profileSections.length > 0;
                            const hasProfileEdit = editingWikiId && profileSections.some(s => s.id === editingWikiId);
                            
                            return (hasProfileSections || hasProfileEdit) ? (
                              <div className="space-y-4">
                                <div className="border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                                  <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                                    3. Profil ve Detaylar
                                  </h3>
                                </div>
                                
                                <div className="space-y-5 pl-2">
                                  {profileSections.map((sec, idx) => (
                                    <div key={sec.id} className="space-y-2">
                                      {editingWikiId === sec.id ? (
                                        <div className="space-y-3 p-4 bg-[#F8F9FA] dark:bg-[#17345A]/20 border border-stone-200 dark:border-[#2C3C72] rounded-lg animate-in zoom-in-95 duration-150 font-sans">
                                          <div>
                                            <label className="block text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 uppercase font-bold">Bölüm Başlığı</label>
                                            <input
                                              type="text"
                                              value={editingWikiTitle}
                                              onChange={(e) => setEditingWikiTitle(e.target.value)}
                                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 uppercase font-bold">Bölüm İçeriği</label>
                                            <textarea
                                              rows={6}
                                              value={editingWikiContent}
                                              onChange={(e) => setEditingWikiContent(e.target.value)}
                                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2.5 focus:outline-hidden font-serif leading-relaxed"
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2 text-xs font-mono">
                                            <button
                                              onClick={() => setEditingWikiId(null)}
                                              className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                                            >
                                              Vazgeç
                                            </button>
                                            <button
                                              onClick={() => handleSaveWikiSection(sec.id)}
                                              className="px-4 py-1.5 bg-[#D35057] text-white rounded hover:bg-[#B23A40]"
                                            >
                                              ✓ Kaydet
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <h4 className="font-serif font-bold text-[#D35057] text-md flex justify-between items-center group/section border-b border-stone-100 dark:border-stone-800/40 pb-1">
                                            <span>3.{idx + 1}. {sec.title}</span>
                                            {renderSectionActions(sec.id, false, sec)}
                                          </h4>
                                          <div className="leading-relaxed font-serif text-sm text-stone-800 dark:text-stone-200">
                                            {renderRichTextContent(sec.content || '', entities.filter(e => e.id !== activeEntity?.id))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* 4. İlişkiler ve Bağlantılar */}
                          {(() => {
                            const allRelations = resolveAllRelations(activeEntity, items);
                            
                            // Find potential targets to link manually (exclude current activeEntity and already linked ones)
                            const currentLinkedIds = new Set(allRelations.map(r => r.sourceId === activeEntity.id ? r.targetId : r.sourceId));
                            const potentialTargets = items.filter(i => 
                              !i.archived && 
                              !i.isProposal && 
                              i.id !== activeEntity.id && 
                              !currentLinkedIds.has(i.id) &&
                              i.type !== 'map_settings'
                            );

                            return (
                              <div className="bg-[#FAF9F5] dark:bg-[#12224A]/30 border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl overflow-hidden shadow-2xs">
                                {/* Header / Toggle Button */}
                                <button 
                                  type="button"
                                  onClick={() => setIsRelationsCollapsed(!isRelationsCollapsed)}
                                  className="w-full flex items-center justify-between p-4 bg-[#F2ECE1] dark:bg-[#1B2E65] text-left hover:bg-[#E7E0D2] dark:hover:bg-[#22397C] transition-all cursor-pointer font-serif font-bold text-md text-[#1B2A4A] dark:text-[#F3EFE8]"
                                >
                                  <span className="flex items-center gap-2">
                                    🔗 4. İlişkiler ve Bağlantılar ({allRelations.length})
                                  </span>
                                  {isRelationsCollapsed ? (
                                    <span className="text-xs font-mono font-normal text-[#D35057] flex items-center gap-1">Göster &darr;</span>
                                  ) : (
                                    <span className="text-xs font-mono font-normal text-[#D35057] flex items-center gap-1">Gizle &uarr;</span>
                                  )}
                                </button>

                                {/* Collapsible Content */}
                                {!isRelationsCollapsed && (
                                  <div className="p-4 space-y-4 border-t border-[#CFC5B4]/50 dark:border-[#2C3C72] animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-3 pl-2 font-sans text-xs">
                                  {allRelations.length === 0 ? (
                                    <p className="text-stone-500 italic">Henüz bu varlığa ait bir ilişki bulunmuyor.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {allRelations.map(rel => {
                                        const isOutgoing = rel.sourceId === activeEntity.id;
                                        const otherId = isOutgoing ? rel.targetId : rel.sourceId;
                                        const otherTitle = isOutgoing ? rel.targetTitle : rel.sourceTitle;
                                        const labels = getRelationLabels(rel.type, rel.sourceType, rel.targetType);
                                        const displayLabel = isOutgoing ? labels.forward : labels.inverse;
                                        
                                        return (
                                          <div 
                                            key={rel.id} 
                                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                                              rel.isProposal 
                                                ? 'border-2 border-dashed border-[#D35057]/40 bg-[#FAF5EE] dark:bg-[#1E294B]/40 text-[#D35057]' 
                                                : 'bg-[#FAF8F5] dark:bg-[#12224A]/40 border-stone-200 dark:border-[#2C3C72] hover:border-[#D35057] text-[#1B2A4A] dark:text-[#F3EFE8]'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono text-[9px] uppercase tracking-wider opacity-75 font-semibold">
                                                  {displayLabel}
                                                </span>
                                                {rel.isProposal && (
                                                  <span className="bg-[#D35057] text-white text-[8px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider animate-pulse">
                                                    Öneri
                                                  </span>
                                                )}
                                              </div>
                                              <button 
                                                onClick={() => onSelectItem(otherId)} 
                                                className="text-left font-serif font-bold text-sm hover:underline cursor-pointer"
                                              >
                                                {otherTitle}
                                              </button>
                                              {rel.isProposal && rel.reason && (
                                                <p className="text-[10px] italic mt-1 leading-tight text-stone-600 dark:text-stone-300">
                                                  "{rel.reason}"
                                                </p>
                                              )}
                                            </div>

                                            {/* Proposal Actions */}
                                            {rel.isProposal && (
                                              <div className="flex gap-2 mt-2 pt-2 border-t border-dashed border-[#D35057]/20">
                                                <button
                                                  onClick={async () => {
                                                    const originItem = items.find(i => i.id === rel.originItemId);
                                                    if (originItem) {
                                                      const updatedRels = (originItem.metadata?.relations || []).map((r: any) => {
                                                        if (r.targetId === rel.targetId && r.type === rel.type) {
                                                          return { ...r, isProposal: false };
                                                        }
                                                        return r;
                                                      });
                                                      await onUpdateItem({
                                                        ...originItem,
                                                        metadata: { ...originItem.metadata, relations: updatedRels }
                                                      });
                                                    }
                                                  }}
                                                  className="bg-[#3E8E5E] text-white text-[9px] font-bold px-2 py-0.5 rounded hover:opacity-90 cursor-pointer"
                                                >
                                                  Kabul Et
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    const originItem = items.find(i => i.id === rel.originItemId);
                                                    if (originItem) {
                                                      const updatedRels = (originItem.metadata?.relations || []).filter((r: any) => 
                                                        !(r.targetId === rel.targetId && r.type === rel.type)
                                                      );
                                                      const ignored = [...(originItem.metadata?.ignoredProposals || [])];
                                                      const valToIgnore = `${rel.targetId}::${rel.type}`; if (!ignored.includes(rel.targetId)) { ignored.push(rel.targetId); }
                                                      if (!ignored.includes(valToIgnore)) {
                                                        ignored.push(valToIgnore);
                                                      }
                                                      await onUpdateItem({
                                                        ...originItem,
                                                        metadata: {
                                                          ...originItem.metadata,
                                                          relations: updatedRels,
                                                          ignoredProposals: ignored
                                                        }
                                                      });

                                                      // Bidirectional update for other side
                                                      const otherItemId = rel.originItemId === rel.sourceId ? rel.targetId : rel.sourceId;
                                                      const otherItem = items.find(i => i.id === otherItemId);
                                                      if (otherItem) {
                                                        const otherRels = [...(otherItem.metadata?.relations || [])].filter((r: any) => 
                                                          !(r.targetId === originItem.id && r.type === rel.type)
                                                        );
                                                        const otherIgnored = [...(otherItem.metadata?.ignoredProposals || [])];
                                                        const otherValToIgnore = `${originItem.id}::${rel.type}`;
                                                        if (!otherIgnored.includes(otherValToIgnore)) {
                                                          otherIgnored.push(otherValToIgnore);
                                                        }
                                                        if (!otherIgnored.includes(originItem.id)) {
                                                          otherIgnored.push(originItem.id);
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
                                                      return;
                                                    }
                                                  }}
                                                  className="text-[#D35057] border border-[#D35057]/30 text-[9px] font-bold px-2 py-0.5 rounded hover:bg-[#D35057]/5 cursor-pointer"
                                                >
                                                  Yoksay
                                                </button>
                                              </div>
                                            )}

                                            {/* Disconnect action for official links */}
                                            {!rel.isProposal && (
                                              <div className="flex justify-end mt-2">
                                                <button
                                                  onClick={async () => {
                                                    const originItem = items.find(i => i.id === rel.originItemId);
                                                    if (originItem) {
                                                      const updatedRels = (originItem.metadata?.relations || []).filter((r: any) => 
                                                        r.targetId !== (rel.originItemId === rel.sourceId ? rel.targetId : rel.sourceId)
                                                      );
                                                      
                                                      let updatedLinks = [...(originItem.links || [])];
                                                      const targetToDelete = rel.originItemId === rel.sourceId ? rel.targetId : rel.sourceId;
                                                      updatedLinks = updatedLinks.filter(id => id !== targetToDelete);

                                                      const updatedMetadata = { ...originItem.metadata };
                                                      if (updatedMetadata.placeId === targetToDelete) delete updatedMetadata.placeId;
                                                      if (updatedMetadata.brandId === targetToDelete) delete updatedMetadata.brandId;
                                                      updatedMetadata.relations = updatedRels;

                                                      await onUpdateItem({
                                                        ...originItem,
                                                        links: updatedLinks,
                                                        metadata: updatedMetadata
                                                      });
                                                    }
                                                  }}
                                                  className="text-stone-400 hover:text-[#D35057] text-[9px] font-semibold tracking-wider uppercase cursor-pointer"
                                                  title="Bağlantıyı Kopar"
                                                >
                                                  Bağlantıyı Kes ✕
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Add Relationship Select Trigger */}
                                  <div className="pt-2">
                                    <select
                                      onChange={async (e) => {
                                        const targetId = e.target.value;
                                        if (!targetId) return;
                                        const targetItem = items.find(i => i.id === targetId);
                                        if (!targetItem) return;

                                        let relType: any = 'genel bağlantı';
                                        if (targetItem.type === 'yer') {
                                          relType = 'bulunduğu yer';
                                        } else if (targetItem.type === 'marka') {
                                          relType = 'ait olduğu marka';
                                        } else if (targetItem.type === 'kisi' && activeEntity.type === 'kisi') {
                                          relType = 'tanıdığı kişi';
                                        } else if (targetItem.type === 'olay') {
                                          relType = 'ilgili olay';
                                        }

                                        const relations = [...(activeEntity.metadata?.relations || [])];
                                        relations.push({
                                          targetId,
                                          type: relType,
                                          isProposal: false
                                        });

                                        await onUpdateItem({
                                          ...activeEntity,
                                          metadata: { ...activeEntity.metadata, relations }
                                        });
                                        e.target.value = ""; // Reset dropdown
                                      }}
                                      className="text-xs font-mono bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] rounded-lg px-3 py-1.5 text-stone-600 dark:text-stone-300 focus:outline-hidden focus:border-[#D35057] cursor-pointer"
                                    >
                                      <option value="">➕ Yeni İlişki/Bağlantı Ekle...</option>
                                      {potentialTargets.map(t => (
                                        <option key={t.id} value={t.id}>
                                          [{t.type.toUpperCase()}] {t.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                          })()}

                          {/* 5. Lore */}
                          {(() => {
                            const isHotel = activeEntity.id === 'kemskoy_hotel' || activeEntity.title === 'The Imperial Kemskøy' || activeEntity.tags?.includes('otel') || activeEntity.tags?.includes('hotel');
                            const hotelRooms = isHotel ? items.filter(i => 
                              i.area === 'duzada' && 
                              !i.archived && 
                              (i.type === 'oda' || i.tags?.includes('oda') || i.id.startsWith('kemskoy_room_') || i.title.startsWith('Oda ')) &&
                              (i.links?.includes(activeEntity.id) || i.metadata?.placeId === activeEntity.id)
                            ) : [];

                            return isHotel && hotelRooms.length > 0 ? (
                              <div className="space-y-4 animate-fadeIn">
                                <div className="border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                                  <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8] flex items-center gap-2">
                                    <Store className="w-5 h-5 text-[#D35057]" />
                                    Otelin Odaları (Odalar &amp; Kat Hizmetleri Durumu)
                                  </h3>
                                </div>

                                <p className="text-xs text-stone-500 font-serif">
                                  The Imperial Kemskøy bünyesindeki aktif odalar ve odaların genel durumları. İncelemek istediğiniz odanın üzerine tıklayarak ilgili odayı seçebilirsiniz.
                                </p>

                                <div className="space-y-4 pt-1">
                                  {(() => {
                                    // Group rooms by floor (1st digit of room number, e.g. "101" -> floor 1)
                                    const roomsByFloor: Record<string, typeof hotelRooms> = {};
                                    hotelRooms.forEach(room => {
                                      const roomNum = room.metadata?.roomNumber || room.title.replace(/\D/g, '');
                                      const floorNum = roomNum ? roomNum.charAt(0) : '1';
                                      if (!roomsByFloor[floorNum]) {
                                        roomsByFloor[floorNum] = [];
                                      }
                                      roomsByFloor[floorNum].push(room);
                                    });

                                    // Sort keys
                                    const sortedFloors = Object.keys(roomsByFloor).sort();

                                    return sortedFloors.map(floor => (
                                      <div key={floor} className="bg-[#FAF8F5] dark:bg-[#12224A]/20 border border-stone-200 dark:border-[#2C3C72]/50 p-3.5 rounded-xl space-y-2">
                                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] border-b border-stone-200/50 dark:border-stone-800 pb-1.5 flex items-center gap-1.5">
                                          <span>🏢 Kat {floor} ({roomsByFloor[floor].length} Oda)</span>
                                        </h4>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                                          {roomsByFloor[floor].sort((a,b) => a.title.localeCompare(b.title)).map(room => {
                                            const isMaintenance = room.metadata?.isMaintenance || room.notes?.toLowerCase().includes('bakım') || room.notes?.toLowerCase().includes('tadilat');
                                            const isActiveRoom = activeItemId === room.id;

                                            return (
                                              <div
                                                key={room.id}
                                                onClick={() => onSelectItem(room.id)}
                                                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer relative select-none ${
                                                  isActiveRoom
                                                    ? 'bg-[#EAE4D7] dark:bg-[#1C2C5E] border-[#D35057] shadow-xs font-bold'
                                                    : isMaintenance
                                                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400 font-bold'
                                                      : 'bg-white hover:bg-stone-50 dark:bg-[#13204A]/40 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-800 text-[#1B2A4A] dark:text-[#F3EFE8]'
                                                }`}
                                              >
                                                <div className="text-xs font-serif font-black">{room.title}</div>
                                                <div className="text-[9px] font-mono opacity-80 mt-0.5">{room.metadata?.roomType || 'Standart'}</div>
                                                {isMaintenance && (
                                                  <span className="absolute top-1 right-1 text-[8px] px-1 bg-amber-500 text-white rounded scale-75 uppercase tracking-tighter">BAKIM</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* 5. Lore */}
                          {(() => {
                            const loreSections = (activeEntity.metadata?.wikiSections || []).filter(
                              s => s.status !== 'öneri' && 
                              !/(profil|biyografi|özgeçmiş|görev|karakter|mimari|oda yapısı|konum|özellikler|kişilik|mizaç)/i.test(s.title)
                            );
                            
                            const hasLoreSections = loreSections.length > 0;
                            const hasLoreEdit = editingWikiId && loreSections.some(s => s.id === editingWikiId);
                            
                            return (hasLoreSections || hasLoreEdit) ? (
                              <div className="space-y-4">
                                <div className="border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                                  <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                                    5. Lore ve Arka Plan Bilgisi
                                  </h3>
                                </div>
                                
                                <div className="space-y-5 pl-2">
                                  {loreSections.map((sec, idx) => (
                                    <div key={sec.id} className="space-y-2">
                                      {editingWikiId === sec.id ? (
                                        <div className="space-y-3 p-4 bg-[#F8F9FA] dark:bg-[#17345A]/20 border border-stone-200 dark:border-[#2C3C72] rounded-lg animate-in zoom-in-95 duration-150 font-sans">
                                          <div>
                                            <label className="block text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 uppercase font-bold">Bölüm Başlığı</label>
                                            <input
                                              type="text"
                                              value={editingWikiTitle}
                                              onChange={(e) => setEditingWikiTitle(e.target.value)}
                                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 uppercase font-bold">Bölüm İçeriği</label>
                                            <textarea
                                              rows={6}
                                              value={editingWikiContent}
                                              onChange={(e) => setEditingWikiContent(e.target.value)}
                                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2.5 focus:outline-hidden font-serif leading-relaxed"
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2 text-xs font-mono">
                                            <button
                                              onClick={() => setEditingWikiId(null)}
                                              className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                                            >
                                              Vazgeç
                                            </button>
                                            <button
                                              onClick={() => handleSaveWikiSection(sec.id)}
                                              className="px-4 py-1.5 bg-[#D35057] text-white rounded hover:bg-[#B23A40]"
                                            >
                                              ✓ Kaydet
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <h4 className="font-serif font-bold text-[#D35057] text-md flex justify-between items-center group/section border-b border-stone-100 dark:border-stone-800/40 pb-1">
                                            <span>5.{idx + 1}. {sec.title}</span>
                                            {renderSectionActions(sec.id, false, sec)}
                                          </h4>
                                          <div className="leading-relaxed font-serif text-sm text-stone-800 dark:text-stone-200">
                                            {renderRichTextContent(sec.content || '', entities.filter(e => e.id !== activeEntity?.id))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* 6. Görsel */}
                          {(() => {
                            const hasImage = activeEntity.metadata?.brandKit?.logoBase64 || activeEntity.metadata?.brandKit?.selectedLogo || (activeEntity.images && activeEntity.images.length > 0);
                            const imgSrc = activeEntity.metadata?.brandKit?.logoBase64 || activeEntity.metadata?.brandKit?.selectedLogo || activeEntity.images?.[0];
                            
                            return imgSrc ? (
                              <div className="space-y-4">
                                <div className="border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                                  <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                                    6. Varlık Görseli ve Tanıtımı
                                  </h3>
                                </div>
                                
                                <div className="flex flex-col items-center justify-center p-6 bg-[#FBF9F6] dark:bg-[#13204A]/20 rounded-xl border border-dashed border-stone-200 dark:border-[#2C3C72] max-w-lg mx-auto">
                                  <img 
                                    src={imgSrc} 
                                    alt={`${activeEntity.title} Görseli`}
                                    className="max-h-80 max-w-full object-contain pointer-events-none select-none rounded-lg"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-[10px] font-mono text-stone-400 mt-2 uppercase tracking-widest">{activeEntity.title} Arşiv Kaydı</span>
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* Connected Blog Posts, Merch Items and Roman Chapters */}
                          {(connectedBlogPosts.length > 0 || connectedMerchItems.length > 0 || connectedChapters.length > 0) && (
                            <div className="space-y-4">
                              <div className="border-b border-stone-200 dark:border-[#2C3C72] pb-1">
                                <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                                  İlgili Evren Yayınları, Ürünler ve Kitaplar
                                </h3>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Connected Chapters */}
                                {connectedChapters.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-mono uppercase text-[#D35057] tracking-wider font-semibold flex items-center gap-1">
                                      <BookOpen className="w-3.5 h-3.5" /> Geçtiği Roman Bölümleri
                                    </h4>
                                    <div className="space-y-2">
                                      {connectedChapters.map(chap => (
                                        <button
                                          key={chap.id}
                                          onClick={() => onSelectItem(chap.id)}
                                          className="w-full text-left p-3 bg-[#FAF8F5] hover:bg-[#FAF6EE] dark:bg-[#12224A]/40 dark:hover:bg-[#12224A]/70 border border-stone-200 dark:border-[#2C3C72] rounded-xl cursor-pointer transition-colors block"
                                        >
                                          <span className="text-[9px] font-mono uppercase text-[#3E8E5E] block font-bold">Yayında</span>
                                          <span className="font-serif font-bold text-xs text-[#1B2A4A] dark:text-[#F3EFE8] block hover:underline">{chap.title}</span>
                                          <p className="text-[11px] text-stone-500 font-serif line-clamp-2 mt-1">{chap.notes}</p>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Connected Blog Posts */}
                                {connectedBlogPosts.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-semibold">
                                      İlgili Blog Yazıları
                                    </h4>
                                    <div className="space-y-2">
                                      {connectedBlogPosts.map(post => (
                                        <div key={post.id} className="p-3 bg-[#FAF8F5] dark:bg-[#12224A]/40 border border-stone-200 dark:border-[#2C3C72] rounded-xl">
                                          <span className="text-[9px] font-mono uppercase text-[#D35057] block font-bold">{post.metadata?.categoryType || 'Lore'}</span>
                                          <span className="font-serif font-bold text-xs text-[#1B2A4A] dark:text-[#F3EFE8] block">{post.title}</span>
                                          <p className="text-[11px] text-stone-500 font-serif line-clamp-2 mt-1">{post.notes}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Connected Merch Items */}
                                {connectedMerchItems.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-semibold">
                                      İlgili Hediyelik &amp; Ürünler
                                    </h4>
                                    <div className="space-y-2">
                                      {connectedMerchItems.map(merch => (
                                        <div key={merch.id} className="p-3 bg-[#FAF8F5] dark:bg-[#12224A]/40 border border-stone-200 dark:border-[#2C3C72] rounded-xl flex gap-2 items-center">
                                          {merch.images?.[0] && (
                                            <img src={merch.images[0]} alt={merch.title} className="w-10 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                                          )}
                                          <div>
                                            <span className="font-serif font-bold text-xs text-[#1B2A4A] dark:text-[#F3EFE8] block">{merch.title}</span>
                                            <span className="text-[10px] font-mono text-stone-500 block">{merch.metadata?.price ? `${merch.metadata.price} Kems` : 'Hediyelik'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Category Footer */}
                          <div className="bg-[#F8F9FA] dark:bg-[#17345A]/30 border border-stone-200 dark:border-[#2C3C72] p-3 rounded-xl text-xs text-stone-500 flex items-center gap-2 flex-wrap font-sans">
                            <span className="font-bold text-stone-700 dark:text-[#A6B0C9]">Kategoriler:</span>
                            <span className="hover:underline cursor-pointer">Düzada Evreni</span>
                            <span>|</span>
                            <span className="hover:underline cursor-pointer capitalize">{activeEntity.type}lar</span>
                            <span>|</span>
                            <span className="hover:underline cursor-pointer capitalize">{activeEntity.metadata?.region || 'merkez'} Bölgesi</span>
                            {Array.from(new Set(activeEntity.tags)).map((t, idx) => (
                              <React.Fragment key={`${t}-${idx}`}>
                                <span>|</span>
                                <span className="hover:underline cursor-pointer">#{t}</span>
                              </React.Fragment>
                            ))}
                          </div>

                          {/* Quick deletion from margin */}
                          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteEntity(activeEntity)}
                              className="w-full py-2 rounded-xl text-[10px] font-mono transition-colors cursor-pointer text-red-500 hover:text-white hover:bg-red-600 border border-red-500/20 hover:border-transparent"
                            >
                              Bu Maddeyi Ansiklopediden Sil
                            </button>
                          </div>

                        </div> {/* Close Left Column lg:col-span-2 */}

                        {/* RIGHT SIDE: BEAUTIFUL IDENTITY CARD (KÜNYE) (1 column) */}
                        <div className="lg:col-span-1">
                          <div className="bg-[#FBF9F6] dark:bg-[#12224A]/75 border border-[#CFC5B4] dark:border-[#2C3C72] rounded-2xl p-4 shadow-xs font-sans text-xs flex flex-col gap-4 paper-grain sticky top-6">
                            
                            {/* Card Header */}
                            <div className="border-b-2 border-[#D35057] pb-2 text-center">
                              <span className="text-[8px] font-mono font-bold tracking-widest text-[#D35057] uppercase block">Düzada Evreni Arşivi</span>
                              <h4 className="font-serif font-extrabold text-xs text-[#1B2A4A] dark:text-[#F3EFE8] uppercase mt-0.5 tracking-wider">KİMLİK BİLGİ KARTI</h4>
                            </div>

                            {/* Identity Photo / Avatar Block */}
                            <div className="flex gap-3 items-center border-b border-stone-200/60 dark:border-stone-800 pb-3">
                              <div className="w-16 h-16 shrink-0 bg-[#EAE4D7] dark:bg-[#1C2C5E] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl flex items-center justify-center text-stone-500 font-bold overflow-hidden shadow-2xs relative">
                                {imgSrc ? (
                                  <img src={imgSrc} alt={activeEntity.title} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-serif text-xl text-[#6A5E4C] dark:text-[#A6B0C9]">
                                    {activeEntity.title.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-serif font-black text-sm text-[#1B2A4A] dark:text-[#F3EFE8] truncate leading-tight">
                                  {activeEntity.title}
                                </h3>
                                <span className="inline-block mt-1 text-[8px] font-mono uppercase bg-[#D35057]/10 text-[#D35057] dark:text-[#E76F51] px-2 py-0.5 rounded-full font-bold">
                                  ID: {activeEntity.id.substring(7, 13)}
                                </span>
                                <span className="block text-[9px] font-mono text-stone-400 capitalize mt-0.5">Tür: {activeEntity.type}</span>
                              </div>
                            </div>

                            {/* Card Table fields (Only shows fields that have values!) */}
                            <div className="space-y-1">
                              <table className="w-full text-xs">
                                <tbody>
                                  {activeEntity.type !== 'kisi' && activeEntity.type !== 'karakter' && (
                                    <>
                                      {renderInfoboxRow("Varlık Türü", activeEntity.type)}
                                      {renderInfoboxRow("Mevcut Durum", activeEntity.status)}
                                      {renderInfoboxRow("Öncelik Derecesi", activeEntity.priority)}
                                    </>
                                  )}
                                  {(activeEntity.type === 'kisi' || activeEntity.type === 'karakter') && (
                                    <>
                                      {renderInfoboxRow("Varlık Türü", "Kişi / Sakin")}
                                    </>
                                  )}
                                  {renderInfoboxRow("Bulunduğu Bölge", activeEntity.metadata?.region)}
                                  
                                  {/* Kisi / Karakter fields */}
                                  {(activeEntity.type === 'kisi' || activeEntity.type === 'karakter') && (
                                    <>
                                      {renderInfoboxRow("Ad", kunye.ad)}
                                      {renderInfoboxRow("Yaş", kunye.yas)}
                                      {renderInfoboxRow("Rol / Görev", kunye.rol)}
                                      {renderInfoboxRow("Uyruk", kunye.uyruk)}
                                      {renderInfoboxRow("Fizik", kunye.fizik)}
                                      {renderInfoboxRow("Saç", kunye.sac)}
                                      {renderInfoboxRow("Gözler", kunye.gozler)}
                                      {renderInfoboxRow("Kişilik", kunye.kisilik)}
                                      {renderInfoboxRow("Sevdikleri", kunye.sevdikleri)}
                                      {renderInfoboxRow("Sevmedikleri", kunye.sevmedikleri)}
                                      {renderInfoboxRow("Hobiler", kunye.hobiler)}
                                    </>
                                  )}
                                  
                                  {/* Yer / Mekân / Dükkân fields */}
                                  {(activeEntity.type === 'yer' || activeEntity.type === 'mekân' || activeEntity.type === 'dükkân') && (
                                    <>
                                      {renderInfoboxRow("İşletme/Mekan Türü", activeEntity.metadata?.profile?.shopType)}
                                      {renderInfoboxRow("Sorumlu / Yönetici", activeEntity.metadata?.profile?.manager)}
                                      {renderInfoboxRow("Mimari Stil", activeEntity.metadata?.profile?.style)}
                                      {renderInfoboxRow("Önemli Sırlar", activeEntity.metadata?.profile?.secrets)}
                                    </>
                                  )}
                                  
                                  {/* Marka / Kulüp fields */}
                                  {(activeEntity.type === 'marka' || activeEntity.type === 'kulüp') && (
                                    <>
                                      {renderInfoboxRow("Kuruluş Amacı", activeEntity.metadata?.profile?.purpose)}
                                      {renderInfoboxRow("Yönetici / Öncü", activeEntity.metadata?.profile?.leader)}
                                      {renderInfoboxRow("Gizlilik / Kabul Koşulu", activeEntity.metadata?.profile?.secrecy)}
                                    </>
                                  )}
                                  
                                  {/* Ürün fields */}
                                  {activeEntity.type === 'ürün' && (
                                    <>
                                      {renderInfoboxRow("Nadirik Derecesi", activeEntity.metadata?.profile?.rarity)}
                                      {renderInfoboxRow("Kullanılan Malzeme", activeEntity.metadata?.profile?.material)}
                                      {renderInfoboxRow("Ana Fonksiyon", activeEntity.metadata?.profile?.function)}
                                    </>
                                  )}
                                  
                                  {/* Olay fields */}
                                  {activeEntity.type === 'olay' && (
                                    <>
                                      {renderInfoboxRow("Tarih / Dönem", activeEntity.metadata?.date)}
                                      {renderInfoboxRow("Tekrarlanma Sıklığı", activeEntity.metadata?.recurrence)}
                                    </>
                                  )}
                                  
                                  {/* Relationships (Hyperlinks!) */}
                                  {renderLinkedItemRow("Bağlı Olduğu Marka", activeEntity.metadata?.brandId)}
                                  {renderLinkedItemRow("Bulunduğu Konum", activeEntity.metadata?.placeId)}
                                </tbody>
                              </table>
                            </div>

                            {/* Security stamp / Watermark decoration */}
                            <div className="border-t border-dashed border-stone-300 dark:border-stone-800 pt-2 text-center">
                              <span className="text-[8px] font-mono text-stone-400 dark:text-stone-500 uppercase tracking-widest">✓ KEMS SECURE REGISTERED</span>
                            </div>

                          </div>
                        </div>

                      </div> {/* Close grid grid-cols-1 lg:grid-cols-3 */}

                    </>
                  )}

                </div>
              );
            })()}

                    {/* WIKIPEDIA "DEĞİŞTİR" (EDIT WORKSPACE FORM) MODE */}
                    {wikiMode === 'degistir' && (
                      <div className="space-y-6 animate-in zoom-in-95 duration-200">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 dark:bg-[#17345A]/30 p-4 rounded-lg border border-stone-200 dark:border-[#2C3C72]">
                          
                          {/* Title & Type */}
                          <div>
                            <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                              Varlık / Madde Başlığı
                            </label>
                            <input
                              type="text"
                              value={activeEntity.title}
                              onChange={async (e) => await onUpdateItem({ ...activeEntity, title: e.target.value })}
                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                              Varlık Türü
                            </label>
                            <select
                              value={activeEntity.type}
                              onChange={async (e) => await onUpdateItem({ ...activeEntity, type: e.target.value as ItemType })}
                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                            >
                              <option value="kisi">Kişi / Sakin</option>
                              <option value="marka">Marka / Kulüp</option>
                              <option value="mekân">Mekân / İşletme</option>
                              <option value="yer">Yer / Coğrafi Nokta</option>
                              <option value="olay">Olay / Tarih (Lore)</option>
                              <option value="ürün">Ürün / Drop</option>
                            </select>
                          </div>

                          {/* Status and Priority (With Low priority select + deletion button) */}
                          <div>
                            <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                              Mevcut Durum
                            </label>
                            <select
                              value={activeEntity.status}
                              onChange={async (e) => await onUpdateItem({ ...activeEntity, status: e.target.value })}
                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                            >
                              <option value="Fikir">Fikir</option>
                              <option value="Planlandı">Planlandı</option>
                              <option value="Çalışılıyor">Çalışılıyor</option>
                              <option value="Bitti">Bitti</option>
                              <option value="Yayınlandı">Yayınlandı</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                              Öncelik Seviyesi / Beğeni Derecesi
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={activeEntity.priority || 'orta'}
                                onChange={async (e) => await onUpdateItem({ ...activeEntity, priority: e.target.value })}
                                className="flex-1 text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                              >
                                <option value="yuksek">Yüksek Öncelikli (Beğenildi)</option>
                                <option value="orta">Orta Öncelikli</option>
                                <option value="dusuk">Düşük Öncelikli (Alternatif/Beğenilmedi)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntity(activeEntity)}
                                className="px-3 py-2 rounded transition-colors text-xs font-mono cursor-pointer bg-red-100 hover:bg-red-600 hover:text-white text-red-600"
                                title="Bu Maddeyi Tamamen Sil"
                              >
                                Sil
                              </button>
                            </div>
                          </div>

                          {/* Region and Connections */}
                          <div>
                            <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                              Bağlı Olduğu Bölge / Coğrafya
                            </label>
                            <select
                              value={activeEntity.metadata?.region || 'belirlenmemiş'}
                              onChange={async (e) => {
                                const reg = e.target.value;
                                await onUpdateItem({
                                  ...activeEntity,
                                  metadata: { 
                                    ...activeEntity.metadata, 
                                    region: reg,
                                    haritaKonum: activeEntity.metadata?.haritaKonum || (reg === 'belirlenmemiş' ? { x: 50, y: 50 } : getDefaultCoordsForRegion(reg))
                                  }
                                });
                              }}
                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden capitalize"
                            >
                              <option value="belirlenmemiş">belirlenmemiş (Belirtilmemiş)</option>
                              {activeRegionList.map(reg => (
                                <option key={reg} value={reg}>{reg}</option>
                              ))}
                            </select>
                          </div>

                          {/* Roof Location (Çatı Lokasyon) */}
                          {activeEntity.type === 'yer' && (
                            <div>
                              <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                                Üst Konum / Çatı Lokasyon (Mekan Hiyerarşisi)
                              </label>
                              <select
                                value={activeEntity.metadata?.placeId || ''}
                                onChange={async (e) => await onUpdateItem({
                                  ...activeEntity,
                                  metadata: { ...activeEntity.metadata, placeId: e.target.value || undefined }
                                })}
                                className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                              >
                                <option value="">-- Yok (Bağımsız Ana Konum) --</option>
                                {entities.filter(ent => ent.type === 'yer' && ent.id !== activeEntity.id).map(ent => (
                                  <option key={ent.id} value={ent.id}>{ent.title}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                              Bağlı Olduğu Ana Marka / Kulüp
                            </label>
                            <select
                              value={activeEntity.metadata?.brandId || ''}
                              onChange={async (e) => await onUpdateItem({
                                ...activeEntity,
                                metadata: { ...activeEntity.metadata, brandId: e.target.value || undefined }
                              })}
                              className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                            >
                              <option value="">-- Bağımsız --</option>
                              {items.filter(i => (i.type === 'marka' || i.type === 'kulüp') && !i.archived).map(b => (
                                <option key={b.id} value={b.id}>{b.title}</option>
                              ))}
                            </select>
                          </div>

                          {activeEntity.type === 'olay' && (
                            <>
                              <div>
                                <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                                  Şenlik / Olay Tarihi
                                </label>
                                <input
                                  type="text"
                                  placeholder="Örn: 12 Eylül, Her Ekinoks..."
                                  value={activeEntity.metadata?.date || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: { ...activeEntity.metadata, date: e.target.value }
                                  })}
                                  className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                                  Yinelenme Düzeni
                                </label>
                                <input
                                  type="text"
                                  placeholder="Örn: Yıllık, Tek Seferlik..."
                                  value={activeEntity.metadata?.recurrence || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: { ...activeEntity.metadata, recurrence: e.target.value }
                                  })}
                                  className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2"
                                />
                              </div>
                            </>
                          )}

                        </div>

                        {/* General Summary / Notes text */}
                        <div>
                          <label className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">
                            Giriş Paragrafı (Maddenin Genel Tanımı)
                          </label>
                          <textarea
                            rows={4}
                            value={activeEntity.notes || ''}
                            onChange={async (e) => await onUpdateItem({ ...activeEntity, notes: e.target.value })}
                            placeholder="Madde hakkında ansiklopedik özet girişi karalayın..."
                            className="w-full text-xs bg-white dark:bg-[#13204A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2.5 focus:outline-hidden"
                          />
                        </div>

                        {/* Special Custom Profile Fields depending on Item Type */}
                        <div className="bg-[#FAF8F5] dark:bg-[#13204A]/30 p-3.5 border border-[#CFC5B4]/30 rounded-xl space-y-3.5 text-xs">
                          <div className="flex items-center justify-between border-b border-[#CFC5B4]/30 pb-2 mb-2">
                            <span className="text-[10px] font-mono text-[#D35057] uppercase font-bold tracking-wider block">Varlığa Özel Künye Kartı Bilgileri</span>
                            <button
                              type="button"
                              onClick={handleAiGenerateKunya}
                              disabled={loadingKunyaAi || !activeEntity.notes}
                              className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-all ${
                                loadingKunyaAi 
                                  ? 'bg-stone-100 dark:bg-[#1B2A4A] text-stone-400' 
                                  : 'bg-[#D35057] text-white hover:bg-[#D35057]/90'
                              }`}
                              title={activeEntity.notes ? "Madde genel tanımını analiz ederek künyeleri otomatik doldurur." : "Künye önerisi almak için önce 'Giriş Paragrafı' girmelisiniz."}
                            >
                              {loadingKunyaAi ? (
                                <>
                                  <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-stone-400 border-t-transparent rounded-full mr-1"></span>
                                  Çıkarım Yapılıyor...
                                </>
                              ) : (
                                "✨ Yapay Zeka ile Künye Öner"
                              )}
                            </button>
                          </div>

                          {kunyaAiSuggestions && (
                            <div className="bg-[#FFFDF9] dark:bg-[#13204A]/60 border border-[#D35057]/30 rounded-lg p-3 space-y-2 mt-2 mb-3">
                              <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#2C3C72] pb-1.5">
                                <span className="text-[10px] font-mono font-bold text-[#D35057] uppercase">Yapay Zeka Künye Çıkarımları</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      // Apply all suggestions
                                      const currentProfile = activeEntity.metadata?.profile || {};
                                      const updatedProfile = { ...currentProfile, ...kunyaAiSuggestions };
                                      await onUpdateItem({
                                        ...activeEntity,
                                        metadata: {
                                          ...activeEntity.metadata,
                                          profile: updatedProfile
                                        }
                                      });
                                      setKunyaAiSuggestions(null);
                                    }}
                                    className="text-[9px] bg-[#E1F2E5] text-[#2E7247] px-2 py-0.5 rounded font-bold hover:bg-[#2E7247] hover:text-white transition-all cursor-pointer"
                                  >
                                    Hepsini Uygula
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setKunyaAiSuggestions(null)}
                                    className="text-[9px] text-stone-500 hover:text-stone-700"
                                  >
                                    Kapat
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                {Object.entries(kunyaAiSuggestions).map(([key, value]) => {
                                  // Human label mapping
                                  const labelMap: Record<string, string> = {
                                    profession: "Meslek / Rol",
                                    personality: "Mizaç / Kişilik",
                                    origin: "Köken / Soy",
                                    motivation: "Hedef / Motivasyon",
                                    shopType: "İşletme/Mekan Türü",
                                    manager: "Sorumlu / Sahibi",
                                    style: "Mimari Tarz",
                                    secrets: "Önemli Sırlar",
                                    purpose: "Kuruluş Amacı",
                                    leader: "Liderlik",
                                    secrecy: "Gizlilik / Üye Sayısı",
                                    rarity: "Nadirik Derecesi",
                                    material: "Köken / Malzeme",
                                    function: "Ana İşlevi"
                                  };
                                  const label = labelMap[key] || key;
                                  const currentValue = activeEntity.metadata?.profile?.[key] || '';
                                  const isDifferent = currentValue !== value;

                                  return (
                                    <div key={key} className="p-1.5 bg-stone-50/50 dark:bg-[#17345A]/20 border border-stone-200/50 dark:border-[#2C3C72]/50 rounded flex flex-col justify-between">
                                      <div>
                                        <span className="font-semibold text-stone-500 block text-[9px] uppercase tracking-wider">{label}</span>
                                        <span className="text-stone-800 dark:text-stone-200 mt-0.5 block">{value}</span>
                                        {currentValue && (
                                          <span className="text-[9px] text-stone-400 block mt-0.5 italic">
                                            Mevcut: "{currentValue}"
                                          </span>
                                        )}
                                      </div>
                                      {isDifferent && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const currentProfile = activeEntity.metadata?.profile || {};
                                            const updatedProfile = { ...currentProfile, [key]: value };
                                            await onUpdateItem({
                                              ...activeEntity,
                                              metadata: {
                                                ...activeEntity.metadata,
                                                profile: updatedProfile
                                              }
                                            });
                                            // Remove from suggestions list
                                            setKunyaAiSuggestions(prev => {
                                              if (!prev) return null;
                                              const next = { ...prev };
                                              delete next[key];
                                              return Object.keys(next).length > 0 ? next : null;
                                            });
                                          }}
                                          className="mt-1.5 self-end text-[9px] bg-[#1B2A4A] text-white dark:bg-[#F3EFE8] dark:text-[#1B2A4A] px-1.5 py-0.5 rounded font-mono hover:opacity-90 cursor-pointer"
                                        >
                                          Uygula
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {(activeEntity.type === 'kisi' || activeEntity.type === 'karakter') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Meslek / Rol</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.profession || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), profession: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Otel Müdürü, Dedektif..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Mizaç / Kişilik</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.personality || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), personality: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Melankolik, Detaycı..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Köken / Soy</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.origin || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), origin: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Isola, Kemskøy Hanedanı..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Ana Hedef / Motivasyon</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.motivation || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), motivation: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: İntikam almak, Gerçeği bulmak..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                            </div>
                          )}

                          {(activeEntity.type === 'mekân' || activeEntity.type === 'dükkân' || activeEntity.type === 'yer') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">İşletme/Mekan Türü</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.shopType || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), shopType: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Bar, Otel Lobisi, Mağara..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Sorumlu / Sahibi</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.manager || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), manager: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Alper Kansu..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Mimari Tarz</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.style || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), style: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Gotik, Modern, Yarı Harabe..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Önemli Sırlar</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.secrets || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), secrets: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Gizli tünel girişi var..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                            </div>
                          )}

                          {(activeEntity.type === 'marka' || activeEntity.type === 'kulüp') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Kuruluş Amacı</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.purpose || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), purpose: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Gizli Cemiyet, Holding..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Liderlik</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.leader || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), leader: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Aile Konseyi, Kurucu Başkan..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Gizlilik / Üye Sayısı</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.secrecy || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), secrecy: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Derece 3, Çok Gizli..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                            </div>
                          )}

                          {activeEntity.type === 'ürün' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Nadirik Derecesi</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.rarity || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), rarity: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Efsanevi, Nadir, Yaygın..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Köken / Malzeme</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.material || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), material: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Çelik, Obsidyen, Antik Pirinç..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-stone-500 mb-1">Ana İşlevi</label>
                                <input
                                  type="text"
                                  value={activeEntity.metadata?.profile?.function || ''}
                                  onChange={async (e) => await onUpdateItem({
                                    ...activeEntity,
                                    metadata: {
                                      ...activeEntity.metadata,
                                      profile: { ...(activeEntity.metadata?.profile || {}), function: e.target.value }
                                    }
                                  })}
                                  placeholder="Örn: Resepsiyon Odası Anahtarı..."
                                  className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 dark:border-[#2C3C72] text-[#1B2A4A] dark:text-[#F3EFE8] rounded p-2"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Infobox Image Uploader Section (With direct visual preview, no borders/cards) */}
                        <div className="p-4 bg-stone-50 dark:bg-[#17345A]/30 border border-stone-200 dark:border-[#2C3C72] rounded-lg">
                          <span className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase mb-2">
                            Profil Görseli & Logo Yükleme
                          </span>
                          
                          <div className="flex items-center gap-4">
                            {(activeEntity.metadata?.brandKit?.logoBase64 || activeEntity.metadata?.brandKit?.selectedLogo) ? (
                              <div className="relative group w-20 h-20 bg-transparent overflow-hidden flex items-center justify-center shrink-0">
                                <img 
                                  src={activeEntity.metadata.brandKit.logoBase64 || activeEntity.metadata.brandKit.selectedLogo} 
                                  alt="Brand Logo Preview" 
                                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const bk = activeEntity.metadata?.brandKit || { selectedLogo: '', ideaLogos: [], colorPalette: [], exemplaryWorks: [] };
                                    await onUpdateItem({
                                      ...activeEntity,
                                      metadata: {
                                        ...activeEntity.metadata,
                                        brandKit: { ...bk, logoBase64: '', selectedLogo: '' }
                                      }
                                    });
                                  }}
                                  className="absolute inset-0 bg-red-600/80 text-white text-[9px] font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                >
                                  Görseli Kaldır
                                </button>
                              </div>
                            ) : (
                              <div className="w-20 h-20 bg-white dark:bg-[#13204A] border border-dashed border-stone-300 rounded flex items-center justify-center text-[10px] text-stone-400 shrink-0 uppercase">
                                Görsel Yok
                              </div>
                            )}

                            <div className="space-y-1">
                              <span className="text-[11px] block text-stone-500">Transparan PNG veya JPG formatlarında dosya seçin:</span>
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
                                      const compressed = await compressImageBase64(base64);
                                      const bk = activeEntity.metadata?.brandKit || { selectedLogo: '', ideaLogos: [], colorPalette: [], exemplaryWorks: [] };
                                      await onUpdateItem({
                                        ...activeEntity,
                                        metadata: {
                                          ...activeEntity.metadata,
                                          brandKit: { ...bk, logoBase64: compressed }
                                        }
                                      });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="text-xs font-mono text-stone-600"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Wiki Custom Sections Editing Row */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                            <span className="block text-xs font-mono text-[#6A5E4C] dark:text-[#A6B0C9] uppercase">
                              Detaylı Bilgi Paragrafları (Wiki Bölümleri)
                            </span>
                            <button
                              onClick={handleAiGenerateWikiSections}
                              disabled={aiGeneratingSections}
                              className="text-[10px] font-mono text-[#D35057] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#D35057]" />
                              {aiGeneratingSections ? "Derleniyor..." : "AI ile Başlık ve İçerik Öner"}
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {(activeEntity.metadata?.wikiSections || []).map(sec => {
                              const isEditing = editingWikiId === sec.id;
                              const isProposal = sec.status === 'öneri';
                              return (
                                <div key={sec.id} className={`p-3 rounded border text-xs ${isProposal ? 'bg-[#FBF3E4] border-dashed border-[#D35057]' : 'bg-stone-50 dark:bg-[#17345A]/30 border-stone-200 dark:border-[#2C3C72]'}`}>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold font-serif">{sec.title} {isProposal && "(Öneri)"}</span>
                                    <div className="flex gap-2 text-[10px] font-mono">
                                      {isProposal ? (
                                        <>
                                          <button 
                                            onClick={() => handleRejectWikiProposal(sec.id)} 
                                            className={`${wikiConfirmId === `reject_${sec.id}` ? 'text-white bg-red-600 px-1 rounded animate-pulse' : 'text-red-500 hover:underline cursor-pointer'}`}
                                          >
                                            {wikiConfirmId === `reject_${sec.id}` ? '⚠️ Emin misiniz?' : 'Reddet'}
                                          </button>
                                          <button onClick={() => handleAcceptWikiProposal(sec.id)} className="text-emerald-600 font-bold hover:underline cursor-pointer">✓ Kabul Et</button>
                                        </>
                                      ) : (
                                        <>
                                          {!isEditing ? (
                                            <>
                                              <button onClick={() => handleWikiSectionDevamEt(sec.id)} className="text-[#D35057] hover:underline cursor-pointer">Devam Yazdır (AI)</button>
                                              <button onClick={() => {
                                                setEditingWikiId(sec.id);
                                                setEditingWikiTitle(sec.title);
                                                setEditingWikiContent(sec.content);
                                              }} className="text-indigo-500 hover:underline cursor-pointer">Düzenle</button>
                                              <button 
                                                onClick={() => handleDeleteWikiSection(sec.id)} 
                                                className={`${wikiConfirmId === `delete_${sec.id}` ? 'text-white bg-red-600 px-1 rounded animate-pulse' : 'text-red-500 hover:underline cursor-pointer'}`}
                                              >
                                                {wikiConfirmId === `delete_${sec.id}` ? '⚠️ Emin misiniz?' : 'Sil'}
                                              </button>
                                            </>
                                          ) : (
                                            <button onClick={() => handleSaveWikiSection(sec.id)} className="text-emerald-600 font-bold hover:underline cursor-pointer">Kaydet</button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <div className="space-y-1.5 pt-1">
                                      <input
                                        type="text"
                                        value={editingWikiTitle}
                                        onChange={(e) => setEditingWikiTitle(e.target.value)}
                                        className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 p-1 rounded focus:outline-hidden"
                                      />
                                      <textarea
                                        rows={3}
                                        value={editingWikiContent}
                                        onChange={(e) => setEditingWikiContent(e.target.value)}
                                        className="w-full text-xs bg-white dark:bg-[#13204A] border border-stone-300 p-1 rounded focus:outline-hidden"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed font-serif">{sec.content}</p>
                                  )}
                                </div>
                              );
                            })}

                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Örn: Tarihçesi, Coğrafi Yapısı"
                                value={newSectionTitle}
                                onChange={(e) => setNewSectionTitle(e.target.value)}
                                className="flex-1 text-xs bg-white dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-stone-300 dark:border-[#2C3C72] rounded p-2 focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomWikiSection}
                                className="bg-[#1B2A4A] dark:bg-[#D35057] text-white px-4 text-xs font-mono rounded cursor-pointer hover:opacity-90"
                              >
                                Bölüm Ekle
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Finish Editing Button to return back */}
                        <div className="pt-4 border-t border-stone-200">
                          <button
                            type="button"
                            onClick={() => setWikiMode('oku')}
                            className="px-4 py-2 bg-[#1B2A4A] text-white text-xs font-mono rounded-lg hover:opacity-95 cursor-pointer"
                          >
                            ✓ Düzenlemeyi Tamamla ve Maddede Oku
                          </button>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* Wiki article footer navigation info */}
                  <div className="pt-4 mt-6 border-t border-stone-200 dark:border-stone-800 text-[10px] font-mono text-stone-400 flex items-center justify-between">
                    <span>Son Güncelleme: {activeEntity.updatedAt ? new Date(activeEntity.updatedAt).toLocaleDateString() : 'Şimdi'}</span>
                    <button 
                      onClick={() => onSelectItem(null)}
                      className="text-[#D35057] hover:underline"
                    >
                      Ana Sayfaya Dön
                    </button>
                  </div>

                </div>
              ) : (
                // WIKIPEDIA PORTAL ANA SAYFA (WELCOME PORTAL VIEW)
                <div className="bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-6 min-h-[750px] shadow-xs paper-grain flex flex-col justify-between space-y-6 animate-in fade-in duration-200">
                  
                  <div className="space-y-6">
                    {/* Welcome Banner */}
                    <div className="bg-[#F8F9FA] dark:bg-[#17345A]/50 border-2 border-[#CFC5B4]/50 rounded-xl p-6 text-center space-y-2.5">
                      <h2 className="font-serif text-2xl md:text-3xl font-extrabold text-[#1B2A4A] dark:text-[#F3EFE8] italic">
                        Düzada Lore Ansiklopedisi'ne Hoş Geldiniz!
                      </h2>
                      <p className="text-xs text-stone-600 dark:text-stone-300 max-w-2xl mx-auto leading-relaxed">
                        Ege denizinin kıvrımlarında kurulmuş kurgusal Küçükçetmi köyünü, antik gözetleme kulelerini, asırlık çam ormanlarını, adanın sakinlerini ve olayları bir araya getiren özgür, interaktif evren ansiklopedisi.
                      </p>
                      <div className="pt-1">
                        <span className="text-[10px] font-mono uppercase bg-[#D35057]/10 text-[#D35057] px-3 py-1 rounded-full font-bold">
                          KEMS COMPANY Kültürel Arşiv Projesi
                        </span>
                      </div>
                    </div>

                    {/* Wiki Portal Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Seçkin Madde (Featured Article) */}
                      {featuredEntity && (
                        <div className="bg-[#FBFBF9] dark:bg-[#17345A]/30 border border-stone-200 dark:border-[#2C3C72] p-4 rounded-lg space-y-3 shadow-2xs">
                          <span className="text-[10px] uppercase font-mono text-[#D35057] font-bold block tracking-wider">
                            ★ Haftanın Seçkin Maddesi
                          </span>
                          <h3 className="font-serif text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
                            <button
                              onClick={() => onSelectItem(featuredEntity.id)}
                              className="hover:underline text-left cursor-pointer"
                            >
                              {featuredEntity.title}
                            </button>
                          </h3>
                          <p className="text-xs text-stone-600 dark:text-stone-300 font-serif leading-relaxed line-clamp-4">
                            {featuredEntity.notes || "Bu seçkin madde hakkında henüz detaylı özet girilmemiştir."}
                          </p>
                          <button
                            onClick={() => onSelectItem(featuredEntity.id)}
                            className="text-xs text-[#D35057] hover:underline font-mono"
                          >
                            Maddenin tamamını oku →
                          </button>
                        </div>
                      )}

                      {/* Right: Son Değişiklikler ve İstatistikler */}
                      <div className="bg-[#FBFBF9] dark:bg-[#17345A]/30 border border-stone-200 dark:border-[#2C3C72] p-4 rounded-lg space-y-3 shadow-2xs">
                        <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block tracking-wider">
                          Son Değişiklikler & Son Aktivite
                        </span>
                        
                        <div className="space-y-2 text-xs">
                          {entities.slice(0, 4).map(e => (
                            <div 
                              key={e.id}
                              className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-1"
                            >
                              <button
                                onClick={() => onSelectItem(e.id)}
                                className="text-[#D35057] hover:underline font-serif text-left truncate max-w-[180px]"
                              >
                                {e.title}
                              </button>
                              <span className="text-[9px] font-mono opacity-55 capitalize">
                                {e.type} · {e.status}
                              </span>
                            </div>
                          ))}

                          {entities.length === 0 && (
                            <p className="text-stone-400 italic">Ansiklopedide henüz hiç madde bulunmuyor.</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                          <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block mb-1">
                            Ansiklopedi Dağılımı
                          </span>
                          <div className="grid grid-cols-6 gap-1 text-center text-[10px] font-mono">
                            <div className="bg-stone-100 dark:bg-[#17345A]/60 border border-stone-200/50 dark:border-[#2C3C72]/50 p-1 rounded">
                              <span className="block font-bold">{entities.filter(e => e.type === 'kisi' || e.type === 'karakter').length}</span>
                              <span className="text-[8px] opacity-60">Kişi</span>
                            </div>
                            <div className="bg-stone-100 dark:bg-[#17345A]/60 border border-stone-200/50 dark:border-[#2C3C72]/50 p-1 rounded">
                              <span className="block font-bold">{entities.filter(e => e.type === 'mekân' || e.type === 'dükkân').length}</span>
                              <span className="text-[8px] opacity-60">Mekân</span>
                            </div>
                            <div className="bg-stone-100 dark:bg-[#17345A]/60 border border-stone-200/50 dark:border-[#2C3C72]/50 p-1 rounded">
                              <span className="block font-bold">{entities.filter(e => e.type === 'yer').length}</span>
                              <span className="text-[8px] opacity-60">Yer</span>
                            </div>
                            <div className="bg-stone-100 dark:bg-[#17345A]/60 border border-stone-200/50 dark:border-[#2C3C72]/50 p-1 rounded">
                              <span className="block font-bold">{entities.filter(e => e.type === 'marka' || e.type === 'kulüp').length}</span>
                              <span className="text-[8px] opacity-60">Marka</span>
                            </div>
                            <div className="bg-stone-100 dark:bg-[#17345A]/60 border border-stone-200/50 dark:border-[#2C3C72]/50 p-1 rounded">
                              <span className="block font-bold">{entities.filter(e => e.type === 'olay').length}</span>
                              <span className="text-[8px] opacity-60">Olay</span>
                            </div>
                            <div className="bg-stone-100 dark:bg-[#17345A]/60 border border-stone-200/50 dark:border-[#2C3C72]/50 p-1 rounded">
                              <span className="block font-bold">{entities.filter(e => e.type === 'ürün').length}</span>
                              <span className="text-[8px] opacity-60">Ürün</span>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Düzada Coğrafyası ve Önemli Yerler (Yerler) */}
                    <div className="bg-[#FAF8F5] dark:bg-[#12224A] border border-[#CFC5B4]/50 rounded-xl p-5 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Compass className="w-5 h-5 text-amber-500 animate-pulse" />
                        <h3 className="font-serif font-bold text-sm text-[#1B2A4A] dark:text-[#F3EFE8] uppercase tracking-tight">
                          Düzada Coğrafyası ve Önemli Coğrafi Noktalar (Yerler)
                        </h3>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
                        Adanın dağları, gizemli ormanları, deniz fenerleri, tarlaları ve sahilleri gibi coğrafi referans noktalarını içeren özel ansiklopedik dizin.
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                        {entities.filter(e => 
                          e.type === 'yer' && 
                          (e.id.startsWith('region_') || 
                           e.tags?.includes('bölge') || 
                           ['merkez', 'liman', 'fener', 'stad', 'çiftlik', 'eski_liman', 'eski liman / kemskoy'].includes(e.id) ||
                           ['Merkez', 'Liman', 'Fener', 'Stad', 'Çiftlik', 'Eski Liman / Kemsköy', 'Eski Liman'].includes(e.title))
                        ).map(y => (
                          <button
                            key={y.id}
                            onClick={() => onSelectItem(y.id)}
                            className="flex items-center gap-2 p-2.5 bg-white dark:bg-[#17345A] border border-stone-200 dark:border-[#2C3C72] rounded-lg hover:border-amber-400 hover:shadow-2xs transition-all text-left text-xs text-stone-700 dark:text-stone-200 font-medium group cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                            <span className="truncate">{y.title}</span>
                          </button>
                        ))}
                        {entities.filter(e => 
                          e.type === 'yer' && 
                          (e.id.startsWith('region_') || 
                           e.tags?.includes('bölge') || 
                           ['merkez', 'liman', 'fener', 'stad', 'çiftlik', 'eski_liman', 'eski liman / kemskoy'].includes(e.id) ||
                           ['Merkez', 'Liman', 'Fener', 'Stad', 'Çiftlik', 'Eski Liman / Kemsköy', 'Eski Liman'].includes(e.title))
                        ).length === 0 && (
                          <span className="text-xs text-stone-400 italic col-span-full">
                            Henüz bu kategoride ansiklopedik yer tanımı yapılmadı. Yeni bir madde ekleyerek başlayabilirsiniz!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Wikipedia Quick Instructions Banner */}
                    <div className="p-4 border border-stone-200 rounded-lg text-xs text-stone-500 font-serif leading-relaxed">
                      <span className="font-bold block text-stone-700 dark:text-[#A6B0C9] font-sans text-xs mb-1">Ansiklopedik Bağlantı Özelliği</span>
                      Herhangi bir maddenin içeriğini okurken; eğer metin içerisinde diğer maddelerimizin ismi (örn: <span className="font-sans font-bold">Kamil Efendi</span> veya <span className="font-sans font-bold">Küçükçetmi</span>) geçiyorsa, sistem bu ismi <span className="text-[#D35057] font-semibold">otomatik olarak tıklanabilir bir iç ansiklopedi bağlantısına</span> dönüştürür. Bu sayede lore sayfaları arasında kaybolmadan gezinebilirsiniz.
                    </div>

                  </div>

                  <div className="text-center text-[10px] font-mono text-stone-400">
                    Düzada Lore Ansiklopedisi · KEMS Company © 2026. Tüm hakları özgür kurgu dünyasına aittir.
                  </div>

                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* Custom Confirm Modal for iframe environment safety */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-[#12224A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-[#F3EFE8]">{confirmModal.title}</h3>
            </div>
            
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {confirmModal.message}
            </p>
            
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#17345A] dark:hover:bg-[#17345A]/80 text-stone-700 dark:text-[#A6B0C9] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await action();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Eminim, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
