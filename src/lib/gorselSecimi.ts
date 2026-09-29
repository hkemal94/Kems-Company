import type { Item } from '../types';
import { maddeGorseli } from './maddeGorseli';
import { ANA_MARKA_KIMLIKLERI } from './markaYapisi';

/**
 * Hazır internet fotoğrafları (29 Eylül). Kemal, Küçükçetmi Dropu'nda
 * tanımadığı bir adamın fotoğrafını gördü: "Standart görselleri görmek
 * istemiyorum; konu neyse Canva'dan ona uygun görsel çek. Bu adam kim,
 * sistemimde yeri yok." Eski kod yeni drop ve ürünlere Unsplash'ten hazır
 * fotoğraf koyuyordu. Bunlar artık gösterilmez; kayıt düzenlenince de
 * kaydedilmez.
 */
const HAZIR_FOTO = /^https?:\/\/([^/]*\.)?(unsplash\.com|pexels\.com|picsum\.photos|pixabay\.com|placehold\.co|via\.placeholder\.com)\//i;

export const hazirFotoMu = (s: unknown) => typeof s === 'string' && HAZIR_FOTO.test(s);

/** Hazır fotoğrafları ayıklanmış kayıt (görsel yoksa boş liste) */
export function hazirFotosuz(i: Item): Item {
  const gorseller = i.images || [];
  return gorseller.some(hazirFotoMu) ? { ...i, images: gorseller.filter(g => !hazirFotoMu(g)) } : i;
}

/**
 * Görseli olmayan drop ve ürün için konuya uygun görsel: çıktığı kurumun
 * arması (Canva), kurum yoksa Kems Company logosu. Yoksa undefined — yer
 * boş kalır, boş olduğu görünür.
 */
export function merchYedekGorseli(i: Item, items: Item[]): string | undefined {
  const dropId = (i.metadata as Record<string, unknown> | undefined)?.dropId as string | undefined;
  const drop = dropId ? items.find(x => x.id === dropId) : undefined;
  const kurumId = (i.metadata?.kurumId as string | undefined) || (drop?.metadata?.kurumId as string | undefined);
  const kurum = kurumId ? items.find(x => x.id === kurumId) : undefined;
  if (kurum) {
    const g = maddeGorseli(kurum, items);
    if (g) return g;
  }
  const kems = items.find(x => ANA_MARKA_KIMLIKLERI.includes(x.id));
  return kems ? maddeGorseli(kems, items) : undefined;
}
