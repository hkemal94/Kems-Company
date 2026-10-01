import React, { useState } from 'react';
import { SayfaBasi } from '../kabuk/SayfaBasi';
import { ArrowLeft } from 'lucide-react';
import type { Item } from '../../types';
import { fanzinBilgisi } from '../../lib/studyo';
import { StudyodaAc } from '../studyo/StudyodaAc';
import { Fanzin } from './Fanzin';
import { DUGME_BOS, IKINCIL, KART, YAZI, neZaman } from '../anasayfa/stil';

/**
 * Fanzin kendi sayfasında (30 Eylül: menüde kendi satırı). Fanzinler yine
 * birer yazı kaydı; Yazı'da da görünürler. Burada yalnız fanzinler.
 */
export const FanzinSayfasi: React.FC<{
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onStudyo: () => void;
}> = ({ items, onUpdateItem, onStudyo }) => {
  const fanzinler = items.filter(i => i.type === 'blog_post' && !i.archived && fanzinBilgisi(i)).sort((a, b) => b.createdAt - a.createdAt);
  const bekleyen = items.filter(i => i.type === 'aday' && !i.archived && (i.metadata?.aday as { arac?: string } | undefined)?.arac === 'fanzin');
  const [acik, setAcik] = useState<string | null>(null);
  const secili = fanzinler.find(f => f.id === acik);

  if (secili) {
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        <button type="button" onClick={() => setAcik(null)} className={`${DUGME_BOS} inline-flex items-center gap-1`}><ArrowLeft className="w-3.5 h-3.5" /> Fanzinler</button>
        <Fanzin yazi={secili} onUpdateItem={onUpdateItem} />
      </div>
    );
  }
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <SayfaBasi baslik="Fanzin">
        <StudyodaAc arac="fanzin" etiket="Bu ayın fanzini · stüdyo" />
      </SayfaBasi>
      {bekleyen.length > 0 && (
        <button type="button" onClick={onStudyo} className={`${KART} w-full p-3 text-left text-[13px] ${YAZI} hover:border-[#F26B6F] cursor-pointer`}>
          Öneri tepsisinde {bekleyen.length} fanzin taslağı bekliyor · aç
        </button>
      )}
      {fanzinler.length === 0 ? (
        <p className={`${KART} p-4 text-[13px] ${IKINCIL}`}>Henüz fanzin yok.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {fanzinler.map(f => (
            <li key={f.id}>
              <button type="button" onClick={() => setAcik(f.id)} className={`${KART} w-full p-4 text-left hover:border-[#F26B6F] cursor-pointer`}>
                <span className={`block text-[16px] font-bold ${YAZI}`}>{f.title}</span>
                <span className={`block mt-1 text-[12px] ${IKINCIL}`}>{fanzinBilgisi(f)!.bolumler.length} bölüm · {f.metadata?.sitede === true ? 'sitede' : 'sitede değil'} · {neZaman(f.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FanzinSayfasi;
