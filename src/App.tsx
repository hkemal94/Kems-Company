import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  logoutUser, 
  seedUserData, 
  subscribeToAllItemsWithArchived, 
  subscribeToSettings, 
  saveSettings, 
  saveItem, 
  deleteItemDoc 
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Item, UserSettings, AreaType, ItemType } from './types';
import { 
  ShoppingBag, 
  BookOpen, 
  Sparkles, 
  Search, 
  Lightbulb, 
  LogOut, 
  Sunset, 
  LayoutDashboard, 
  Compass, 
  PenTool, 
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
import Blog from './components/Blog';
import Kitap from './components/Kitap';
import Oyun from './components/Oyun';
import Brainstorm from './components/Brainstorm';
import Markalar from './components/Markalar';
import { CHARACTERS_IMPORT_DATA } from './data/charactersImportData';
import DuzadaDirectory from './components/DuzadaDirectory';
import HizliNotModal from './components/HizliNotModal';
import AramaModal from './components/AramaModal';
import { isEntityUnlinked, generateAiProposalsForUnlinked, cleanupRelationsOnDelete } from './utils/relations';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ theme: 'arşiv' });
  
  // A ref lock to prevent infinite loops of room de-duplication on items real-time updates
  const deduplicationLockRef = useRef<boolean>(false);
  
  // Navigation & interaction states
  const [activeTab, setActiveTab] = useState<'komuta' | 'markalar' | 'duzada' | 'merch' | 'blog' | 'kitap' | 'oyun' | 'brainstorm'>('komuta');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHizliNotOpen, setIsHizliNotOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Authentication & Settings observer
  useEffect(() => {
    let unsubItems: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous subscriptions if any
      if (unsubItems) {
        unsubItems();
        unsubItems = null;
      }
      if (unsubSettings) {
        unsubSettings();
        unsubSettings = null;
      }

      if (currentUser) {
        try {
          // Seed default items first if they don't exist
          await seedUserData(currentUser.uid);
        } catch (error) {
          console.error("Default veri tohumlama sirasinda hata olustu, devam ediliyor:", error);
        }

        try {
          // Listen to Firestore real-time items updates
          unsubItems = subscribeToAllItemsWithArchived(currentUser.uid, (fetchedItems) => {
            setItems(fetchedItems);
          });

          // Listen to Firestore settings
          unsubSettings = subscribeToSettings(currentUser.uid, (fetchedSettings) => {
            setSettings(fetchedSettings);
          });
        } catch (error) {
          console.error("Firestore abonelikleri baslatilirken hata olustu:", error);
        }
        
        setLoading(false);
      } else {
        setItems([]);
        setSettings({ theme: 'arşiv' });
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubItems) unsubItems();
      if (unsubSettings) unsubSettings();
    };
  }, []);

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

  // Auto de-duplicate rooms on startup
  useEffect(() => {
    if (!user || items.length === 0 || deduplicationLockRef.current) return;

    const runDeduplication = async () => {
      deduplicationLockRef.current = true;
      // Find all rooms
      const rooms = items.filter(i => 
        i.area === 'duzada' && 
        !i.archived && 
        (i.type === 'oda' || i.tags?.includes('oda') || i.id.startsWith('kemskoy_room_') || i.title.startsWith('Oda '))
      );

      // Group rooms by room number (extracted from room number metadata or title)
      const roomsByNum: Record<string, Item[]> = {};
      rooms.forEach(room => {
        const num = room.metadata?.roomNumber || room.title.replace(/\D/g, '');
        if (num && num.length === 3) { // Expecting "101", etc.
          if (!roomsByNum[num]) {
            roomsByNum[num] = [];
          }
          roomsByNum[num].push(room);
        }
      });

      let changesMade = false;

      for (const [roomNum, duplicateList] of Object.entries(roomsByNum)) {
        // If there's more than 1 item, or if the single item doesn't have the canonical ID kemskoy_room_XXX
        const canonicalId = `kemskoy_room_${roomNum}`;
        const hasWrongId = duplicateList.length === 1 && duplicateList[0].id !== canonicalId;
        
        if (duplicateList.length > 1 || hasWrongId) {
          console.log(`Deduplicating room ${roomNum}... Found ${duplicateList.length} records.`);
          changesMade = true;

          // Find if one has the canonical ID
          let canonicalRoom = duplicateList.find(r => r.id === canonicalId);
          if (!canonicalRoom) {
            // Pick the first one as canonical template
            canonicalRoom = duplicateList[0];
          }

          // Merge all other rooms in the list into this canonical one
          const mergedLinks = new Set<string>(canonicalRoom.links || []);
          const mergedTags = new Set<string>(canonicalRoom.tags || []);
          let mergedNotes = canonicalRoom.notes || '';
          let mergedMetadata = { ...(canonicalRoom.metadata || {}) };

          // Ensure it is linked to the hotel kemskoy_hotel
          if (!mergedLinks.has('kemskoy_hotel')) {
            mergedLinks.add('kemskoy_hotel');
          }

          duplicateList.forEach(other => {
            if (other.id === canonicalRoom!.id) return;

            // Merge links
            if (other.links) {
              other.links.forEach(l => mergedLinks.add(l));
            }
            // Merge tags
            if (other.tags) {
              other.tags.forEach(t => mergedTags.add(t));
            }
            // Merge notes safely
            if (other.notes && !mergedNotes.includes(other.notes)) {
              if (mergedNotes) mergedNotes += ' | ';
              mergedNotes += other.notes;
            }
            // Merge metadata fields
            if (other.metadata) {
              mergedMetadata = {
                ...other.metadata,
                ...mergedMetadata, // keep canonical's values if present
              };
            }
          });

          // Ensure basic properties are solid
          const updatedCanonical: Omit<Item, 'userId'> = {
            ...canonicalRoom,
            id: canonicalId, // force canonical ID
            links: Array.from(mergedLinks),
            tags: Array.from(mergedTags),
            notes: mergedNotes,
            isProposal: false, // Ensure we keep it as a solid non-proposal room
            metadata: {
              ...mergedMetadata,
              roomNumber: roomNum,
              roomType: mergedMetadata.roomType || (roomNum.endsWith('3') ? 'Suite' : (roomNum.endsWith('4') || roomNum.endsWith('5') ? 'Deluxe' : 'Standart')),
              isMaintenance: roomNum === '203' || roomNum === '304'
            }
          };

          // Save the canonical room with the forced canonical ID
          await saveItem(user.uid, updatedCanonical);

          // Delete all other duplicates in the group from Firestore
          for (const other of duplicateList) {
            if (other.id !== canonicalId) {
              await deleteItemDoc(user.uid, other.id);
            }
          }
        }
      }

      if (changesMade) {
        console.log("Hotel rooms deduplicated and consolidated successfully.");
      }
    };

    runDeduplication();
  }, [user, items]);

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

    const newItem: Omit<Item, 'userId'> = {
      ...itemData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveItem(user.uid, newItem);
  };

  const handleUpdateItem = async (updatedItem: Item) => {
    if (!user) return;
    await saveItem(user.uid, updatedItem);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    
    // Track all item IDs being deleted in this transaction (target + cascade deletes)
    const deletedIds = new Set<string>([itemId]);
    const targetItem = items.find(i => i.id === itemId);

    if (targetItem && targetItem.area === 'merch') {
      if (targetItem.type === 'tema') {
        // Cascade delete child drops and their products
        const childDrops = items.filter(d => d.area === 'merch' && d.type === 'drop' && d.metadata?.themeId === itemId);
        for (const d of childDrops) {
          deletedIds.add(d.id);
          const grandProducts = items.filter(p => p.area === 'merch' && p.type === 'merch_urun' && p.metadata?.dropId === d.id);
          for (const p of grandProducts) {
            deletedIds.add(p.id);
          }
        }
      } else if (targetItem.type === 'drop') {
        // Cascade delete child products under this drop
        const childProducts = items.filter(p => p.area === 'merch' && p.type === 'merch_urun' && p.metadata?.dropId === itemId);
        for (const p of childProducts) {
          deletedIds.add(p.id);
        }
      }
    }

    // Exclude all deleted items from the relation-cleanup cycle so we don't accidentally update and resurrect them
    const activeItemsRemaining = items.filter(i => !deletedIds.has(i.id));
    await cleanupRelationsOnDelete(itemId, activeItemsRemaining, handleUpdateItem);

    // Delete all collected document IDs from Firestore
    for (const idToDelete of deletedIds) {
      await deleteItemDoc(user.uid, idToDelete);
    }
  };

  // Auto-delete any "yeni varlık" (case-insensitive) items as requested by user
  useEffect(() => {
    if (!user || items.length === 0) return;
    const targets = items.filter(item => item.title.trim().toLowerCase() === 'yeni varlık');
    if (targets.length > 0) {
      console.log(`Auto-deleting ${targets.length} 'yeni varlık' items...`);
      targets.forEach(item => {
        deleteItemDoc(user.uid, item.id).catch(err => console.error("Error auto-deleting 'yeni varlık':", err));
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

        // Update canonical and delete duplicates
        handleUpdateItem(updatedHotel).then(() => {
          duplicates.forEach(dup => {
            deleteItemDoc(user.uid, dup.id).catch(err => console.error("Error deleting duplicate hotel item:", err));
          });
        }).catch(err => console.error("Error updating canonical hotel:", err));
      }
    }
  }, [items, user]);

  // Import and merge 76 Kemskøy characters as proposals / enriched entries
  useEffect(() => {
    if (!user || items.length === 0) return;
    const storageKey = `kemskoy_characters_imported_v3_${user.uid}`;
    if (localStorage.getItem(storageKey) === 'true') return;

    console.log(`Starting character import and merge migration for ${CHARACTERS_IMPORT_DATA.length} characters...`);

    const formatKunye = (char: any): string => {
      const lines: string[] = [];
      const header = char.yas ? `${char.ad} (${char.yas}) — ${char.rol}` : (char.rol ? `${char.ad} — ${char.rol}` : char.ad);
      lines.push(header);
      
      const checkVal = (v: any) => v && v.toString().trim() !== '' && v.toString().trim().toLowerCase() !== 'belirtilmedi';
      
      if (checkVal(char.fizik)) lines.push(`* Fizik: ${char.fizik}`);
      if (checkVal(char.sac)) lines.push(`* Saç: ${char.sac}`);
      if (checkVal(char.gozler)) lines.push(`* Gözler: ${char.gozler}`);
      if (checkVal(char.kisilik)) lines.push(`* Kişilik: ${char.kisilik}`);
      if (checkVal(char.sevdikleri)) lines.push(`* Sevdikleri: ${char.sevdikleri}`);
      if (checkVal(char.sevmedikleri)) lines.push(`* Sevmedikleri: ${char.sevmedikleri}`);
      if (checkVal(char.hobiler)) lines.push(`* Hobiler: ${char.hobiler}`);
      
      if (char.ayrinti && char.ayrinti.length > 0) {
        const validDetails = char.ayrinti.filter((d: any) => checkVal(d));
        if (validDetails.length > 0) {
          lines.push(`* Ayrıntı: ${validDetails.join(' ')}`);
        }
      }
      return lines.join('\n');
    };

    CHARACTERS_IMPORT_DATA.forEach(char => {
      const formatted = formatKunye(char);
      const existing = items.find(item => 
        (item.type === 'kisi' || item.type === 'karakter') && 
        item.title.trim().toLowerCase() === char.ad.trim().toLowerCase()
      );

      if (existing) {
        // Enrich existing character
        const alreadyEnriched = existing.notes?.includes(char.ad) || existing.notes?.includes('Fizik:') || existing.notes?.includes('Saç:');
        if (!alreadyEnriched) {
          const enrichedNotes = existing.notes ? `${existing.notes}\n\n---\n${formatted}` : formatted;
          handleUpdateItem({
            ...existing,
            notes: enrichedNotes,
            type: 'kisi',
            tags: Array.from(new Set([...(existing.tags || []), 'öneri'])),
            links: Array.from(new Set([...(existing.links || []), 'kemskoy_hotel']))
          }).catch(err => console.error("Error enriching existing character:", err));
        }
      } else {
        // Create as a new proposal
        const slug = char.ad.toLowerCase()
          .replace(/ç/g, 'c')
          .replace(/ğ/g, 'g')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ş/g, 's')
          .replace(/ü/g, 'u')
          .replace(/[^a-z0-9]/g, '_');

        const isStaff = char.rol.toLowerCase().includes('aşçı') || 
                        char.rol.toLowerCase().includes('garson') || 
                        char.rol.toLowerCase().includes('sommelier') || 
                        char.rol.toLowerCase().includes('bar') || 
                        char.rol.toLowerCase().includes('müzik') || 
                        char.rol.toLowerCase().includes('sanatçı') || 
                        char.rol.toLowerCase().includes('dans') || 
                        char.rol.toLowerCase().includes('resepsiyon') || 
                        char.rol.toLowerCase().includes('temizlik') || 
                        char.rol.toLowerCase().includes('housekeeping') || 
                        char.rol.toLowerCase().includes('güvenlik');
        
        const isEscort = char.rol.toLowerCase().includes('eskort');

        const tags = [
          isStaff ? 'personel' : (isEscort ? 'eskort' : 'misafir'),
          'kemskoy',
          'öneri'
        ];

        handleAddItem({
          id: `kemskoy_gen_${slug}_${Date.now()}`,
          title: char.ad,
          area: 'duzada',
          type: 'kisi',
          status: 'Fikir',
          priority: 'orta',
          tags,
          links: ['kemskoy_hotel'],
          notes: formatted,
          images: [],
          isProposal: true,
          archived: false,
          metadata: {
            region: 'eski liman / kemskoy'
          }
        }).catch(err => console.error("Error creating imported character proposal:", err));
      }
    });

    localStorage.setItem(storageKey, 'true');
  }, [items, user]);

  // Clean up current events from Düzada directory (Sürek Şenliği and imported game actions/mechanics)
  useEffect(() => {
    if (!user || items.length === 0) return;
    const currentOlaylar = items.filter(item => 
      item.area === 'duzada' && 
      item.type === 'olay' && 
      (item.id.includes('surek_senligi') || item.id.startsWith('kemskoy_mech') || item.tags.includes('mekanik') || item.tags.includes('kemskoy-oyun-mekanigi'))
    );
    if (currentOlaylar.length > 0) {
      console.log(`Auto-deleting ${currentOlaylar.length} current olay items (mechanics and defaults)...`);
      currentOlaylar.forEach(item => {
        deleteItemDoc(user.uid, item.id).catch(err => console.error("Error deleting current olay item:", err));
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
            colorPalette: ['#1B2A4A', '#D35057', '#FAF8F5'],
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
    if (item.type === 'tema' || item.type === 'drop' || item.type === 'merch_urun') {
      setActiveTab('merch');
    } else if (item.type === 'marka') {
      setActiveTab('markalar');
    } else if (item.type === 'blog_post' || item.type === 'kitap_proje' || item.type === 'kitap_bolum') {
      setActiveTab('yazi_atolyesi');
    } else if (item.type === 'fikir') {
      setActiveTab('brainstorm');
    } else {
      setActiveTab('duzada');
    }
  };

  const handleSelectArea = (area: AreaType, itemId?: string) => {
    setActiveTab(area as any);
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
      status: type === 'drop' ? 'Konsept' : type === 'merch_urun' ? 'Fikir' : type === 'blog_post' ? 'Taslak' : type === 'kitap_bolum' ? 'taslak' : 'Fikir',
      priority: 'orta',
      tags: ['hızlı-not'],
      links: [],
      images: [],
      isProposal: false,
      archived: false,
      metadata: {}
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4DCCD] flex items-center justify-center font-mono text-xs text-[#6A5E4C]">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-[#D35057] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Kems Komuta Merkezi Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // 1. SIGN-IN BARRIER LANDING VIEW
  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4DCCD] dark:bg-[#0B132B] flex items-center justify-center p-6 relative overflow-hidden paper-grain font-sans">
        
        {/* Soft background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D35057]/10 dark:bg-[#D35057]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1B2A4A]/10 dark:bg-[#3A506B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-[#F3EFE8]/95 dark:bg-[#13204A]/90 border-2 border-[#CFC5B4] dark:border-[#2C3C72] p-8 md:p-10 rounded-2xl shadow-2xl text-center space-y-6 relative z-10">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#6A5E4C] dark:text-[#A6B0C9] block">
              KEMS COMPANY PRESENT
            </span>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1B2A4A] dark:text-[#F3EFE8] tracking-tight italic">
              Kems Komuta Merkezi
            </h1>
            <p className="text-xs text-[#6A5E4C] dark:text-[#8AA0D0] leading-relaxed max-w-sm mx-auto pt-1 font-mono">
              Yaratıcı evreninizi organize edin, kurgusal projeleri, merch droplarını ve hikayeleri tek bir masaüstünde birleştirin.
            </p>
          </div>

          <div className="pt-4 border-t border-[#CFC5B4]/50 dark:border-[#2C3C72]/50">
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 bg-[#D35057] hover:bg-[#B23A40] text-[#F3EFE8] font-mono text-sm rounded-xl font-semibold shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.09 15.42 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.83 11.57-11.78 0-.79-.085-1.4-.195-1.935H12.24z"/>
              </svg>
              <span>Google ile Giriş Yap</span>
            </button>
          </div>

          <div className="text-[10px] text-[#9A8C76] dark:text-[#6E7CA0] font-mono">
            * Giriş yaparak evreninizi kalıcı olarak senkronize edin.
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN LOGGED-IN VIEW
  const kemsCompanyItem = items.find(b => b.type === 'marka' && (b.id === 'kems_company' || b.title.toLowerCase() === 'kems company'));
  const kemsLogo = kemsCompanyItem?.metadata?.brandKit?.logoBase64 || kemsCompanyItem?.metadata?.brandKit?.selectedLogo;
  const hasKemsLogo = !!(kemsLogo && (kemsLogo.startsWith('http') || kemsLogo.startsWith('data:')));

  return (
    <div className="min-h-screen bg-[#E4DCCD] dark:bg-[#0B132B] text-[#1B2A4A] dark:text-[#F3EFE8] flex flex-col font-sans transition-colors duration-200 paper-grain selection:bg-[#D35057] selection:text-white">
      
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
              <div className="bg-[#D35057] text-white px-0.5 py-[2px] flex items-center justify-center border-t-[2.5px] border-[#0F1E36] h-[14px]">
                <span className="text-white font-extrabold tracking-[0.08em] text-[5.5px] uppercase leading-none font-sans">COMPANY</span>
              </div>
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="font-sans font-bold text-base text-[#1B2A4A] dark:text-[#F3EFE8] uppercase tracking-tight leading-none">
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
            className="flex items-center justify-between w-48 sm:w-64 md:w-80 px-3.5 py-1.5 bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg text-xs font-mono hover:border-[#D35057] transition-all cursor-pointer group text-left shadow-2xs"
            title="Arama yap (Cmd+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 group-hover:text-[#D35057] transition-colors" />
              <span className="opacity-80">Arama yap...</span>
            </div>
            <kbd className="hidden sm:inline-block bg-[#F3EFE8] dark:bg-[#13204A] px-1.5 py-0.5 rounded text-[10px] text-[#9A8C76] dark:text-[#6E7CA0]">⌘K</kbd>
          </button>

          <button
            onClick={() => setIsHizliNotOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D35057] text-white rounded-lg text-xs font-mono hover:bg-[#B23A40] transition-all shadow-xs cursor-pointer"
            title="Hızlı Fikir / Not al (Alt+N)"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>+ Hızlı Not</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={handleToggleTheme}
            className="p-2 bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg hover:text-[#D35057] transition-colors cursor-pointer"
            title="Temayı değiştir (Arşiv / Koyu)"
          >
            <Sunset className="w-4 h-4" />
          </button>

          {/* User Profile & Signout */}
          <div className="h-8 w-px bg-[#CFC5B4] dark:bg-[#2C3C72] mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-7 h-7 rounded-full border border-[#CFC5B4]" />
            ) : (
              <div className="w-7 h-7 bg-[#1B2A4A] text-[#F3EFE8] rounded-full flex items-center justify-center font-bold text-xs uppercase">
                {user.email?.[0]}
              </div>
            )}
            
            <button
              onClick={logoutUser}
              className="p-2 bg-[#CFC5B4]/20 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
              title="Çıkış yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Primary Workspace Navigation Grid */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Mobile Sidebar Toggle Header */}
        <div className="lg:hidden w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl mb-1 shadow-xs">
          <span className="font-mono text-xs font-bold text-[#6A5E4C] dark:text-[#A6B0C9] flex items-center gap-2">
            <Menu className="w-4 h-4 text-[#D35057]" /> Çalışma Masası Rayı
          </span>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-xs font-mono px-3 py-1.5 bg-[#D35057] text-white rounded-lg font-bold hover:bg-[#B23A40] transition-colors cursor-pointer"
          >
            {isMenuOpen ? 'Menüyü Kapat ✕' : 'Menüyü Aç ☰'}
          </button>
        </div>

        {/* SIDEBAR NAVIGATION - LOOKS LIKE ARCHIVE RAIL */}
        <aside className={`w-full lg:w-64 shrink-0 flex flex-col gap-2.5 ${isMenuOpen ? 'block' : 'hidden lg:flex'}`}>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] font-bold px-1 block">
            Çalışma Masası Rayı
          </span>

          <nav className="space-y-1 font-mono text-xs">
            {[
              { id: 'komuta', label: 'Komuta Merkezi', icon: LayoutDashboard },
              { id: 'markalar', label: 'Markalar', icon: Shield },
              { id: 'duzada', label: 'Düzada & Lore', icon: Compass },
              { id: 'merch', label: 'Merch Atölyesi', icon: ShoppingBag },
              { id: 'blog', label: 'Blog & İçerik', icon: PenTool },
              { id: 'kitap', label: 'Kitap Atölyesi', icon: BookOpen },
              { id: 'oyun', label: 'Oyun Projeleri', icon: Gamepad2 },
              { id: 'brainstorm', label: 'Brainstorm', icon: Sparkles }
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
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${isActive ? 'bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8] font-bold shadow-md' : 'bg-white dark:bg-[#13204A]/55 hover:bg-[#F6F1E7] hover:text-[#1B2A4A] dark:hover:bg-[#202E5C] dark:hover:text-[#F3EFE8] border border-[#CFC5B4]/40 text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D35057] dark:text-amber-200' : 'text-[#9A8C76]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Quick Stats overview */}
          <div className="mt-4 p-4 bg-white/40 border border-[#CFC5B4] rounded-xl text-center space-y-1 font-mono text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            <p>KOMUTA MERKEZİ AKSI</p>
            <p className="font-bold text-xs text-[#D35057]">
              {items.length} Kayıtlı Varlık
            </p>
          </div>
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

          {activeTab === 'blog' && (
            <Blog
              items={items}
              activeItemId={activeItemId}
              onSelectItem={setActiveItemId}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
            />
          )}

          {activeTab === 'kitap' && (
            <Kitap
              items={items}
              activeItemId={activeItemId}
              onSelectItem={setActiveItemId}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
            />
          )}

          {activeTab === 'oyun' && (
            <Oyun
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
            />
          )}

          {activeTab === 'brainstorm' && (
            <Brainstorm
              items={items}
              onSelectItem={(itemId) => {
                const item = items.find(i => i.id === itemId);
                if (item) handleSelectResult(item);
              }}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
            />
          )}
        </main>

      </div>

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
