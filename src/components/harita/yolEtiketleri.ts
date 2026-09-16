import type { Feature, FeatureCollection } from 'geojson';
import type { Nokta } from './sinirBolgeleri';

/**
 * Yol ve sokak adı etiketleri (H6).
 *
 * Üreteç yollar için etiket üretmiyor — haritada yalnızca mahalle, zirve,
 * yapı, koy ve deniz adları vardı. Bu modül etiketleri ÇİZİM ANINDA yoldan
 * hesaplıyor; veri dosyasına yazılmıyor. Böylece:
 *
 *   - `gen/duzada.py` yeniden çalıştığında bir şey bozulmuyor
 *   - düzenleyicide taşınan ya da adı değişen yol, etiketiyle birlikte
 *     kendiliğinden güncelleniyor
 *
 * Kemal'in şartı: "yaklaştıkça görünen bir şekilde olabilir, kalabalık
 * yaratmasın." O yüzden etiketler tür sırasına göre açılıyor (önce ana yollar,
 * en son sokaklar) ve çok kısa yollar hiç etiketlenmiyor.
 */

export interface YolEtiketi {
  id: string;
  ad: string;
  /** ETIKET_ARALIK anahtarı — hangi yakınlıkta görüneceğini belirler */
  tur: 'anayol' | 'cadde' | 'sokak';
  konum: Nokta;
  /** Yazının yola paralel durması için derece cinsinden açı */
  aci: number;
}

/** Etiketlenmeyecek kadar kısa yollar — derece cinsinden kaba uzunluk */
const EN_KISA = 0.0016; // ~150 m

/** Yol türünden etiket türüne */
function etiketTuru(tur: string): YolEtiketi['tur'] {
  if (tur === 'ana yol') return 'anayol';
  if (tur === 'sokak' || tur === 'merdiven') return 'sokak';
  return 'cadde';
}

/** İki nokta arasındaki düzlemsel uzaklık (derece) */
function uzaklik(a: Nokta, b: Nokta): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/**
 * Çizginin uzunlukça ortasındaki nokta ve oradaki yön.
 *
 * Basit "orta indis" yetmiyor: kontrol noktaları seyrek dağıldığında etiket
 * yolun ortasına değil, kalabalık uca düşüyor.
 */
function ortaNokta(cizgi: Nokta[]): { konum: Nokta; aci: number } | null {
  if (cizgi.length < 2) return null;

  let toplam = 0;
  for (let i = 1; i < cizgi.length; i++) toplam += uzaklik(cizgi[i - 1], cizgi[i]);
  if (toplam === 0) return null;

  const hedef = toplam / 2;
  let gidilen = 0;
  for (let i = 1; i < cizgi.length; i++) {
    const a = cizgi[i - 1];
    const b = cizgi[i];
    const d = uzaklik(a, b);
    if (gidilen + d >= hedef) {
      const t = d === 0 ? 0 : (hedef - gidilen) / d;
      const konum: Nokta = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      // Enlemde derece daha uzun; açıyı ekranda göründüğü gibi hesapla
      const enlemDuzeltme = Math.cos((konum[1] * Math.PI) / 180);
      let aci = Math.atan2(
        -(b[1] - a[1]), (b[0] - a[0]) * enlemDuzeltme
      ) * (180 / Math.PI);
      // Yazı baş aşağı durmasın
      if (aci > 90) aci -= 180;
      if (aci < -90) aci += 180;
      return { konum, aci };
    }
    gidilen += d;
  }
  return null;
}

/**
 * Çizilecek veriden yol etiketlerini üretir.
 *
 * Aynı adı taşıyan birden çok parça varsa yalnız en uzunu etiketlenir —
 * üreteçte bölünmüş yollar iki kere yazılmasın.
 */
export function yolEtiketleri(geo: FeatureCollection): YolEtiketi[] {
  const adaGore = new Map<string, { f: Feature; uzunluk: number }>();

  for (const f of geo.features) {
    const p = f.properties as Record<string, unknown> | null;
    if (!p || p.katman !== 'yol') continue;
    if (f.geometry.type !== 'LineString') continue;
    const ad = String(p.ad ?? '').trim();
    if (!ad) continue;

    const cizgi = (f.geometry.coordinates as number[][]).map(
      k => [k[0], k[1]] as Nokta
    );
    let uzunluk = 0;
    for (let i = 1; i < cizgi.length; i++) uzunluk += uzaklik(cizgi[i - 1], cizgi[i]);
    if (uzunluk < EN_KISA) continue;

    const eski = adaGore.get(ad);
    if (!eski || uzunluk > eski.uzunluk) adaGore.set(ad, { f, uzunluk });
  }

  const cikti: YolEtiketi[] = [];
  for (const [ad, { f }] of adaGore) {
    const p = f.properties as Record<string, unknown>;
    const cizgi = (f.geometry as { coordinates: number[][] }).coordinates.map(
      k => [k[0], k[1]] as Nokta
    );
    const orta = ortaNokta(cizgi);
    if (!orta) continue;
    cikti.push({
      id: `yoletk_${String(p.id)}`,
      ad,
      tur: etiketTuru(String(p.tur ?? 'yol')),
      konum: orta.konum,
      aci: orta.aci
    });
  }
  return cikti;
}
