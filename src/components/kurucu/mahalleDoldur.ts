import type { Nokta } from '../harita/sinirBolgeleri';
import type { BinaTuru } from './kurucuSablonlari';
import { hattaUzaklik, karadaMi } from './kurucuTipi';

/**
 * Mahalle doldur (2 Ekim gece, watabou sonrası 3. paket).
 *
 * Kemal Kurucu'da bir dikdörtgen çizer; içindeki görünür sokakların iki
 * yanına, seçtiği dokuyla evler dizilir. Üretecin Ege dokusuyla aynı fikir
 * (`gen/duzada.py` → evler): ev sokağa yaslanır, cephe sokağa paraleldir;
 * bitişik dokuda evler arasında boşluk yoktur, belli aralıkla dar bir geçit
 * kalır. Sonuç önce taslak olarak bekler; Kemal "Yerleştir" demeden
 * hiçbir şey kayda yazılmaz.
 *
 * Saf fonksiyon: aynı girdi ve tohumla aynı sonucu verir.
 */

export type DokuTuru = 'bitisik' | 'karisik' | 'koy' | 'seyrek';

type Aralik = [number, number];

export interface Doku {
  id: DokuTuru;
  ad: string;
  aciklama: string;
  cephe: Aralik; derin: Aralik; ara: Aralik; geri: Aralik;
  /** Dar geçit aralığı (m); yoksa geçit bırakılmaz */
  gecit: Aralik | null;
  siklik: number;
  katlar: number[];
}

export const DOKULAR: Doku[] = [
  { id: 'bitisik', ad: 'Bitişik çarşı', aciklama: 'İskele gibi: bitişik, 2–3 kat, arada dar geçit',
    cephe: [6, 10], derin: [9, 13], ara: [0, 0], geri: [0.2, 0.9], gecit: [34, 60], siklik: 0.96, katlar: [2, 2, 3] },
  { id: 'karisik', ad: 'Karışık', aciklama: 'Liman gibi: çoğu bitişik, yer yer aralık',
    cephe: [7, 12], derin: [9, 14], ara: [0, 1.5], geri: [0.4, 1.8], gecit: [40, 70], siklik: 0.88, katlar: [1, 2, 2, 3] },
  { id: 'koy', ad: 'Bahçeli köy', aciklama: 'Merkez gibi: müstakil, 1–2 kat',
    cephe: [8, 12], derin: [8, 11], ara: [2, 6], geri: [1, 3.5], gecit: null, siklik: 0.82, katlar: [1, 2, 2] },
  { id: 'seyrek', ad: 'Seyrek', aciklama: 'Stadyum gibi: aralıklı, iki kat',
    cephe: [9, 13], derin: [9, 12], ara: [4, 9], geri: [2.5, 5], gecit: null, siklik: 0.75, katlar: [2, 2, 1] }
];

export const dokuBul = (id: DokuTuru) => DOKULAR.find(d => d.id === id)!;

/** Doldurmaya giren yol: parçaları (metre) ve yarı genişliği */
export interface DoldurYolu { parcalar: Nokta[][]; yari: number; cepheAlir: boolean }

export interface DoldurEv { tur: BinaTuru; m: Nokta; en: number; boy: number; aci: number; kat: number }

export interface DoldurAlani { x0: number; y0: number; x1: number; y1: number }

/** Kurucu yol türü → yarı genişlik (m); üretecin değerleriyle aynı */
export function yolYariEni(tur: string, haritaTur: string): number {
  if (haritaTur === 'ana yol') return 6;
  if (haritaTur === 'yol' || haritaTur === 'cadde') return 4.5;
  if (tur === 'ana') return 4.5;
  if (tur === 'patika') return 1.2;
  return 3;
}

/** Tekrarlanabilir rastgele sayı (mulberry32) */
function rastgele(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const arasinda = (r: () => number, [a, b]: Aralik) => a + (b - a) * r();

/** İki dışbükey çokgen üst üste biniyor mu? (ayırıcı eksen) */
function biner(a: Nokta[], b: Nokta[]): boolean {
  for (const k of [a, b]) {
    for (let i = 0; i < k.length; i++) {
      const p = k[i], q = k[(i + 1) % k.length];
      const nx = q[1] - p[1], ny = p[0] - q[0];
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const v of a) { const d = v[0] * nx + v[1] * ny; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d); }
      for (const v of b) { const d = v[0] * nx + v[1] * ny; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d); }
      if (aMax <= bMin || bMax <= aMin) return false;
    }
  }
  return true;
}

/** Köşeleri merkezine doğru `pay` metre çeker (bitişik evler değebilsin) */
const daralt = (k: Nokta[], pay: number): Nokta[] => {
  const cx = k.reduce((t, p) => t + p[0], 0) / k.length;
  const cy = k.reduce((t, p) => t + p[1], 0) / k.length;
  return k.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x - ((x - cx) / d) * pay, y - ((y - cy) / d) * pay] as Nokta;
  });
};

/** Hat üstünde yay uzunluğundaki nokta */
function hatNoktasi(h: Nokta[], u: number[], s: number): Nokta {
  let i = 1;
  while (i < h.length - 1 && u[i] < s) i++;
  const a = h[i - 1], b = h[i];
  const l = u[i] - u[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (s - u[i - 1]) / l));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Alandaki sokakların iki yanına ev dizer.
 * `engeller`: haritadaki ve taslaktaki görünür yapıların köşeleri (metre).
 */
export function mahalleDoldur(
  alan: DoldurAlani, yollar: DoldurYolu[], engeller: Nokta[][], ada: Nokta[][],
  dokuId: DokuTuru, tohum: number
): DoldurEv[] {
  const d = dokuBul(dokuId);
  const r = rastgele(tohum);
  const x0 = Math.min(alan.x0, alan.x1), x1 = Math.max(alan.x0, alan.x1);
  const y0 = Math.min(alan.y0, alan.y1), y1 = Math.max(alan.y0, alan.y1);
  const alanda = (p: Nokta) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  const pay = 40;
  const yakin = (h: Nokta[]) => h.some(p => p[0] > x0 - pay && p[0] < x1 + pay && p[1] > y0 - pay && p[1] < y1 + pay);

  const ilgili = yollar
    .map(y => ({ ...y, parcalar: y.parcalar.filter(h => h.length >= 2 && yakin(h)) }))
    .filter(y => y.parcalar.length);
  const engel = engeller.filter(k => k.some(p => p[0] > x0 - pay && p[0] < x1 + pay && p[1] > y0 - pay && p[1] < y1 + pay));
  const konan: DoldurEv[] = [];
  const konanKose: Nokta[][] = [];

  const yolaBinmez = (k: Nokta[]) => {
    const orta: Nokta = [(k[0][0] + k[2][0]) / 2, (k[0][1] + k[2][1]) / 2];
    // köşeler, kenar ortaları ve merkez
    const noktalar: Nokta[] = [...k, orta, ...k.map((p, i) => {
      const q = k[(i + 1) % k.length];
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as Nokta;
    })];
    for (const y of ilgili) {
      for (const h of y.parcalar) {
        for (const p of noktalar) if (hattaUzaklik(p, h).d < y.yari + 0.6) return false;
      }
    }
    return true;
  };

  for (const y of ilgili) {
    if (!y.cepheAlir) continue;
    for (const h of y.parcalar) {
      const u = [0];
      for (let i = 1; i < h.length; i++) u.push(u[i - 1] + Math.hypot(h[i][0] - h[i - 1][0], h[i][1] - h[i - 1][1]));
      const L = u[u.length - 1];
      for (const yan of [1, -1]) {
        let s = r() * 1.5;
        let yolBoyu = 0;
        let sonrakiGecit = d.gecit ? arasinda(r, d.gecit) : Infinity;
        while (s < L - 3) {
          if (yolBoyu >= sonrakiGecit && s < L - 8) {
            s += 2.4 + r();
            yolBoyu = 0;
            sonrakiGecit = arasinda(r, d.gecit!);
            continue;
          }
          let c = arasinda(r, d.cephe);
          if (s + c > L) {
            if (L - s < d.cephe[0] * 0.7) break;
            c = L - s;
          }
          const p0 = hatNoktasi(h, u, s), p1 = hatNoktasi(h, u, s + c);
          let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
          const tn = Math.hypot(tx, ty);
          const bosluk = c + arasinda(r, d.ara);
          if (tn < c * 0.6) { s += 2; continue; }        // keskin dönemeç
          tx /= tn; ty /= tn;
          const nx = -ty * yan, ny = tx * yan;
          const derin = arasinda(r, d.derin);
          const g = y.yari + 0.8 + arasinda(r, d.geri) + derin / 2;
          const m: Nokta = [(p0[0] + p1[0]) / 2 + nx * g, (p0[1] + p1[1]) / 2 + ny * g];
          const aci = Math.atan2(ty, tx);
          const co = Math.cos(aci), si = Math.sin(aci);
          const k = ([[-tn / 2, -derin / 2], [tn / 2, -derin / 2], [tn / 2, derin / 2], [-tn / 2, derin / 2]] as Nokta[])
            .map(([a, b]) => [m[0] + a * co - b * si, m[1] + a * si + b * co] as Nokta);
          const ic = daralt(k, 0.3);
          if (r() < d.siklik && k.every(alanda) && k.every(p => karadaMi(p, ada))
              && !engel.some(o => biner(ic, o)) && !konanKose.some(o => biner(ic, o)) && yolaBinmez(k)) {
            konan.push({ tur: 'ev', m, en: Math.round(tn * 10) / 10, boy: Math.round(derin * 10) / 10,
              aci: Math.round(aci * 1000) / 1000, kat: d.katlar[Math.floor(r() * d.katlar.length)] });
            konanKose.push(k);
          }
          s += bosluk;
          yolBoyu += bosluk;
        }
      }
    }
  }
  return konan;
}
