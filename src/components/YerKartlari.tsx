import React, { useMemo, useState } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import type { Item, ItemType } from '../types';
import {
  TASINABILEN_TURLER, adaMaddesiEksik, adaMaddesiKaydi, cevreYoluKaydi, cevreYoluVar,
  mahalleKalsin, mahalleTekrarlari, tasinacaklar, turAdi, turuDegistir
} from '../lib/yerTurleri';
import { useStudyo } from './studyo/StudyoBaglami';

/**
 * Yer kartları (8 Ekim). İki kart, ikisi de yalnız iş varken görünür:
 *   1. Mahalle kartında duran cadde, meydan, tepe ve adanın kaydı: Kemal her
 *      birinin türünü seçip "Taşı" der. Boş Düzada ve çevre yolu maddeleri.
 *   2. Tekrar eden mahalle bilgileri: "✨ Stüdyoda derle" stüdyoyu açar;
 *      sonuç öneri tepsisine düşer, Kemal "Ekle" demeden bir şey değişmez.
 */

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string };

const KUTU = 'mb-2.5 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]';
const BASLIK = 'text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]';
const ACIKLAMA = 'mt-0.5 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]';
const DUGME = 'shrink-0 min-h-9 px-3 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[12px] font-semibold disabled:opacity-40 cursor-pointer';
const BOS_DUGME = 'shrink-0 min-h-9 px-3 rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[12px] text-[#0E1C4F] dark:text-[#F3EFE8] disabled:opacity-40 cursor-pointer';
const SECIM = 'min-h-9 text-[12px] bg-white dark:bg-[#17345A] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2';

export const YerKartlariKarti: React.FC<{
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem?: (item: YeniKayit) => Promise<void>;
  onAc: (id: string) => void;
}> = ({ items, onUpdateItem, onAddItem, onAc }) => {
  const liste = useMemo(() => tasinacaklar(items), [items]);
  const adaYok = useMemo(() => adaMaddesiEksik(items), [items]);
  const yolYok = useMemo(() => !cevreYoluVar(items), [items]);
  /** Satırdaki seçim: '' = henüz seçilmedi */
  const [secim, setSecim] = useState<Record<string, ItemType | ''>>({});
  const [calisan, setCalisan] = useState<string | null>(null);

  if (!liste.length && !(onAddItem && (adaYok || yolYok))) return null;

  const isle = async (anahtar: string, is: () => Promise<void>) => {
    if (calisan) return;
    setCalisan(anahtar);
    try { await is(); } finally { setCalisan(null); }
  };

  return (
    <div className={KUTU}>
      <div className="flex items-start gap-3">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#D6484C] dark:text-[#F26B6F]" />
        <div className="flex-1 min-w-0">
          <p className={BASLIK}>Yer kartları: cadde, meydan, yer adı ve ada ayrıldı</p>
          <p className={ACIKLAMA}>
            Mahalle kartı artık yalnız mahalleler için. Aşağıdakiler bugün mahalle kartında duruyor; her birinin türünü seç, "Taşı"ya bas.
            Metni, künyesi ve bağları olduğu gibi kalır.
          </p>
        </div>
      </div>
      {liste.length > 0 && (
        <ul className="mt-2.5 divide-y divide-[#CFC5B4]/50 dark:divide-[#2C3C72]/60">
          {liste.map(({ item, tahmin }) => {
            const s = secim[item.id] ?? tahmin ?? '';
            return (
              <li key={item.id} className="py-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onAc(item.id)} className="flex-1 min-w-[140px] text-left text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] hover:underline cursor-pointer truncate">
                  {item.title}
                </button>
                <select aria-label={`${item.title} türü`} value={s} onChange={e => setSecim(m => ({ ...m, [item.id]: e.target.value as ItemType | '' }))} className={SECIM}>
                  <option value="">Tür seç…</option>
                  {TASINABILEN_TURLER.map(t => <option key={t} value={t}>{turAdi(t)}</option>)}
                </select>
                <button type="button" disabled={!s || !!calisan} onClick={() => s && void isle(item.id, () => onUpdateItem(turuDegistir(item, s)))} className={DUGME}>
                  {calisan === item.id ? '…' : 'Taşı'}
                </button>
                <button type="button" disabled={!!calisan} onClick={() => void isle(`${item.id}:m`, () => onUpdateItem(mahalleKalsin(item)))} className={BOS_DUGME}>
                  Mahalle kalsın
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {onAddItem && (adaYok || yolYok) && (
        <div className="mt-2.5 pt-2.5 border-t border-[#CFC5B4]/50 dark:border-[#2C3C72]/60 flex flex-wrap items-center gap-2">
          <span className="flex-1 min-w-[180px] text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">Boş açılır; metnini ve adını sen yazarsın.</span>
          {adaYok && (
            <button type="button" disabled={!!calisan} onClick={() => void isle('ada', () => onAddItem(adaMaddesiKaydi()))} className={DUGME}>
              {calisan === 'ada' ? '…' : 'Düzada maddesini aç'}
            </button>
          )}
          {yolYok && (
            <button type="button" disabled={!!calisan} onClick={() => void isle('yol', () => onAddItem(cevreYoluKaydi()))} className={DUGME}>
              {calisan === 'yol' ? '…' : 'Çevre yolu maddesini aç'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const MahalleDerlemeKarti: React.FC<{ items: Item[]; onAc: (id: string) => void }> = ({ items, onAc }) => {
  const liste = useMemo(() => mahalleTekrarlari(items), [items]);
  const studyo = useStudyo();
  if (!liste.length) return null;
  return (
    <div className={KUTU}>
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-[#D6484C] dark:text-[#F26B6F]" />
        <div className="flex-1 min-w-0">
          <p className={BASLIK}>{liste.length} mahallede tekrar eden bilgi var</p>
          <p className={ACIKLAMA}>
            "Stüdyoda derle" öneri bölümlerini tek düzenli hâle getirir: her bilgi bir kez, aynı başlık iki kez yok, bölümler sabit sırada.
            Resmî bölümlere dokunmaz. Sonuç öneri tepsisine düşer; "Ekle" demeden hiçbir şey değişmez.
          </p>
        </div>
      </div>
      <ul className="mt-2.5 divide-y divide-[#CFC5B4]/50 dark:divide-[#2C3C72]/60">
        {liste.map(t => (
          <li key={t.item.id} className="py-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onAc(t.item.id)} className="flex-1 min-w-[160px] text-left cursor-pointer">
              <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] hover:underline">{t.item.title}</span>
              <span className="block text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
                {[
                  ...t.ayniBasliklar.map(b => `${b.baslik} ×${b.sayi}`),
                  t.benzerCumle ? `${t.benzerCumle} tekrar eden cümle${t.ornek ? ` (${t.ornek.a} ↔ ${t.ornek.b})` : ''}` : ''
                ].filter(Boolean).join(' · ')}
              </span>
            </button>
            <button type="button" onClick={() => studyo.ac({ arac: 'viki-derle', hedefId: t.item.id })} className={`${DUGME} inline-flex items-center gap-1.5`}>
              <Sparkles className="w-3.5 h-3.5" /> Stüdyoda derle
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
