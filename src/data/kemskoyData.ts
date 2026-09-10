import { Item } from '../types';
import { CHARACTERS_IMPORT_DATA } from './charactersImportData';

export interface KemskoyItem extends Omit<Item, 'createdAt' | 'updatedAt' | 'userId'> {
  id: string;
}

export const KEMSKOY_HOTEL: KemskoyItem = {
  id: 'kemskoy_hotel',
  title: 'The Imperial Kemskøy',
  area: 'duzada',
  type: 'yer',
  status: 'Fikir',
  priority: 'yüksek',
  tags: ['otel', 'kemskoy', 'duzada', 'est1954', 'öneri'],
  links: [
    'kemskoy_staff_cemal',
    'kemskoy_staff_nusret',
    'kemskoy_guest_alper',
    'kemskoy_guest_reyhan',
    'kemskoy_guest_emir',
    'kemskoy_guest_barbaros',
    'kemskoy_guest_feride',
    'kemskoy_guest_erdal',
    'kemskoy_guest_seda',
    'kemskoy_guest_priya',
    'kemskoy_guest_mei',
    'kemskoy_guest_ceren',
    'kemskoy_guest_aylin',
    'kemskoy_guest_mehmet',
    'kemskoy_guest_klaus',
    'kemskoy_guest_nazli',
    'kemskoy_guest_jasmin',
    'kemskoy_guest_ilgaz',
    'kemskoy_guest_yasemin',
    'kemskoy_guest_sari',
    'kemskoy_guest_gulya',
    'kemskoy_guest_oyku',
    'kemskoy_guest_tanju',
    'kemskoy_guest_lena',
    'kemskoy_guest_elena',
    'kemskoy_guest_can',
    'kemskoy_guest_neslihan',
    'kemskoy_guest_osman',
    'kemskoy_guest_cem',
    'kemskoy_guest_hans',
    'kemskoy_guest_yusuf',
    'kemskoy_guest_nadia',
    'kemskoy_guest_ahmet',
    'kemskoy_guest_sofia',
    'kemskoy_guest_leyla',
    'kemskoy_guest_selim',
    'kemskoy_companion_heves',
    'kemskoy_companion_kerem',
    'kemskoy_companion_ingrid'
  ],
  notes: 'Düzada\'da (Ege Denizi) yer alan, EST. 1954 kuruluş tarihli, neo-klasik üslupta inşa edilmiş prestijli otel. Ekim 2003 ("Sezon Sonu") döneminde geçen olayların merkezidir. Toplam 20 odası (kat 1-4 arasında, her katta x01-x05 olmak üzere 5 oda), lobi ve iç avlusu (avlu) mevcuttur. Tipler: 01-02 Standart, 03 Suite, 04-05 Deluxe. 203 (klima arızası) ve 304 (boya tadilatı) odaları başlangıçta bakımdadır.',
  images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=512&auto=format&fit=crop'],
  archived: false,
  isProposal: true,
  metadata: {
    region: 'eski liman / kemskoy',
    haritaKonum: { x: 20, y: 78 },
    wikiSections: [
      { id: '1', title: 'Mimari ve Tarihçe', content: '1954 yılında (EST. 1954) Düzada Eski Liman / Kemskoy bölgesinde inşa edilmiş neo-klasik otel. Liman ve Peron restoran ile bağlantılıdır.', status: 'öneri' },
      { id: '2', title: 'Oda Yapısı', content: 'Katlar 1-4, her katta 5 oda (x01-x05). 01-02 Standart, 03 Suite, 04-05 Deluxe. 203 numaralı oda klima arızası, 304 numaralı oda boya tadilatı sebebiyle bakım altındadır.', status: 'öneri' }
    ]
  }
};

export const KEMSKOY_GAME_PROJECT: KemskoyItem = {
  id: 'kemskoy_game_project',
  title: 'The Imperial Kemskøy - Oyun Projesi',
  area: 'kitap',
  type: 'kitap_proje',
  status: 'taslak',
  priority: 'yüksek',
  tags: ['oyun-tasarimi', 'kemskoy', 'duzada-kanon', 'öneri'],
  links: ['kemskoy_hotel'],
  notes: 'Düzada kanonuna dayalı, Ekim 2003 "Sezon Sonu" döneminde geçen otel resepsiyon yönetim ve gizem oyunu projesi. Kuralları, karakterleri, mekanı ve adanın atmosferini (Liman 54, Peron) işler.',
  images: [],
  archived: false,
  isProposal: true,
  metadata: {
    wikiSections: [
      { id: 'lore_seed', title: 'Düzada Lore Tohumu', content: 'Yer: Düzada (Ege\'de hayali ada). Tarih: Ekim 2003, "Sezon Sonu" dönemi. Kuruluş: EST. 1954. Önemli konumlar: Liman 54 (kapanış etkinliği), Peron (yerel restoran). Bölüm I: Hafta 1 (Sezon Sonu, ipuçlu resepsiyonist rehberi ile). Bölüm II: Hafta 2 (Ölü Sezon, ipuçsuz ve kış kapıda, "yakında").', status: 'öneri' }
    ]
  }
};

const BASE_KEMSKOY_PEOPLE: KemskoyItem[] = [
  // PERSONEL
  {
    id: 'kemskoy_staff_cemal',
    title: 'Cemal Salda',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['personel', 'kemskoy', 'resepsiyon', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Resepsiyon Müdürü. Oteldeki tüm günlük akıştan, müşteri kayıtlarından ve resepsiyon idaresinden sorumlu üst düzey personel.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [
        { id: 'bio', title: 'Profil ve Görev', content: 'The Imperial Kemskøy\'un Resepsiyon Müdürü. Gelen misafirlerin evrak kontrolleri, oda dağıtımları ve departman yönlendirmelerinde ana otoritedir.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_staff_nusret',
    title: 'Nusret Demir',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['personel', 'kemskoy', 'güvenlik', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Güvenlik Müdürü. Otelin iç güvenliği, şüpheli kişilerin takibi, taşkınlık çıkaran alkollü veya kimliksiz kişilerin uzaklaştırılmasından sorumludur.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [
        { id: 'bio', title: 'Profil ve Görev', content: 'The Imperial Kemskøy Güvenlik Müdürü. Sorunlu misafirlerin (örn. aşırı alkollü Mehmet Arslan veya kimliksiz refakatçi getiren Sari El-Hassan) otel dışına alınmasını veya odaya ziyaretçi girişlerinin denetimini koordine eder.', status: 'öneri' }
      ]
    }
  },

  // TEKRAR EDEN MİSAFİRLER
  {
    id: 'kemskoy_guest_alper',
    title: 'Alper Kansu',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 34, Uyruk: T.C. İş insanı, oteli ve Düzada\'yı çok seviyor, düzenli aralıklarla otelde konaklayan sadık misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Müşteri Detayları', content: '34 yaşında, T.C. vatandaşı iş insanı. Otelin daimi müşterilerindendir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_reyhan',
    title: 'Reyhan Üsküp',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'pet sahibi', 'walk-in', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 34, Uyruk: T.C. Kedisi "Duman" (Van Kedisi) ile birlikte seyahat eden sadık bir misafir. Walk-in olarak otele giriş yapar. Evcil hayvanı için +€50 depozito ve pet pasaportu prosedürüne tabidir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [
        { id: 'profil', title: 'Kedi Sahibi Sadık Müşteri', content: '34 yaşında, T.C. vatandaşı. Van Kedisi cinsi Duman adlı kedisiyle seyahat eder. Pet pasaportu ve depozito mekaniğinin ana aktörüdür.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_guest_emir',
    title: 'Emir Çeliker',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'yazar', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_leyla'],
    notes: 'Yaş: 37, Uyruk: T.C. Ünlü romancı ve yazar. Otelde ilham arayan tekrar eden misafirlerden biri. Odası 204\'e Leyla Abdallah adında bir ziyaretçi (escort) kabul eder.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Yazar Profili', content: '37 yaşında, T.C. vatandaşı romancı. Odası (204) için dışarıdan ziyaretçi (Leyla Abdallah) teyit mekanizmasını tetikler.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_barbaros',
    title: 'Barbaros Yılmaz',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_jasmin'],
    notes: 'Yaş: 36, Uyruk: T.C. Tekrar eden misafir. Jasmin El-Trabelsi adlı ziyaretçinin 215 numaralı odada ziyaret ettiği kişi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Ziyaret Edilen Misafir', content: '36 yaşında, T.C. vatandaşı. 215 numaralı odada kalır. Jasmin El-Trabelsi\'nin ziyaret teyidi için aranır.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_feride',
    title: 'Feride Çarıkçı',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'VIP', 'avukat', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 41, Uyruk: T.C. VIP misafir. Medya hassasiyeti yüksek, prestijli avukat alt-hikayesi olan önemli bir karakter.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'VIP Avukat', content: '41 yaşında, T.C. vatandaşı. Basın ve gizlilik konusunda aşırı hassas, VIP hizmet bekler.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_erdal',
    title: 'Erdal Sönmez',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'VIP', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_companion_heves', 'kemskoy_guest_oyku'],
    notes: 'Yaş: 52, Uyruk: T.C. VIP misafir. Refakatçisi Heves Karanfil ile birlikte kalır. Ayrıca 402 numaralı odasında Öykü Toprak adlı ziyaretçi tarafından ziyaret edilir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'VIP Sanayici', content: '52 yaşında, T.C. vatandaşı. Refakatçisi Heves Karanfil ile 402 numaralı Deluxe odada kalmaktadır.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_seda',
    title: 'Seda Kor',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 33, Uyruk: T.C. Düzenli gelen ve otel hizmetlerini iyi tanıyan sadık misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Tekrar Eden Misafir', content: '33 yaşında, T.C. vatandaşı. Otelin sessizliğini tercih eden müdavimlerden.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_priya',
    title: 'Priya Mehta',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'yazar', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 31, Uyruk: Hint. Seyahat yazarı, oteli ve adayı köşesinde tanıtmak üzere tekrar tekrar ziyaret eden uluslararası misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Seyahat Yazarı (Hindistan)', content: '31 yaşında Hint seyahat yazarı. Prestijli yayınlar için adanın sonbahar atmosferini inceler.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_mei',
    title: 'Mei Lin',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'yazar', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 29, Uyruk: Çin. Uzak Doğu\'dan gelen, otelin otantik yapısını ve "Sezon Sonu" hüznünü kaleme alan seyahat yazarı ve blogger.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Uzak Doğulu Blogger', content: '29 yaşında Çin vatandaşı seyahat yazarı. Priya Mehta ile meslektaştır.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_ceren',
    title: 'Ceren Doğan',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'tekrar eden', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 26, Uyruk: T.C. Adada sakin bir tatil arayan genç müdavim.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Genç Müdavim', content: '26 yaşında, T.C. vatandaşı tekrar eden misafir.', status: 'öneri' }]
    }
  },

  // DİĞER MİSAFİRLER
  {
    id: 'kemskoy_guest_aylin',
    title: 'Aylin Karakaş',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'walk-in', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 27, Uyruk: T.C. Rezervasyonsuz gelip müsaitlik durumuna göre oda talep eden walk-in misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Walk-in Giriş', content: '27 yaşında, T.C. vatandaşı walk-in müşteri.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_mehmet',
    title: 'Mehmet Arslan',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'reddedildi', 'alkollü', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 45, Uyruk: T.C. Aşırı alkollü olması ve otel düzenini bozma riski taşıması sebebiyle Nusret Demir (Güvenlik) tarafından girişi reddedilen misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Reddedilen Sorunlu Misafir', content: '45 yaşında, T.C. vatandaşı. Girişte aşırı alkollü olması sebebiyle kabul edilmemiştir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_klaus',
    title: 'Klaus Müller',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 58, Uyruk: Alman. Düzada\'nın sonbahar sessizliğini yaşamak için gelen Alman turist.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Alman Turist', content: '58 yaşında, Alman vatandaşı sakin misafir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_nazli',
    title: 'Nazlı Demirkol',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'pasaport', 'evrak-eksik', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 38, Uyruk: T.C. Girişte kimlik süresi dolduğu fark edilen, bu yüzden alternatif evrak olarak pasaport beyan prosedürü uygulanan misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Süresi Dolmuş Kimlik Vakası', content: '38 yaşında, T.C. vatandaşı. Pasaport veya ehliyet beyanı istenir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_jasmin',
    title: 'Jasmin El-Trabelsi',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'ziyaretçi', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_barbaros'],
    notes: 'Yaş: 23, Uyruk: Tunuslu. 215 numaralı odada kalan Barbaros Yılmaz\'ı ziyaret etmek için gelen yabancı uyruklu ziyaretçi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Tunuslu Ziyaretçi', content: '23 yaşında Tunus vatandaşı. Barbaros Yılmaz\'ın (Oda 215) teyidi sonrası içeri alınır.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_ilgaz',
    title: 'Ilgaz Demirer',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 29, Uyruk: T.C. Sakin bir tatil geçirmek üzere otele kaydolan misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Genç Müşteri', content: '29 yaşında, T.C. vatandaşı standart kayıt misafiri.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_yasemin',
    title: 'Yasemin Çelay',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 29, Uyruk: T.C. Resepsiyondan sabah uyandırma servisi (wake-up call) talep eden titiz misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Servis Talebi Misafiri', content: '29 yaşında, T.C. vatandaşı. Resepsiyon uyandırma mekaniğini tetikler.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_sari',
    title: 'Sari El-Hassan',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'reddedildi', 'evrak-eksik', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 22, Uyruk: Lübnanlı. Yanındaki refakatçinin kimliği olmadığı için otele kaydı Nusret Demir (Güvenlik) kararıyla reddedilen Lübnanlı genç.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Kimliksiz Refakatçi Vakası', content: '22 yaşında Lübnan vatandaşı. Refakatçisi kimlik ibraz edemediği için reddedilmiştir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_gulya',
    title: 'Gülya Berdyyeva',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 23, Uyruk: Türkmen. Adada turistik gezi amacıyla otelde konaklayan Türkmenistan uyruklu misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Türkmen Turist', content: '23 yaşında Türkmenistan vatandaşı genç turist.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_oyku',
    title: 'Öykü Toprak',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'ziyaretçi', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_erdal'],
    notes: 'Yaş: 29, Uyruk: T.C. 402 numaralı VIP odada kalan sanayici Erdal Sönmez\'i ziyaret etmek üzere gelen misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Ziyaretçi Profili', content: '29 yaşında, T.C. vatandaşı. Erdal Sönmez (Oda 402) teyidi sonrası kabul edilir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_tanju',
    title: 'Tanju Kayaca',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 30, Uyruk: T.C. Sezon sonu sakinliğinde iş yorgunluğu atmak isteyen adalı misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Standart Misafir', content: '30 yaşında, T.C. vatandaşı sakin misafir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_lena',
    title: 'Lena Fischer',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 35, Uyruk: Alman. Otelin tarihi dokusu ve estetiğiyle ilgilenen Alman sanat tarihçisi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Alman Sanat Tarihçisi', content: '35 yaşında Alman vatandaşı otel misafiri.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_elena',
    title: 'Elena Petrova',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'reddedildi', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 24, Uyruk: Rus. Otelde boş olan bir odayı ziyaret etmek istediği için Nusret Demir (Güvenlik) tarafından içeri alınması reddedilen Rus turist.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Boş Oda Ziyaret Talebi', content: '24 yaşında Rus vatandaşı. Güvenlik politikaları gereği boş odaya ziyaret talebi reddedilmiştir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_can',
    title: 'Can Aydın',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'liman54', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 28, Uyruk: T.C. Adadaki meşhur Liman 54 kapanış etkinliğine katılmak amacıyla otelde yer ayırtan genç misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Etkinlik Katılımcısı', content: '28 yaşında, T.C. vatandaşı. Adanın Liman 54 kapanış etkinliği ile doğrudan ilişkilidir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_neslihan',
    title: 'Neslihan Aksu',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'aile', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_companion_kerem'],
    notes: 'Yaş: 34, Uyruk: T.C. Eşi Kerem Aksu ile birlikte otele kayıt yaptıran, aile konaklaması gerçekleştiren misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Aile Konaklaması', content: '34 yaşında, T.C. vatandaşı. Eşi Kerem Aksu ile birlikte tatil yapmaktadır.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_osman',
    title: 'Osman Yıldırım',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'walk-in', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 44, Uyruk: T.C. Fırtınalı günde ansızın gelip oda soran walk-in iş seyahatçisi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Walk-in İş Seyahati', content: '44 yaşında, T.C. vatandaşı walk-in iş insanı.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_cem',
    title: 'Cem Kara',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'walk-in', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 41, Uyruk: T.C. Rezervasyonsuz gelip boş odalardan birine yerleşen walk-in müşteri.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Walk-in Girişi', content: '41 yaşında, T.C. vatandaşı walk-in müşteri.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_hans',
    title: 'Hans Brauer',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'müdavim', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_companion_ingrid'],
    notes: 'Yaş: 63, Uyruk: Alman. Her yıl eşi Ingrid Brauer ile aynı sezonda gelen, adayı ve oteli evleri gibi gören ihtiyar Alman müdavim.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Sadık Alman Müdavim', content: '63 yaşında Alman vatandaşı. Eşi Ingrid Brauer ile her yıl aynı dönemde The Imperial Kemskøy\'da konaklar.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_yusuf',
    title: 'Yusuf Kaplan',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 48, Uyruk: T.C. İş görüşmeleri için adada bulunan ve oteli tercih eden profesyonel.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'İş Seyahati', content: '48 yaşında, T.C. vatandaşı iş seyahatçisi.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_nadia',
    title: 'Nadia El-Amrani',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'konferans', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 24, Uyruk: Faslı. Adadaki kültürel bir konferansa katılmak üzere otelde konaklayan genç Faslı araştırmacı.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Faslı Konferans Katılımcısı', content: '24 yaşında Fas vatandaşı genç akademisyen.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_ahmet',
    title: 'Ahmet Yıldız',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'pasaport', 'evrak-eksik', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 55, Uyruk: T.C. Kimlik süresi dolmuş olduğu için pasaport beyan prosedürü uygulanan orta yaşlı misafir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Süresi Geçmiş Kimlik Vakası', content: '55 yaşında, T.C. vatandaşı. Kimlik yerine pasaport kontrolü yapılır.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_sofia',
    title: 'Sofia Ricci',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'walk-in', 'fırtına', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 38, Uyruk: İtalyan. Fırtınadan kaçarak otele sığınan ve oda talep eden İtalyan walk-in turist.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Fırtına Walk-in Vakası', content: '38 yaşında İtalyan vatandaşı. Hava muhalefeti dolayısıyla acil walk-in kayıt gerçekleştirir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_leyla',
    title: 'Leyla Abdallah',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'ziyaretçi', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_emir'],
    notes: 'Yaş: 25, Uyruk: Mısırlı. 204 numaralı odada kalan yazar Emir Çeliker\'i ziyaret etmeye gelen Mısırlı ziyaretçi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Mısırlı Ziyaretçi', content: '25 yaşında Mısır vatandaşı. Emir Çeliker (Oda 204) teyidiyle odaya yönlendirilir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_guest_selim',
    title: 'Selim Arslan',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'walk-in', 'fırtına', 'öneri'],
    links: ['kemskoy_hotel'],
    notes: 'Yaş: 29, Uyruk: T.C. Fırtına dolayısıyla otele sığınan ve walk-in oda açtıran genç seyahatçi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Fırtınada Walk-in', content: '29 yaşında, T.C. vatandaşı fırtına walk-in misafiri.', status: 'öneri' }]
    }
  },

  // REFAKATÇİLER (Companions)
  {
    id: 'kemskoy_companion_heves',
    title: 'Heves Karanfil',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'refakatçi', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_erdal'],
    notes: 'Yaş: 26, Uyruk: T.C. VIP misafir Erdal Sönmez\'in 402 numaralı Deluxe odasındaki refakatçisi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Refakatçi Profili', content: '26 yaşında, T.C. vatandaşı. Erdal Sönmez\'e (Oda 402) eşlik eden refakatçidir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_companion_kerem',
    title: 'Kerem Aksu',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'refakatçi', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_neslihan'],
    notes: 'Yaş: 36, Uyruk: T.C. Neslihan Aksu\'nun eşi ve refakatçisi, aile konaklamasının parçası.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Refakatçi Eş', content: '36 yaşında, T.C. vatandaşı. Neslihan Aksu ile evlidir.', status: 'öneri' }]
    }
  },
  {
    id: 'kemskoy_companion_ingrid',
    title: 'Ingrid Brauer',
    area: 'duzada',
    type: 'kisi',
    status: 'Fikir',
    priority: 'orta',
    tags: ['misafir', 'kemskoy', 'refakatçi', 'müdavim', 'yabancı', 'öneri'],
    links: ['kemskoy_hotel', 'kemskoy_guest_hans'],
    notes: 'Yaş: 60, Uyruk: Alman. Hans Brauer\'in eşi ve sadık otel müdavimi Alman hanımefendi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      region: 'liman',
      wikiSections: [{ id: 'profil', title: 'Müdavim Eş (Almanya)', content: '60 yaşında Alman vatandaşı. Hans Brauer\'in eşidir.', status: 'öneri' }]
    }
  }
];

function formatKunye(char: any): string {
  const lines: string[] = [];
  const header = char.yas ? `${char.ad} (${char.yas}) — ${char.rol}` : (char.rol ? `${char.ad} — ${char.rol}` : char.ad);
  lines.push(header);
  
  const checkVal = (v: any) => v && v.toString().trim() !== '' && v.toString().trim().toLowerCase() !== 'belirtilmedi';
  
  if (checkVal(char.fizik)) lines.push(`* Fizik: ${char.fizik}`);
  if (checkVal(char.sac)) lines.push(`* Saç: ${char.sac}`);
  if (checkVal(char.gozler)) lines.push(`* Gözler: ${char.gozler}`);
  if (checkVal(char.kisilik)) lines.push(`* Kişilik: ${char.kisilik}`);
  if (checkVal(char.sevdikleri)) lines.push(`* Sevdikleri: ${char.sevdikleri}`);
  if (checkVal(char.sevmedikleri)) lines.push(`* Sevmedikleri: ${char.sevmedikleri}`);
  if (checkVal(char.hobiler)) lines.push(`* Hobiler: ${char.hobiler}`);
  
  if (char.ayrinti && char.ayrinti.length > 0) {
    const validDetails = char.ayrinti.filter((d: any) => checkVal(d));
    if (validDetails.length > 0) {
      lines.push(`* Ayrıntı: ${validDetails.join(' ')}`);
    }
  }
  
  return lines.join('\n');
}

export const KEMSKOY_PEOPLE: KemskoyItem[] = (() => {
  const result: KemskoyItem[] = [];
  const processedNames = new Set<string>();

  // Process base people and enrich if they are in CHARACTERS_IMPORT_DATA
  for (const base of BASE_KEMSKOY_PEOPLE) {
    const match = CHARACTERS_IMPORT_DATA.find(c => c.ad.trim().toLowerCase() === base.title.trim().toLowerCase());
    if (match) {
      const formatted = formatKunye(match);
      const mergedNotes = base.notes ? `${base.notes}\n\n---\n${formatted}` : formatted;
      result.push({
        ...base,
        notes: mergedNotes,
        isProposal: true,
        tags: Array.from(new Set([...(base.tags || []), 'öneri']))
      });
      processedNames.add(match.ad.trim().toLowerCase());
    } else {
      result.push(base);
    }
  }

  // Now add the remaining ones from CHARACTERS_IMPORT_DATA
  for (const char of CHARACTERS_IMPORT_DATA) {
    const nameKey = char.ad.trim().toLowerCase();
    if (!processedNames.has(nameKey)) {
      const formatted = formatKunye(char);
      const slug = char.ad.toLowerCase()
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/[^a-z0-9]/g, '_');
      
      const isStaff = char.rol.toLowerCase().includes('aşçı') || 
                      char.rol.toLowerCase().includes('garson') || 
                      char.rol.toLowerCase().includes('sommelier') || 
                      char.rol.toLowerCase().includes('bar') || 
                      char.rol.toLowerCase().includes('müzik') || 
                      char.rol.toLowerCase().includes('sanatçı') || 
                      char.rol.toLowerCase().includes('dans') || 
                      char.rol.toLowerCase().includes('resepsiyon') || 
                      char.rol.toLowerCase().includes('temizlik') || 
                      char.rol.toLowerCase().includes('housekeeping') || 
                      char.rol.toLowerCase().includes('güvenlik');
      
      const isEscort = char.rol.toLowerCase().includes('eskort');

      const tags = [
        isStaff ? 'personel' : (isEscort ? 'eskort' : 'misafir'),
        'kemskoy',
        'öneri'
      ];

      result.push({
        id: `kemskoy_gen_${slug}`,
        title: char.ad,
        area: 'duzada',
        type: 'kisi',
        status: 'Fikir',
        priority: 'orta',
        tags,
        links: ['kemskoy_hotel'],
        notes: formatted,
        images: [],
        archived: false,
        isProposal: true,
        metadata: {
          region: 'eski liman / kemskoy'
        }
      });
      processedNames.add(nameKey);
    }
  }

  return result;
})();

export const KEMSKOY_MECHANICS: KemskoyItem[] = [
  {
    id: 'kemskoy_mech_id_check',
    title: 'Kimlik / Evrak Doğrulama',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'giriş-kontrol', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Misafirin ad, soyad ve yaşını resepsiyon ekranındaki rezervasyon listesiyle eşleştirme mekaniği. Yanlış veya uyuşmayan bilgileri saptayıp Nusret Demir (Güvenlik) ekibine rapor etme ya da girişi reddetme kuralı.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 1,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Tüm misafir kayıtlarının ilk aşamasıdır. Karakterin kimliğindeki isim ve yaş bilgileri, sistemde kayıtlı rezervasyonla tam eşleşmelidir.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_passport_claim',
    title: 'Pasaport Beyanı (Süresi Dolmuş Kimlik)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'belge-istemi', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Kimlik süresi dolmuş misafirlerin (örn. Nazlı Demirkol, Ahmet Yıldız) kayıt sırasında pasaport veya alternatif resmi evrak beyan etmesini isteme kuralı. Evrak ibraz edilmezse kayıt başarısız olur ve puan kaybedilir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 2,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Eğer bir kimliğin süresi geçmişse, resepsiyonist kırmızı uyarı alır ve misafirden pasaport ibraz etmesini talep etmek zorundadır.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_pet_passport',
    title: 'Pet Pasaportu & Evcil Hayvan Depozitosu',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'depozito', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Otele evcil hayvanıyla (örn. Reyhan Üsküp ve kedisi Duman) gelen misafirlerden pet pasaportu talep etme ve oda hasar güvencesi olarak +€50 depozito tahsil etme kuralı. Depozito ödenmezse evcil hayvan odaya kabul edilemez.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 3,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Evcil hayvanların otele girişi için pet pasaportu zorunludur. Ayrıca kasaya +50 Euro nakit veya kart depozitosu işlenir.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_escort_verify',
    title: 'Ziyaretçi (Escort) Doğrulama',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'güvenlik-kontrol', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Otel dışından gelen ziyaretçilerin (örn. Leyla Abdallah, Jasmin El-Trabelsi, Öykü Toprak) kalacakları odayı ve misafiri (örn. Emir Çeliker, Barbaros Yılmaz, Erdal Sönmez) belirtmesi; resepsiyonistin odayı telefonla arayarak teyit alması mekaniği. Boş odaya gitmek isteyenler (örn. Elena Petrova) reddedilir.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 4,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Ziyaretçiler resepsiyonda durdurulur, hedef oda aranır. Müşteri onaylarsa giriş izni verilir, aksi halde Nusret Demir (Güvenlik) çağrılır.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_walk_in',
    title: 'Walk-In Oda Kontrolü ve Ödeme',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'müsaitlik', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Rezervasyonsuz gelen müşterilerin (walk-in: örn. Aylin Karakaş, Reyhan Üsküp, Osman Yıldırım, Cem Kara, Sofia Ricci, Selim Arslan) oda müsaitlik tablosundan boş bir odaya yerleştirilmesi ve peşin ödeme/provizyon alınması mekaniği. Boş oda yoksa kibarca reddedilirler.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 5,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Müşteri aniden kapıda belirdiğinde resepsiyon tablosundan müsait oda tipleri (Standart, Suite, Deluxe) taranır ve fiyata göre onay alınır.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_dept_routing',
    title: 'Departman Yönlendirme (Hizmet Atama)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'hizmetler', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Gelen müşteri taleplerine veya oda durumlarına göre doğru departmanı yönlendirme mekaniği: Housekeeping (kat hizmetleri), Teknik Servis (örn. Klima arızası oda 203), Oda Servisi, Güvenlik (örn Nusret Demir) veya Resepsiyon (Cemal Salda).',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 6,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Oteldeki her sorun ilgili birime sevk edilir. Yanlış yönlendirmeler otel puanını ve oda temizlik sürelerini olumsuz etkiler.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_check_out',
    title: 'Check-out & Ek Ücret Tahsilatı',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'muhasebe', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Müşterinin çıkış yaparken ekstra harcamalarını (minibar, telefon, oda servisi vb.) faturaya yansıtma, valiz bırakma (Bell Team) veya taksi çağırma taleplerini koordine etme kuralı.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 7,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Çıkış esnasında oda numarasına bağlı ekstre kontrol edilir. Bellboy koordinasyonu sağlanarak valizlerin muhafazası yönetilir.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_random_event',
    title: 'Anlık Kararlar & Rastgele Olaylar',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'anlık-olay', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Fırtına çıkması, elektrik kesintisi, şüpheli paket bulunması veya VIP bir müşterinin (örn. Feride Çarıkçı) basından kaçması gibi beklenmedik anlık olaylara saniyeler içinde karar verme ve doğru departmanı devreye sokma mekaniği.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 8,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Zamana karşı yarışılan anlık olaylardır. Resepsiyonistin verdiği cevaplar doğrudan "Otel İtibarı" ve "Güvenlik" skorunu değiştirir.', status: 'öneri' }
      ]
    }
  },
  {
    id: 'kemskoy_mech_difficulty',
    title: 'Zorluk Dereceleri & Leaderboard',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['mekanik', 'kemskoy-oyun', 'skor', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Kolay (5 hata hakkı / ipuçlu), Normal (3 hata hakkı) ve Zor (1 hata hakkı / sıfır ipucu) zorluk ayarları. Günlük ve haftalık puanların toplanarak leaderboard (liderlik tablosu) sıralamasına yansıtılması sistemi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      chapterIndex: 9,
      wikiSections: [
        { id: 'desc', title: 'Mekanik Açıklaması', content: 'Zorluk arttıkça ipuçları gizlenir ve zaman kısıtlaması daralır. Kusursuz performanslar ekstra puan çarpanı kazandırır.', status: 'öneri' }
      ]
    }
  }
];

export const KEMSKOY_DAYS: KemskoyItem[] = [
  // --- WEEK 1: BÖLÜM I: SEZON SONU ---
  {
    id: 'kemskoy_day_1',
    title: '1. Gün (Pazartesi)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Ekim fırtınasının kapıya dayandığı sezonun son günlerine giriş.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 1,
      date: 'Pazartesi · 6 Ekim 2003',
      weather: '💨 Fırtınalı (Lodos)',
      occupancy: 65,
      memoFrom: 'Cemal Salda',
      memoText: 'Sezon sonuna yaklaşıyoruz. Lütfen giriş işlemlerinde kimlik belgelerini eksiksiz kontrol edin ve lobi düzenine dikkat edin.',
      expectedCheckouts: 'Oda 102, Oda 204',
      morningNote: 'Lodos rüzgarlarının otel pencerelerini hafifçe titrettiği serin bir Ekim sabahı...',
      operations: [
        {
          id: 'kemskoy_day_1_op_1',
          order: 1,
          type: 'walk-in',
          whoWhat: 'Aylin Karakaş',
          description: 'Walk-in misafir olarak geliyor ve rezervasyonu olmadığını söylüyor. Sessiz bir oda talep ediyor.',
          correctAction: 'Oda müsaitliğini kontrol et, Oda 101\'e kaydını aç ve ödemeyi nakit al.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_aylin',
          linkedRoomId: 'Oda 101',
          effect: 'Doğru oda seçimi müşteri memnuniyetini (+10) artırır.'
        },
        {
          id: 'kemskoy_day_1_op_2',
          order: 2,
          type: 'check-in',
          whoWhat: 'Reyhan Üsküp',
          description: 'Tekrar eden konuk. Yanında sevimli kedisi \'Duman\' (Van Kedisi) ile giriş yapmak istiyor.',
          correctAction: 'Kimlik kontrolü gerçekleştir, kedi için pet pasaportunu talep et ve €50 depozito tahsil et.',
          linkedMechanicId: 'kemskoy_mech_pet_passport',
          linkedCharacterId: 'kemskoy_guest_reyhan',
          linkedRoomId: 'Oda 205',
          effect: 'Evcil hayvan prosedürü uygulanırsa depozito kasaya kaydedilir, aksi halde ceza kesilir.'
        },
        {
          id: 'kemskoy_day_1_op_3',
          order: 3,
          type: 'check-in',
          whoWhat: 'Klaus Schmidt',
          description: 'Eski Alman mühendis ve karakalem ressamı. Pasaportunu uzatıp deniz manzaralı bir standart oda talep ediyor.',
          correctAction: 'Kimlik bilgilerini doğrula, Oda 301\'e yerleştir, sanat ve sarnıç çizimlerini lobide sergilememesini kibarca rica et.',
          linkedMechanicId: 'kemskoy_mech_id_check',
          linkedCharacterId: 'kemskoy_guest_klaus',
          linkedRoomId: 'Oda 301',
          effect: '+15 Puan, Klaus Schmidt lobi sanat sohbetlerine başlar.'
        },
        {
          id: 'kemskoy_day_1_op_4',
          order: 4,
          type: 'check-out',
          whoWhat: 'Alper Kansu',
          description: 'Hafta sonu konaklamasını bitirip adadan ayrılmak için 102 numaralı standart odasından çıkış yapmak istiyor.',
          correctAction: 'Oda anahtarını al, minibar kullanımını kontrol et, faturayı tahsil ederek uğurla.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_alper',
          linkedRoomId: 'Oda 102',
          effect: '+10 Puan, Oda 102 temizlik için sıraya alınır.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_2',
    title: '2. Gün (Salı)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'VIP misafirlerin otele giriş yaptığı kritik bir gün.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 2,
      date: 'Salı · 7 Ekim 2003',
      weather: '🌧️ Sağanak Yağışlı',
      occupancy: 70,
      memoFrom: 'Cemal Salda',
      memoText: 'Bugün VIP misafirimiz Erdal Sönmez giriş yapacak. Gizlilik ricasını kesinlikle uygulayalım ve gelen ziyaretçileri odasına teyitsiz almayalım.',
      expectedCheckouts: 'Oda 101',
      morningNote: 'Yağmur damlalarının avluyu göle çevirdiği gri bir gün...',
      operations: [
        {
          id: 'kemskoy_day_2_op_1',
          order: 1,
          type: 'check-in',
          whoWhat: 'Erdal Sönmez',
          description: 'Zengin iş adamı ve VIP misafirimiz. Yanında bagajlarıyla lobiye giriş yapıyor.',
          correctAction: 'Oda 402 Deluxe anahtarını ver, giriş işlemlerini kaydet ve sessizlik/gizlilik ricalarına sadık kal.',
          linkedMechanicId: 'kemskoy_mech_id_check',
          linkedCharacterId: 'kemskoy_guest_erdal',
          linkedRoomId: 'Oda 402',
          effect: 'VIP kayıt hatasız yapılırsa prestij puanı kazanılır (+15).'
        },
        {
          id: 'kemskoy_day_2_op_2',
          order: 2,
          type: 'escort',
          whoWhat: 'Heves Karanfil',
          description: 'Erdal Sönmez\'in 402 numaralı odasını ziyaret etmek için lobiye gelen eskort misafir.',
          correctAction: 'Oda 402\'deki Erdal Sönmez ile telefonla teyit kur, güvenliği (Nusret Demir) bilgilendir ve eskortun giriş formunu doldurt.',
          linkedMechanicId: 'kemskoy_mech_escort_verify',
          linkedCharacterId: 'kemskoy_companion_heves',
          linkedRoomId: 'Oda 402',
          effect: 'Teyit prosedürleri atlanırsa otel güvenliği tehlikeye girer ve ceza uygulanır.'
        },
        {
          id: 'kemskoy_day_2_op_3',
          order: 3,
          type: 'call',
          whoWhat: 'Cemal Salda (Otel Müdürü)',
          description: 'Lobi telefonundan arayarak rıhtımdaki fırtına hazırlıklarını soruyor ve jeneratör dairesinin kontrol edilmesini istiyor.',
          correctAction: 'Güvenlik Nusret Demir ile telsizle görüşerek jeneratör yakıt kontrolünün yapılmasını sağla.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: 'Operasyonel koordinasyon başarıyla tamamlanır, müdürün güveni artar (+10).'
        },
        {
          id: 'kemskoy_day_2_op_4',
          order: 4,
          type: 'post-it',
          whoWhat: 'Oda 205 (Reyhan Üsküp) Mesajı',
          description: 'Kedi mamasının ve lobiye düşürülen pembe renkli küçük defterin bulunması talebini içeren bir not.',
          correctAction: 'Kat Hizmetleri Müdürü Altan Aktaş\'ı bilgilendir, lobide kedi defterini aramak üzere notu panoya as.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 205',
          effect: '+10 Puan, kayıp eşya takibi başlatılır.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_3',
    title: '3. Gün (Çarşamba)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Bakım odaları ve kat hizmetleri yönlendirme koordinasyonu.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 3,
      date: 'Çarşamba · 8 Ekim 2003',
      weather: '🌤️ Parçalı Bulutlu',
      occupancy: 55,
      memoFrom: 'Cemal Salda',
      memoText: 'Klima arızası devam eden Oda 203\'e kesinlikle misafir kaydetmeyelim. Kat Hizmetleri Müdürü Altan Aktaş ile sürekli irtibatta kalın.',
      expectedCheckouts: 'Oda 205',
      morningNote: 'Rüzgarın dindiği, adanın güneşli ama ayaz havasıyla uyandığı bir sabah...',
      operations: [
        {
          id: 'kemskoy_day_3_op_1',
          order: 1,
          type: 'post-it',
          whoWhat: 'Oda 203 Klima Arızası',
          description: 'Oda 203\'te kalan eski misafir klimanın aşırı ses yaptığını belirtiyor.',
          correctAction: 'Odayı bakıma al, Kat Hizmetleri teknik ekibini (Altan Aktaş) bilgilendir ve durumu sisteme not düş.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 203',
          effect: 'Zamanında yönlendirme yapılmazsa müşteri memnuniyeti düşer (-10).'
        },
        {
          id: 'kemskoy_day_3_op_2',
          order: 2,
          type: 'check-out',
          whoWhat: 'Alper Kansu',
          description: '102 numaralı standart odasından çıkış yapmak için resepsiyona geliyor.',
          correctAction: 'Oda anahtarını al, minibar kullanımını sor, ekstre kontrol et ve faturayı tahsil ederek uğurla.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_alper',
          linkedRoomId: 'Oda 102',
          effect: 'Kusursuz hesap kapatma bütçe puanını artırır (+10).'
        },
        {
          id: 'kemskoy_day_3_op_3',
          order: 3,
          type: 'walk-in',
          whoWhat: 'Sari El-Hassan',
          description: 'Lübnanlı tüccar olduğunu söyleyen şüpheli bir misafir geliyor, sessiz ve alt katlarda bulunan bir oda istiyor.',
          correctAction: 'Kimliğini detaylı incele, Oda 103 Suite müsaitliğini kontrol et ve €150 gecelik ücreti tahsil et.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_sari',
          linkedRoomId: 'Oda 103',
          effect: '+15 Puan, Sari El-Hassan otele yerleşir ve adayı araştırmaya başlar.'
        },
        {
          id: 'kemskoy_day_3_op_4',
          order: 4,
          type: 'event',
          whoWhat: 'Nusret Demir (Güvenlik Müdürü)',
          description: 'Resepsiyona gelerek, otel bahçesinde ve sarnıç kapısı çevresinde yabancı plakalı şüpheli bir araç gördüğünü bildiriyor.',
          correctAction: 'Müdür Cemal Salda\'yı bilgilendir, araç bilgilerini kayıt defterine not et ve güvenlik devriyelerini artır.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: 'Güvenlik önlemleri artırılır, olası casusluk engellenir (+20).'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_4',
    title: '4. Gün (Perşembe)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Süresi dolmuş evraklar ve fırtına etkisi altındaki otel düzeni.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 4,
      date: 'Perşembe · 9 Ekim 2003',
      weather: '💨 Fırtınalı (Lodos)',
      occupancy: 50,
      memoFrom: 'Cemal Salda',
      memoText: 'Fırtına şiddetlendi. Lobi camlarını kapalı tutalım. Girişte kimlik belgesi süresi dolan konuklar için pasaport beyan prosedürü uygulayalım.',
      expectedCheckouts: 'Oda 402',
      morningNote: 'Lodosun dalgaları eski limana çarptığı gürültülü ve tedirgin bir perşembe günü...',
      operations: [
        {
          id: 'kemskoy_day_4_op_1',
          order: 1,
          type: 'check-in',
          whoWhat: 'Nazlı Demirkol',
          description: 'İş kadını, giriş esnasında kimlik süresinin dolduğu fark ediliyor.',
          correctAction: 'Durumu kibarca açıkla, pasaport beyan prosedürünü işlet ve pasaportunun kopyasını alarak kaydı tamamla.',
          linkedMechanicId: 'kemskoy_mech_passport_claim',
          linkedCharacterId: 'kemskoy_guest_nazli',
          linkedRoomId: 'Oda 301',
          effect: 'Eksik evrakla kayıt yapılmadığından emin olunması yasal denetim başarısı sağlar (+15).'
        },
        {
          id: 'kemskoy_day_4_op_2',
          order: 2,
          type: 'event',
          whoWhat: 'Fırtına Kaynaklı Elektrik Kesintisi',
          description: 'Fırtına sebebiyle adada elektrikler gidiyor. Lobide panik havası hakim.',
          correctAction: 'Lobi gaz lambalarını yak, jeneratörün devreye alınması için teknik ekibi yönlendir ve misafirlere sakin olmalarını telkin et.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: 'Kriz anında doğru karar otelin itibarını kurtarır (+20).'
        },
        {
          id: 'kemskoy_day_4_op_3',
          order: 3,
          type: 'call',
          whoWhat: 'Altan Aktaş (Kat Hizmetleri Müdürü)',
          description: 'Arayıp Oda 304\'teki boya kokusunun ancak yarına dert olmayacak seviyeye ineceğini, odanın kilitli kalması gerektiğini söylüyor.',
          correctAction: 'Oda 304 durumunu sistemde "Tadilat" olarak kilitle ve resepsiyon tahtasına kırmızı tebeşirle not düş.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 304',
          effect: '+10 Puan, yanlış oda atamaları önlenir.'
        },
        {
          id: 'kemskoy_day_4_op_4',
          order: 4,
          type: 'check-out',
          whoWhat: 'Reyhan Üsküp',
          description: 'Oda 205\'ten çıkış yapmak istiyor. Kedisi Duman\'ın odada olmadığı, lobide kaybolduğu için çok gergin.',
          correctAction: 'Sakinleştir, minibar hesabını kapat, depozitoyu iade et ve kediyi güvenlik yardımıyla buldurup kafesinde teslim et.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_reyhan',
          linkedRoomId: 'Oda 205',
          effect: '+15 Puan, Reyhan hanım kediyle mutlu ayrılır.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_5',
    title: '5. Gün (Cuma)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Hafta sonu yoğunluğu ve liman etkinliği hazırlıkları.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 5,
      date: 'Cuma · 10 Ekim 2003',
      weather: '🌧️ Sağanak Yağışlı',
      occupancy: 80,
      memoFrom: 'Cemal Salda',
      memoText: 'Liman 54 kapanış etkinliği sebebiyle otelimiz bu hafta sonu tam doluluk oranlarına ulaşacaktır. Giriş çıkış kuyruklarını iyi yönetelim.',
      expectedCheckouts: 'Oda 301',
      morningNote: 'Yağmurun bereketiyle gelen yoğun ve hareketli bir cuma sabahı...',
      operations: [
        {
          id: 'kemskoy_day_5_op_1',
          order: 1,
          type: 'walk-in',
          whoWhat: 'Ilgaz Demirer',
          description: 'Zengin bir ailenin oğlu, sevgilisiyle sakin ve konforlu bir oda (Suite) talep ediyor.',
          correctAction: 'Oda 303 Suite müsaitliğini kontrol et, kaydı gerçekleştir, ödemeyi kredi kartı ile tahsil et.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_ilgaz',
          linkedRoomId: 'Oda 303',
          effect: 'Başarılı Walk-in satışı ciroya ve genel puana doğrudan katkı sağlar (+15).'
        },
        {
          id: 'kemskoy_day_5_op_2',
          order: 2,
          type: 'call',
          whoWhat: 'Murat Fırtına (Bar Müdürü)',
          description: 'Bar için bu akşam özel şarap ve müzik şov organizasyonu planlandığını bildiriyor.',
          correctAction: 'Bar biletlerini ve rezerve listelerini teyit et, misafirleri akşamki etkinliğe davet et.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: 'Marka içi departman entegrasyonu etkinlik başarısını pekiştirir (+10).'
        },
        {
          id: 'kemskoy_day_5_op_3',
          order: 3,
          type: 'event',
          whoWhat: 'Sari El-Hassan Lobi Araması',
          description: 'Otel kütüphanesinde Düzada eski liman haritalarını aradığını söyleyerek yardım istiyor.',
          correctAction: 'Kendisine haritaların sadece Müdür Cemal Bey\'in izniyle gösterilebileceğini söyleyip arşive girmesini engelle.',
          linkedMechanicId: 'kemskoy_mech_id_check',
          linkedCharacterId: 'kemskoy_guest_sari',
          effect: '+15 Puan, otel arşivinin güvenliği ve sırlar korunur.'
        },
        {
          id: 'kemskoy_day_5_op_4',
          order: 4,
          type: 'check-out',
          whoWhat: 'Nazlı Demirkol',
          description: 'Oda 301\'den pazar günkü uçuşuna yetişmek için erken çıkış yapmak üzere resepsiyona geliyor.',
          correctAction: 'Oda hesabını kontrol et, kurumsal faturasını düzenle ve adadan kalkan son vapura yetişmesi için taksi çağır.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_nazli',
          linkedRoomId: 'Oda 301',
          effect: '+10 Puan, profesyonel çıkış işlemi tamamlanır.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_6',
    title: '6. Gün (Cumartesi)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Kritik hafta sonu güvenliği ve barda gürültü şikayetleri.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 6,
      date: 'Cumartesi · 11 Ekim 2003',
      weather: '☁️ Çok Bulutlu',
      occupancy: 85,
      text: 'Resepsiyonda en yoğun saatler. Misafir sirkülasyonu zirve yapıyor.',
      memoFrom: 'Cemal Salda',
      memoText: 'Güvenlik Müdürü Nusret Demir ve ekibiyle koordineli olalım. Ziyaretçi eskortların kimlik belgelerini resepsiyonda muhafaza edelim.',
      expectedCheckouts: 'Oda 101, Oda 205',
      morningNote: 'Liman 54 heyecanının tüm adayı sardığı rüzgarsız ama kasvetli bir cumartesi...',
      operations: [
        {
          id: 'kemskoy_day_6_op_1',
          order: 1,
          type: 'escort',
          whoWhat: 'Öykü Toprak',
          description: 'VIP konuk Erdal Sönmez\'in dünkü ziyaretçisi Heves\'ten sonra bugün gelen diğer eskort misafir.',
          correctAction: 'Oda 402\'yi ara, Erdal Sönmez\'den ziyaretçi teyidini al, güvenliği devreye sokarak odaya kabul et.',
          linkedMechanicId: 'kemskoy_mech_escort_verify',
          linkedCharacterId: 'kemskoy_guest_oyku',
          linkedRoomId: 'Oda 402',
          effect: 'Doğru teyit mekanizması VIP gizlilik ve güvenlik standardını korur (+15).'
        },
        {
          id: 'kemskoy_day_6_op_2',
          order: 2,
          type: 'event',
          whoWhat: 'Barda Gürültü ve Aşırı Alkol Şikayeti',
          description: 'Bir grup otel misafiri, The Imperial Bar\'daki yüksek sesli müzikten ve gürültüden şikayetçi oluyor.',
          correctAction: 'Güvenlik Müdürü Nusret Demir ile iletişime geç, bar müdürü Murat Fırtına\'yı ses kontrolü için uyar.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: 'Kriz anında hızlı departman yönlendirmesi otel içi düzeni sağlar (+10).'
        },
        {
          id: 'kemskoy_day_6_op_3',
          order: 3,
          type: 'call',
          whoWhat: 'Klaus Schmidt Hesap İtirazı',
          description: 'Odadan arayarak, akşam yediği akşam yemeğinin faturasına ekstra servis ücreti yansıtıldığını, itiraz ettiğini belirtiyor.',
          correctAction: 'Peron Restaurant mutfağını teyit et, şef hatası olduğunu anlayıp faturadan o kalemi silerek özür dile.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 301',
          effect: '+10 Puan, müşteri memnuniyeti korunur.'
        },
        {
          id: 'kemskoy_day_6_op_4',
          order: 4,
          type: 'event',
          whoWhat: 'Gece Yarısı Lobi Sızması',
          description: 'Saat gece 02:00 sularında kapüşonlu bir şahıs sarnıç kapısına giden koridora sızmaya çalışıyor.',
          correctAction: 'Hemen alarm düğmesine bas, telsizle Güvenlik Nusret Demir\'i çağır ve şahsı yakalat.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: '+20 Puan, sarnıç casusluğu girişimi engellenir.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_7',
    title: '7. Gün (Pazar)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Haftalık değerlendirme ve büyük hesap kapatma günü.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm I: Sezon Sonu',
      chapterIndex: 7,
      date: 'Pazar · 12 Ekim 2003',
      weather: '🌤️ Parçalı Bulutlu',
      occupancy: 60,
      memoFrom: 'Cemal Salda',
      memoText: 'Giden konukların ödemelerini, ekstralarını ve faturasız hiçbir kalemin kalmadığını kontrol edelim.',
      expectedCheckouts: 'Oda 402, Oda 303',
      morningNote: 'Yorucu fırtınaların ve etkinliklerin ardından gelen dinlendirici bir pazar sabahı...',
      operations: [
        {
          id: 'kemskoy_day_7_op_1',
          order: 1,
          type: 'check-out',
          whoWhat: 'Erdal Sönmez',
          description: 'VIP konuğumuz otelden çıkış yapıyor. Oda faturası ve eskort ziyaret ekstralarını içeren yüklü hesap kapatma.',
          correctAction: 'Oda faturasını kontrol et, minibar ve ekstraları yansıt, ödemeyi tahsil et, eskort giriş çıkış evraklarını arşivle.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_erdal',
          linkedRoomId: 'Oda 402',
          effect: 'VIP çıkışı hatasız yapıldığında büyük bütçe bonusu kazanılır (+25).'
        },
        {
          id: 'kemskoy_day_7_op_2',
          order: 2,
          type: 'check-out',
          whoWhat: 'Klaus Schmidt',
          description: 'Oda 301\'den çıkış yapıyor. Kaldığı sürece çizdiği 3 adet karakalem Düzada sarnıç resmini resepsiyona hediye bırakıyor.',
          correctAction: 'Teşekkür et, oda anahtarını al, faturasını tahsil et ve hediyeleri lobideki sergi panosuna as.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_klaus',
          linkedRoomId: 'Oda 301',
          effect: 'Kusursuz çıkış işlemi ve sanat hediyesi otel prestijini artırır (+15).'
        },
        {
          id: 'kemskoy_day_7_op_3',
          order: 3,
          type: 'check-out',
          whoWhat: 'Sari El-Hassan',
          description: 'Oda 103 Suite\'ten aceleyle çıkış yapmak istiyor. Çantasında tarihi rulo haritalar olduğu göze çarpıyor.',
          correctAction: 'Müdür Cemal Bey\'i gizlice bilgilendir, oda kontrolleri bitene kadar Sari Bey\'i çay ikramıyla oyala.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_sari',
          linkedRoomId: 'Oda 103',
          effect: '+20 Puan, çalınan tarihi harita rulosu güvenlikle kurtarılır.'
        },
        {
          id: 'kemskoy_day_7_op_4',
          order: 4,
          type: 'post-it',
          whoWhat: 'Cemal Müdür\'den Tebrik Notu',
          description: 'Müdür Cemal Salda, zorlu lodos haftasını başarıyla ve sıfır kayıpla tamamlayan resepsiyon ekibini tebrik ediyor.',
          correctAction: 'Haftalık başarı bültenini panoya as, tüm ekibe teşekkür et ve sezon sonu kilitlerini kapat.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: '+30 Puan, Sezon Sonu bölümü başarıyla kilitlenir.'
        }
      ]
    }
  },

  // --- WEEK 2: BÖLÜM II: ÖLÜ SEZON ---
  {
    id: 'kemskoy_day_8',
    title: '8. Gün (Pazartesi)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Ölü sezon başlangıcı. Isıtma sistemlerinin ve tadilatın takibi.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 8,
      date: 'Pazartesi · 13 Ekim 2003',
      weather: '💨 Fırtınalı (Karayel)',
      occupancy: 40,
      memoFrom: 'Cemal Salda',
      memoText: 'Sezon bitti, ölü sezona geçiyoruz. Isıtıcıların durumunu kontrol edelim. Oda 304\'te boya tadilatı başladı, odayı boş tutalım.',
      expectedCheckouts: 'Oda 203',
      morningNote: 'Karayel fırtınasının Düzada sokaklarında ıslık çaldığı soğuk bir pazartesi...',
      operations: [
        {
          id: 'kemskoy_day_8_op_1',
          order: 1,
          type: 'check-in',
          whoWhat: 'Emir Çeliker',
          description: 'Ünlü yazar, romanını yazmak için sessiz, deniz manzaralı bir oda (Oda 204) talep ederek otele geliyor.',
          correctAction: 'Kimlik kontrolü gerçekleştir, Oda 204 anahtarını ver ve yazara sessizlik sözü vererek kaydı tamamla.',
          linkedMechanicId: 'kemskoy_mech_id_check',
          linkedCharacterId: 'kemskoy_guest_emir',
          linkedRoomId: 'Oda 204',
          effect: 'Yazar misafir sessiz odada rahat hissettiğinde prestij puanı kazanılır (+15).'
        },
        {
          id: 'kemskoy_day_8_op_2',
          order: 2,
          type: 'post-it',
          whoWhat: 'Oda 304 Boya Kokusu',
          description: 'Oda 304\'ün tadilat ve boyasının yeni bittiği, keskin bir koku yaydığı notu ulaşıyor.',
          correctAction: 'Oda 304\'ün statüsünü bakıma al, pencerelerin havalandırılması için Kat Hizmetlerine (Begüm Çalışkan) bilgi ver.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 304',
          effect: 'Kötü kokulu oda kiralanırsa ağır memnuniyet cezası kesilir (-15).'
        },
        {
          id: 'kemskoy_day_8_op_3',
          order: 3,
          type: 'walk-in',
          whoWhat: 'Yasemin Evren',
          description: 'Adadaki üniversitenin edebiyat bölümü araştırma görevlisi, kütüphanedeki eski belgeleri incelemek üzere kalacak oda istiyor.',
          correctAction: 'Oda müsaitliğini doğrula, standart Oda 201\'e kaydet, otel kütüphane anahtarını ver.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_yasemin',
          linkedRoomId: 'Oda 201',
          effect: '+10 Puan, akademisyen konuk sadakati kazanılır.'
        },
        {
          id: 'kemskoy_day_8_op_4',
          order: 4,
          type: 'call',
          whoWhat: 'Cemal Salda (Otel Müdürü)',
          description: 'Arayıp, kalorifer dairesindeki vanaların sıkışıp sıkışmadığını, teknik personelin durumu kontrol edip etmediğini soruyor.',
          correctAction: 'Kat Hizmetleri teknik ekibini (Altan Aktaş) arayarak kalorifer dairesine yönlendir ve sonucu müdüre bildir.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: '+10 Puan, otel ısınma sistemi kışa hazırlanır.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_9',
    title: '9. Gün (Salı)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Yazar misafirin eskort ziyareti ve liman fenerindeki sarsıntılar.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 9,
      date: 'Salı · 14 Ekim 2003',
      weather: '🌧️ Sürekli Yağmurlu',
      occupancy: 35,
      memoFrom: 'Cemal Salda',
      memoText: 'Yazar misafirimizin gizliliğini korumaya devam edelim. Yağış çok yoğun, çatı sızıntılarına karşı dikkatli olalım.',
      expectedCheckouts: 'Oda 304',
      morningNote: 'Dinmeyen yağmur sesinin adayı sardığı melankolik bir salı sabahı...',
      operations: [
        {
          id: 'kemskoy_day_9_op_1',
          order: 1,
          type: 'escort',
          whoWhat: 'Leyla Abdallah',
          description: 'Ünlü yazar Emir Çeliker\'in 204 numaralı odasındaki ziyaretçisi, mısırlı şık bir kadın.',
          correctAction: 'Yazar Emir Çeliker\'in odasını ara, teyit al, kimlik kaydını yaparak odaya geçişine izin ver.',
          linkedMechanicId: 'kemskoy_mech_escort_verify',
          linkedCharacterId: 'kemskoy_guest_leyla',
          linkedRoomId: 'Oda 204',
          effect: 'Teyit prosedürü yasal ve itibari güvence sağlar (+15).'
        },
        {
          id: 'kemskoy_day_9_op_2',
          order: 2,
          type: 'event',
          whoWhat: 'Liman Feneri Sarsıntısı',
          description: 'Liman fenerinin rüzgardan sarsıldığına dair barda dedikodular dönüyor. Bazı konuklar panik yapıyor.',
          correctAction: 'Otel müdürü Cemal Salda\'yı bilgilendir, Güvenlik Müdürü Nusret Demir ile sahil devriyesini organize et.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: 'Yerinde müdahale kriz derinleşmeden lobi sükunetini sağlar (+15).'
        },
        {
          id: 'kemskoy_day_9_op_3',
          order: 3,
          type: 'post-it',
          whoWhat: 'Çamaşırhane Teslimat Gecikmesi',
          description: 'Yoğun yağış nedeniyle dışarıdaki kuru temizleme servisinin otel nevresimlerini getiremeyeceği notu resepsiyona geliyor.',
          correctAction: 'Kat Hizmetleri şefi Begüm Çalışkan\'ı ara, yedek nevresim dolaplarını açtırıp lobi yedeklerini kullandır.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: '+10 Puan, misafir odalarında nevresim krizi önlenir.'
        },
        {
          id: 'kemskoy_day_9_op_4',
          order: 4,
          type: 'check-out',
          whoWhat: 'Yasemin Evren',
          description: 'Akademik araştırmasını bitirip adadan ayrılmak üzere 201 numaralı odasından çıkış yapıyor.',
          correctAction: 'Otel kütüphane anahtarını teslim al, oda faturasını kapat ve kendisini taksi ile limana gönder.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_yasemin',
          linkedRoomId: 'Oda 201',
          effect: '+10 Puan, akademik prestij artar.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_10',
    title: '10. Gün (Çarşamba)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Deniz sisinin adayı kapladığı ve feribotların iptal olduğu zor bir gün.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 10,
      date: 'Çarşamba · 15 Ekim 2003',
      weather: '☁️ Yoğun Sisli',
      occupancy: 30,
      memoFrom: 'Cemal Salda',
      memoText: 'Sisin görüş mesafesini düşürmesi nedeniyle feribot seferleri iptal. Adada mahsur kalan konuklara özel walk-in indirimi sunalım.',
      expectedCheckouts: 'Oda 204',
      morningNote: 'Adanın beyaz bir duman bulutunun içinde kaybolduğu sisli çarşamba...',
      operations: [
        {
          id: 'kemskoy_day_10_op_1',
          order: 1,
          type: 'walk-in',
          whoWhat: 'Barbaros Yılmaz',
          description: 'Ferry seferi iptal olunca adada mahsur kalıyor, yorgun ve acilen kalacak bir oda arıyor.',
          correctAction: 'Walk-in sis indirimi teklif et, Oda 215\'e kaydını tamamla, minibar ve sıcak içecek ikramı yap.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_barbaros',
          linkedRoomId: 'Oda 215',
          effect: 'Krizde gösterilen esneklik ve ikram sadık müşteri kazandırır (+15).'
        },
        {
          id: 'kemskoy_day_10_op_2',
          order: 2,
          type: 'event',
          whoWhat: 'Ferry İptali Nedeniyle Uzatma Talebi',
          description: 'Mevcut misafirlerden bazıları feribot iptali nedeniyle odalarında ekstra bir gece kalmak istediklerini belirtiyor.',
          correctAction: 'Sistemden oda müsaitliklerini kontrol et, uzatma taleplerini faturaya yansıtarak onay aç.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: 'Doğru doluluk yönetimi ciro başarısı getirir (+10).'
        },
        {
          id: 'kemskoy_day_10_op_3',
          order: 3,
          type: 'call',
          whoWhat: 'Liman Güvenlik Şefi',
          description: 'Arayıp, adaya bu akşam gizlice yanaşmaya çalışan kimliksiz balıkçı tekneleri olduğunu, otel güvenlik kapılarının sıkıca kilitlenmesini istiyor.',
          correctAction: 'Güvenlik Müdürü Nusret Demir\'e acilen telsizle bilgi ver ve arka lobi kapısını kilitlemesini söyle.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: '+15 Puan, otel dış güvenliği artırılır.'
        },
        {
          id: 'kemskoy_day_10_op_4',
          order: 4,
          type: 'post-it',
          whoWhat: 'Oda 215 Ekstra Battaniye Notu',
          description: 'Oda 215\'teki Barbaros Yılmaz\'ın adanın aşırı nemli ve sisli soğuğu nedeniyle ekstra battaniye istediği notu düşüyor.',
          correctAction: 'Kat Hizmetleri Müdürü Begüm Çalışkan\'ı bilgilendir, 5 dakika içinde odaya yün battaniye ulaştırılmasını sağla.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 215',
          effect: '+10 Puan, müşteri memnuniyeti artar.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_11',
    title: '11. Gün (Perşembe)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Soğuk adada ısıtma sistemleri arızaları.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 11,
      date: 'Perşembe · 16 Ekim 2003',
      weather: '❄️ Soğuk / Açık',
      occupancy: 25,
      memoFrom: 'Cemal Salda',
      text: 'Kalorifer sistemleri test ediliyor. Isınma en kritik önceliğimiz.',
      memoText: 'Isıtıcıların çalışır durumda olduğunu kontrol edin. Sıcak içecek lobi ikramlarımızı her zaman hazır tutalım.',
      expectedCheckouts: 'Oda 215',
      morningNote: 'Güneşin göründüğü ancak adadaki dondurucu ayazın sürdüğü soğuk bir gün...',
      operations: [
        {
          id: 'kemskoy_day_11_op_1',
          order: 1,
          type: 'call',
          whoWhat: 'Oda 215 Isıtıcı Arızası',
          description: 'Barbaros Yılmaz odanın çok soğuk olduğunu ve ısıtıcının çalışmadığını resepsiyona bildiriyor.',
          correctAction: 'Kat Hizmetleri teknik ekibini (Altan Aktaş) odaya yönlendir, misafire lobi barda sıcak kahve ikram et.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedCharacterId: 'kemskoy_guest_barbaros',
          linkedRoomId: 'Oda 215',
          effect: 'Hızlı şikayet çözümü memnuniyeti korur (+10).'
        },
        {
          id: 'kemskoy_day_11_op_2',
          order: 2,
          type: 'check-out',
          whoWhat: 'Emir Çeliker',
          description: 'Yazar Emir Çeliker, romanının taslağını tamamlayıp otelden ayrılmak üzere geliyor.',
          correctAction: 'Oda 204 ekstresini çıkart, yazar indirimini kontrol et ve ödemeyi alarak uğurla.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_emir',
          linkedRoomId: 'Oda 204',
          effect: 'Yazarın mutlu ayrılması sonraki sezonlarda tekrar geleceğinin garantisidir (+15).'
        },
        {
          id: 'kemskoy_day_11_op_3',
          order: 3,
          type: 'walk-in',
          whoWhat: 'Ceren Ünlü',
          description: 'Adadaki sarnıçlar üzerine belgesel çeken genç yönetmen, 2 gece konaklamak için lobiye geliyor.',
          correctAction: 'Kimlik bilgilerini al, sarnıç araştırması için basın kartını kontrol et, standart Oda 102\'ye kaydet.',
          linkedMechanicId: 'kemskoy_mech_id_check',
          linkedCharacterId: 'kemskoy_guest_ceren',
          linkedRoomId: 'Oda 102',
          effect: '+15 Puan, sarnıç hikaye lore\'una katkı sağlanır.'
        },
        {
          id: 'kemskoy_day_11_op_4',
          order: 4,
          type: 'event',
          whoWhat: 'Lobi Şöminesi Kıvılcım Tehlikesi',
          description: 'Lobi şöminesinde yakılan büyük çam kütüklerinden biri halıya fırlıyor ve hafif duman çıkıyor.',
          correctAction: 'Şömine kapağını kapat, lobideki yangın tüpünü hazırda tut ve dumanı tahliye etmek için pencereleri arala.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: '+15 Puan, olası bir yangın tehlikesi büyümeden önlenir.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_12',
    title: '12. Gün (Cuma)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Yeni fırtına ve eskort ziyaretlerinin doğrulanması.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 12,
      date: 'Cuma · 17 Ekim 2003',
      weather: '💨 Fırtınalı (Lodos)',
      occupancy: 45,
      memoFrom: 'Cemal Salda',
      memoText: 'Fırtına geri döndü. Girişte bekleyen eskortların giriş prosedürlerine ve kimlik asıllarını resepsiyonda tutmaya devam edelim.',
      expectedCheckouts: 'Oda 204',
      morningNote: 'Lodos rüzgarının otel surlarını dövdüğü dalgalı bir cuma sabahı...',
      operations: [
        {
          id: 'kemskoy_day_12_op_1',
          order: 1,
          type: 'escort',
          whoWhat: 'Jasmin El-Trabelsi',
          description: 'Oda 215\'te konaklayan Barbaros Yılmaz\'ı ziyaret etmek için lobiye gelen eskort.',
          correctAction: 'Oda 215 Barbaros Yılmaz ile teyit kur, güvenliği bilgilendir, kimlik kaydıyla içeri al.',
          linkedMechanicId: 'kemskoy_mech_escort_verify',
          linkedCharacterId: 'kemskoy_guest_jasmin',
          linkedRoomId: 'Oda 215',
          effect: 'Doğru ziyaretçi kabulü otelde güvenlik zafiyetini önler (+15).'
        },
        {
          id: 'kemskoy_day_12_op_2',
          order: 2,
          type: 'walk-in',
          whoWhat: 'Seda Kor',
          description: 'Fırtınada limanda mahsur kalan walk-in misafir, sığınacak güvenli bir oda arıyor.',
          correctAction: 'Müsait olan Oda 201\'e kaydı tamamla, ödemeyi peşin al ve sıcak lobi içeceği ikram et.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_seda',
          linkedRoomId: 'Oda 201',
          effect: 'Doğru walk-in satışı ciro puanını ve sadakati artırır (+15).'
        },
        {
          id: 'kemskoy_day_12_op_3',
          order: 3,
          type: 'call',
          whoWhat: 'Ceren Ünlü (Oda 102)',
          description: 'Odadan arayarak, sarnıç araştırmaları için eski adliye haritasının arşivde nerede bulunabileceğini soruyor.',
          correctAction: 'Müdür Cemal Bey\'den arşiv anahtarını talep et ve kendisini lobi kütüphanesine davet et.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 102',
          effect: '+10 Puan, araştırmacı memnuniyeti artar.'
        },
        {
          id: 'kemskoy_day_12_op_4',
          order: 4,
          type: 'check-out',
          whoWhat: 'Seda Kor',
          description: 'Liman vapur seferleri öğleden sonra açılınca 201 numaralı odasından alelacele çıkış yapmak istiyor.',
          correctAction: 'Hızlıca oda anahtarını al, minibar faturasını kapat ve son feribota yetişmesi için limana uğurla.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_seda',
          linkedRoomId: 'Oda 201',
          effect: '+10 Puan, ekspres check-out başarıyla tamamlanır.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_13',
    title: '13. Gün (Cumartesi)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Aşırı yağış, çatı sızıntısı ve hafta sonu olayları.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 13,
      date: 'Cumartesi · 18 Ekim 2003',
      weather: '🌧️ Gök Gürültülü Sağanak',
      occupancy: 50,
      memoFrom: 'Cemal Salda',
      memoText: 'Isıtıcıları ve çatı durumlarını kontrol edelim. Avlu kapılarını rüzgara karşı sıkıca kilitleyin.',
      expectedCheckouts: 'Oda 201',
      morningNote: 'Adada gök gürültülerinin yankılandığı karanlık ve fırtınalı bir cumartesi...',
      operations: [
        {
          id: 'kemskoy_day_13_op_1',
          order: 1,
          type: 'walk-in',
          whoWhat: 'Tanju Kayaca',
          description: 'Adadaki fırtınaya yakalanmış doğa sporcusu, Walk-In oda kaydı talep ediyor.',
          correctAction: 'Oda 102\'ye kaydını al, ıslak kıyafetlerinin kurutulması için Kat Hizmetlerini yönlendir.',
          linkedMechanicId: 'kemskoy_mech_walk_in',
          linkedCharacterId: 'kemskoy_guest_tanju',
          linkedRoomId: 'Oda 102',
          effect: 'Doğru hizmet entegrasyonu sporcu konuk memnuniyetini maksimuma ulaştırır (+15).'
        },
        {
          id: 'kemskoy_day_13_op_2',
          order: 2,
          type: 'event',
          whoWhat: 'Çatı Su Sızıntısı Şikayeti',
          description: '4. Kat Deluxe odalarda çatıdan su sızdığına dair Kat Hizmetlerinden bilgi geliyor.',
          correctAction: 'Mühendislik/Kat Hizmetleri Müdürü Altan Aktaş\'ı acil tamir için bilgilendir, odadaki konukları 3. Kat suite odalara taşı.',
          linkedMechanicId: 'kemskoy_mech_random_event',
          effect: 'Hızlı oda transferi lüks VIP memnuniyetini korur (+20).'
        },
        {
          id: 'kemskoy_day_13_op_3',
          order: 3,
          type: 'call',
          whoWhat: 'The Imperial Bar',
          description: 'Müzik sistemlerindeki aşırı akım nedeniyle barda kısa devre oluştuğu, karanlıkta kalan müşterilerin resepsiyondan yardım istediği bildiriliyor.',
          correctAction: 'Teknisyen ekibi yönlendir ve barda gaz lambaları dağıtması için bar şefini uyar.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          effect: '+15 Puan, kriz yönetilir.'
        },
        {
          id: 'kemskoy_day_13_op_4',
          order: 4,
          type: 'post-it',
          whoWhat: 'Oda 102 Ekstra Çay / Kahve Talebi',
          description: 'Doğa sporcusu Tanju Kayaca\'nın odasında çok üşüdüğünü ve sıcak zencefil çayı istediğini içeren acil not.',
          correctAction: 'Restaurant mutfağına (Peron) telsizle bilgi ver ve odaya hızlı servis yapılmasını sağla.',
          linkedMechanicId: 'kemskoy_mech_dept_routing',
          linkedRoomId: 'Oda 102',
          effect: '+10 Puan, konuk sadakati pekiştirilir.'
        }
      ]
    }
  },
  {
    id: 'kemskoy_day_14',
    title: '14. Gün (Pazar)',
    area: 'kitap',
    type: 'kitap_bolum',
    status: 'taslak',
    priority: 'orta',
    tags: ['oyun-tasarimi', 'oyun-gunu', 'kemskoy', 'öneri'],
    links: ['kemskoy_game_project'],
    notes: 'Sezon kapanışı, son misafirlerin çıkışları.',
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      bookId: 'kemskoy_game_project',
      bolum: 'Bölüm II: Ölü Sezon',
      chapterIndex: 14,
      date: 'Pazar · 19 Ekim 2003',
      weather: '🌤️ Sakin / Bulutlu',
      occupancy: 20,
      memoFrom: 'Cemal Salda',
      memoText: 'Bugün otelimizin kapılarını kış dönemi için kapatıyoruz. Tüm konukların çıkış işlemlerini ve fatura kontrollerini hatasız tamamlayalım.',
      expectedCheckouts: 'Oda 215, Oda 102',
      morningNote: 'Fırtınaların dindiği, rüzgarsız ve hüzünlü bir sezon kapanışı pazarı...',
      operations: [
        {
          id: 'kemskoy_day_14_op_1',
          order: 1,
          type: 'check-out',
          whoWhat: 'Barbaros Yılmaz',
          description: 'Adadaki mahsur kalma macerasının ardından otelden ayrılmak üzere lobiye geliyor.',
          correctAction: 'Oda 215 faturasını kapat, minibar ekstralarını yansıt, ödemeyi alarak uğurla.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_barbaros',
          linkedRoomId: 'Oda 215',
          effect: 'Sezon son check-out işlemi tamamlandığında genel skor leaderboard tablosuna kaydedilir (+20).'
        },
        {
          id: 'kemskoy_day_14_op_2',
          order: 2,
          type: 'check-out',
          whoWhat: 'Tanju Kayaca',
          description: 'Doğa sporcusu Tanju Bey otelden ayrılıyor, faturasını kapatıp kurumsal fatura talep ediyor.',
          correctAction: 'Oda 102 hesabını kapat, faturayı şirket adına düzenle, bir sonraki sezonda indirimli kalması için kartvizitini al.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_tanju',
          linkedRoomId: 'Oda 102',
          effect: '+15 Puan, kurumsal misafir veri tabanına eklenir.'
        },
        {
          id: 'kemskoy_day_14_op_3',
          order: 3,
          type: 'check-out',
          whoWhat: 'Ceren Ünlü',
          description: 'Sarnıç belgeseli araştırmacısı Ceren Hanım çıkış yapıyor. Belgelerin kopyasını arşivde saklamak üzere teslim ediyor.',
          correctAction: 'Anahtarları al, faturayı tahsil et, sarnıç raporunu Müdür Cemal Bey\'e teslim et.',
          linkedMechanicId: 'kemskoy_mech_check_out',
          linkedCharacterId: 'kemskoy_guest_ceren',
          linkedRoomId: 'Oda 102',
          effect: '+15 Puan, sarnıç araştırması otel arşiviyle birleştirilir.'
        },
        {
          id: 'kemskoy_day_14_op_4',
          order: 4,
          type: 'event',
          whoWhat: 'Sezon Sonu Envanter Kapanışı',
          description: 'Resepsiyon kasası nakitleri, oda anahtarları ve evrak dolaplarının kış kilitlemesi gerekiyor.',
          correctAction: 'Cemal Salda\'ya tüm evrakları, pasaport kayıt beyanlarını teslim et, kasayı sıfırlayarak kapat.',
          linkedMechanicId: 'kemskoy_mech_difficulty',
          effect: 'Kusursuz envanter kapanışı oyunu başarıyla tamamlar (+30).'
        }
      ]
    }
  }
];

