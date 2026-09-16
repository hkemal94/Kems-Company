import type { BrandKit, Item } from '../types';

/**
 * Marka künyeleri — Canva'daki gerçek tasarımlardan çıkarıldı (M1).
 *
 * Kaynak: Kemal'in Canva hesabındaki "kems" (12 sayfa) ve "Küçükçetmi Sürek
 * Kulübü" (4 sayfa) tasarımları. Renkler tahmin değil: tasarım dosyasındaki
 * kayıtlı değerler.
 *
 * Kemal'in 16 Eylül kararı: palet çakışmasında Canva kazanır. Uygulamadaki
 * Brand Kit lacivert için #1B2A4A yazıyordu — o arayüzün lacivertiydi,
 * markanın değil. Markanınki #0E1C4F. Kiremit de #D35057 değil #F26B6F.
 *
 * Buradaki değerler uygulamaya BİRLEŞTİRİLEREK yazılır: zaten kayıtlı olan
 * logo, moodboard ve notlar korunur; boş alanlar dolar, renkler düzelir.
 */

/** Canva'daki tasarımlardan okunan renkler */
export const KEMS_RENK = {
  lacivert: '#0E1C4F',
  kiremit: '#F26B6F',
  krem: '#F3EFE8',
  bej: '#BBA591',
  murekkep: '#131313'
} as const;

export interface MarkaKunyesi {
  /** Excel ve harita tarafındaki kimlik */
  id: string;
  /** Uygulamada başka bir kimlikle kayıtlıysa onunla da eşleşsin */
  digerKimlikler?: string[];
  ad: string;
  tur: string;
  ustMarka?: string;
  neYapar: string;
  hikayeKoku?: string;
  kurulus?: string;
  merkezi?: string;
  bagliMekan?: string;
  kit: BrandKit;
}

export const MARKA_KUNYELERI: MarkaKunyesi[] = [
  {
    id: 'marka_kems',
    digerKimlikler: ['kems_company'],
    ad: 'Kems Company',
    tur: 'çatı marka',
    neYapar:
      'Düzada evreninin çatı markası; merch, oyun, yayın ve deneyimleri bir '
      + 'arada tutar.',
    hikayeKoku:
      "Kems, Kemal'in lakabı. Marka bir ürün fikrinden bir evrene dönüştü.",
    kurulus: '2024',
    merkezi: 'İstanbul',
    kit: {
      selectedLogo: 'Çerçeveli KEMS / COMPANY kilidi',
      ideaLogos: [
        'Çerçeveli kilit: lacivert çerçeve, krem alan, altta kiremit bant',
        'KEMS blok + el yazısı "Company" (kiremit, krem konturlu)',
        'KC el yazısı monogram — flama biçiminde, kiremit zemin',
        'KEMS APPAREL + OBJECTS — düz siyah, sıkışık blok',
        'Kurum arması ailesi: "Kemsköy Ziraat İşletmeleri Kurumu" etiketleri'
      ],
      colorPalette: [
        KEMS_RENK.lacivert, KEMS_RENK.kiremit, KEMS_RENK.krem, KEMS_RENK.bej
      ],
      exemplaryWorks: [
        'Birlik Birası etiketi',
        'Birlik Zeytin etiketi',
        'Kemsköy Tabakhane İşletmeleri Kurumu etiketi',
        'Kems Coffee Co. bardak logosu'
      ],
      selectedFont: 'Sıkışık blok sans (başlık) + el yazısı (alt satır)',
      voiceTone: 'Gösterişsiz · Bilge · Samimi ama havalı',
      slogan: 'Quietly cultural.',
      usageRulesDo: [
        'Lacivert ve kiremit birlikte; krem her zaman zemin',
        'Arma tipi etiketlerde "Kuruluş 2025" satırı kalsın',
        'Bej yalnız zemin olarak — yazıda kullanılmaz'
      ],
      usageRulesDont: [
        'Blok KEMS ile el yazısı Company aynı ağırlıkta olmaz',
        'Kiremit geniş alan doldurmaz; vurgu rengidir',
        'Arayüzün laciverti (#1B2A4A) marka laciverti değildir'
      ]
    }
  },

  {
    id: 'marka_dirlik',
    ad: 'Dirlik Spor Kulübü',
    tur: 'kulüp markası',
    ustMarka: 'marka_kems',
    neYapar: 'Adanın spor kulübü; Dirlik Stadı onun sahası.',
    kurulus: '12 Mayıs',
    merkezi: 'Stadyum Mahallesi',
    bagliMekan: 'mekan_dirlik_stadi',
    kit: {
      selectedLogo: 'Oval rozet: kiremit kontur, krem alan, lacivert yelkenli',
      ideaLogos: [
        'Oval rozet — üstte "DİRLİK SPOR KULÜBÜ", altta "12 MAYIS" kavisli',
        'Yelkenli tek başına, lacivert siluet',
        'İki yanda nokta uçlu dikey çizgi (rozetin flama direkleri)'
      ],
      colorPalette: [KEMS_RENK.kiremit, KEMS_RENK.lacivert, KEMS_RENK.krem],
      exemplaryWorks: ['Eski kulüp armaları', 'Deniz kulübü flamaları'],
      selectedFont: 'Kalın grotesk, harf aralığı açık (kavisli dizim)',
      voiceTone: 'Kulüp ağırbaşlılığı; övünmeden köklü',
      slogan: '',
      usageRulesDo: [
        'Rozetin oranı korunur — yatay ezilmez',
        'Yelkenli her zaman lacivert, zemin krem',
        '12 Mayıs kuruluş tarihidir, armadan düşmez'
      ],
      usageRulesDont: [
        'Kiremit ile lacivert yer değiştirmez',
        'Rozet içine fotoğraf konmaz'
      ]
    }
  },

  {
    id: 'marka_kucukcetmi',
    digerKimlikler: ['marka_1782600611254_j7gg5'],
    ad: 'Küçükçetmi Sürek Kulübü',
    tur: 'kulüp markası',
    ustMarka: 'marka_kems',
    neYapar: 'Çiftlik Mahallesindeki avcılık ve kültür kulübü.',
    merkezi: 'Çiftlik Mahallesi',
    bagliMekan: 'mekan_kucukcetmi',
    kit: {
      selectedLogo: 'Kangal — tek çizgi, mürekkep',
      ideaLogos: [
        'Kangal silueti: dikenli tasma, kıvrık kuyruk, tek ağırlıkta kontur',
        'KÇ monogram — iç içe geçmiş, tırnaklı serif',
        'El yazısı "Küçükçetmi" + harf aralığı açık "SÜREK KULÜBÜ"',
        'Köy sokağı illüstrasyonu üstünde tam kilit'
      ],
      // Bilerek tek renk: kulüp Kems paletini kullanmıyor.
      colorPalette: [KEMS_RENK.krem, KEMS_RENK.murekkep],
      exemplaryWorks: ['Köy sokağı illüstrasyonu (değirmen taşı ve çeşme)'],
      selectedFont: 'El yazısı (ad) + harf aralığı açık serif (alt satır)',
      voiceTone: 'Sakin, yerli, gösterişsiz',
      slogan: '',
      usageRulesDo: [
        'Tek renk kalır: krem zemin, mürekkep çizgi',
        'Kangal ile monogram birlikte kullanılabilir, üst üste gelmez',
        'El yazısı ad ile alt satır arasındaki hizalama ortalanır'
      ],
      usageRulesDont: [
        'Kems paletindeki kiremit ve lacivert bu markaya girmez',
        'Kangal dolu siluet olarak kullanılmaz — kontur çizgidir'
      ]
    }
  }
];

/**
 * Var olan marka kaydını künyeyle BİRLEŞTİRİR.
 *
 * Kural: uygulamada zaten yazılı olan bir şey silinmez. Yüklenmiş logo,
 * moodboard ve notlar olduğu gibi kalır. Boş alanlar Canva künyesinden
 * dolar. Tek istisna renk paleti — Kemal'in kararı gereği Canva kazanır.
 */
export function kunyeyiBirlestir(mevcut: Item, kunye: MarkaKunyesi): Item {
  const eski: Partial<BrandKit> = mevcut.metadata?.brandKit ?? {};
  const yeni = kunye.kit;

  const birlesikKit: BrandKit = {
    // Yüklenmiş logo her zaman kazanır: o Kemal'in dosyası
    logoBase64: eski.logoBase64,
    selectedLogo: eski.selectedLogo || yeni.selectedLogo,
    ideaLogos: Array.from(new Set([...(eski.ideaLogos ?? []), ...yeni.ideaLogos])),
    // Palet: Canva kazanır (16 Eylül kararı)
    colorPalette: yeni.colorPalette,
    exemplaryWorks: Array.from(
      new Set([...(eski.exemplaryWorks ?? []), ...yeni.exemplaryWorks])
    ),
    selectedFont: eski.selectedFont && eski.selectedFont !== 'Inter'
      ? eski.selectedFont : yeni.selectedFont,
    voiceTone: eski.voiceTone || yeni.voiceTone,
    atmosphereMoodboard: eski.atmosphereMoodboard,
    usageRulesDo: Array.from(
      new Set([...(eski.usageRulesDo ?? []), ...(yeni.usageRulesDo ?? [])])
    ),
    usageRulesDont: Array.from(
      new Set([...(eski.usageRulesDont ?? []), ...(yeni.usageRulesDont ?? [])])
    ),
    slogan: eski.slogan || yeni.slogan
  };

  return {
    ...mevcut,
    notes: mevcut.notes || kunye.neYapar,
    metadata: {
      ...mevcut.metadata,
      brandKit: birlesikKit,
      markaTuru: mevcut.metadata?.markaTuru || kunye.tur,
      ustMarka: mevcut.metadata?.ustMarka || kunye.ustMarka,
      kurulus: mevcut.metadata?.kurulus || kunye.kurulus,
      merkezi: mevcut.metadata?.merkezi || kunye.merkezi,
      placeId: mevcut.metadata?.placeId || kunye.bagliMekan,
      kunyeKaynagi: 'Canva · 16 Eylül 2026'
    }
  };
}

/** Kayıt yoksa sıfırdan kurulacak hâli */
export function kunyedenYeni(
  kunye: MarkaKunyesi
): Omit<Item, 'createdAt' | 'updatedAt' | 'userId'> & { id: string } {
  return {
    id: kunye.id,
    title: kunye.ad,
    area: 'duzada',
    type: 'marka',
    status: 'Çalışılıyor',
    priority: 'yüksek',
    tags: ['marka'],
    links: [],
    notes: kunye.neYapar,
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      brandKit: kunye.kit,
      markaTuru: kunye.tur,
      ustMarka: kunye.ustMarka,
      kurulus: kunye.kurulus,
      merkezi: kunye.merkezi,
      placeId: kunye.bagliMekan,
      kunyeKaynagi: 'Canva · 16 Eylül 2026'
    }
  };
}

/** Bir künyenin uygulamadaki karşılığını bulur (kimlik, diğer kimlik ya da ad) */
export function markayiBul(items: Item[], kunye: MarkaKunyesi): Item | undefined {
  const kimlikler = new Set([kunye.id, ...(kunye.digerKimlikler ?? [])]);
  return (
    items.find(i => kimlikler.has(i.id))
    || items.find(
      i => i.type === 'marka'
        && i.title.trim().toLocaleLowerCase('tr') === kunye.ad.toLocaleLowerCase('tr')
    )
  );
}
