import React from 'react';
import { MERCH_ASAMALARI, yuzde, type DurumOranlari } from '../../lib/durumOranlari';
import { KART, YAZI, IKINCIL } from './stil';

/**
 * Yüzde şeridi (Paket 4). Ana sayfada küçük kartlar; Durum sayfasında
 * aynı kartlar sayılarıyla birlikte büyük. Her kart kendi sayfasına gider.
 */

export type SeritHedefi = 'kunye' | 'merch' | 'kitap' | 'harita' | 'bosluk';

const RENK: Record<SeritHedefi, string> = {
  kunye: '#F26B6F',
  merch: '#F26B6F',
  kitap: '#4A7A62',
  harita: '#0E1C4F',
  bosluk: '#C9A24B'
};
const ASAMA_RENGI = ['#CFC5B4', '#C9A24B', '#F26B6F', '#0E1C4F'];

const Halka: React.FC<{ oran: number | null; renk: string }> = ({ oran, renk }) => (
  <div
    className="relative w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
    style={{ background: oran === null ? 'var(--halka-bos)' : `conic-gradient(${renk} 0 ${oran}%, var(--halka-bos) 0)` }}
  >
    <span className={`w-[34px] h-[34px] rounded-full bg-[#FAF8F5] dark:bg-[#13204A] flex items-center justify-center text-[11px] font-bold tabular-nums ${YAZI}`}>
      {oran === null ? '–' : oran}
    </span>
  </div>
);

interface Props {
  oranlar: DurumOranlari;
  onSec: (h: SeritHedefi) => void;
  /** Durum sayfasında: sayılar da yazılır */
  ayrintili?: boolean;
}

export const YuzdeSeridi: React.FC<Props> = ({ oranlar: o, onSec, ayrintili = false }) => {
  const kartlar: Array<{ id: SeritHedefi; ad: string; oran: number | null; alt: string; ayrinti: string }> = [
    {
      id: 'kunye', ad: 'Künye', oran: yuzde(o.kunye.dolu, o.kunye.toplam),
      alt: 'viki maddelerinin doluluğu',
      ayrinti: `${o.kunye.madde} maddede ${o.kunye.toplam} künye alanı, ${o.kunye.dolu} dolu`
    },
    {
      id: 'kitap', ad: 'Kitap', oran: o.kitap.oran,
      alt: o.kitap.bolum ? `${o.kitap.bolum} bölüm` : 'bölüm yok',
      ayrinti: 'taslak %20 · yazıldı %70 · düzeltildi %100 sayılır'
    },
    {
      id: 'harita', ad: 'Harita', oran: yuzde(o.harita.dolu, o.harita.toplam),
      alt: 'maddesi olan yapılar',
      ayrinti: `${o.harita.toplam} yapıdan ${o.harita.dolu} tanesinin maddesi var`
    },
    {
      id: 'bosluk', ad: 'Boşluklar', oran: yuzde(o.bosluk.dolu, o.bosluk.toplam),
      alt: 'doldurulan alanlar',
      ayrinti: `${o.bosluk.toplam} alandan ${o.bosluk.toplam - o.bosluk.dolu} tanesi boş`
    }
  ];

  const merch = (
    <button
      key="merch"
      type="button"
      onClick={() => onSec('merch')}
      className={`${KART} p-3 text-left hover:border-[#F26B6F] cursor-pointer min-w-0 col-span-2 sm:col-span-1`}
    >
      <b className={`block text-[13px] ${YAZI}`}>Merch</b>
      <span className={`block text-[11px] ${IKINCIL} truncate`}>
        {o.merch.toplam ? `${o.merch.toplam} ürün · Konsept → Satışta` : 'ürün yok'}
      </span>
      <span className="mt-1.5 flex h-1.5 rounded-full overflow-hidden bg-[var(--halka-bos)]">
        {o.merch.toplam > 0 && MERCH_ASAMALARI.map((a, i) => (
          <i key={a} style={{ width: `${(o.merch.asamalar[a] / o.merch.toplam) * 100}%`, background: ASAMA_RENGI[i] }} />
        ))}
      </span>
      {ayrintili && (
        <span className={`mt-2 grid grid-cols-2 gap-x-3 text-[11px] ${IKINCIL}`}>
          {MERCH_ASAMALARI.map((a, i) => (
            <span key={a} className="flex items-center gap-1.5">
              <i className="w-2 h-2 rounded-full" style={{ background: ASAMA_RENGI[i] }} />
              {a}: <b className={YAZI}>{o.merch.asamalar[a]}</b>
            </span>
          ))}
        </span>
      )}
    </button>
  );

  const kart = (k: typeof kartlar[number]) => (
    <button
      key={k.id}
      type="button"
      onClick={() => onSec(k.id)}
      className={`${KART} p-3 text-left hover:border-[#F26B6F] cursor-pointer min-w-0 flex items-center gap-3 ${k.id === 'kunye' ? 'col-span-2 sm:col-span-1' : ''}`}
    >
      <Halka oran={k.oran} renk={RENK[k.id]} />
      <span className="min-w-0">
        <b className={`block text-[13px] ${YAZI}`}>{k.ad}</b>
        <span className={`block text-[11px] leading-snug ${IKINCIL}`}>{k.alt}</span>
        {ayrintili && <span className={`block mt-1 text-[11px] leading-snug ${IKINCIL}`}>{k.ayrinti}</span>}
      </span>
    </button>
  );

  return (
    <div className="[--halka-bos:#E4DCCD] dark:[--halka-bos:#2C3C72] grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
      {kart(kartlar[0])}
      {merch}
      {kartlar.slice(1).map(kart)}
    </div>
  );
};

export default YuzdeSeridi;
