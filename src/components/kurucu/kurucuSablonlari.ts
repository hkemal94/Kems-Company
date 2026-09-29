import type { Nokta } from '../harita/sinirBolgeleri';
import type { YolTuru } from './kurucuTipi';

/**
 * Kurucu — bina türleri ve hazır mahalle şablonları (2. adım).
 *
 * Şablonlar yerel metre düzleminde, (0, 0) merkezli tanımlıdır: x sağa,
 * y aşağı (SVG gibi). "Kıyı" olan şablonlarda deniz yukarıda (y < 0) varsayılır;
 * Kemal yerleştirirken döndürür. Şablon adları türdür, özel ad değildir —
 * yerleşen sokak ve binalara ad verilmez (ad Kemal'in).
 *
 * Rastgelelik tohumludur: önizlemede görünen ile yerleşen aynıdır.
 */

export type BinaTuru =
  | 'ev' | 'dukkanli' | 'kamu' | 'ciftlik' | 'yazlik'
  | 'saha' | 'tribun' | 'meydan' | 'cesme' | 'agac' | 'depo';

export const BINA_TURLERI: Array<{
  id: BinaTuru; ad: string; aciklama: string;
  en: number; boy: number; kat: number;
  renk: string; kenar: string; yuvarlak?: boolean; elle: boolean;
}> = [
  { id: 'ev', ad: 'Müstakil ev', aciklama: '1–2 kat, bahçeli', en: 10, boy: 11, kat: 2, renk: '#DCC6A4', kenar: '#8E7C5E', elle: true },
  { id: 'dukkanli', ad: 'Dükkânlı ev', aciklama: 'Altı dükkân, üstü ev', en: 13, boy: 11, kat: 2, renk: '#D2AE86', kenar: '#86694A', elle: true },
  { id: 'yazlik', ad: 'Yazlık', aciklama: 'Geniş bahçeli, tek kat', en: 14, boy: 12, kat: 1, renk: '#E6D7BE', kenar: '#9A8667', elle: true },
  { id: 'ciftlik', ad: 'Taş çiftlik evi', aciklama: 'Avlulu, 1–2 kat', en: 16, boy: 11, kat: 1, renk: '#C9B38C', kenar: '#7F6B4B', elle: true },
  { id: 'kamu', ad: 'Kamu / büyük yapı', aciklama: 'Okul, cami, kahvehane…', en: 22, boy: 15, kat: 2, renk: '#BFCBC2', kenar: '#6F8175', elle: true },
  { id: 'depo', ad: 'Depo / atölye', aciklama: 'Liman, çiftlik', en: 18, boy: 12, kat: 1, renk: '#C4B9A8', kenar: '#7A6F5E', elle: true },
  { id: 'meydan', ad: 'Meydan', aciklama: 'Taş döşeli açık alan', en: 36, boy: 30, kat: 0, renk: '#E9E1D0', kenar: '#B7A488', elle: true },
  { id: 'cesme', ad: 'Çeşme', aciklama: 'Meydan çeşmesi', en: 3, boy: 3, kat: 0, renk: '#9EC0CB', kenar: '#5E7F8A', elle: true },
  { id: 'agac', ad: 'Büyük ağaç', aciklama: 'Çınar, meydan ağacı', en: 14, boy: 14, kat: 0, renk: '#8FA876', kenar: '#5F7A4C', yuvarlak: true, elle: true },
  { id: 'saha', ad: 'Futbol sahası', aciklama: '105 × 68 m', en: 105, boy: 68, kat: 0, renk: '#A9C08F', kenar: '#6F8A5A', elle: false },
  { id: 'tribun', ad: 'Tribün', aciklama: 'Saha kenarı', en: 90, boy: 12, kat: 1, renk: '#B7A488', kenar: '#7A6A55', elle: false }
];

export const binaBilgisi = (t: BinaTuru) => BINA_TURLERI.find(b => b.id === t)!;

export interface SablonYol { tur: YolTuru; m: Nokta[] }
export interface SablonBina { tur: BinaTuru; m: Nokta; en: number; boy: number; aci: number }
export interface SablonCikti { yollar: SablonYol[]; binalar: SablonBina[] }

// ---- yardımcılar ----------------------------------------------------------------

/** Tohumlu rastgele (mulberry32) — her şablon hep aynı çıkar */
function tohumlu(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hat boyunca, iki yanına (ya da bir yanına) aralıklı bina dizer */
export function hatBoyuBinalar(
  hat: Nokta[], tur: BinaTuru, aralik: number, geri: number,
  yanlar: Array<1 | -1>, rnd: () => number = Math.random, bosluk = 0.12
): SablonBina[] {
  const b = binaBilgisi(tur);
  const cikti: SablonBina[] = [];
  for (let i = 1; i < hat.length; i++) {
    const a = hat[i - 1];
    const c = hat[i];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (l < aralik * 0.8) continue;
    const ux = dx / l, uy = dy / l;
    const aci = Math.atan2(dy, dx);
    const adet = Math.floor(l / aralik);
    const bas = (l - (adet - 1) * aralik) / 2;
    for (const yan of yanlar) {
      for (let k = 0; k < adet; k++) {
        if (rnd() < bosluk) continue; // arada boş arsa
        const s = bas + k * aralik + (rnd() - 0.5) * aralik * 0.15;
        const d = geri + b.boy / 2 + rnd() * 2.5;
        cikti.push({
          tur,
          m: [a[0] + ux * s - uy * d * yan, a[1] + uy * s + ux * d * yan],
          en: b.en * (0.9 + rnd() * 0.2),
          boy: b.boy * (0.9 + rnd() * 0.2),
          aci: aci + (rnd() - 0.5) * 0.06
        });
      }
    }
  }
  return cikti;
}

const bina = (tur: BinaTuru, x: number, y: number, aci = 0, olcek = 1): SablonBina => {
  const b = binaBilgisi(tur);
  return { tur, m: [x, y], en: b.en * olcek, boy: b.boy * olcek, aci };
};

/** Hafif kıvrımlı hat: iki nokta arası, ortada yana sapma */
function kivrim(a: Nokta, b: Nokta, sapma: number, adim = 4): Nokta[] {
  const cikti: Nokta[] = [];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  for (let i = 0; i <= adim; i++) {
    const t = i / adim;
    const s = Math.sin(Math.PI * t) * sapma;
    cikti.push([a[0] + dx * t + nx * s, a[1] + dy * t + ny * s]);
  }
  return cikti;
}

// ---- şablonlar ------------------------------------------------------------------

/** Ege liman kasabası: kıyıda kordon, arkada paralel sokaklar, ara sokaklar */
function limanKasabasi(): SablonCikti {
  const r = tohumlu(11);
  const yollar: SablonYol[] = [];
  const binalar: SablonBina[] = [];
  const kordon: Nokta[] = [[-190, 0], [-60, 4], [60, 4], [190, 0]];
  yollar.push({ tur: 'ana', m: kordon });
  const arka1: Nokta[] = [[-160, 52], [-50, 56], [50, 56], [160, 50]];
  const arka2: Nokta[] = [[-120, 108], [0, 112], [120, 104]];
  yollar.push({ tur: 'sokak', m: arka1 }, { tur: 'sokak', m: arka2 });
  for (const x of [-150, -85, -20, 45, 110, 165]) {
    const ust = x > -125 && x < 125 ? 108 : 52;
    yollar.push({ tur: 'sokak', m: [[x, 3], [x + 4, 30], [x + 2, ust]] });
  }
  // Kordonun kara yanı dükkânlı evler; iskele ucu kıyıda
  binalar.push(...hatBoyuBinalar(kordon, 'dukkanli', 16, 4, [1], r, 0.05));
  binalar.push(...hatBoyuBinalar(arka1, 'ev', 17, 3.5, [1, -1], r));
  binalar.push(...hatBoyuBinalar(arka2, 'ev', 18, 3.5, [1, -1], r));
  binalar.push(bina('meydan', 0, 26, 0, 0.9), bina('kamu', 0, 74));
  return { yollar, binalar };
}

/** Köy meydanı: çeşme ve ağaç, kahvehane, meydandan dağılan kıvrımlı sokaklar */
function koyMeydani(): SablonCikti {
  const r = tohumlu(23);
  const yollar: SablonYol[] = [];
  const binalar: SablonBina[] = [
    bina('meydan', 0, 0), bina('cesme', 6, 4), bina('agac', -8, -5),
    bina('kamu', 0, -30, 0, 0.8), bina('dukkanli', 28, 0, Math.PI / 2), bina('dukkanli', -28, 2, Math.PI / 2)
  ];
  const kollar: Array<[number, number]> = [[0.2, 150], [1.5, 130], [2.6, 160], [3.9, 140], [5.1, 120]];
  for (const [aci, uzun] of kollar) {
    const bas: Nokta = [Math.cos(aci) * 22, Math.sin(aci) * 20];
    const son: Nokta = [Math.cos(aci + 0.25) * uzun, Math.sin(aci + 0.25) * uzun];
    const hat = kivrim(bas, son, 14 * (r() - 0.5) * 2, 5);
    yollar.push({ tur: 'sokak', m: hat });
    binalar.push(...hatBoyuBinalar(hat.slice(1), 'ev', 16, 3, [1, -1], r, 0.2));
  }
  return { yollar, binalar };
}

/** Dağınık çiftlik: toprak yollar, avlulu taş evler, patikalar, depolar */
function daginikCiftlik(): SablonCikti {
  const r = tohumlu(37);
  const ana: Nokta[] = kivrim([-260, 20], [260, -10], 40, 8);
  const yollar: SablonYol[] = [{ tur: 'toprak', m: ana }];
  const binalar: SablonBina[] = [];
  const noktalar: Nokta[] = [[-200, -90], [-110, 110], [-20, -120], [70, 95], [160, -80], [230, 110]];
  for (const [x, y] of noktalar) {
    const aci = (r() - 0.5) * 0.8;
    binalar.push(bina('ciftlik', x, y, aci));
    if (r() > 0.4) binalar.push(bina('depo', x + 22 * Math.cos(aci), y + 22 * Math.sin(aci) + 14, aci, 0.7));
    // Ana yola en yakın noktaya patika
    let en = ana[0];
    for (const p of ana) if (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(en[0] - x, en[1] - y)) en = p;
    yollar.push({ tur: Math.abs(y) > 100 ? 'patika' : 'toprak', m: kivrim([x, y + (y > 0 ? -8 : 8)], en, 10 * (r() - 0.5), 3) });
  }
  return { yollar, binalar };
}

/** Stat çevresi: saha, iki tribün, ana yol, otopark, birahane, bir sıra ev */
function statCevresi(): SablonCikti {
  const r = tohumlu(51);
  const yol: Nokta[] = [[-170, 75], [0, 78], [170, 74]];
  const sokak: Nokta[] = [[-150, 150], [0, 154], [150, 148]];
  const yollar: SablonYol[] = [
    { tur: 'ana', m: yol }, { tur: 'sokak', m: sokak },
    { tur: 'sokak', m: [[-110, 77], [-112, 150]] }, { tur: 'sokak', m: [[105, 76], [108, 149]] }
  ];
  const binalar: SablonBina[] = [
    bina('saha', 0, 0), bina('tribun', 0, -44), bina('tribun', 0, 44),
    bina('meydan', -95, 0, 0, 1.1), bina('dukkanli', 95, 30)
  ];
  binalar.push(...hatBoyuBinalar(sokak, 'ev', 17, 3.5, [1, -1], r));
  return { yollar, binalar };
}

/** Tepe köyü: yamaçta eş yükselti gibi kıvrılan sokaklar, sık taş evler (Adatepe tarzı) */
function tepeKoyu(): SablonCikti {
  const r = tohumlu(67);
  const yollar: SablonYol[] = [];
  const binalar: SablonBina[] = [];
  const kat: Nokta[][] = [];
  for (let i = 0; i < 4; i++) {
    const y = -60 + i * 42;
    const hat: Nokta[] = [];
    for (let x = -130 + i * 12; x <= 130 - i * 12; x += 26) hat.push([x, y + Math.sin(x / 45 + i) * 10]);
    kat.push(hat);
    yollar.push({ tur: 'sokak', m: hat });
    binalar.push(...hatBoyuBinalar(hat, 'ev', 14, 2.5, [1], r, 0.08));
  }
  // Basamaklı patikalar
  yollar.push({ tur: 'patika', m: [kat[0][2], kat[1][2], kat[2][2], kat[3][1]] });
  yollar.push({ tur: 'patika', m: [kat[0][7], kat[1][6], kat[2][5], kat[3][4]] });
  binalar.push(bina('meydan', 0, 96, 0, 0.7), bina('agac', 8, 94));
  return { yollar, binalar };
}

/** Sahil yazlıkları: kıyıya paralel yol, geniş parselli yazlıklar */
function sahilYazliklari(): SablonCikti {
  const r = tohumlu(79);
  const yol: Nokta[] = [[-230, 30], [-80, 36], [80, 32], [230, 38]];
  const yollar: SablonYol[] = [{ tur: 'sokak', m: yol }];
  const binalar = hatBoyuBinalar(yol, 'yazlik', 30, 8, [1, -1], r, 0.15);
  for (const x of [-150, 0, 150]) yollar.push({ tur: 'patika', m: [[x, 30], [x + 6, -10]] });
  return { yollar, binalar };
}

export interface Sablon {
  id: string;
  ad: string;
  aciklama: string;
  /** Kıyıya konacaksa deniz tarafı yukarı */
  kiyi: boolean;
  uret: () => SablonCikti;
}

export const SABLONLAR: Sablon[] = [
  { id: 'liman', ad: 'Ege liman kasabası', aciklama: 'Küçükkuyu / Bozcaada gibi: kıyıda kordon, arkada paralel sokaklar. Deniz yukarıda.', kiyi: true, uret: limanKasabasi },
  { id: 'meydan', ad: 'Köy meydanı', aciklama: 'Çeşme, büyük ağaç, kahvehane; meydandan dağılan sokaklar', kiyi: false, uret: koyMeydani },
  { id: 'ciftlik', ad: 'Dağınık çiftlik', aciklama: 'Toprak yol, avlulu taş evler, depolar, patikalar', kiyi: false, uret: daginikCiftlik },
  { id: 'stat', ad: 'Stat çevresi', aciklama: 'Saha, iki tribün, meydan / otopark, birahane, ev sırası', kiyi: false, uret: statCevresi },
  { id: 'tepe', ad: 'Tepe köyü', aciklama: 'Adatepe gibi: yamaçta kıvrılan sokaklar, sık taş evler', kiyi: false, uret: tepeKoyu },
  { id: 'sahil', ad: 'Sahil yazlıkları', aciklama: 'Kıyıya paralel yol, geniş bahçeli yazlıklar. Deniz yukarıda.', kiyi: true, uret: sahilYazliklari }
];

/** Şablonu döndürüp ölçekleyip verilen merkeze taşır (metre düzleminde) */
export function sablonuYerlestir(c: SablonCikti, merkez: Nokta, aci: number, olcek: number): SablonCikti {
  const cos = Math.cos(aci), sin = Math.sin(aci);
  const tasi = (p: Nokta): Nokta => [
    merkez[0] + (p[0] * cos - p[1] * sin) * olcek,
    merkez[1] + (p[0] * sin + p[1] * cos) * olcek
  ];
  return {
    yollar: c.yollar.map(y => ({ tur: y.tur, m: y.m.map(tasi) })),
    binalar: c.binalar.map(b => ({ ...b, m: tasi(b.m), aci: b.aci + aci }))
  };
}

/** Döndürülmüş dikdörtgenin köşeleri (metre) */
export function binaKoseleri(m: Nokta, en: number, boy: number, aci: number): Nokta[] {
  const c = Math.cos(aci), s = Math.sin(aci);
  const yx = en / 2, yy = boy / 2;
  return ([[-yx, -yy], [yx, -yy], [yx, yy], [-yx, yy]] as Nokta[]).map(
    ([x, y]) => [m[0] + x * c - y * s, m[1] + x * s + y * c] as Nokta
  );
}
