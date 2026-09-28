import type { Item, WikiSection } from '../types';
import { haritadaAra, maddeTohumu } from './haritaMaddesi';
import { kurumMu } from './markaYapisi';
import { ADA_KIMLIGI } from './vikiSifirlama';
import { OTEL_KIMLIGI } from './otelTemizligi';

/**
 * Soru-cevapların vikiye aktarılması · W2 (28 Eylül 2026).
 *
 * Kaynak: docs/soru-cevap/*.md — Kemal'in tıklamalı cevapları. Buradaki
 * her satır oradaki bir cevabın karşılığı; cümle kurulmaz, hikâye yazılmaz.
 * Cevabı olmayan bölüm boş açılır ve "boş" işaretli kalır (Tarihçe gibi).
 *
 * Kemal'in kararları (28 Eylül):
 *   - Liman, Stadyum, Çiftlik başlıkları kanondaki adlarla açılır.
 *   - Arşivdeki mekân kayıtları arşivde kalır; yerlerine yeni boş kayıt
 *     açılır, haritadaki yapılar yeni kayda bağlanır (`viki_` kimlikleri).
 *   - Otel istisna: uygulama, kimliği `kemskoy_hotel` olmayan "The Imperial
 *     Kemsköy" kaydını kopya sayıp SİLİYOR (App.tsx). O yüzden otel aynı
 *     kayıtla geri gelir; eski yazıları görünmez `eskiMetin` alanına taşınır.
 *   - Cevaplar künyede ve kısa madde satırlarında durur.
 *   - Ada maddesinde cevaplarla çelişen eski yazılar `eskiMetin`e taşınır.
 *
 * Silme yok. İkinci basışta hiçbir şey yapmaz: yeni kayıtlar kimlikle,
 * güncellenenler etiketle tanınır.
 */

export const AKTARIM_ETIKETI = 'soru-cevap-2026-09';
const GUN = '2026-09-28';

/** Kaydın içinde saklanan, vikide görünmeyen eski yazı */
export interface EskiMetin {
  kaynak: string;
  metin: string;
  tasindi: string;
}

// ---------------------------------------------------------------- mahalleler

interface MahalleCevabi {
  id: string;
  /** Haritadaki mahalle anahtarı; harita → madde geçişi bununla bulur */
  bolge: string;
  baslik: string;
  kunye: Array<[string, string]>;
  simgeler: string;
  bolumler: Array<[string, string[]]>;
  /** Bu mahalledeki yeni mekân maddeleri */
  mekanlar: string[];
}

const MAHALLELER: MahalleCevabi[] = [
  {
    id: 'viki_yer_iskele',
    bolge: 'iskele',
    baslik: 'İskele Mahallesi (Kemsköy)',
    kunye: [
      ['Konum', 'Batı kıyısı'],
      ['Sınır komşuları', 'Merkez, Liman, Çiftlik'],
      ['Mahalle sayılması', 'Otelden sonra (1954 sonrası); kesin yıl belirlenmedi']
    ],
    simgeler: 'The Imperial Kemsköy, Sade Meze',
    bolumler: [
      ['Konum ve sınırlar', [
        'Adanın batı kıyısında.',
        'Sınır komşuları: Merkez, Liman, Çiftlik.',
        'Arazi karma: liman caddesi aşağıda düz, arka sokaklar yamaçta yukarı tırmanır.'
      ]],
      ['Tarihçe', []]
    ],
    mekanlar: [OTEL_KIMLIGI, 'viki_mekan_meyhane']
  },
  {
    id: 'viki_yer_merkez',
    bolge: 'merkez',
    baslik: 'Merkez Mahallesi (Düzada Köyü)',
    kunye: [
      ['Konum', 'Adanın ortası'],
      ['Sınır komşuları', 'İskele, Liman, Stadyum, Çiftlik']
    ],
    simgeler: 'Ada Tepesi, Belediye Binası',
    bolumler: [
      ['Konum ve sınırlar', [
        'Adanın ortasında; Ada Tepesi bu mahallede.',
        'Sınır komşuları: İskele, Liman, Stadyum, Çiftlik.'
      ]],
      ['Tarihçe', []],
      ['Kamu binaları', [
        'Belediye / muhtarlık',
        'Okul',
        'Postane',
        'Sağlık ocağı'
      ]],
      ['Çarşı ve işletmeler', []]
    ],
    mekanlar: ['viki_mekan_belediye']
  },
  {
    id: 'viki_yer_liman',
    bolge: 'liman',
    baslik: 'Liman Mahallesi',
    kunye: [
      ['Konum', 'Kuzeybatı ucu'],
      ['Sınır komşuları', 'İskele, Merkez, Stadyum']
    ],
    simgeler: 'Deniz Feneri, Liman İdare Binası, Dondurmacı Kızlar',
    bolumler: [
      ['Konum ve sınırlar', [
        'Adanın kuzeybatı ucunda.',
        'Sınır komşuları: İskele, Merkez, Stadyum.'
      ]],
      ['Tarihçe', []],
      ['Deniz Feneri', []],
      ['Liman işleyişi', [
        'Uğrayanlar: yolcu feribotu, yük gemisi, balıkçı tekneleri, yat / gezi tekneleri.'
      ]]
    ],
    mekanlar: ['viki_mekan_fener', 'viki_mekan_liman_idare', 'viki_mekan_liman_kafe']
  },
  {
    id: 'viki_yer_stadyum',
    bolge: 'stadyum',
    baslik: 'Stadyum Mahallesi',
    kunye: [
      ['Konum', 'Kuzey / kuzeydoğu'],
      ['Sınır komşuları', 'Merkez, Liman, Çiftlik']
    ],
    simgeler: 'Dirlik Stadı',
    bolumler: [
      ['Konum ve sınırlar', [
        'Adanın kuzeyinde / kuzeydoğusunda.',
        'Sınır komşuları: Merkez, Liman, Çiftlik.'
      ]],
      ['Tarihçe', []],
      ['Dirlik Stadı', []]
    ],
    mekanlar: ['viki_mekan_dirlik_stadi']
  },
  {
    id: 'viki_yer_ciftlik',
    bolge: 'ciftlik',
    baslik: 'Çiftlik Mahallesi',
    kunye: [
      ['Konum', 'Güney; doğu / güneydoğu kıyısına kadar'],
      ['Sınır komşuları', 'İskele, Merkez, Stadyum']
    ],
    simgeler: 'Küçükçetmi Sürek Kulübü',
    bolumler: [
      ['Konum ve sınırlar', [
        'Adanın güneyinde; doğu / güneydoğu kıyısına kadar uzanır.',
        'Sınır komşuları: İskele, Merkez, Stadyum.'
      ]],
      ['Tarihçe', []],
      ['Tarım ve üretim', [
        'Zeytin ve zeytinyağı',
        'Bağcılık',
        'Arıcılık',
        'Hayvancılık yok.'
      ]],
      ['Sürek ve kulüp', [
        'Küçükçetmi Sürek Kulübü bu mahallede.',
        '"Sürek": av (sürek avı).'
      ]]
    ],
    mekanlar: []
  }
];

/** Yeni mekân maddeleri: harita yapısının yeni kimliği → mahalle maddesi */
const MEKANLAR: Array<[string, string]> = [
  ['viki_mekan_meyhane', 'viki_yer_iskele'],
  ['viki_mekan_liman_kafe', 'viki_yer_liman'],
  ['viki_mekan_fener', 'viki_yer_liman'],
  ['viki_mekan_liman_idare', 'viki_yer_liman'],
  ['viki_mekan_dirlik_stadi', 'viki_yer_stadyum'],
  ['viki_mekan_belediye', 'viki_yer_merkez']
];

// ---------------------------------------------------------------- yardımcılar

// Her bilgi ayrı satır; viki boş satırla ayrılanı ayrı paragraf gösterir
const satirlar = (liste: string[]) => liste.join('\n\n');
const kunyeMetni = (alanlar: Array<[string, string]>) =>
  alanlar.map(([k, v]) => `* ${k}: ${v}`).join('\n');

/** Firestore `undefined` kabul etmez; anahtarı hiç yazmamak gerekir */
function temiz<T>(deger: T): T {
  if (Array.isArray(deger)) return deger.map(temiz) as T;
  if (deger && typeof deger === 'object') {
    const cikti: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(deger)) {
      if (v !== undefined) cikti[k] = temiz(v);
    }
    return cikti as T;
  }
  return deger;
}

function etiketle(tags: string[] | undefined): string[] {
  const t = tags || [];
  return t.includes(AKTARIM_ETIKETI) ? t : [...t, AKTARIM_ETIKETI];
}

function yeniKayit(
  temel: Omit<Item, 'createdAt' | 'updatedAt' | 'userId'>
): Item {
  const simdi = Date.now();
  return temiz({ ...temel, createdAt: simdi, updatedAt: simdi, userId: '' });
}

/** Cevaplarla çelişen eski yazıların işaretleri (docs/soru-cevap) */
const CELISKI = /Ekim 2003|Sezon Sonu|haftada iki|Eski Liman/i;

// ---------------------------------------------------------------- ada maddesi

const ADA_ATMOSFER = 'Nostaljik ve canlı yanlar bir arada; mahalleden mahalleye değişir';
const ADA_IKLIM = 'Rüzgârlı Ege — yılın çoğunda sert rüzgâr (poyraz, lodos)';
const ADA_ULASIM = [
  'Anakarayla bağlantı: her gün feribot.',
  'Bağlı olduğu kıyı: Çanakkale / Ayvalık tarafı.'
];
const ADA_GENEL = [
  'Ölçek: kasaba adası; kasaba büyüklüğünde, yazın kalabalıklaşır.',
  'İdari bağlılık: Çanakkale.',
  'Geçim kaynakları: turizm, tarım, balıkçılık, ticaret / liman.',
  'Mevsim: yazın canlanır, kışın sessizleşir; kışın yalnız adalılar kalır.',
  `İklim: ${ADA_IKLIM}.`
];

function adaGuncellemesi(ada: Item): { kayit: Item; tasinan: number } {
  const eski: EskiMetin[] = [...((ada.metadata?.eskiMetin as EskiMetin[]) || [])];
  const tasi = (kaynak: string, metin: string) => {
    if (metin.trim()) eski.push({ kaynak, metin: metin.trim(), tasindi: GUN });
  };

  // Gövde: çelişen paragraflar taşınır, kalanı olduğu gibi durur
  const paragraflar = (ada.notes || '').split(/\n\s*\n/);
  const kalan = paragraflar.filter(p => {
    if (CELISKI.test(p)) { tasi('gövde', p); return false; }
    return true;
  });

  const eskiBolumler: WikiSection[] = ada.metadata?.wikiSections || [];
  let ulasimYazildi = false;
  const bolumler: WikiSection[] = eskiBolumler.map(b => {
    const ulasim = /ulaşım/i.test(b.title || '');
    if (ulasim) {
      tasi(`bölüm: ${b.title}`, b.content || '');
      ulasimYazildi = true;
      return { ...b, content: satirlar(ADA_ULASIM), status: 'resmi' as const };
    }
    if (CELISKI.test(b.content || '')) {
      tasi(`bölüm: ${b.title}`, b.content || '');
      return { ...b, content: '', status: 'boş' as const };
    }
    return b;
  });
  bolumler.push({
    id: 'sc_genel',
    title: 'Genel bilgiler',
    content: satirlar(ulasimYazildi ? ADA_GENEL : [...ADA_GENEL, ...ADA_ULASIM]),
    status: 'resmi'
  });

  const iklim = ada.metadata?.climate;
  if (typeof iklim === 'string' && iklim !== ADA_IKLIM) tasi('iklim', iklim);
  const atmosfer = ada.metadata?.atmosphere;
  if (typeof atmosfer === 'string' && atmosfer !== ADA_ATMOSFER) tasi('atmosfer', atmosfer);

  const tasinan = eski.length - ((ada.metadata?.eskiMetin as EskiMetin[]) || []).length;
  return {
    tasinan,
    kayit: temiz({
      ...ada,
      notes: kalan.join('\n\n').trim(),
      tags: etiketle(ada.tags),
      updatedAt: Date.now(),
      metadata: {
        ...ada.metadata,
        climate: ADA_IKLIM,
        atmosphere: ADA_ATMOSFER,
        wikiSections: bolumler,
        eskiMetin: eski
      }
    })
  };
}

// ---------------------------------------------------------------- otel

function otelGuncellemesi(otel: Item, mahalleId: string): Item {
  const eski: EskiMetin[] = [...((otel.metadata?.eskiMetin as EskiMetin[]) || [])];
  if ((otel.notes || '').trim()) {
    eski.push({ kaynak: 'gövde', metin: otel.notes.trim(), tasindi: GUN });
  }
  for (const b of (otel.metadata?.wikiSections as WikiSection[]) || []) {
    if ((b.content || '').trim()) {
      eski.push({ kaynak: `bölüm: ${b.title}`, metin: b.content.trim(), tasindi: GUN });
    }
  }
  // Künye alanları da taşınır. Firestore birleştirerek yazdığı için eski
  // alanlar anahtar çıkarılarak silinemiyor; boş metinle üstü yazılır.
  const eskiProfil = (otel.metadata?.profile as Record<string, unknown>) || {};
  const bosProfil: Record<string, string> = {};
  for (const [k, v] of Object.entries(eskiProfil)) {
    if (typeof v !== 'string') continue;
    if (v.trim()) eski.push({ kaynak: `künye: ${k}`, metin: v.trim(), tasindi: GUN });
    bosProfil[k] = '';
  }

  const harita = haritadaAra(OTEL_KIMLIGI);
  const bolumler: WikiSection[] = harita
    ? maddeTohumu(harita).metadata?.wikiSections ?? []
    : [];

  return temiz({
    ...otel,
    archived: false,
    isProposal: false,
    title: 'The Imperial Kemsköy',
    notes: kunyeMetni([['Oda sayısı', '20']]),
    tags: etiketle(otel.tags),
    links: Array.from(new Set([...(otel.links || []), mahalleId])),
    updatedAt: Date.now(),
    metadata: {
      ...otel.metadata,
      region: 'iskele',
      faaliyet: '1954–',
      profile: bosProfil,
      wikiSections: bolumler,
      eskiMetin: eski
    }
  });
}

// ---------------------------------------------------------------- kurumlar

const KURUM_EKLERI: Array<{ adi: string; ad: RegExp; alanlar: Array<[string, string]> }> = [
  { adi: 'Dirlik Spor Kulübü', ad: /dirlik/i, alanlar: [['Branşlar', 'Futbol, Su sporları']] },
  { adi: 'Küçükçetmi Sürek Kulübü', ad: /küçükçetmi|kucukcetmi/i, alanlar: [['Sürek', 'Av (sürek avı)']] }
];

// ---------------------------------------------------------------- toplam

export interface SoruCevapAktarimi {
  /** Açılacak yeni kayıtlar */
  yeniler: Item[];
  /** Güncellenecek mevcut kayıtlar (ada, otel, kurumlar) */
  guncellenenler: Item[];
  /** Kartta gösterilecek satırlar */
  ozet: string[];
  /** Bulunamadığı için yazılamayanlar */
  bulunamayan: string[];
}

export function soruCevapAktarimi(items: Item[]): SoruCevapAktarimi {
  const varMi = (id: string) => items.some(i => i.id === id);
  const yeniler: Item[] = [];
  const guncellenenler: Item[] = [];
  const ozet: string[] = [];
  const bulunamayan: string[] = [];

  const kurumlar = items.filter(
    i => !i.archived && (i.type === 'kulüp' || i.type === 'marka') && kurumMu(i)
  );
  const kurumBul = (ad: RegExp) => kurumlar.find(k => ad.test(k.title));

  // Mahalleler — kulüpler kendi mahallelerine bağlanır
  const KULUP_MAHALLESI: Record<string, RegExp> = {
    viki_yer_stadyum: /dirlik/i,
    viki_yer_ciftlik: /küçükçetmi|kucukcetmi/i
  };
  const yeniMahalle = MAHALLELER.filter(m => !varMi(m.id));
  for (const m of yeniMahalle) {
    const kulup = KULUP_MAHALLESI[m.id] ? kurumBul(KULUP_MAHALLESI[m.id]) : undefined;
    yeniler.push(yeniKayit({
      id: m.id,
      title: m.baslik,
      area: 'duzada',
      type: 'yer',
      status: 'Çalışılıyor',
      priority: 'orta',
      tags: ['mahalle', AKTARIM_ETIKETI],
      links: kulup ? [...m.mekanlar, kulup.id] : m.mekanlar,
      notes: kunyeMetni(m.kunye),
      images: [],
      archived: false,
      isProposal: false,
      metadata: {
        region: m.bolge,
        profile: { landmarks: m.simgeler },
        wikiSections: m.bolumler.map(([baslik, satir], n) => ({
          id: `${m.id}_${n + 1}`,
          title: baslik,
          content: satirlar(satir),
          status: satir.length ? 'resmi' as const : 'boş' as const
        }))
      }
    }));
  }
  if (yeniMahalle.length) ozet.push(`${yeniMahalle.length} mahalle maddesi açılır`);

  // Mekânlar — haritadaki yapıdan kurulur, bölümler boş
  let mekanSayisi = 0;
  for (const [wikiId, mahalleId] of MEKANLAR) {
    if (varMi(wikiId)) continue;
    const k = haritadaAra(wikiId);
    if (!k) { bulunamayan.push(wikiId); continue; }
    const tohum = maddeTohumu(k);
    yeniler.push(yeniKayit({
      ...tohum,
      tags: [...tohum.tags, AKTARIM_ETIKETI],
      links: [mahalleId]
    }));
    mekanSayisi++;
  }
  if (mekanSayisi) ozet.push(`${mekanSayisi} mekân maddesi açılır (bölümleri boş)`);

  // Otel
  const otel = items.find(i => i.id === OTEL_KIMLIGI);
  if (otel && !(otel.tags || []).includes(AKTARIM_ETIKETI)) {
    guncellenenler.push(otelGuncellemesi(otel, 'viki_yer_iskele'));
    ozet.push('Otel arşivden çıkar; eski yazıları "eski metin"e taşınır');
  } else if (!otel) {
    bulunamayan.push('otel kaydı');
  }

  // Ada
  const ada = items.find(i => i.id === ADA_KIMLIGI);
  if (ada && !(ada.tags || []).includes(AKTARIM_ETIKETI)) {
    const { kayit, tasinan } = adaGuncellemesi(ada);
    guncellenenler.push(kayit);
    ozet.push(
      `Ada maddesine genel bilgiler eklenir`
      + (tasinan ? `; ${tasinan} eski yazı "eski metin"e taşınır` : '')
    );
  } else if (!ada) {
    bulunamayan.push('ada kaydı');
  }

  // Kurumlar
  for (const ek of KURUM_EKLERI) {
    const kurum = kurumBul(ek.ad);
    if (!kurum) { bulunamayan.push(ek.adi); continue; }
    if ((kurum.tags || []).includes(AKTARIM_ETIKETI)) continue;
    const notes = [(kurum.notes || '').trim(), kunyeMetni(ek.alanlar)]
      .filter(Boolean).join('\n');
    guncellenenler.push(temiz({
      ...kurum,
      notes,
      tags: etiketle(kurum.tags),
      updatedAt: Date.now()
    }));
    ozet.push(`${kurum.title}: künyeye ${ek.alanlar.map(a => a[0].toLocaleLowerCase('tr')).join(', ')}`);
  }

  return { yeniler, guncellenenler, ozet, bulunamayan };
}
