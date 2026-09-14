import { DUZADA_GEO } from '../../data/duzadaGeo';
import type { Nokta } from './sinirBolgeleri';

/**
 * Mıknatıs — sürüklenen köşeyi yakınındaki çizgiye çeker.
 *
 * Sınır elle çizilirken "şu yolu izlesin" ya da "şu eşyükseltiye otursun"
 * demek gerekiyor; gözle tutturmak imkânsız. Köşe hedefe yaklaşınca
 * kendiliğinden yapışıyor.
 *
 * Veri küçük (yollar ~1200 nokta, eşyükselti ~500, kıyı ~360), o yüzden
 * mekânsal indeks yok: her sürükleme adımında hepsine bakmak birkaç yüz
 * mikrosaniye sürüyor.
 */

export type ManyetikTur = 'yol' | 'esyukselti' | 'kiyi';

export interface ManyetikHedef {
  tur: ManyetikTur;
  ad: string;
  /** Ardışık nokta çiftleri — çizgi parçaları */
  nokta: Nokta[];
  kapali: boolean;
}

let onbellek: ManyetikHedef[] | null = null;

/** Haritadaki bütün mıknatıs hedeflerini bir kez toplar */
export function manyetikHedefler(): ManyetikHedef[] {
  if (onbellek) return onbellek;
  const hedefler: ManyetikHedef[] = [];

  for (const f of DUZADA_GEO.features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const katman = String(p.katman ?? '');

    if (katman === 'yol' && f.geometry.type === 'LineString') {
      hedefler.push({
        tur: 'yol',
        ad: String(p.ad ?? p.id ?? 'yol'),
        nokta: f.geometry.coordinates as Nokta[],
        kapali: false
      });
    }

    // Eşyükselti bantlarının kenarı eşyükselti çizgisinin kendisi
    if (katman === 'rolyef' && f.geometry.type === 'Polygon') {
      for (const halka of f.geometry.coordinates as Nokta[][]) {
        hedefler.push({
          tur: 'esyukselti',
          ad: `${p.esik} m`,
          nokta: halka,
          kapali: true
        });
      }
    }

    if (katman === 'ada' && f.geometry.type === 'Polygon') {
      hedefler.push({
        tur: 'kiyi',
        ad: 'kıyı',
        nokta: f.geometry.coordinates[0] as Nokta[],
        kapali: true
      });
    }
  }

  onbellek = hedefler;
  return hedefler;
}

/** Bir parçanın üstünde verilen noktaya en yakın konum */
function parcadaEnYakin(a: Nokta, b: Nokta, n: Nokta): Nokta {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const kare = vx * vx + vy * vy;
  if (kare === 0) return [a[0], a[1]];
  let t = ((n[0] - a[0]) * vx + (n[1] - a[1]) * vy) / kare;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + vx * t, a[1] + vy * t];
}

export interface ManyetikSonuc {
  nokta: Nokta;
  tur: ManyetikTur;
  ad: string;
}

/**
 * `nokta`ya en yakın mıknatıs konumu — `esik` dereceden uzaksa null.
 *
 * `esik` piksel değil derece cinsinden: çağıran, haritanın o anki
 * ölçeğinden hesaplıyor ki yapışma hissi her yakınlıkta aynı olsun.
 */
export function manyetikCek(
  nokta: Nokta,
  esik: number,
  acikTurler: Set<ManyetikTur>
): ManyetikSonuc | null {
  if (!acikTurler.size) return null;
  let en: ManyetikSonuc | null = null;
  let enMesafe = esik;

  for (const hedef of manyetikHedefler()) {
    if (!acikTurler.has(hedef.tur)) continue;
    const dizi = hedef.nokta;
    const son = hedef.kapali ? dizi.length : dizi.length - 1;
    for (let i = 0; i < son; i++) {
      const a = dizi[i];
      const b = dizi[(i + 1) % dizi.length];
      // Ucuz ön eleme: parçanın kutusu eşikten uzaksa atla
      if (Math.min(a[0], b[0]) - esik > nokta[0]) continue;
      if (Math.max(a[0], b[0]) + esik < nokta[0]) continue;
      if (Math.min(a[1], b[1]) - esik > nokta[1]) continue;
      if (Math.max(a[1], b[1]) + esik < nokta[1]) continue;

      const p = parcadaEnYakin(a, b, nokta);
      const d = Math.hypot(p[0] - nokta[0], p[1] - nokta[1]);
      if (d < enMesafe) {
        enMesafe = d;
        en = { nokta: p, tur: hedef.tur, ad: hedef.ad };
      }
    }
  }
  return en;
}
