import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Item, ItemType } from '../../types';
import { ONERI_TURU_ADI, maddeOnerileri, oneridenMadde, reddedilenler, reddiYaz, type MaddeOnerisi, type OneriTuru } from '../../lib/maddeOnerileri';

/**
 * Madde önerileri sayfası (4. gece). Künyende ve yazılarında adı geçen
 * ama maddesi olmayan yapılar, yerler, kurumlar ve aileler. "Madde aç"
 * adı ve türüyle boş bir madde açar; "Önerme" adı bir daha önermez.
 */

interface Props {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onNavigate: (id: string) => void;
  onKapat: () => void;
}

const TURLER: OneriTuru[] = ['mekân', 'yer', 'cadde', 'meydan', 'yer_adi', 'kulüp', 'aile'];
const CIP = (secili: boolean) => `min-h-8 px-2.5 py-0.5 rounded-full text-[11px] border cursor-pointer ${secili
  ? 'bg-lacivert text-krem border-transparent dark:bg-[#2C3C72]'
  : 'border-bej/80 dark:border-lacivert-600 text-gri dark:text-bej/85 hover:border-kiremit'}`;

export const MaddeOnerileri: React.FC<Props> = ({ items, onAddItem, onUpdateItem, onNavigate, onKapat }) => {
  const oneriler = useMemo(() => maddeOnerileri(items, reddedilenler(items)), [items]);
  const [suzgec, setSuzgec] = useState<OneriTuru | null>(null);
  /** Kemal'in değiştirdiği tür (öneri anahtarı → tür) */
  const [tur, setTur] = useState<Record<string, OneriTuru>>({});
  const [yaziliyor, setYaziliyor] = useState<string | null>(null);
  const [hata, setHata] = useState('');
  const gorunen = oneriler.filter(o => !suzgec || (tur[o.ad] || o.tur) === suzgec);

  const calistir = async (ad: string, f: () => Promise<void>) => {
    setYaziliyor(ad); setHata('');
    try { await f(); } catch { setHata('Kaydedilemedi; yeniden dene.'); } finally { setYaziliyor(null); }
  };
  const ac = (o: MaddeOnerisi) => calistir(o.ad, async () => {
    const id = `madde_${Date.now()}`;
    await onAddItem({ id, ...oneridenMadde(o, (tur[o.ad] || o.tur) as ItemType) });
    onNavigate(id);
  });
  const onerme = (o: MaddeOnerisi) => calistir(o.ad, async () => {
    const r = reddiYaz(items, o.ad);
    if (r.guncel) await onUpdateItem(r.guncel);
    else if (r.yeni) await onAddItem(r.yeni);
  });

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-3xl tracking-tight">Madde önerileri</h1>
          <p className="mt-1 text-[14px] text-gri dark:text-bej/85 max-w-2xl leading-relaxed">
            Künyende ve yazılarında (viki, kitap, yazılar, fanzin, notlar) adı geçen ama henüz maddesi olmayan yapılar, yerler,
            kurumlar ve aileler. Adlar senin yazdığın gibi; <b>Madde aç</b> adıyla boş bir madde açar, metnini sen yazarsın.
          </p>
        </div>
        <button type="button" onClick={onKapat} aria-label="Kapat" className="p-2 text-gri hover:text-lacivert dark:text-bej/85"><X size={18} /></button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setSuzgec(null)} className={CIP(suzgec === null)}>Hepsi · {oneriler.length}</button>
        {TURLER.map(t => {
          const n = oneriler.filter(o => (tur[o.ad] || o.tur) === t).length;
          return n ? <button key={t} type="button" onClick={() => setSuzgec(s => (s === t ? null : t))} className={CIP(suzgec === t)}>{ONERI_TURU_ADI[t]} · {n}</button> : null;
        })}
      </div>

      {hata && <p className="text-[12px] text-kiremit">{hata}</p>}
      {!gorunen.length && <p className="text-[13px] text-gri dark:text-bej/80">Önerilecek madde yok: yazılarında geçen her adın maddesi var.</p>}

      <ul className="divide-y divide-bej/50 dark:divide-lacivert-600/50">
        {gorunen.map(o => (
          <li key={o.ad} className="py-3 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[14rem]">
              <div className="text-[15px] font-semibold">{o.ad}</div>
              <div className="mt-0.5 text-[12px] text-gri dark:text-bej/80">
                {o.sayi} kez geçiyor:{' '}
                {o.kaynaklar.slice(0, 4).map((k, n) => (
                  <React.Fragment key={k.id}>
                    {n > 0 && ', '}
                    <button type="button" onClick={() => onNavigate(k.id)} className="underline decoration-lacivert/30 underline-offset-2 hover:decoration-lacivert">{k.ad}</button>
                  </React.Fragment>
                ))}
                {o.kaynaklar.length > 4 && ` ve ${o.kaynaklar.length - 4} yer daha`}
              </div>
            </div>
            <select value={tur[o.ad] || o.tur} onChange={e => setTur(t => ({ ...t, [o.ad]: e.target.value as OneriTuru }))} aria-label="Türü"
              className="text-[12px] bg-white dark:bg-lacivert-800/60 border border-bej/70 dark:border-lacivert-600/60 rounded px-2 py-1.5">
              {TURLER.map(t => <option key={t} value={t}>{ONERI_TURU_ADI[t]}</option>)}
            </select>
            <button type="button" disabled={yaziliyor !== null} onClick={() => void ac(o)}
              className="inline-flex items-center gap-1 text-[12px] font-mono px-3 py-1.5 rounded bg-lacivert text-krem dark:bg-[#2C3C72] disabled:opacity-40">
              <Plus size={13} /> Madde aç
            </button>
            <button type="button" disabled={yaziliyor !== null} onClick={() => void onerme(o)} title="Bu adı bir daha önerme"
              className="text-[12px] font-mono px-3 py-1.5 rounded border border-bej/70 hover:border-kiremit disabled:opacity-40">
              Önerme
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-gri dark:text-bej/75 leading-relaxed">
        Öneriler kayıtlardan her açılışta yeniden çıkar; yapay zekâ kullanılmaz. Bir kişinin adı önerilmez (yalnız yapılar, yerler, kurumlar ve aileler).
      </p>
    </section>
  );
};

export default MaddeOnerileri;
