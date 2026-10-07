import type { Item } from '../types';

/**
 * Tuval (6. gece, 7 Ekim; vvd'den). Serbest pano: not, madde, galeri görseli
 * ve çerçeve kartları istenen yere konur, aralarına ok çekilir. Her pano
 * ayrı küçük bir kayıt (`type: 'tuval'`); bir maddeye bağlanabilir
 * (mahalle esini, drop panosu, kitap planı) ve o maddenin sayfasında
 * "Tuvalde aç" çıkar. Görselin kendisi panoya kopyalanmaz, galeri kaydının
 * kimliği tutulur. Pano Kemal'in her işinden sonra (Kemal'in seçimi) 2 sn
 * içinde yazılır; sayfa açılınca hiçbir şey yazılmaz. Kartın yazısı Kemal'in.
 */

export type TuvalTuru = 'mahalle' | 'drop' | 'kitap' | 'serbest';
export const TUVAL_TURLERI: Array<{ id: TuvalTuru; ad: string; bag: string[] }> = [
  { id: 'mahalle', ad: 'Mahalle esini', bag: ['yer'] },
  { id: 'drop', ad: 'Drop panosu', bag: ['drop'] },
  { id: 'kitap', ad: 'Kitap planı', bag: ['kitap_proje'] },
  { id: 'serbest', ad: 'Serbest pano', bag: [] }
];

export type KartTuru = 'not' | 'madde' | 'gorsel' | 'cerceve';
export const NOT_RENKLERI = ['krem', 'kiremit', 'hardal', 'yesil', 'lacivert'] as const;
export type NotRengi = typeof NOT_RENKLERI[number];

export interface TuvalKarti {
  id: string;
  tur: KartTuru;
  x: number; y: number; w: number; h: number;
  /** Not yazısı ya da çerçeve başlığı */
  metin?: string;
  renk?: NotRengi;
  maddeId?: string;
  gorselId?: string;
}
export interface TuvalOku { id: string; a: string; b: string }
export interface TuvalIcerigi { kartlar: TuvalKarti[]; oklar: TuvalOku[] }

export const KART_OLCUSU: Record<KartTuru, { w: number; h: number }> = {
  not: { w: 200, h: 120 }, madde: { w: 220, h: 72 }, gorsel: { w: 220, h: 170 }, cerceve: { w: 460, h: 320 }
};

export const tuvaller = (items: Item[]) =>
  items.filter(i => i.type === 'tuval' && !i.archived).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

export function tuvalTuru(i: Item): TuvalTuru {
  const t = i.metadata?.tur;
  return TUVAL_TURLERI.some(x => x.id === t) ? (t as TuvalTuru) : 'serbest';
}

/** Kayıttaki içerik; bozuk ya da eksik alan atlanır */
export function icerikOku(i: Item): TuvalIcerigi {
  const ham = (i.metadata?.kartlar as unknown[]) || [];
  const kartlar: TuvalKarti[] = [];
  for (const k of ham) {
    const o = k as Record<string, unknown>;
    if (!o || typeof o.id !== 'string' || typeof o.x !== 'number' || typeof o.y !== 'number') continue;
    const tur = (['not', 'madde', 'gorsel', 'cerceve'] as const).find(t => t === o.tur) || 'not';
    kartlar.push({
      id: o.id, tur, x: o.x, y: o.y,
      w: typeof o.w === 'number' ? o.w : KART_OLCUSU[tur].w,
      h: typeof o.h === 'number' ? o.h : KART_OLCUSU[tur].h,
      ...(typeof o.metin === 'string' ? { metin: o.metin } : {}),
      ...(NOT_RENKLERI.includes(o.renk as NotRengi) ? { renk: o.renk as NotRengi } : {}),
      ...(typeof o.maddeId === 'string' ? { maddeId: o.maddeId } : {}),
      ...(typeof o.gorselId === 'string' ? { gorselId: o.gorselId } : {})
    });
  }
  const var_ = new Set(kartlar.map(k => k.id));
  const oklar = ((i.metadata?.oklar as unknown[]) || [])
    .map(x => x as Record<string, unknown>)
    .filter(o => o && typeof o.id === 'string' && var_.has(String(o.a)) && var_.has(String(o.b)))
    .map(o => ({ id: String(o.id), a: String(o.a), b: String(o.b) }));
  return { kartlar, oklar };
}

/** Kayda yazılacak hâl: sayılar yuvarlanır, undefined yazılmaz */
export function icerikYazilacak(c: TuvalIcerigi): { kartlar: Record<string, unknown>[]; oklar: Record<string, unknown>[] } {
  return {
    kartlar: c.kartlar.map(k => ({
      id: k.id, tur: k.tur, x: Math.round(k.x), y: Math.round(k.y), w: Math.round(k.w), h: Math.round(k.h),
      ...(k.metin !== undefined ? { metin: k.metin } : {}),
      ...(k.renk ? { renk: k.renk } : {}),
      ...(k.maddeId ? { maddeId: k.maddeId } : {}),
      ...(k.gorselId ? { gorselId: k.gorselId } : {})
    })),
    oklar: c.oklar.map(o => ({ id: o.id, a: o.a, b: o.b }))
  };
}

export function tuvalGuncel(i: Item, c: TuvalIcerigi): Item {
  return { ...i, metadata: { ...(i.metadata || {}), ...icerikYazilacak(c) } as Item['metadata'], updatedAt: Date.now() };
}

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

/** Yeni pano: adı Kemal'in (bağlı maddenin adı önerilir); içi boş başlar */
export function yeniTuval(ad: string, tur: TuvalTuru, bagliId?: string): YeniKayit {
  return {
    title: ad.trim() || 'Pano', area: 'duzada', type: 'tuval', status: 'Planlandı', priority: 'düşük',
    tags: ['tuval'], links: [], notes: '', images: [], isProposal: false, archived: false,
    metadata: { tur, ...(bagliId ? { bagliId } : {}), kartlar: [], oklar: [] }
  };
}

/** Bir maddeye bağlı panolar ("Tuvalde aç") */
export const maddeninTuvalleri = (items: Item[], maddeId: string) => tuvaller(items).filter(t => t.metadata?.bagliId === maddeId);

/** Bir maddeden tuvali açma isteği: App dinler, Atölye → Tuval açılır */
export function tuvaldeAc(maddeId: string) {
  window.dispatchEvent(new CustomEvent('kems-tuval-ac', { detail: { maddeId } }));
}
