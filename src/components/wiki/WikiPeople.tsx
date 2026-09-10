import React, { useMemo, useState } from 'react';
import { ChevronDown, Search, Users } from 'lucide-react';
import { Item } from '../../types';
import { getRol, getKisiGrubu, GRUP_BASLIK, parseKunye, KisiGrubu } from './kunyeParser';

/**
 * Mekân sayfasındaki kişi listesi.
 *
 * Eskiden bu 94 tane çipten oluşan bir duvardı ve otel sayfasının yarısını
 * yutuyordu. Burada kadro/misafir/eskort diye gruplanmış, kapalıyken tek
 * satır, açıldığında her satırda ad + rol + tek cümlelik tanıtım veren
 * bir blok var. Tam künye kişinin kendi sayfasında kalır.
 */

interface WikiPeopleProps {
  people: Item[];
  onNavigate: (id: string) => void;
  /** Blok başlığı — ilişki türünden gelir ("Buradaki Kişiler" gibi) */
  title?: string;
  /** Öneri ilişkileri kesik çerçeveyle işaretlensin diye */
  proposalIds?: Set<string>;
}

const GRUP_SIRA: KisiGrubu[] = ['personel', 'misafir', 'eskort', 'diğer'];

export const WikiPeople: React.FC<WikiPeopleProps> = ({
  people,
  onNavigate,
  title = 'Kişiler',
  proposalIds
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');

    const filtered = needle
      ? people.filter(p => {
          const rol = getRol(p).toLocaleLowerCase('tr');
          return (
            p.title.toLocaleLowerCase('tr').includes(needle) ||
            rol.includes(needle) ||
            p.tags.some(t => t.toLocaleLowerCase('tr').includes(needle))
          );
        })
      : people;

    const map = new Map<KisiGrubu, Item[]>();
    filtered.forEach(p => {
      const g = getKisiGrubu(p);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    });

    return GRUP_SIRA.filter(g => map.has(g)).map(g => ({
      grup: g,
      list: map.get(g)!.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
    }));
  }, [people, q]);

  const counts = useMemo(() => {
    const m = new Map<KisiGrubu, number>();
    people.forEach(p => {
      const g = getKisiGrubu(p);
      m.set(g, (m.get(g) || 0) + 1);
    });
    return m;
  }, [people]);

  if (people.length === 0) return null;

  return (
    <section className="my-6 border border-bej/45 dark:border-lacivert-600/50 rounded-lg overflow-hidden bg-krem-acik/60 dark:bg-lacivert-800/30">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bej/12 dark:hover:bg-lacivert-600/25 transition-colors"
        aria-expanded={open}
      >
        <Users size={16} className="text-gri dark:text-bej shrink-0" />
        <span className="font-serif text-base text-lacivert dark:text-krem">{title}</span>
        <span className="font-mono text-[11px] text-gri dark:text-bej/70">
          {people.length} kişi
        </span>

        <span className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-gri dark:text-bej/60">
          {GRUP_SIRA.filter(g => counts.get(g)).map(g => (
            <span
              key={g}
              className="px-1.5 py-0.5 rounded border border-bej/45 dark:border-lacivert-600/45"
            >
              {counts.get(g)} {GRUP_BASLIK[g].toLocaleLowerCase('tr')}
            </span>
          ))}
        </span>

        <ChevronDown
          size={16}
          className={`text-gri dark:text-bej shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-bej/40 dark:border-lacivert-600/40 p-4 space-y-5">
          {people.length > 10 && (
            <label className="flex items-center gap-2 px-3 py-2 rounded border border-bej/50 dark:border-lacivert-600/50 bg-white/70 dark:bg-lacivert/40">
              <Search size={13} className="text-gri dark:text-bej/70 shrink-0" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Ad, rol veya etiket"
                className="w-full bg-transparent text-sm outline-none text-lacivert dark:text-krem placeholder:text-gri/60 dark:placeholder:text-bej/40"
              />
            </label>
          )}

          {groups.length === 0 && (
            <p className="text-sm text-gri dark:text-bej/70 italic">Eşleşen kişi yok.</p>
          )}

          {groups.map(({ grup, list }) => (
            <div key={grup}>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-gri dark:text-bej/60 mb-2">
                {GRUP_BASLIK[grup]}
                <span className="ml-1.5 opacity-60">{list.length}</span>
              </h4>

              <ul className="grid grid-cols-[repeat(auto-fill,minmax(255px,1fr))] gap-1.5">
                {list.map(p => {
                  const rol = getRol(p);
                  const { ozet, yas } = parseKunye(p);
                  const isProposal = proposalIds?.has(p.id) || p.isProposal;

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(p.id)}
                        className={`w-full h-full text-left px-3 py-2 rounded border transition-colors group ${
                          isProposal
                            ? 'border-dashed border-kiremit/40 hover:border-kiremit/70 bg-kiremit/[0.03]'
                            : 'border-bej/40 dark:border-lacivert-600/40 bg-white/60 dark:bg-lacivert/30 hover:border-lacivert/40 dark:hover:border-bej/40'
                        }`}
                      >
                        <span className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-[13px] text-lacivert dark:text-krem group-hover:underline decoration-lacivert/30 dark:decoration-bej/40 underline-offset-2">
                            {p.title}
                          </span>
                          {yas && (
                            <span className="text-[10px] font-mono text-gri dark:text-bej/50">
                              {yas}
                            </span>
                          )}
                          {rol && (
                            <span className="ml-auto text-[10px] font-mono text-gri dark:text-bej/60 truncate max-w-[45%]">
                              {rol}
                            </span>
                          )}
                        </span>
                        {ozet && (
                          <span className="block mt-0.5 text-[11px] text-gri/90 dark:text-bej/60 leading-snug line-clamp-2">
                            {ozet}
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
