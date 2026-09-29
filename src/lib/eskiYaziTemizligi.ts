import type { Item, WikiSection } from '../types';
import type { EskiMetin } from './soruCevapAktarimi';

/**
 * Eski otel simülasyonundan kalan yazıların vikiden kaldırılması (K, 29 Eylül 2026).
 *
 * Kemal: "Eski kalan bilgileri sil lütfen, onlar artık geçerli değil."
 * docs/04-durum.md "Otel maddesi temizliği" listesindekiler: "Ekim 2003
 * (Sezon Sonu)" dönemi, Liman 54 ve Peron adları, "Oda Yapısı" bölümü,
 * odalarda "Deluxe" tipi ve "bakımda" durumu.
 *
 * Silme yok: yazı vikiden çıkar, kaydın görünmeyen `eskiMetin` alanına
 * taşınır. Bir şey bulunmazsa kart görünmez; ikinci basışta iz kalmadığı
 * için hiçbir şey yapmaz.
 */

const GUN = '2026-09-29';

/** Eski simülasyonun izleri */
const IZ = /Ekim 2003|Oct(ober)? 2003|Sezon Sonu|Liman 54|\bPeron\b|Deluxe|bakımda/i;
const ESKI_BOLUM = /oda yapısı/i;

/** Odalardaki simülasyon alanları */
const ODA_ALANLARI = ['isMaintenance', 'maintenanceReason'] as const;

export interface EskiYaziTemizligi {
  degisenler: Item[];
  /** Taşınacak parça sayısı */
  parca: number;
}

export function eskiYaziTemizligi(items: Item[]): EskiYaziTemizligi {
  const degisenler: Item[] = [];
  let parca = 0;

  for (const item of items) {
    if (item.archived) continue;
    const eski: EskiMetin[] = [];
    const tasi = (kaynak: string, metin: string) => {
      if (metin.trim()) eski.push({ kaynak, metin: metin.trim(), tasindi: GUN });
    };

    // Gövde: izi taşıyan satırlar
    const satirlar = (item.notes || '').split('\n');
    const kalan = satirlar.filter(s => {
      if (IZ.test(s)) { tasi('gövde', s); return false; }
      return true;
    });

    // Bölümler: "Oda Yapısı" ve izi taşıyan bölümler vikiden çıkar
    const bolumler: WikiSection[] = (item.metadata?.wikiSections as WikiSection[]) || [];
    const kalanBolum = bolumler.filter(b => {
      if (ESKI_BOLUM.test(b.title || '') || IZ.test(b.content || '')) {
        tasi(`bölüm: ${b.title}`, b.content || '');
        return false;
      }
      return true;
    });

    // Künye alanları. Firestore birleştirerek yazdığı için alan anahtarı
    // çıkarılarak silinemiyor; boş değerle üstü yazılır.
    const profil = { ...((item.metadata?.profile as Record<string, unknown>) || {}) };
    let profilDegisti = false;
    for (const [k, v] of Object.entries(profil)) {
      if (typeof v === 'string' && IZ.test(v)) {
        tasi(`künye: ${k}`, v);
        profil[k] = '';
        profilDegisti = true;
      }
    }

    // Odalar: "Deluxe" tipi ve bakım işareti
    const ust: Record<string, unknown> = {};
    const meta = (item.metadata || {}) as Record<string, unknown>;
    if (typeof meta.roomType === 'string' && IZ.test(meta.roomType)) {
      tasi('oda tipi', meta.roomType);
      ust.roomType = '';
    }
    for (const k of ODA_ALANLARI) {
      const v = meta[k];
      if (v === true || (typeof v === 'string' && v.trim())) {
        tasi(`oda: ${k}`, String(v === true ? 'bakımda' : v));
        ust[k] = typeof v === 'boolean' ? false : '';
      }
    }

    if (!eski.length) continue;
    parca += eski.length;
    const oncekiEski = (item.metadata?.eskiMetin as EskiMetin[]) || [];
    degisenler.push({
      ...item,
      notes: kalan.join('\n').trim(),
      updatedAt: Date.now(),
      metadata: {
        ...item.metadata,
        ...ust,
        ...(bolumler.length !== kalanBolum.length ? { wikiSections: kalanBolum } : {}),
        ...(profilDegisti ? { profile: profil } : {}),
        eskiMetin: [...oncekiEski, ...eski]
      }
    });
  }

  return { degisenler, parca };
}
