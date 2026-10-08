import type { Item, ItemType } from '../types';
import { BAG_TURLERI, type BagTuru } from '../utils/relations';
import { BAG_GRUPLARI, adiCoz, bagParcalari, semaAlanlari } from './alanSablonu';

/**
 * Bağ ağı (5. gece, 7 Ekim; vvd'den). Maddeler düğüm, bağlar kenar.
 * Kenarlar dört yerden gelir: düzenleyicideki bağlar (`metadata.relations`),
 * üst madde (`placeId`), kurum (`brandId`), eski `links` ve künyedeki bağ
 * alanları. Hesap saf; kayda yalnız Kemal "Bağla" ya da "Yerleşimi kaydet"e
 * basınca yazılır.
 */

/** Ağda görünen türler (Atölye → Bağ ağı) */
export const AG_TURLERI: ItemType[] = ['yer', 'cadde', 'meydan', 'yer_adi', 'ada', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'aile', 'olay', 'ürün', 'oda'];

export type KenarTuru = BagTuru | 'künye';

export interface AgDugumu { id: string; ad: string; tur: ItemType }
export interface AgKenari {
  id: string;
  a: string;
  b: string;
  tur: KenarTuru;
  /** Künye bağında alanın adı ("Kurucu") */
  etiket?: string;
  oneri: boolean;
}
export interface Konum { x: number; y: number }

export function agKur(
  items: Item[],
  anahtarBul: (i: Item) => string | undefined,
  degerOku: (i: Item, alanId: string) => string
): { dugumler: AgDugumu[]; kenarlar: AgKenari[] } {
  const maddeler = items.filter(i => AG_TURLERI.includes(i.type) && !i.archived && !i.isProposal);
  const var_ = new Set(maddeler.map(i => i.id));
  const kenarlar = new Map<string, AgKenari>();
  const ekle = (a: string, b: string, tur: KenarTuru, oneri = false, etiket?: string) => {
    if (a === b || !var_.has(a) || !var_.has(b)) return;
    const id = [[a, b].sort().join('::'), tur].join('::');
    const eski = kenarlar.get(id);
    if (eski && !(eski.oneri && !oneri)) return;
    kenarlar.set(id, { id, a, b, tur, oneri, ...(etiket ? { etiket } : {}) });
  };
  for (const i of maddeler) {
    for (const r of (i.metadata?.relations as Array<{ targetId?: string; type?: BagTuru; isProposal?: boolean }> | undefined) || []) {
      if (r?.targetId) ekle(i.id, r.targetId, r.type || 'genel bağlantı', !!r.isProposal);
    }
    if (i.metadata?.placeId) ekle(i.id, String(i.metadata.placeId), 'bulunduğu yer');
    if (i.metadata?.brandId) ekle(i.id, String(i.metadata.brandId), 'ait olduğu marka');
    for (const l of i.links || []) ekle(i.id, l, 'genel bağlantı');
    // Künyedeki bağ alanları ("Kurucu: Ali Usta")
    const anahtar = anahtarBul(i);
    if (!anahtar) continue;
    for (const a of semaAlanlari(anahtar)) {
      if (!a.bag?.length) continue;
      const deger = degerOku(i, a.id);
      if (!deger) continue;
      const turler = new Set<string>(a.bag.flatMap(g => BAG_GRUPLARI[g].turler));
      const adaylar = maddeler.filter(m => m.id !== i.id && turler.has(m.type));
      for (const p of bagParcalari(deger, a.coklu)) {
        const h = adiCoz(p, adaylar);
        if (h) ekle(i.id, h.id, 'künye', false, a.label);
      }
    }
  }
  return {
    dugumler: maddeler.map(i => ({ id: i.id, ad: i.title, tur: i.type })).sort((x, y) => x.ad.localeCompare(y.ad, 'tr')),
    kenarlar: Array.from(kenarlar.values())
  };
}

/** Kimlikten 0–1 arası sabit sayı (açılışlar arasında aynı başlangıç) */
function sabitSayi(s: string, tuz: number): number {
  let h = 2166136261 ^ tuz;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Kuvvetle dizme: bağlı maddeler birbirini çeker, hepsi birbirini iter,
 * hafif bir çekim merkeze toplar. `sabit` konumlar yerinden oynamaz
 * (Kemal'in kaydettiği yerleşim).
 *
 * Bağsız maddeler (8 Ekim, Kemal: "bağ ağında bağsız maddeler daha yakın
 * olsun") kuvvete girmez: herkes onları itip ağın en dışına savuruyordu.
 * Ağın hemen sağına, türe göre sıralı bir blok hâlinde dizilirler.
 * Kayıtlı yerleşimde ağdan çok uzağa savrulmuş bağsız madde de bloğa gelir;
 * ağa yakın duranın (Kemal'in elle koyduğu) yeri korunur.
 */
export function diz(dugumler: AgDugumu[], kenarlar: AgKenari[], sabit: Map<string, Konum> = new Map(), tur = 320): Map<string, Konum> {
  const k = 70;
  const bagli = new Set<string>();
  for (const e of kenarlar) { bagli.add(e.a); bagli.add(e.b); }
  const agdakiler = dugumler.filter(d => bagli.has(d.id));
  const bagsizlar = dugumler.filter(d => !bagli.has(d.id));
  const n = agdakiler.length;
  const p = new Map<string, Konum>();
  agdakiler.forEach(d => {
    const s = sabit.get(d.id);
    if (s) { p.set(d.id, { ...s }); return; }
    const aci = sabitSayi(d.id, 1) * Math.PI * 2;
    const r = 60 + sabitSayi(d.id, 2) * Math.sqrt(n) * 45;
    p.set(d.id, { x: Math.cos(aci) * r, y: Math.sin(aci) * r });
  });
  const ids = agdakiler.map(d => d.id);
  let sicaklik = 40;
  for (let t = 0; t < tur; t++) {
    const kayma = new Map<string, Konum>(ids.map(id => [id, { x: 0, y: 0 }]));
    for (let i = 0; i < n; i++) {
      const a = p.get(ids[i])!;
      for (let j = i + 1; j < n; j++) {
        const b = p.get(ids[j])!;
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = 0.1; dy = 0.1; d2 = 0.02; }
        const f = (k * k) / d2;
        const ka = kayma.get(ids[i])!, kb = kayma.get(ids[j])!;
        ka.x += dx * f; ka.y += dy * f; kb.x -= dx * f; kb.y -= dy * f;
      }
    }
    for (const e of kenarlar) {
      const a = p.get(e.a), b = p.get(e.b);
      if (!a || !b) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.1;
      // Fruchterman–Reingold: çekim d²/k, birim yönde
      const f = d / k;
      const ka = kayma.get(e.a)!, kb = kayma.get(e.b)!;
      ka.x -= dx * f; ka.y -= dy * f;
      kb.x += dx * f; kb.y += dy * f;
    }
    for (const id of ids) {
      if (sabit.has(id)) continue;
      const q = p.get(id)!, m = kayma.get(id)!;
      m.x -= q.x * 0.02; m.y -= q.y * 0.02;
      const uz = Math.sqrt(m.x * m.x + m.y * m.y) || 1;
      const adim = Math.min(uz, sicaklik);
      q.x += (m.x / uz) * adim; q.y += (m.y / uz) * adim;
    }
    sicaklik = Math.max(1, sicaklik * 0.985);
  }

  // ---- bağsızlar: ağın hemen yanında
  const ks = [...p.values()];
  const c: Konum = ks.length
    ? { x: ks.reduce((t, q) => t + q.x, 0) / ks.length, y: ks.reduce((t, q) => t + q.y, 0) / ks.length }
    : { x: 0, y: 0 };
  // Ağın yarıçapı: uçtaki birkaç madde değil, %90'ı
  const uzaklik = ks.map(q => Math.hypot(q.x - c.x, q.y - c.y)).sort((a, b) => a - b);
  const R = uzaklik.length ? uzaklik[Math.floor(uzaklik.length * 0.9)] : 0;
  const ARA = 46;  // ağa yakınlık payı
  const dizilecek: AgDugumu[] = [];
  for (const d of bagsizlar) {
    const s = sabit.get(d.id);
    if (s && Math.hypot(s.x - c.x, s.y - c.y) <= R + 4 * ARA) p.set(d.id, { ...s });
    else dizilecek.push(d);
  }
  dizilecek.sort((a, b) => a.tur.localeCompare(b.tur, 'tr') || a.ad.localeCompare(b.ad, 'tr'));
  // Ağın sağında, türe göre sıralı derli toplu bir blok: yazılar okunur kalsın
  const SUTUN = 150, SATIR = 38;
  const satirSayisi = Math.max(1, Math.ceil(Math.sqrt(dizilecek.length * 2.5)));
  // Sağ kenar: ağın %90'ı (uçta tek tük savrulmuş madde bloğu uzaklaştırmasın)
  const sagX = ks.length ? [...ks.map(q => q.x)].sort((a, b) => a - b)[Math.floor(ks.length * 0.95)] : 0;
  const x0 = sagX + 90, y0 = c.y - ((Math.min(satirSayisi, dizilecek.length) - 1) * SATIR) / 2;
  dizilecek.forEach((d, i) => {
    p.set(d.id, { x: x0 + Math.floor(i / satirSayisi) * SUTUN, y: y0 + (i % satirSayisi) * SATIR });
  });
  return p;
}

// ---------------------------------------------------------------- kayıt

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

/** `kkm_ayar` → `bagAgiYerlesim`: { maddeKimliği: { x, y } } */
export function yerlesimOku(items: Item[]): Map<string, Konum> {
  const ham = items.find(i => i.type === 'kkm_ayar')?.metadata?.bagAgiYerlesim as Record<string, { x?: unknown; y?: unknown }> | undefined;
  const m = new Map<string, Konum>();
  for (const [id, k] of Object.entries(ham || {})) {
    if (typeof k?.x === 'number' && typeof k?.y === 'number') m.set(id, { x: k.x, y: k.y });
  }
  return m;
}

/**
 * Yerleşimi `kkm_ayar` kaydına yazılacak hâle getirir. Sayılar yuvarlanır
 * (kayıt küçük kalsın); yalnız ağda olan maddeler yazılır. Kayıt eskisinin
 * üstüne birleşerek yazıldığı için silinen maddenin konumu kalırsa zararsız.
 */
export function yerlesimKaydi(items: Item[], konumlar: Map<string, Konum>): { guncel?: Item; yeni?: YeniKayit } {
  const bagAgiYerlesim: Record<string, Konum> = {};
  for (const [id, k] of konumlar) bagAgiYerlesim[id] = { x: Math.round(k.x), y: Math.round(k.y) };
  const kayit = items.find(i => i.type === 'kkm_ayar');
  if (kayit) return { guncel: { ...kayit, metadata: { ...(kayit.metadata || {}), bagAgiYerlesim }, updatedAt: Date.now() } };
  return {
    yeni: {
      title: 'KKM ayarları', area: 'komuta', type: 'kkm_ayar', status: 'Planlandı', priority: 'düşük',
      tags: ['kkm'], links: [], notes: '', images: [], isProposal: false, archived: false,
      metadata: { hedefler: {}, bitenler: [], isler: [], bagAgiYerlesim }
    }
  };
}

/**
 * Ağdan bağ kurma: bağ ilk seçilen maddeye yazılır (düzenleyicideki gibi).
 * Aynı hedefe aynı türde bağ varsa kayıt değişmez (null).
 */
export function bagEkle(kaynak: Item, hedefId: string, tur: BagTuru): Item | null {
  const eski = ((kaynak.metadata?.relations as Array<Record<string, unknown>> | undefined) || []).filter(r => r && r.targetId);
  if (eski.some(r => r.targetId === hedefId && r.type === tur && !r.isProposal)) return null;
  const relations = [
    ...eski.filter(r => !(r.targetId === hedefId && r.type === tur)).map(r => {
      const o: Record<string, unknown> = { targetId: r.targetId, type: r.type };
      if (r.isProposal) o.isProposal = true;
      if (r.reason) o.reason = r.reason;
      if (typeof r.bas === 'number') o.bas = r.bas;
      if (typeof r.bit === 'number') o.bit = r.bit;
      return o;
    }),
    { targetId: hedefId, type: tur }
  ];
  return { ...kaynak, metadata: { ...(kaynak.metadata || {}), relations } as Item['metadata'], updatedAt: Date.now() };
}

/** Kenar türünün ekrandaki adı */
export function kenarAdi(e: Pick<AgKenari, 'tur' | 'etiket'>): string {
  if (e.tur === 'künye') return e.etiket ? `Künye · ${e.etiket}` : 'Künye';
  return BAG_TURLERI.find(b => b.id === e.tur)?.ad || e.tur;
}
