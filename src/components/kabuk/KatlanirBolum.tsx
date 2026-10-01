import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Masaüstü genişliğinde mi (Tailwind lg: 1024 px) */
export function useMasaustu(): boolean {
  const sorgu = '(min-width: 1024px)';
  const [masa, setMasa] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(sorgu).matches);
  useEffect(() => {
    const m = window.matchMedia?.(sorgu);
    if (!m) return;
    const degis = () => setMasa(m.matches);
    m.addEventListener('change', degis);
    return () => m.removeEventListener('change', degis);
  }, []);
  return !!masa;
}

/**
 * Katlanır bölüm (1 Ekim, K-4 Katlama; Kemal: "uzun sayfalar kısalsın,
 * boş bölümler tek satır"). Telefonda kapalı başlar, başlığa dokununca
 * açılır; masaüstünde açık. Boşsa tek satır "boş · ekle" — boş olduğu yine
 * görünür. Düzenlerken her zaman açık.
 */
export const KatlanirBolum: React.FC<{
  baslik: React.ReactNode;
  /** Başlığın sağında duran küçük düğme (ör. "Stüdyoda aç") */
  ek?: React.ReactNode;
  bos?: boolean;
  duzenleniyor?: boolean;
  onEkle?: () => void;
  children: React.ReactNode;
}> = ({ baslik, ek, bos, duzenleniyor, onEkle, children }) => {
  const masa = useMasaustu();
  const [acik, setAcik] = useState<boolean | null>(null);
  const BASLIK = 'text-[11px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] tracking-wider font-bold';

  if (duzenleniyor) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-2"><h4 className={BASLIK}>{baslik}</h4>{ek}</div>
        {children}
      </div>
    );
  }
  if (bos) {
    return (
      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed border-[#CFC5B4] dark:border-[#2C3C72]">
        <h4 className={BASLIK}>{baslik}</h4>
        <span className="flex items-center gap-3">
          {ek}
          {onEkle && (
            <button type="button" onClick={onEkle} className="whitespace-nowrap text-[12px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#F26B6F] cursor-pointer">boş · ekle</button>
          )}
        </span>
      </div>
    );
  }
  const gorunur = acik ?? masa;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <button type="button" onClick={() => setAcik(!gorunur)} aria-expanded={gorunur} className={`flex items-center gap-1.5 cursor-pointer ${BASLIK}`}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${gorunur ? '' : '-rotate-90'}`} />
          {baslik}
        </button>
        {ek}
      </div>
      {gorunur && children}
    </div>
  );
};

export default KatlanirBolum;
