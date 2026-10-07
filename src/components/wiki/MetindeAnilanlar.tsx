import React, { useMemo } from 'react';
import type { Item } from '../../types';
import { WIKI_TYPES, TYPE_LABELS } from './wikiSchema';
import { anilanKimlikler, buildLinkIndex } from './autoLink';

/**
 * Metinde anılanlar (4. gece, "metinde tanıma"): metinde adı ya da takma
 * adı geçen viki maddeleri çip olarak; basınca madde açılır. Kayda bir şey
 * yazmaz. Fanzinde kullanılır; kitap ve yazılar kendi editörlerinde aynı
 * tanımayı kullanır.
 */
export const MetindeAnilanlar: React.FC<{ metin: string; items: Item[]; onAc?: (id: string) => void; baslik?: string }> = ({ metin, items, onAc, baslik = 'Bu metinde anılanlar' }) => {
  const index = useMemo(() => buildLinkIndex(items.filter(i => !i.isProposal && WIKI_TYPES.includes(i.type))), [items]);
  const anilan = useMemo(() => {
    const ids = anilanKimlikler(metin, index);
    return ids.map(id => items.find(i => i.id === id)).filter((i): i is Item => !!i)
      .sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  }, [metin, index, items]);
  if (!anilan.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#6A5E4C] dark:text-[#A6B0C9]">{baslik} · {anilan.length}</div>
      <ul className="flex flex-wrap gap-1.5">
        {anilan.map(i => (
          <li key={i.id}>
            <button type="button" disabled={!onAc} onClick={() => onAc?.(i.id)}
              className="text-[12px] px-2.5 py-1 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] text-[#0E1C4F] dark:text-[#F3EFE8] hover:border-[#F26B6F] cursor-pointer disabled:cursor-default">
              {i.title}<span className="ml-1.5 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">{TYPE_LABELS[i.type] || i.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetindeAnilanlar;
