import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Item } from '../../types';
import { adayBilgisi, adayiIsle, adayiKapat, bekleyenAdaylar, eskiOneriler } from '../../lib/adaylar';
import { DUGME_BOS, DUGME_LAC, ETIKET, IKINCIL, KART, YAZI, neZaman } from './stil';

/**
 * Adaylar (Paket 4): onay bekleyen her şey tek listede.
 *   - Günün sorusu / atölye cevapları → "İşle" maddenin alanına yazar.
 *   - Eski yapay zekâ önerileri (isProposal) → "Kabul et".
 * "Vazgeç" hiçbir şeyi silmez: aday arşive kalkar, kaydı durur.
 */

interface Props {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAcceptProposal: (id: string) => Promise<void>;
  onMaddeyiAc: (item: Item) => void;
}

export const AdaylarKutusu: React.FC<Props> = ({ items, onUpdateItem, onAcceptProposal, onMaddeyiAc }) => {
  const adaylar = bekleyenAdaylar(items);
  const oneriler = eskiOneriler(items);
  const [acik, setAcik] = useState<string | null>(null);
  const [duzenleme, setDuzenleme] = useState<Record<string, string>>({});
  const [calisan, setCalisan] = useState<string | null>(null);
  const [rapor, setRapor] = useState<string | null>(null);
  const toplam = adaylar.length + oneriler.length;

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
        <button type="button" onClick={() => setAcik(buAcik ? null : a.id)} className="w-full flex items-center gap-2.5 py-2.5 text-left cursor-pointer">
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

  return (
    <section className={`${KART} p-4`}>
      <div className={ETIKET}>Adaylar · onay bekleyen {toplam}</div>
      {rapor && (
        <p className={`mt-2 px-3 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] ${IKINCIL}`}>
          {rapor} <button type="button" onClick={() => setRapor(null)} className="underline cursor-pointer">tamam</button>
        </p>
      )}
      {toplam === 0 ? (
        <p className={`mt-3 text-[12px] ${IKINCIL}`}>
          Bekleyen aday yok. Günün sorusuna ya da atölyedeki bir soruya verdiğin cevaplar burada onayını bekler.
        </p>
      ) : (
        <ul className="mt-2">
          {adaylar.map(a => {
            const b = adayBilgisi(a)!;
            return satir(a, 'KANON',
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
          {oneriler.map(o => satir(o, 'ÖNERİ',
            <p className={`text-[12px] leading-snug whitespace-pre-line line-clamp-5 ${IKINCIL}`}>{o.notes || 'Açıklama yok.'}</p>,
            <>
              <button type="button" disabled={calisan === o.id} onClick={() => onAcceptProposal(o.id)} className={DUGME_LAC}>Kabul et</button>
              <button type="button" onClick={() => onMaddeyiAc(o)} className={DUGME_BOS}>Aç</button>
              <button type="button" disabled={calisan === o.id} onClick={() => vazgec(o)} className={DUGME_BOS}>Vazgeç</button>
            </>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AdaylarKutusu;
