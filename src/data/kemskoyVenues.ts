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
  {
    id: 'mekan_ana_restoran',
    title: 'Ana Restoran',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Otelin ana yemek salonu. Lobi katında, iç avluya bakar.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      profile: {
        shopType: 'restoran',
        region: 'iskele'
      }
    }
  },
  {
    id: 'mekan_restoran_bar',
    title: 'Otel Restoran & Bar',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Otelin ikinci yeme-içme mekânı; akşamları canlı müzik yapılır.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
      profile: {
        shopType: 'restoran & bar',
        region: 'iskele'
      }
    }
  },
  {
    id: 'mekan_jazz_bar',
    title: 'Jazz Bar',
    area: 'duzada',
    type: 'mekân',
    status: 'Fikir',
    priority: 'orta',
    tags: ['kemskoy', 'otel birimi'],
    links: [],
    notes: 'Otelin caz barı. Canlı müzik ve dans kadrosu buraya bağlıdır.',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      kaynak: 'kanon' as Kaynak,
      adiGecici: true,
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
  "Esra Gezgin": 'mekan_ana_restoran',
  "Oya Demre": 'mekan_ana_restoran',
  "Cüneyt Şahin": 'mekan_ana_restoran',
  "Zehra Karahanlı": 'mekan_ana_restoran',
  "Aysu Ateş": 'mekan_ana_restoran',
  "Deniz Aydın": 'mekan_ana_restoran',
  "Hasan Tuncer": 'mekan_ana_restoran',
  "Gizem Atalay": 'mekan_ana_restoran',
  "Berke Demirci": 'mekan_ana_restoran',
  "Nilay Güneş": 'mekan_ana_restoran',
  "Fatih Aksak": 'mekan_restoran_bar',
  "Kemal Açık": 'mekan_restoran_bar',
  "Ahmet Karahan": 'mekan_restoran_bar',
  "Canan Yosun": 'mekan_restoran_bar',
  "Neslihan Akçay": 'mekan_restoran_bar',
  "Ömer Kırca": 'mekan_restoran_bar',
  "Bahar Güzel": 'mekan_restoran_bar',
  "Gökmen Erkek": 'mekan_restoran_bar',
  "Derya Aslan": 'mekan_restoran_bar',
  "Esin Doğan": 'mekan_restoran_bar',
  "Murat Fırtına": 'mekan_jazz_bar',
  "Soner Yıldırım": 'mekan_jazz_bar',
  "Rıfat Yavuz": 'mekan_jazz_bar',
  "Ali Tekin": 'mekan_jazz_bar',
  "Ceylan Yokuş": 'mekan_jazz_bar',
  "Gönül Artın": 'mekan_jazz_bar',
  "Zeynep Ayan": 'mekan_jazz_bar',
  "Ahsen Ay": 'mekan_jazz_bar',
  "Bulut Korkmaz": 'mekan_jazz_bar',
  "Melis Özdemir": 'mekan_jazz_bar',
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
