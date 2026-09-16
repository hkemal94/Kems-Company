import type { Item } from '../types';

/**
 * Tema katmanının kaldırılması (34 cevabın 16. maddesi).
 *
 * Kemal: "Marka, tema, drop işini tam oturtamadık temayı komple silebiliriz
 * ve süreci kısaltabiliriz."
 *
 * Zincir üç halkaydı:  Marka → Tema → Drop → Ürün
 * Artık iki halka:     Marka → Drop → Ürün
 *
 * Tema kayıtları SİLİNMİYOR, arşivleniyor — eski kararı bozmuyoruz: bu
 * projede hiçbir şey silinmez, arşive kalkar. Tema arşive kalkmadan önce
 * taşıdığı tek işe yarar bilgi (hangi markaya ait olduğu) altındaki droplara
 * geçiriliyor; yoksa drop markasız kalır ve Markalar ekranında kaybolurdu.
 *
 * Firestore not: `undefined` yazmak bütün yazmayı reddettiriyor. O yüzden
 * themeId "undefined yapılmıyor", anahtar nesneden siliniyor.
 */

export interface TemaDurumu {
  /** Arşivlenecek tema kayıtları */
  temalar: Item[];
  /** themeId'si temizlenecek droplar */
  droplar: Item[];
  /** Markası temadan devralınacak drop sayısı */
  markaDevri: number;
}

export function temaDurumu(items: Item[]): TemaDurumu {
  const canli = items.filter(i => !i.archived);
  // 'tema' ItemType'tan çıkarıldı; eski kayıtlar veride hâlâ duruyor
  const temalar = canli.filter(i => (i.type as string) === 'tema');
  const temaMarkasi = new Map<string, string>();
  for (const t of temalar) {
    const b = (t.metadata as any)?.brandId;
    if (typeof b === 'string' && b) temaMarkasi.set(t.id, b);
  }

  const droplar = canli.filter(
    i => i.type === 'drop' && (i.metadata as any)?.themeId
  );
  let markaDevri = 0;
  for (const d of droplar) {
    const m = d.metadata as any;
    if (!m.brandId && temaMarkasi.get(String(m.themeId))) markaDevri++;
  }

  return { temalar, droplar, markaDevri };
}

/**
 * Yazılacak kayıtları üretir. Hiçbir şeyi kendisi yazmaz — çağıran taraf
 * sırayla kaydeder, böylece hata olursa nerede kaldığı belli olur.
 */
export function temaKaldirmaYazilari(items: Item[]): Item[] {
  const durum = temaDurumu(items);
  const temaMarkasi = new Map<string, string>();
  for (const t of durum.temalar) {
    const b = (t.metadata as any)?.brandId;
    if (typeof b === 'string' && b) temaMarkasi.set(t.id, b);
  }

  const yazilacak: Item[] = [];

  // 1) Droplar: markayı devral, tema bağını kopar
  for (const d of durum.droplar) {
    const m = { ...(d.metadata as any) };
    const devir = temaMarkasi.get(String(m.themeId));
    if (!m.brandId && devir) m.brandId = devir;
    delete m.themeId;           // undefined DEĞİL — anahtarı sil
    yazilacak.push({ ...d, metadata: m, updatedAt: Date.now() });
  }

  // 2) Ürünlerdeki artık themeId alanı da temizlensin
  for (const u of items) {
    if (u.archived || u.type !== 'merch_urun') continue;
    const m = u.metadata as any;
    if (!m || !m.themeId) continue;
    const yeni = { ...m };
    delete yeni.themeId;
    yazilacak.push({ ...u, metadata: yeni, updatedAt: Date.now() });
  }

  // 3) Temalar arşive
  for (const t of durum.temalar) {
    yazilacak.push({
      ...t,
      archived: true,
      tags: [...new Set([...(t.tags || []), 'tema-katmani-kaldirildi'])],
      updatedAt: Date.now()
    });
  }

  return yazilacak;
}
