import type { Item } from '../types';

/**
 * "Açılış zinciri" — örnek kurgu, kanon değil.
 *
 * Kemal 16 Eylül'de şunu söyledi: hikâye kısmını sıfırdan yeniden yazacak,
 * ama elindekiler Yazı İşleri'nde ÖRNEK olarak dursun. Bu dosya o örneği
 * taşıyor.
 *
 * Bilerek `isProposal: true` ve başlıkta "örnek" ibaresi var: bunlar
 * yazılacak metnin yerine geçmesin, yazarken bakılacak bir iskelet olsun.
 * Zincirin fikri şu: bir nesne (şampuan, drahmi, valiz) elden ele geçiyor,
 * her bölüm başka birinin gözünden ve kendi içinde tamamlanıyor.
 *
 * Kaynak: Drive · kemskoy-acilis-dongusu.md → Excel 11 Hikâye.
 */

export const ORNEK_PROJE_ID = 'kitap_proje_ornek_zincir';

export interface OrnekBolum {
  sira: number;
  baslik: string;
  anlatici: string;
  mekan: string;
  olay: string;
  cikis: string;
}

export const ORNEK_BOLUMLER: OrnekBolum[] = [
  {
    sira: 1,
    baslik: 'Resepsiyon · Deniz',
    anlatici: 'Deniz (resepsiyonist)',
    mekan: 'Lobi / resepsiyon',
    olay: "Barbaros Yılmaz walk-in olarak gelir, 204'ü sorar, 206 verilir",
    cikis: 'Belboya göz eder, valizi devreder'
  },
  {
    sira: 2,
    baslik: 'Sırada · Eleni',
    anlatici: 'Eleni (soyadı olmayan yabancı misafir)',
    mekan: 'Resepsiyon sırası',
    olay: "Pasaportla bir gece (belki iki) konaklama ister; 'bir isim için' gelmiştir",
    cikis: 'Belboyu ve valizi gözle takip eder'
  },
  {
    sira: 3,
    baslik: 'Belboy · Tarık',
    anlatici: 'Tarık (belboy)',
    mekan: 'Asansör, 2. kat koridoru, 206',
    olay: "Ağır valizi 206'ya taşır; Barbaros merdivenlerden çıkıp ondan önce "
      + "odada olur; 204'ün kapısı aralık ve karanlıktır",
    cikis: 'Koridorda bir kadına çarpar'
  },
  {
    sira: 4,
    baslik: 'Kat koridoru · misafir ziyaretinden dönen',
    anlatici: 'Misafir ziyaretinden dönen kadın (ad verilmemiş)',
    mekan: 'Kat koridoru',
    olay: "Ziyaret bitmiştir, son vapur iptal; Merkez'e taksi ve sabaha kadar "
      + 'çatı arar',
    cikis: 'Housekeeping arabasına çarpar, şampuan şişeleri dağılır; aynı '
      + 'şampuana iki el birden değer'
  },
  {
    sira: 5,
    baslik: 'Housekeeping · Melek',
    anlatici: 'Melek (housekeeping)',
    mekan: '204 numaralı oda ve koridor',
    olay: "204'ü temizler; yatak yatılmamış gibi, yastıkta çukur; çöpte yırtık "
      + 'vapur bileti, komodin altında bir drahmi bulur ve önlüğüne koyar',
    cikis: 'Arabasından iki şampuan eksilir (Barbaros alır)'
  },
  {
    sira: 6,
    baslik: "204'ün önünden · Barbaros",
    anlatici: 'Barbaros Yılmaz',
    mekan: '204 önü ve 206',
    olay: "İki şampuanı cebe atar, 206'da valizi açmaz, komodine iki şişeyi "
      + 'yan yana koyar, ışığı söndürmez',
    cikis: 'Döngü Barbaros\'a döner'
  }
];

/** Elden ele geçen nesneler — zinciri taşıyan şeyler */
export const KIYMIKLAR: Array<{ ad: string; detay: string }> = [
  {
    ad: 'Drahmi',
    detay: 'İki yıldır geçmeyen, artık hiçbir şey alamayan para; 204\'te '
      + 'komodin altında bulunur'
  },
  {
    ad: 'Yırtık vapur bileti',
    detay: "204'ün çöpünde, tarihi okunmuyor"
  },
  {
    ad: 'Ağır valiz',
    detay: 'Bir yanı çökük, içindeki şey bir köşede toplanmış gibi; Barbaros açmaz'
  },
  {
    ad: 'Sahte imza',
    detay: 'Kayıt formundaki imza kimlikteki imzaya benzemiyor'
  },
  {
    ad: 'İki küçük şampuan',
    detay: "Housekeeping arabasından alınır, 206'nın komodinine yan yana "
      + "konur — 'iki kişilik'"
  },
  { ad: 'Pirinç avize', detay: 'Lobide, gece yanan' },
  { ad: 'İptal vapur', detay: 'Son vapur iptal' }
];

/** Her bölümde bir yerde görünen sabitler */
export const MOTIFLER = [
  'Poyraz',
  'Pirinç avize',
  'Denize bakan ama denizi göstermeyen pencere'
];

/** Zincirin çalışma kuralları */
export const YAZIM_KURALLARI = [
  'Her el değiştirme fiziksel bir temasla olur (çarpma, valiz uzatma, omuz '
    + 'değme, el buluşması)',
  'Her bölüm kendi içinde tam bir hayat; karakter olay örgüsünün hizmetinde '
    + 'değil, kendi derdinde',
  'Arka hikâye hep çok uzakta; asla ön plana çıkmaz, açıklanmaz, sadece '
    + 'kenardan bir kıvılcım verir',
  'Ton makul: sıradan bir sonbahar gecesi insan hayatı, tür kurgusu / noir değil',
  'Zincir ileri doğru akar (döngü değil), birkaç saatlik bir zaman diliminde'
];

type YeniMadde = Omit<Item, 'createdAt' | 'updatedAt' | 'userId'> & { id: string };

/** Proje kaydı — kurallar ve kıymıklar notlarında duruyor */
export function ornekProje(): YeniMadde {
  const govde = [
    'ÖRNEK KURGU — yeniden yazılacak. Elde ne varsa burada duruyor ki '
      + 'sıfırdan yazarken bakılacak bir iskelet olsun.',
    '',
    'YAZIM KURALLARI',
    ...YAZIM_KURALLARI.map((k, i) => `${i + 1}. ${k}`),
    '',
    'SABİT MOTİFLER',
    ...MOTIFLER.map(m => `· ${m}`),
    '',
    'KIYMIKLAR (elden ele geçen nesneler)',
    ...KIYMIKLAR.map(k => `· ${k.ad} — ${k.detay}`)
  ].join('\n');

  return {
    id: ORNEK_PROJE_ID,
    title: 'Açılış zinciri — örnek kurgu',
    area: 'kitap',
    type: 'kitap_proje',
    status: 'taslak',
    priority: 'düşük',
    tags: ['örnek', 'zincir', 'yeniden-yazılacak'],
    links: [],
    notes: govde,
    images: [],
    archived: false,
    // Öneri: kanon değil, bakılacak örnek
    isProposal: true,
    metadata: {
      kaynak: 'Drive · kemskoy-acilis-dongusu.md',
      ornek: true
    }
  };
}

/** Altı bölüm — her biri künye hâlinde, metinsiz */
export function ornekBolumler(): YeniMadde[] {
  return ORNEK_BOLUMLER.map(b => ({
    id: `kitap_bolum_ornek_${b.sira}`,
    title: `${b.sira}. ${b.baslik}`,
    area: 'kitap' as const,
    type: 'kitap_bolum' as const,
    status: 'taslak',
    priority: 'düşük' as const,
    tags: ['örnek', 'zincir'],
    links: [ORNEK_PROJE_ID],
    notes: [
      `Anlatıcı: ${b.anlatici}`,
      `Mekân: ${b.mekan}`,
      `Olay: ${b.olay}`,
      `Çıkış: ${b.cikis}`
    ].join('\n'),
    images: [],
    archived: false,
    isProposal: true,
    metadata: {
      projectId: ORNEK_PROJE_ID,
      order: b.sira,
      anlatici: b.anlatici,
      mekan: b.mekan,
      ornek: true
    }
  }));
}
