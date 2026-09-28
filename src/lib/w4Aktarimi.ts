import type { Item, WikiSection } from '../types';
import { kurumMu } from './markaYapisi';
import { ADA_KIMLIGI } from './vikiSifirlama';
import { OTEL_KIMLIGI } from './otelTemizligi';

/**
 * "Ada hayatı" bilgilerinin vikiye aktarılması (W4, 29 Eylül 2026).
 *
 * Kaynak: docs/03-duzada-kunyesi.md "Ada hayatı" 1–4 bölümleri
 * (soru-cevap W3, 12–43. turlar). W2 ve W3 gibi: cümle kurulmaz, cevaplar
 * künyeye "* Alan: değer" satırı ve kısa bölüm satırları olarak girer.
 * Tarihçe bölümleri boş kalır — metni Kemal yazacak.
 *
 * Silme yok, var olan metne dokunulmaz; yalnız ekleme yapılır. Her kayıt
 * etiketle işaretlenir; ikinci basış hiçbir şey yapmaz.
 */

export const W4_ETIKETI = 'soru-cevap-w4';

type Alanlar = Array<[string, string]>;

/** Kimlik → künyeye eklenecek satırlar */
const KUNYE_EKLERI: Record<string, Alanlar> = {
  [ADA_KIMLIGI]: [
    ['Nüfus', 'Kışın 3.000–4.000; yazın 3–4 katı'],
    ['Adalılar', 'Eski köylüler, mübadeleyle gelenler (1923), sonradan yerleşenler'],
    ['Ağız', 'Hafif Ege ağzı, yaşlılarda']
  ],
  viki_yer_iskele: [
    ['İbadet', 'Eski kilise (18. yy; 1923 mübadelesinden beri boş), mescit'],
    ['Eğlence', 'Meyhane ve barlar (1970–); yıl boyu, kışın sakin'],
    ['Kemsköy Caddesi', 'Otelden bu yana yavaş yavaş dükkânlı yazlık caddesi']
  ],
  viki_yer_merkez: [
    ['Meydan', 'Eski taş çeşme, yaşlı bir çınar'],
    ['Pazar', 'Haftada bir'],
    ['Sakinler', 'Eski köylü aileler, kamu çalışanları, esnaf, emekliler']
  ],
  viki_yer_liman: [
    ['Sakinler', 'Liman çalışanları, balıkçılar, esnaf, genç aileler'],
    ['Balıkçılık', 'Büyük tekneler; balık hali önce İskele\'deydi']
  ],
  viki_yer_stadyum: [
    ['Çekirdek', 'Toprak saha çevresinde 1950\'lerden; stat (1980\'ler) büyüttü'],
    ['Plaj', 'Kumlu ve çakıllı cepler; üstünde taraftar birahanesi']
  ],
  viki_yer_ciftlik: [
    ['Evler', 'Taş, avlulu, tek ya da iki katlı; dağınık'],
    ['Şarap', 'Küçük aile şaraphaneleri (2000 sonrası)'],
    ['Küçükçetmi Çiftliği', 'Küçükkuyu\'dan gelen bir aile (20. yy başı); çiftlik evi kulüp evi']
  ],
  [OTEL_KIMLIGI]: [
    ['Kuruluş', 'Devlet misafirhanesi (1954); 1960\'larda özelleşip bir şirkete geçti'],
    ['Misafirler', 'Sanatçı ve yazarlar, siyasetçi ve bürokratlar, iş insanları, yabancı gezginler'],
    ['Personel', 'Adalılar ve sezonluk anakaralılar'],
    ['Restoran', 'Dışarıya da açık'],
    ['Sahil', 'Uçurumun dibinde ayrı küçük bir cep']
  ],
  viki_mekan_meyhane: [
    ['Sahibi', 'Ailesi adalı, anakaradan gelen bir kadın; aileden kaldı'],
    ['Sezon', 'Yıl boyu açık; kışın adalıların meyhanesi']
  ],
  viki_mekan_liman_idare: [
    ['İçinde', 'Liman başkanlığı, feribot gişesi ve bekleme salonu, sahil güvenlik']
  ],
  viki_mekan_dirlik_stadi: [
    ['Yapım', '1980\'ler'],
    ['Tribün', 'İki tribünlü']
  ],
  viki_mekan_belediye: [
    ['Bina', '1980 sonrası yapılmış yeni bir bina']
  ]
};

/** Kimlik → eklenecek bölüm (yoksa açılır; varsa dokunulmaz) */
const YENI_BOLUMLER: Record<string, [string, string[]]> = {
  [ADA_KIMLIGI]: ['Ada hayatı', [
    'Ada içi ulaşım: özel araç, motosiklet ve bisiklet; Liman–Merkez–İskele dolmuşu (yıl boyu, kışın seyrek).',
    'Feribot yalnız adalıların aracını alır.',
    'Yollar önce topraktı, zamanla asfaltlandı.',
    'Konaklama: otel, her mahallede pansiyonlar, kiralık evler; kamp yok.',
    'Kamu: postane (1950–1970\'ler), sağlık ocağı (1980 sonrası), okul (ilk ve ortaokul, Merkez). Lise ve hastane anakarada; acilde deniz ambulansı.',
    'Güvenlik: Merkez\'de jandarma, Liman\'da sahil güvenlik; Merkez\'de belediye itfaiyesi.',
    'Eczane Merkez\'de; banka yok, Liman ve İskele\'de ATM.',
    'Doğa: zeytinlik, maki, Ada Tepesi yamaçlarında çam ormanı, çıplak kayalık. Plajlar: İskele koyu, Stadyum kıyısı, gizli koylar.',
    'Hayvan: ticari hayvancılık yok; evlerde tavuk, eşek, birkaç keçi.',
    'Şenlikler: zeytin hasadı, bağ bozumu, deniz şenliği, sürek geleneği.',
    'Kış: poyraz sert, feribot iptalleri çoğunlukla kışın; bahar sabahları sis, sonbaharda lodos. Kışın zeytin hasadı, balık, pansiyon ve tekne bakımı.',
    'Gençlerin çoğu okumak için anakaraya gider, bazısı döner.',
    'Mutfakta balık öne çıkar.'
  ]],
  viki_yer_liman: ['Gündelik hayat', [
    'Çekek yeri, balık hali, balık lokantası.',
    'Market, akaryakıt, kafeler, araç kiralama.',
    'Mendireğin içinde birkaç yat iskelesi; marina yok.',
    'Akşamları son feribota kadar canlı.',
    'Deniz taksisi: Liman\'da bir kooperatif.',
    'İskele ile hafif bir rekabet.'
  ]],
  viki_yer_merkez: ['Gündelik hayat', [
    'Cami: eski, 1980 sonrası yenilendi.',
    'Kahvehane 1950–1970\'lerden; Dirlik\'in deplasman maçları burada izlenir.',
    'Mezarlık mahallenin dışında, zeytinliklerde.',
    'Adanın tek okulu burada; kütüphane okulda.',
    'Ada Tepesi: antik yerleşim duvarları, yangın gözetleme kulesi; toprak yol, son kısım patika.'
  ]],
  viki_yer_ciftlik: ['Gündelik hayat', [
    'Zeytinlikler karışık: asırlık ağaçlar ve yeni dikimler.',
    'Kooperatifin üyeleri bütün adanın zeytincileri.',
    'Arıcılık Ada Tepesi yamaçlarında; çam balı yalnız adada satılır.'
  ]]
};

const KURUM_EKLERI: Array<{ adi: string; ad: RegExp; alanlar: Alanlar }> = [
  {
    adi: 'Dirlik Spor Kulübü', ad: /dirlik/i, alanlar: [
      ['Lig', 'Profesyonel alt lig 1990\'lar ve 2000\'ler; birkaç kez inip çıktı'],
      ['Taraftar', 'Maç öncesi Stadyum kıyısındaki birahanede buluşma; iç sahada ada stada taşınır']
    ]
  },
  {
    adi: 'Küçükçetmi Sürek Kulübü', ad: /küçükçetmi|kucukcetmi/i, alanlar: [
      ['Ad', 'Küçükkuyu\'dan gelen bir ailenin çiftliği: Küçükçetmi Çiftliği'],
      ['Kulüp evi', 'Çiftlik evi (Çiftlik Mahallesi)'],
      ['Etkinlikler', 'Nişancılık, doğa yürüyüşleri, Kangal yetiştiriciliği; buluşma yeri'],
      ['Kangal', 'Zeytinlikleri ve sürüleri koruyan çiftlik bekçilerinden']
    ]
  }
];

const kunyeMetni = (alanlar: Alanlar) =>
  alanlar.map(([k, v]) => `* ${k}: ${v}`).join('\n');

function etiketle(tags: string[] | undefined): string[] {
  const t = tags || [];
  return t.includes(W4_ETIKETI) ? t : [...t, W4_ETIKETI];
}

/** Aynı başlıklı satır zaten varsa tekrar eklenmez */
function notaEkle(item: Item, alanlar: Alanlar): Item {
  const eklenecek = alanlar.filter(([k]) => !(item.notes || '').includes(`* ${k}:`));
  const notes = [(item.notes || '').trim(), kunyeMetni(eklenecek)].filter(Boolean).join('\n');
  return { ...item, notes };
}

function bolumEkle(item: Item, id: string, [baslik, satirlar]: [string, string[]]): Item {
  const bolumler: WikiSection[] = (item.metadata?.wikiSections as WikiSection[]) || [];
  const bolumId = `w4_${id}`;
  if (bolumler.some(b => b.id === bolumId)) return item;
  return {
    ...item,
    metadata: {
      ...item.metadata,
      wikiSections: [
        ...bolumler,
        { id: bolumId, title: baslik, content: satirlar.join('\n\n'), status: 'resmi' }
      ]
    }
  };
}

export interface W4Aktarimi {
  guncellenenler: Item[];
  ozet: string[];
  bulunamayan: string[];
}

export function w4Aktarimi(items: Item[]): W4Aktarimi {
  const guncellenenler: Item[] = [];
  const bulunamayan: string[] = [];
  const bekliyor = (i: Item) => !(i.tags || []).includes(W4_ETIKETI);
  let kunye = 0;
  let bolum = 0;

  const kimlikler = new Set([...Object.keys(KUNYE_EKLERI), ...Object.keys(YENI_BOLUMLER)]);
  for (const id of kimlikler) {
    const kayit = items.find(i => i.id === id);
    if (!kayit) { bulunamayan.push(id); continue; }
    if (!bekliyor(kayit)) continue;
    let yeni = kayit;
    if (KUNYE_EKLERI[id]) { yeni = notaEkle(yeni, KUNYE_EKLERI[id]); kunye++; }
    if (YENI_BOLUMLER[id]) { yeni = bolumEkle(yeni, id, YENI_BOLUMLER[id]); bolum++; }
    guncellenenler.push({ ...yeni, tags: etiketle(kayit.tags), updatedAt: Date.now() });
  }

  const kurumlar = items.filter(
    i => !i.archived && (i.type === 'kulüp' || i.type === 'marka') && kurumMu(i)
  );
  let kurumSayisi = 0;
  for (const ek of KURUM_EKLERI) {
    const kurum = kurumlar.find(k => ek.ad.test(k.title));
    if (!kurum) { bulunamayan.push(ek.adi); continue; }
    if (!bekliyor(kurum)) continue;
    guncellenenler.push({ ...notaEkle(kurum, ek.alanlar), tags: etiketle(kurum.tags), updatedAt: Date.now() });
    kurumSayisi++;
  }

  const ozet: string[] = [];
  if (kunye) ozet.push(`${kunye} maddenin künyesine bilgi satırları`);
  if (bolum) ozet.push(`${bolum} maddeye "Ada hayatı" / "Gündelik hayat" bölümü`);
  if (kurumSayisi) ozet.push(`${kurumSayisi} kulübün künyesi`);
  return { guncellenenler, ozet, bulunamayan };
}
