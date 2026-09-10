import React, { useState, useMemo, useEffect } from 'react';
import { 
  Gamepad2, Sparkles, Check, X, AlertTriangle, Plus, BookOpen, Trash2, 
  RefreshCw, Users, MapPin, Calendar, Wand2, ChevronRight, ArrowUp, 
  ArrowDown, Edit2, FileText, Clock, HelpCircle, Cloud, Layers, 
  CheckCircle, Save, Database, Play, Eye, EyeOff, Maximize2
} from 'lucide-react';
import { Item, AreaType } from '../types';
import { 
  KEMSKOY_DAYS, 
  KEMSKOY_PEOPLE, 
  KEMSKOY_HOTEL, 
  KEMSKOY_MECHANICS, 
  KEMSKOY_GAME_PROJECT 
} from '../data/kemskoyData';
import OtelIsletimSistemi, { Islem } from './OtelIsletimSistemi';
import OyunSimulasyon from './OyunSimulasyon';
import ConsistencyChecker from './ConsistencyChecker';

interface OyunProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onNavigateToTab: (tabName: string, itemId?: string | null) => void;
}

export default function Oyun({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onNavigateToTab
}: OyunProps) {
  // Tabs: 'designer' (Day template & operations), 'play_mode' (Simulation walkthrough)
  const [activeSubTab, setActiveSubTab] = useState<'designer' | 'play_mode'>('designer');
  
  // Right side Otel Isletim Sistemi panel toggle
  const [isOtelExpanded, setIsOtelExpanded] = useState<boolean>(false);

  // Filter out the active game project (e.g., Kemskoy Game Project)
  const games = useMemo(() => {
    return items.filter(i => i.area === 'kitap' && i.type === 'kitap_proje' && i.tags.includes('oyun-tasarimi'));
  }, [items]);

  const activeGame = useMemo(() => {
    return games[0] || null;
  }, [games]);

  // Find all days belonging to the active game
  const days = useMemo(() => {
    if (!activeGame) return [];
    return items
      .filter(i => 
        i.type === 'kitap_bolum' && 
        i.metadata?.bookId === activeGame.id && 
        !i.archived
      )
      .sort((a, b) => (a.metadata?.chapterIndex || 0) - (b.metadata?.chapterIndex || 0));
  }, [items, activeGame]);

  const activeDay = useMemo(() => {
    if (!activeItemId) return days[0] || null;
    return days.find(d => d.id === activeItemId) || days[0] || null;
  }, [days, activeItemId]);

  // Catalogs
  const allCharacters = useMemo(() => {
    return items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);
  }, [items]);

  const allPlaces = useMemo(() => {
    return items.filter(i => (i.type === 'yer' || i.type === 'mekân' || i.type === 'dükkân') && !i.archived);
  }, [items]);

  const allMechanics = useMemo(() => {
    // Merge hardcoded KEMSKOY_MECHANICS to ensure we always have descriptions, or use db
    return KEMSKOY_MECHANICS;
  }, []);

  // Form states for Day Metadata
  const [isEditingDayMeta, setIsEditingDayMeta] = useState(false);
  const [editBolum, setEditBolum] = useState('');
  const [editChapterIndex, setEditChapterIndex] = useState(1);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editWeather, setEditWeather] = useState('');
  const [editOccupancy, setEditOccupancy] = useState(50);
  const [editMemoFrom, setEditMemoFrom] = useState('');
  const [editMemoText, setEditMemoText] = useState('');
  const [editExpectedCheckouts, setEditExpectedCheckouts] = useState('');
  const [editMorningNote, setEditMorningNote] = useState('');
  const [editStatus, setEditStatus] = useState<'taslak' | 'yazıldı' | 'düzeltildi'>('taslak');

  // Load active day values into editor when selected
  useEffect(() => {
    if (activeDay) {
      setEditBolum(activeDay.metadata?.bolum || 'Bölüm I');
      setEditChapterIndex(activeDay.metadata?.chapterIndex || 1);
      setEditTitle(activeDay.title || '');
      setEditDate(activeDay.metadata?.date || '');
      setEditWeather(activeDay.metadata?.weather || 'Hafif Sisli');
      setEditOccupancy(activeDay.metadata?.occupancy || 50);
      setEditMemoFrom(activeDay.metadata?.memoFrom || 'Resepsiyon Müdürü');
      setEditMemoText(activeDay.metadata?.memoText || '');
      setEditExpectedCheckouts(activeDay.metadata?.expectedCheckouts || '');
      setEditMorningNote(activeDay.metadata?.morningNote || '');
      setEditStatus((activeDay.status as any) || 'taslak');
      setIsEditingDayMeta(false);
    }
  }, [activeDay]);

  // Form states for Manual Operation (İşlem)
  const [showAddIslem, setShowAddIslem] = useState(false);
  const [editingIslemId, setEditingIslemId] = useState<string | null>(null);
  const [islemType, setIslemType] = useState<Islem['type']>('check-in');
  const [islemWhoWhat, setIslemWhoWhat] = useState('');
  const [islemDescription, setIslemDescription] = useState('');
  const [islemCorrectAction, setIslemCorrectAction] = useState('');
  const [islemLinkedMechanic, setIslemLinkedMechanic] = useState('');
  const [islemLinkedCharacter, setIslemLinkedCharacter] = useState('');
  const [islemLinkedRoom, setIslemLinkedRoom] = useState('');
  const [islemEffect, setIslemEffect] = useState('');

  // AI loading and proposal states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<{
    type: 'single' | 'list';
    task: string;
    data: any;
  } | null>(null);
  const [consistencyFeedback, setConsistencyFeedback] = useState<string | null>(null);

  // Game states for Fullscreen, Auto-seeding and AI Seed prompts
  const [isFullScreenGame, setIsFullScreenGame] = useState<boolean>(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Mark room maintenance as completed ("Hazır")
  const handleSetRoomReady = async (roomTitle: string) => {
    const room = allPlaces.find(p => p.title === roomTitle);
    if (room) {
      await onUpdateItem({
        ...room,
        notes: `${room.notes || ''}\n[Komuta Raporu: Bakım tamamlandı uyarısıyla Hazır'a alındı.]`,
        metadata: {
          ...room.metadata,
          isMaintenance: false
        }
      });
      alert(`🎉 ${roomTitle} başarıyla "Hazır" durumuna alındı ve misafir kabulüne açıldı!`);
    }
  };

  // Auto-seeding 6 days of operations (min 4, max 8) when game is empty
  useEffect(() => {
    if (activeGame && days.length === 0 && !isSeeding) {
      const autoSeed = async () => {
        setIsSeeding(true);
        try {
          // Verify/seed hotel
          let hotelId = 'kemskoy_hotel';
          const existingHotel = items.find(i => i.id === 'kemskoy_hotel' || i.title === 'The Imperial Kemskøy');
          if (!existingHotel) {
            await onAddItem({
              ...KEMSKOY_HOTEL,
              id: 'kemskoy_hotel',
              isProposal: true
            });
          } else {
            hotelId = existingHotel.id;
          }

          // Seed characters mapping
          const personIdMap: Record<string, string> = {};
          for (const person of KEMSKOY_PEOPLE) {
            const titleLower = person.title.toLowerCase();
            const existingPerson = allCharacters.find(c => c.title.toLowerCase() === titleLower);
            if (!existingPerson) {
              const newId = 'kemskoy_p_' + person.id;
              await onAddItem({
                ...person,
                id: newId,
                isProposal: true
              });
              personIdMap[person.id] = newId;
            } else {
              personIdMap[person.id] = existingPerson.id;
            }
          }

          // Seed rooms list with metadata
          const roomsToCreate = [
            { num: '101', type: 'Standart' }, { num: '102', type: 'Standart' }, { num: '103', type: 'Suite' }, { num: '104', type: 'Deluxe' }, { num: '105', type: 'Deluxe' },
            { num: '201', type: 'Standart' }, { num: '202', type: 'Standart' }, { num: '203', type: 'Suite', notes: 'Klima Arızası sebebiyle bakımdadır.' }, { num: '204', type: 'Deluxe' }, { num: '205', type: 'Deluxe' },
            { num: '301', type: 'Standart' }, { num: '302', type: 'Standart' }, { num: '303', type: 'Suite' }, { num: '304', type: 'Deluxe', notes: 'Boya tadilatı sebebiyle bakımdadır.' }, { num: '305', type: 'Deluxe' },
            { num: '401', type: 'Standart' }, { num: '402', type: 'Standart' }, { num: '403', type: 'Suite' }, { num: '404', type: 'Deluxe' }, { num: '405', type: 'Deluxe' }
          ];

          const roomIdMap: Record<string, string> = {};
          for (const rm of roomsToCreate) {
            const title = `Oda ${rm.num}`;
            const existingRoom = allPlaces.find(p => p.title === title);
            if (!existingRoom) {
              const newId = 'kemskoy_room_' + rm.num;
              await onAddItem({
                id: newId,
                title,
                area: 'duzada',
                type: 'oda',
                status: 'Fikir',
                priority: 'orta',
                tags: ['oda', 'kemskoy', 'öneri'],
                links: [hotelId],
                notes: `${rm.type} tipi otel odası. ${rm.notes || ''}`,
                images: [],
                archived: false,
                isProposal: true,
                metadata: {
                  region: 'eski liman / kemskoy',
                  roomType: rm.type,
                  roomNumber: rm.num,
                  isMaintenance: rm.num === '203' || rm.num === '304',
                  maintenanceReason: rm.num === '203' ? 'Klima Arızası' : rm.num === '304' ? 'Boya Tadilatı' : undefined
                }
              });
              roomIdMap[title] = newId;
            } else {
              roomIdMap[title] = existingRoom.id;
            }
          }

          // Seed 6 days of interactive operations
          const first6Days = KEMSKOY_DAYS.slice(0, 6);
          for (const day of first6Days) {
            const existingDay = items.find(i => i.type === 'kitap_bolum' && i.title === day.title && i.metadata?.bookId === activeGame.id);
            if (!existingDay) {
              const ops = (day.metadata?.operations || []).map((op: any) => {
                let mappedCharId = op.linkedCharacterId;
                if (mappedCharId && personIdMap[mappedCharId]) {
                  mappedCharId = personIdMap[mappedCharId];
                }
                let mappedRoomId = op.linkedRoomId;
                if (mappedRoomId && roomIdMap[mappedRoomId]) {
                  mappedRoomId = roomIdMap[mappedRoomId];
                }
                return { ...op, linkedCharacterId: mappedCharId, linkedRoomId: mappedRoomId };
              });

              await onAddItem({
                ...day,
                isProposal: false, // mark as ready directly for play
                links: [activeGame.id],
                metadata: {
                  ...day.metadata,
                  bookId: activeGame.id,
                  operations: ops
                }
              });
            }
          }

          console.log("6 Günlük Kemskøy lobi senaryoları ve odalar başarıyla otomatik olarak hazırlandı!");
        } catch (err) {
          console.error("Auto-seed error:", err);
        } finally {
          setIsSeeding(false);
        }
      };
      autoSeed();
    }
  }, [activeGame, days, isSeeding]);

  // Day Creation modal states
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayIndex, setNewDayIndex] = useState(1);

  // Triggered when an empty room is clicked in the OtelIsletimSistemi kroki view
  const handleSelectRoomFromKroki = (roomName: string) => {
    const matchedRoom = allPlaces.find(p => p.title === roomName);
    if (matchedRoom) {
      setIslemLinkedRoom(matchedRoom.id);
      // Auto open form if closed
      setShowAddIslem(true);
    }
  };

  // Import WEEK1 + WEEK2 from the .jsx / kemskoyData as proposals with entity deduplication
  const [isImporting, setIsImporting] = useState(false);

  const handleImport14Days = async () => {
    setIsImporting(true);
    try {
      // 1. Ensure KEMSKOY_HOTEL is added if not exists
      let hotelId = 'kemskoy_hotel';
      const existingHotel = items.find(i => i.id === 'kemskoy_hotel' || i.title === 'The Imperial Kemskøy');
      if (!existingHotel) {
        await onAddItem({
          ...KEMSKOY_HOTEL,
          id: 'kemskoy_hotel',
          isProposal: true
        });
      } else {
        hotelId = existingHotel.id;
      }

      // 2. Ensure characters are added if not exists with deduplication
      const personIdMap: Record<string, string> = {};
      for (const person of KEMSKOY_PEOPLE) {
        const titleLower = person.title.toLowerCase();
        const existingPerson = allCharacters.find(c => c.title.toLowerCase() === titleLower);
        if (!existingPerson) {
          const newId = 'kemskoy_p_' + person.id;
          await onAddItem({
            ...person,
            id: newId,
            isProposal: true
          });
          personIdMap[person.id] = newId;
        } else {
          personIdMap[person.id] = existingPerson.id;
        }
      }

      // 3. Ensure rooms (places) are created if not exists under this hotel
      const roomsToCreate = [
        // Floor 1
        { num: '101', type: 'Standart' }, { num: '102', type: 'Standart' }, { num: '103', type: 'Suite' }, { num: '104', type: 'Deluxe' }, { num: '105', type: 'Deluxe' },
        // Floor 2
        { num: '201', type: 'Standart' }, { num: '202', type: 'Standart' }, { num: '203', type: 'Suite', notes: 'Klima Arızası sebebiyle bakımdadır.' }, { num: '204', type: 'Deluxe' }, { num: '205', type: 'Deluxe' },
        // Floor 3
        { num: '301', type: 'Standart' }, { num: '302', type: 'Standart' }, { num: '303', type: 'Suite' }, { num: '304', type: 'Deluxe', notes: 'Boya tadilatı sebebiyle bakımdadır.' }, { num: '305', type: 'Deluxe' },
        // Floor 4
        { num: '401', type: 'Standart' }, { num: '402', type: 'Standart' }, { num: '403', type: 'Suite' }, { num: '404', type: 'Deluxe' }, { num: '405', type: 'Deluxe' }
      ];

      const roomIdMap: Record<string, string> = {};
      for (const room of roomsToCreate) {
        const title = `Oda ${room.num}`;
        const existingRoom = allPlaces.find(p => p.title === title);
        if (!existingRoom) {
          const newId = 'kemskoy_room_' + room.num;
          await onAddItem({
            id: newId,
            title,
            area: 'duzada',
            type: 'oda',
            status: 'Fikir',
            priority: 'orta',
            tags: ['oda', 'kemskoy', 'öneri'],
            links: [hotelId],
            notes: `${room.type} tipi otel odası. ${room.notes || ''}`,
            images: [],
            archived: false,
            isProposal: true,
            metadata: {
              region: 'eski liman / kemskoy',
              roomType: room.type,
              roomNumber: room.num,
              isMaintenance: room.num === '203' || room.num === '304'
            }
          });
          roomIdMap[title] = newId;
        } else {
          roomIdMap[title] = existingRoom.id;
        }
      }

      // 4. Import the 14 days
      let importedCount = 0;
      for (const day of KEMSKOY_DAYS) {
        const existingDay = items.find(i => i.type === 'kitap_bolum' && i.title === day.title && i.metadata?.bookId === activeGame?.id);
        if (!existingDay) {
          // Map operations linked characters and rooms
          const ops = (day.metadata?.operations || []).map((op: any) => {
            let mappedCharId = op.linkedCharacterId;
            if (mappedCharId && personIdMap[mappedCharId]) {
              mappedCharId = personIdMap[mappedCharId];
            } else if (mappedCharId) {
              const matchedPerson = KEMSKOY_PEOPLE.find(p => p.id === op.linkedCharacterId);
              if (matchedPerson) {
                const foundInDb = allCharacters.find(dbChar => dbChar.title.toLowerCase() === matchedPerson.title.toLowerCase());
                if (foundInDb) mappedCharId = foundInDb.id;
              }
            }

            let mappedRoomId = op.linkedRoomId;
            if (mappedRoomId && roomIdMap[mappedRoomId]) {
              mappedRoomId = roomIdMap[mappedRoomId];
            } else if (mappedRoomId) {
              const foundInDb = allPlaces.find(dbPlace => dbPlace.title === mappedRoomId);
              if (foundInDb) mappedRoomId = foundInDb.id;
            }

            return {
              ...op,
              linkedCharacterId: mappedCharId,
              linkedRoomId: mappedRoomId
            };
          });

          await onAddItem({
            ...day,
            isProposal: true,
            links: [activeGame?.id || 'kemskoy_game_project'],
            metadata: {
              ...day.metadata,
              bookId: activeGame?.id || 'kemskoy_game_project',
              operations: ops
            }
          });
          importedCount++;
        }
      }
      
      alert(`${importedCount} Yeni Senaryo Günü ve bağlı entities Başarıyla İçe Aktarıldı (Öneri Olarak)!`);
    } catch (err) {
      console.error(err);
      alert('İçe aktarım sırasında bir hata oluştu: ' + err);
    } finally {
      setIsImporting(false);
    }
  };

  // Create manual Day
  const handleCreateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGame) return;
    const newDayId = 'kemskoy_day_' + Date.now();
    await onAddItem({
      title: newDayTitle || `Gün ${newDayIndex}`,
      area: 'kitap',
      type: 'kitap_bolum',
      status: 'taslak',
      priority: 'orta',
      tags: ['oyun-tasarimi'],
      links: [activeGame.id],
      notes: 'Oyun projesi için yeni senaryo günü.',
      images: [],
      archived: false,
      isProposal: false, // hand-made
      metadata: {
        bookId: activeGame.id,
        chapterIndex: newDayIndex,
        bolum: 'Bölüm I',
        date: 'Ekim 2003',
        weather: 'Hafif Sisli',
        occupancy: 45,
        memoFrom: 'Resepsiyon Müdürü',
        memoText: '',
        expectedCheckouts: '',
        morningNote: '',
        operations: []
      }
    });

    onSelectItem(newDayId);
    setShowAddDayModal(false);
    setNewDayTitle('');
  };

  // Save Day parameters metadata
  const handleSaveDayMeta = async () => {
    if (!activeDay) return;
    await onUpdateItem({
      ...activeDay,
      title: editTitle,
      status: editStatus,
      metadata: {
        ...activeDay.metadata,
        bolum: editBolum,
        chapterIndex: editChapterIndex,
        date: editDate,
        weather: editWeather,
        occupancy: editOccupancy,
        memoFrom: editMemoFrom,
        memoText: editMemoText,
        expectedCheckouts: editExpectedCheckouts,
        morningNote: editMorningNote
      }
    });
    setIsEditingDayMeta(false);
  };

  // Save manual/edited operation (İşlem)
  const handleSaveIslem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDay) return;

    const currentOps: Islem[] = activeDay.metadata?.operations || [];
    let updatedOps: Islem[] = [];

    if (editingIslemId) {
      updatedOps = currentOps.map(op => {
        if (op.id === editingIslemId) {
          return {
            ...op,
            type: islemType,
            whoWhat: islemWhoWhat,
            description: islemDescription,
            correctAction: islemCorrectAction,
            linkedMechanicId: islemLinkedMechanic || undefined,
            linkedCharacterId: islemLinkedCharacter || undefined,
            linkedRoomId: islemLinkedRoom || undefined,
            effect: islemEffect
          };
        }
        return op;
      });
    } else {
      const newOp: Islem = {
        id: 'islem_' + Math.random().toString(36).substr(2, 9),
        order: currentOps.length + 1,
        type: islemType,
        whoWhat: islemWhoWhat,
        description: islemDescription,
        correctAction: islemCorrectAction,
        linkedMechanicId: islemLinkedMechanic || undefined,
        linkedCharacterId: islemLinkedCharacter || undefined,
        linkedRoomId: islemLinkedRoom || undefined,
        effect: islemEffect
      };
      updatedOps = [...currentOps, newOp];
    }

    // Two-way wiring links update
    const uniqueLinks = new Set<string>();
    uniqueLinks.add(activeGame?.id || '');
    updatedOps.forEach(op => {
      if (op.linkedCharacterId) uniqueLinks.add(op.linkedCharacterId);
      if (op.linkedRoomId) uniqueLinks.add(op.linkedRoomId);
    });

    await onUpdateItem({
      ...activeDay,
      links: Array.from(uniqueLinks).filter(Boolean),
      metadata: {
        ...activeDay.metadata,
        operations: updatedOps
      }
    });

    setShowAddIslem(false);
    setEditingIslemId(null);
    setIslemWhoWhat('');
    setIslemDescription('');
    setIslemCorrectAction('');
    setIslemLinkedMechanic('');
    setIslemLinkedCharacter('');
    setIslemLinkedRoom('');
    setIslemEffect('');
  };

  const handleEditIslemClick = (op: Islem) => {
    setEditingIslemId(op.id);
    setIslemType(op.type);
    setIslemWhoWhat(op.whoWhat);
    setIslemDescription(op.description);
    setIslemCorrectAction(op.correctAction);
    setIslemLinkedMechanic(op.linkedMechanicId || '');
    setIslemLinkedCharacter(op.linkedCharacterId || '');
    setIslemLinkedRoom(op.linkedRoomId || '');
    setIslemEffect(op.effect);
    setShowAddIslem(true);
  };

  const handleDeleteIslem = async (islemId: string) => {
    if (!activeDay) return;
    const currentOps: Islem[] = activeDay.metadata?.operations || [];
    const updatedOps = currentOps.filter(o => o.id !== islemId).map((o, idx) => ({ ...o, order: idx + 1 }));

    await onUpdateItem({
      ...activeDay,
      metadata: {
        ...activeDay.metadata,
        operations: updatedOps
      }
    });
  };

  const handleMoveIslem = async (index: number, direction: 'up' | 'down') => {
    if (!activeDay) return;
    const currentOps: Islem[] = [...(activeDay.metadata?.operations || [])];
    if (direction === 'up' && index > 0) {
      const temp = currentOps[index];
      currentOps[index] = currentOps[index - 1];
      currentOps[index - 1] = temp;
    } else if (direction === 'down' && index < currentOps.length - 1) {
      const temp = currentOps[index];
      currentOps[index] = currentOps[index + 1];
      currentOps[index + 1] = temp;
    }

    const updatedOps = currentOps.map((op, idx) => ({ ...op, order: idx + 1 }));
    await onUpdateItem({
      ...activeDay,
      metadata: {
        ...activeDay.metadata,
        operations: updatedOps
      }
    });
  };

  // AI Mechanics: Suggester for single operation
  const handleSuggestNextOperation = async () => {
    if (!activeDay) return;
    setIsAiLoading(true);
    setAiProposal(null);
    setConsistencyFeedback(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'oyun-islem-oner',
          data: {
            dayMetadata: {
              bolum: activeDay.metadata?.bolum,
              title: activeDay.title + (aiCustomPrompt ? ` (İstek: ${aiCustomPrompt})` : ''),
              date: activeDay.metadata?.date,
              weather: activeDay.metadata?.weather,
              occupancy: activeDay.metadata?.occupancy,
              memoText: (activeDay.metadata?.memoText || '') + (aiCustomPrompt ? `\nYazarın Özel Hikaye İstemi: ${aiCustomPrompt}` : '')
            },
            currentOperations: activeDay.metadata?.operations || [],
            charactersContext: allCharacters.map(c => ({ id: c.id, title: c.title, notes: c.notes })),
            mechanicsContext: allMechanics
          }
        })
      });

      if (!res.ok) throw new Error('AI api response error');
      const data = await res.json();
      const replyText = data.result || '';
      const cleanJsonStr = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
      const proposalObj = JSON.parse(cleanJsonStr);

      setAiProposal({
        type: 'single',
        task: 'oyun-islem-oner',
        data: proposalObj
      });
    } catch (err) {
      console.error(err);
      alert('AI Öneri üretirken bir hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Mechanics: "Tüm Günü Tasarla" drafts 5-10 operations consistently
  const handleDraftDayFlow = async () => {
    if (!activeDay) return;
    setIsAiLoading(true);
    setAiProposal(null);
    setConsistencyFeedback(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'oyun-akis-taslakla',
          data: {
            dayMetadata: {
              bolum: activeDay.metadata?.bolum,
              title: activeDay.title + (aiCustomPrompt ? ` (İstek: ${aiCustomPrompt})` : ''),
              date: activeDay.metadata?.date,
              weather: activeDay.metadata?.weather,
              occupancy: activeDay.metadata?.occupancy,
              memoText: (activeDay.metadata?.memoText || '') + (aiCustomPrompt ? `\nYazarın Özel Hikaye İstemi: ${aiCustomPrompt}` : '')
            },
            currentOperations: activeDay.metadata?.operations || [], // sends hand-made operations as context
            charactersContext: allCharacters.map(c => ({ id: c.id, title: c.title, notes: c.notes })),
            mechanicsContext: allMechanics
          }
        })
      });

      if (!res.ok) throw new Error('AI api response error');
      const data = await res.json();
      const replyText = data.result || '';
      const cleanJsonStr = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
      let proposalsList = JSON.parse(cleanJsonStr);

      if (!Array.isArray(proposalsList)) {
        if (proposalsList && typeof proposalsList === 'object') {
          const foundArray = Object.values(proposalsList).find(Array.isArray);
          if (foundArray) {
            proposalsList = foundArray;
          } else {
            proposalsList = [proposalsList];
          }
        } else {
          proposalsList = [];
        }
      }

      setAiProposal({
        type: 'list',
        task: 'oyun-akis-taslakla',
        data: proposalsList
      });
    } catch (err) {
      console.error(err);
      alert('AI Gün Taslağı üretirken bir hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Mechanics: Consistency checkers
  const handleRunConsistencyCheck = async () => {
    if (!activeDay) return;
    setIsAiLoading(true);
    setConsistencyFeedback(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'tutarlilik-kontrolu',
          data: {
            dayMetadata: activeDay.metadata,
            operations: activeDay.metadata?.operations || [],
            charactersContext: allCharacters,
            mechanicsContext: allMechanics
          }
        })
      });

      if (!res.ok) throw new Error('AI api response error');
      const data = await res.json();
      setConsistencyFeedback(data.result || '');
    } catch (err) {
      console.error(err);
      alert('AI Tutarlılık kontrolü sırasında hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Accept a single suggested operation
  const handleAcceptSingleProposal = async () => {
    if (!activeDay || !aiProposal || aiProposal.type !== 'single') return;
    const currentOps: Islem[] = activeDay.metadata?.operations || [];
    const prop = aiProposal.data;

    const newOp: Islem = {
      id: 'islem_' + Math.random().toString(36).substr(2, 9),
      order: currentOps.length + 1,
      type: prop.type || 'check-in',
      whoWhat: prop.whoWhat || 'Yeni AI Önerisi',
      description: prop.description || '',
      correctAction: prop.correctAction || '',
      linkedMechanicId: prop.linkedMechanicId || undefined,
      linkedCharacterId: prop.linkedCharacterId || undefined,
      linkedRoomId: prop.linkedRoomId || undefined,
      effect: prop.effect || ''
    };

    const updatedOps = [...currentOps, newOp];

    const uniqueLinks = new Set<string>();
    uniqueLinks.add(activeGame?.id || '');
    updatedOps.forEach(op => {
      if (op.linkedCharacterId) uniqueLinks.add(op.linkedCharacterId);
      if (op.linkedRoomId) uniqueLinks.add(op.linkedRoomId);
    });

    await onUpdateItem({
      ...activeDay,
      links: Array.from(uniqueLinks).filter(Boolean),
      metadata: {
        ...activeDay.metadata,
        operations: updatedOps
      }
    });

    setAiProposal(null);
  };

  // Accept an item from the draft proposals list INDIVIDUALLY
  const handleAcceptListItem = async (indexToAccept: number) => {
    if (!activeDay || !aiProposal || aiProposal.type !== 'list') return;
    const currentOps: Islem[] = activeDay.metadata?.operations || [];
    const prop = aiProposal.data[indexToAccept];
    
    const newOp: Islem = {
      id: 'islem_' + Math.random().toString(36).substr(2, 9),
      order: currentOps.length + 1,
      type: prop.type || 'check-in',
      whoWhat: prop.whoWhat || 'Yeni AI Taslağı',
      description: prop.description || '',
      correctAction: prop.correctAction || '',
      linkedMechanicId: prop.linkedMechanicId || undefined,
      linkedCharacterId: prop.linkedCharacterId || undefined,
      linkedRoomId: prop.linkedRoomId || undefined,
      effect: prop.effect || ''
    };

    const updatedOps = [...currentOps, newOp];

    const uniqueLinks = new Set<string>();
    uniqueLinks.add(activeGame?.id || '');
    updatedOps.forEach(op => {
      if (op.linkedCharacterId) uniqueLinks.add(op.linkedCharacterId);
      if (op.linkedRoomId) uniqueLinks.add(op.linkedRoomId);
    });

    await onUpdateItem({
      ...activeDay,
      links: Array.from(uniqueLinks).filter(Boolean),
      metadata: {
        ...activeDay.metadata,
        operations: updatedOps
      }
    });

    // Remove only this accepted item from proposal list
    const remainingProps = aiProposal.data.filter((_: any, idx: number) => idx !== indexToAccept);
    if (remainingProps.length === 0) {
      setAiProposal(null);
    } else {
      setAiProposal({
        ...aiProposal,
        data: remainingProps
      });
    }
  };

  // Reject/Delete an item from the draft proposals list INDIVIDUALLY
  const handleRejectListItem = (indexToReject: number) => {
    if (!aiProposal || aiProposal.type !== 'list') return;
    const remainingProps = aiProposal.data.filter((_: any, idx: number) => idx !== indexToReject);
    if (remainingProps.length === 0) {
      setAiProposal(null);
    } else {
      setAiProposal({
        ...aiProposal,
        data: remainingProps
      });
    }
  };

  // Dynamic Maintenance checks
  const currentChapterIndex = activeDay?.metadata?.chapterIndex || 1;
  const roomsInMaintenance = allPlaces.filter(p => 
    (p.type === 'oda' || p.tags?.includes('oda') || p.id.startsWith('kemskoy_room_')) &&
    p.metadata?.isMaintenance === true
  );

  const activeMaintenanceAlerts = roomsInMaintenance.filter(room => {
    const roomNum = room.metadata?.roomNumber || room.title.replace(/\D/g, '');
    if (roomNum === '203') return currentChapterIndex >= 3;
    if (roomNum === '304') return currentChapterIndex >= 5;
    return true; // standard dynamic warning
  });

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[#FAF8F5] dark:bg-[#0f0f0f] text-gray-800 dark:text-gray-100 font-sans ${isFullScreenGame ? 'fixed inset-0 z-50 bg-[#0d0c0a] h-full w-full' : ''}`}>
      {/* SECTION HEADER */}
      <div className="border-b border-[#EAE6DF] dark:border-gray-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#121212]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7C50D3]/10 text-[#7C50D3] rounded-xl">
            <Gamepad2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              The Imperial Kemskøy • Senaryo & Oyun Editörü
            </h1>
            <p className="text-xs text-gray-400">Week 1 & Week 2 senaryo kurgu, kural eşleştirme ve simülasyon kontrol kulesi.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab controllers */}
          <div className="flex bg-gray-100 dark:bg-[#222] p-1 rounded-lg">
            <button
              onClick={() => setActiveSubTab('designer')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${activeSubTab === 'designer' ? 'bg-[#7C50D3] text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Senaryo Tasarımcısı
            </button>
            <button
              onClick={() => setActiveSubTab('play_mode')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${activeSubTab === 'play_mode' ? 'bg-[#7C50D3] text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <Play className="w-3.5 h-3.5" />
              CRT Simülasyon
            </button>
          </div>

          {/* Import / Reset Actions */}
          <button
            onClick={handleImport14Days}
            disabled={isImporting}
            className="px-3.5 py-1.5 bg-[#7C50D3]/10 hover:bg-[#7C50D3]/20 disabled:bg-gray-100 dark:disabled:bg-[#111] disabled:text-gray-400 text-[#7C50D3] border border-[#7C50D3]/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            Varsayılan 14 Günü İçe Aktar (Öneri)
          </button>
          
          <button
            onClick={() => setIsFullScreenGame(prev => !prev)}
            className="px-3.5 py-1.5 bg-[#7C50D3] hover:bg-[#683fba] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Tüm oyun editörünü ve simülasyonunu tam ekran yönet"
          >
            {isFullScreenGame ? (
              <>
                <X className="w-3.5 h-3.5" />
                Küçült [-]
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Tam Ekran 🖥️
              </>
            )}
          </button>
        </div>
      </div>

      {/* WORKSPACE PANELS */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto">
        
        {/* LEFT PANEL: Day / Chapter Selector */}
        <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-[#EAE6DF] dark:border-gray-800 bg-white dark:bg-[#121212] flex flex-col justify-between shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE6DF] dark:border-gray-800 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase text-gray-400">SENARYO GÜNLERİ</span>
              <button
                onClick={() => setShowAddDayModal(true)}
                className="p-1 hover:bg-[#7C50D3]/10 text-[#7C50D3] rounded transition-all"
                title="Yeni Gün Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {days.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-sans space-y-2">
                <p>Henüz bir senaryo günü yüklü değil.</p>
                <p className="text-[10px] text-gray-500">Yukarıdaki "14 Günü İçe Aktar" butonuyla Week 1 ve 2 verilerini tek tıkla yükleyebilirsiniz!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {days.map(day => {
                  const isActive = activeDay?.id === day.id;
                  const isProposal = day.isProposal === true;
                  const opCount = day.metadata?.operations?.length || 0;

                  return (
                    <button
                      key={day.id}
                      onClick={() => onSelectItem(day.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all relative flex flex-col gap-1 ${
                        isActive 
                          ? 'bg-[#7C50D3]/10 border-[#7C50D3] text-[#7C50D3]' 
                          : isProposal 
                            ? 'bg-orange-50/10 border-orange-500/20 hover:border-orange-500/40 border-dashed text-gray-700 dark:text-gray-300'
                            : 'bg-transparent border-[#EAE6DF] dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold uppercase text-gray-400">
                          {day.metadata?.bolum || 'BÖLÜM I'} • GÜN {day.metadata?.chapterIndex || 1}
                        </span>
                        {isProposal && (
                          <span className="text-[8px] font-mono font-bold bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded-full border border-orange-500/20">
                            Öneri
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold truncate pr-6">{day.title}</span>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-gray-400" />
                          {opCount} İşlem
                        </span>
                        <span className="capitalize">{day.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[#EAE6DF] dark:border-gray-800 bg-[#FAF8F5] dark:bg-[#161616] space-y-1">
            <div className="text-[10px] font-mono text-gray-400">AKTİF PROJE</div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase truncate">
              {activeGame?.title || 'Seçili Proje Yok'}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Active editor or Simulator */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#161616] p-6">
          {activeSubTab === 'play_mode' ? (
            <OyunSimulasyon
              activeDay={activeDay}
              allPlaces={allPlaces}
              allCharacters={allCharacters}
              allMechanics={allMechanics}
              days={days}
              onSelectItem={onSelectItem}
            />
          ) : activeDay ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* IF DAY IS PROPOSAL - Show Coral Banner */}
              {activeDay.isProposal && (
                <div className="p-4 bg-orange-500/10 border-2 border-dashed border-orange-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 font-sans animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider">BU GÜN BİR YAPAY ZEKA ÖNERİSİDİR (TASLAK)</h4>
                      <p className="text-[11px] text-gray-500 leading-normal">Bu günün kurgusu henüz resmi değildir. Kabul ederek genel gidişata ve Komuta Merkezi ilerleme oranına dâhil edebilirsiniz.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await onUpdateItem({
                          ...activeDay,
                          isProposal: false
                        });
                      }}
                      className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow"
                    >
                      <Check className="w-4 h-4" />
                      Kabul Et ve Resmi Yap
                    </button>
                    <button
                      onClick={async () => {
                        await onDeleteItem(activeDay.id);
                        onSelectItem(null);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Yoksay (Sil)
                    </button>
                  </div>
                </div>
              )}

              {/* HEADER INFO CARDS */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-400">AKTİF SENARYO REHBERİ</div>
                  <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white uppercase mt-0.5">
                    {activeDay.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingDayMeta(prev => !prev)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Gün Parametrelerini {isEditingDayMeta ? 'Kapat' : 'Düzenle'}
                  </button>
                  <ConsistencyChecker 
                    module="oyun" 
                    items={items} 
                    onUpdateItem={onUpdateItem} 
                    onAddItem={onAddItem} 
                    buttonClassName="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-[#7C50D3] rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    aiContextText={activeDay ? JSON.stringify(activeDay.metadata) : ''}
                  />
                </div>
              </div>

              {/* DAY PARAMETERS META EDITOR */}
              {isEditingDayMeta && (
                <div className="p-5 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 font-sans animate-slideIn">
                  <h3 className="text-xs font-mono font-bold text-[#7C50D3] uppercase tracking-wider">
                    GÜNLÜK ŞABLON PARAMETRELERİ
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Sezon / Bölüm Adı</label>
                      <input
                        type="text"
                        value={editBolum}
                        onChange={(e) => setEditBolum(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Gün Sırası (chapterIndex)</label>
                      <input
                        type="number"
                        value={editChapterIndex}
                        onChange={(e) => setEditChapterIndex(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Görünür Başlık</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Tarih Bilgisi</label>
                      <input
                        type="text"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Hava Durumu</label>
                      <input
                        type="text"
                        value={editWeather}
                        onChange={(e) => setEditWeather(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Doluluk Oranı %</label>
                      <input
                        type="number"
                        value={editOccupancy}
                        onChange={(e) => setEditOccupancy(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Gün Durumu</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      >
                        <option value="taslak">Taslak</option>
                        <option value="yazıldı">Yazıldı (Bitti)</option>
                        <option value="düzeltildi">Kusursuzlaştırıldı</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Müdür Notu - Gönderen</label>
                      <input
                        type="text"
                        value={editMemoFrom}
                        onChange={(e) => setEditMemoFrom(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Beklenen Çıkışlar (Check-outs)</label>
                      <input
                        type="text"
                        value={editExpectedCheckouts}
                        onChange={(e) => setEditExpectedCheckouts(e.target.value)}
                        placeholder="Örn: Oda 204, Oda 305"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 font-mono mb-1">Müdür Notu Metni</label>
                    <textarea
                      value={editMemoText}
                      onChange={(e) => setEditMemoText(e.target.value)}
                      rows={2}
                      className="w-full p-2 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 font-mono mb-1">Sabah Notu / Hikaye Kancası (Story Hook)</label>
                    <textarea
                      value={editMorningNote}
                      onChange={(e) => setEditMorningNote(e.target.value)}
                      rows={2}
                      className="w-full p-2 text-xs bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSaveDayMeta}
                      className="px-4 py-1.5 bg-[#7C50D3] hover:bg-[#683fba] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      Değişiklikleri Kaydet
                    </button>
                  </div>
                </div>
              )}

              {/* VINTAGE DAY PARAMETERS SUMMARY CARD */}
              <div className="p-6 bg-[#FAF8F5] dark:bg-[#1a1a1a] rounded-xl border border-[#EAE6DF] dark:border-gray-800 font-serif space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-4 right-4 text-[9px] font-mono border border-red-500/30 text-red-500/30 px-2 py-0.5 rounded rotate-12 select-none uppercase font-bold">
                  THE IMPERIAL KEMSKØY • OCT 2003
                </div>

                <div className="border-b-2 border-dashed border-gray-300 dark:border-gray-700 pb-3 text-center">
                  <h3 className="text-md font-bold tracking-tight text-gray-900 dark:text-white uppercase font-serif">
                    GÜNLÜK HAREKAT REHBERİ VE SENARYO PLANI
                  </h3>
                  <p className="text-xs font-mono text-gray-500 mt-1 uppercase">
                    {activeDay.metadata?.bolum || 'BÖLÜM I'} • GÜN {activeDay.metadata?.chapterIndex || 1}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  {/* Memo box */}
                  <div className="p-4 bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded shadow-sm">
                    <span className="block text-[10px] font-mono text-gray-400 font-bold mb-1">MÜDÜR NOTU MEMORANDUM:</span>
                    <span className="block text-[10px] font-bold text-gray-500 uppercase">KİMDEN: {activeDay.metadata?.memoFrom || 'Resepsiyon Müdürü'}</span>
                    <p className="text-gray-600 dark:text-gray-300 italic text-[11px] mt-1.5 leading-relaxed">
                      "{activeDay.metadata?.memoText || 'Günün talimatı henüz yazılmadı.'}"
                    </p>
                  </div>

                  {/* Quick stats details */}
                  <div className="space-y-2 p-4 bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded shadow-sm">
                    <div className="flex justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 font-bold text-[10px]">Tarih:</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">{activeDay.metadata?.date || 'Ekim 2003'}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 font-bold text-[10px]">Hava Durumu:</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">{activeDay.metadata?.weather || 'Hafif Sisli'}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 font-bold text-[10px]">Beklenen Çıkışlar:</span>
                      <span className="font-mono text-orange-600 dark:text-orange-400">{activeDay.metadata?.expectedCheckouts || 'Yok'}</span>
                    </div>
                  </div>
                </div>

                {activeDay.metadata?.morningNote && (
                  <div className="p-4 bg-amber-500/5 rounded border border-amber-500/10 text-xs">
                    <strong className="block text-gray-400 font-mono text-[9px] mb-1">SABAH RÖPORTAJI / HİKAYE BAĞLANTISI (STORY HOOK):</strong>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-serif italic text-[11px]">
                      {activeDay.metadata.morningNote}
                    </p>
                  </div>
                )}
              </div>

              {/* CONSISTENCY RESULTS PANEL */}
              {consistencyFeedback && (
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-[#7C50D3]/30 text-xs font-sans space-y-2 animate-fadeIn relative">
                  <button onClick={() => setConsistencyFeedback(null)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700">
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="font-bold text-[#7C50D3] uppercase font-mono flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    AI Tutarlılık ve Lore Analiz Raporu
                  </h4>
                  <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {consistencyFeedback}
                  </div>
                </div>
              )}

              {/* AI DRAFT / SUGGEST PROPOSAL BANNER */}
              {isAiLoading && (
                <div className="p-12 text-center bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-[#7C50D3] animate-spin" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#7C50D3]">Gemini AI Kurguyu Tasarlıyor</h4>
                    <p className="text-[11px] text-gray-400">Hotel lore'u, kurallar ve sakinler analiz edilerek kusursuz işlemler kurgulanıyor...</p>
                  </div>
                </div>
              )}

              {aiProposal && (
                <div className="p-5 bg-orange-500/5 border-2 border-orange-500/30 rounded-xl space-y-4 animate-fadeIn font-sans">
                  <div className="flex items-center justify-between border-b border-orange-500/10 pb-2">
                    <h4 className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      Yapay Zekanın Önerdiği Akış Proposalları (Gözden Geçirin)
                    </h4>
                    <button
                      onClick={() => setAiProposal(null)}
                      className="p-1 hover:bg-orange-500/10 rounded text-orange-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {aiProposal.type === 'single' ? (
                    /* Single suggestion proposal block */
                    <div className="p-4 bg-white dark:bg-[#1a1a1a] rounded-lg border border-orange-500/20 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-[9px] font-mono font-bold uppercase bg-orange-500/15 text-orange-600 px-2 py-0.5 rounded">
                          {aiProposal.data.type}
                        </span>
                        <strong className="text-xs text-gray-800 dark:text-gray-200">{aiProposal.data.whoWhat}</strong>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{aiProposal.data.description}"</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                        <div className="p-2 bg-gray-50 dark:bg-black/20 rounded">
                          <strong className="text-amber-800 dark:text-amber-400 block mb-0.5">Çözüm (Aksiyon):</strong>
                          <span>{aiProposal.data.correctAction}</span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-black/20 rounded">
                          <strong className="text-green-800 dark:text-green-400 block mb-0.5">Sonuç & Lore Etkisi:</strong>
                          <span>{aiProposal.data.effect}</span>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleAcceptSingleProposal}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
                        >
                          <Check className="w-4 h-4" />
                          Kayıtlara Ekle (Kabul Et)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Multiple draft list proposals - can be accepted/deleted individually! */
                    <div className="space-y-3">
                      <p className="text-[11px] text-gray-500">
                        AI tüm gün için ardışık işlemler taslakladı. Aşağıdaki her işlemi **ayrı ayrı** inceleyebilir, uygun bulduklarınızı kabul edip sıraya ekleyebilir veya yoksayabilirsiniz.
                      </p>
                      {Array.isArray(aiProposal.data) && aiProposal.data.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white dark:bg-[#1a1a1a] rounded-lg border border-orange-500/20 space-y-3 shadow-sm group relative">
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                            <span className="text-[9px] font-mono font-bold uppercase bg-orange-500/15 text-orange-600 px-2 py-0.5 rounded">
                              Öneri #{idx + 1} • {item.type}
                            </span>
                            <strong className="text-xs text-gray-800 dark:text-gray-200">{item.whoWhat}</strong>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{item.description}"</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                            <div className="p-2 bg-gray-50 dark:bg-black/20 rounded">
                              <strong className="text-amber-800 dark:text-amber-400 block mb-0.5">Çözüm (Aksiyon):</strong>
                              <span>{item.correctAction}</span>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-black/20 rounded">
                              <strong className="text-green-800 dark:text-green-400 block mb-0.5">Lore Etkisi:</strong>
                              <span>{item.effect}</span>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <button
                              onClick={() => handleAcceptListItem(idx)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Kabul Et (Akışa Ekle)
                            </button>
                            <button
                              onClick={() => handleRejectListItem(idx)}
                              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Yoksay (Sil)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MAINTENANCE ROOM WARNING NOTIFICATIONS */}
              {activeMaintenanceAlerts.length > 0 && (
                <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl animate-fadeIn text-xs font-sans space-y-2">
                  <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase font-mono">
                    <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />
                    Tadilat &amp; Bakım Bildirim Sistemi
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">
                    Aşağıdaki odaların planlanan bakım süreleri doldu. 'Hazır Yap' butonuna tıklayarak odayı lobi simülasyonuna katabilirsiniz:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {activeMaintenanceAlerts.map(room => {
                      const roomNum = room.metadata?.roomNumber || room.title.replace(/\D/g, '');
                      const details = roomNum === '203' 
                        ? 'Klima tesisatındaki sızıntı giderildi, tavan alçı sıvası kurudu.' 
                        : roomNum === '304'
                          ? 'Elektrik kontağı tamiratı bitti, odadaki tüm sigortalar yenilendi.'
                          : 'Genel bakım ve arıza giderimi tamamlandı.';
                      return (
                        <div key={room.id} className="p-3 bg-white dark:bg-[#111] border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-center justify-between gap-3 shadow-sm">
                          <div>
                            <strong className="block text-amber-700 dark:text-amber-400 font-mono">{room.title} Tamir Edildi</strong>
                            <span className="text-[10px] text-gray-500">{details}</span>
                          </div>
                          <button
                            onClick={() => handleSetRoomReady(room.title)}
                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-mono font-bold text-[10px] rounded shadow uppercase transition-all cursor-pointer shrink-0 animate-pulse"
                          >
                            Hazır Yap ✓
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TIMELINE OPERATIONS SECTION */}
              <div className="space-y-4">
                {/* AI CUSTOM PLOT SEED WRITING LAB */}
                <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2 font-sans">
                  <span className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    AI Senaryo Kılavuzu &amp; Hikaye Laboratuvarı
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Aşağıya kendi hikaye fikrinizi, lobiye kimin geleceğini veya hangi olayın patlak vereceğini yazın. Ardından sağdaki AI butonlarından birine basarak senaryoyu yönlendirin:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Örn: Sırılsıklam ıslanmış gizemli bir profesör lobiye gelir, sarnıçları sorar..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    {aiCustomPrompt && (
                      <button
                        onClick={() => setAiCustomPrompt('')}
                        className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-all"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                  <h3 className="text-sm font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#7C50D3]" />
                    Günlük Operasyon Akış Çizelgesi (Timeline)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleDraftDayFlow}
                      className="px-2.5 py-1 text-xs bg-[#7C50D3]/10 hover:bg-[#7C50D3]/20 text-[#7C50D3] rounded font-sans transition-all flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Tüm Günü Tasarla (AI)
                    </button>
                    <button
                      onClick={handleSuggestNextOperation}
                      className="px-2.5 py-1 text-xs bg-[#7C50D3]/10 hover:bg-[#7C50D3]/20 text-[#7C50D3] rounded font-sans transition-all flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Sıradaki İşlemi Öner
                    </button>
                    <button
                      onClick={() => {
                        setEditingIslemId(null);
                        setIslemWhoWhat('');
                        setIslemDescription('');
                        setIslemCorrectAction('');
                        setIslemLinkedMechanic('');
                        setIslemLinkedCharacter('');
                        setIslemLinkedRoom('');
                        setIslemEffect('');
                        setShowAddIslem(true);
                      }}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-sans transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Manuel İşlem Ekle
                    </button>
                  </div>
                </div>

                {/* OPERATION FORM DIALOG (Collapsible form card) */}
                {showAddIslem && (
                  <form onSubmit={handleSaveIslem} className="p-5 bg-white dark:bg-[#1c1c1c] rounded-xl border-2 border-[#7C50D3]/30 space-y-4 shadow-md font-sans">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <strong className="text-xs font-mono text-[#7C50D3] uppercase tracking-wider">
                        {editingIslemId ? 'İşlemi Düzenle' : 'Yeni İşlem Tasarla'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowAddIslem(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">İşlem Türü</label>
                        <select
                          value={islemType}
                          onChange={(e) => setIslemType(e.target.value as any)}
                          className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        >
                          <option value="check-in">Misafir Check-in</option>
                          <option value="walk-in">Walk-in Giriş</option>
                          <option value="escort">Ziyaretçi / Escort Teyit</option>
                          <option value="check-out">Misafir Check-out</option>
                          <option value="call">Telefon Çağrısı</option>
                          <option value="post-it">Post-it / Departman Sevk</option>
                          <option value="event">Anlık Karar / Rastgele Olay</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">Konuk İsmi / Konu Başlığı</label>
                        <input
                          type="text"
                          value={islemWhoWhat}
                          onChange={(e) => setIslemWhoWhat(e.target.value)}
                          placeholder="Örn: Alper Kansu, Oda Servisi Talebi"
                          required
                          className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">Eşleşen Mekanik (Oyun Kuralı)</label>
                        <select
                          value={islemLinkedMechanic}
                          onChange={(e) => setIslemLinkedMechanic(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        >
                          <option value="">-- Mekanik Seçin (Opsiyonel) --</option>
                          {allMechanics.map(m => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">Eşleşen Sakin (Karakter)</label>
                        <select
                          value={islemLinkedCharacter}
                          onChange={(e) => setIslemLinkedCharacter(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        >
                          <option value="">-- Karakter Seçin (Opsiyonel) --</option>
                          {allCharacters.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">Eşleşen Oda / Yer (Konum)</label>
                        <select
                          value={islemLinkedRoom}
                          onChange={(e) => setIslemLinkedRoom(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        >
                          <option value="">-- Oda/Yer Seçin (Opsiyonel) --</option>
                          {allPlaces.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 font-mono mb-1">Senaryo Açıklaması / Diyaloglar (Scenario Text)</label>
                      <textarea
                        value={islemDescription}
                        onChange={(e) => setIslemDescription(e.target.value)}
                        placeholder="Örn: Konuk resepsiyona yaklaşır ve kimliğini uzatır. Odası 204 olarak rezerve edilmiştir..."
                        rows={3}
                        required
                        className="w-full p-2.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">Doğru Aksiyon (Tasarım Çözümü)</label>
                        <textarea
                          value={islemCorrectAction}
                          onChange={(e) => setIslemCorrectAction(e.target.value)}
                          placeholder="Örn: Evrakları kontrol et, gecikme ücreti alarak 204'e kaydet."
                          rows={2}
                          required
                          className="w-full p-2.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 font-mono mb-1">Puan & Lore Sonuçları (Consequences)</label>
                        <textarea
                          value={islemEffect}
                          onChange={(e) => setIslemEffect(e.target.value)}
                          placeholder="Örn: Memnuniyet +10, Kasa +€50. Düzada gizemi tetiklenir."
                          rows={2}
                          required
                          className="w-full p-2.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#7C50D3] hover:bg-[#683fba] text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {editingIslemId ? 'Değişiklikleri Güncelle' : 'İşlemi Sıraya Ekle'}
                      </button>
                    </div>
                  </form>
                )}

                {/* TIMELINE OPERATIONS ITEMS */}
                <div className="space-y-3 font-sans">
                  {(!activeDay.metadata?.operations || activeDay.metadata.operations.length === 0) ? (
                    <div className="text-center py-12 bg-[#FAF8F5] dark:bg-black/15 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
                      Bu gün için henüz bir kurgu akışı tasarlanmadı. Yapay zekayı çağırarak veya manuel işlemler ekleyerek başlayabilirsiniz.
                    </div>
                  ) : (
                    activeDay.metadata.operations.map((op: Islem, idx: number) => {
                      const mTitle = allMechanics.find(m => m.id === op.linkedMechanicId)?.title;
                      const cTitle = allCharacters.find(c => c.id === op.linkedCharacterId)?.title;
                      const rTitle = allPlaces.find(p => p.id === op.linkedRoomId)?.title;

                      let typeColor = 'bg-gray-100 text-gray-700';
                      if (op.type === 'check-in') typeColor = 'bg-green-500/10 text-green-500';
                      if (op.type === 'walk-in') typeColor = 'bg-blue-500/10 text-blue-500';
                      if (op.type === 'escort') typeColor = 'bg-amber-500/10 text-amber-500';
                      if (op.type === 'check-out') typeColor = 'bg-rose-500/10 text-rose-500';
                      if (op.type === 'call') typeColor = 'bg-purple-500/10 text-purple-500';
                      if (op.type === 'post-it') typeColor = 'bg-indigo-500/10 text-indigo-500';
                      if (op.type === 'event') typeColor = 'bg-orange-500/10 text-orange-500';

                      return (
                        <div
                          key={op.id}
                          className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm hover:border-[#7C50D3]/30 transition-all group"
                        >
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-400">
                                #{idx + 1}
                              </span>
                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${typeColor}`}>
                                {op.type}
                              </span>
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                {op.whoWhat}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleMoveIslem(idx, 'up')}
                                disabled={idx === 0}
                                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 ${idx === 0 ? 'opacity-30' : 'hover:text-gray-900'}`}
                                title="Yukarı Taşı"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveIslem(idx, 'down')}
                                disabled={idx === activeDay.metadata.operations.length - 1}
                                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 ${idx === activeDay.metadata.operations.length - 1 ? 'opacity-30' : 'hover:text-gray-900'}`}
                                title="Aşağı Taşı"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditIslemClick(op)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-[#7C50D3]"
                                title="İşlemi Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteIslem(op.id)}
                                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"
                                title="İşlemi Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 dark:text-gray-300 italic pl-3 border-l-2 border-gray-200 dark:border-gray-800 leading-relaxed font-serif">
                            "{op.description}"
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1 font-sans">
                            <div className="p-2.5 bg-[#FAF8F5] dark:bg-black/20 rounded border border-gray-100 dark:border-gray-800/50">
                              <strong className="text-amber-800 dark:text-amber-400 block mb-0.5">Doğru Karar (Aksiyon):</strong>
                              <span className="text-gray-700 dark:text-gray-300">{op.correctAction}</span>
                            </div>
                            <div className="p-2.5 bg-[#FAF8F5] dark:bg-black/20 rounded border border-gray-100 dark:border-gray-800/50">
                              <strong className="text-green-800 dark:text-green-400 block mb-0.5">Sonuç & Lore Etkisi:</strong>
                              <span className="text-gray-700 dark:text-gray-300">{op.effect}</span>
                            </div>
                          </div>

                          {/* Connections / Tags */}
                          {(mTitle || cTitle || rTitle) && (
                            <div className="flex flex-wrap gap-2 pt-1.5 text-[9px] font-mono">
                              {mTitle && (
                                <span className="bg-gray-100 dark:bg-black/40 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-[#7C50D3]" />
                                  Kural: {mTitle}
                                </span>
                              )}
                              {cTitle && (
                                <button
                                  onClick={() => onNavigateToTab('duzada', op.linkedCharacterId)}
                                  className="bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 text-[#7C50D3] dark:text-[#D6C4E9] px-2 py-0.5 rounded flex items-center gap-1 transition-all"
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  Sakin: {cTitle}
                                </button>
                              )}
                              {rTitle && (
                                <button
                                  onClick={() => onNavigateToTab('duzada', op.linkedRoomId)}
                                  className="bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 text-[#7C50D3] dark:text-[#D6C4E9] px-2 py-0.5 rounded flex items-center gap-1 transition-all"
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  Oda: {rTitle}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 text-xs font-sans space-y-4">
              <Gamepad2 className="w-12 h-12 text-[#7C50D3] opacity-40 animate-bounce" />
              <div>
                <p className="font-bold text-gray-600 dark:text-gray-300">SENARYO SEÇİLMEDİ</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-sm">Sol panelden bir senaryo günü seçin, yeni gün tasarlayın veya "14 Günü İçe Aktar" butonunu kullanarak kurguları yükleyin.</p>
              </div>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE RIGHT PANEL: Otel Isletim Sistemi (Kroki & Odalar) */}
        {activeSubTab === 'designer' && activeDay && (
          <div className="flex flex-col lg:flex-row shrink-0 relative w-full lg:w-auto">
            {/* Split collapse control vertical handle */}
            <button
              onClick={() => setIsOtelExpanded(prev => !prev)}
              className="absolute lg:right-full right-4 top-1/2 -translate-y-1/2 lg:top-1/2 lg:-translate-y-1/2 z-50 bg-[#FAF8F5] dark:bg-[#121212] border border-[#EAE6DF] dark:border-gray-800 p-1.5 rounded-md lg:rounded-l-md text-gray-400 hover:text-gray-700 dark:hover:text-white shadow"
              title="Otel İşletim Sistemi Panelini Aç/Kapat"
            >
              {isOtelExpanded ? <EyeOff className="w-4 h-4 text-[#7C50D3]" /> : <Eye className="w-4 h-4" />}
            </button>

            {isOtelExpanded && (
              <div className="w-full lg:w-[360px] animate-slideIn select-none h-full border-t lg:border-t-0 lg:border-l border-[#EAE6DF] dark:border-gray-800 bg-white dark:bg-[#121212]">
                <OtelIsletimSistemi
                  activeDay={activeDay}
                  allPlaces={allPlaces}
                  allCharacters={allCharacters}
                  onSelectRoom={handleSelectRoomFromKroki}
                />
              </div>
            )}
          </div>
        )}

      </div>

      {/* CREATE NEW DAY MODAL DIALOG */}
      {showAddDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans">
          <form onSubmit={handleCreateDay} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                Yeni Senaryo Günü Tasarla
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDayModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-400 font-mono mb-1">GÜN SIRASI (chapterIndex)</label>
                <input
                  type="number"
                  value={newDayIndex}
                  onChange={(e) => setNewDayIndex(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 font-mono mb-1">GÖRÜNÜR BAŞLIK (title)</label>
                <input
                  type="text"
                  value={newDayTitle}
                  onChange={(e) => setNewDayTitle(e.target.value)}
                  placeholder="Örn: İlk Şüpheler, Lobide Fırtına"
                  required
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowAddDayModal(false)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#7C50D3] hover:bg-[#683fba] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Gün Oluştur
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
