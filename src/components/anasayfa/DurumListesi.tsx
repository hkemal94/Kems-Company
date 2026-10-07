import React, { useMemo } from 'react';
import { Check, ChevronRight, Map as MapIcon, X } from 'lucide-react';
import type { Item } from '../../types';
import { durumSatirlari, type ListeHedefi } from '../../lib/durumListeleri';
import type { SeritHedefi } from './YuzdeSeridi';
import { DUGME_BOS, ETIKET, IKINCIL, KART, YAZI } from './stil';

/** Listesi olan yüzdeler; Merch ve Boşluklar kendi sayfalarına gider */
export const LISTELI_HEDEFLER: SeritHedefi[] = ['kunye', 'kitap', 'harita'];

const BASLIK: Record<ListeHedefi, string> = {
  kunye: 'Künye · maddeler',
  kitap: 'Kitap · bölümler',
  harita: 'Harita · maddesi olması gereken yapılar'
};

export const DurumListesi: React.FC<{
  items: Item[];
  hedef: SeritHedefi;
  onKapat: () => void;
  onMaddeAc?: (item: Item) => void;
  onHarita?: () => void;
}> = ({ items, hedef, onKapat, onMaddeAc, onHarita }) => {
  const h = hedef as ListeHedefi;
  const satirlar = useMemo(() => durumSatirlari(items, h), [items, h]);
  const eksik = satirlar.filter(s => !s.tamam).length;

  return (
    <div className={`${KART} mt-3 p-4`}>
      <div className="flex items-center gap-2">
        <div className={ETIKET}>{BASLIK[h]}</div>
        <span className={`text-[11px] ${IKINCIL}`}>{satirlar.length} · {eksik} eksik</span>
        <span className="ml-auto flex items-center gap-1.5">
          {h === 'harita' && onHarita && (
            <button type="button" onClick={onHarita} className={DUGME_BOS}><MapIcon className="w-3.5 h-3.5" /> Haritada aç</button>
          )}
          <button type="button" onClick={onKapat} title="Kapat" className={`${DUGME_BOS} !px-2`}><X className="w-3.5 h-3.5" /></button>
        </span>
      </div>
      <ul className="mt-2 divide-y divide-[#E4DCCD] dark:divide-[#2C3C72] max-h-[60vh] overflow-y-auto">
        {satirlar.map(s => {
          const tiklanir = !!(s.item && onMaddeAc);
          return (
            <li key={s.anahtar}>
              <button type="button" disabled={!tiklanir} onClick={() => s.item && onMaddeAc?.(s.item)}
                className={`w-full min-h-11 py-2 flex items-center gap-2.5 text-left ${tiklanir ? 'cursor-pointer hover:bg-[#F6F1E7] dark:hover:bg-[#202E5C]' : 'cursor-default'} rounded-lg px-1`}>
                {s.tamam
                  ? <Check className="w-4 h-4 shrink-0 text-[#2F7A45] dark:text-[#9FD3A9]" />
                  : <span className="w-4 h-4 shrink-0 rounded-full border-2 border-[#F26B6F]" />}
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] truncate ${YAZI}`}>{s.ad}</span>
                  <span className={`block text-[11px] truncate ${s.tamam ? IKINCIL : 'text-[#D6484C] dark:text-[#F26B6F]'}`}>{s.not}</span>
                </span>
                {tiklanir && <ChevronRight className={`w-4 h-4 shrink-0 ${IKINCIL}`} />}
              </button>
            </li>
          );
        })}
        {satirlar.length === 0 && <li className={`py-2 text-[12px] ${IKINCIL}`}>Listede bir şey yok.</li>}
      </ul>
    </div>
  );
};

export default DurumListesi;
