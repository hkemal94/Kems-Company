import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import type { Item } from '../../types';
import type { Bildirim, KanonSatiri } from '../../lib/bildirimler';

/**
 * Bildirim zili (Paket 4). Kırmızı sayı: bekleyen iş türü sayısı.
 * Açılınca her satır ilgili yere götürür.
 */

interface Props {
  bildirimler: Bildirim[];
  onSec: (b: Bildirim, madde?: Item) => void;
  /** Masaüstü rayında yukarı değil sağa açılır */
  yon?: 'asagi' | 'sag';
  /** Masaüstü rayında simgenin yanındaki yazı; verilirse bütün satır düğme olur */
  etiket?: React.ReactNode;
  /** Kanon uyarısında "Yanlış alarm": maddeye yazılır, bir daha gösterilmez */
  onKanonYoksay?: (s: KanonSatiri) => void;
}

export const Zil: React.FC<Props> = ({ bildirimler, onSec, yon = 'asagi', etiket, onKanonYoksay }) => {
  const [acik, setAcik] = useState(false);
  const kutu = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!acik) return;
    const kapat = (e: MouseEvent) => { if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false); };
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('mousedown', kapat);
    window.addEventListener('keydown', tus);
    return () => { document.removeEventListener('mousedown', kapat); window.removeEventListener('keydown', tus); };
  }, [acik]);

  const sec = (b: Bildirim, m?: Item) => { setAcik(false); onSec(b, m); };

  return (
    <div ref={kutu} className="relative">
      <button
        type="button"
        onClick={() => setAcik(a => !a)}
        title={bildirimler.length ? `${bildirimler.length} bildirim` : 'Bildirim yok'}
        className={`relative flex items-center cursor-pointer ${etiket
          ? 'w-full h-11 gap-3 px-3 rounded-xl text-[#A6B0C9] hover:text-white hover:bg-white/10'
          : yon === 'sag'
          ? 'justify-center w-11 h-11 rounded-xl text-[#A6B0C9] hover:text-white hover:bg-white/10'
          : 'justify-center w-11 h-11 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
      >
        <Bell className="w-[18px] h-[18px] shrink-0" />
        {etiket}
        {bildirimler.length > 0 && (
          <span className={`absolute top-1.5 ${etiket ? 'left-6' : 'right-1.5'} min-w-4 h-4 px-1 rounded-full bg-[#F26B6F] text-white text-[9px] font-bold leading-4 text-center`}>
            {bildirimler.length}
          </span>
        )}
      </button>
      {acik && (
        <div className={`z-50 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] shadow-xl p-2 max-h-[75vh] overflow-y-auto ${yon === 'sag' ? 'fixed left-60 bottom-4 w-[340px]' : 'fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px]'}`}>
          <div className="px-2 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#6A5E4C] dark:text-[#A6B0C9]">Bildirimler</div>
          {bildirimler.length === 0 && (
            <p className="px-2 py-2 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bekleyen bir şey yok.</p>
          )}
          {bildirimler.map(b => (
            <div key={b.tur} className="border-t border-[#CFC5B4]/60 dark:border-[#2C3C72] first-of-type:border-0">
              <button type="button" onClick={() => sec(b)} className="w-full flex items-start gap-2.5 px-2 py-2 text-left rounded-lg hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer">
                <b className="w-6 shrink-0 font-mono text-[14px] text-[#D6484C] dark:text-[#F26B6F] tabular-nums">{b.sayi}</b>
                <span className="min-w-0">
                  <span className="block text-[13px] text-[#0E1C4F] dark:text-[#F3EFE8]">{b.baslik}</span>
                  <span className="block text-[11px] leading-snug text-[#6A5E4C] dark:text-[#A6B0C9] line-clamp-2">{b.ayrinti}</span>
                </span>
              </button>
              {b.kanon ? b.kanon.map(k => (
                // Kanon: neyin çeliştiği yan yana (2 Ekim, Kemal: "düzeltmemin yolunu bulamıyorum")
                <div key={`${k.madde.id}|${k.uyari.anahtar}`} className="ml-8 mr-1 mb-2 p-2 rounded-lg border border-[#CFC5B4]/70 dark:border-[#2C3C72] text-[12px]">
                  <b className="block text-[#0E1C4F] dark:text-[#F3EFE8]">{k.madde.title}</b>
                  <span className="block mt-1 text-[#6A5E4C] dark:text-[#A6B0C9] italic leading-snug">“{k.uyari.alinti}”</span>
                  <span className="block mt-1 text-[#0E1C4F] dark:text-[#F3EFE8] leading-snug"><b className="text-[#D6484C] dark:text-[#F26B6F]">{k.uyari.yil}</b> · Kanonda: {k.uyari.kural.not}</span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => sec(b, k.madde)} className="px-2.5 py-1 rounded-md bg-[#0E1C4F] dark:bg-[#2C3C72] text-white text-[11px] font-semibold cursor-pointer">Maddeyi aç</button>
                    {onKanonYoksay && (
                      <button type="button" onClick={() => onKanonYoksay(k)} className="px-2.5 py-1 rounded-md border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] cursor-pointer">Yanlış alarm, bir daha gösterme</button>
                    )}
                  </span>
                </div>
              )) : b.maddeler?.map(m => (
                <button key={m.id} type="button" onClick={() => sec(b, m)} className="w-full pl-10 pr-2 py-1 text-left text-[12px] text-[#0E1C4F] dark:text-[#F3EFE8] hover:underline cursor-pointer truncate">
                  {m.title}
                </button>
              ))}
            </div>
          ))}
          <p className="px-2 pt-2 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">Şimdilik yalnız uygulama içinde; telefon bildirimi ayrı bir iş.</p>
        </div>
      )}
    </div>
  );
};

export default Zil;
