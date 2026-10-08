import type { Item, ItemType } from '../types';

/**
 * Mükerrer maddeler (8 Ekim, Kemal: "Küçükçetmi Çiftliği mükerrer";
 * "birleştir, tek madde kalsın"). Aynı türde, aynı adlı (büyük/küçük harf
 * ve boşluk farkı yok) iki viki maddesi bir maddede birleşir.
 *
 * - Kalan: en eski madde (bağlar ve notlar çoğunlukla ona yazılmış olur).
 * - Ötekinin dolu alanları kalanın BOŞ alanlarına eklenir; dolu alana
 *   dokunulmaz. Görseller, etiketler, bağlar, bölümler birleşir.
 * - Başka kayıtlarda silinen maddenin kimliği geçiyorsa kalanınkiyle değişir
 *   (bağlar, üst madde, aday notları…).
 * - Sonra öteki silinir. İkinci basışta iş kalmaz.
 * Saf fonksiyon: yazılacakları ve silinecekleri döndürür; kayda yazmaz.
 */

const VIKI_TURLERI: ItemType[] = [
  'kulüp', 'dükkân', 'karakter', 'mekân', 'ürün', 'olay', 'marka', 'kisi', 'yer', 'oda', 'aile',
  'cadde', 'meydan', 'yer_adi', 'ada'
];

const anahtar = (i: Item) => `${i.type}|${i.title.trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ')}`;

export interface MukerrerGrup { kalan: Item; gidenler: Item[] }

export function mukerrerGruplari(items: Item[]): MukerrerGrup[] {
  const gruplar = new Map<string, Item[]>();
  for (const i of items) {
    if (i.archived || i.isProposal || !VIKI_TURLERI.includes(i.type) || !i.title.trim()) continue;
    const k = anahtar(i);
    gruplar.set(k, [...(gruplar.get(k) ?? []), i]);
  }
  return [...gruplar.values()].filter(g => g.length > 1).map(g => {
    const sirali = [...g].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return { kalan: sirali[0], gidenler: sirali.slice(1) };
  });
}

const bos = (v: unknown) => v === undefined || v === null || v === ''
  || (Array.isArray(v) && v.length === 0)
  || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** Kalanın boş alanlarını ötekinden doldurur; iç içe nesnelerde de (künye) */
function doldur(kalan: Record<string, unknown>, oteki: Record<string, unknown>): Record<string, unknown> {
  const c: Record<string, unknown> = { ...kalan };
  for (const [k, v] of Object.entries(oteki)) {
    if (v === undefined) continue;
    if (bos(c[k])) { if (!bos(v)) c[k] = v; continue; }
    const a = c[k];
    if (a && v && typeof a === 'object' && typeof v === 'object' && !Array.isArray(a) && !Array.isArray(v)) {
      c[k] = doldur(a as Record<string, unknown>, v as Record<string, unknown>);
    }
  }
  return c;
}

type Bag = { targetId?: string; type?: string };
const tekil = <T,>(liste: T[], k: (x: T) => string) => liste.filter((x, n) => liste.findIndex(y => k(y) === k(x)) === n);

export interface MukerrerIsleri { guncellenecek: Item[]; silinecek: string[]; ozet: string[] }

export function mukerrerIsleri(items: Item[]): MukerrerIsleri {
  const gruplar = mukerrerGruplari(items);
  if (!gruplar.length) return { guncellenecek: [], silinecek: [], ozet: [] };
  const yeniKimlik = new Map<string, string>();
  for (const g of gruplar) for (const o of g.gidenler) yeniKimlik.set(o.id, g.kalan.id);

  const guncel = new Map<string, Item>();
  const ozet: string[] = [];
  for (const g of gruplar) {
    let k: Item = g.kalan;
    for (const o of g.gidenler) {
      const metadata = doldur((k.metadata || {}) as Record<string, unknown>, (o.metadata || {}) as Record<string, unknown>);
      const kendi = new Set([k.id, o.id]);
      metadata.relations = tekil(
        [...((k.metadata?.relations as Bag[]) || []), ...((o.metadata?.relations as Bag[]) || [])].filter(r => r?.targetId && !kendi.has(r.targetId)),
        r => `${r.targetId}|${r.type}`
      );
      const bolumler = [...((k.metadata?.wikiSections as Array<{ title?: string }>) || []), ...((o.metadata?.wikiSections as Array<{ title?: string }>) || [])];
      metadata.wikiSections = tekil(bolumler, b => String(b.title || '').trim().toLocaleLowerCase('tr') || Math.random().toString());
      const notlar = [k.notes, o.notes].map(n => (n || '').trim()).filter(Boolean);
      k = {
        ...k,
        notes: tekil(notlar, x => x).join('\n\n'),
        images: tekil([...(k.images || []), ...(o.images || [])], x => x),
        tags: tekil([...(k.tags || []), ...(o.tags || [])], x => x),
        links: tekil([...(k.links || []), ...(o.links || [])].filter(l => !kendi.has(l)), x => x),
        metadata: metadata as Item['metadata'],
        updatedAt: Date.now()
      };
    }
    guncel.set(k.id, k);
    ozet.push(`${g.kalan.title} (${g.gidenler.length + 1} madde → 1)`);
  }

  // Başka kayıtlarda giden kimlikler kalanınkiyle değişir
  const desen = new RegExp([...yeniKimlik.keys()].map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  for (const i of items) {
    if (yeniKimlik.has(i.id)) continue;
    const temel = guncel.get(i.id) ?? i;
    const metin = JSON.stringify(temel);
    if (!desen.test(metin)) continue;
    desen.lastIndex = 0;
    const yeni = JSON.parse(metin.replace(desen, m => yeniKimlik.get(m)!)) as Item;
    // Kendine bağ kalmasın
    const r = (yeni.metadata?.relations as Bag[] | undefined);
    if (r) yeni.metadata = { ...yeni.metadata, relations: tekil(r.filter(b => b.targetId !== yeni.id), b => `${b.targetId}|${b.type}`) } as Item['metadata'];
    guncel.set(i.id, { ...yeni, updatedAt: Date.now() });
  }
  return { guncellenecek: [...guncel.values()], silinecek: [...yeniKimlik.keys()], ozet };
}
