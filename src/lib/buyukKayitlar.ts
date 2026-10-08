import type { Item } from '../types';
import { compressImageBase64, compressPngKeepAlpha } from './imageCompressor';

/**
 * Büyük kayıtlar (8 Ekim, Kemal: "Viki maddelerinde bir şeyler yapıp
 * kaydettiğimde kaydolmuyor"). Veritabanında bir kaydın sınırı 1 MB;
 * Dondurmacı Kızlar 935 KB'tı (içinde 882 KB'lık bir PNG), birkaç satır
 * ekleyince sınır aşılıyor, kayıt reddediliyordu. Kart, 600 KB'ı aşan
 * kayıtların içindeki görselleri küçültür: saydam olanlar WebP (saydamlık
 * kalır), fotoğraflar JPEG; en uzun kenar 1400 px. Küçülmeyen görsel olduğu
 * gibi kalır. Metne ve künyeye dokunulmaz.
 */

export const BUYUK_SINIR = 600_000;
const GORSEL_SINIR = 120_000;

/** Kaydın veritabanındaki yaklaşık boyutu (bayt) */
export const kayitBoyutu = (i: Item) => new TextEncoder().encode(JSON.stringify(i)).length;

export const buyukKayitlar = (items: Item[]) =>
  items.map(item => ({ item, boyut: kayitBoyutu(item) }))
    .filter(x => x.boyut > BUYUK_SINIR)
    .sort((a, b) => b.boyut - a.boyut);

const saydamOlabilir = (s: string) => /^data:image\/(png|webp|gif)/.test(s);

async function kucuk(s: unknown): Promise<unknown> {
  if (typeof s !== 'string' || !s.startsWith('data:image/') || s.startsWith('data:image/svg') || s.length < GORSEL_SINIR) return s;
  const yeni = saydamOlabilir(s) ? await compressPngKeepAlpha(s, 1400, 1400) : await compressImageBase64(s, 1400, 1400, 0.82);
  return yeni.length < s.length ? yeni : s;
}

/** Görselleri küçültülmüş kayıt (tarayıcıda) */
export async function kaydiKucult(item: Item): Promise<Item> {
  const images = await Promise.all((item.images || []).map(kucuk)) as string[];
  const kit = item.metadata?.brandKit;
  const metadata = kit ? {
    ...item.metadata,
    brandKit: {
      ...kit,
      ...(kit.logoBase64 ? { logoBase64: await kucuk(kit.logoBase64) as string } : {}),
      ...(kit.selectedLogo ? { selectedLogo: await kucuk(kit.selectedLogo) as string } : {}),
      ideaLogos: await Promise.all((kit.ideaLogos || []).map(kucuk)) as string[],
      ...(kit.atmosphereMoodboard ? { atmosphereMoodboard: await Promise.all(kit.atmosphereMoodboard.map(kucuk)) as string[] } : {})
    }
  } : item.metadata;
  return { ...item, images, metadata, updatedAt: Date.now() };
}
