import type { FeatureCollection } from 'geojson';
import { DUZADA_MERKEZ } from '../../data/duzadaGeo';
import type { Nokta } from '../harita/sinirBolgeleri';
import type { KurucuBelge } from '../harita/duzenTipi';

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
  /** Taslakta kaldırılan yollar (haritadan gelen ya da yeni). Silinmez. */
  gizlenen: string[];
}

export const bosTaslak = (): KurucuTaslak => ({ yeniYollar: {}, turDegisikligi: {}, gizlenen: [] });


const TURLER = new Set<string>(YOL_TURLERI.map(t => t.id));

export function taslaktanBelge(t: KurucuTaslak): KurucuBelge {
  return {
    surum: 1,
    yeniYollar: Object.fromEntries(
      Object.entries(t.yeniYollar).map(([id, y]) => [id, { tur: y.tur, n: y.noktalar.flat() }])
    ),
    turDegisikligi: { ...t.turDegisikligi },
    gizlenen: [...t.gizlenen]
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
  return t;
}

export const taslakBosMu = (t: KurucuTaslak) =>
  !Object.keys(t.yeniYollar).length && !Object.keys(t.turDegisikligi).length && !t.gizlenen.length;

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
  /** Metre, çizim için */
  m: Nokta[];
  yeni: boolean;
  gizli: boolean;
}

export interface Zemin {
  ada: Nokta[][];
  mahalleler: Array<{ id: string; halka: Nokta[][] }>;
  binalar: Array<{ id: string; ad: string; halka: Nokta[] }>;
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
        halka: (g.coordinates as Nokta[][])[0].map(metreye)
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
  const cikti: KurucuYol[] = zemin.yollar.map(y => ({
    id: y.id, ad: y.ad, haritaTur: y.tur,
    tur: taslak.turDegisikligi[y.id] ?? haritaTuru(y.tur),
    m: y.noktalar.map(metreye), yeni: false, gizli: gizli.has(y.id)
  }));
  let n = 0;
  for (const [id, y] of Object.entries(taslak.yeniYollar)) {
    n++;
    cikti.push({
      id, ad: `Yeni yol ${n}`, haritaTur: '—', tur: y.tur,
      m: egri(y.noktalar).map(metreye), yeni: true, gizli: gizli.has(id)
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
    for (let i = 1; i < y.m.length; i++) {
      const a = y.m[i - 1];
      const b = y.m[i];
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
export function yeniYolId(mevcut: Record<string, unknown>): string {
  let id = `kurucu_yol_${Date.now().toString(36)}`;
  let i = 1;
  while (mevcut[id]) id = `kurucu_yol_${Date.now().toString(36)}_${i++}`;
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
