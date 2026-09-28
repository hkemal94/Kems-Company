import type { Item, WikiSection } from '../types';

/**
 * Otel maddesinin ve vikinin oyun verisinden temizlenmesi (28 Eylül 2026).
 *
 * Ne oldu: oyun için açılan ayrı kod oturumu bu depoya da girdi ve Neyin
 * Eksik paneline "Ekim 2008'e taşı" düğmesi koydu. Düğme iki şey yapıyordu:
 *   - Bütün kayıtlarda "Ekim 2003" / "OCT 2003" → 2008.
 *   - Otel maddesine (kemskoy_hotel) beş "Oyun: …" bölümü ekliyordu.
 *
 * İkisi de Kemal'in kararına aykırı:
 *   - Oyunun dönemi tasarım belgesindeki gibi 2007 sonu, ölü sezon. "Ekim
 *     2008, Sezon Sonu" reddedildi.
 *   - Kanon kuralı: vikinin bir "şimdi"si yok; oyun verisi vikiye girmez.
 *
 * Düğmenin kodu geri alındı. Bu dosya, düğmeye BASILDIYSA veride kalan izi
 * temizler. Basılmadıysa temizlenecek bir şey bulamaz ve panelde kart
 * görünmez.
 *
 * Silme yok:
 *   - "Oyun: …" bölümleri vikiden çıkar, otel kaydının `oyunArsivi`
 *     alanına taşınır. Vikide görünmez ama kayıtta durur.
 *   - "Ekim 2008" yazıları, düğmeden önceki hâline — "Ekim 2003"e — döner.
 *     Bu tarih eski otel simülasyonunun tarihi; simülasyon prototip olarak
 *     saklanıyor, oyunun kaynağı değil.
 */

export const OTEL_KIMLIGI = 'kemskoy_hotel';

/** 2008 düğmesinin eklediği bölüm kimlikleri */
const OYUN_BOLUMU = /^oyun_/;

/** Düğmenin yazdığı ay + yıl kalıbı */
const AY_YIL_2008 = /\b(Ekim|EKİM|Oct|OCT)(\s+)2008\b/g;

function geriAl<T>(deger: T): T {
  if (typeof deger === 'string') return deger.replace(AY_YIL_2008, '$1$22003') as T;
  if (Array.isArray(deger)) return deger.map(geriAl) as T;
  if (deger && typeof deger === 'object') {
    const cikti: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(deger)) cikti[k] = geriAl(v);
    return cikti as T;
  }
  return deger;
}

export interface OtelTemizligi {
  /** Yazılacak kayıtlar */
  degisenler: Item[];
  /** Vikiden arşive taşınacak bölüm sayısı */
  bolumSayisi: number;
  /** "Ekim 2008" yazısı geri alınacak kayıt sayısı */
  tarihSayisi: number;
}

export function otelTemizligi(items: Item[]): OtelTemizligi {
  const degisenler: Item[] = [];
  let bolumSayisi = 0;
  let tarihSayisi = 0;

  for (const item of items) {
    if (item.archived) continue;

    // Firestore: metadata yoksa anahtar hiç eklenmez (undefined yazılmaz)
    let yeni: Item = { ...item, title: geriAl(item.title), notes: geriAl(item.notes) };
    if (item.metadata) yeni.metadata = geriAl(item.metadata);
    const tarihDegisti = JSON.stringify(yeni) !== JSON.stringify(item);
    if (tarihDegisti) tarihSayisi++;

    let tasinan = 0;
    if (item.id === OTEL_KIMLIGI && yeni.metadata) {
      const bolumler: WikiSection[] = yeni.metadata.wikiSections ?? [];
      const oyun = bolumler.filter(b => OYUN_BOLUMU.test(String(b.id)));
      if (oyun.length) {
        tasinan = oyun.length;
        const eskiArsiv: WikiSection[] = (yeni.metadata as any).oyunArsivi ?? [];
        yeni = {
          ...yeni,
          metadata: {
            ...yeni.metadata,
            wikiSections: bolumler.filter(b => !OYUN_BOLUMU.test(String(b.id))),
            oyunArsivi: [...eskiArsiv, ...oyun]
          } as Item['metadata']
        };
      }
      bolumSayisi = tasinan;
    }

    if (tarihDegisti || tasinan > 0) degisenler.push({ ...yeni, updatedAt: Date.now() });
  }

  return { degisenler, bolumSayisi, tarihSayisi };
}
