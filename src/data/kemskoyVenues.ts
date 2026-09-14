import { Item } from '../types';

/**
 * The Imperial Kemsköy'ün birimleri.
 *
 * Adlar BİLEREK jeneriktir. Kanonik belgedeki özgün adlar (merch'e
 * dönüşecek adlar) Kemal tarafından sonra konacak; o güne kadar her kayıt
 * `adiGecici: true` taşır ve wiki'de "adı henüz konmadı" olarak işaretlenir.
 *
 * Kaynak: Drive → Haydarpaşa → Characters →
 * "Serie of The Ones Who Place Hope in Tomorrow" (Karakter Listesi).
 * Karakter–birim eşleşmesi o belgedeki gruplamadan alınmıştır.
 */

export type Kaynak = 'kanon' | 'öneri' | 'model';

export interface VenueSeed extends Omit<Item, 'createdAt' | 'updatedAt' | 'userId'> {
  id: string;
}

export const KEMSKOY_VENUES: VenueSeed[] = [
  // Kemal kararı (14 Eylül 2026): otelin yeme-içme birimi üçe değil ikiye
  // ayrılıyor — lobinin arkasında bir yanda restoran, öbür yanda bar.
  // Adlar şimdilik jenerik; aday adlar (Peron/Sultanın Sofrası,
  // Rüzgar/Liman 54/Orient Rüya/Jazziana) wiki tablosunda duruyor.
  {
    id: 'mekan_restoran',
    title: 'Restoran',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Lobinin arkasında, bir yanda. Otelin yemek salonu.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      adAdaylari: ['Peron', 'Sultanın Sofrası Restoranı'],
      profile: {
        shopType: 'restoran',
        region: 'iskele'
      }
    }
  },
  {
    id: 'mekan_bar',
    title: 'Bar',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Lobinin arkasında, restoranın karşı yanında. Akşamları canlı müzik yapılır.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      adAdaylari: ['Rüzgar', 'Liman 54', 'Orient Rüya Restaurant & Bar', 'Jazziana Jazz Bar'],
      profile: {
        shopType: 'bar',
        region: 'iskele'
      }
    }
  },
  {
    id: 'mekan_resepsiyon',
    title: 'Resepsiyon',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Otelin giriş katındaki karşılama ve konaklama birimi.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      profile: {
        shopType: 'otel birimi',
        region: 'iskele'
      }
    }
  },
  {
    id: 'mekan_kat_hizmetleri',
    title: 'Kat Hizmetleri',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Odaların düzeni ve temizliğinden sorumlu birim.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      profile: {
        shopType: 'otel birimi',
        region: 'iskele'
      }
    }
  },
  {
    id: 'mekan_guvenlik',
    title: 'Güvenlik',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Otelin güvenlik birimi.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      profile: {
        shopType: 'otel birimi',
        region: 'iskele'
      }
    }
  },
];

/**
 * Karakter adı → bağlı olduğu birim. Uygulama bunu okuyup ilgili kişinin
 * metadata.placeId alanını doldurur; böylece kişi otelin tamamına değil
 * çalıştığı birime bağlanır.
 */
export const KISI_BIRIM: Record<string, string> = {
  "Esra Gezgin": 'mekan_restoran',
  "Oya Demre": 'mekan_restoran',
  "Cüneyt Şahin": 'mekan_restoran',
  "Zehra Karahanlı": 'mekan_restoran',
  "Aysu Ateş": 'mekan_restoran',
  "Hasan Tuncer": 'mekan_restoran',
  "Gizem Atalay": 'mekan_restoran',
  "Berke Demirci": 'mekan_restoran',
  "Nilay Güneş": 'mekan_restoran',
  "Fatih Aksak": 'mekan_bar',
  "Kemal Açık": 'mekan_bar',
  "Ahmet Karahan": 'mekan_bar',
  "Canan Yosun": 'mekan_bar',
  "Neslihan Akçay": 'mekan_bar',
  "Ömer Kırca": 'mekan_bar',
  "Bahar Güzel": 'mekan_bar',
  "Gökmen Erkek": 'mekan_bar',
  "Derya Aslan": 'mekan_bar',
  "Esin Doğan": 'mekan_bar',
  "Murat Fırtına": 'mekan_bar',
  "Soner Yıldırım": 'mekan_bar',
  "Rıfat Yavuz": 'mekan_bar',
  "Ali Tekin": 'mekan_bar',
  "Ceylan Yokuş": 'mekan_bar',
  "Gönül Artın": 'mekan_bar',
  "Zeynep Ayan": 'mekan_bar',
  "Ahsen Ay": 'mekan_bar',
  "Bulut Korkmaz": 'mekan_bar',
  "Melis Özdemir": 'mekan_bar',
  "Kaan Taşlı": 'mekan_resepsiyon',
  "Sevgi Erdemir": 'mekan_resepsiyon',
  "Alihan Durmuş": 'mekan_resepsiyon',
  "İlkin Arıkan": 'mekan_resepsiyon',
  "Cemal Salda": 'mekan_resepsiyon',
  "Belkıs Yaman": 'mekan_resepsiyon',
  "Ahu Koçak": 'mekan_resepsiyon',
  "Hayri Aydın": 'mekan_resepsiyon',
  "Zerrin Sağlam": 'mekan_resepsiyon',
  "Levent Öztürk": 'mekan_resepsiyon',
  "Altan Aktaş": 'mekan_kat_hizmetleri',
  "Begüm Çalışkan": 'mekan_kat_hizmetleri',
  "Ayşe Karabulut": 'mekan_kat_hizmetleri',
  "Selin Kaya": 'mekan_kat_hizmetleri',
  "Emre Yıldıran": 'mekan_kat_hizmetleri',
  "Ceyda Demir": 'mekan_kat_hizmetleri',
  "Mehmet Ali Taş": 'mekan_kat_hizmetleri',
  "Aysun Yılmaz": 'mekan_kat_hizmetleri',
  "Eda Kara": 'mekan_kat_hizmetleri',
  "Nusret Demir": 'mekan_guvenlik',
  "Mehmet Akça": 'mekan_guvenlik',
  "Sibel Dansu": 'mekan_guvenlik',
  "Halil Tekir": 'mekan_guvenlik',
  "Asya Çelik": 'mekan_guvenlik',
};

/**
 * Birime bağlı olmayan kişi grupları. Bunlar mekân değildir; kişinin
 * künyesinde kategori olarak durur.
 */
export const KISI_GRUBU_KANON: Record<string, string> = {
  "Heves Karanfil": 'eskort',
  "Öykü Toprak": 'eskort',
  "Leyla Abdallah": 'eskort',
  "Nadia El-Amrani": 'eskort',
  "Safa Benjelloun": 'eskort',
  "Jasmin El-Trabelsi": 'eskort',
  "Sari El-Hassan": 'eskort',
  "Vania Ivanova": 'eskort',
  "Elena Petrova": 'eskort',
  "Gülya Berdyyeva": 'eskort',
  "Alper Kansu": 'ziyaretçi',
  "Aylin Karakaş": 'ziyaretçi',
  "Feride Çarıkçı": 'ziyaretçi',
  "Ilgaz Demirer": 'ziyaretçi',
  "Emir Çeliker": 'ziyaretçi',
  "Seda Kor": 'ziyaretçi',
  "Selim Yıldız": 'ziyaretçi',
  "Nazlı Demirkol": 'ziyaretçi',
  "Barbaros Yılmaz": 'ziyaretçi',
  "Tanju Kayaca": 'ziyaretçi',
  "Yasemin Çelay": 'ziyaretçi',
  "Reyhan Üsküp": 'ziyaretçi',
};

/**
 * Kanonik karakter listesinde yer almayan kayıtlar. Etiketleri
 * ("Walk-in Giriş", "Süresi Dolmuş Kimlik Vakası", "Fırtına Walk-in Vakası")
 * bunların karakter değil resepsiyon simülasyonu vakaları olduğunu gösteriyor.
 * Wiki dizinine girmezler; Oyun Projeleri'ne aittirler.
 */
export const OYUN_VAKA_IDLERI = new Set<string>([
  'kemskoy_guest_erdal',
  'kemskoy_guest_priya',
  'kemskoy_guest_mei',
  'kemskoy_guest_ceren',
  'kemskoy_guest_mehmet',
  'kemskoy_guest_klaus',
  'kemskoy_guest_lena',
  'kemskoy_guest_can',
  'kemskoy_guest_neslihan',
  'kemskoy_guest_osman',
  'kemskoy_guest_cem',
  'kemskoy_guest_hans',
  'kemskoy_guest_yusuf',
  'kemskoy_guest_ahmet',
  'kemskoy_guest_sofia',
  'kemskoy_guest_selim',
  'kemskoy_companion_kerem',
  'kemskoy_companion_ingrid',
]);
