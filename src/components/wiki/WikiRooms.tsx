import React, { useMemo, useState } from 'react';
import { ChevronDown, DoorClosed, Search } from 'lucide-react';
import { Item } from '../../types';

/**
 * Odalar.
 *
 * Wiki geniş zamandır: odanın NE OLDUĞUNU söyler, o an kimin kaldığını
 * değil. Doluluk, misafir adı, temiz/kirli durumu buradan bilerek
 * çıkarılmıştır — onlar Resepsiyon Simülasyonu'nun verisidir ve zamana
 * bağlıdır. Ansiklopedi "203 numaralı oda dolu" demez; "203, ikinci kattaki
 * bir suit" der.
 *
 * Kapalıyken tek satır yer kaplar; açıldığında kata göre gruplanır.
 */

interface WikiRoomsProps {
  rooms: Item[];
  onNavigate: (id: string) => void;
}

/** Odanın kalıcı özelliği: tipi (Standart / Suite / Deluxe) */
const getTip = (room: Item): string => {
  const p = room.metadata?.profile || {};
  const raw = p.roomType || p.tip || p.category || '';
  return typeof raw === 'string' ? raw.trim() : '';
};

const getKat = (room: Item): string => {
  const raw = room.metadata?.profile?.floor;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'Kat belirtilmemiş';
};

export const WikiRooms: React.FC<WikiRoomsProps> = ({ rooms, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const byFloor = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    const filtered = needle
      ? rooms.filter(
          r =>
            r.title.toLocaleLowerCase('tr').includes(needle) ||
            getTip(r).toLocaleLowerCase('tr').includes(needle)
        )
      : rooms;

    const groups = new Map<string, Item[]>();
    filtered.forEach(r => {
      const floor = getKat(r);
      if (!groups.has(floor)) groups.set(floor, []);
      groups.get(floor)!.push(r);
    });

    return Array.from(groups.entries())
      .map(([floor, list]) => ({
        floor,
        list: list.sort((a, b) => a.title.localeCompare(b.title, 'tr', { numeric: true }))
      }))
      .sort((a, b) => a.floor.localeCompare(b.floor, 'tr', { numeric: true }));
  }, [rooms, q]);

  /** Tip dağılımı — kalıcı bir olgu, doluluk değil */
  const tipler = useMemo(() => {
    const m = new Map<string, number>();
    rooms.forEach(r => {
      const t = getTip(r);
      if (t) m.set(t, (m.get(t) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rooms]);

  if (rooms.length === 0) return null;

  return (
    <section className="my-6 border border-bej/45 dark:border-lacivert-600/50 rounded-lg overflow-hidden bg-krem-acik/60 dark:bg-lacivert-800/30">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bej/12 dark:hover:bg-lacivert-600/25 transition-colors"
        aria-expanded={open}
      >
        <DoorClosed size={16} className="text-gri dark:text-bej shrink-0" />
        <span className="font-serif text-base text-lacivert dark:text-krem">Odalar</span>
        <span className="font-mono text-[11px] text-gri dark:text-bej/70">{rooms.length}</span>

        {tipler.length > 0 && (
          <span className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-gri dark:text-bej/60">
            {tipler.map(([t, n]) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded border border-bej/45 dark:border-lacivert-600/45"
              >
                {n} {t.toLocaleLowerCase('tr')}
              </span>
            ))}
          </span>
        )}

        <ChevronDown
          size={16}
          className={`text-gri dark:text-bej shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${tipler.length === 0 ? 'ml-auto' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-bej/40 dark:border-lacivert-600/40 p-4 space-y-5">
          {rooms.length > 8 && (
            <label className="flex items-center gap-2 px-3 py-2 rounded border border-bej/50 dark:border-lacivert-600/50 bg-white/70 dark:bg-lacivert/40">
              <Search size={13} className="text-gri dark:text-bej/70 shrink-0" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Oda no veya tipi"
                className="w-full bg-transparent text-sm outline-none text-lacivert dark:text-krem placeholder:text-gri/60 dark:placeholder:text-bej/40"
              />
            </label>
          )}

          {byFloor.length === 0 && (
            <p className="text-sm text-gri dark:text-bej/70 italic">Eşleşen oda yok.</p>
          )}

          {byFloor.map(({ floor, list }) => (
            <div key={floor}>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-gri dark:text-bej/60 mb-2">
                {floor}
              </h4>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-1.5">
                {list.map(room => {
                  const tip = getTip(room);
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(room.id)}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded border border-bej/40 dark:border-lacivert-600/40 bg-white/60 dark:bg-lacivert/30 hover:border-lacivert/40 dark:hover:border-bej/40 transition-colors group"
                      >
                        <span className="font-mono text-xs text-lacivert dark:text-krem group-hover:underline">
                          {room.title}
                        </span>
                        {tip && (
                          <span className="ml-auto text-[9px] font-mono text-gri dark:text-bej/55">
                            {tip}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
