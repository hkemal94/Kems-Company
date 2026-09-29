import type { Feature } from 'geojson';
import { catmullRom, type Nokta } from '../harita/sinirBolgeleri';
import type { KurucuBelge } from '../harita/duzenTipi';
import { belgedenTaslak, metreye, derceye, type YolTuru } from './kurucuTipi';
import { binaBilgisi, binaKoseleri, type BinaTuru } from './kurucuSablonlari';

/**
 * Kurucu'nun haritaya işlenmiş katmanı (3. adım: "Haritaya işle").
 *
 * `duzada/haritaDuzeni` belgesindeki `kurucuIslenen` alanı, Kurucu'da
 * "Haritaya işle"ye basıldığı andaki taslağın kopyasıdır. Harita her
 * açılışta bu katmanı üretilmiş verinin üstüne bindirir:
 *   - kaldırılan yollar / yapılar gizlenir (veriden silinmez),
 *   - türü değişen yolların çizgisi değişir,
 *   - yeni yollar ve yapılar eklenir.
 * Yeni yol ve yapılara ad verilmez.
 */

/** Kurucu yol türü → haritanın yol türü (çizim kademesi) */
const HARITA_YOL: Record<YolTuru, string> = {
  ana: 'yol', sokak: 'sokak', toprak: 'toprak', patika: 'patika'
};

/** Düz alanlar prizma değil, zemine giydirilen dolgu olarak çizilir */
const ZEMIN_TURU: Partial<Record<BinaTuru, string>> = {
  meydan: 'teras', saha: 'saha', agac: 'bahçe', bag: 'bahçe'
};

export function kurucuKatmani(features: Feature[], belge: KurucuBelge): Feature[] {
  const t = belgedenTaslak(belge);
  const gizli = new Set(t.gizlenen);

  const cikti: Feature[] = [];
  for (const f of features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const id = String(p.id ?? '');
    const katman = String(p.katman ?? '');
    if ((katman === 'yol' || katman === 'bina' || katman === 'zemin') && gizli.has(id)) continue;
    if (katman === 'etiket' && id.startsWith('etk_') && gizli.has(id.slice(4))) continue;
    if (katman === 'yol' && t.turDegisikligi[id]) {
      cikti.push({ ...f, properties: { ...p, tur: HARITA_YOL[t.turDegisikligi[id]] } });
      continue;
    }
    cikti.push(f);
  }

  for (const [id, y] of Object.entries(t.yeniYollar)) {
    if (gizli.has(id)) continue;
    cikti.push({
      type: 'Feature',
      properties: { katman: 'yol', id, ad: '', tur: HARITA_YOL[y.tur], kurucu: true },
      geometry: { type: 'LineString', coordinates: catmullRom(y.noktalar, false, 6) }
    });
  }

  for (const [id, b] of Object.entries(t.yeniBinalar)) {
    if (gizli.has(id)) continue;
    const bi = binaBilgisi(b.tur);
    const m = metreye(b.merkez);
    let halka: Nokta[];
    if (bi.yuvarlak) {
      halka = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return derceye([m[0] + Math.cos(a) * b.en / 2, m[1] + Math.sin(a) * b.en / 2]);
      });
    } else {
      halka = binaKoseleri(m, b.en, b.boy, b.aci).map(derceye);
    }
    const kapali = [...halka, halka[0]];
    const zemin = ZEMIN_TURU[b.tur];
    cikti.push(zemin
      ? {
          type: 'Feature',
          properties: { katman: 'zemin', id, ad: '', tur: zemin, kurucu: true },
          geometry: { type: 'Polygon', coordinates: [kapali] }
        }
      : {
          type: 'Feature',
          properties: {
            // Haritanın künye kutusu türü olduğu gibi gösteriyor: okunur ad
            katman: 'bina', id, ad: '', tur: bi.ad, kurucuTur: b.tur, mahalle: null, wikiId: null,
            yukseklik: b.tur === 'cesme' ? 1.2 : b.tur === 'tribun' ? 6 : Math.max(bi.kat, 1) * 3.2,
            taban: 0, kat: Math.max(bi.kat, 1), kurucu: true
          },
          geometry: { type: 'Polygon', coordinates: [kapali] }
        });
  }
  return cikti;
}

/** Taslak ile haritadaki hâl aynı mı? (Haritaya işle düğmesi için) */
export function belgelerAyniMi(a: KurucuBelge | undefined, b: KurucuBelge | undefined): boolean {
  const bos = (x?: KurucuBelge) => !x || (!Object.keys(x.yeniYollar ?? {}).length
    && !Object.keys(x.turDegisikligi ?? {}).length && !(x.gizlenen ?? []).length
    && !Object.keys(x.yeniBinalar ?? {}).length);
  if (bos(a) && bos(b)) return true;
  const sirali = (x?: KurucuBelge) => JSON.stringify(x ?? {}, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]]))
      : v);
  return sirali(a) === sirali(b);
}
