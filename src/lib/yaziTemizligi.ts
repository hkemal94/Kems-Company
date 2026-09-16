import type { Item } from '../types';

/**
 * "ø" temizliği.
 *
 * Otelin adı bir yerde "Kemskøy" diye yazılmış ve oradan bütün veriye
 * yayılmış: kişi notları, oda kayıtları, wiki bölümleri, ilişki gerekçeleri.
 * Yedekteki 162 kaydın 132'sinde geçiyordu. Kemal: "halen norveç ö'sü
 * kullanılıyor."
 *
 * Bu modül kaydın her metin alanını gezip ø → ö, Ø → Ö çevirir. Sadece bu
 * iki harf; başka hiçbir şeye dokunmaz. Kimlikler (`id`) DEĞİŞMEZ — kimlik
 * değiştirmek bütün bağlantıları koparır. Zaten kimliklerde ø yok
 * (`kemskoy_hotel` gibi ASCII yazılmışlar).
 */

const CEVIRI: Array<[RegExp, string]> = [
  [/ø/g, 'ö'],
  [/Ø/g, 'Ö']
];

/** Metindeki ø'leri ö yapar */
export function metniTemizle(metin: string): string {
  let cikti = metin;
  for (const [desen, yeni] of CEVIRI) cikti = cikti.replace(desen, yeni);
  return cikti;
}

export function metindeVarMi(metin: string): boolean {
  return /[øØ]/.test(metin);
}

/**
 * Bir değeri derinlemesine gezip metinleri temizler.
 *
 * `atla` içindeki anahtarlara hiç girilmez — kimlik alanları böyle korunur.
 * Base64 görseller de atlanır: hem çok uzunlar hem de içlerinde ø geçmez,
 * boşuna gezmeye gerek yok.
 */
function derinTemizle(deger: unknown, atla: Set<string>): {
  yeni: unknown; sayac: number;
} {
  if (typeof deger === 'string') {
    if (deger.startsWith('data:')) return { yeni: deger, sayac: 0 };
    if (!metindeVarMi(deger)) return { yeni: deger, sayac: 0 };
    const temiz = metniTemizle(deger);
    return { yeni: temiz, sayac: (deger.match(/[øØ]/g) ?? []).length };
  }

  if (Array.isArray(deger)) {
    let sayac = 0;
    const yeni = deger.map(d => {
      const s = derinTemizle(d, atla);
      sayac += s.sayac;
      return s.yeni;
    });
    return { yeni: sayac ? yeni : deger, sayac };
  }

  if (deger && typeof deger === 'object') {
    let sayac = 0;
    const kaynak = deger as Record<string, unknown>;
    const yeni: Record<string, unknown> = { ...kaynak };
    for (const [anahtar, v] of Object.entries(kaynak)) {
      if (atla.has(anahtar)) continue;
      const s = derinTemizle(v, atla);
      if (s.sayac) { yeni[anahtar] = s.yeni; sayac += s.sayac; }
    }
    return { yeni: sayac ? yeni : deger, sayac };
  }

  return { yeni: deger, sayac: 0 };
}

/** Kimlik taşıyan alanlar — bunlara girilmez */
const KIMLIK_ALANLARI = new Set([
  'id', 'userId', 'links', 'targetId', 'sourceId', 'itemId',
  'brandId', 'themeId', 'dropId', 'placeId', 'projectId', 'wikiId',
  'haritaBinaId', 'ustMarka'
]);

export interface TemizlikSonucu {
  /** Değişen kayıtlar — olduğu gibi yazılabilir */
  degisenler: Item[];
  /** Toplam kaç harf değişti */
  harf: number;
}

/**
 * Bütün kayıtları gezer, ø geçenleri temizlenmiş hâliyle döndürür.
 * Hiçbir şey yazmaz — yazma kararı çağıranın.
 */
export function oTemizligi(items: Item[]): TemizlikSonucu {
  const degisenler: Item[] = [];
  let harf = 0;

  for (const item of items) {
    let sayac = 0;
    const yeni: Item = { ...item };

    if (metindeVarMi(item.title)) {
      sayac += (item.title.match(/[øØ]/g) ?? []).length;
      yeni.title = metniTemizle(item.title);
    }
    if (typeof item.notes === 'string' && metindeVarMi(item.notes)) {
      sayac += (item.notes.match(/[øØ]/g) ?? []).length;
      yeni.notes = metniTemizle(item.notes);
    }
    if (Array.isArray(item.tags)) {
      const t = derinTemizle(item.tags, KIMLIK_ALANLARI);
      if (t.sayac) { yeni.tags = t.yeni as string[]; sayac += t.sayac; }
    }
    if (item.metadata) {
      const m = derinTemizle(item.metadata, KIMLIK_ALANLARI);
      if (m.sayac) {
        yeni.metadata = m.yeni as Item['metadata'];
        sayac += m.sayac;
      }
    }

    if (sayac) { degisenler.push(yeni); harf += sayac; }
  }

  return { degisenler, harf };
}
