import React, { useMemo, useState } from 'react';
import { Check, Mail, Save } from 'lucide-react';
import type { Item } from '../../types';
import type { DurumOranlari } from '../../lib/durumOranlari';
import { yuzde } from '../../lib/durumOranlari';
import { YOL_HARITASI, acikIsler, gmailBaglantisi, haftalikOzet, kkmAyari, kkmAyariniYaz, type KkmAyari } from '../../lib/yolHaritasi';
import { DUGME_BOS, DUGME_LAC, ETIKET, IKINCIL, KART, YAZI } from './stil';

/**
 * Durum'un üst kısmı (yapisal-4, 39 ve küçükler):
 *   - Sıradaki 3 iş: yol haritasının baştaki açık üçü
 *   - Hedefler: her yüzde için Kemal'in hedefi (kaydedince durur)
 *   - Yol haritası: karar verilmiş, uygulamada henüz olmayan işler
 *   - Haftalık özet: Kemal'in Gmail'inde hazır ileti
 */

interface Props {
  items: Item[];
  oranlar: DurumOranlari;
  eposta?: string | null;
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export const KkmPaneli: React.FC<Props> = ({ items, oranlar: o, eposta, onUpdateItem, onAddItem }) => {
  const kayitli = useMemo(() => kkmAyari(items), [items]);
  const [hedef, setHedef] = useState<Record<string, number>>(kayitli.hedefler);
  const [ozetAcik, setOzetAcik] = useState(false);
  const acik = acikIsler(kayitli.bitenler);

  const yaz = async (a: KkmAyari) => {
    const s = kkmAyariniYaz(items, a);
    if (s.guncel) await onUpdateItem(s.guncel);
    if (s.yeni) await onAddItem(s.yeni);
  };

  const OLCULER = [
    { id: 'kunye', ad: 'Künye', simdi: yuzde(o.kunye.dolu, o.kunye.toplam) },
    { id: 'kitap', ad: 'Kitap', simdi: o.kitap.oran },
    { id: 'harita', ad: 'Harita', simdi: yuzde(o.harita.dolu, o.harita.toplam) },
    { id: 'bosluk', ad: 'Boşluklar', simdi: yuzde(o.bosluk.dolu, o.bosluk.toplam) }
  ];
  const hedefDegisti = JSON.stringify(hedef) !== JSON.stringify(kayitli.hedefler);
  const ozet = useMemo(() => haftalikOzet(items), [items]);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <section className={`${KART} p-4`}>
        <div className={ETIKET}>Sıradaki 3 iş</div>
        <ol className="mt-2 space-y-2">
          {acik.slice(0, 3).map((i, n) => (
            <li key={i.id} className="flex gap-2">
              <b className="font-mono text-[#F26B6F] text-[13px]">{n + 1}</b>
              <span className={`text-[13px] leading-snug ${YAZI}`}>{i.ad}<span className={`block text-[11px] ${IKINCIL}`}>{i.kimde === 'kemal' ? 'senin kararın' : 'kodla yapılacak'} · {i.nereden}</span></span>
            </li>
          ))}
          {acik.length === 0 && <li className={`text-[12px] ${IKINCIL}`}>Yol haritası boş.</li>}
        </ol>
      </section>

      <section className={`${KART} p-4`}>
        <div className={ETIKET}>Hedefler</div>
        <ul className="mt-2 space-y-2">
          {OLCULER.map(m => {
            const h = hedef[m.id];
            return (
              <li key={m.id}>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className={`w-20 ${YAZI}`}>{m.ad}</span>
                  <span className={`font-mono ${IKINCIL}`}>%{m.simdi ?? '–'}</span>
                  <span className={`ml-auto ${IKINCIL}`}>hedef %</span>
                  <input type="number" min={0} max={100} value={h ?? ''} placeholder="–"
                    onChange={e => setHedef(x => { const y = { ...x }; if (e.target.value === '') delete y[m.id]; else y[m.id] = Math.max(0, Math.min(100, Number(e.target.value))); return y; })}
                    className={`w-14 text-right text-[12px] font-mono bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded px-1.5 py-0.5 ${YAZI}`} />
                </div>
                {typeof h === 'number' && (
                  <div className="mt-1 h-1.5 rounded-full bg-[#E4DCCD] dark:bg-[#2C3C72] overflow-hidden">
                    <i className="block h-full bg-[#F26B6F]" style={{ width: `${Math.min(100, ((m.simdi ?? 0) / Math.max(1, h)) * 100)}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" disabled={!hedefDegisti} onClick={() => void yaz({ ...kayitli, hedefler: hedef })} className={`mt-3 ${DUGME_LAC} inline-flex items-center gap-1`}>
          <Save className="w-3.5 h-3.5" /> Hedefleri kaydet
        </button>
      </section>

      <section className={`${KART} p-4`}>
        <div className={ETIKET}>Haftalık özet</div>
        <p className={`mt-1 text-[12px] ${IKINCIL}`}>Son 7 günün özeti. "Gmail'de aç" kendi hesabında yeni ileti açar; göndermek senin elinde.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setOzetAcik(a => !a)} className={DUGME_BOS}>{ozetAcik ? 'Gizle' : 'Özeti gör'}</button>
          {eposta && (
            <a href={gmailBaglantisi(eposta, ozet.konu, ozet.metin)} target="_blank" rel="noreferrer" className={`${DUGME_LAC} inline-flex items-center gap-1`}>
              <Mail className="w-3.5 h-3.5" /> Gmail'de aç
            </a>
          )}
        </div>
        {!eposta && <p className={`mt-2 text-[11px] ${IKINCIL}`}>Google ile bağlanınca açılır.</p>}
        {ozetAcik && <pre className={`mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed font-sans rounded-lg bg-white dark:bg-[#17345A] p-2 ${YAZI}`}>{ozet.metin}</pre>}
      </section>

      <section id="yol-haritasi" className={`${KART} p-4 lg:col-span-3 scroll-mt-24`}>
        <div className="flex items-center justify-between">
          <div className={ETIKET}>Yol haritası · karar verildi, uygulamada henüz yok</div>
          <span className={`text-[11px] ${IKINCIL}`}>{acik.length}/{YOL_HARITASI.length} açık</span>
        </div>
        <ul className="mt-2 divide-y divide-[#E4DCCD] dark:divide-[#2C3C72]">
          {acik.map(i => (
            <li key={i.id} className="py-2 flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${i.kimde === 'kemal' ? 'bg-[#F26B6F]/15 text-[#D6484C]' : 'bg-[#0E1C4F]/10 text-[#0E1C4F] dark:bg-[#2C3C72] dark:text-[#F3EFE8]'}`}>{i.kimde === 'kemal' ? 'SEN' : 'KOD'}</span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13px] ${YAZI}`}>{i.ad}</span>
                <span className={`block text-[11px] ${IKINCIL}`}>{i.nereden}{i.not ? ` · ${i.not}` : ''}</span>
              </span>
              <button type="button" title="Bitti olarak işaretle" onClick={() => void yaz({ ...kayitli, bitenler: [...kayitli.bitenler, i.id] })} className={`${DUGME_BOS} inline-flex items-center gap-1 shrink-0`}>
                <Check className="w-3 h-3" /> tamam
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default KkmPaneli;
