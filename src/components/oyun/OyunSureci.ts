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
