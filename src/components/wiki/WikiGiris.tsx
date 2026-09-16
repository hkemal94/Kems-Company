import React, { useMemo } from 'react';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import type { Item, ItemType } from '../../types';
import { resolveAllRelations } from '../../utils/relations';
import { isStub, TYPE_LABELS } from './wikiSchema';

/**
 * Wiki giriş paneli (W5).
 *
 * Kemal: "Wiki boş görünüyor, içerisindeki maddelere nasıl ulaşacağım, bir
 * albenisi yok, önerisi yok — bana bir panel sunman gerekirdi."
 *
 * Haklıydı: giriş sayfasında bir arama kutusu ve mahalle listesi vardı.
 * Doksan küsur madde arka planda duruyordu ama hiçbiri görünmüyordu, hangi
 * kapıdan gireceğin belli değildi.
 *
 * Panel üç şey yapıyor, üçü de gerçek veriden:
 *   1. KAPILAR — tipe göre giriş. "94 kişi" yazan bir düğme, basınca liste.
 *   2. ADANIN DÜĞÜMLERİ — en çok bağlantısı olan maddeler. Evrenin
 *      gerçekten merkezinde duran şeyler; okumaya buradan başlanır.
 *   3. BUGÜN BUNA BAK — boş ama çok bağlantılı bir madde. Yani doldurulunca
 *      en çok işe yarayacak olan. Uydurma iş değil, ölçülmüş öncelik.
 */

interface WikiGirisProps {
  /** Wiki'nin nüfusu (oda ve arşiv hariç, WikiShell süzüyor) */
  maddeler: Item[];
  /** İlişki çözümü için bütün kayıtlar */
  hepsi: Item[];
  onNavigate: (id: string) => void;
  onTipSec: (tip: ItemType) => void;
}

/** Bir maddenin evrendeki bağlantı sayısı */
function bagSayisi(item: Item, hepsi: Item[]): number {
  return resolveAllRelations(item, hepsi).filter(r => !r.isProposal).length;
}

const KAPI_SIRASI: ItemType[] = [
  'kisi', 'karakter', 'mekân', 'dükkân', 'kulüp', 'yer', 'marka'
];

export const WikiGiris: React.FC<WikiGirisProps> = ({
  maddeler, hepsi, onNavigate, onTipSec
}) => {
  /** Tip başına sayı — sıfır olan kapı gösterilmez */
  const kapilar = useMemo(() => {
    const sayac = new Map<ItemType, number>();
    for (const i of maddeler) {
      if (i.type === 'oda') continue;
      sayac.set(i.type, (sayac.get(i.type) ?? 0) + 1);
    }
    return KAPI_SIRASI
      .filter(t => (sayac.get(t) ?? 0) > 0)
      .map(t => ({ tip: t, sayi: sayac.get(t)! }));
  }, [maddeler]);

  /** Bağlantısına göre sıralanmış maddeler — bir kez hesapla, iki yerde kullan */
  const sirali = useMemo(() => {
    return maddeler
      .filter(i => i.type !== 'oda')
      .map(i => ({ item: i, bag: bagSayisi(i, hepsi), bos: isStub(i) }))
      .sort((a, b) => b.bag - a.bag);
  }, [maddeler, hepsi]);

  /** Adanın düğümleri: dolu ve çok bağlantılı */
  const dugumler = useMemo(
    () => sirali.filter(x => !x.bos && x.bag > 0).slice(0, 6),
    [sirali]
  );

  /** Öneri: boş ama çok bağlantılı — doldurulunca en çok karşılığı olan */
  const oneri = useMemo(
    () => sirali.find(x => x.bos && x.bag >= 2) ?? sirali.find(x => x.bos),
    [sirali]
  );

  if (maddeler.length === 0) return null;

  return (
    <div className="mb-8 space-y-6">
      {/* --- 1. Kapılar --- */}
      {kapilar.length > 0 && (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-2.5">
            Nereden girilir
          </h2>
          <ul className="flex flex-wrap gap-2">
            {kapilar.map(k => (
              <li key={k.tip}>
                <button
                  type="button"
                  onClick={() => onTipSec(k.tip)}
                  className="flex items-baseline gap-2 px-3 py-2 rounded-lg border border-bej/50 dark:border-lacivert-600/50 bg-krem-acik/60 dark:bg-lacivert-800/35 hover:border-kiremit dark:hover:border-kiremit transition-colors cursor-pointer archive-shadow"
                >
                  <span className="font-mono text-[15px] font-bold text-kiremit tabular-nums">
                    {k.sayi}
                  </span>
                  <span className="text-[13px] text-lacivert dark:text-krem">
                    {TYPE_LABELS[k.tip] || k.tip}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- 2. Adanın düğümleri --- */}
      {dugumler.length > 0 && (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-2.5 flex items-center gap-1.5">
            <Compass size={12} /> Adanın düğümleri
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2">
            {dugumler.map(({ item, bag }) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-bej/45 dark:border-lacivert-600/45 bg-krem-acik/60 dark:bg-lacivert-800/35 hover:border-kiremit transition-colors cursor-pointer archive-shadow"
                >
                  <span className="block font-serif text-[15px] text-lacivert dark:text-krem leading-tight truncate">
                    {item.title}
                  </span>
                  <span className="block mt-0.5 font-mono text-[10px] text-gri dark:text-bej/55">
                    {TYPE_LABELS[item.type] || item.type} · {bag} bağlantı
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- 3. Öneri --- */}
      {oneri && (
        <section>
          <button
            type="button"
            onClick={() => onNavigate(oneri.item.id)}
            className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border border-dashed border-kiremit/45 bg-kiremit/6 hover:bg-kiremit/10 transition-colors cursor-pointer group"
          >
            <Sparkles size={14} className="mt-0.5 shrink-0 text-kiremit" />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-kiremit mb-0.5">
                Bugün buna bakabilirsin
              </span>
              <span className="block font-serif text-[15px] text-lacivert dark:text-krem leading-tight">
                {oneri.item.title}
              </span>
              <span className="block mt-0.5 text-[11px] text-gri dark:text-bej/60 leading-snug">
                {oneri.bag > 0
                  ? `Evrende ${oneri.bag} şey buna bağlı ama maddesi hâlâ boş — `
                    + 'doldurunca en çok karşılığı olan madde bu.'
                  : 'Maddesi henüz boş.'}
              </span>
            </span>
            <ArrowRight size={14} className="mt-1 shrink-0 text-bej group-hover:text-kiremit transition-colors" />
          </button>
        </section>
      )}
    </div>
  );
};

export default WikiGiris;
