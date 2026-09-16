import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
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
import { WikiShell } from './wiki/WikiShell';

import { useHaritaDuzeni } from '../lib/haritaDuzeni';
import {
  haritadaAra, maddeTohumu, kunyeSatiri, type HaritaKunyesi
} from '../lib/haritaMaddesi';

// MapLibre haritası ~1 MB'lık bir paket (motor + arazi verisi). Sekme
// açılmadan indirilmesin diye tembel yükleniyor.
const DuzadaHarita = lazy(() =>
  import('./harita/DuzadaHarita').then(m => ({ default: m.DuzadaHarita }))
);
// Düzenleyici de aynı motoru kullanıyor; "Düzenle"ye basılınca yüklenir (H2)
const HaritaDuzenleyici = lazy(() =>
  import('./harita/HaritaDuzenleyici').then(m => ({ default: m.HaritaDuzenleyici }))
);

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
      summaryText = `${ad}, The Imperial Kemsköy bünyesinde ${rol.toLowerCase()} olarak görev almaktadır.`;
    } else {
      summaryText = `${ad}, Düzada sakinlerinden ve The Imperial Kemsköy misafirlerinden biridir.`;
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
  // Harita düzeni (H1): elle yapılan harita düzenlemeleri — duzada/haritaDuzeni
  const haritaDuzeni = useHaritaDuzeni();
  // H2: harita sekmesinde görüntüleme ↔ düzenleme
  const [haritaDuzenleniyor, setHaritaDuzenleniyor] = useState(false);

  // Navigation / Tabs inside Düzada
  const [activeTab, setActiveTab] = useState<'wiki' | 'harita'>('wiki');
  
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
    // Kemal kararı (14 Eylül 2026): beş mahalle — Merkez, Liman, İskele,
    // Stadyum, Çiftlik. Eski Liman / Kemsköy ile İskele aynı yer; Fener ayrı
    // bir mahalle değil, Liman Mahallesi içinde bir mevki.
    //
    // Kimlikler eski hâliyle bırakıldı (eski_liman, stad): kayıtlı maddelerin
    // metadata.region alanı bunlara bakıyor, kimliği değiştirmek bağı koparırdı.
    return mapSettingsItem?.metadata?.mahalleler || [
      { id: 'merkez', name: 'Merkez Mahallesi', summary: "Adanın ortasındaki mahalle; eski adıyla Düzada Köyü. Ada büyüdükçe köy merkez mahallesi olarak anılmaya başlamış. Kamu binaları, apartmanlar ve küçük işletmeler burada." },
      { id: 'liman', name: 'Liman Mahallesi', summary: "İskele operasyonel olarak yetersiz kalınca inşa edilen yeni limanı ve çevresini kapsar. Adanın deniz trafiği buradan yürür. Mahallenin kuzeyinde, limana yukarıdan bakan bir burnun ucunda Fener mevkii bulunur." },
      { id: 'eski_liman', name: 'İskele Mahallesi', summary: "Eskiden Düzada Köyünün iskelesi olan, Kemsköy diye anılan mahalle. Liman caddesi ve eski limanı, adanın eğlence mekânları ve ilk oteli The Imperial Kemsköy burada. (Eski Liman / Kemsköy aynı yerdir.)" },
      { id: 'stad', name: 'Stadyum Mahallesi', summary: "Dirlik Stadı ve kulüp tesislerinin çevresinde gelişen mahalle. Adanın spor hayatı burada toplanır; maç günleri dışında sakindir." },
      { id: 'çiftlik', name: 'Çiftlik Mahallesi', summary: "Adanın tarım ve hayvancılık yapılan kesimi. Zeytinlikler, ağıllar ve Küçükçetmi Sürek Kulübü bu mahallede; nüfusu en seyrek bölge." }
    ];
  }, [mapSettingsItem]);

  const sokaklar = useMemo(() => {
    return mapSettingsItem?.metadata?.sokaklar || [
      { id: 'sok_1', name: 'Kuvayi Milliye Caddesi', mahalleId: 'merkez' },
      { id: 'sok_2', name: 'Çarşı Sokak', mahalleId: 'merkez' },
      { id: 'sok_3', name: 'Liman Kordonu', mahalleId: 'liman' },
      { id: 'sok_4', name: 'Fener Yolu', mahalleId: 'liman' },
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
    // Eski "eski liman / kemskoy" anahtarı bilerek eklenmiyor: Kemal kararıyla
    // İskele Mahallesi ile aynı yer sayıldı, ikinci bir mahalle üretmemeli.
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

  /**
   * Haritadaki bir yapı/mahalle tıklandığında ilgili arşiv maddesini açar.
   *
   * Bina `wikiId`'leri madde kimlikleriyle birebir aynı (kemskoy_hotel gibi).
   * Mahalleler ise haritada `yer_merkez`, arşivde `region_merkez` diye
   * geçiyor; o yüzden kimlik tutmazsa bölge anahtarı üzerinden aranıyor.
   */
  const sadelestir = (s: string) =>
    s
      .toLocaleLowerCase('tr')
      .replace(/[çğıöşü]/g, c => 'cgiosu'['çğıöşü'.indexOf(c)])
      .replace(/[^a-z0-9]/g, '');

  /** Haritadan gelip madde bulunamayınca açılan kutu (W1) */
  const [eksikMadde, setEksikMadde] = useState<HaritaKunyesi | null>(null);
  const [maddeKuruluyor, setMaddeKuruluyor] = useState(false);

  const haritaMaddesiniAc = (wikiId: string) => {
    let hedef = items.find(it => it.id === wikiId);
    if (!hedef && wikiId.startsWith('yer_')) {
      const anahtar = wikiId.slice(4); // merkez, liman, iskele, ciftlik, stadyum
      const bolgeler = items.filter(it => it.area === 'duzada' && it.type === 'yer');
      hedef =
        bolgeler.find(it => sadelestir(it.metadata?.region || '') === anahtar) ||
        bolgeler.find(it => sadelestir(it.id) === `region${anahtar}`) ||
        bolgeler.find(it => sadelestir(it.title).startsWith(anahtar.slice(0, 4)));
    }
    if (hedef) {
      setActiveTab('wiki');
      onSelectItem(hedef.id);
      return;
    }
    // W1: madde yok. Eskiden burada sessizce hiçbir şey olmuyordu.
    // Haritada karşılığı varsa maddeyi kurmayı teklif et.
    const kunye = haritadaAra(wikiId);
    if (kunye) setEksikMadde(kunye);
  };

  const eksikMaddeyiKur = async () => {
    if (!eksikMadde || maddeKuruluyor) return;
    setMaddeKuruluyor(true);
    try {
      await onAddItem(maddeTohumu(eksikMadde));
      setActiveTab('wiki');
      onSelectItem(eksikMadde.wikiId);
      setEksikMadde(null);
    } finally {
      setMaddeKuruluyor(false);
    }
  };

  // NEW Interactive Map Pin & Structure States
  
  // New Pin form fields
  const [newPinTitle, setNewPinTitle] = useState('');
  const [newPinCategory, setNewPinCategory] = useState<'lokasyon' | 'coğrafi' | 'kişi' | 'işletme'>('lokasyon');
  const [newPinLinkedId, setNewPinLinkedId] = useState('');
  const [newPinRegion, setNewPinRegion] = useState('merkez');
  const [newPinNotes, setNewPinNotes] = useState('');

  // Drag states for pin

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
        // Başlık anahtardan türetilirse "Eski_liman" gibi çirkin adlar çıkıyordu
        const title = mahalleler.find(m => m.id === key)?.name
          || key.charAt(0).toLocaleUpperCase('tr') + key.slice(1);
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
        notes: `Düzada, Ege Denizi'nin serin sularında saklanmış, zamanın daha yavaş aktığı bir takımadanın kalbidir. Tarihi zeytinlikleri, sarp kayalıkların ucunda yükselen deniz feneri, balıkçı teknelerinin sığındığı limanı ve dar sokaklarıyla kendine has melankolik bir atmosfere sahiptir.\n\nAda, özellikle 1954 kuruluş tarihli görkemli "The Imperial Kemsköy" oteli ve çevresindeki sırlar ile bilinir. Ekim 2003 ("Sezon Sonu") dönemi, rüzgarın sertleştiği, turistlerin elini eteğini çektiği ve adanın kendi iç hesaplaşmalarıyla baş başa kaldığı gizemli bir zaman dilimini temsil eder.`,
        images: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=512&auto=format&fit=crop"],
        isProposal: false,
        archived: false,
        metadata: {
          activeEra: 'Ekim 2003, "Sezon Sonu"',
          climate: 'Ege / Akdeniz Mikrokliması - Rüzgarlı, Sert',
          atmosphere: 'Melankolik, Sezon Sonu, Sisli ve Gizemli',
          wikiSections: [
            { id: 'sec_1', title: 'Tarihçe', content: "Düzada yerleşimi antik çağlara uzanmakla birlikte, modern hüviyetini 20. yüzyılın ortalarında kazanmıştır. 1954 yılında açılan The Imperial Kemsköy, adanın güneyindeki Eski Liman bölgesini canlandırmış ve adayı seçkin misafirlerin uğrak noktası haline getirmiştir.", status: 'resmi' as const },
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
    setImportFeedback("Kemsköy verileri hazırlanıyor...");
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
        setImportFeedback("Kemsköy verileri zaten aktarılmış durumda (0 yeni veri eklendi).");
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

      setImportFeedback(`Başarıyla ${toImport.length} adet Kemsköy Lore verisi aktarıldı!`);
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

  // Eski parşömen pin haritası kaldırıldı; pin sürükleme, pin kaydetme ve
  // SVG tıklama işleyicileri onunla birlikte gitti. Konum artık haritanın
  // kendi coğrafyasından geliyor (src/components/harita).

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
            onClick={() => setActiveTab('harita')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'harita' ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8]' : 'bg-[#F3EFE8] dark:bg-[#13204A] border border-[#CFC5B4] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
          >
            Düzada Haritası
          </button>
        </div>
      </div>

      {/* HARİTA — DÜZENLEME (H2) */}
      {activeTab === 'harita' && haritaDuzenleniyor && (
        <div className="bg-[#E7EBE6] border border-[#B9C7BD] rounded-xl p-4 archive-shadow relative paper-grain">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase text-[#4A5E68] font-bold">
              DÜZADA HARİTASI · DÜZENLEME
            </span>
          </div>
          {haritaDuzeni.ilkYukleme ? (
            <Suspense
              fallback={
                <div className="h-[78vh] flex items-center justify-center rounded-lg border border-[#B9C7BD] bg-[#F3EFE8] font-mono text-xs text-[#6A5E4C]">
                  Düzenleyici yükleniyor…
                </div>
              }
            >
              <HaritaDuzenleyici
                className="w-full h-[78vh] rounded-lg overflow-hidden border border-[#B9C7BD]"
                duzen={haritaDuzeni.duzen}
                kaydet={haritaDuzeni.kaydet}
                durum={haritaDuzeni.durum}
                hata={haritaDuzeni.hata}
                onKapat={() => setHaritaDuzenleniyor(false)}
              />
            </Suspense>
          ) : (
            <div className="h-[78vh] flex items-center justify-center rounded-lg border border-[#B9C7BD] bg-[#F3EFE8] font-mono text-xs text-[#6A5E4C]">
              Kayıtlı düzen okunuyor…
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: HARİTA MODU */}
      {activeTab === 'harita' && !haritaDuzenleniyor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 3B arazi haritası — gen/duzada.py + gen/dem.py üretimi */}
          <div className="lg:col-span-2 bg-[#E7EBE6] border border-[#B9C7BD] rounded-xl p-4 archive-shadow relative paper-grain">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-[#4A5E68] font-bold">
                  DÜZADA ARAZİ HARİTASI
                </span>
                <button
                  type="button"
                  onClick={() => setHaritaDuzenleniyor(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#1B2A4A] hover:bg-[#1B2A4A]/90 text-[#F3EFE8] text-[11px] font-mono cursor-pointer transition-colors"
                >
                  Haritayı düzenle
                </button>
              </div>
              <Suspense
                fallback={
                  <div className="h-[70vh] flex items-center justify-center rounded-lg border border-[#B9C7BD] bg-[#F3EFE8] font-mono text-xs text-[#6A5E4C]">
                    Harita yükleniyor…
                  </div>
                }
              >
                <DuzadaHarita
                  className="h-[70vh] rounded-lg overflow-hidden border border-[#B9C7BD]"
                  onSelect={haritaMaddesiniAc}
                  duzen={haritaDuzeni.duzen}
                />
              </Suspense>
              <p className="mt-2 text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] leading-relaxed">
                Sağ tuşla sürükleyerek eğ ve döndür · Bir yapıya ya da mahalleye
                tıklayıp “Viki maddesini aç” ile arşive geç.
              </p>
          </div>

          {/* Region side bar lore & selected pin card */}
          <div className="space-y-4">
            

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
                                      setActiveTab('wiki');
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
                              setActiveTab('wiki');
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

      {/* VIEW 1.5: WIKI MODU — yeni wiki katmanı (src/components/wiki) */}
      {activeTab === 'wiki' && (
        <WikiShell
          items={items}
          selectedId={activeItemId}
          onSelect={onSelectItem}
          onEdit={(id) => {
            setActiveTab('wiki');
            onSelectItem(id);
          }}
          onHaritayaGit={() => setActiveTab('harita')}
        />
      )}

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

      {/* W1 · Haritadaki yapının maddesi yok — kurmayı teklif et */}
      {eksikMadde && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
          onClick={() => setEksikMadde(null)}
        >
          <div
            className="bg-white dark:bg-[#12224A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-[#F3EFE8]">
                {eksikMadde.ad}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-stone-500 dark:text-[#6E7CA0]">
                {kunyeSatiri(eksikMadde)}
              </p>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Bu yapının henüz wiki maddesi yok. Haritadaki bilgilerle boş bir
              künye açayım mı? Ad, mahalle, kat ve rakım haritadan gelir;
              metni sen yazarsın.
            </p>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => setEksikMadde(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#17345A] dark:hover:bg-[#17345A]/80 text-stone-700 dark:text-[#A6B0C9] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Şimdi değil
              </button>
              <button
                onClick={eksikMaddeyiKur}
                disabled={maddeKuruluyor}
                className="px-4 py-2 bg-[#1B2A4A] hover:opacity-90 disabled:opacity-40 text-[#F3EFE8] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-opacity"
              >
                {maddeKuruluyor ? 'Kuruluyor…' : 'Maddeyi aç'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
