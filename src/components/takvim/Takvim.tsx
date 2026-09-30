import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Item } from '../../types';
import { AY_ADLARI, GUN_KISA, ayIzgarasi, bugunTarih, tarihYaz } from '../../lib/sosyal';
import { takvimOlaylari, type TakvimOlayi, type TakvimTuru } from '../../lib/takvim';
import { DUGME_BOS, ETIKET, IKINCIL, YAZI } from '../anasayfa/stil';

/**
 * Genel Takvim (Araçlar; yapisal-4, 36). Droplar, sosyal medya gönderileri
 * ve ayın fanzin günü tek ayda. Salt okunur: bir şeye basınca kendi
 * sayfasında açılır (drop Merch'te, gönderi Sosyal medya'da).
 */

const TUR: Record<TakvimTuru, { ad: string; renk: string }> = {
  drop: { ad: 'Drop', renk: '#F26B6F' },
  gonderi: { ad: 'Gönderi', renk: '#3C7A89' },
  fanzin: { ad: 'Fanzin', renk: '#D18B2C' }
};

interface Props {
  items: Item[];
  onAc: (o: TakvimOlayi) => void;
}

export const Takvim: React.FC<Props> = ({ items, onAc }) => {
  const [ay, setAy] = useState(() => { const d = new Date(); return { y: d.getFullYear(), a: d.getMonth() }; });
  const [acik, setAcik] = useState<Record<TakvimTuru, boolean>>({ drop: true, gonderi: true, fanzin: true });
  const turler = (Object.keys(acik) as TakvimTuru[]).filter(t => acik[t]);
  const olaylar = useMemo(() => takvimOlaylari(items, ay.y, ay.a, turler), [items, ay, turler.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const bugun = bugunTarih();
  const ayDegis = (n: number) => setAy(x => { const d = new Date(x.y, x.a + n, 1); return { y: d.getFullYear(), a: d.getMonth() }; });

  const cip = (o: TakvimOlayi, ince = false) => (
    <button key={o.id} type="button" onClick={() => onAc(o)} title={`${TUR[o.tur].ad} · ${o.baslik}`}
      className={`w-full text-left rounded-md border-l-4 bg-white dark:bg-[#17345A] ${YAZI} hover:bg-[#F3EFE8] dark:hover:bg-[#1B2A5C] cursor-pointer ${ince ? 'px-1.5 py-0.5 text-[10.5px]' : 'px-2.5 py-1.5 text-[12px]'}`}
      style={{ borderLeftColor: TUR[o.tur].renk }}>
      <span className="block truncate font-semibold">{o.saat ? `${o.saat} · ` : ''}{o.baslik}</span>
      {!ince && <span className={`text-[10px] ${IKINCIL}`}>{TUR[o.tur].ad}</span>}
    </button>
  );

  const gunler = [...olaylar.keys()].sort();

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <div className={ETIKET}>Araçlar</div>
        <h1 className={`mt-1 text-[22px] lg:text-[28px] font-bold tracking-tight ${YAZI}`}>Takvim</h1>
        <p className={`mt-1 text-[13px] ${IKINCIL}`}>Drop çıkışları, sosyal medya gönderileri ve fanzin günü tek yerde. Drop tarihi Merch'te drop sayfasından girilir.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => ayDegis(-1)} title="Önceki ay" className={`w-9 h-9 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] flex items-center justify-center ${IKINCIL} cursor-pointer hover:border-[#F26B6F]`}><ChevronLeft className="w-4 h-4" /></button>
        <div className={`min-w-[150px] text-center text-[17px] font-bold ${YAZI}`}>{AY_ADLARI[ay.a]} {ay.y}</div>
        <button type="button" onClick={() => ayDegis(1)} title="Sonraki ay" className={`w-9 h-9 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] flex items-center justify-center ${IKINCIL} cursor-pointer hover:border-[#F26B6F]`}><ChevronRight className="w-4 h-4" /></button>
        <span className="flex-1" />
        {(Object.keys(TUR) as TakvimTuru[]).map(t => (
          <button key={t} type="button" onClick={() => setAcik(a => ({ ...a, [t]: !a[t] }))}
            className={`${DUGME_BOS} inline-flex items-center gap-1.5 ${acik[t] ? '' : 'opacity-45'}`}>
            <i className="w-2.5 h-2.5 rounded-full" style={{ background: TUR[t].renk }} /> {TUR[t].ad}
          </button>
        ))}
      </div>

      {/* masaüstü: ay ızgarası */}
      <div className="hidden lg:grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#CFC5B4] dark:bg-[#2C3C72]">
        {GUN_KISA.map(g => <div key={g} className={`bg-[#F3EFE8] dark:bg-[#17345A] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${IKINCIL}`}>{g}</div>)}
        {ayIzgarasi(ay.y, ay.a).map((gun, n) => {
          if (!gun) return <div key={`b${n}`} className="bg-[#EFE9DF] dark:bg-[#0F1A3D] min-h-[110px]" />;
          const t = tarihYaz(ay.y, ay.a, gun);
          return (
            <div key={t} className={`min-h-[110px] p-1.5 space-y-1 ${t < bugun ? 'bg-[#F7F4EF] dark:bg-[#111C42]' : 'bg-[#FAF8F5] dark:bg-[#13204A]'}`}>
              <span className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${t === bugun ? 'bg-[#F26B6F] text-white' : t < bugun ? 'text-[#B3A894] dark:text-[#6F7BA0]' : YAZI}`}>{gun}</span>
              {(olaylar.get(t) || []).map(o => cip(o, true))}
            </div>
          );
        })}
      </div>

      {/* telefon: dolu günler */}
      <div className="lg:hidden space-y-1">
        {gunler.length === 0 && <p className={`text-[13px] py-6 text-center ${IKINCIL}`}>Bu ay boş.</p>}
        {gunler.map(t => {
          const d = new Date(t + 'T12:00');
          return (
            <div key={t} className="flex gap-3">
              <div className="w-11 shrink-0 text-center pt-1.5">
                <div className={`text-[20px] font-bold leading-none ${t === bugun ? 'text-[#F26B6F]' : YAZI}`}>{d.getDate()}</div>
                <div className={`text-[10px] font-bold uppercase tracking-[0.1em] ${IKINCIL}`}>{GUN_KISA[(d.getDay() + 6) % 7]}</div>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 pb-2 border-b border-[#E4DCCD] dark:border-[#2C3C72]">
                {(olaylar.get(t) || []).map(o => cip(o))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Takvim;
