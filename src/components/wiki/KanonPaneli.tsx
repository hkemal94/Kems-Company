import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown } from 'lucide-react';
import type { Item, ItemType } from '../../types';
import { WIKI_TYPES, TYPE_LABELS, getKunyeFields } from './wikiSchema';
import { KunyeDegeri } from './KunyeDegeri';
import { tarihUyarilari } from '../../lib/kanonTarihleri';

/**
 * Kanon paneli — yazarken evrenden hızlı bilgi (W, 29 Eylül 2026).
 *
 * Kitap bölümünde ya da blog yazısında adı geçen viki maddelerinin kısa
 * künyesini ve kanonla çelişen tarihleri gösterir. Metne dokunmaz; yalnız
 * okur. Maddeye tıklayınca vikide açılır.
 */

const kacis = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/** Metinde adı geçen viki maddeleri */
export function gecenMaddeler(metin: string, items: Item[]): Item[] {
  if (!metin.trim()) return [];
  return items.filter(i => {
    if (i.archived || i.isProposal) return false;
    if (!WIKI_TYPES.includes(i.type as ItemType)) return false;
    const ad = i.title.trim();
    if (ad.length < 3) return false;
    const re = new RegExp(`(?<![\\wğüşıöçĞÜŞİÖÇ])${kacis(ad)}(?![\\wğüşıöçĞÜŞİÖÇ])`, 'i');
    return re.test(metin);
  });
}

interface KanonPaneliProps {
  metin: string;
  items: Item[];
  onSelectItem?: (id: string) => void;
  className?: string;
}

export const KanonPaneli: React.FC<KanonPaneliProps> = ({ metin, items, onSelectItem, className }) => {
  const [acik, setAcik] = useState(true);
  const maddeler = useMemo(() => gecenMaddeler(metin, items), [metin, items]);
  const uyarilar = useMemo(() => tarihUyarilari(metin), [metin]);
  if (!maddeler.length && !uyarilar.length) return null;

  return (
    <div className={`rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] ${className || ''}`}>
      <button
        type="button"
        onClick={() => setAcik(a => !a)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 text-[#F26B6F]" />
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#0E1C4F] dark:text-[#F3EFE8]">
          Kanon
        </span>
        <span className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {maddeler.length} madde{uyarilar.length ? ` · ${uyarilar.length} tarih uyarısı` : ''}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto text-[#6A5E4C] dark:text-[#A6B0C9] transition-transform ${acik ? 'rotate-180' : ''}`} />
      </button>

      {acik && (
        <div className="px-4 pb-4 space-y-3">
          {uyarilar.map((u, i) => (
            <div key={i} className="flex gap-2 px-3 py-2 rounded-lg border border-[#F26B6F]/40 bg-[#F26B6F]/8 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#F26B6F] shrink-0 mt-0.5" />
              <span className="min-w-0 text-[#0E1C4F] dark:text-[#F3EFE8] leading-snug">
                <strong>{u.yil}</strong> geçen bir paragrafta <strong>{u.kural.ad}</strong> var. {u.kural.not}
                <span className="block mt-0.5 text-[#6A5E4C] dark:text-[#A6B0C9] italic truncate">“{u.alinti}…”</span>
              </span>
            </div>
          ))}

          {maddeler.length > 0 && (
            <ul className="space-y-2">
              {maddeler.slice(0, 16).map(m => {
                const kunye = getKunyeFields(m).slice(0, 3);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelectItem?.(m.id)}
                      disabled={!onSelectItem}
                      className="w-full text-left px-3 py-2 rounded-lg border border-[#CFC5B4]/70 dark:border-[#2C3C72] hover:border-[#F26B6F] cursor-pointer disabled:cursor-default"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">{m.title}</span>
                        <span className="text-[9px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9]">
                          {TYPE_LABELS[m.type as ItemType] || m.type}
                        </span>
                      </span>
                      {kunye.length > 0 && (
                        <span className="mt-1 grid gap-0.5">
                          {kunye.map(f => (
                            <span key={f.id} className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
                              <span className="font-mono text-[9px] uppercase mr-1">{f.label}:</span>
                              <KunyeDegeri value={f.value} />
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default KanonPaneli;
