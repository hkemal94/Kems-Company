import type { Item } from '../types';

/**
 * Yol haritası (yapisal-4, 39): karar verilmiş ama uygulamada henüz olmayan
 * işler. Belge ile uygulama ayrı (CLAUDE.md, 30 Eylül): burada yalnız
 * "henüz yok" olanlar durur; iş bitince bu listeden silinir.
 * Sıra, kararlaştırılan sıradır; "Sıradaki 3 iş" baştaki açık üçüdür.
 *
 * `kimde`: 'claude' → kodla yapılacak; 'kemal' → Kemal'in kararı ya da işi.
 */
export interface YolIsi { id: string; ad: string; nereden: string; kimde: 'claude' | 'kemal'; not?: string }

export const YOL_HARITASI: YolIsi[] = [
  { id: 'k5-menu', ad: 'Menü: Durum + Neyin Eksik tek sayfa, "Yapay zekâ" adı, 3B stüdyo iki ekranda aynı grupta, fikir ampulü "+"ya', nereden: '1 Ekim, K-5', kimde: 'claude', not: '2. PR.' },
  { id: 'tek-takvim', ad: 'Tek ve birleşik takvim (Sosyal medyanın ayrı takvimi kalkar)', nereden: '1 Ekim, K-5', kimde: 'claude', not: '2. PR.' },
  { id: 'k6-okunaklilik', ad: 'Telefonda en küçük yazı 12 px, düğmeler büyür', nereden: '1 Ekim, K-6', kimde: 'claude', not: '2. PR. Kiremit düğme rengi olduğu gibi.' },
  { id: 'oyun-fikir-surec', ad: 'Oyun: fikir ve süreç ekranı (adım adım anlattıran akış, fikirler ve yapılanlar künye gibi)', nereden: '1 Ekim', kimde: 'claude', not: '2. PR.' },
  { id: 'kurum-tiki', ad: 'Vikideki kurumlar Markalar\'a: madde düzenleyicide "kurum" kutusu', nereden: '1 Ekim', kimde: 'claude', not: '2. PR. Kemal tikle seçer.' },
  { id: 'ortak-alan-tasima', ad: 'Ortak alanda kalmış kayıt varsa Google alanına taşıma', nereden: 'yapisal-2, 26', kimde: 'kemal', not: 'Ortak alan kalktı; eski kayıt varsa Kemal söyleyince tek seferlik kart.' },
  { id: 'kalip-3b', ad: '3B stüdyo: gerçekçi kalıplar (tişört, sweatshirt, şapka, bez çanta, kupa, poster)', nereden: 'yapisal-5', kimde: 'kemal', not: 'Şimdilik duruyor; model ya da mockup kararı senin.' },
  { id: 'tasarim-3b', ad: '3B stüdyo: parça renk, baskı yerleri, baskı / nakış görünümü, desen, deneme atölyesi', nereden: 'yapisal-5', kimde: 'claude' },
  { id: 'atolyeler', ad: '"Atölyeler" bölümü (3B stüdyo, Kurucu vb. tek yerde)', nereden: 'yapisal-5', kimde: 'kemal', not: 'Henüz karar yok.' },
  { id: 'yardimci', ad: 'Yardımcı erişimi: düzenler ama silemez', nereden: 'yapisal-2, 26', kimde: 'claude', not: 'İhtiyaç olunca.' },
  { id: 'buffer', ad: 'Sosyal medyada Buffer bağlantısı (2. adım)', nereden: '29 Eylül', kimde: 'kemal', not: 'Bütçe kararı.' },
  { id: 'site-ingilizce', ad: 'Sitenin İngilizcesi', nereden: 'yapisal-4, 19', kimde: 'claude', not: 'Yayından sonra.' },
  { id: 'site-adres', ad: 'Kendi adrese taşıma (kems.company)', nereden: 'yapisal-2, 1', kimde: 'kemal' },
  { id: 'magaza', ad: 'Mağaza altyapısı (Dükkân soluk)', nereden: 'yapisal-2, 5', kimde: 'kemal' },
  { id: 'ikinci-drop', ad: 'İkinci drop', nereden: 'yapisal-2, 9', kimde: 'kemal' },
  { id: 'sokak-adlari', ad: 'Sokak adları (şimdilik numara)', nereden: 'yapisal-2, 21', kimde: 'kemal' },
  { id: 'kitap', ad: 'Kitap', nereden: 'yapisal-2, 29', kimde: 'kemal' },
  { id: 'tek-k', ad: 'Tek "K" işareti (Canva)', nereden: 'yapisal-2, 13', kimde: 'kemal', not: 'Birlikte bakılacak.' },
  { id: 'ibareler', ad: 'İngilizce / Türkçe ibareler', nereden: 'yapisal-2, 14', kimde: 'kemal', not: 'Birlikte çalışılacak.' }
];

/** Kemal'in "yapıldı" dediği işler (KKM ayarında) düşer */
export const acikIsler = (bitenler: string[]) => YOL_HARITASI.filter(i => !bitenler.includes(i.id));

// ---------------------------------------------------------------- KKM ayarı

export const KKM_AYAR_TURU = 'kkm_ayar' as const;

export interface KkmAyari {
  /** Durum hedefleri, yüzde (künye, kitap, harita, bosluk) */
  hedefler: Record<string, number>;
  /** Yol haritasında Kemal'in "tamam" dediği işler */
  bitenler: string[];
}

export const kkmKaydi = (items: Item[]) => items.find(i => i.type === KKM_AYAR_TURU) || null;
export const kkmAyari = (items: Item[]): KkmAyari => {
  const m = (kkmKaydi(items)?.metadata || {}) as Partial<KkmAyari>;
  return { hedefler: { ...(m.hedefler || {}) }, bitenler: Array.isArray(m.bitenler) ? m.bitenler : [] };
};

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
export function kkmAyariniYaz(items: Item[], a: KkmAyari): { guncel?: Item; yeni?: YeniKayit } {
  const k = kkmKaydi(items);
  const metadata = { hedefler: a.hedefler, bitenler: a.bitenler };
  if (k) return { guncel: { ...k, metadata: { ...(k.metadata || {}), ...metadata }, updatedAt: Date.now() } };
  return {
    yeni: {
      title: 'KKM ayarları', area: 'komuta', type: KKM_AYAR_TURU, status: 'Planlandı', priority: 'düşük',
      tags: ['kkm'], links: [], notes: '', images: [], isProposal: false, archived: false, metadata
    }
  };
}

// ---------------------------------------------------------------- haftalık özet

/**
 * Haftalık özet (yapisal-2, 28). Kemal'in kendi Gmail'inden: uygulama metni
 * hazırlar, "Gmail'de aç" Kemal'in hesabında yeni ileti açar; gönderen Kemal.
 * Uydurma sayı yok: sayılar kayıtların son 7 gündeki değişiminden.
 */
export function haftalikOzet(items: Item[], simdi = Date.now()): { konu: string; metin: string } {
  const hafta = simdi - 7 * 86_400_000;
  const canli = items.filter(i => !i.archived && !i.isProposal);
  const degisen = canli.filter(i => i.updatedAt >= hafta);
  const yeni = canli.filter(i => i.createdAt >= hafta);
  const say = (t: string[]) => degisen.filter(i => t.includes(i.type));
  const VIKI = ['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'aile', 'olay', 'ürün'];
  const satir = (ad: string, l: Item[]) => (l.length ? `• ${ad}: ${l.length} (${l.slice(0, 5).map(i => i.title).join(', ')}${l.length > 5 ? '…' : ''})` : '');
  const bekleyen = canli.filter(i => i.type === 'aday').length;
  const tarih = new Date(simdi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const metin = [
    `Kems Komuta Merkezi · haftalık özet (${tarih})`,
    '',
    'Son 7 günde değişenler:',
    satir('Viki maddesi', say(VIKI)),
    satir('Merch (drop, ürün)', say(['drop', 'merch_urun'])),
    satir('Yazı', say(['blog_post', 'kitap_bolum'])),
    satir('Sosyal medya gönderisi', say(['sosyal_gonderi'])),
    `• Yeni kayıt: ${yeni.filter(i => i.type !== 'aday').length}`,
    `• Öneri tepsisinde bekleyen: ${bekleyen}`,
    '',
    'Açık işler (yol haritası, ilk üç):',
    ...acikIsler(kkmAyari(items).bitenler).slice(0, 3).map(i => `• ${i.ad}`)
  ].filter(s => s !== '').join('\n');
  return { konu: `KKM haftalık özet · ${tarih}`, metin };
}

/** Kemal'in Gmail'inde yeni ileti (kendine) */
export const gmailBaglantisi = (eposta: string, konu: string, metin: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(eposta)}&su=${encodeURIComponent(konu)}&body=${encodeURIComponent(metin)}`;
