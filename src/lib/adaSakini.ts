import type { Item } from '../types';

/**
 * "Ada sakini yap" — silmenin yerine geçen işlem (34 cevabın 22. maddesi).
 *
 * Kemal: "Silme — belki de ada sakini olacak, sadece elimdeki karakterleri
 * silmek istemiyorum."
 *
 * Bir kişi otelden çıktığında kaydı silmek, o kişiyi evrenden de silmek
 * demekti: künyesi, ilişkileri, ismi gidiyordu. Oysa çıkan kişi adada
 * kalabilir. Bu işlem kişiyi kayıt olarak korur, yalnız oteldeki yerini
 * bırakır:
 *
 *   - otel ve oda ilişkileri kesilir (oda dolu görünmesin)
 *   - misafir/personel etiketleri kalkar, "ada-sakini" gelir
 *   - durumu "Ada sakini" olur
 *
 * Geri alınabilir: etiketi değiştirmek kişiyi eski hâline döndürür. Silme
 * geri alınamazdı, bu yüzden varsayılan buydu.
 */

const OTEL_KIMLIKLERI = new Set(['kemskoy_hotel']);
const KALKACAK_ETIKET = new Set([
  'misafir', 'otel-misafiri', 'personel', 'otel-personeli', 'konuk'
]);

export const ADA_SAKINI_ETIKETI = 'ada-sakini';

/** Kişi mi — yalnız kişilerde silme yerine bu işlem öneriliyor. */
export function kisiMi(i: Item): boolean {
  return i.type === 'kisi' || i.type === 'karakter';
}

/** Zaten ada sakini mi? */
export function adaSakiniMi(i: Item): boolean {
  return (i.tags || []).includes(ADA_SAKINI_ETIKETI);
}

/**
 * Dönüşmüş kaydı üretir. Yazmaz — çağıran kaydeder.
 * `items` oda kayıtlarını tanımak için gerekli.
 */
export function adaSakiniYap(kisi: Item, items: Item[]): Item {
  const odalar = new Set(
    items.filter(i => i.type === 'oda').map(i => i.id)
  );

  const m = { ...((kisi.metadata || {}) as any) };
  const eskiIliskiler = Array.isArray(m.relations) ? m.relations : [];
  m.relations = eskiIliskiler.filter((r: any) => {
    const hedef = String(r?.targetId || '');
    return !OTEL_KIMLIKLERI.has(hedef) && !odalar.has(hedef);
  });
  // oda bağı metadata'da ayrı da tutulabiliyor
  delete m.roomId;
  delete m.odaId;

  const etiketler = (kisi.tags || []).filter(t => !KALKACAK_ETIKET.has(t));
  if (!etiketler.includes(ADA_SAKINI_ETIKETI)) etiketler.push(ADA_SAKINI_ETIKETI);

  return {
    ...kisi,
    tags: etiketler,
    status: 'Ada sakini',
    metadata: m,
    updatedAt: Date.now()
  };
}

/** Kaç ilişkinin kesileceğini önceden söyler — onay metni için. */
export function adaSakiniOzeti(kisi: Item, items: Item[]): {
  kesilecek: number; kalan: number;
} {
  const once = Array.isArray((kisi.metadata as any)?.relations)
    ? (kisi.metadata as any).relations.length : 0;
  const sonra = Array.isArray((adaSakiniYap(kisi, items).metadata as any)?.relations)
    ? (adaSakiniYap(kisi, items).metadata as any).relations.length : 0;
  return { kesilecek: once - sonra, kalan: sonra };
}
