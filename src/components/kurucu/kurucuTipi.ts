import type { FeatureCollection } from 'geojson';
import { DUZADA_MERKEZ } from '../../data/duzadaGeo';
import type { Nokta } from '../harita/sinirBolgeleri';
import type { KurucuBelge } from '../harita/duzenTipi';
import { BINA_TURLERI, type BinaTuru } from './kurucuSablonlari';

export type { KurucuBelge };

/**
 * Kurucu (şehir kurucu) — taslak kaydı ve saf yardımcılar.
 *
 * Kurucu haritanın kendisini değiştirmez: çizilen her şey bir TASLAK'ta
 * durur. Taslak "Haritaya işle" düğmesiyle (sonraki adım) haritaya geçer;
 * o zaman eski hâl arşive kalkar. Şimdilik taslak yalnız saklanır.
 *
 * Kayıt yeri: `duzada/haritaDuzeni` belgesinin `kurucu` alanı. Ayrı belge
 * açmak Firestore kuralı değiştirmeyi gerektirirdi; bu belge zaten açık
 * erişimli ve kural yalnız ilk dört alanın varlığına bakıyor.
 *
 * Firestore iç içe dizi kabul etmiyor: yol noktaları düz sayı dizisi
 * olarak yazılır ([x0, y0, x1, y1, …]).
 */

export type YolTuru = 'ana' | 'sokak' | 'toprak' | 'patika';

export const YOL_TURLERI: Array<{
  id: YolTuru; ad: string; aciklama: string;
  renk: string; kenar: string | null; kalinlik: number; kesik?: string;
}> = [
  { id: 'ana', ad: 'Ana yol', aciklama: 'Sahil yolu, bağlantılar — asfalt, geniş',
    renk: '#FFFFFF', kenar: '#9C8467', kalinlik: 5 },
  { id: 'sokak', ad: 'Mahalle sokağı', aciklama: 'Dar; parke ya da asfalt',
    renk: '#FFFFFF', kenar: '#B7A488', kalinlik: 3 },
  { id: 'toprak', ad: 'Toprak yol', aciklama: 'Çiftlik ve tepe',
    renk: '#B08F72', kenar: null, kalinlik: 2.5, kesik: '7 4' },
  { id: 'patika', ad: 'Patika', aciklama: 'Yürüyüş, gizli koylar, merdiven',
    renk: '#6F5E48', kenar: null, kalinlik: 1.5, kesik: '2 3' }
];

export const turBilgisi = (t: YolTuru) => YOL_TURLERI.find(x => x.id === t)!;

/** Haritadaki (üreteçten gelen) yol türü → Kurucu türü */
export function haritaTuru(tur: string): YolTuru {
  switch (tur) {
    case 'ana yol':
    case 'yol':
    case 'cadde':
      return 'ana';
    case 'merdiven':
      return 'patika';
    case 'toprak':
      return 'toprak';
    case 'patika':
      return 'patika';
    default:
      return 'sokak';
  }
}

export interface KurucuTaslak {
  /** Kurucuda çizilen yeni yollar — [boylam, enlem] noktaları */
  yeniYollar: Record<string, { tur: YolTuru; noktalar: Nokta[] }>;
  /** Haritadan gelen yolun türü taslakta değiştiyse */
  turDegisikligi: Record<string, YolTuru>;
  /** Taslakta kaldırılan yollar ve binalar (haritadan gelen ya da yeni). Silinmez. */
  gizlenen: string[];
  /** Kurucuda konan yeni binalar — merkez [boylam, enlem], ölçüler metre, açı radyan */
  yeniBinalar: Record<string, { tur: BinaTuru; merkez: Nokta; en: number; boy: number; aci: number; kat?: number }>;
  /** Özel yapılar — köşeler [boylam, enlem] */
  ozelYapilar: Record<string, OzelYapi>;
  /** Doğa alanları — köşeler [boylam, enlem] */
  doga: Record<string, { tur: DogaTuru; koseler: Nokta[] }>;
  /** Yapı kimliği → viki maddesi kimliği */
  baglar: Record<string, string>;
  /** Haritadan gelen yolun yeni hâli: parçalar, [boylam, enlem] (30 Eylül) */
  yolDuzeni: Record<string, Nokta[][]>;
  /** Haritadan gelen yapının düzeltmesi: dx/dy metre (doğu/güney), aci radyan */
  binaDuzeni: Record<string, BinaDuzeltme>;
}

export interface BinaDuzeltme { dx: number; dy: number; aci: number; kat?: number; tur?: BinaTuru }

export type Cati = 'duz' | 'besik';
export interface OzelYapi { koseler: Nokta[]; kat: number; cati: Cati; kalip?: string }
export type DogaTuru = 'zeytinlik' | 'orman' | 'kumsal';
export const DOGA_TURLERI: Array<{ id: DogaTuru; ad: string; renk: string; kenar: string; aciklama: string }> = [
  { id: 'zeytinlik', ad: 'Zeytinlik', renk: '#8FA25E', kenar: '#5E7340', aciklama: 'Sıra sıra zeytin ağaçları' },
  { id: 'orman', ad: 'Orman', renk: '#4F6F42', kenar: '#34502D', aciklama: 'Çam ve meşe' },
  { id: 'kumsal', ad: 'Kumsal', renk: '#EBDDB0', kenar: '#C6B27E', aciklama: 'Kıyıda kum' }
];

export const bosTaslak = (): KurucuTaslak => ({ yeniYollar: {}, turDegisikligi: {}, gizlenen: [], yeniBinalar: {}, ozelYapilar: {}, doga: {}, baglar: {}, yolDuzeni: {}, binaDuzeni: {} });

const duz = (k: Nokta[]) => k.flatMap(p => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6]);
const coz = (n: unknown): Nokta[] => {
  if (!Array.isArray(n)) return [];
  const c: Nokta[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x = Number(n[i]), y = Number(n[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) c.push([x, y]);
  }
  return c;
};


const TURLER = new Set<string>(YOL_TURLERI.map(t => t.id));

export function taslaktanBelge(t: KurucuTaslak): KurucuBelge {
  return {
    surum: 1,
    yeniYollar: Object.fromEntries(
      Object.entries(t.yeniYollar).map(([id, y]) => [id, { tur: y.tur, n: y.noktalar.flat() }])
    ),
    turDegisikligi: { ...t.turDegisikligi },
    gizlenen: [...t.gizlenen],
    yeniBinalar: Object.fromEntries(
      Object.entries(t.yeniBinalar).map(([id, b]) => [id, {
        tur: b.tur, x: b.merkez[0], y: b.merkez[1],
        en: Math.round(b.en * 10) / 10, boy: Math.round(b.boy * 10) / 10,
        aci: Math.round(b.aci * 1000) / 1000,
        ...(b.kat ? { kat: b.kat } : {})
      }])
    ),
    ozelYapilar: Object.fromEntries(
      Object.entries(t.ozelYapilar).map(([id, o]) => [id, {
        n: duz(o.koseler), kat: o.kat, cati: o.cati, ...(o.kalip ? { kalip: o.kalip } : {})
      }])
    ),
    doga: Object.fromEntries(Object.entries(t.doga).map(([id, d]) => [id, { tur: d.tur, n: duz(d.koseler) }])),
    baglar: { ...t.baglar },
    yolDuzeni: Object.fromEntries(Object.entries(t.yolDuzeni).map(([id, p]) => [id,
      Object.fromEntries(p.map((k, i) => [String(i), duz(k)]))])),
    binaDuzeni: Object.fromEntries(Object.entries(t.binaDuzeni).map(([id, b]) => [id, {
      dx: Math.round(b.dx * 10) / 10, dy: Math.round(b.dy * 10) / 10, aci: Math.round(b.aci * 1000) / 1000,
      ...(b.kat ? { kat: b.kat } : {}), ...(b.tur ? { tur: b.tur } : {})
    }]))
  };
}

export function belgedenTaslak(ham: unknown): KurucuTaslak {
  const t = bosTaslak();
  if (!ham || typeof ham !== 'object') return t;
  const b = ham as Partial<KurucuBelge>;
  for (const [id, y] of Object.entries(b.yeniYollar ?? {})) {
    if (!y || !Array.isArray(y.n) || !TURLER.has(String(y.tur))) continue;
    const noktalar: Nokta[] = [];
    for (let i = 0; i + 1 < y.n.length; i += 2) {
      const x = Number(y.n[i]);
      const yy = Number(y.n[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(yy)) noktalar.push([x, yy]);
    }
    if (noktalar.length >= 2) t.yeniYollar[id] = { tur: y.tur as YolTuru, noktalar };
  }
  for (const [id, tur] of Object.entries(b.turDegisikligi ?? {})) {
    if (TURLER.has(String(tur))) t.turDegisikligi[id] = tur as YolTuru;
  }
  if (Array.isArray(b.gizlenen)) t.gizlenen = b.gizlenen.filter(x => typeof x === 'string');
  const binaTurleri = new Set<string>(BINA_TURLERI.map(x => x.id));
  for (const [id, bn] of Object.entries(b.yeniBinalar ?? {})) {
    if (!bn || !binaTurleri.has(String(bn.tur))) continue;
    const say = [bn.x, bn.y, bn.en, bn.boy, bn.aci].map(Number);
    if (!say.every(Number.isFinite)) continue;
    t.yeniBinalar[id] = { tur: bn.tur as BinaTuru, merkez: [say[0], say[1]], en: say[2], boy: say[3], aci: say[4],
      ...(Number(bn.kat) >= 1 ? { kat: Math.round(Number(bn.kat)) } : {}) };
  }
  for (const [id, o] of Object.entries(b.ozelYapilar ?? {})) {
    const k = coz(o?.n);
    if (k.length < 3) continue;
    const kat = Math.min(Math.max(Math.round(Number(o.kat) || 1), 1), 30);
    t.ozelYapilar[id] = { koseler: k, kat, cati: o.cati === 'besik' ? 'besik' : 'duz', ...(o.kalip ? { kalip: String(o.kalip) } : {}) };
  }
  const dogaTurleri = new Set<string>(DOGA_TURLERI.map(d => d.id));
  for (const [id, d] of Object.entries(b.doga ?? {})) {
    const k = coz(d?.n);
    if (k.length >= 3 && dogaTurleri.has(String(d.tur))) t.doga[id] = { tur: d.tur as DogaTuru, koseler: k };
  }
  for (const [id, w] of Object.entries(b.baglar ?? {})) if (typeof w === 'string' && w) t.baglar[id] = w;
  for (const [id, p] of Object.entries(b.yolDuzeni ?? {})) {
    const parcalar = Object.keys(p ?? {}).sort((x, y) => Number(x) - Number(y)).map(i => coz(p[i])).filter(k => k.length >= 2);
    if (parcalar.length) t.yolDuzeni[id] = parcalar;
  }
  for (const [id, bd] of Object.entries(b.binaDuzeni ?? {})) {
    const say = [bd?.dx, bd?.dy, bd?.aci].map(Number);
    if (!say.every(Number.isFinite)) continue;
    t.binaDuzeni[id] = {
      dx: say[0], dy: say[1], aci: say[2],
      ...(Number(bd.kat) >= 1 ? { kat: Math.round(Number(bd.kat)) } : {}),
      ...(bd.tur && binaTurleri.has(String(bd.tur)) ? { tur: bd.tur as BinaTuru } : {})
    };
  }
  return t;
}

export const taslakBosMu = (t: KurucuTaslak) =>
  !Object.keys(t.yeniYollar).length && !Object.keys(t.turDegisikligi).length && !t.gizlenen.length
  && !Object.keys(t.yeniBinalar).length && !Object.keys(t.ozelYapilar).length
  && !Object.keys(t.doga).length && !Object.keys(t.baglar).length
  && !Object.keys(t.yolDuzeni).length && !Object.keys(t.binaDuzeni).length;

// ---- izdüşüm: boylam/enlem ↔ metre (ada merkezinde düz) -------------------

const [L0, A0] = DUZADA_MERKEZ;
const M_ENLEM = 111320;
const M_BOYLAM = 111320 * Math.cos((A0 * Math.PI) / 180);

/** [boylam, enlem] → [x, y] metre; y aşağı doğru (SVG) */
export const metreye = (p: Nokta): Nokta => [(p[0] - L0) * M_BOYLAM, -(p[1] - A0) * M_ENLEM];
export const derceye = (m: Nokta): Nokta => [m[0] / M_BOYLAM + L0, -m[1] / M_ENLEM + A0];

/** Metre cinsinden hat uzunluğu */
export function uzunluk(noktalar: Nokta[]): number {
  let t = 0;
  for (let i = 1; i < noktalar.length; i++) {
    const a = metreye(noktalar[i - 1]);
    const b = metreye(noktalar[i]);
    t += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return t;
}

// ---- haritadan başlangıç -----------------------------------------------------

export interface KurucuYol {
  id: string;
  ad: string;
  /** Haritadaki asıl tür (bilgi için) */
  haritaTur: string;
  tur: YolTuru;
  /** Metre, bütün noktalar (kavşağa yapışma için) */
  m: Nokta[];
  /**
   * Metre, çizilecek parçalar. Parçası silinmemiş yolda tek parça (= m).
   * Yeni yolda eğri; haritadan gelende gerçek noktalar.
   */
  parcalar: Nokta[][];
  /** Yeni yolda: kullanıcının koyduğu kontrol noktaları (metre) */
  kontrol?: Nokta[];
  yeni: boolean;
  gizli: boolean;
  /** Haritadan gelen yol ve noktası taşındı ya da parçası silindi */
  duzenli?: boolean;
}

export interface Zemin {
  ada: Nokta[][];
  mahalleler: Array<{ id: string; halka: Nokta[][] }>;
  binalar: Array<{ id: string; ad: string; halka: Nokta[]; wikiId?: string; kat?: number; tur?: string }>;
  etiketler: Array<{ ad: string; m: Nokta; tur: string }>;
  yollar: Array<{ id: string; ad: string; tur: string; noktalar: Nokta[] }>;
}

/** Harita verisinden (düzen uygulanmış) Kurucu'nun zemini */
export function zeminCikar(geo: FeatureCollection): Zemin {
  const z: Zemin = { ada: [], mahalleler: [], binalar: [], etiketler: [], yollar: [] };
  for (const f of geo.features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const g = f.geometry;
    const katman = String(p.katman ?? '');
    if (katman === 'ada' && g.type === 'Polygon') {
      z.ada = (g.coordinates as Nokta[][]).map(h => h.map(metreye));
    } else if (katman === 'mahalle' && g.type === 'Polygon') {
      z.mahalleler.push({ id: String(p.id), halka: (g.coordinates as Nokta[][]).map(h => h.map(metreye)) });
    } else if (katman === 'bina' && g.type === 'Polygon') {
      z.binalar.push({
        id: String(p.id), ad: String(p.ad ?? ''),
        halka: (g.coordinates as Nokta[][])[0].map(metreye),
        ...(p.wikiId ? { wikiId: String(p.wikiId) } : {}),
        ...(Number(p.kat) ? { kat: Number(p.kat) } : {}),
        ...(p.tur ? { tur: String(p.tur) } : {})
      });
    } else if (katman === 'etiket' && g.type === 'Point' && (p.tur === 'mahalle' || p.tur === 'zirve')) {
      z.etiketler.push({ ad: String(p.ad ?? ''), m: metreye(g.coordinates as Nokta), tur: String(p.tur) });
    } else if (katman === 'yol' && g.type === 'LineString') {
      z.yollar.push({
        id: String(p.id), ad: String(p.ad ?? p.id), tur: String(p.tur ?? 'yol'),
        noktalar: (g.coordinates as Nokta[]).map(k => [k[0], k[1]] as Nokta)
      });
    }
  }
  return z;
}

/** Taslağı zemine bindirip çizilecek yol listesini kurar */
export function yollariKur(
  zemin: Zemin, taslak: KurucuTaslak, egri: (k: Nokta[]) => Nokta[]
): KurucuYol[] {
  const gizli = new Set(taslak.gizlenen);
  const cikti: KurucuYol[] = zemin.yollar.map(y => {
    const duzen = taslak.yolDuzeni[y.id];
    const parcalar = duzen ? duzen.map(k => k.map(metreye)) : [y.noktalar.map(metreye)];
    return {
      id: y.id, ad: y.ad, haritaTur: y.tur,
      tur: taslak.turDegisikligi[y.id] ?? haritaTuru(y.tur),
      m: parcalar.flat(), parcalar, yeni: false, gizli: gizli.has(y.id), duzenli: !!duzen
    };
  });
  let n = 0;
  for (const [id, y] of Object.entries(taslak.yeniYollar)) {
    n++;
    const m = egri(y.noktalar).map(metreye);
    cikti.push({
      id, ad: `Yeni yol ${n}`, haritaTur: '—', tur: y.tur,
      m, parcalar: [m], kontrol: y.noktalar.map(metreye), yeni: true, gizli: gizli.has(id)
    });
  }
  return cikti;
}

// ---- mıknatıs ---------------------------------------------------------------

export interface Yapisma {
  m: Nokta;
  /** 'kose': bir yolun köşesi · 'hat': bir yolun üstü · 'uc': çizilen yolun ilk noktası */
  tur: 'kose' | 'hat' | 'uc';
  yolId?: string;
}

/**
 * İmlecin yakınındaki yola yapışır. Önce köşeler (kavşak), sonra hat üstü.
 * `esik` metre cinsinden (ekrandaki ~12 px'in karşılığı).
 */
export function yapistir(
  m: Nokta, yollar: KurucuYol[], esik: number, cizilen: Nokta[] = []
): Yapisma | null {
  let en: Yapisma | null = null;
  let enD = esik;
  if (cizilen.length >= 2) {
    const ilk = cizilen[0];
    const d = Math.hypot(ilk[0] - m[0], ilk[1] - m[1]);
    if (d < enD) { enD = d; en = { m: ilk, tur: 'uc' }; }
  }
  for (const y of yollar) {
    if (y.gizli) continue;
    for (const k of y.m) {
      const d = Math.hypot(k[0] - m[0], k[1] - m[1]);
      if (d < enD) { enD = d; en = { m: k, tur: 'kose', yolId: y.id }; }
    }
  }
  if (en) return en;
  enD = esik * 0.8;
  for (const y of yollar) {
    if (y.gizli) continue;
    for (const hat of y.parcalar) for (let i = 1; i < hat.length; i++) {
      const a = hat[i - 1];
      const b = hat[i];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((m[0] - a[0]) * dx + (m[1] - a[1]) * dy) / l2));
      const q: Nokta = [a[0] + dx * t, a[1] + dy * t];
      const d = Math.hypot(q[0] - m[0], q[1] - m[1]);
      if (d < enD) { enD = d; en = { m: q, tur: 'hat', yolId: y.id }; }
    }
  }
  return en;
}

/** Yeni yol kimliği — zaman damgası, çakışmaz */
export function yeniYolId(mevcut: Record<string, unknown>, onek = 'kurucu_yol'): string {
  let id = `${onek}_${Date.now().toString(36)}`;
  let i = 1;
  while (mevcut[id]) id = `${onek}_${Date.now().toString(36)}_${i++}`;
  return id;
}

/** Nokta karada mı? (adanın halkaları, çift-tek kuralı) */
export function karadaMi(m: Nokta, halkalar: Nokta[][]): boolean {
  let ic = false;
  for (const h of halkalar) {
    for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
      const [xi, yi] = h[i];
      const [xj, yj] = h[j];
      if ((yi > m[1]) !== (yj > m[1]) && m[0] < ((xj - xi) * (m[1] - yi)) / (yj - yi) + xi) ic = !ic;
    }
  }
  return ic;
}

// ---- binalar ----------------------------------------------------------------

export interface KurucuBina {
  id: string;
  ad: string;
  /** Haritadan gelenlerde yok (tür bilinmiyor, köşeler hazır) */
  tur: BinaTuru | null;
  /** Köşeler, metre */
  kose: Nokta[];
  m: Nokta;
  r: number;
  yeni: boolean;
  gizli: boolean;
  en?: number;
  boy?: number;
  aci?: number;
  /** Haritada bağlı olduğu viki maddesi */
  wikiId?: string;
  kat?: number;
  /** Haritadan gelen yapının üreteçteki türü (ev, ahır, depo…) */
  haritaTur?: string;
  /** Haritadan gelen yapı taşındı / döndü / katı ya da türü değişti */
  duzeltme?: BinaDuzeltme;
}

/** Köşeleri merkez etrafında döndürüp kaydırır (metre) */
export function kaydirDondur(k: Nokta[], dx: number, dy: number, aci: number): Nokta[] {
  if (!dx && !dy && !aci) return k;
  const c = merkezi(k);
  const co = Math.cos(aci), si = Math.sin(aci);
  return k.map(([x, y]) => [
    c[0] + (x - c[0]) * co - (y - c[1]) * si + dx,
    c[1] + (x - c[0]) * si + (y - c[1]) * co + dy
  ] as Nokta);
}

const merkezi = (k: Nokta[]): Nokta => [
  k.reduce((t, p) => t + p[0], 0) / k.length,
  k.reduce((t, p) => t + p[1], 0) / k.length
];

/** Zemin binaları + taslaktaki yeni binalar */
export function binalariKur(
  zemin: Zemin, taslak: KurucuTaslak,
  koseler: (m: Nokta, en: number, boy: number, aci: number) => Nokta[]
): KurucuBina[] {
  const gizli = new Set(taslak.gizlenen);
  const cikti: KurucuBina[] = zemin.binalar.map(b => {
    const ham = b.halka.length > 1 && b.halka[0][0] === b.halka[b.halka.length - 1][0]
      && b.halka[0][1] === b.halka[b.halka.length - 1][1] ? b.halka.slice(0, -1) : b.halka;
    const d = taslak.binaDuzeni[b.id];
    const k = d ? kaydirDondur(ham, d.dx, d.dy, d.aci) : ham;
    const m = merkezi(k);
    return {
      id: b.id, ad: b.ad || 'Yapı', tur: d?.tur ?? null, kose: k, m,
      r: Math.max(...k.map(p => Math.hypot(p[0] - m[0], p[1] - m[1]))),
      yeni: false, gizli: gizli.has(b.id), wikiId: b.wikiId, kat: d?.kat ?? b.kat,
      haritaTur: b.tur, ...(d ? { duzeltme: d } : {})
    };
  });
  for (const [id, b] of Object.entries(taslak.yeniBinalar)) {
    const m = metreye(b.merkez);
    cikti.push({
      id, ad: '', tur: b.tur, kose: koseler(m, b.en, b.boy, b.aci), m,
      r: Math.hypot(b.en, b.boy) / 2, yeni: true, gizli: gizli.has(id),
      en: b.en, boy: b.boy, aci: b.aci, kat: b.kat
    });
  }
  return cikti;
}

/** Noktanın bir hatta en kısa uzaklığı ve o parçanın yönü */
export function hattaUzaklik(m: Nokta, hat: Nokta[]): { d: number; aci: number; q: Nokta } {
  let en = { d: Infinity, aci: 0, q: m as Nokta };
  for (let i = 1; i < hat.length; i++) {
    const a = hat[i - 1], b = hat[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    if (!l2) continue;
    const t = Math.max(0, Math.min(1, ((m[0] - a[0]) * dx + (m[1] - a[1]) * dy) / l2));
    const q: Nokta = [a[0] + dx * t, a[1] + dy * t];
    const d = Math.hypot(q[0] - m[0], q[1] - m[1]);
    if (d < en.d) en = { d, aci: Math.atan2(dy, dx), q };
  }
  return en;
}

/**
 * Yeni bina konabilir mi? Karada olmalı, başka binaya binmemeli, bir yolun
 * üstüne düşmemeli. Açık alanlar (meydan, ağaç, çeşme, saha) yol kontrolünden
 * muaf: meydan yol kavşağında durabilir.
 */
export function binaKonabilirMi(
  b: { tur: BinaTuru; m: Nokta; en: number; boy: number },
  ada: Nokta[][], binalar: Array<{ m: Nokta; r: number; gizli?: boolean }>, yollar: Nokta[][]
): boolean {
  if (!karadaMi(b.m, ada)) return false;
  const r = Math.min(b.en, b.boy) / 2;
  for (const o of binalar) {
    if (o.gizli) continue;
    if (Math.hypot(o.m[0] - b.m[0], o.m[1] - b.m[1]) < (o.r * 0.75 + r)) return false;
  }
  if (['meydan', 'agac', 'cesme', 'saha', 'bag'].includes(b.tur)) return true;
  for (const h of yollar) {
    if (hattaUzaklik(b.m, h).d < r + 1.5) return false;
  }
  return true;
}

// ---- yol parçası: iki kavşak arası (30 Eylül) ----------------------------------

/** Hat üstünde yay uzunlukları (her noktaya kadar) */
function yayUzunluklari(h: Nokta[]): number[] {
  const u = [0];
  for (let i = 1; i < h.length; i++) u.push(u[i - 1] + Math.hypot(h[i][0] - h[i - 1][0], h[i][1] - h[i - 1][1]));
  return u;
}

/** Hattın [a, b] yay aralığındaki kısmı */
export function hatKes(h: Nokta[], a: number, b: number): Nokta[] {
  const u = yayUzunluklari(h);
  const nokta = (s: number): Nokta => {
    for (let i = 1; i < h.length; i++) {
      if (s <= u[i] || i === h.length - 1) {
        const t = u[i] === u[i - 1] ? 0 : Math.min(1, Math.max(0, (s - u[i - 1]) / (u[i] - u[i - 1])));
        return [h[i - 1][0] + (h[i][0] - h[i - 1][0]) * t, h[i - 1][1] + (h[i][1] - h[i - 1][1]) * t];
      }
    }
    return h[h.length - 1];
  };
  const cikti: Nokta[] = [nokta(a)];
  for (let i = 0; i < h.length; i++) if (u[i] > a && u[i] < b) cikti.push(h[i]);
  cikti.push(nokta(b));
  return cikti;
}

/** Noktanın hat üstündeki yay konumu ve uzaklığı */
function hattakiYer(m: Nokta, h: Nokta[]): { s: number; d: number } {
  const u = yayUzunluklari(h);
  let en = { s: 0, d: Infinity };
  for (let i = 1; i < h.length; i++) {
    const a = h[i - 1], b = h[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((m[0] - a[0]) * dx + (m[1] - a[1]) * dy) / l2)) : 0;
    const d = Math.hypot(a[0] + dx * t - m[0], a[1] + dy * t - m[1]);
    if (d < en.d) en = { s: u[i - 1] + Math.sqrt(l2) * t, d };
  }
  return en;
}

/**
 * Dokunulan yerin iki yanındaki kavşakları bulup o aradaki parçayı çıkarır.
 * Kavşak: başka bir yolun noktası ya da ucu bu yolun üstüne düşüyorsa.
 * Kalan parçaları döndürür (2 m'den kısalar atılır). Yol tek parçaysa ve
 * hiç kavşak yoksa boş dizi döner: bütün yol gider.
 */
export function parcaCikar(yol: KurucuYol, dokunus: Nokta, digerleri: KurucuYol[], esik = 1.5): Nokta[][] {
  // Dokunulan parça
  let pi = 0, enD = Infinity, s = 0;
  yol.parcalar.forEach((h, i) => { const y = hattakiYer(dokunus, h); if (y.d < enD) { enD = y.d; pi = i; s = y.s; } });
  const h = yol.parcalar[pi];
  const u = yayUzunluklari(h);
  const toplam = u[u.length - 1] ?? 0;
  // Bu parçadaki kavşakların yay konumları
  const kavsak: number[] = [];
  for (const o of digerleri) {
    if (o.id === yol.id || o.gizli) continue;
    for (const oh of o.parcalar) {
      // Öbür yolun bütün noktaları (uçlar dahil) bu hatta değiyorsa kavşaktır
      for (const k of oh) {
        const y = hattakiYer(k, h);
        if (y.d < esik && y.s > esik && y.s < toplam - esik) kavsak.push(y.s);
      }
      // Noktası olmadan üstünden geçen yol da kavşaktır
      for (let j = 1; j < oh.length; j++) for (let i = 1; i < h.length; i++) {
        const a = h[i - 1], b = h[i], c = oh[j - 1], e = oh[j];
        const d = (b[0] - a[0]) * (e[1] - c[1]) - (b[1] - a[1]) * (e[0] - c[0]);
        if (Math.abs(d) < 1e-9) continue;
        const t = ((c[0] - a[0]) * (e[1] - c[1]) - (c[1] - a[1]) * (e[0] - c[0])) / d;
        const r = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / d;
        if (t < 0 || t > 1 || r < 0 || r > 1) continue;
        const s2 = u[i - 1] + (u[i] - u[i - 1]) * t;
        if (s2 > esik && s2 < toplam - esik) kavsak.push(s2);
      }
    }
  }
  const once = Math.max(0, ...kavsak.filter(k => k < s));
  const sonra = Math.min(toplam, ...kavsak.filter(k => k > s));
  const kalan = [
    ...yol.parcalar.slice(0, pi),
    ...(once > 2 ? [hatKes(h, 0, once)] : []),
    ...(toplam - sonra > 2 ? [hatKes(h, sonra, toplam)] : []),
    ...yol.parcalar.slice(pi + 1)
  ];
  return kalan.filter(k => k.length >= 2);
}
