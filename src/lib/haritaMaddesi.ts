import type { Feature, FeatureCollection } from 'geojson';
import { DUZADA_GEO } from '../data/duzadaGeo';
import type { Item, WikiSection } from '../types';

/**
 * Haritadaki bir yapıdan wiki maddesi tohumu (W1).
 *
 * Sorun şuydu: haritada Belediye Binası'na tıklayıp "Maddeye git" deyince
 * hiçbir şey olmuyordu, çünkü `mekan_belediye` diye bir madde yoktu.
 * Düğme vardı, arkasında bir şey yoktu. Sessizce hiçbir şey yapmak en kötü
 * davranış: kullanıcı uygulamanın bozuk olduğunu sanıyor.
 *
 * Artık madde yoksa haritanın kendisinden kuruluyor. Ad, tür, mahalle,
 * rakım, kat ve koordinat zaten haritada var — bunları elle yeniden yazmak
 * saçma. Bölümler boş açılıyor; metni Kemal yazacak.
 *
 * Buradan çıkan madde `isProposal: false` — öneri değil, gerçekten var olan
 * bir yapının künyesi. Boş olması ayrı bir şey.
 */

export const MAHALLE_ADI: Record<string, string> = {
  yer_merkez: 'Merkez',
  yer_liman: 'Liman',
  yer_iskele: 'İskele',
  yer_stadyum: 'Stadyum',
  yer_ciftlik: 'Çiftlik'
};

/** Yapı türünden okunur bir etiket */
const TUR_ADI: Record<string, string> = {
  yapı: 'Yapı',
  otel: 'Otel',
  kafe: 'Kafe',
  meyhane: 'Meyhane',
  kulüp: 'Kulüp',
  stadyum: 'Stadyum',
  fener: 'Deniz feneri',
  iskele: 'İskele',
  konut: 'Konut'
};

export interface HaritaKunyesi {
  /** Haritadaki yapı kimliği (bina_belediye) */
  binaId: string;
  /** Maddenin kimliği (mekan_belediye) */
  wikiId: string;
  ad: string;
  tur: string;
  turAdi: string;
  mahalleId: string | null;
  mahalleAdi: string | null;
  kat: number | null;
  yukseklik: number | null;
  rakim: number | null;
  konum: { x: number; y: number } | null;
}

function poligonMerkezi(f: Feature): { x: number; y: number } | null {
  const g = f.geometry;
  let halka: number[][] | null = null;
  if (g.type === 'Polygon') halka = g.coordinates[0] as number[][];
  else if (g.type === 'MultiPolygon') halka = g.coordinates[0][0] as number[][];
  else if (g.type === 'Point') {
    const k = g.coordinates as number[];
    return { x: k[0], y: k[1] };
  }
  if (!halka || halka.length === 0) return null;
  let x = 0, y = 0;
  for (const k of halka) { x += k[0]; y += k[1]; }
  return { x: x / halka.length, y: y / halka.length };
}

/**
 * Verilen wikiId'ye karşılık gelen yapıyı haritada arar.
 * Bulamazsa null döner — o zaman madde kurulmaz, uydurma yapılmaz.
 */
export function haritadaAra(
  wikiId: string,
  geo: FeatureCollection = DUZADA_GEO
): HaritaKunyesi | null {
  if (!wikiId) return null;

  const bina = geo.features.find(f => {
    const p = f.properties as Record<string, unknown> | null;
    return !!p && p.katman === 'bina' && p.wikiId === wikiId;
  });
  if (!bina) return null;

  const p = bina.properties as Record<string, unknown>;
  const mahalleId = typeof p.mahalle === 'string' ? p.mahalle : null;
  const tur = String(p.tur || 'yapı');

  return {
    binaId: String(p.id),
    wikiId,
    ad: String(p.ad || ''),
    tur,
    turAdi: TUR_ADI[tur] || 'Yapı',
    mahalleId,
    mahalleAdi: mahalleId ? MAHALLE_ADI[mahalleId] ?? null : null,
    kat: typeof p.kat === 'number' ? p.kat : null,
    yukseklik: typeof p.yukseklik === 'number' ? p.yukseklik : null,
    rakim: typeof p.taban === 'number' && p.taban >= 1 ? Math.round(p.taban) : null,
    konum: poligonMerkezi(bina)
  };
}

/** Künyeden okunur tek satır: "Yapı · Merkez Mahallesi · 3 kat · 312 m" */
export function kunyeSatiri(k: HaritaKunyesi): string {
  return [
    k.turAdi,
    k.mahalleAdi ? `${k.mahalleAdi} Mahallesi` : null,
    k.kat ? `${k.kat} kat` : null,
    k.rakim ? `${k.rakim} m rakım` : null
  ].filter(Boolean).join(' · ');
}

/**
 * Yeni bir mekân maddesi için bölümler.
 *
 * Bilerek BOŞ: "Henüz bir içerik yazılmadı." diye doldurmak, sonradan
 * "dolu mu boş mu" ayrımını imkânsız kılıyor. status='boş' olan bölüm
 * arayüzde soluk görünür ve doluluk sayımına girmez.
 */
export function yeniBolumler(k: HaritaKunyesi): WikiSection[] {
  const taban: Array<[string, string]> = [
    ['genel', 'Genel bakış'],
    ['tarihce', 'Tarihçe'],
    ['bugun', 'Bugün']
  ];
  if (k.tur === 'kafe' || k.tur === 'meyhane') {
    taban.push(['mudavimler', 'Müdavimler']);
  }
  if (k.tur === 'yapı' || k.tur === 'kulüp' || k.tur === 'stadyum') {
    taban.push(['islev', 'İşlevi']);
  }
  return taban.map(([id, title]) => ({
    id: `wiki_${k.wikiId}_${id}`,
    title,
    content: '',
    status: 'boş' as const
  }));
}

/**
 * Haritadan madde tohumu. `onAddItem`e verilecek hâli.
 *
 * Not: `id` bilerek wikiId'ye eşit. Harita → madde geçişi kimlik eşleşmesiyle
 * çalışıyor; rastgele kimlik üretirsek bağ bir daha kurulamaz.
 */
export function maddeTohumu(
  k: HaritaKunyesi
): Omit<Item, 'createdAt' | 'updatedAt' | 'userId'> & { id: string } {
  return {
    id: k.wikiId,
    title: k.ad,
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['mekân', 'haritadan'],
    links: [],
    notes: kunyeSatiri(k),
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      region: k.mahalleAdi ? k.mahalleAdi.toLocaleLowerCase('tr') : undefined,
      haritaKonum: k.konum,
      wikiSections: yeniBolumler(k),
      haritaBinaId: k.binaId,
      haritaTur: k.tur,
      kat: k.kat ?? undefined,
      rakim: k.rakim ?? undefined
    }
  };
}
