import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Item } from '../../types';
import { adayBilgisi, adayiIsle, adayiKapat, bekleyenAdaylar, eskiOneriler } from '../../lib/adaylar';
import { TYPE_LABELS } from '../wiki/wikiSchema';
import { DUGME_BOS, DUGME_LAC, ETIKET, IKINCIL, KART, YAZI, neZaman } from './stil';

/**
 * Adaylar (Paket 4).
 *
 * İki ayrı şey:
 *   - Cevaplar: günün sorusu / atölyede verdiğin cevaplar. "İşle" maddenin
 *     alanına yazar.
 *   - Eski öneriler: eski yapay zekâ ve otel simülasyonundan kalan, "öneri"
 *     işaretli kayıtlar. Kemal (29 Eylül): "Adayların listesi berbat
 *     derece uzun ve kullanışsız" — 76 kişilik liste. Artık tek satırlık
 *     bir özet; istenirse açılır. Hepsi Neyin Eksik'teki Temizlik kartıyla
 *     silinir (29 Eylül, kural değişti: arşiv yok, silme var).
 */

const ILK_GORUNEN = 4;

interface Props {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAcceptProposal: (id: string) => Promise<void>;
  onMaddeyiAc: (item: Item) => void;
  /** Neyin Eksik'teki Temizlik kartına götürür (eski öneriler orada silinir) */
  onTemizlik?: () => void;
}

const tarih = (ms: number) => new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

export const AdaylarKutusu: React.FC<Props> = ({ items, onUpdateItem, onAcceptProposal, onMaddeyiAc, onTemizlik }) => {
  const adaylar = useMemo(() => bekleyenAdaylar(items), [items]);
  const oneriler = useMemo(() => eskiOneriler(items), [items]);
  const [acik, setAcik] = useState<string | null>(null);
  const [hepsi, setHepsi] = useState(false);
  const [eskiAcik, setEskiAcik] = useState(false);
  const [duzenleme, setDuzenleme] = useState<Record<string, string>>({});
  const [calisan, setCalisan] = useState<string | null>(null);
  const [rapor, setRapor] = useState<string | null>(null);

  /** "70 kişi · 4 mekân" ve eklenme aralığı */
  const ozet = useMemo(() => {
    const say = new Map<string, number>();
    for (const o of oneriler) {
      const t = (TYPE_LABELS[o.type] || o.type).toLocaleLowerCase('tr');
      say.set(t, (say.get(t) || 0) + 1);
    }
    const turler = [...say.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${t}`).join(' · ');
    const zamanlar = oneriler.map(o => o.createdAt).filter(Boolean).sort((a, b) => a - b);
    const aralik = zamanlar.length
      ? (tarih(zamanlar[0]) === tarih(zamanlar[zamanlar.length - 1]) ? tarih(zamanlar[0]) : `${tarih(zamanlar[0])} – ${tarih(zamanlar[zamanlar.length - 1])}`)
      : '';
    return { turler, aralik };
  }, [oneriler]);

  const isle = async (a: Item) => {
    const b = adayBilgisi(a)!;
    const cevap = (duzenleme[a.id] ?? b.cevap).trim();
    if (!cevap) return;
    const guncel = { ...a, notes: cevap, metadata: { ...a.metadata, aday: { ...b, cevap } } };
    const sonuc = adayiIsle(guncel, items);
    if (!sonuc) {
      setRapor(`"${b.etiket}" alanı bu arada dolmuş ya da madde bulunamadı; maddeye bakıp adayı kaldırabilirsin.`);
      return;
    }
    setCalisan(a.id);
    try {
      await onUpdateItem(sonuc.hedef);
      await onUpdateItem(sonuc.aday);
      setRapor(`${sonuc.hedef.title} · ${b.etiket} vikiye yazıldı.`);
      setAcik(null);
    } finally { setCalisan(null); }
  };

  const vazgec = async (a: Item) => {
    setCalisan(a.id);
    try {
      await onUpdateItem(a.type === 'aday'
        ? adayiKapat(a, 'vazgecildi')
        : { ...a, archived: true, updatedAt: Date.now() });
      setAcik(null);
    } finally { setCalisan(null); }
  };

  const satir = (a: Item, tur: string, altYazi: React.ReactNode, eylemler: React.ReactNode) => {
    const buAcik = acik === a.id;
    return (
      <li key={a.id} className="border-t border-[#CFC5B4]/70 dark:border-[#2C3C72]">
        <button type="button" onClick={() => setAcik(buAcik ? null : a.id)} className="w-full flex items-center gap-2.5 py-2 text-left cursor-pointer">
          <i className="not-italic shrink-0 px-1.5 py-0.5 rounded bg-[#F3EFE8] dark:bg-[#17345A] text-[9px] font-mono font-bold tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9]">{tur}</i>
          <span className={`flex-1 min-w-0 truncate text-[13px] ${YAZI}`}>{a.title}</span>
          {buAcik ? <ChevronDown className="w-4 h-4 text-[#F26B6F] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#CFC5B4] shrink-0" />}
        </button>
        {buAcik && (
          <div className="pb-3 space-y-2">
            {altYazi}
            <div className="flex flex-wrap gap-2">{eylemler}</div>
          </div>
        )}
      </li>
    );
  };

  const gorunenAdaylar = hepsi ? adaylar : adaylar.slice(0, ILK_GORUNEN);

  return (
    <section className={`${KART} p-4`}>
      <div className={ETIKET}>Adaylar · onay bekleyen {adaylar.length}</div>
      {rapor && (
        <p className={`mt-2 px-3 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] ${IKINCIL}`}>
          {rapor} <button type="button" onClick={() => setRapor(null)} className="underline cursor-pointer">tamam</button>
        </p>
      )}

      {/* Senin cevapların */}
      {adaylar.length === 0 ? (
        <p className={`mt-2 text-[12px] ${IKINCIL}`}>
          Bekleyen cevap yok. Günün sorusuna ya da atölyedeki bir soruya verdiğin cevaplar burada onayını bekler.
        </p>
      ) : (
        <ul className="mt-1">
          {gorunenAdaylar.map(a => {
            const b = adayBilgisi(a)!;
            return satir(a, 'CEVAP',
              <>
                <p className={`text-[11px] ${IKINCIL}`}>{b.soru} · {neZaman(a.createdAt)}</p>
                <textarea
                  rows={2}
                  value={duzenleme[a.id] ?? b.cevap}
                  onChange={e => setDuzenleme(d => ({ ...d, [a.id]: e.target.value }))}
                  className={`w-full text-[13px] bg-white dark:bg-[#17345A] ${YAZI} border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-2 focus:outline-hidden focus:border-[#F26B6F]`}
                />
              </>,
              <>
                <button type="button" disabled={calisan === a.id} onClick={() => isle(a)} className={DUGME_LAC}>İşle · vikiye yaz</button>
                <button type="button" onClick={() => { const h = items.find(i => i.id === b.hedefId); if (h) onMaddeyiAc(h); }} className={DUGME_BOS}>Maddeyi aç</button>
                <button type="button" disabled={calisan === a.id} onClick={() => vazgec(a)} className={DUGME_BOS}>Vazgeç</button>
              </>
            );
          })}
          {adaylar.length > ILK_GORUNEN && (
            <li className="border-t border-[#CFC5B4]/70 dark:border-[#2C3C72] pt-2">
              <button type="button" onClick={() => setHepsi(h => !h)} className="text-[11px] font-mono text-[#D6484C] dark:text-[#F26B6F] hover:underline cursor-pointer">
                {hepsi ? 'daha az göster' : `+${adaylar.length - ILK_GORUNEN} cevap daha`}
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Eski öneriler: tek satırlık özet */}
      {oneriler.length > 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-[#CFC5B4] dark:border-[#2C3C72] p-3">
          <div className="flex items-start gap-3">
            <b className="font-mono text-[16px] text-[#6A5E4C] dark:text-[#A6B0C9] tabular-nums shrink-0">{oneriler.length}</b>
            <span className="flex-1 min-w-0">
              <span className={`block text-[12px] font-semibold ${YAZI}`}>eski öneri (onaylanmamış)</span>
              <span className={`block text-[11px] leading-snug ${IKINCIL}`}>
                {ozet.turler}{ozet.aralik ? ` · eklenme: ${ozet.aralik}` : ''}
              </span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setEskiAcik(a => !a)} className={DUGME_BOS}>{eskiAcik ? 'Listeyi kapat' : 'Listeyi aç'}</button>
            {onTemizlik && (
              <button type="button" onClick={onTemizlik} className={DUGME_BOS}>Hepsini sil · Temizlik kartı</button>
            )}
          </div>
          {eskiAcik && (
            <ul className="mt-2 max-h-72 overflow-y-auto pr-1">
              {oneriler.map(o => satir(o, (TYPE_LABELS[o.type] || o.type).toLocaleUpperCase('tr'),
                <p className={`text-[12px] leading-snug whitespace-pre-line line-clamp-4 ${IKINCIL}`}>{o.notes || 'Açıklama yok.'}</p>,
                <>
                  <button type="button" disabled={calisan === o.id} onClick={() => onAcceptProposal(o.id)} className={DUGME_LAC}>Kabul et</button>
                  <button type="button" onClick={() => onMaddeyiAc(o)} className={DUGME_BOS}>Aç</button>
                  <button type="button" disabled={calisan === o.id} onClick={() => vazgec(o)} className={DUGME_BOS}>Vazgeç</button>
                </>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default AdaylarKutusu;
