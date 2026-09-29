import type { HaritaDuzeni, KurucuBelge, MekanDuzeni } from './duzenTipi';
import type { Nokta, SinirHatlari } from './sinirBolgeleri';

/**
 * Adanın yeni koordinata taşınması (H, 29 Eylül 2026).
 *
 * Kemal (W3 52–53. tur): eski konum 39,005 K · 25,805 D Midilli'nin
 * batısına, Yunan sularına düşüyordu. Yeni konum 39,60 K · 25,85 D —
 * Bozcaada'nın güneybatısı, Babakale'nin batısı.
 *
 * Harita verisi (duzadaGeo.ts, duzadaDem.ts) üreticideki formülle metre
 * metre taşındı; ada, mahalleler, yollar aynı, ölçüler aynı. Kemal'in
 * kayıtlı düzeni (`duzada/haritaDuzeni`: sınır hatları, yollar, mekân
 * konumları, Kurucu taslağı) ise boylam/enlem olarak duruyor ve aynı
 * çeviriyle taşınmalı.
 *
 * Düzen belgesinin `surum` alanı 1 ise eski koordinattadır. Okunurken
 * burada çevrilir (harita eski düzeni yeni yerde doğru gösterir); kalıcı
 * yazım Neyin Eksik'teki tek seferlik kartla yapılır.
 *
 * Bu dosya büyük harita verisini içeri çekmemeli (ana pakette okunuyor);
 * o yüzden merkezler burada da yazılı. YENI_MERKEZ = DUZADA_MERKEZ.
 */

export const ESKI_MERKEZ: Nokta = [25.805, 39.005];
export const YENI_MERKEZ: Nokta = [25.85, 39.6];
/** Bu sürümden küçük düzen belgeleri eski koordinattadır */
export const YENI_KOORDINAT_SURUMU = 2;

const M_ENLEM = 111_132;
const mBoylam = (enlem: number) => 111_320 * Math.cos((enlem * Math.PI) / 180);
const yuvarla = (n: number) => Math.round(n * 1e6) / 1e6;

/** Eski koordinattaki bir noktanın yeni yeri (metre korunur) */
export function eskidenYeniye([boylam, enlem]: Nokta): Nokta {
  const x = (boylam - ESKI_MERKEZ[0]) * mBoylam(ESKI_MERKEZ[1]);
  const y = (enlem - ESKI_MERKEZ[1]) * M_ENLEM;
  return [yuvarla(YENI_MERKEZ[0] + x / mBoylam(YENI_MERKEZ[1])), yuvarla(YENI_MERKEZ[1] + y / M_ENLEM)];
}

const hatlariTasi = (h: SinirHatlari): SinirHatlari =>
  Object.fromEntries(Object.entries(h).map(([id, n]) => [id, n.map(eskidenYeniye)]));

function mekanlariTasi(m: MekanDuzeni | undefined): MekanDuzeni | undefined {
  if (!m) return m;
  return Object.fromEntries(Object.entries(m).map(([id, k]) => [
    id, k.konum ? { ...k, konum: eskidenYeniye(k.konum) } : k
  ]));
}

/** Düz dizi [b0, e0, b1, e1, …] */
function duzDiziyiTasi(n: number[]): number[] {
  const cikti: number[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) cikti.push(...eskidenYeniye([n[i], n[i + 1]]));
  return cikti;
}

function kurucuyuTasi(k: KurucuBelge | undefined): KurucuBelge | undefined {
  if (!k) return k;
  return {
    ...k,
    yeniYollar: Object.fromEntries(Object.entries(k.yeniYollar ?? {}).map(([id, y]) => [id, { ...y, n: duzDiziyiTasi(y.n) }])),
    ...(k.yeniBinalar ? {
      yeniBinalar: Object.fromEntries(Object.entries(k.yeniBinalar).map(([id, b]) => {
        const [x, y] = eskidenYeniye([b.x, b.y]);
        return [id, { ...b, x, y }];
      }))
    } : {})
  };
}

/** Eski koordinattaki bir düzeni yeni koordinata taşır */
export function duzeniTasi(d: HaritaDuzeni): HaritaDuzeni {
  const mekanlar = mekanlariTasi(d.mekanlar);
  const kurucu = kurucuyuTasi(d.kurucu);
  const kurucuIslenen = kurucuyuTasi(d.kurucuIslenen);
  const cikti: HaritaDuzeni = {
    ...d,
    surum: YENI_KOORDINAT_SURUMU,
    hatlar: hatlariTasi(d.hatlar),
    yollar: hatlariTasi(d.yollar)
  };
  // Tanımsız alan yazılmaz (Firestore)
  if (mekanlar) cikti.mekanlar = mekanlar;
  if (kurucu) cikti.kurucu = kurucu;
  if (kurucuIslenen) cikti.kurucuIslenen = kurucuIslenen;
  return cikti;
}
