import type { Item } from '../types';

/**
 * Viki temizliği (7 Ekim, tek seferlik; Kemal'in Drive listesi):
 *
 * 1. Mahalle adlarındaki parantez kalkar ("çok uzun görünüyor"):
 *    "Merkez Mahallesi (Düzada Köyü)" → "Merkez Mahallesi". Eski ad maddenin
 *    metnine tek cümle olarak yazılır ("Wikinin içinde eski isimlere ait
 *    birer cümle yaz sadece") ve `metadata.eskiAdlar`'da durur; mahalle
 *    eşleşmesi ("Kemsköy Caddesi" → İskele) onu kullanmaya devam eder.
 * 2. Kitap bölümü olarak görünen eski otel simülasyonu günleri:
 *    `temizlik.ts` → `simulasyonKaydi` (Temizlik işi siler).
 *
 * Saf fonksiyonlar; kayıt yalnız Kemal "Yap"a basınca yazılır. İkinci
 * basışta yapılacak iş kalmaz.
 */

const MAHALLE_PARANTEZ = /^(.+?\bMahallesi)\s*\(([^)]+)\)\s*$/;

export interface AdDuzeltmesi { item: Item; guncel: Item; yeniAd: string; eskiAd: string }

export function mahalleAdDuzeltmeleri(items: Item[]): AdDuzeltmesi[] {
  const cikti: AdDuzeltmesi[] = [];
  for (const i of items) {
    if (i.archived || i.isProposal || i.type !== 'yer') continue;
    const m = MAHALLE_PARANTEZ.exec(i.title.trim());
    if (!m) continue;
    const yeniAd = m[1].trim();
    const eskiAd = m[2].trim();
    const cumle = `Eski adı ${eskiAd}.`;
    const notlar = (i.notes || '').trimEnd();
    const eskiAdlar = Array.isArray(i.metadata?.eskiAdlar) ? (i.metadata!.eskiAdlar as string[]) : [];
    cikti.push({
      item: i, yeniAd, eskiAd,
      guncel: {
        ...i,
        title: yeniAd,
        notes: notlar.includes(cumle) ? notlar : (notlar ? `${notlar}\n\n${cumle}` : cumle),
        metadata: { ...(i.metadata || {}), eskiAdlar: Array.from(new Set([...eskiAdlar, eskiAd])) },
        updatedAt: Date.now()
      }
    });
  }
  return cikti;
}
