import React, { useMemo, useState } from 'react';
import { Item } from '../types';
import { MapPin, Users, Calendar, AlertTriangle, ChevronRight, CheckCircle, HelpCircle } from 'lucide-react';

export interface Islem {
  id: string;
  order: number;
  type: 'check-in' | 'walk-in' | 'escort' | 'check-out' | 'call' | 'post-it' | 'event';
  whoWhat: string;
  description: string;
  correctAction: string;
  linkedMechanicId?: string;
  linkedCharacterId?: string;
  linkedRoomId?: string;
  effect: string;
}

export interface RoomState {
  num: string;
  floor: number;
  type: 'Standart' | 'Suite' | 'Deluxe';
  status: 'boş' | 'dolu' | 'bakım';
  guestName?: string;
  guestId?: string;
  isMaintenance: boolean;
  maintenanceReason?: string;
}

interface OtelIsletimSistemiProps {
  activeDay: Item | null;
  allPlaces: Item[];
  allCharacters: Item[];
  onSelectRoom?: (roomNumber: string) => void;
  currentSimStep?: number; // Optional: filter operations up to this step for simulation walkthrough
}

export default function OtelIsletimSistemi({
  activeDay,
  allPlaces,
  allCharacters,
  onSelectRoom,
  currentSimStep
}: OtelIsletimSistemiProps) {
  const [activeTab, setActiveTab] = useState<'kroki' | 'odalar' | 'girisler' | 'cikislar'>('kroki');

  // Compute live hotel state based on day's operations (optionally limited by sim step)
  const hotelState = useMemo<Record<string, RoomState>>(() => {
    // Rooms base setup (20 rooms across floors 1-4)
    const rooms: Record<string, RoomState> = {};

    const roomNumbers = [
      '101', '102', '103', '104', '105',
      '201', '202', '203', '204', '205',
      '301', '302', '303', '304', '305',
      '401', '402', '403', '404', '405'
    ];

    roomNumbers.forEach(num => {
      const floor = parseInt(num[0], 10);
      let type: 'Standart' | 'Suite' | 'Deluxe' = 'Standart';
      if (num.endsWith('3')) type = 'Suite';
      else if (num.endsWith('4') || num.endsWith('5')) type = 'Deluxe';

      // Find room in database to check if maintenance is still active or completed
      const dbRoom = allPlaces.find(p => p.title === `Oda ${num}` || p.metadata?.roomNumber === num);
      const isMaintenance = dbRoom ? (dbRoom.metadata?.isMaintenance !== false && (dbRoom.metadata?.isMaintenance === true || num === '203' || num === '304')) : (num === '203' || num === '304');
      const maintenanceReason = dbRoom?.metadata?.maintenanceReason || (num === '203' ? 'Klima Arızası' : num === '304' ? 'Boya Tadilatı' : undefined);

      rooms[num] = {
        num,
        floor,
        type,
        status: isMaintenance ? 'bakım' : 'boş',
        isMaintenance,
        maintenanceReason
      };
    });

    if (activeDay) {
      let ops: Islem[] = activeDay.metadata?.operations || [];
      // If currentSimStep is provided, only evaluate operations up to that step
      if (typeof currentSimStep === 'number') {
        ops = ops.slice(0, currentSimStep + 1);
      }

      ops.forEach(op => {
        let rNum: string | null = null;
        if (op.linkedRoomId) {
          const roomItem = allPlaces.find(p => p.id === op.linkedRoomId);
          if (roomItem && roomItem.title.startsWith('Oda ')) {
            rNum = roomItem.title.replace('Oda ', '').trim();
          }
        }

        if (!rNum) {
          // regex fallback
          const match = op.description.match(/Oda\s*(\d{3})/i) || op.correctAction.match(/Oda\s*(\d{3})/i);
          if (match) {
            rNum = match[1];
          }
        }

        if (rNum && rooms[rNum]) {
          if (rooms[rNum].status === 'bakım') return; // Maintenance takes precedence
          
          if (op.type === 'check-in' || op.type === 'walk-in') {
            rooms[rNum].status = 'dolu';
            rooms[rNum].guestName = op.whoWhat;
            rooms[rNum].guestId = op.linkedCharacterId;
          } else if (op.type === 'check-out') {
            rooms[rNum].status = 'boş';
            rooms[rNum].guestName = undefined;
            rooms[rNum].guestId = undefined;
          }
        }
      });
    }

    return rooms;
  }, [activeDay, allPlaces, currentSimStep]);

  // Extract arrivals
  const arrivals = useMemo(() => {
    if (!activeDay) return [];
    const ops: Islem[] = activeDay.metadata?.operations || [];
    return ops.filter(op => op.type === 'check-in' || op.type === 'walk-in');
  }, [activeDay]);

  // Extract departures
  const departures = useMemo(() => {
    if (!activeDay) return [];
    const ops: Islem[] = activeDay.metadata?.operations || [];
    return ops.filter(op => op.type === 'check-out');
  }, [activeDay]);

  // Group rooms by floors for easy rendering (4 down to 1)
  const floorRooms = useMemo(() => {
    const floors: Record<number, RoomState[]> = { 4: [], 3: [], 2: [], 1: [] };
    Object.values(hotelState).forEach((r: RoomState) => {
      floors[r.floor].push(r);
    });
    return floors;
  }, [hotelState]);

  // Calculate statistics
  const stats = useMemo(() => {
    const all = Object.values(hotelState) as RoomState[];
    const total = all.length;
    const maintenance = all.filter((r: RoomState) => r.status === 'bakım').length;
    const occupied = all.filter((r: RoomState) => r.status === 'dolu').length;
    const available = total - maintenance - occupied;
    const occupancyRate = total > 0 ? Math.round((occupied / (total - maintenance)) * 100) : 0;

    return { total, maintenance, occupied, available, occupancyRate };
  }, [hotelState]);

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] dark:bg-[#121212] border-l border-[#EAE6DF] dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200">
      {/* Title */}
      <div className="p-4 border-b border-[#EAE6DF] dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-mono font-bold text-[#7C50D3] tracking-wide uppercase flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#7C50D3] animate-pulse"></span>
            Otel İşletim Sistemi
          </h3>
          <p className="text-[10px] text-gray-400 font-mono">THE IMPERIAL KEMSKØY • OPERASYON PANELİ</p>
        </div>
        <div className="bg-[#7C50D3]/10 text-[#7C50D3] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
          %{stats.occupancyRate} Doluluk
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EAE6DF] dark:border-gray-800 font-sans text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50 dark:bg-black/10">
        <button
          onClick={() => setActiveTab('kroki')}
          className={`flex-1 py-2 border-b-2 text-center transition-all ${activeTab === 'kroki' ? 'border-[#7C50D3] text-[#7C50D3] bg-white dark:bg-[#1a1a1a]' : 'border-transparent hover:text-gray-900 dark:hover:text-white'}`}
        >
          Kroki 🗺️
        </button>
        <button
          onClick={() => setActiveTab('odalar')}
          className={`flex-1 py-2 border-b-2 text-center transition-all ${activeTab === 'odalar' ? 'border-[#7C50D3] text-[#7C50D3] bg-white dark:bg-[#1a1a1a]' : 'border-transparent hover:text-gray-900 dark:hover:text-white'}`}
        >
          Odalar ({stats.occupied + stats.maintenance}/{stats.total})
        </button>
        <button
          onClick={() => setActiveTab('girisler')}
          className={`flex-1 py-2 border-b-2 text-center transition-all ${activeTab === 'girisler' ? 'border-[#7C50D3] text-[#7C50D3] bg-white dark:bg-[#1a1a1a]' : 'border-transparent hover:text-gray-900 dark:hover:text-white'}`}
        >
          Girişler ({arrivals.length})
        </button>
        <button
          onClick={() => setActiveTab('cikislar')}
          className={`flex-1 py-2 border-b-2 text-center transition-all ${activeTab === 'cikislar' ? 'border-[#7C50D3] text-[#7C50D3] bg-white dark:bg-[#1a1a1a]' : 'border-transparent hover:text-gray-900 dark:hover:text-white'}`}
        >
          Çıkışlar ({departures.length})
        </button>
      </div>

      {/* Stats Quickbar */}
      <div className="grid grid-cols-3 gap-1 px-4 py-2 border-b border-[#EAE6DF] dark:border-gray-800 bg-[#FAF8F5] dark:bg-[#151515] text-[10px] font-mono">
        <div className="text-center p-1 bg-white dark:bg-black/20 rounded border border-gray-100 dark:border-gray-800/50">
          <span className="block text-gray-400">Boş</span>
          <span className="font-bold text-green-600 dark:text-green-400">{stats.available} Oda</span>
        </div>
        <div className="text-center p-1 bg-white dark:bg-black/20 rounded border border-gray-100 dark:border-gray-800/50">
          <span className="block text-gray-400">Dolu</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">{stats.occupied} Oda</span>
        </div>
        <div className="text-center p-1 bg-white dark:bg-black/20 rounded border border-gray-100 dark:border-gray-800/50">
          <span className="block text-gray-400">Bakım</span>
          <span className="font-bold text-rose-600 dark:text-rose-400">{stats.maintenance} Oda</span>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'kroki' && (
          <div className="space-y-4 font-sans">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-[10px] text-amber-700 dark:text-amber-300">
              💡 Boş odalardan birine tıklayarak <strong>Yeni İşlem</strong> formunun oda alanını otomatik doldurabilirsiniz.
            </div>

            {/* FLOORS GRID */}
            <div className="space-y-4 bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-[#EAE6DF] dark:border-gray-800 shadow-sm">
              {[4, 3, 2, 1].map(floorNum => (
                <div key={floorNum} className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-0.5 uppercase tracking-wide">
                    {floorNum}. KAT
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {floorRooms[floorNum]?.map(room => {
                      let bgStyle = 'bg-green-50 dark:bg-green-950/10 hover:bg-green-100 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400';
                      let iconLabel = 'Boş';
                      
                      if (room.status === 'bakım') {
                        bgStyle = 'bg-rose-50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 opacity-80 cursor-not-allowed';
                        iconLabel = 'Bakım';
                      } else if (room.status === 'dolu') {
                        bgStyle = 'bg-amber-50 dark:bg-amber-950/15 hover:bg-amber-100/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-400';
                        iconLabel = 'Dolu';
                      }

                      return (
                        <div
                          key={room.num}
                          onClick={() => {
                            if (room.status === 'boş' && onSelectRoom) {
                              onSelectRoom(`Oda ${room.num}`);
                            }
                          }}
                          className={`p-1.5 rounded border flex flex-col items-center justify-between min-h-[56px] transition-all cursor-pointer relative group ${bgStyle}`}
                          title={`${room.num} - ${room.type} (${iconLabel})`}
                        >
                          <span className="font-mono text-[10px] font-bold">{room.num}</span>
                          
                          {room.status === 'bakım' ? (
                            <span className="text-[9px] font-mono font-bold opacity-75">🛠️</span>
                          ) : room.status === 'dolu' ? (
                            <span className="text-[8px] font-bold truncate max-w-full text-center px-0.5" style={{ fontSize: '7px' }}>
                              {room.guestName?.split(' ')[0] || 'Dolu'}
                            </span>
                          ) : (
                            <span className="text-[7px] font-mono opacity-60">BOŞ</span>
                          )}

                          <span className="absolute bottom-0.5 right-1 text-[6px] font-mono text-gray-400">
                            {room.type === 'Suite' ? 'S' : room.type === 'Deluxe' ? 'D' : 'ST'}
                          </span>

                          {/* Hover Tooltip card details */}
                          <div className="absolute z-50 hidden group-hover:block bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white p-2.5 rounded shadow-xl text-[9px] w-48 font-mono space-y-1 text-left pointer-events-none">
                            <div className="font-bold border-b border-gray-700 pb-1 text-amber-400">
                              Oda {room.num} Details
                            </div>
                            <div>Sınıf: {room.type}</div>
                            <div>Durum: <span className={room.status === 'boş' ? 'text-green-400' : room.status === 'bakım' ? 'text-rose-400' : 'text-amber-400'}>{room.status.toUpperCase()}</span></div>
                            {room.status === 'bakım' && <div className="text-rose-300">Neden: {room.maintenanceReason}</div>}
                            {room.status === 'dolu' && <div className="text-amber-300">Konuk: {room.guestName}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'odalar' && (
          <div className="space-y-4 font-sans animate-fadeIn">
            {(() => {
              // Group rooms by floor
              const rooms = Object.values(hotelState) as RoomState[];
              const roomsByFloor: Record<number, RoomState[]> = {};
              rooms.forEach(room => {
                if (!roomsByFloor[room.floor]) {
                  roomsByFloor[room.floor] = [];
                }
                roomsByFloor[room.floor].push(room);
              });

              // Sort floors descending to match Kroki (4, 3, 2, 1)
              const sortedFloors = Object.keys(roomsByFloor).map(Number).sort((a, b) => b - a);

              return sortedFloors.map(floor => (
                <div key={floor} className="bg-white dark:bg-[#1a1a1a] border border-[#EAE6DF] dark:border-gray-800 p-3 rounded-xl space-y-2.5 shadow-2xs">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800/80 pb-1.5 flex items-center gap-1.5">
                    <span>🏢 Kat {floor} ({roomsByFloor[floor].length} Oda)</span>
                  </h4>

                  <div className="space-y-2">
                    {roomsByFloor[floor].sort((a, b) => a.num.localeCompare(b.num)).map(room => (
                      <div
                        key={room.num}
                        onClick={() => {
                          if (room.status === 'boş' && onSelectRoom) {
                            onSelectRoom(`Oda ${room.num}`);
                          }
                        }}
                        className={`p-2 bg-[#FAF8F5] dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] rounded-lg border border-gray-100 dark:border-gray-800/60 flex items-center justify-between cursor-pointer transition-colors`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-8 py-0.5 bg-gray-100 dark:bg-black/40 text-center rounded font-mono font-bold text-[10px]">
                            {room.num}
                          </span>
                          <div>
                            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">{room.type} Sınıf</span>
                            {room.status === 'dolu' && (
                              <span className="block text-[9px] text-amber-600 dark:text-amber-400 truncate max-w-[180px]">
                                👤 {room.guestName}
                              </span>
                            )}
                            {room.status === 'bakım' && (
                              <span className="block text-[9px] text-rose-600 dark:text-rose-400">
                                🛠️ Bakım: {room.maintenanceReason}
                              </span>
                            )}
                            {room.status === 'boş' && (
                              <span className="block text-[9px] text-green-600 dark:text-green-500">
                                ✓ Boş &amp; Hazır
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            room.status === 'boş' ? 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                            room.status === 'bakım' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                          }`}>
                            {room.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {activeTab === 'girisler' && (
          <div className="space-y-3 font-sans">
            {arrivals.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-[11px] border border-dashed border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#181818]">
                Bugün için beklenen check-in veya walk-in giriş bulunmuyor.
              </div>
            ) : (
              arrivals.map((arr, idx) => (
                <div key={arr.id} className="p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-100 dark:border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#7C50D3] uppercase font-mono">
                      #{idx + 1} • {arr.type}
                    </span>
                    <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">
                      👤 {arr.whoWhat}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 italic line-clamp-2">
                    "{arr.description}"
                  </p>
                  {arr.linkedRoomId && (
                    <div className="pt-1 flex items-center gap-1 text-[9px] font-mono text-gray-400">
                      <MapPin className="w-3 h-3 text-[#7C50D3]" />
                      Bağlı Yer: {allPlaces.find(p => p.id === arr.linkedRoomId)?.title || 'Bilinmiyor'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'cikislar' && (
          <div className="space-y-3 font-sans">
            {departures.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-[11px] border border-dashed border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#181818]">
                Bugün için beklenen check-out (çıkış) bulunmuyor.
              </div>
            ) : (
              departures.map((dep, idx) => (
                <div key={dep.id} className="p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-100 dark:border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-600 uppercase font-mono">
                      #{idx + 1} • {dep.type}
                    </span>
                    <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">
                      👤 {dep.whoWhat}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 italic line-clamp-2">
                    "{dep.description}"
                  </p>
                  {dep.linkedRoomId && (
                    <div className="pt-1 flex items-center gap-1 text-[9px] font-mono text-gray-400">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      Çıkış Yapılan Oda: {allPlaces.find(p => p.id === dep.linkedRoomId)?.title || 'Bilinmiyor'}
                    </div>
                  )}
                  {dep.effect && (
                    <div className="text-[9px] font-mono text-green-600 bg-green-500/5 p-1 rounded mt-1">
                      Etki: {dep.effect}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
