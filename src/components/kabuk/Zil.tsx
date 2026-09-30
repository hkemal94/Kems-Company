import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import type { Item } from '../../types';
import type { Bildirim } from '../../lib/bildirimler';

/**
 * Bildirim zili (Paket 4). Kırmızı sayı: bekleyen iş türü sayısı.
 * Açılınca her satır ilgili yere götürür.
 */

interface Props {
  bildirimler: Bildirim[];
  onSec: (b: Bildirim, madde?: Item) => void;
  /** Masaüstü rayında yukarı değil sağa açılır */
  yon?: 'asagi' | 'sag';
}

export const Zil: React.FC<Props> = ({ bildirimler, onSec, yon = 'asagi' }) => {
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
        className={`relative flex items-center justify-center cursor-pointer ${yon === 'sag'
          ? 'w-11 h-11 rounded-xl text-[#A6B0C9] hover:text-white hover:bg-white/10'
          : 'w-11 h-11 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
      >
        <Bell className="w-[18px] h-[18px]" />
        {bildirimler.length > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#F26B6F] text-white text-[9px] font-bold leading-4 text-center">
            {bildirimler.length}
          </span>
        )}
      </button>
      {acik && (
        <div className={`absolute z-50 w-[min(88vw,320px)] rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] shadow-xl p-2 ${yon === 'sag' ? 'fixed left-[15.5rem] bottom-4' : 'right-0 top-full mt-2'}`}>
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
              {b.maddeler?.map(m => (
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
