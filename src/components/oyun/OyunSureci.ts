import type { Item } from '../../types';

/**
 * Oyun stüdyosu süreci (34 cevabın 25. maddesi).
 *
 * Kemal: "İyi bir süreç şeması yaz ve o sektörde kalsın."
 *
 * Aşağıdaki zincir oyun sektörünün kendi zinciri; uydurulmadı, sadeleştirildi:
 * konsept → tasarım belgesi → dikey dilim → üretim → alfa → beta → yayın.
 * Her aşamanın "çıkışı" var: o çıkış üretilmeden sonraki aşamaya geçilmez.
 * Şema bu yüzden isim listesi değil, kapı listesi.
 */

export interface Asama {
  id: string;
  ad: string;
  /** Sektördeki karşılığı — terimi kaybetmeyelim */
  terim: string;
  /** Bu aşama neyi üretir; üretilmeden ilerlenmez */
  cikti: string;
}

export const ASAMALAR: Asama[] = [
  {
    id: 'konsept', ad: 'Konsept', terim: 'concept',
    cikti: 'Tek sayfalık oyun fikri: kim oynuyor, ne yapıyor, neden devam ediyor'
  },
  {
    id: 'gdd', ad: 'Tasarım belgesi', terim: 'GDD',
    cikti: 'Oynanış, mekanikler, kapsam yazılı — ekip aynı oyunu anlıyor'
  },
  {
    id: 'dikey', ad: 'Dikey dilim', terim: 'vertical slice',
    cikti: 'Oynanabilir tek bölüm, bitmiş kalitede — oyun eğlenceli mi, burada anlaşılır'
  },
  {
    id: 'uretim', ad: 'Üretim', terim: 'production',
    cikti: 'Bütün içerik üretiliyor; yeni mekanik eklenmiyor'
  },
  {
    id: 'alfa', ad: 'Alfa', terim: 'alpha',
    cikti: 'Özellikler tamam (feature complete), içerik eksik olabilir'
  },
  {
    id: 'beta', ad: 'Beta', terim: 'beta',
    cikti: 'İçerik de tamam; yalnız hata ayıklama ve denge kalıyor'
  },
  {
    id: 'yayin', ad: 'Yayın', terim: 'release',
    cikti: 'Oyun dışarıda'
  }
];

export const ASAMA_KIMLIKLERI = ASAMALAR.map(a => a.id);

export function asamaBul(id: unknown): Asama {
  return ASAMALAR.find(a => a.id === id) || ASAMALAR[0];
}

/**
 * Tasarım belgesinin bölümleri.
 *
 * Yalnız başlıklar. İçlerine bir şey yazılmıyor — Kemal'in 17. cevabı:
 * "Sen aç bana bir düğme, yazma; sonrasında ben içlerindeki boşlukları
 * düzenlerim." Bunlar sektörün standart GDD başlıkları.
 */
export const GDD_BOLUMLERI: Array<{ id: string; ad: string; soru: string }> = [
  { id: 'kunye',     ad: 'Künye',                soru: 'Oyunun adı, türü, platformu, hedef oyuncusu' },
  { id: 'ozet',      ad: 'Tek cümlelik özet',    soru: 'Oyunu tek cümleyle nasıl anlatırsın?' },
  { id: 'dongu',     ad: 'Oynanış döngüsü',      soru: 'Oyuncu bir oturumda hangi adımları tekrar eder?' },
  { id: 'mekanik',   ad: 'Mekanikler',           soru: 'Oyuncu ne yapabilir? Kurallar neler?' },
  { id: 'kontrol',   ad: 'Kontroller',           soru: 'Oyun nasıl oynanıyor — fare, klavye, dokunma?' },
  { id: 'ilerleme',  ad: 'İlerleme ve ödül',     soru: 'Oyuncu neden devam eder? Ne kazanır?' },
  { id: 'dunya',     ad: 'Dünya ve kurgu',       soru: 'Oyun Düzada evreninin neresinde geçiyor?' },
  { id: 'karakter',  ad: 'Karakterler',          soru: 'Kim oynanıyor, kimlerle karşılaşılıyor?' },
  { id: 'arayuz',    ad: 'Arayüz',               soru: 'Ekranda ne görünüyor?' },
  { id: 'gorsel',    ad: 'Görsel dil',           soru: 'Oyun neye benziyor? Marka paletiyle ilişkisi ne?' },
  { id: 'ses',       ad: 'Ses',                  soru: 'Müzik ve ses oyunu nasıl taşıyor?' },
  { id: 'kapsam',    ad: 'Kapsam ve takvim',     soru: 'Ne kadar içerik, ne kadar sürede?' },
  { id: 'risk',      ad: 'Riskler',              soru: 'Bu projeyi ne batırır?' }
];

/** Süreçteki iş kartları */
export function oyunIsleri(items: Item[]): Item[] {
  return items.filter(i => i.type === 'oyun_is' && !i.archived && !i.isProposal);
}

/** Tasarım belgesi bölümleri — açılmış olanlar */
export function gddBolumleri(items: Item[]): Item[] {
  return items.filter(i => i.type === 'gdd_bolum' && !i.archived);
}

/**
 * Aşama başına iş sayısı. Şemanın altındaki rakamlar buradan geliyor;
 * sıfırsa sıfır yazıyor, doldurulmuş gibi gösterilmiyor.
 */
export function asamaSayilari(items: Item[]): Record<string, number> {
  const sayim: Record<string, number> = {};
  for (const a of ASAMALAR) sayim[a.id] = 0;
  for (const is of oyunIsleri(items)) {
    const a = String((is.metadata as any)?.asama || 'konsept');
    if (a in sayim) sayim[a]++;
  }
  return sayim;
}

/**
 * Projenin şu anki aşaması: iş kartı bulunan en geri aşama.
 *
 * Sebebi: bir stüdyo "beta"da değildir, en geride kalan işi neredeyse
 * oradadır. Tek bir kart konseptte duruyorsa proje konsepttedir.
 */
export function projeAsamasi(items: Item[]): Asama | null {
  const isler = oyunIsleri(items);
  if (!isler.length) return null;
  for (const a of ASAMALAR) {
    if (isler.some(i => String((i.metadata as any)?.asama || 'konsept') === a.id)) return a;
  }
  return null;
}

/**
 * Tıklamalı tasarım belgesi (Paket 5, 29 Eylül). Kemal: oyun kısmına
 * "tıklamalı bir GDD otomasyonu". Her bölümde tasarım kararları seçenekle
 * seçilir; seçim bölümün metnine "* Etiket: değer" satırı olarak yazılır,
 * altına serbest yazı eklenebilir. Seçenekler kurgu değil, tasarım
 * kararıdır; ad ve hikâye soran yerlerde seçenek yok, kutu var.
 */
export interface GddSecimi { id: string; etiket: string; secenekler: string[]; coklu?: boolean }

export const GDD_SECIMLERI: Record<string, GddSecimi[]> = {
  kunye: [
    { id: 'tur', etiket: 'Tür', secenekler: ['Yönetim / tycoon', 'Şehir kurma', 'Anlatı macerası', 'Bulmaca', 'Rol yapma (RPG)', 'Kart oyunu'], coklu: true },
    { id: 'platform', etiket: 'Platform', secenekler: ['PC', 'Mac', 'Mobil', 'Web tarayıcı', 'Konsol'], coklu: true },
    { id: 'oyuncu', etiket: 'Hedef oyuncu', secenekler: ['Sakin, rahat oynayan', 'Hikâye seven', 'Strateji seven', 'Aile / herkes'], coklu: true },
    { id: 'kip', etiket: 'Oyuncu sayısı', secenekler: ['Tek oyunculu', 'Çok oyunculu', 'İkisi de'] }
  ],
  dongu: [
    { id: 'oturum', etiket: 'Bir oturum', secenekler: ['5–10 dakika', '15–30 dakika', '30–60 dakika', '1 saatten uzun'] },
    { id: 'zaman', etiket: 'Zaman nasıl akar', secenekler: ['Gün gün ilerler', 'Sıra tabanlı', 'Gerçek zamanlı', 'Bölüm bölüm'] }
  ],
  mekanik: [
    { id: 'mekanik', etiket: 'Ana mekanikler', secenekler: ['Kaynak yönetimi', 'Diyalog seçimleri', 'Keşif', 'İnşa / yerleştirme', 'Envanter', 'Zaman yönetimi', 'Müşteri / misafir karşılama'], coklu: true }
  ],
  kontrol: [
    { id: 'kontrol', etiket: 'Kontrol', secenekler: ['Fare ve klavye', 'Yalnız fare', 'Dokunmatik', 'Oyun kolu'], coklu: true }
  ],
  ilerleme: [
    { id: 'odul', etiket: 'Oyuncu ne kazanır', secenekler: ['Hikâye bölümleri açılır', 'Yeni alanlar açılır', 'Para / itibar', 'Başarımlar', 'Koleksiyon'], coklu: true },
    { id: 'son', etiket: 'Oyunun sonu', secenekler: ['Tek son', 'Birden çok son', 'Sonu yok (açık uçlu)'] }
  ],
  dunya: [
    { id: 'yer', etiket: 'Düzada\'da nerede', secenekler: ['Bütün ada', 'Tek bir mahalle', 'Tek bir mekân', 'Ada ve çevresi'] },
    { id: 'donem', etiket: 'Zaman aralığı', secenekler: ['Tek bir sezon', 'Birkaç yıl', 'Onyıllara yayılır'] }
  ],
  karakter: [
    { id: 'oyuncuKim', etiket: 'Oyuncu kim', secenekler: ['Adı olan bir karakter', 'Adsız, oyuncunun kendisi', 'Birden çok karakter'] }
  ],
  arayuz: [
    { id: 'kamera', etiket: 'Kamera', secenekler: ['Üstten', 'İzometrik', '2D yandan', 'Birinci şahıs', 'Menü / kart tabanlı'] }
  ],
  gorsel: [
    { id: 'stil', etiket: 'Görsel stil', secenekler: ['Piksel sanat', 'El çizimi 2D', 'Düşük poligon 3D', 'Gerçekçi 3D', 'Kâğıt / kolaj'] },
    { id: 'palet', etiket: 'Palet', secenekler: ['Marka paleti (lacivert, kiremit, krem)', 'Kendi paleti'] }
  ],
  ses: [
    { id: 'muzik', etiket: 'Müzik', secenekler: ['Ege / yerel çalgılar', 'Lo-fi', 'Orkestral', 'Yalnız ortam sesi'] },
    { id: 'seslendirme', etiket: 'Seslendirme', secenekler: ['Yok', 'Kısmi', 'Tam'] }
  ],
  kapsam: [
    { id: 'sure', etiket: 'Oyun süresi', secenekler: ['1–3 saat', '5–10 saat', '20 saatten uzun', 'Sınırsız'] },
    { id: 'takvim', etiket: 'Takvim', secenekler: ['3 ay', '6 ay', '1 yıl', 'Belirsiz'] },
    { id: 'ekip', etiket: 'Ekip', secenekler: ['Tek kişi', '2–3 kişi', 'Stüdyo'] }
  ],
  risk: [
    { id: 'risk', etiket: 'Riskler', secenekler: ['Kapsam büyür', 'Zaman yetmez', 'Teknik zorluk', 'Finansman', 'Motivasyon düşer'], coklu: true }
  ]
};

const satirRe = (etiket: string) =>
  new RegExp(`^\\* ${etiket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.*)$`, 'm');

/** Bölüm metnindeki seçili değerler ("* Tür: A, B" → ['A','B']) */
export function secilenler(notlar: string, s: GddSecimi): string[] {
  const m = (notlar || '').match(satirRe(s.etiket));
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** Bir seçeneğe basılınca metnin yeni hâli */
export function secimiUygula(notlar: string, s: GddSecimi, secenek: string): string {
  const once = secilenler(notlar, s);
  const sonra = s.coklu
    ? (once.includes(secenek) ? once.filter(x => x !== secenek) : [...once, secenek])
    : (once[0] === secenek ? [] : [secenek]);
  const re = satirRe(s.etiket);
  const satir = `* ${s.etiket}: ${sonra.join(', ')}`;
  const metin = notlar || '';
  if (re.test(metin)) {
    return (sonra.length ? metin.replace(re, satir) : metin.replace(new RegExp(re.source + '\\n?', 'm'), '')).trim();
  }
  if (!sonra.length) return metin;
  // Seçim satırları metnin başında toplanır, serbest yazı altta kalır
  const satirlar = metin.split('\n');
  const son = satirlar.reduce((n, l, i) => (l.startsWith('* ') ? i + 1 : n), 0);
  satirlar.splice(son, 0, satir);
  return satirlar.join('\n').trim();
}

/** Serbest yazı kısmı (seçim satırları hariç) */
export const serbestYazi = (notlar: string) =>
  (notlar || '').split('\n').filter(l => !l.startsWith('* ')).join('\n').trim();
export const secimSatirlari = (notlar: string) =>
  (notlar || '').split('\n').filter(l => l.startsWith('* ')).join('\n');
