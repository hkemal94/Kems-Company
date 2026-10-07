import React, { useMemo, useState } from 'react';
import { Pin, X } from 'lucide-react';
import type { Item, ItemType } from '../../types';
import { TYPE_LABELS, schemaKeyFor, getKunyeFields } from './wikiSchema';
import { semaAlanlari, type SemaAlani } from '../../lib/alanSablonu';

/**
 * Maddeler tablo olarak (4. gece, vvd). Bir tür seçilir; satırlar o türün
 * maddeleri, sütunlar ad, üst madde ve türün künye alanları (alan
 * şablonundan). Hücreye yazıp çıkınca (ya da Enter) yalnız o madde yazılır;
 * değişmeyen hücre yazılmaz.
 */

interface Props {
  maddeler: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onNavigate: (id: string) => void;
  onKapat: () => void;
}

const TURLER: ItemType[] = ['kisi', 'aile', 'mekân', 'dükkân', 'yer', 'kulüp', 'marka', 'olay', 'ürün'];
const HUCRE = 'w-full min-w-[9rem] bg-transparent px-2 py-1.5 text-[13px] rounded border border-transparent hover:border-bej/70 focus:border-kiremit focus:bg-white dark:focus:bg-lacivert-800 focus:outline-hidden';

/** "metadata.profile.x" yoluna değer yazılmış yeni kayıt (Firestore: undefined yok) */
function yolaYaz(item: Item, yol: string, deger: string): Item {
  if (yol === 'title') return { ...item, title: deger || item.title };
  const parcalar = yol.split('.');
  const kok: Record<string, unknown> = { ...(item as unknown as Record<string, unknown>) };
  let o = kok;
  for (let k = 0; k < parcalar.length - 1; k++) {
    const p = parcalar[k];
    o[p] = { ...((o[p] as Record<string, unknown>) || {}) };
    o = o[p] as Record<string, unknown>;
  }
  o[parcalar[parcalar.length - 1]] = deger;
  return { ...(kok as unknown as Item), updatedAt: Date.now() };
}

const Hucre: React.FC<{ deger: string; yaz: (v: string) => Promise<void>; etiket: string }> = ({ deger, yaz, etiket }) => {
  const [v, setV] = useState(deger);
  const [durum, setDurum] = useState<'' | 'yaziliyor' | 'hata'>('');
  React.useEffect(() => setV(deger), [deger]);
  const bitir = async () => {
    if (v.trim() === deger.trim()) return;
    setDurum('yaziliyor');
    try { await yaz(v.trim()); setDurum(''); } catch { setDurum('hata'); }
  };
  return (
    <input value={v} aria-label={etiket} onChange={e => setV(e.target.value)} onBlur={() => void bitir()}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setV(deger); }}
      title={durum === 'hata' ? 'Kaydedilemedi' : undefined}
      className={`${HUCRE} ${durum === 'yaziliyor' ? 'opacity-60' : ''} ${durum === 'hata' ? 'border-kiremit' : ''}`} />
  );
};

export const MaddeTablosu: React.FC<Props> = ({ maddeler, onUpdateItem, onNavigate, onKapat }) => {
  const sayilar = useMemo(() => new Map(TURLER.map(t => [t, maddeler.filter(i => i.type === t || (t === 'kisi' && i.type === 'karakter')).length])), [maddeler]);
  const [tur, setTur] = useState<ItemType>(() => TURLER.find(t => (sayilar.get(t) || 0) > 0) || 'kisi');
  const [suz, setSuz] = useState('');
  const sutunlar: SemaAlani[] = useMemo(() => semaAlanlari(schemaKeyFor(tur) || '').filter(f => f.fieldPath !== 'title' && f.fieldPath !== 'notes'), [tur]);
  const satirlar = useMemo(() => {
    const q = suz.trim().toLocaleLowerCase('tr');
    return maddeler
      .filter(i => i.type === tur || (tur === 'kisi' && i.type === 'karakter'))
      .filter(i => !q || i.title.toLocaleLowerCase('tr').includes(q))
      .sort((a, b) => Number(b.metadata?.sabit === true) - Number(a.metadata?.sabit === true) || a.title.localeCompare(b.title, 'tr'));
  }, [maddeler, tur, suz]);
  const ad = (id?: string) => maddeler.find(i => i.id === id)?.title || '';

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-3xl tracking-tight">Maddeler tablosu</h1>
          <p className="mt-1 text-[14px] text-gri dark:text-bej/85 max-w-2xl leading-relaxed">
            Bir tür seç; künye alanları sütun olur. Hücreye yazıp çıkınca o madde kaydedilir. Sütunlar alan şablonundan gelir.
          </p>
        </div>
        <button type="button" onClick={onKapat} aria-label="Kapat" className="p-2 text-gri hover:text-lacivert dark:text-bej/85"><X size={18} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TURLER.filter(t => (sayilar.get(t) || 0) > 0).map(t => (
          <button key={t} type="button" onClick={() => setTur(t)}
            className={`min-h-8 px-2.5 py-0.5 rounded-full text-[11px] border cursor-pointer ${tur === t ? 'bg-lacivert text-krem border-transparent dark:bg-[#2C3C72]' : 'border-bej/80 dark:border-lacivert-600 text-gri dark:text-bej/85 hover:border-kiremit'}`}>
            {TYPE_LABELS[t] || t} · {sayilar.get(t)}
          </button>
        ))}
        <input value={suz} onChange={e => setSuz(e.target.value)} placeholder="Ada göre süz…"
          className="ml-auto text-[12px] bg-white dark:bg-lacivert-800/60 border border-bej/70 dark:border-lacivert-600/60 rounded px-2.5 py-1.5 focus:outline-hidden focus:border-kiremit" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-bej/60 dark:border-lacivert-600/60">
        <table className="min-w-full text-left">
          <thead className="bg-bej/20 dark:bg-lacivert-800/60">
            <tr className="text-[10px] font-mono uppercase tracking-wide text-gri dark:text-bej/85">
              <th className="px-2 py-2">Ad</th>
              <th className="px-2 py-2">Üst madde</th>
              {sutunlar.map(f => <th key={f.id} className="px-2 py-2">{f.label}{f.bag?.length ? ' · bağ' : ''}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-bej/40 dark:divide-lacivert-600/40">
            {satirlar.map(i => {
              const kunye = new Map(getKunyeFields(i, { includeEmpty: true }).map(f => [f.id, f.value]));
              return (
                <tr key={i.id} className="align-top hover:bg-bej/10 dark:hover:bg-lacivert-600/20">
                  <td className="px-1 py-0.5">
                    <div className="flex items-center gap-1">
                      {i.metadata?.sabit === true && <Pin size={11} className="text-kiremit shrink-0" aria-label="sabit" />}
                      <Hucre deger={i.title} etiket="Ad" yaz={v => onUpdateItem(yolaYaz(i, 'title', v))} />
                      <button type="button" onClick={() => onNavigate(i.id)} className="shrink-0 text-[11px] font-mono text-gri hover:text-kiremit px-1" title="Maddeyi aç">aç</button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-[12px] text-gri dark:text-bej/85 min-w-[8rem]">{ad(i.metadata?.placeId) || '—'}</td>
                  {sutunlar.map(f => (
                    <td key={f.id} className="px-1 py-0.5">
                      <Hucre deger={kunye.get(f.id) || ''} etiket={f.label} yaz={v => onUpdateItem(yolaYaz(i, f.fieldPath, v))} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!satirlar.length && <p className="p-4 text-[13px] text-gri dark:text-bej/80">Bu türde madde yok.</p>}
      </div>
      <p className="text-[12px] text-gri dark:text-bej/75">Üst maddeyi maddenin düzenleyicisinden seçersin. Esc yazdığını geri alır.</p>
    </section>
  );
};

export default MaddeTablosu;
