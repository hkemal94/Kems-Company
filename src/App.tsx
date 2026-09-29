import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  auth, 
  signInWithGoogle,
  fetchAllItemsDirect,
  subscribeToAllItemsWithArchived, 
  subscribeToSettings, 
  saveSettings, 
  saveItem, 
  deleteItemDoc,
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Item, UserSettings, AreaType, ItemType } from './types';
import { maddeGorseli } from './lib/maddeGorseli';
import {
  AlertTriangle,
  ShoppingBag,
  BookOpen,
  Search,
  Compass,
  PenTool,
  Image as ImageIcon,
  Shield,
  Menu,
  Gamepad2,
  Home,
  ListChecks,
  Percent,
  Hammer,
  Map as MapIcon,
  Sun,
  Moon,
  UserRound
} from 'lucide-react';
import Durum from './components/Durum';
import Duzada from './components/Duzada';
import Merch from './components/Merch';
import YaziAtolyesi from './components/YaziAtolyesi';
import { SAYFA_RAYI_YUVASI } from './components/SayfaRayi';
import {
  aiGozcusunuKur, aiDurumunuDinle, aiDurumu, aiUyarisiniKapat, type AiDurum
} from './lib/aiGozcusu';
import Blog from './components/Blog';
import Kitap from './components/Kitap';
import HizliFikir from './components/HizliFikir';
import Bosluklar from './components/Bosluklar';
import Galeri from './components/Galeri';
import OyunEkrani from './components/oyun/OyunEkrani';
import Markalar from './components/Markalar';
import DuzadaDirectory from './components/DuzadaDirectory';
import { Yedekleme } from './components/Yedekleme';
import HizliNotModal from './components/HizliNotModal';
import AramaModal from './components/AramaModal';
import { Eksikler } from './components/Eksikler';
import { Anasayfa, type TelSekmesi } from './components/anasayfa/Anasayfa';
import { Zil } from './components/kabuk/Zil';
import { useBildirimler, type Bildirim } from './lib/bildirimler';

/** Uygulamanın sayfaları. 'komuta' ana sayfa; eski Komuta Merkezi 'durum'. */
type Sayfa = 'komuta' | 'durum' | 'eksikler' | 'markalar' | 'duzada' | 'merch' | 'yazi' | 'oyun' | 'galeri';

export interface WorkspaceUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export default function App() {
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ theme: 'arşiv' });
  const [lastSyncTime, setLastSyncTime] = useState<Date>(() => new Date());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // A ref lock to prevent infinite loops of room de-duplication on items real-time updates
  
  // Navigation & interaction states
  const [activeTab, setActiveTab] = useState<Sayfa>('komuta');
  /** Paket 4: alt sekmeye doğrudan gitme istekleri (telefonda Harita, Kurucu, Kitap) */
  const [duzadaIstek, setDuzadaIstek] = useState<{ sekme: 'wiki' | 'harita' | 'kurucu'; n: number } | null>(null);
  const [yaziIstek, setYaziIstek] = useState<{ sekme: 'blog' | 'kitap'; n: number } | null>(null);
  /** Neyin Eksik sayfası açılırken açık gelecek başlık */
  const [eksikAcik, setEksikAcik] = useState<string | null>(null);
  /** Telefonda ana sayfa sekmesi; açılışta Bugün */
  const [telSekme, setTelSekme] = useState<TelSekmesi>('bugun');
  /** Telefonda "Diğer" listesi */
  const [digerAcik, setDigerAcik] = useState(false);
  /** "+" ile gelen yeni not sayfası isteği */
  const [yeniNotBekliyor, setYeniNotBekliyor] = useState(false);
  const [bildirimNabzi, setBildirimNabzi] = useState(0);
  /**
   * Google ile girilmiş mi (29 Eylül). Veriler 14 Eylül'e kadar Google
   * hesabının alanına yazıldı; girişsiz açılınca uygulama o kimliği yalnız
   * tarayıcının hafızasından hatırlıyor. Hafıza yoksa ortak alana
   * (kems_public) düşülüyor — veriler orada değil.
   */
  const [girisli, setGirisli] = useState(false);
  const [baglanmaHatasi, setBaglanmaHatasi] = useState<string | null>(null);
  const googleIleBaglan = async () => {
    setBaglanmaHatasi(null);
    try { await signInWithGoogle(); } catch (e: any) {
      setBaglanmaHatasi(e?.code === 'auth/popup-blocked'
        ? 'Tarayıcı açılan pencereyi engelledi; izin verip yeniden dene.'
        : e?.code === 'auth/unauthorized-domain'
          ? 'Bu adres Firebase girişinde izinli değil (yetkili alan adları listesine eklenmeli).'
          : `Bağlanılamadı: ${e?.code || e?.message || 'bilinmeyen'}`);
    }
  };
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHizliNotOpen, setIsHizliNotOpen] = useState(false);
  /** Üst köşedeki logo yüklenemediyse o adres (tekrar denenmez) */
  const [logoHatasi, setLogoHatasi] = useState<string | null>(null);

  // Authentication & Settings observer (Açık erişim modu: Google girişi zorunlu değil)
  useEffect(() => {
    let unsubItems: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const setupWorkspaceForUser = async (activeUid: string, profile?: { displayName?: string | null; email?: string | null; photoURL?: string | null }) => {
      setUser({
        uid: activeUid,
        displayName: profile?.displayName || 'Açık Arşiv',
        email: profile?.email || 'acik@kems.local',
        photoURL: profile?.photoURL || null
      });

      // Clean up previous subscriptions if any
      if (unsubItems) {
        unsubItems();
        unsubItems = null;
      }
      if (unsubSettings) {
        unsubSettings();
        unsubSettings = null;
      }

      /*
       * Örnek veri tohumlama KALDIRILDI (29 Eylül). Boş bir alan açılınca
       * ilk günün örnek kayıtlarıyla (Kamil Efendi, Küçükçetmi Köy Meydanı…)
       * dolduruluyordu; Kemal ortak alana düşünce verileri "kaybolmuş" ve
       * yerine yabancı kayıtlar gelmiş gibi göründü. Boş alan boş kalır.
       */

      try {
        // Doğrudan ilk çekim (snapshot ilk tetiklenene kadar beklemeden anında yükler)
        const directItems = await fetchAllItemsDirect(activeUid);
        if (directItems.length > 0) {
          setItems(directItems);
          setLastSyncTime(new Date());
        }
      } catch (err) {
        console.warn("İlk doğrudan veri çekiminde hata:", err);
      }

      try {
        // Listen to Firestore real-time items updates
        unsubItems = subscribeToAllItemsWithArchived(activeUid, (fetchedItems) => {
          setItems(fetchedItems);
          setLastSyncTime(new Date());
        });

        // Listen to Firestore settings
        unsubSettings = subscribeToSettings(activeUid, (fetchedSettings) => {
          setSettings(fetchedSettings);
        });
      } catch (error) {
        console.error("Firestore abonelikleri baslatilirken hata olustu:", error);
      }
      
      setLoading(false);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setGirisli(!!currentUser);
      if (currentUser) {
        try {
          localStorage.setItem('kems_last_uid', currentUser.uid);
        } catch (_) {}
        await setupWorkspaceForUser(currentUser.uid, {
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL
        });
      } else {
        // Açık erişim modu: Kullanıcı oturum açmamışsa da doğrudan erişim sağlanır
        let storedUid: string | null = null;
        try {
          storedUid = localStorage.getItem('kems_last_uid');
        } catch (_) {}
        const publicUid = storedUid || 'kems_public';
        await setupWorkspaceForUser(publicUid, {
          displayName: 'Açık Erişim',
          email: 'acik@kems.local',
          photoURL: null
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubItems) unsubItems();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Manuel ve periyodik canlı veri çekimi
  const handleRefreshLive = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const fresh = await fetchAllItemsDirect(user.uid);
      if (fresh && fresh.length > 0) {
        setItems(fresh);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn("Canlı veri çekimi sırasında hata:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  /*
   * Otomatik canlı çekim (34 cevabın 29. maddesi: "saat başı").
   *
   * Önceden 15 saniyedeydi; tek kullanıcılı bir uygulamada bu, saatte 240
   * gereksiz okuma demek. Sekmeye dönünce ve sekme görünür olunca zaten
   * çekiliyor, o yüzden arka plandaki zamanlayıcının sık olmasına gerek yok.
   * Elle "Şimdi Yenile" düğmesi de duruyor.
   */
  const SAAT_BASI = 60 * 60 * 1000;
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      handleRefreshLive();
    }, SAAT_BASI);

    const onFocus = () => {
      handleRefreshLive();
    };

    window.addEventListener('focus', onFocus);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRefreshLive();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, handleRefreshLive]);

  // Theme support
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      // Alt+N or Cmd+J for quick note
      if ((e.altKey && e.key === 'n') || ((e.metaKey || e.ctrlKey) && e.key === 'j')) {
        e.preventDefault();
        setIsHizliNotOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // K (28 Eylül 2026): açılışta oda kopyalarını birleştiren kod kaldırıldı.
  // Kopyaları SİLİYOR, odalara kendiliğinden "Deluxe" tipi ve 203/304'e
  // "bakımda" yazıyordu — ikisi de Kemal'in kararıyla vikiden kalktı.
  // Odalar W1'de arşive kalktı; eski simülasyonun verisi, viki değil.

  const handleToggleTheme = async () => {
    if (!user) return;
    const newTheme = settings.theme === 'arşiv' ? 'dark' : 'arşiv';
    await saveSettings(user.uid, { theme: newTheme });
  };

  // Firestore DB operations wrapper passed down
  const handleAddItem = async (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => {
    if (!user) return;
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    let id = itemData.id || `${itemData.type}_${Date.now()}_${randomSuffix}`;
    // Sanitize id to be safe for Firestore rules regex
    id = id
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-zA-Z0-9_\-]/g, '');

    const newItem: Item = {
      ...itemData,
      id,
      userId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    // İyimser anlık güncelleme: Sayılar ve liste sunucu turunu beklemeden anında yenilenir
    setItems(prev => [newItem, ...prev.filter(i => i.id !== id)]);
    setLastSyncTime(new Date());
    await saveItem(user.uid, newItem);
  };

  const handleUpdateItem = async (updatedItem: Item) => {
    if (!user) return;
    // İyimser anlık güncelleme
    setItems(prev => prev.map(i => i.id === updatedItem.id ? { ...updatedItem, updatedAt: Date.now() } : i));
    setLastSyncTime(new Date());
    await saveItem(user.uid, updatedItem);
  };

  /**
   * "Sil" düğmelerinin hepsi buraya gelir. 29 Eylül, kural değişti (Kemal:
   * "arka tarafta kullanmadığımız ne varsa sil, arşiv işi beni
   * sinirlendirdi"): kayıt gerçekten silinir, arşive kalkmaz. Diğer
   * kayıtlardaki bağlar da temizlenir.
   */
  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
    await deleteItemDoc(user.uid, itemId);
    for (const k of items) {
      if (k.id !== itemId && (k.links || []).includes(itemId)) {
        await handleUpdateItem({ ...k, links: k.links.filter(l => l !== itemId) });
      }
    }
  };

  /*
   * Sayfa her açıldığında kayıtlara kendiliğinden yazan eski kodlar SİLİNDİ
   * (29 Eylül): "yeni varlık" arşivleme, odaları otele bağlama, otel
   * kopyalarını birleştirme, olay temizliği, bağsız maddelere otomatik
   * ilişki önerisi. Kemal: "Google yapay zekâsı onları bulup bulup geri
   * getiriyor, bunu sevmiyorum." Artık kayıtlar yalnız Kemal bir düğmeye
   * bastığında değişir.
   */

  /**
   * Kems Company kaydı yoksa kurulur (boş notla, uydurma metin yok).
   *
   * 29 Eylül: Bu etki eskiden her açılışta marka kitine yapay zekânın
   * ürettiği bir SVG logo yazıyordu; logo tarayıcıda açılmıyordu ve üst
   * köşede, vikide kırık görünüyordu (Kemal: "wikide hâlâ kulüp ve marka
   * logoları görünmüyor"). Logo artık yazılmıyor; görsel `maddeGorseli`
   * sırasıyla bulunuyor (yüklenen → galeri → Canva yedeği).
   */
  useEffect(() => {
    if (!user || items.length === 0) return;
    const kemsCompanyItem = items.find(b => b.type === 'marka' && (b.id === 'kems_company' || b.title.toLowerCase() === 'kems company'));
    if (!kemsCompanyItem) {
      handleAddItem({
        id: 'kems_company',
        title: 'Kems Company',
        area: 'duzada',
        type: 'marka',
        status: 'Bitti',
        priority: 'yüksek',
        tags: ['marka'],
        links: [],
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {
          brandKit: {
            selectedLogo: '',
            ideaLogos: [],
            colorPalette: ['#0E1C4F', '#F26B6F', '#F3EFE8'],
            exemplaryWorks: [],
            selectedFont: 'Poppins'
          }
        }
      });
    }
  }, [user, items]);

  const handleSelectResult = (item: Item) => {
    setActiveItemId(item.id);
    // Switch to correct tab based on item type
    if (item.type === 'drop' || item.type === 'merch_urun') {
      setActiveTab('merch');
    } else if (item.type === 'marka') {
      setActiveTab('markalar');
    } else if (item.type === 'blog_post' || item.type === 'kitap_proje' || item.type === 'kitap_bolum') {
      setActiveTab('yazi');
    } else if (item.type === 'fikir') {
      /*
       * Brainstorm sekmesi kalktı (28 Eylül kararı). Fikirler köşedeki
       * hızlı fikir panosunda yaşıyor; ayrı bir sayfaya gitmek yok.
       * Fikre tıklanınca Düzada'ya düşüyor, orası evrenin ana ekranı.
       */
      setActiveTab('duzada');
    } else {
      setActiveTab('duzada');
    }
  };

  /**
   * Sayılabilir varlıklar: arşivlenmemiş, öneri olmayan, ve gerçekten bir
   * "varlık" olanlar. Harita ayarı, kanal kaydı ve günlük not varlık değil —
   * bunlar uygulamanın kendi iç kayıtları.
   */
  const SAYILMAZ_TIP = new Set(['map_settings', 'channel', 'aday']);
  const varlikSayisi = useMemo(
    () => items.filter(
      i => !i.archived && !i.isProposal
        && !SAYILMAZ_TIP.has(i.type)
        && !i.tags?.includes('gunluk-not')
    ).length,
    [items]
  );
  const oneriSayisi = useMemo(
    () => items.filter(i => !i.archived && i.isProposal).length,
    [items]
  );

  /**
   * Yapay zekâ ucunun durumu. 20 ayrı çağrı yeri hatayı sessizce yutuyordu;
   * gözcü onları izliyor, sonucu tek bir şeritte gösteriyoruz.
   */
  const [aiHal, setAiHal] = useState<AiDurum>(() => aiDurumu());
  useEffect(() => {
    aiGozcusunuKur();
    return aiDurumunuDinle(setAiHal);
  }, []);

  /** Menüdeki kırmızı noktalar ve zil (Paket 4) */
  const bildirimler = useBildirimler(items, bildirimNabzi);
  const bildirimVar = (t: Bildirim['tur']) => bildirimler.some(b => b.tur === t);
  const bekleyenDugmeListesi = bildirimler.find(b => b.tur === 'dugme')?.ayrinti.split(' · ') ?? [];

  /**
   * Tek gezinme kapısı (Paket 4): menü, "Diğer" listesi, yüzde şeridi,
   * zil hepsi buradan geçer.
   */
  const git = (hedef: string, ayrinti?: string | null) => {
    setDigerAcik(false);
    setActiveItemId(null);
    const n = Date.now();
    switch (hedef) {
      case 'harita': setDuzadaIstek({ sekme: 'harita', n }); setActiveTab('duzada'); break;
      case 'kurucu': setDuzadaIstek({ sekme: 'kurucu', n }); setActiveTab('duzada'); break;
      case 'viki': case 'kunye': case 'duzada': setDuzadaIstek({ sekme: 'wiki', n }); setActiveTab('duzada'); break;
      case 'kitap': setYaziIstek({ sekme: 'kitap', n }); setActiveTab('yazi'); break;
      case 'blog': setYaziIstek({ sekme: 'blog', n }); setActiveTab('yazi'); break;
      case 'bosluk': case 'bosluklar':
        setActiveTab('durum');
        window.setTimeout(() => document.getElementById('bos-ozet')?.scrollIntoView({ behavior: 'smooth' }), 150);
        return;
      case 'eksikler': setEksikAcik(ayrinti ?? null); setActiveTab('eksikler'); break;
      default: setActiveTab(hedef as Sayfa);
    }
    try { window.scrollTo({ top: 0 }); } catch { /* yok */ }
  };

  const maddeyiAc = (item: Item) => { handleSelectResult(item); };

  const bildirimSec = (b: Bildirim, madde?: Item) => {
    if (madde) { maddeyiAc(madde); return; }
    if (b.tur === 'dugme') git('eksikler');
    else if (b.tur === 'kanon') { if (b.maddeler?.[0]) maddeyiAc(b.maddeler[0]); }
    else { setTelSekme('bugun'); git('komuta'); }
  };

  const handleSelectArea = (area: AreaType, itemId?: string) => {
    // 'blog' ve 'kitap' artık tek sekme: Yazı İşleri
    // Boşluklar artık Durum sayfasının içinde (29 Eylül)
    if (area === 'bosluklar') { git('bosluklar'); return; }
    const sekme = area === 'blog' || area === 'kitap' ? 'yazi' : area;
    setActiveTab(sekme as any);
    if (itemId) {
      setActiveItemId(itemId);
    } else {
      setActiveItemId(null);
    }
  };

  const handleAcceptProposal = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      if (itemId.endsWith('_proposal')) {
        const originalId = itemId.slice(0, -9);
        const originalItem = items.find(i => i.id === originalId);
        if (originalItem) {
          // Merge proposal fields into the original item
          await handleUpdateItem({
            ...originalItem,
            title: item.title.replace(/\s*\(Öneri\)/i, ''),
            notes: item.notes,
            tags: item.tags.filter(t => t !== 'öneri'),
            metadata: item.metadata,
            links: item.links,
            priority: item.priority,
            status: item.type === 'drop' ? 'Konsept' : 'Bitti'
          });
          // Delete the proposal item
          await handleDeleteItem(itemId);
          return;
        }
      }
      
      // Standard accept logic
      await handleUpdateItem({
        ...item,
        title: item.title.replace(/\s*\(Öneri\)/i, ''),
        isProposal: false,
        status: item.type === 'drop' ? 'Konsept' : 'Bitti'
      });
    }
  };

  const handleRejectProposal = async (itemId: string) => {
    await handleDeleteItem(itemId);
  };

  const handleSaveHizliNot = async (title: string, notes: string, area: AreaType, type: ItemType) => {
    await handleAddItem({
      title,
      notes,
      area,
      type,
      status: type === 'drop' || type === 'merch_urun' ? 'Konsept' : type === 'blog_post' ? 'Taslak' : type === 'kitap_bolum' ? 'taslak' : 'Fikir',
      priority: 'orta',
      tags: ['hızlı-not'],
      links: [],
      images: [],
      isProposal: false,
      archived: false,
      metadata: {}
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#E4DCCD] flex items-center justify-center font-mono text-xs text-[#6A5E4C]">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-[#F26B6F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Kems Komuta Merkezi Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // 2. MAIN LOGGED-IN VIEW
  const kemsCompanyItem = items.find(b => b.type === 'marka' && (b.id === 'kems_company' || b.title.toLowerCase() === 'kems company'));
  const kemsLogo = kemsCompanyItem ? maddeGorseli(kemsCompanyItem, items) : undefined;
  // Logo adresi yüklenemezse kırık resim yerine yazı logosu görünsün
  const hasKemsLogo = !!(kemsLogo && (kemsLogo.startsWith('http') || kemsLogo.startsWith('data:') || kemsLogo.startsWith('/'))) && logoHatasi !== kemsLogo;

  /*
   * Menü (Paket 4, Kemal 29 Eylül): masaüstünde solda ince simge çubuğu,
   * telefonda altta beş düğme — Ana sayfa · Viki · Harita · Merch · Diğer.
   * "Diğer" işe göre gruplu: Evren · Marka · Araçlar.
   */
  const RAY: Array<{ id: Sayfa; ad: string; simge: React.ElementType; nokta?: boolean }> = [
    { id: 'komuta', ad: 'Ana sayfa', simge: Home, nokta: bildirimVar('aday') || bildirimVar('soru') },
    { id: 'duzada', ad: 'Düzada · viki ve harita', simge: Compass, nokta: bildirimVar('kanon') },
    { id: 'markalar', ad: 'Markalar', simge: Shield },
    { id: 'merch', ad: 'Merch', simge: ShoppingBag },
    { id: 'yazi', ad: 'Yazı · kitap ve blog', simge: PenTool },
    { id: 'oyun', ad: 'Oyun', simge: Gamepad2 },
    { id: 'galeri', ad: 'Galeri', simge: ImageIcon },
    { id: 'eksikler', ad: 'Neyin Eksik', simge: ListChecks, nokta: bildirimVar('dugme') },
    { id: 'durum', ad: 'Durum · yüzdeler ve boşluklar', simge: Percent }
  ];

  const DIGER: Array<{ grup: string; satirlar: Array<{ hedef: string; ad: string; simge: React.ElementType; nokta?: boolean }> }> = [
    { grup: 'Evren', satirlar: [
      { hedef: 'kitap', ad: 'Kitap', simge: BookOpen },
      { hedef: 'blog', ad: 'Blog', simge: PenTool },
      { hedef: 'oyun', ad: 'Oyun', simge: Gamepad2 }
    ] },
    { grup: 'Marka', satirlar: [
      { hedef: 'markalar', ad: 'Markalar', simge: Shield },
      { hedef: 'galeri', ad: 'Galeri', simge: ImageIcon }
    ] },
    { grup: 'Araçlar', satirlar: [
      { hedef: 'kurucu', ad: 'Kurucu', simge: Hammer },
      { hedef: 'eksikler', ad: 'Neyin Eksik', simge: ListChecks, nokta: bildirimVar('dugme') },
      { hedef: 'durum', ad: 'Durum ve boşluklar', simge: Percent }
    ] }
  ];

  const haritada = activeTab === 'duzada' && duzadaIstek?.sekme === 'harita';
  const ALT: Array<{ id: string; ad: string; simge: React.ElementType; aktif: boolean; nokta?: boolean }> = [
    { id: 'komuta', ad: 'Ana sayfa', simge: Home, aktif: activeTab === 'komuta', nokta: bildirimVar('aday') || bildirimVar('soru') },
    { id: 'viki', ad: 'Viki', simge: Compass, aktif: activeTab === 'duzada' && !haritada, nokta: bildirimVar('kanon') },
    { id: 'harita', ad: 'Harita', simge: MapIcon, aktif: haritada },
    { id: 'merch', ad: 'Merch', simge: ShoppingBag, aktif: activeTab === 'merch' },
    { id: 'diger', ad: 'Diğer', simge: Menu, aktif: digerAcik || !['komuta', 'duzada', 'merch'].includes(activeTab), nokta: bildirimVar('dugme') }
  ];

  const SAYFA_ADI: Record<Sayfa, string> = {
    komuta: 'Ana sayfa', duzada: 'Düzada', markalar: 'Markalar', merch: 'Merch', yazi: 'Yazı',
    oyun: 'Oyun', galeri: 'Galeri', eksikler: 'Neyin Eksik', durum: 'Durum'
  };

  const logo = hasKemsLogo ? (
    <img
      src={kemsLogo}
      alt="Kems Company"
      className="w-10 h-10 rounded-lg object-contain bg-[#F3EFE8] shrink-0"
      referrerPolicy="no-referrer"
      onError={() => setLogoHatasi(kemsLogo || null)}
    />
  ) : (
    <span className="w-10 h-10 rounded-lg bg-[#F3EFE8] flex flex-col items-center justify-center shrink-0 leading-none">
      <span className="text-[#0E1C4F] font-extrabold text-[10px] tracking-tighter">KEMS</span>
      <span className="mt-0.5 px-0.5 bg-[#F26B6F] text-white font-bold text-[4.5px] tracking-wider">COMPANY</span>
    </span>
  );

  const temaSimgesi = settings.theme === 'dark' ? Sun : Moon;
  const TemaSimgesi = temaSimgesi;

  return (
    <div className="min-h-screen bg-[#E4DCCD] dark:bg-[#0B132B] text-[#0E1C4F] dark:text-[#F3EFE8] font-sans transition-colors duration-200 paper-grain selection:bg-[#F26B6F] selection:text-white">

      {/* MASAÜSTÜ: ince simge çubuğu */}
      <nav className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-16 flex-col items-center gap-1 py-3 bg-[#0E1C4F] dark:bg-[#081029]">
        <button type="button" onClick={() => git('komuta')} title="Ana sayfa" className="mb-2 cursor-pointer">{logo}</button>
        {RAY.map(r => {
          const Simge = r.simge;
          const aktif = activeTab === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => git(r.id)}
              title={r.ad}
              aria-label={r.ad}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${aktif ? 'bg-[#F26B6F] text-white' : 'text-[#A6B0C9] hover:text-white hover:bg-white/10'}`}
            >
              <Simge className="w-[18px] h-[18px]" />
              {r.nokta && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F26B6F] ring-2 ring-[#0E1C4F] dark:ring-[#081029]" />}
            </button>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-1">
          <button type="button" onClick={() => setIsSearchOpen(true)} title="Ara (⌘K)" className="w-11 h-11 rounded-xl flex items-center justify-center text-[#A6B0C9] hover:text-white hover:bg-white/10 cursor-pointer">
            <Search className="w-[18px] h-[18px]" />
          </button>
          <Zil bildirimler={bildirimler} onSec={bildirimSec} yon="sag" />
          {user && (
            <Yedekleme
              items={items}
              settings={settings}
              onKayit={async kayit => { await saveItem(user.uid, kayit); }}
              tetikSinifi="relative w-11 h-11 rounded-xl flex items-center justify-center text-[#A6B0C9] hover:text-white hover:bg-white/10 cursor-pointer"
            />
          )}
          <button
            type="button"
            onClick={girisli ? undefined : googleIleBaglan}
            title={girisli ? `Google hesabı: ${user?.email || ''}` : 'Ortak alandasın — Google ile bağlan'}
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center ${girisli ? 'text-[#A6B0C9]' : 'text-[#F26B6F] hover:bg-white/10 cursor-pointer'}`}
          >
            {girisli && user?.photoURL
              ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" />
              : <UserRound className="w-[18px] h-[18px]" />}
          </button>
          <button type="button" onClick={handleToggleTheme} title="Aydınlık / karanlık" className="w-11 h-11 rounded-xl flex items-center justify-center text-[#A6B0C9] hover:text-white hover:bg-white/10 cursor-pointer">
            <TemaSimgesi className="w-[18px] h-[18px]" />
          </button>
        </div>
      </nav>

      <div className="lg:pl-16">
        {/* TELEFON: ana sayfa dışında ince üst çubuk */}
        {activeTab !== 'komuta' && (
          <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-[#F3EFE8]/95 dark:bg-[#13204A]/95 backdrop-blur-xs border-b border-[#CFC5B4] dark:border-[#2C3C72]">
            <button type="button" onClick={() => git('komuta')} className="cursor-pointer">{logo}</button>
            <span className="flex-1 min-w-0 truncate font-bold text-[15px]">{SAYFA_ADI[activeTab]}</span>
            <button type="button" onClick={() => setIsSearchOpen(true)} title="Ara" className="w-11 h-11 rounded-full flex items-center justify-center text-[#6A5E4C] dark:text-[#A6B0C9] cursor-pointer">
              <Search className="w-[18px] h-[18px]" />
            </button>
            <Zil bildirimler={bildirimler} onSec={bildirimSec} />
          </header>
        )}

        <div className="max-w-[1500px] mx-auto w-full px-4 lg:px-6 pt-4 lg:pt-6 pb-28 lg:pb-12 flex flex-col lg:flex-row gap-3 lg:gap-6">
          {/*
            Sayfanın kendi rayı (SayfaRayi portal ile buraya basar). Masaüstünde
            menünün yanında dar bir sütun, telefonda sayfanın üstünde yana
            kayan bir şerit. Sayfanın rayı yoksa yer kaplamaz.
          */}
          <div id={SAYFA_RAYI_YUVASI} className="lg:w-48 lg:shrink-0 lg:sticky lg:top-6 lg:self-start empty:hidden min-w-0" />

          <main className="flex-1 min-w-0">
            {/* Ortak alandaysa: veriler Google hesabının alanında (29 Eylül) */}
            {!girisli && (
              <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-[#0E1C4F]/25 dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A]">
                <UserRound className="w-4 h-4 shrink-0 text-[#D6484C] dark:text-[#F26B6F]" />
                <p className="flex-1 min-w-[220px] text-[12px] leading-snug text-[#0E1C4F] dark:text-[#F3EFE8]">
                  <b>Ortak alandasın.</b> Bu tarayıcı seni tanımıyor; kayıtların Google hesabının alanında duruyor. Bağlanınca hepsi geri gelir.
                  {baglanmaHatasi && <span className="block mt-1 text-[#B23A40] dark:text-[#F26B6F]">{baglanmaHatasi}</span>}
                </p>
                <button type="button" onClick={googleIleBaglan} className="shrink-0 px-3.5 py-2 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[12px] font-semibold hover:opacity-90 cursor-pointer">
                  Google ile bağlan
                </button>
              </div>
            )}

            {/* AI ucu ulaşılamıyorsa tek yerden söyle — düğmeler sessiz kalmasın */}
            {(aiHal.hal === 'sunucu-yok' || aiHal.hal === 'hata') && (
              <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/45 bg-[#F26B6F]/8">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#F26B6F]" />
                <p className="flex-1 text-[12px] leading-snug text-[#B23A40] dark:text-[#F26B6F]">{aiHal.mesaj}</p>
                <button onClick={aiUyarisiniKapat} className="shrink-0 text-[#B23A40] dark:text-[#F26B6F] hover:opacity-70 cursor-pointer text-xs font-mono">kapat</button>
              </div>
            )}

            {activeTab === 'komuta' && (
              <Anasayfa
                items={items}
                bugunDugmeler={bekleyenDugmeListesi}
                onGit={git}
                onMaddeyiAc={maddeyiAc}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onAcceptProposal={handleAcceptProposal}
                onOpenSearch={() => setIsSearchOpen(true)}
                onBildirimYenile={() => setBildirimNabzi(n => n + 1)}
                zil={<Zil bildirimler={bildirimler} onSec={bildirimSec} />}
                yeniNotBekliyor={yeniNotBekliyor}
                onYeniNot={() => { setTelSekme('notlar'); setYeniNotBekliyor(true); }}
                onYeniNotAcildi={() => setYeniNotBekliyor(false)}
                sekme={telSekme}
                onSekme={setTelSekme}
              />
            )}

            {activeTab === 'durum' && (
              <Durum items={items} onSec={h => git(h)} onUpdateItem={handleUpdateItem} />
            )}

            {activeTab === 'eksikler' && (
              <Eksikler
                items={items}
                onSelectArea={handleSelectArea}
                onUpdateItem={handleUpdateItem}
                onAddItem={handleAddItem}
                baslangicAcik={eksikAcik}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {activeTab === 'markalar' && (
              <Markalar
                items={items}
                onSelectItem={setActiveItemId}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                onSelectArea={handleSelectArea}
              />
            )}

            {activeTab === 'duzada' && (
              <Duzada
                items={items}
                activeItemId={activeItemId}
                onSelectItem={setActiveItemId}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                istek={duzadaIstek}
              />
            )}

            {activeTab === 'merch' && (
              <Merch
                items={items}
                activeItemId={activeItemId}
                onSelectItem={setActiveItemId}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                onSelectArea={handleSelectArea}
              />
            )}

            {activeTab === 'yazi' && (
              <YaziAtolyesi
                items={items}
                activeItemId={activeItemId}
                onSelectItem={setActiveItemId}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                istek={yaziIstek}
              />
            )}

            {activeTab === 'oyun' && (
              <OyunEkrani
                items={items}
                activeItemId={activeItemId}
                onSelectItem={setActiveItemId}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                onNavigateToTab={(tab, itemId) => {
                  setActiveTab(tab as Sayfa);
                  setActiveItemId(itemId || null);
                }}
                onSelectArea={(area, itemId) => {
                  setActiveTab(area as Sayfa);
                  setActiveItemId(itemId || null);
                }}
              />
            )}

            {activeTab === 'galeri' && (
              <Galeri
                items={items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onSelectItem={(id) => {
                  const it = items.find(i => i.id === id);
                  if (it) handleSelectResult(it);
                }}
              />
            )}

          </main>
        </div>
      </div>

      {/* TELEFON: alt menü */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-16 pb-[env(safe-area-inset-bottom)] flex items-stretch justify-around px-1 bg-[#0E1C4F] dark:bg-[#081029]">
        {ALT.map(a => {
          const Simge = a.simge;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => (a.id === 'diger' ? setDigerAcik(d => !d) : git(a.id))}
              className={`relative flex-1 my-1.5 mx-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] cursor-pointer ${a.aktif ? 'bg-[#F26B6F] text-white' : 'text-[#A6B0C9]'}`}
            >
              <Simge className="w-5 h-5" />
              {a.ad}
              {a.nokta && !a.aktif && <span className="absolute top-1.5 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-[#F26B6F]" />}
            </button>
          );
        })}
      </nav>

      {/* TELEFON: "Diğer" listesi — işe göre gruplu */}
      {digerAcik && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setDigerAcik(false)}>
          <div
            className="absolute inset-x-0 bottom-16 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-[#FAF8F5] dark:bg-[#13204A] p-4 pb-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {DIGER.map(g => (
              <div key={g.grup}>
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">{g.grup}</div>
                <div className="grid grid-cols-3 gap-2">
                  {g.satirlar.map(r => {
                    const Simge = r.simge;
                    return (
                      <button
                        key={r.hedef}
                        type="button"
                        onClick={() => git(r.hedef)}
                        className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] text-[12px] text-[#0E1C4F] dark:text-[#F3EFE8] cursor-pointer active:bg-[#F3EFE8] dark:active:bg-[#17345A]"
                      >
                        <Simge className="w-5 h-5 text-[#D6484C] dark:text-[#F26B6F]" />
                        {r.ad}
                        {r.nokta && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F26B6F]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleToggleTheme} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] text-[12px] text-[#0E1C4F] dark:text-[#F3EFE8] cursor-pointer">
                <TemaSimgesi className="w-4 h-4" /> {settings.theme === 'dark' ? 'Aydınlık' : 'Karanlık'}
              </button>
              {user && (
                <Yedekleme
                  items={items}
                  settings={settings}
                  onKayit={async kayit => { await saveItem(user.uid, kayit); }}
                  etiket="Yedek"
                  tetikSinifi="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] text-[12px] text-[#0E1C4F] dark:text-[#F3EFE8] cursor-pointer"
                />
              )}
            </div>
            <p className="text-center text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9]">
              {varlikSayisi} kayıtlı varlık · {girisli ? `Google: ${user?.email || ''}` : 'ortak alan'}
            </p>
          </div>
        </div>
      )}

      {/* Her sayfanın köşesinde duran hızlı fikir kutusu */}
      <HizliFikir
        items={items}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
      />

      <AramaModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={items}
        onSelectResult={handleSelectResult}
      />

      <HizliNotModal
        isOpen={isHizliNotOpen}
        onClose={() => setIsHizliNotOpen(false)}
        onSave={handleSaveHizliNot}
      />

    </div>
  );
}
