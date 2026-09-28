import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  auth, 
  seedUserData, 
  fetchAllItemsDirect,
  subscribeToAllItemsWithArchived, 
  subscribeToSettings, 
  saveSettings, 
  saveItem, 
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Item, UserSettings, AreaType, ItemType } from './types';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight, 
  ShoppingBag, 
  BookOpen, 
  Sparkles, 
  Search, 
  Lightbulb, 
  Sunset, 
  LayoutDashboard, 
  Compass, 
  PenTool, 
  PenLine, 
  Image as ImageIcon, 
  BookMarked, 
  Palette,
  Shield,
  Menu,
  Gamepad2
} from 'lucide-react';
import KomutaMerkezi from './components/KomutaMerkezi';
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
import { isEntityUnlinked, generateAiProposalsForUnlinked } from './utils/relations';

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
  const [activeTab, setActiveTab] = useState<'komuta' | 'markalar' | 'duzada' | 'merch' | 'yazi' | 'oyun'>('komuta');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHizliNotOpen, setIsHizliNotOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /**
   * Ray daraltma (masaüstü). Kemal: "ray açılır kapanır olmalı, sayfanın
   * rayı onun altında olmalı." Daraltılınca ray simge şeridine iner,
   * ekranın kalanı çalışma alanına kalır. Tercih hatırlanır.
   */
  const [rayDar, setRayDar] = useState<boolean>(() => {
    try { return localStorage.getItem('kems_ray_dar') === '1'; } catch { return false; }
  });
  const rayiDegistir = () => {
    setRayDar(d => {
      const y = !d;
      try { localStorage.setItem('kems_ray_dar', y ? '1' : '0'); } catch { /* yok */ }
      return y;
    });
  };

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

      try {
        // Seed default items first if they don't exist
        await seedUserData(activeUid);
      } catch (error) {
        console.error("Default veri tohumlama sirasinda hata olustu, devam ediliyor:", error);
      }

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
   * K (28 Eylül 2026): otomatik temizlikler kayıt silmez, arşive kaldırır.
   * Etiket, neyin kendiliğinden kalktığını arşivde bulmayı sağlar.
   */
  const otomatikArsivle = (item: Item) =>
    handleUpdateItem({
      ...item,
      archived: true,
      tags: (item.tags || []).includes('otomatik-arsiv')
        ? item.tags
        : [...(item.tags || []), 'otomatik-arsiv']
    });

  /**
   * "Sil" düğmelerinin hepsi buraya gelir. K (28 Eylül 2026, Kemal'in
   * kararı): bu projede hiçbir kayıt silinmez — kayıt arşive kalkar, arşivden
   * geri gelir. Diğer kayıtlardaki bağlar da korunur; geri gelince yerinde.
   */
  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;

    const hedefler = new Set<string>([itemId]);
    const targetItem = items.find(i => i.id === itemId);

    if (targetItem && targetItem.area === 'merch' && targetItem.type === 'drop') {
      // Drop arşive kalkınca altındaki ürünler de kalkar
      items
        .filter(p => p.area === 'merch' && p.type === 'merch_urun' && p.metadata?.dropId === itemId)
        .forEach(p => hedefler.add(p.id));
    }

    for (const id of hedefler) {
      const kayit = items.find(i => i.id === id);
      if (kayit && !kayit.archived) {
        await handleUpdateItem({ ...kayit, archived: true, updatedAt: Date.now() });
      }
    }
  };

  // Auto-delete any "yeni varlık" (case-insensitive) items as requested by user
  useEffect(() => {
    if (!user || items.length === 0) return;
    // K: silmek yerine arşive kaldırır — bu projede hiçbir kayıt silinmez
    const targets = items.filter(item => !item.archived && item.title.trim().toLowerCase() === 'yeni varlık');
    if (targets.length > 0) {
      targets.forEach(item => {
        otomatikArsivle(item).catch(err => console.error("'yeni varlık' arşivlenemedi:", err));
      });
    }
  }, [items, user]);

  // Retype existing rooms to 'oda' and nest under 'kemskoy_hotel'
  useEffect(() => {
    if (!user || items.length === 0) return;
    const roomsToRetype = items.filter(item => 
      item.area === 'duzada' && 
      item.type === 'yer' && 
      (item.tags?.includes('oda') || item.id.startsWith('kemskoy_room_') || item.title.startsWith('Oda '))
    );
    if (roomsToRetype.length > 0) {
      console.log(`Retyping ${roomsToRetype.length} room items from 'yer' to 'oda'...`);
      roomsToRetype.forEach(room => {
        const updatedMetadata = { 
          ...room.metadata, 
          placeId: 'kemskoy_hotel',
          region: room.metadata?.region || 'eski liman / kemskoy'
        };
        const updatedLinks = room.links?.includes('kemskoy_hotel') ? room.links : [...(room.links || []), 'kemskoy_hotel'];
        handleUpdateItem({
          ...room,
          type: 'oda',
          links: updatedLinks,
          metadata: updatedMetadata
        }).catch(err => console.error("Error migrating room item type:", err));
      });
    }
  }, [items, user]);

  // Merge and clean up duplicate "The Imperial" hotel items
  useEffect(() => {
    if (!user || items.length === 0) return;
    const duplicates = items.filter(item => 
      item.area === 'duzada' && 
      !item.archived &&
      item.id !== 'kemskoy_hotel' && 
      (
        item.title.toLowerCase() === 'the imperial' || 
        item.title.toLowerCase() === 'imperial' || 
        item.title.toLowerCase() === 'imperial otel' || 
        item.title.toLowerCase() === 'the imperial hotel' ||
        item.title.toLowerCase() === 'the imperial kemskoy' ||
        item.title.toLowerCase() === 'the imperial kemsköy'
      )
    );

    if (duplicates.length > 0) {
      console.log(`Auto-merging ${duplicates.length} duplicate 'The Imperial' items into canonical 'kemskoy_hotel'...`);
      const canonicalHotel = items.find(i => i.id === 'kemskoy_hotel');
      if (canonicalHotel) {
        let mergedLinks = new Set<string>(canonicalHotel.links || []);
        let mergedTags = new Set<string>(canonicalHotel.tags || []);
        let mergedNotes = canonicalHotel.notes || '';

        duplicates.forEach(dup => {
          if (dup.links) dup.links.forEach(l => mergedLinks.add(l));
          if (dup.tags) dup.tags.forEach(t => mergedTags.add(t));
          if (dup.notes && !mergedNotes.includes(dup.notes)) {
            mergedNotes += ` | ${dup.notes}`;
          }
        });

        const updatedHotel = {
          ...canonicalHotel,
          links: Array.from(mergedLinks),
          tags: Array.from(mergedTags),
          notes: mergedNotes
        };

        // K: kopyalar silinmez, arşive kalkar
        handleUpdateItem(updatedHotel).then(() => {
          duplicates.forEach(dup => {
            otomatikArsivle(dup).catch(err => console.error("Otel kopyası arşivlenemedi:", err));
          });
        }).catch(err => console.error("Error updating canonical hotel:", err));
      }
    }
  }, [items, user]);

  // K (28 Eylül 2026, Kemal'in kararı): 76 karakteri öneri olarak içe
  // aktaran eski kod kapatıldı. Yalnızca tarayıcı hafızasıyla korunuyordu;
  // yeni bir tarayıcıda yeniden çalışıp W1'de arşive kalkan kişileri öneri
  // olarak geri açabilirdi. Veri dosyası (charactersImportData.ts) duruyor.

  // Clean up current events from Düzada directory (Sürek Şenliği and imported game actions/mechanics)
  useEffect(() => {
    if (!user || items.length === 0) return;
    const currentOlaylar = items.filter(item => 
      item.area === 'duzada' && 
      !item.archived &&
      item.type === 'olay' && 
      (item.id.includes('surek_senligi') || item.id.startsWith('kemskoy_mech') || item.tags.includes('mekanik') || item.tags.includes('kemskoy-oyun-mekanigi'))
    );
    if (currentOlaylar.length > 0) {
      // K: silmek yerine arşive kaldırır
      currentOlaylar.forEach(item => {
        otomatikArsivle(item).catch(err => console.error("Olay kaydı arşivlenemedi:", err));
      });
    }
  }, [items, user]);

  // Auto-generate AI relation proposals for unlinked entities
  useEffect(() => {
    if (!user || items.length === 0) return;
    
    // Check if we have unlinked items to process
    const unlinkedItems = items.filter(item => isEntityUnlinked(item, items));
    if (unlinkedItems.length === 0) return;

    // Generate proposals for unlinked items
    const proposalsGrouped = generateAiProposalsForUnlinked(items);
    
    proposalsGrouped.forEach(async ({ itemId, proposals }) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      // Only seed proposals if they haven't been seeded yet and don't already have any relations
      const currentRelations = item.metadata?.relations || [];
      const hasAnyProposed = currentRelations.some((r: any) => r.isProposal);
      const hasAnyReal = currentRelations.some((r: any) => !r.isProposal);
      const proposalsSeeded = item.metadata?.proposalsSeeded;
      
      if (!proposalsSeeded && !hasAnyProposed && !hasAnyReal) {
        const updatedItem = {
          ...item,
          metadata: {
            ...item.metadata,
            relations: proposals,
            proposalsSeeded: true
          }
        };
        console.log(`Seeding AI relation proposals for ${item.title}...`, proposals);
        await handleUpdateItem(updatedItem);
      }
    });
  }, [user, items]);

  // Auto-verify Kems Company brand details and logo
  useEffect(() => {
    if (!user || items.length === 0) return;
    
    const kemsCompanyItem = items.find(b => b.type === 'marka' && (b.id === 'kems_company' || b.title.toLowerCase() === 'kems company'));
    const targetLogo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA1MTIgNTEyJyB3aWR0aD0nNTEyJyBoZWlnaHQ9JzUxMic+CiAgPGRlZnM+CiAgICA8ZmlsdGVyIGlkPSdwYXBlci10ZXh0dXJlJyB4PScwJyB5PScwJyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJz4KICAgICAgPGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuMDUnIG51bU9jdGF2ZXM9JzQnIHJlc3VsdD0nbm9pc2UnIC8+CiAgICAgIDxmZUNvbG9yTWF0cml4IHR5cGU9J21hdHJpeCcgdmFsdWVzPScwIDAgMCAwIDAgICAwIDAgMCAwIDAgICAwIDAgMCAwIDAgIDAgMCAwIDAuMDcgMCcgLz4KICAgICAgPGZlQ29tcG9zaXRlIG9wZXJhdG9yPSdpbicgaW4yPSdTb3VyY2VHcmFwaGljJyByZXN1bHQ9J21vbm9Ob2lzZScvPgogICAgICA8ZmVCbGVuZCBtb2RlPSdtdWx0aXBseScgaW49J1NvdXJjZUdyYXBoaWMnIGluMj0nbW9ub05vaXNlJy8+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9JzUxMicgaGVpZ2h0PSc1MTInIHJ4PScyNCcgZmlsbD0nI0Y0RjFFQScgLz4KICA8ZyBmaWx0ZXI9J3VybCgjcGFwZXItdGV4dHVyZSknPgogICAgPHJlY3QgeD0nMTYnIHk9JzE2JyB3aWR0aD0nNDgwJyBoZWlnaHQ9JzQ4MCcgcng9JzE2JyBmaWxsPSdub25lJyBzdHJva2U9JyMwRDFGM0MnIHN0cm9rZS13aWR0aD0nMTYnIC8+CiAgICA8cmVjdCB4PScyNCcgeT0nMjQnIHdpZHRoPSc0NjQnIGhlaWdodD0nNDY0JyByeD0nMTAnIGZpbGw9JyNGNEYxRUEnIC8+CiAgICA8cGF0aCBkPSdNIDI0LDI4OCBMIDQ4OCwyODggTCA0ODgsNDcyIEMgNDg4LDQ3NiA0ODQsNDgwIDQ4MCw0ODAgTCAzMiw0ODAgQyAyOCw0ODAgMjQsNDc2IDI0LDQ3MiBaJyBmaWxsPScjQzUzQTMxJyBzdHJva2U9JyMwRDFGM0MnIHN0cm9rZS13aWR0aD0nOCcgLz4KICAgIDxsaW5lIHgxPScyNCcgeTE9JzI4OCcgeDI9JzQ4OCcgeTI9JzI4OCcgc3Ryb2tlPScjMEQxRjNDJyBzdHJva2Utd2lkdGg9JzE0JyAvPgogICAgPHRleHQgeD0nMjU2JyB5PScyMzQnIGZvbnQtZmFtaWx5PSInU3BhY2UgR3JvdGVzaycsICdJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0nOTAwJyBmb250LXNpemU9JzE0MicgZmlsbD0nIzBEMUYzQycgdGV4dC1hbmNob3I9J21pZGRsZScgbGV0dGVyLXNwYWNpbmc9Jy01Jz5LRU1TPC90ZXh0PgogICAgPGNpcmNsZSBjeD0nNDQ2JyBjeT0nMTEyJyByPScxNScgZmlsbD0nbm9uZScgc3Ryb2tlPScjMEQxRjNDJyBzdHJva2Utd2lkdGg9JzQnIC8+CiAgICA8dGV4dCB4PSc0NDYnIHk9JzExNycgZm9udC1mYW1pbHk9JyJTcGFjZSBHcm90ZXNrIiwgIkFyaWFsIiwgc2Fucy1zZXJpZicgZm9udC13ZWlnaHQ9J2JvbGQnIGZvbnQtc2l6ZT0nMTUnIGZpbGw9JyMwRDFGM0MnIHRleHQtYW5jaG9yPSdtaWRkbGUnPlI8/dGV4dD4KICAgIDx0ZXh0IHg9JzI1NicgeT0sNDA4JyBmb250LWZhbWlseT0iJ1NwYWNlIEdyb3Rlc2snLCAnSW1wYWN0JywgJ0FyaWFsIEJsYWNrJywgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9JzgwMCcgZm9udC1zaXplPSc3NCcgZmlsbD0nI0Y0RjFFQScgdGV4dC1hbmNob3I9J21pZGRsZScgbGV0dGVyLXNwYWNpbmc9JzQnPkNPTVBBTlk8/dGV4dD4KICA8L2I+Cjwvc3ZnPg==';
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
        notes: 'Kems Company, Isola ve çevresinde faaliyet gösteren saygın bir ticari holding ve bağımsız markadır.',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {
          brandKit: {
            logoBase64: targetLogo,
            selectedLogo: 'Kems Company Classic Logo',
            ideaLogos: ['KEMS Modern Minimalist'],
            colorPalette: ['#0E1C4F', '#F26B6F', '#FAF8F5'],
            exemplaryWorks: ['Master Şablon Kitap Kapağı'],
            selectedFont: 'Space Grotesk'
          }
        }
      });
    } else {
      const currentLogo = kemsCompanyItem.metadata?.brandKit?.logoBase64;
      const oldLogoBase64Prefix = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSI2NCIgZmlsbD0iI2ZmZmZmZiIvPg==';
      const isOldLogo = !currentLogo || currentLogo.startsWith(oldLogoBase64Prefix) || currentLogo === 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSI2NCIgZmlsbD0iI2ZmZmZmZiIvPjxyZWN0IHg9IjI0IiB5PSIyNCIgd2lkdGg9IjQ2NCIgaGVpZ2h0PSI0NjQiIHJ4PSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMEYxRTM2IiBzdHJva2Utd2lkdGg9IjIwIi8+PHJlY3QgeD0iNDQiIHk9IjQ0IiB3aWR0aD0iNDI0IiBoZWlnaHQ9IjQyNCIgcng9IjIwIiBmaWxsPSIjRkJGOUY2IiBzdHJva2U9IiMwRjFFMzYiIHN0cm9rZS13aWR0aD0iOCIvPjxwYXRoIGQ9Ik0gNDQsMjgwIEwgNDY4LDI4MCBMIDQ2OCw0NjAgQyA0NjgsNDY0IDQ2NCw0NjggNDYwLDQ2OCBMIDUzLDQ2OCBDIDQ4LDQ2MCA0NCw0NjQgNDQsNDYwIFoiIGZpbGw9IiNEMzUwNTciIHN0cm9rZT0iIzBGMUUzNiIgc3Ryb2tlLXdpZHRoPSI4Ii8+PHRleHQgeD0iMDU2IiB5PSIyMjAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0MCIgZmlsbD0iIzBGMUUzNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9Ii00Ij5LRU1TPC90ZXh0PjxjaXJjbGUgY3g9IjQzMCIgY3k9IjEwMCIgcj0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzBGMUUzNiIgc3Ryb2tlLXdpZHRoPSI4Ii8+PHRleHQgeD0iNDMwIiB5PSIxMDUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzBGMUUzNiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UjwvdGV4dD48dGV4dCB4PSIyNTYiIHk9IjM5MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI4MDAiIGZvbnQtc2l6ZT0iNzIiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIyIj5DT01QQU5ZPC90ZXh0Pjwvc3ZnPg==';

      // Upgrade to the new beautiful textured SVG logo if using the old flat one, but preserve custom JPEGs
      if ((isOldLogo || currentLogo !== targetLogo) && isOldLogo) {
        handleUpdateItem({
          ...kemsCompanyItem,
          metadata: {
            ...kemsCompanyItem.metadata,
            brandKit: {
              ...(kemsCompanyItem.metadata?.brandKit || { ideaLogos: [], colorPalette: [], exemplaryWorks: [], selectedFont: '' }),
              logoBase64: targetLogo,
              selectedLogo: 'Kems Company Classic Logo'
            }
          }
        });
      }
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
      setActiveTab('yazi_atolyesi');
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
  const SAYILMAZ_TIP = new Set(['map_settings', 'channel']);
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

  const handleSelectArea = (area: AreaType, itemId?: string) => {
    // 'blog' ve 'kitap' artık tek sekme: Yazı İşleri
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
  const kemsLogo = kemsCompanyItem?.metadata?.brandKit?.logoBase64 || kemsCompanyItem?.metadata?.brandKit?.selectedLogo;
  const hasKemsLogo = !!(kemsLogo && (kemsLogo.startsWith('http') || kemsLogo.startsWith('data:')));

  return (
    <div className="min-h-screen bg-[#E4DCCD] dark:bg-[#0B132B] text-[#0E1C4F] dark:text-[#F3EFE8] flex flex-col font-sans transition-colors duration-200 paper-grain selection:bg-[#F26B6F] selection:text-white">
      
      {/* Heritage Archive Top Header */}
      <header className="border-b-2 border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8]/90 dark:bg-[#13204A]/90 sticky top-0 z-30 backdrop-blur-xs py-3.5 px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <button 
          onClick={() => { setActiveTab('komuta'); setActiveItemId(null); }}
          className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity cursor-pointer focus:outline-hidden"
          title="Komuta Merkezi'ne Dön"
        >
          {/* Kems Company Logo */}
          {hasKemsLogo ? (
            <img 
              src={kemsLogo} 
              alt="Kems Company Logo" 
              className="w-10 h-10 md:w-11 md:h-11 rounded-lg object-cover border-2 border-[#0F1E36] shrink-0 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col border-[2.5px] border-[#0F1E36] rounded-md font-sans overflow-hidden w-[96px] shrink-0 select-none text-center shadow-xs">
              <div className="bg-[#FBF9F6] px-1 py-0.5 relative flex items-center justify-center h-6">
                <span className="text-[#0F1E36] font-extrabold tracking-tighter text-xs uppercase leading-none font-sans">KEMS</span>
                <span className="text-[#0F1E36] text-[5px] font-bold absolute top-0.5 right-0.5 leading-none">®</span>
              </div>
              <div className="bg-[#F26B6F] text-white px-0.5 py-[2px] flex items-center justify-center border-t-[2.5px] border-[#0F1E36] h-[14px]">
                <span className="text-white font-extrabold tracking-[0.08em] text-[5.5px] uppercase leading-none font-sans">COMPANY</span>
              </div>
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="font-sans font-bold text-base text-[#0E1C4F] dark:text-[#F3EFE8] uppercase tracking-tight leading-none">
              Komuta Merkezi
            </h1>
            <span className="text-[9px] font-mono font-semibold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-widest block mt-0.5">
              Creative Brand Desk
            </span>
          </div>
        </button>

        {/* Global Toolbar and Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Quick tools */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between w-48 sm:w-64 md:w-80 px-3.5 py-1.5 bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg text-xs font-mono hover:border-[#F26B6F] transition-all cursor-pointer group text-left shadow-2xs"
            title="Arama yap (Cmd+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 group-hover:text-[#F26B6F] transition-colors" />
              <span className="opacity-80">Arama yap...</span>
            </div>
            <kbd className="hidden sm:inline-block bg-[#F3EFE8] dark:bg-[#13204A] px-1.5 py-0.5 rounded text-[10px] text-[#9A8C76] dark:text-[#6E7CA0]">⌘K</kbd>
          </button>

          <button
            onClick={() => setIsHizliNotOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F26B6F] text-white rounded-lg text-xs font-mono hover:bg-[#B23A40] transition-all shadow-xs cursor-pointer"
            title="Hızlı Fikir / Not al (Alt+N)"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>+ Hızlı Not</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={handleToggleTheme}
            className="p-2 bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg hover:text-[#F26B6F] transition-colors cursor-pointer"
            title="Temayı değiştir (Arşiv / Koyu)"
          >
            <Sunset className="w-4 h-4" />
          </button>

          {/* Yedekleme (K2) */}
          {user && (
            <Yedekleme
              items={items}
              settings={settings}
              onKayit={async kayit => { await saveItem(user.uid, kayit); }}
            />
          )}

          {/* Açık Erişim / Mod Durumu */}
          <div className="h-8 w-px bg-[#CFC5B4] dark:bg-[#2C3C72] mx-1 hidden sm:block" />

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#6F6047]/10 dark:bg-[#2C3C72]/40 text-[#6F6047] dark:text-[#A6B0C9] text-xs font-mono select-none" title="Arşiv herkese açık modda">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Açık Erişim</span>
          </div>

        </div>
      </header>

      {/* AI ucu ulaşılamıyorsa tek yerden söyle — düğmeler sessiz kalmasın */}
      {(aiHal.hal === 'sunucu-yok' || aiHal.hal === 'hata') && (
        <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 pt-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/45 bg-[#F26B6F]/8">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#F26B6F]" />
            <p className="flex-1 text-[12px] leading-snug text-[#B23A40]">
              {aiHal.mesaj}
            </p>
            <button
              onClick={aiUyarisiniKapat}
              className="shrink-0 text-[#B23A40] hover:opacity-70 cursor-pointer text-xs font-mono"
            >
              kapat
            </button>
          </div>
        </div>
      )}

      {/* Primary Workspace Navigation Grid */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Mobile Sidebar Toggle Header */}
        <div className="lg:hidden w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl mb-1 shadow-xs">
          <span className="font-mono text-xs font-bold text-[#6A5E4C] dark:text-[#A6B0C9] flex items-center gap-2">
            <Menu className="w-4 h-4 text-[#F26B6F]" /> Çalışma Masası Rayı
          </span>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-xs font-mono px-3 py-1.5 bg-[#F26B6F] text-white rounded-lg font-bold hover:bg-[#B23A40] transition-colors cursor-pointer"
          >
            {isMenuOpen ? 'Menüyü Kapat ✕' : 'Menüyü Aç ☰'}
          </button>
        </div>

        {/* SIDEBAR NAVIGATION - LOOKS LIKE ARCHIVE RAIL */}
        <aside className={`w-full shrink-0 flex flex-col gap-2.5 transition-all duration-200 ${rayDar ? 'lg:w-16' : 'lg:w-64'} ${isMenuOpen ? 'block' : 'hidden lg:flex'}`}>
          <div className="flex items-center gap-1 px-1">
            {!rayDar && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] font-bold block">
                Çalışma Masası Rayı
              </span>
            )}
            <button
              type="button"
              onClick={rayiDegistir}
              title={rayDar ? 'Rayı genişlet' : 'Rayı daralt'}
              className="hidden lg:flex ml-auto items-center justify-center w-6 h-6 rounded-md text-[#9A8C76] hover:text-[#F26B6F] hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] transition-colors cursor-pointer"
            >
              {rayDar ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          <nav className="space-y-1 font-mono text-xs">
            {[
              { id: 'komuta', label: 'Komuta Merkezi', icon: LayoutDashboard },
              { id: 'markalar', label: 'Markalar', icon: Shield },
              { id: 'duzada', label: 'Düzada & Lore', icon: Compass },
              { id: 'merch', label: 'Merch Atölyesi', icon: ShoppingBag },
              // Blog ve Kitap tek çatı altında: YaziAtolyesi bunları
              // birleştirmek için yazılmıştı ama raya hiç bağlanmamıştı.
              { id: 'yazi', label: 'Yazı İşleri', icon: PenTool },
              { id: 'oyun', label: 'Oyun Projeleri', icon: Gamepad2 },
              // Boşluklar: metni Kemal yazacak, buraya hiçbir öneri basılmıyor
              { id: 'bosluklar', label: 'Boşluklar', icon: PenLine },
              // Galeri: Canva'dan indirilen logolar buraya yükleniyor
              { id: 'galeri', label: 'Galeri', icon: ImageIcon }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setActiveItemId(null); // Clear selected item to return to parent lists
                    setIsMenuOpen(false); // Close mobile menu after select
                  }}
                  title={item.label}
                  className={`w-full text-left rounded-xl flex items-center cursor-pointer transition-all ${rayDar ? 'lg:justify-center lg:px-0 px-4 py-3 gap-3 lg:gap-0' : 'px-4 py-3 gap-3'} ${isActive ? 'bg-[#0E1C4F] dark:bg-[#F26B6F] text-[#F3EFE8] font-bold shadow-md' : 'bg-white dark:bg-[#13204A]/55 hover:bg-[#F6F1E7] hover:text-[#0E1C4F] dark:hover:bg-[#202E5C] dark:hover:text-[#F3EFE8] border border-[#CFC5B4]/40 text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F26B6F] dark:text-amber-200' : 'text-[#9A8C76]'}`} />
                  <span className={rayDar ? 'lg:hidden' : ''}>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/*
            Sayfanın kendi rayı buraya basılıyor (SayfaRayi, portal ile).
            Ana rayın altında durur; ray daraltılınca gizlenir.
          */}
          {!rayDar && <div id={SAYFA_RAYI_YUVASI} />}

          {/*
            Varlık sayısı. Eskiden ham `items.length` yazılıyordu: arşivlenmişi,
            öneriyi, harita ayarını, kanal kaydını, günlük notu — hepsini
            sayıyordu. O yüzden raydaki 163 ile wiki'deki 88 ve markalardaki 3
            birbirini tutmuyordu. Artık ölçü tek: arşivlenmemiş, öneri
            olmayan, gerçek varlıklar.
          */}
          {!rayDar && (
          <div className="mt-4 p-4 bg-white/40 border border-[#CFC5B4] rounded-xl text-center space-y-1 font-mono text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            <p>KOMUTA MERKEZİ AKSI</p>
            <p className="font-bold text-xs text-[#F26B6F]">
              {varlikSayisi} Kayıtlı Varlık
            </p>
            {oneriSayisi > 0 && (
              <p className="opacity-70">+{oneriSayisi} öneri bekliyor</p>
            )}
          </div>
          )}
        </aside>

        {/* ACTIVE WORKSPACE AREA */}
        <main className="flex-1 min-w-0">
          {activeTab === 'komuta' && (
            <KomutaMerkezi 
              items={items}
              onSelectArea={handleSelectArea}
              onAcceptProposal={handleAcceptProposal}
              onRejectProposal={handleRejectProposal}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenHizliNot={() => setIsHizliNotOpen(true)}
              onToggleTheme={handleToggleTheme}
              currentTheme={settings.theme}
              onRefreshLive={handleRefreshLive}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
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
                setActiveTab(tab as any);
                if (itemId) {
                  setActiveItemId(itemId);
                } else {
                  setActiveItemId(null);
                }
              }}
              onSelectArea={(area, itemId) => {
                setActiveTab(area as any);
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

          {activeTab === 'bosluklar' && (
            <Bosluklar items={items} onUpdateItem={handleUpdateItem} />
          )}

        </main>

      </div>

      {/* Her sayfanın köşesinde duran hızlı fikir kutusu */}
      <HizliFikir
        items={items}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
      />

      {/* Floating Global Modal Overlays */}
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
