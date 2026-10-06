import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { HaritaBakisi } from './harita/DuzadaHarita';
import { MapPin, Shield, Users, Compass, ShoppingBag, Calendar, Check, AlertTriangle, Link, Maximize2, Minimize2, Car, Moon, Snowflake } from 'lucide-react';
import { ATMOSFER_KAPALI, type AtmosferAyari } from './harita/atmosfer';
import { Item, ItemType, WikiSection, BrandKit, AreaType } from '../types';
import { compressImageBase64 } from '../lib/imageCompressor';
import { resolveAllRelations, getRelationLabels, cleanupRelationsOnDelete } from '../utils/relations';
import { SayfaBasi } from './kabuk/SayfaBasi';
import { WikiShell } from './wiki/WikiShell';

import { useHaritaDuzeni } from '../lib/haritaDuzeni';
import {
  haritadaAra, maddeTohumu, kunyeSatiri, type HaritaKunyesi
} from '../lib/haritaMaddesi';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

/** Düzada'nın üç yüzü — Viki, Harita ve Evren Raporu */
const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'wiki', label: 'Düzada Wiki' },
  { id: 'harita', label: 'Harita ve Kurucu' },
  { id: 'rapor', label: 'Evren Raporu' }
];

// Rapor sekmesi açılınca yüklenir (sayfa açılışı hafif kalsın diye)
const DuzadaRaporu = lazy(() =>
  import('./duzada/DuzadaRaporu').then(m => ({ default: m.DuzadaRaporu }))
);

// MapLibre haritası ~1 MB'lık bir paket (motor + arazi verisi). Sekme
// açılmadan indirilmesin diye tembel yükleniyor.
const DuzadaHarita = lazy(() =>
  import('./harita/DuzadaHarita').then(m => ({ default: m.DuzadaHarita }))
);
// Kurucu (şehir kurucu): harita verisini kullanır, sekme açılınca yüklenir
const Kurucu = lazy(() =>
  import('./kurucu/Kurucu').then(m => ({ default: m.Kurucu }))
);

interface DuzadaProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  /** Menüden doğrudan bir sekmeye gelmek için (telefonda "Harita", "Kurucu", "Rapor") */
  istek?: { sekme: 'wiki' | 'harita' | 'kurucu' | 'rapor'; n: number } | null;
}


export default function Duzada({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  istek = null
}: DuzadaProps) {
  // Harita düzeni (H1): elle yapılan harita düzenlemeleri — duzada/haritaDuzeni
  const haritaDuzeni = useHaritaDuzeni();
  // H2: harita sekmesinde görüntüleme ↔ düzenleme
  const [haritaDuzenleniyor, setHaritaDuzenleniyor] = useState(false);
  // Harita ve Kurucu tek ekran: 2D çalışma, 3D bakış (29 Eylül)
  const [haritaUc, setHaritaUc] = useState(false);
  // 2D ↔ 3D geçişinde kamera aynı yere baksın
  const haritaBakisi = useRef<HaritaBakisi | null>(null);
  const bakisiTut = useCallback((b: HaritaBakisi) => { haritaBakisi.current = b; }, []);

  /**
   * Tam ekran (30 Eylül, Kemal: "tam ekrana geçiremiyorum"). Tarayıcı
   * destekliyorsa gerçek tam ekran; desteklemiyorsa (iPhone) harita bütün
   * pencereyi kaplar. Esc ya da düğme ile çıkılır.
   */
  const haritaKabi = useRef<HTMLDivElement>(null);

  /**
   * Trafik, saat, mevsim (30 Eylül): sitede hep açık; KKM'de bu düğmelerle.
   * Seçim bu tarayıcıda hatırlanır (kayda yazılmaz).
   */
  const [atmosfer, setAtmosfer] = useState<AtmosferAyari>(() => {
    try { return { ...ATMOSFER_KAPALI, ...JSON.parse(localStorage.getItem('kems_harita_atmosfer') || '{}') }; } catch { return ATMOSFER_KAPALI; }
  });
  const atmosferDegistir = (k: keyof AtmosferAyari) => setAtmosfer(a => {
    const y = { ...a, [k]: !a[k] };
    try { localStorage.setItem('kems_harita_atmosfer', JSON.stringify(y)); } catch { /* yok */ }
    return y;
  });
  const [tamEkran, setTamEkran] = useState(false);
  const tamEkranDegistir = useCallback(() => {
    const el = haritaKabi.current;
    if (!tamEkran) {
      setTamEkran(true);
      try { void el?.requestFullscreen?.().catch(() => { /* kaplama yeter */ }); } catch { /* yok */ }
    } else {
      setTamEkran(false);
      try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* yok */ }
    }
  }, [tamEkran]);
  useEffect(() => {
    const cikti = () => { if (!document.fullscreenElement) setTamEkran(false); };
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') setTamEkran(false); };
    document.addEventListener('fullscreenchange', cikti);
    window.addEventListener('keydown', tus);
    return () => { document.removeEventListener('fullscreenchange', cikti); window.removeEventListener('keydown', tus); };
  }, []);
  // Harita kutusu büyüyünce çizim yeniden ölçülsün
  useEffect(() => { const z = setTimeout(() => window.dispatchEvent(new Event('resize')), 60); return () => clearTimeout(z); }, [tamEkran]);

  const gorunumDugmesi = (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F5]/95 dark:bg-[#13204A]/95 border border-[#CFC5B4] dark:border-[#2C3C72] shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)]">
      <span className="hidden sm:block px-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#6A5E4C] dark:text-[#A6B0C9]">Düzada</span>
      {([['2d', '2D · kur'], ['3d', '3D · bak']] as const).map(([id, ad]) => (
        <button key={id} type="button" onClick={() => setHaritaUc(id === '3d')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer ${(id === '3d') === haritaUc ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}>
          {ad}
        </button>
      ))}
      <button type="button" onClick={tamEkranDegistir} title={tamEkran ? 'Tam ekrandan çık (Esc)' : 'Tam ekran'} aria-label={tamEkran ? 'Tam ekrandan çık' : 'Tam ekran'}
        className="ml-0.5 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer">
        {tamEkran ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{tamEkran ? 'Küçült' : 'Tam ekran'}</span>
      </button>
    </div>
  );

  // Navigation / Tabs inside Düzada
  // Kurucu artık haritanın kendisi (29 Eylül): 'kurucu' isteği haritayı açar
  const [activeTab, setActiveTab] = useState<'wiki' | 'harita' | 'rapor'>(istek?.sekme === 'kurucu' ? 'harita' : istek?.sekme ?? 'wiki');
  useEffect(() => { if (istek) setActiveTab(istek.sekme === 'kurucu' ? 'harita' : istek.sekme); }, [istek?.n]);
  
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
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Map Region Selected
  const [selectedRegion, setSelectedRegion] = useState<string>('merkez');

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
    // Sonradan bağlanan kayıt (Neyin Eksik → "Kayda bağla") da bulunur
    let hedef = items.find(it => it.id === wikiId) || items.find(it => !it.archived && it.metadata?.haritaWikiId === wikiId);
    if (!hedef && wikiId.startsWith('yer_')) {
      const anahtar = wikiId.slice(4); // merkez, liman, iskele, ciftlik, stadyum
      // Arşivdekiler atlanır: W1'de kalkan eski mahalle kayıtları bulunmasın
      const bolgeler = items.filter(it => it.area === 'duzada' && it.type === 'yer' && !it.archived);
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

  // Import / Cleanup Feedback States
  const [cleanupFeedback, setCleanupFeedback] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const activeEntity = useMemo(() => {
    if (!activeItemId) return null;
    return entities.find(e => e.id === activeItemId) || items.find(i => i.id === activeItemId) || null;
  }, [activeItemId, entities, items]);

  /*
   * Otomatik bölge oluşturma SİLİNDİ (29 Eylül). Bölge maddesi eksikse
   * sayfa açılınca kendiliğinden yazılıyordu (hazır internet fotoğrafları
   * ve uydurma metinlerle); Kemal: "Google yapay zekâsı onları bulup bulup
   * geri getiriyor." Kaldırılan geri gelmez.
   */

  // Synchronize 'duzada_world_details' umbrella container and establish two-way links
  useEffect(() => {
    if (!items || items.length === 0 || worldDetailsSyncedRef.current) return;

    const worldItem = items.find(i => i.id === 'duzada_world_details');
    // Ada maddesi yoksa artık kendiliğinden yazılmaz (29 Eylül)
    if (!worldItem) {
      worldDetailsSyncedRef.current = true;
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
      case 'lokasyon': return '#F26B6F'; // Red
      case 'coğrafi': return '#F59E0B'; // Amber
      case 'kişi': return '#6366F1'; // Indigo
      case 'işletme': return '#10B981'; // Emerald
      default: return '#0E1C4F'; // Navy
    }
  };

  // Eski parşömen pin haritası kaldırıldı; pin sürükleme, pin kaydetme ve
  // SVG tıklama işleyicileri onunla birlikte gitti. Konum artık haritanın
  // kendi coğrafyasından geliyor (src/components/harita).

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

  // Warning for links before delete or archive
  const handleDeleteEntity = (entity: Item) => {
    const activeRelations = resolveAllRelations(entity, items);
    const hasRelations = activeRelations.length > 0;
    
    // K: "Sil" artık arşive kaldırır; bağlar korunur, arşivden geri gelir
    const warningMessage = hasRelations
      ? `"${entity.title}" maddesi ${activeRelations.length} varlığa bağlı. Arşive kalkar; bağlar korunur, arşivden geri getirilebilir.\n\nArşive kaldırılsın mı?`
      : `"${entity.title}" maddesi arşive kalkar. Silinmez; arşivden geri getirilebilir.\n\nArşive kaldırılsın mı?`;

    triggerConfirm(
      "Maddeyi Arşive Kaldır",
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
      
      {/* Sade başlık (1 Ekim, K-2): sekmeler yalnız sayfa rayında; tutarlılık denetimi stüdyoda */}
      <SayfaBasi baslik="Düzada" />

      <SayfaRayi
        baslik="Düzada"
        bolumler={RAY_BOLUMLERI}
        aktifId={activeTab}
        onSec={id => setActiveTab(id as typeof activeTab)}
      />

      {/*
        HARİTA VE KURUCU (H, 29 Eylül) — tek ekran. Kemal: "Düzada Haritası
        ve Kurucu kısmını birbirine entegre et; city builder oyunlar gibi
        kontrol edebileceğim bir şey." 2D: çalışma ekranı (araçlar altta).
        3D: aynı ada eğik bakışla, yapılar kat sayısıyla yükselir.
      */}
      {activeTab === 'harita' && (
        haritaDuzeni.ilkYukleme ? (
          <div ref={haritaKabi} className={tamEkran ? 'fixed inset-0 z-[80] bg-[#1C4E8C]' : ''}>
          <Suspense fallback={<div className="h-[80vh] flex items-center justify-center rounded-2xl bg-[#1C4E8C] font-mono text-xs text-[#F3EFE8]">Harita yükleniyor…</div>}>
            {haritaUc ? (
              <div className="relative">
                <DuzadaHarita
                  className={tamEkran ? 'h-[100dvh] overflow-hidden' : 'h-[calc(100dvh-14.5rem)] sm:h-[calc(100vh-11rem)] min-h-[460px] sm:min-h-[520px] rounded-2xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72]'}
                  onSelect={haritaMaddesiniAc}
                  duzen={haritaDuzeni.duzen}
                  bakis={haritaBakisi.current}
                  onBakis={bakisiTut}
                  atmosfer={atmosfer}
                />
                <div className="absolute left-3 top-3 z-10">{gorunumDugmesi}</div>
                {/* Atmosfer düğmeleri sol altta: üstteki ada kartıyla çakışmasın */}
                <div className="absolute left-3 bottom-3 z-10">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F5]/95 dark:bg-[#13204A]/95 border border-[#CFC5B4] dark:border-[#2C3C72] shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)]">
                    {([['trafik', 'Trafik', Car], ['saat', 'Saat', Moon], ['mevsim', 'Mevsim', Snowflake]] as const).map(([k, ad, Ikon]) => (
                      <button key={k} type="button" onClick={() => atmosferDegistir(k)} aria-pressed={atmosfer[k]} aria-label={ad}
                        title={k === 'trafik' ? 'Araçlar, tekneler, feribot' : k === 'saat' ? 'Gerçek saate göre gündüz / gece' : 'Takvime göre yaz / kış'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer ${atmosfer[k] ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}>
                        <Ikon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{ad}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Kurucu
                className={tamEkran ? 'h-[100dvh] !rounded-none !border-0' : 'h-[calc(100dvh-14.5rem)] sm:h-[calc(100vh-11rem)] min-h-[460px] sm:min-h-[520px]'}
                duzen={haritaDuzeni.duzen}
                kaydet={haritaDuzeni.kaydet}
                durum={haritaDuzeni.durum}
                items={items}
                onMaddeAc={id => { setActiveTab('wiki'); onSelectItem(id); }}
                ustSol={gorunumDugmesi}
                bakis={haritaBakisi.current}
                onBakis={bakisiTut}
              />
            )}
          </Suspense>
          </div>
        ) : (
          <div className="h-[80vh] flex items-center justify-center rounded-2xl bg-[#1C4E8C] font-mono text-xs text-[#F3EFE8]">Kayıtlı düzen okunuyor…</div>
        )
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
          onUpdateItem={onUpdateItem}
          onAddItem={onAddItem}
          onRaporAc={() => setActiveTab('rapor')}
          onSitede={(it, acik) => {
            // Yalnız Kemal basınca yazılır. Kayıt eskisinin üstüne eklenerek
            // yazıldığı için alanı silmek işe yaramıyor; kapatınca false yazılır.
            void onUpdateItem({ ...it, metadata: { ...(it.metadata || {}), sitede: acik } as Item['metadata'], updatedAt: Date.now() });
          }}
        />
      )}

      {/* VIEW 3: EVREN RAPORU — kapsamlı, yazdırılabilir resmi Düzada raporu */}
      {activeTab === 'rapor' && (
        <Suspense fallback={<div className="h-48 flex items-center justify-center font-mono text-xs text-[#6A5E4C] dark:text-[#A6B0C9] animate-pulse">Rapor hazırlanıyor…</div>}>
          <DuzadaRaporu
            items={items}
            onMaddeSec={haritaMaddesiniAc}
            onHaritayaGit={() => setActiveTab('harita')}
          />
        </Suspense>
      )}

      {/* Custom Confirm Modal for iframe environment safety */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-[#12224A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="font-sans font-bold text-lg text-stone-800 dark:text-[#F3EFE8] tracking-tight">{confirmModal.title}</h3>
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
              <h3 className="font-sans font-bold text-lg text-stone-800 dark:text-[#F3EFE8] tracking-tight">
                {eksikMadde.ad}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-stone-500 dark:text-[#95A1C2]">
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
                className="px-4 py-2 bg-[#0E1C4F] dark:bg-[#2C3C72] hover:opacity-90 disabled:opacity-40 text-[#F3EFE8] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-opacity"
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
