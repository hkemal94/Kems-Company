import type { Item } from '../types';
import { kurumMu } from './markaYapisi';

/**
 * Vikinin baştan kurulması · W1 (28 Eylül 2026).
 *
 * Kemal: "Wikinin yenilenmesini istiyorum, her şeyi silebilirsin, baştan
 * soru cevapla yükleyebiliriz."
 *
 * Silmiyoruz, arşivliyoruz — bu projede hiçbir şey silinmez. Viki boş
 * görünür, eski kayıtlar arşivden tek tek geri gelir. Hepsine aynı etiket
 * konur; gerekirse toplu geri getirmek için bu etiketle bulunur.
 *
 * Kemal'in seçimleri:
 *   - Kişiler, otel odaları, mekânlar, konmuş adlı kayıtlar dahil hepsi
 *     arşive kalkar.
 *   - Ada ölçüleri, beş mahalle ve konmuş adlar KANONDA (docs/03) kalır;
 *     soru-cevapta yeni kayıt açılırken oradan alınır.
 *
 * Dokunulmayanlar:
 *   - Adanın kendi kaydı (duzada_world_details) — ölçüler burada.
 *   - Marka ve kurum kayıtları — droplar bunlara bağlı; arşive kalkarsa
 *     Merch'teki kurum süzgeci ve "Seri Aç" kırılır (Kemal onayladı).
 *   - Harita verisi (map_settings, map_pin) — harita ayrı ele alınacak.
 *   - Merch, Kitap, Blog, Oyun alanları — viki değil.
 */

export const ADA_KIMLIGI = 'duzada_world_details';

/** Arşive kalkan her kayda konan etiket */
export const SIFIRLAMA_ETIKETI = 'viki-sifirlama-2026-09';

/** Kartta gösterilecek tür adları */
const TUR_ADI: Record<string, string> = {
  kisi: 'kişi',
  karakter: 'karakter',
  oda: 'oda',
  mekân: 'mekân',
  yer: 'yer',
  dükkân: 'dükkân',
  olay: 'olay',
  ürün: 'evren ürünü',
};

/**
 * Sıfırlamadan sonra açılan kayıtlar. W1 bir kere basıldı; bu tarihten
 * sonra açılan maddeler (W2 aktarımı, haritadan kurulanlar, elle
 * yazılanlar) kartı yeniden çıkarmamalı. 28 Eylül 2026 00:00, Türkiye.
 */
const SIFIRLAMA_TARIHI = Date.UTC(2026, 8, 27, 21, 0);

function korunurMu(i: Item): boolean {
  if (i.id === ADA_KIMLIGI) return true;
  // Arşivden bilerek geri getirilen kayıt yeniden arşive kalkmaz
  if ((i.tags || []).includes(SIFIRLAMA_ETIKETI)) return true;
  if ((i.createdAt || 0) >= SIFIRLAMA_TARIHI) return true;
  if (i.type === 'marka' || i.type === 'kulüp' || kurumMu(i)) return true;
  if (i.type === 'map_settings' || i.type === 'map_pin') return true;
  return false;
}

export interface VikiSifirlama {
  /** Arşive kalkacak kayıtlar */
  arsivlenecek: Item[];
  /** Türe göre sayım, kartta gösterilir: "94 kişi · 20 oda …" */
  dagilim: Array<{ tur: string; sayi: number }>;
}

export function vikiSifirlama(items: Item[]): VikiSifirlama {
  const arsivlenecek = items.filter(
    i => i.area === 'duzada' && !i.archived && !korunurMu(i)
  );

  const sayac = new Map<string, number>();
  for (const i of arsivlenecek) {
    const tur = TUR_ADI[i.type] ?? String(i.type);
    sayac.set(tur, (sayac.get(tur) ?? 0) + 1);
  }
  const dagilim = [...sayac.entries()]
    .map(([tur, sayi]) => ({ tur, sayi }))
    .sort((a, b) => b.sayi - a.sayi);

  return { arsivlenecek, dagilim };
}

/**
 * Yazılacak kayıtları üretir. Hiçbir şeyi kendisi yazmaz — çağıran taraf
 * sırayla kaydeder. Metin, künye, bağ, görsel olduğu gibi kalır; yalnız
 * `archived` ve etiket değişir.
 */
export function vikiSifirlamaYazilari(items: Item[]): Item[] {
  const simdi = Date.now();
  return vikiSifirlama(items).arsivlenecek.map(i => ({
    ...i,
    archived: true,
    tags: (i.tags || []).includes(SIFIRLAMA_ETIKETI)
      ? i.tags
      : [...(i.tags || []), SIFIRLAMA_ETIKETI],
    updatedAt: simdi,
  }));
}
