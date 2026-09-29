import React, { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { CANVA_AYNASI, type CanvaTasarimi } from '../../data/canvaAynasi';

/**
 * Canva aynası (Paket 5): Kemal'in Canva'daki Kems / Düzada tasarımları.
 * Kart tıklanınca tasarım Canva'da açılır. Küçük resim açılamazsa yalnız
 * başlık kalır.
 */

const TUR_ADI: Record<CanvaTasarimi['tur'], string> = {
  viki: 'Viki', site: 'Site', 'mekân': 'Mekân', merch: 'Merch', marka: 'Marka', harita: 'Harita'
};

export const CanvaAynasi: React.FC = () => {
  const [tur, setTur] = useState<CanvaTasarimi['tur'] | 'hepsi'>('hepsi');
  const [bozuk, setBozuk] = useState<Set<string>>(new Set());
  const turler = useMemo(() => [...new Set(CANVA_AYNASI.map(t => t.tur))], []);
  const liste = CANVA_AYNASI.filter(t => tur === 'hepsi' || t.tur === tur);

  const cip = (aktif: boolean) => `px-3 py-1 rounded-full text-[11px] border cursor-pointer ${aktif
    ? 'border-[#F26B6F] text-[#D6484C] dark:text-[#F26B6F]'
    : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9]'}`;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={() => setTur('hepsi')} className={cip(tur === 'hepsi')}>Hepsi ({CANVA_AYNASI.length})</button>
        {turler.map(t => (
          <button key={t} type="button" onClick={() => setTur(t)} className={cip(tur === t)}>
            {TUR_ADI[t]} ({CANVA_AYNASI.filter(x => x.tur === t).length})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {liste.map(t => (
          <a
            key={t.id}
            href={t.adres}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] overflow-hidden hover:border-[#F26B6F]"
          >
            <div className="aspect-[4/3] bg-[#F3EFE8] dark:bg-[#17345A] flex items-center justify-center overflow-hidden">
              {bozuk.has(t.id) ? (
                <span className="px-3 text-center text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Küçük resim yok · Canva'da aç</span>
              ) : (
                <img
                  src={t.kucukResim}
                  alt={t.baslik}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setBozuk(b => new Set(b).add(t.id))}
                  className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform"
                />
              )}
            </div>
            <div className="px-3 py-2">
              <p className="text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] truncate">{t.baslik}</p>
              <p className="flex items-center gap-1 text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9]">
                {TUR_ADI[t.tur]} · {new Date(t.guncelleme * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                <ExternalLink className="w-3 h-3 ml-auto text-[#D6484C] dark:text-[#F26B6F]" />
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CanvaAynasi;
