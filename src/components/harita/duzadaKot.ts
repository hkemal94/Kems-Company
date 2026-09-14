import { DEM_PNG, DEM_SINIR, DEM_EN, DEM_BOY } from '../../data/duzadaDem';
import type { Nokta } from './sinirBolgeleri';

/**
 * Rakım okuyucu.
 *
 * Arazi PNG'sini bir kez çözüp bellekte tutuyor; düzenleyici yol çizerken
 * eğimi anında söyleyebilsin diye. Yoksa dağın üstünden yol geçirip
 * üreteç çalışana kadar fark edilmiyor.
 *
 * Kodlama Terrarium: rakım = (R * 256 + G + B / 256) - 32768
 */

const [BATI, GUNEY, DOGU, KUZEY] = DEM_SINIR;

let kotlar: Float32Array | null = null;
let yukleniyor: Promise<void> | null = null;

/** PNG'yi çözer. Düzenleyici açılırken bir kez çağrılır. */
export function kotlariYukle(): Promise<void> {
  if (kotlar) return Promise.resolve();
  if (yukleniyor) return yukleniyor;
  yukleniyor = new Promise<void>((coz, hata) => {
    const im = new Image();
    im.onload = () => {
      const tuval = document.createElement('canvas');
      tuval.width = DEM_EN;
      tuval.height = DEM_BOY;
      const ct = tuval.getContext('2d', { willReadFrequently: true });
      if (!ct) return hata(new Error('2B bağlam yok'));
      ct.drawImage(im, 0, 0);
      const veri = ct.getImageData(0, 0, DEM_EN, DEM_BOY).data;
      const cikti = new Float32Array(DEM_EN * DEM_BOY);
      for (let i = 0, k = 0; i < cikti.length; i++, k += 4) {
        cikti[i] = veri[k] * 256 + veri[k + 1] + veri[k + 2] / 256 - 32768;
      }
      kotlar = cikti;
      coz();
    };
    im.onerror = () => hata(new Error('DEM yüklenemedi'));
    im.src = DEM_PNG;
  });
  return yukleniyor;
}

/** Bir enlem/boylamın rakımı (metre). Yüklenmemişse 0. */
export function kotOku(lng: number, lat: number): number {
  if (!kotlar) return 0;
  const u = ((lng - BATI) / (DOGU - BATI)) * (DEM_EN - 1);
  const v = ((KUZEY - lat) / (KUZEY - GUNEY)) * (DEM_BOY - 1);
  if (u < 0 || v < 0 || u > DEM_EN - 1 || v > DEM_BOY - 1) return 0;
  // Çift doğrusal ara değer: tek hücreye yuvarlarsak eğim basamaklanıyor
  const i0 = Math.floor(u);
  const j0 = Math.floor(v);
  const i1 = Math.min(i0 + 1, DEM_EN - 1);
  const j1 = Math.min(j0 + 1, DEM_BOY - 1);
  const fu = u - i0;
  const fv = v - j0;
  const a = kotlar[j0 * DEM_EN + i0];
  const b = kotlar[j0 * DEM_EN + i1];
  const c = kotlar[j1 * DEM_EN + i0];
  const d = kotlar[j1 * DEM_EN + i1];
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}

const M_PER_LAT = 111132;
const M_PER_LNG = 111320 * Math.cos((39.005 * Math.PI) / 180);

/** İki nokta arası metre */
export function metre(a: Nokta, b: Nokta): number {
  return Math.hypot((b[0] - a[0]) * M_PER_LNG, (b[1] - a[1]) * M_PER_LAT);
}

export interface YolOlcusu {
  /** metre */
  uzunluk: number;
  /** yüzde */
  ortalamaEgim: number;
  /** yüzde */
  enDikEgim: number;
  /** metre — en alçak ve en yüksek */
  altKot: number;
  ustKot: number;
}

/** Bir hattın uzunluğu ve eğimi */
export function yoluOlc(hat: Nokta[]): YolOlcusu {
  let uzunluk = 0;
  let toplamDusey = 0;
  let enDik = 0;
  let alt = Infinity;
  let ust = -Infinity;
  let oncekiKot = hat.length ? kotOku(hat[0][0], hat[0][1]) : 0;
  alt = Math.min(alt, oncekiKot);
  ust = Math.max(ust, oncekiKot);
  for (let i = 1; i < hat.length; i++) {
    const d = metre(hat[i - 1], hat[i]);
    const k = kotOku(hat[i][0], hat[i][1]);
    const dusey = Math.abs(k - oncekiKot);
    uzunluk += d;
    toplamDusey += dusey;
    if (d > 1) enDik = Math.max(enDik, (dusey / d) * 100);
    alt = Math.min(alt, k);
    ust = Math.max(ust, k);
    oncekiKot = k;
  }
  return {
    uzunluk,
    ortalamaEgim: uzunluk > 0 ? (toplamDusey / uzunluk) * 100 : 0,
    enDikEgim: enDik,
    altKot: alt === Infinity ? 0 : alt,
    ustKot: ust === -Infinity ? 0 : ust
  };
}

/** Hattın herhangi bir noktası denizde mi? */
export function denizeTasiyorMu(hat: Nokta[]): boolean {
  return hat.some(p => kotOku(p[0], p[1]) <= 0.5);
}
