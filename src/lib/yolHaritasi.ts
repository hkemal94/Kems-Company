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
  { id: 'teknik-foy', ad: 'Ürünlere teknik föy (tech pack) ve beden çeşitleri; sunum için mockup', nereden: '1 Ekim', kimde: 'claude', not: '3B stüdyo ilk etabından sonra.' },
  { id: 'atolyeler', ad: '"Atölyeler" bölümü (3B stüdyo, Kurucu vb. tek yerde)', nereden: 'yapisal-5', kimde: 'kemal', not: 'Sonra karar (1 Ekim).' },
  { id: 'yardimci', ad: 'Yardımcı erişimi: düzenler ama silemez', nereden: 'yapisal-2, 26', kimde: 'claude', not: 'İhtiyaç olunca.' },
  { id: 'buffer', ad: 'Sosyal medyada Buffer bağlantısı (ücretli plan)', nereden: '1 Ekim', kimde: 'kemal', not: 'Kemal planı alınca bağlantı kurulur.' },
  { id: 'site-ingilizce', ad: 'Sitenin İngilizcesi', nereden: 'yapisal-4, 19', kimde: 'claude', not: 'Yayından sonra.' },
  { id: 'site-adres', ad: 'Kendi adrese taşıma (kems.company)', nereden: 'yapisal-2, 1', kimde: 'kemal', not: 'Şimdilik Google\'da (1 Ekim).' },
  { id: 'magaza', ad: 'Mağaza: Shopify (sitedeki Dükkân bağlanır)', nereden: '1 Ekim', kimde: 'claude', not: 'Karar verildi; sırası gelince.' },
  { id: 'ikinci-drop', ad: 'İkinci drop', nereden: 'yapisal-2, 9', kimde: 'kemal', not: 'Henüz erken (1 Ekim).' },
  { id: 'sokak-adlari', ad: 'Sokak adları (şimdilik numara)', nereden: 'yapisal-2, 21', kimde: 'kemal' },
  { id: 'kitap', ad: 'Kitap', nereden: 'yapisal-2, 29', kimde: 'kemal', not: 'Bekliyor (1 Ekim).' },
  { id: 'metin-soru-turu', ad: 'Mahalle Tarihçeleri, Merkez Çarşı, Liman Deniz Feneri, Stadyum Dirlik Stadı: soru turu, cevaplardan stüdyo taslağı', nereden: '1 Ekim', kimde: 'claude', not: 'Taslak öneri tepsisine; Kemal düzeltip ekler.' },
  { id: 'dirlik-forma', ad: 'Dirlik forması: Merch\'te Dirlik kurumu altında Konsept ürün, tasarım 3B stüdyoda', nereden: '1 Ekim', kimde: 'kemal' },
  { id: 'ciftlik-yeri', ad: 'Küçükçetmi Çiftliği\'ni Kurucuda yerleştirmek (yol temizliğinden sonra)', nereden: '1 Ekim', kimde: 'kemal' },
  { id: 'ibareler', ad: 'İngilizce / Türkçe ibareler', nereden: 'yapisal-2, 14', kimde: 'kemal', not: 'Sonra (1 Ekim).' },
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
