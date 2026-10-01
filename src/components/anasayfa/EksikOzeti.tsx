import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Eksik } from '../../lib/eksikler';
import { ETIKET, IKINCIL, KART, YAZI } from './stil';

/**
 * Neyin eksik — ana sayfadaki kısa hâli (Paket 4). En çok işi olan dört
 * başlık ve bekleyen tek seferlik düğmeler. Satıra basınca Neyin Eksik
 * sayfası o başlığın listesi açık gelir.
 */

interface Props {
  eksikler: Eksik[];
  dugmeler: string[];
  onAc: (anahtar: string | null) => void;
}

export const EksikOzeti: React.FC<Props> = ({ eksikler, dugmeler, onAc }) => {
  const satirlar = [...eksikler].sort((a, b) => b.sayi - a.sayi).slice(0, dugmeler.length ? 3 : 4);
  return (
    <section className={`${KART} p-4`}>
      <div className="flex items-center justify-between">
        <div className={ETIKET}>Eksikler</div>
        <button type="button" onClick={() => onAc(null)} className="text-[11px] font-mono text-[#D6484C] dark:text-[#F26B6F] hover:underline cursor-pointer">
          tümü
        </button>
      </div>
      {!satirlar.length && !dugmeler.length && (
        <p className={`mt-3 text-[12px] ${IKINCIL}`}>Takip ettiğim eksik kalmadı.</p>
      )}
      <ul className="mt-2">
        {dugmeler.length > 0 && (
          <li className="border-t border-[#CFC5B4]/70 dark:border-[#2C3C72]">
            <button type="button" onClick={() => onAc(null)} className="w-full flex items-start gap-3 py-2.5 text-left cursor-pointer">
              <b className="w-9 shrink-0 font-mono text-[16px] text-[#D6484C] dark:text-[#F26B6F] tabular-nums">{dugmeler.length}</b>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13px] ${YAZI}`}>tek seferlik düğme bekliyor</span>
                <span className={`block text-[11px] truncate ${IKINCIL}`}>{dugmeler.join(' · ')}</span>
              </span>
              <ChevronRight className="w-4 h-4 mt-0.5 text-[#CFC5B4] shrink-0" />
            </button>
          </li>
        )}
        {satirlar.map(e => (
          <li key={e.anahtar} className="border-t border-[#CFC5B4]/70 dark:border-[#2C3C72]">
            <button type="button" onClick={() => onAc(e.anahtar)} className="w-full flex items-start gap-3 py-2.5 text-left cursor-pointer">
              <b className="w-9 shrink-0 font-mono text-[16px] text-[#D6484C] dark:text-[#F26B6F] tabular-nums">{e.sayi}</b>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13px] ${YAZI}`}>{e.baslik}</span>
                <span className={`block text-[11px] truncate ${IKINCIL}`}>{e.aciklama}</span>
              </span>
              <ChevronRight className="w-4 h-4 mt-0.5 text-[#CFC5B4] shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default EksikOzeti;
