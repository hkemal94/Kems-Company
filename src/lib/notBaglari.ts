import type { Item } from '../types';

/**
 * Not → madde bağı (yapisal-4, küçükler). Not defterinde "#" ile başlayan
 * madde adı ("#Dirlik Stadı") o maddeye bağ olur. Kayda ayrıca yazılmaz;
 * notun metninden her seferinde okunur.
 */

const VIKI = new Set(['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'aile', 'olay', 'ürün']);
const kucuk = (s: string) => s.toLocaleLowerCase('tr');

/** Metinde #ad olarak geçen maddeler (uzun ad önce eşleşir) */
export function nottakiMaddeler(metin: string, items: Item[]): Item[] {
  if (!metin.includes('#')) return [];
  const m = kucuk(metin);
  const adaylar = items
    .filter(i => !i.archived && !i.isProposal && VIKI.has(i.type) && i.title.trim())
    .sort((a, b) => b.title.length - a.title.length);
  const bulunan: Item[] = [];
  for (const i of adaylar) {
    const ad = `#${kucuk(i.title.trim())}`;
    const yer = m.indexOf(ad);
    if (yer < 0) continue;
    const sonraki = m.charAt(yer + ad.length);
    if (sonraki && /[\p{L}\p{N}]/u.test(sonraki)) continue; // "#Liman" "#Limanda" ile eşleşmesin
    bulunan.push(i);
  }
  return bulunan;
}

/** Bir maddeyi anan not sayfaları */
export const maddeyiAnanNotlar = (madde: Item, items: Item[]) =>
  items.filter(i => !i.archived && (i.tags || []).includes('gunluk-not') && nottakiMaddeler(i.notes || '', [madde]).length > 0);
