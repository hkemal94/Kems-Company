import type { Item, WikiSection } from '../types';
import { kurumMu, ANA_MARKA_KIMLIKLERI } from './markaYapisi';
import { ADA_KIMLIGI } from './vikiSifirlama';
import { OTEL_KIMLIGI } from './otelTemizligi';
import type { EskiMetin } from './soruCevapAktarimi';

/**
 * W5 (29 Eylül 2026): viki düzeltmeleri, W3 44–65. turların cevapları ve
 * Canva görsellerinin galeriye alınması.
 *
 * Kaynak: docs/soru-cevap/w3.md 44–65. turlar, docs/03-duzada-kunyesi.md.
 * Görseller Canva'daki tasarımların önizlemeleri (447 piksel); dosyaları
 * `public/galeri/canva/` altında depoda yedekli.
 *
 * Düzeltmeler: eski satır silinmez, `eskiMetin`e taşınır; yerine yeni
 * değer yazılır. Eklemeler: aynı başlıklı satır varsa yazılmaz.
 * Her kayıt etiketle işaretlenir; galeri görseli `canvaKaynak` anahtarıyla
 * tanınır. İkinci basış hiçbir şey yapmaz.
 */

export const W5_ETIKETI = 'soru-cevap-w5';
const GUN = '2026-09-29';

type Alanlar = Array<[string, string]>;

// ---------------------------------------------------------------- künye

/** Kimlik → künyede değeri değişecek satırlar (eski değer eskiMetin'e) */
const KUNYE_DUZELTMELERI: Record<string, Alanlar> = {
  viki_mekan_fener: [
    ['Bekçilik', "Bekçi fenerin yanındaki evde yaşardı; 1970'lerde otomatiğe geçti"]
  ],
  viki_yer_merkez: [
    ['Pazar', "Cumartesi; anakaralı pazarcılar sabah feribotuyla gelir"]
  ],
  viki_yer_ciftlik: [
    ['Küçükçetmi Çiftliği', "Küçükkuyu'dan gelen bir aile (20. yy başı); çiftlik evi kulüp evi; mahallenin iç tarafında, tepeye yakın"]
  ],
  [OTEL_KIMLIGI]: [
    ['Kuruluş', "Devlet misafirhanesi (1954); 1960'larda özelleşip bir şirkete geçti: İstanbul merkezli, bir devlet bankasının iştiraki; o günden beri aynı şirket"]
  ]
};

/** Kimlik → künyeye eklenecek satırlar */
const KUNYE_EKLERI: Record<string, Alanlar> = {
  [ADA_KIMLIGI]: [
    ['Koordinat', '39,60° K · 25,85° D; Bozcaada\'nın güneybatısı, Babakale\'nin batısı'],
    ['İdari bağlılık', 'Ayvacık\'a (Çanakkale) bağlı belde']
  ],
  viki_yer_iskele: [
    ['Kilise', 'Belediye bakar, kapalı; yanında eski bir Rum mezarlığı'],
    ['Dönüşüm', 'Mübadele aileleri otelden sonra evlerini yazlıkçılara satıp Merkez\'e geçti'],
    ['Yazlıkçılar', 'İstanbullu yazlıkçılar, emekli sanatçılar, mekân işletmecileri, otel yöneticileri; evlerin çoğu kışın kapalı']
  ],
  viki_yer_merkez: [
    ['Öğretmenler', 'Karışık: bir iki adalı, gerisi anakaradan atanan']
  ],
  viki_yer_liman: [
    ['Koy', 'Tek derin, poyraza kapalı koy'],
    ['Feribot', 'Küçükkuyu\'dan arabalı feribot ve yolcu motoru; yazın ek seferler']
  ],
  viki_yer_ciftlik: [
    ['Kooperatif', 'Kemsköy Ziraat İşletmeleri Kurumu; zeytinyağı fabrikası'],
    ['Zeytin hasadı', 'Ekim–kasım; şenliği kooperatifin önünde']
  ],
  viki_mekan_liman_kafe: [
    ['Tür', 'Dondurmacı'],
    ['Yer', 'Liman, iskelenin yakını'],
    ['Açılış', '2000 sonrası'],
    ['Kış', 'Tatlıcı / kafe olur'],
    ['Sahibi', 'Sade Meze\'nin sahibi olan kadın'],
    ['Logo', 'Mor zemin, sarı dondurma külahı, beyaz el yazısı "Dondurmacı Kızlar" (Canva; tonlar taslak)']
  ],
  viki_mekan_dirlik_stadi: [
    ['Kapasite', 'En fazla ~1.000 kişi'],
    ['Kulüp günü', 'Her 12 Mayıs; mahallelerin karışık takımlarıyla dostluk maçı']
  ],
  [OTEL_KIMLIGI]: [
    ['Yapı', '4 kat ve kuleler, kesme taş'],
    ['Yer', 'İskele\'de yarımada ucunda, uçurumun üstünde; sahili dipte ayrı bir cep']
  ]
};

/** Kurumlar ve Kems Company kimlikle değil adla bulunur */
interface KurumIsi {
  adi: string;
  ad: RegExp;
  duzeltme: Alanlar;
  ek: Alanlar;
}

const KURUMLAR: KurumIsi[] = [
  {
    adi: 'Dirlik Spor Kulübü', ad: /dirlik/i,
    duzeltme: [
      ['Lig', 'Hep amatör; bölgesel amatör lig şampiyonluğu (2010 sonrası), o sezondan 3. Lig iddiası'],
      ['Kuruluş', '12 Mayıs 1957; köy döneminde toprak sahada oynayan amatör çocuklar']
    ],
    ek: [
      ['Ad', '"Birlik ve dirlik": mahallelerin çocukları tek takımda'],
      ['Renkler', 'Kolej Laciverti #0E1C4F, kiremit #F26B6F, krem #F3EFE8'],
      ['Arma', 'Oval; ortada yelkenli (ada kimliği), üstte "Dirlik Spor Kulübü", altta "12 Mayıs" (Canva)'],
      ['Rakip', 'Küçükkuyu tarafından bir kulüp (adı yok); sevgi–nefret ilişkisi'],
      ['Stat', 'Dirlik Stadı; iki tribünlü, en fazla ~1.000 kişilik'],
      ['Kulüp günü', 'Her 12 Mayıs; stadda mahallelerin karışık takımlarıyla dostluk maçı']
    ]
  },
  {
    adi: 'Küçükçetmi Sürek Kulübü', ad: /küçükçetmi|kucukcetmi/i,
    duzeltme: [
      ['Kulüp evi', 'Küçükçetmi Çiftliği\'nin çiftlik evi; Çiftlik Mahallesi\'nin iç tarafında, tepeye yakın']
    ],
    ek: [
      ['Logo', 'El yazısıyla "Küçükçetmi", altında "Sürek Kulübü"; ayrıca Kangal figürü (Canva)'],
      ['Sürek geleneği', 'Kış başı']
    ]
  }
];

const KEMS_EKLERI: Alanlar = [
  ['Kurgu içinde ad', 'Kemsköy\'den'],
  ['Dükkân', 'Kemsköy Caddesi; 2024 ve sonrası, yeni yapılmış bir binada; yıl boyu açık'],
  ['Etiket çalışmaları', 'Birlik Birası, Kems Coffee Co. (Canva); Birlik Zeytin açık']
];

// ---------------------------------------------------------------- bölümler

/** Bölüm satırında değişecek olanlar: satırın başı → yeni satır */
const ADA_SATIRLARI: Array<[RegExp, string]> = [
  [/^İdari bağlılık:/, 'İdari bağlılık: Ayvacık\'a (Çanakkale) bağlı belde.'],
  [/^Mevsim:/, 'Mevsim: yazın kalabalıklaşır; kışın yarı yarıya — çarşı açık, sahil tarafı kapanır.'],
  [/^Anakarayla bağlantı:/, 'Anakarayla bağlantı: her gün arabalı feribot ve yolcu motoru, yazın ek seferler; fırtınada sefer iptal olur. Feribot hep kamu hattı.']
];

/** Kimlik → bölüm başlığı + eklenecek satırlar (bölüm yoksa açılır) */
const BOLUM_EKLERI: Record<string, [RegExp, string, string[]]> = {
  [ADA_KIMLIGI]: [/ada hayatı/i, 'Ada hayatı', [
    'Pazar: cumartesi, Merkez\'de.',
    'Şenlik takvimi: deniz şenliği temmuz (yelken ve kayık yarışı, yağlı direk, akşam Liman\'da balık ekmeği ve müzik), bağ bozumu eylül, zeytin hasadı ekim–kasım, sürek geleneği kış başı.',
    'Doğa: feribot yolunda yunus; yaban domuzu, yaban tavşanı, keklik; kıyıda martı ve karabatak; baharda ve güzde göçmen kuşlar. Ada Tepesi\'nde yalnız küçük yangınlar olmuş.',
    'Liman\'ın açığında antik amfora alanı; rehberli dalış. Antik yerleşimin dönemi belirlenmedi.',
    'Adanın hafızasında büyük bir felaket yok.'
  ]],
  viki_yer_merkez: [/gündelik hayat/i, 'Gündelik hayat', [
    'Yangın gözetleme kulesinde belediyede çalışan orman memurları nöbet tutar.'
  ]],
  viki_yer_liman: [/gündelik hayat/i, 'Gündelik hayat', [
    'Dondurmacı Kızlar iskelenin yakınında; limandaki kafe ayrı bir yer (2010 sonrası açıldı, adsız).',
    'Açıkta antik amfora alanı (liman inşaatında bulundu); rehberli dalış.'
  ]]
};

// ---------------------------------------------------------------- galeri

export type W5GorselTuru = 'logo' | 'urun' | 'mekan' | 'diger';

export interface W5Gorsel {
  /** Galeride görseli tanıyan anahtar (tekrar eklenmesin) */
  anahtar: string;
  baslik: string;
  dosya: string;
  tur: W5GorselTuru;
  canvaTasarim: string;
  /** Görselin bağlanacağı kayıt — kimlik ya da ad */
  hedefKimlik?: string;
  hedefAd?: RegExp;
}

export const W5_GORSELLERI: W5Gorsel[] = [
  { anahtar: 'canva:kems:1', baslik: 'Kems Company — kutu logo', dosya: 'kems-company-kutu.png', tur: 'logo', canvaTasarim: 'kems', hedefKimlik: 'kems' },
  { anahtar: 'canva:kems:2', baslik: 'Kems Company — el yazısı', dosya: 'kems-company-el-yazisi.png', tur: 'logo', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:10', baslik: 'KEMS Apparel + Objects', dosya: 'kems-apparel-objects.png', tur: 'logo', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:11', baslik: 'KC flama', dosya: 'kc-flama.png', tur: 'logo', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:12', baslik: 'KC monogram', dosya: 'kc-monogram.png', tur: 'logo', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:3', baslik: 'Birlik Birası etiketi', dosya: 'birlik-birasi-etiketi.png', tur: 'urun', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:4', baslik: 'Birlik Zeytin etiketi', dosya: 'birlik-zeytin-etiketi.png', tur: 'urun', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:7', baslik: 'Kems Coffee Co.', dosya: 'kems-coffee-co.png', tur: 'urun', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:5', baslik: 'Zeytin Selelerini Yaşatma Derneği (tasarım şakası)', dosya: 'zeytin-seleleri-dernegi.png', tur: 'diger', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:6', baslik: 'Kemsköy Tabakhane etiketi (tasarım şakası)', dosya: 'kemskoy-tabakhane-etiketi.png', tur: 'diger', canvaTasarim: 'kems' },
  { anahtar: 'canva:kems:9', baslik: 'Dirlik Spor Kulübü arması', dosya: 'dirlik-spor-kulubu-arma.png', tur: 'logo', canvaTasarim: 'kems', hedefAd: /dirlik/i },
  { anahtar: 'canva:kems:8', baslik: 'Dondurmacı Kızlar logosu', dosya: 'dondurmaci-kizlar.png', tur: 'logo', canvaTasarim: 'kems', hedefKimlik: 'viki_mekan_liman_kafe' },
  { anahtar: 'canva:kucukcetmi:3', baslik: 'Küçükçetmi Sürek Kulübü — yazı logosu', dosya: 'kucukcetmi-yazi.png', tur: 'logo', canvaTasarim: 'Küçükçetmi Sürek Kulübü', hedefAd: /küçükçetmi|kucukcetmi/i },
  { anahtar: 'canva:kucukcetmi:1', baslik: 'Küçükçetmi Sürek Kulübü — Kangal', dosya: 'kucukcetmi-kangal.png', tur: 'logo', canvaTasarim: 'Küçükçetmi Sürek Kulübü' },
  { anahtar: 'canva:kucukcetmi:2', baslik: 'KC monogram (Küçükçetmi tasarımından)', dosya: 'kucukcetmi-kc-monogram.png', tur: 'logo', canvaTasarim: 'Küçükçetmi Sürek Kulübü' },
  { anahtar: 'canva:kucukcetmi:4', baslik: 'Küçükçetmi Sürek Kulübü — afiş', dosya: 'kucukcetmi-afis.png', tur: 'mekan', canvaTasarim: 'Küçükçetmi Sürek Kulübü' },
  { anahtar: 'canva:the-imperial:1', baslik: 'The Imperial Kemsköy', dosya: 'the-imperial-kemskoy.png', tur: 'mekan', canvaTasarim: 'The Imperial', hedefKimlik: OTEL_KIMLIGI }
];

export const w5GorselAdresi = (g: W5Gorsel) =>
  `${import.meta.env.BASE_URL || '/'}galeri/canva/${g.dosya}`;

// ---------------------------------------------------------------- yardımcılar

const satirAnahtari = (k: string) => `* ${k}:`;

function etiketle(tags: string[] | undefined): string[] {
  const t = tags || [];
  return t.includes(W5_ETIKETI) ? t : [...t, W5_ETIKETI];
}

function eskiyeTasi(item: Item, yeni: EskiMetin[]): Item {
  if (!yeni.length) return item;
  const eski = (item.metadata?.eskiMetin as EskiMetin[]) || [];
  return { ...item, metadata: { ...item.metadata, eskiMetin: [...eski, ...yeni] } };
}

/** Künyede aynı başlıklı satırın değerini değiştirir; eski satır eskiMetin'e */
function kunyeDuzelt(item: Item, alanlar: Alanlar): Item {
  const tasinan: EskiMetin[] = [];
  let satirlar = (item.notes || '').split('\n');
  const eklenecek: string[] = [];
  for (const [k, v] of alanlar) {
    const yeniSatir = `${satirAnahtari(k)} ${v}`;
    const i = satirlar.findIndex(s => s.trim().startsWith(satirAnahtari(k)));
    if (i < 0) { eklenecek.push(yeniSatir); continue; }
    if (satirlar[i].trim() === yeniSatir) continue;
    tasinan.push({ kaynak: `künye: ${k}`, metin: satirlar[i].trim(), tasindi: GUN });
    satirlar = satirlar.map((s, n) => (n === i ? yeniSatir : s));
  }
  const notes = [satirlar.join('\n').trim(), ...eklenecek].filter(Boolean).join('\n');
  return eskiyeTasi({ ...item, notes }, tasinan);
}

/** Aynı başlıklı satır yoksa ekler */
function kunyeEkle(item: Item, alanlar: Alanlar): Item {
  const eklenecek = alanlar
    .filter(([k]) => !(item.notes || '').includes(satirAnahtari(k)))
    .map(([k, v]) => `${satirAnahtari(k)} ${v}`);
  if (!eklenecek.length) return item;
  return { ...item, notes: [(item.notes || '').trim(), ...eklenecek].filter(Boolean).join('\n') };
}

function adaSatirlari(item: Item): Item {
  const tasinan: EskiMetin[] = [];
  const bolumler = ((item.metadata?.wikiSections as WikiSection[]) || []).map(b => {
    const satirlar = (b.content || '').split(/\n\s*\n/);
    let degisti = false;
    const yeni = satirlar.map(s => {
      const eslesen = ADA_SATIRLARI.find(([r]) => r.test(s.trim()));
      if (!eslesen || s.trim() === eslesen[1]) return s;
      tasinan.push({ kaynak: `bölüm: ${b.title}`, metin: s.trim(), tasindi: GUN });
      degisti = true;
      return eslesen[1];
    });
    return degisti ? { ...b, content: yeni.join('\n\n') } : b;
  });
  return eskiyeTasi({ ...item, metadata: { ...item.metadata, wikiSections: bolumler } }, tasinan);
}

function bolumeEkle(item: Item, id: string, [baslikRe, baslik, eklenecek]: [RegExp, string, string[]]): Item {
  const bolumler: WikiSection[] = (item.metadata?.wikiSections as WikiSection[]) || [];
  const i = bolumler.findIndex(b => baslikRe.test(b.title || ''));
  if (i < 0) {
    return {
      ...item,
      metadata: {
        ...item.metadata,
        wikiSections: [...bolumler, { id: `w5_${id}`, title: baslik, content: eklenecek.join('\n\n'), status: 'resmi' }]
      }
    };
  }
  const mevcut = (bolumler[i].content || '').split(/\n\s*\n/).map(s => s.trim());
  const yeni = eklenecek.filter(s => !mevcut.includes(s));
  if (!yeni.length) return item;
  const icerik = [...mevcut.filter(Boolean), ...yeni].join('\n\n');
  return {
    ...item,
    metadata: {
      ...item.metadata,
      wikiSections: bolumler.map((b, n) => (n === i ? { ...b, content: icerik, status: 'resmi' as const } : b))
    }
  };
}

// ---------------------------------------------------------------- toplam

export interface W5Aktarimi {
  /** Güncellenecek kayıtlar (görselleri henüz eklenmemiş hâlde) */
  guncellenenler: Item[];
  /** Galeriye girecek görseller ve bağlanacakları kaydın kimliği */
  gorseller: Array<{ gorsel: W5Gorsel; hedefId?: string }>;
  ozet: string[];
  bulunamayan: string[];
}

export function w5Aktarimi(items: Item[]): W5Aktarimi {
  const guncellenenler: Item[] = [];
  const bulunamayan: string[] = [];
  const ozet: string[] = [];
  const bekliyor = (i: Item) => !(i.tags || []).includes(W5_ETIKETI);

  const kurumlar = items.filter(
    i => !i.archived && (i.type === 'kulüp' || i.type === 'marka') && kurumMu(i)
  );
  const kems = items.find(i => ANA_MARKA_KIMLIKLERI.includes(i.id) && !i.archived)
    || items.find(i => ANA_MARKA_KIMLIKLERI.includes(i.id));

  // Kimlikle bulunan kayıtlar
  const kimlikler = new Set([
    ...Object.keys(KUNYE_DUZELTMELERI), ...Object.keys(KUNYE_EKLERI), ...Object.keys(BOLUM_EKLERI)
  ]);
  let kayitSayisi = 0;
  for (const id of kimlikler) {
    const kayit = items.find(i => i.id === id);
    if (!kayit) { bulunamayan.push(id); continue; }
    if (!bekliyor(kayit)) continue;
    let yeni = kayit;
    if (KUNYE_DUZELTMELERI[id]) yeni = kunyeDuzelt(yeni, KUNYE_DUZELTMELERI[id]);
    if (KUNYE_EKLERI[id]) yeni = kunyeEkle(yeni, KUNYE_EKLERI[id]);
    if (id === ADA_KIMLIGI) yeni = adaSatirlari(yeni);
    if (BOLUM_EKLERI[id]) yeni = bolumeEkle(yeni, id, BOLUM_EKLERI[id]);
    guncellenenler.push({ ...yeni, tags: etiketle(kayit.tags), updatedAt: Date.now() });
    kayitSayisi++;
  }
  if (kayitSayisi) ozet.push(`${kayitSayisi} maddeye düzeltme ve yeni bilgi`);

  // Kurumlar
  for (const k of KURUMLAR) {
    const kurum = kurumlar.find(x => k.ad.test(x.title));
    if (!kurum) { bulunamayan.push(k.adi); continue; }
    if (!bekliyor(kurum)) continue;
    const yeni = kunyeEkle(kunyeDuzelt(kurum, k.duzeltme), k.ek);
    guncellenenler.push({ ...yeni, tags: etiketle(kurum.tags), updatedAt: Date.now() });
    ozet.push(`${kurum.title}: künye`);
  }

  // Kems Company
  if (!kems) bulunamayan.push('Kems Company');
  else if (bekliyor(kems)) {
    guncellenenler.push({ ...kunyeEkle(kems, KEMS_EKLERI), tags: etiketle(kems.tags), updatedAt: Date.now() });
    ozet.push('Kems Company: künye');
  }

  // Galeri: daha önce eklenmemiş görseller
  const galeridekiler = new Set(
    items
      .filter(i => i.type === 'ilham_gorsel')
      .map(i => String((i.metadata as Record<string, unknown> | undefined)?.canvaKaynak || ''))
  );
  const gorseller = W5_GORSELLERI
    .filter(g => !galeridekiler.has(g.anahtar))
    .map(gorsel => {
      let hedefId: string | undefined;
      if (gorsel.hedefKimlik === 'kems') hedefId = kems?.id;
      else if (gorsel.hedefKimlik) hedefId = items.find(i => i.id === gorsel.hedefKimlik)?.id;
      else if (gorsel.hedefAd) hedefId = kurumlar.find(x => gorsel.hedefAd!.test(x.title))?.id;
      return hedefId ? { gorsel, hedefId } : { gorsel };
    });
  if (gorseller.length) {
    const bagli = gorseller.filter(g => g.hedefId).length;
    ozet.push(`${gorseller.length} Canva görseli galeriye` + (bagli ? ` (${bagli} tanesi maddesine bağlanır)` : ''));
  }

  return { guncellenenler, gorseller, ozet, bulunamayan };
}
