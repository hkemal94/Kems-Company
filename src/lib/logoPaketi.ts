import type { BrandKit, Item } from '../types';
import { kurumMu } from './markaYapisi';

/**
 * Logolar (M, 8 Ekim). Kemal Canva'daki "KKM Logo" tasarımını şeffaf PNG
 * olarak Drive'a koydu: "İlgili marka ve viki maddelerine eklersin."
 * Cevaplar `docs/soru-cevap/logolar.md`.
 *
 * Dosyalar depoda (public/galeri/logolar, 1280 px WebP): kayda yalnız
 * adresi yazılır, kayıt şişmez (veritabanında kayıt sınırı 1 MB, yazma
 * kotası dar). Durum → Eksikler → "Logolar" kartı, Kemal basınca:
 *   - kurumların (Dirlik, Küçükçetmi, The Imperial Kemsköy) birincil logosu
 *     yeni logo olur (Markalar'daki "Birincil yap" ile sonra değişebilir);
 *   - Galeri'deki eski küçük kopyalar (1 Ekim, 447 px) büyükleriyle
 *     değişir; galeride olmayanlar eklenir, adı tutan maddeye bağlanır;
 *   - kooperatif (kurum) ve iki ürünü boş metinle açılır: künyede yalnız
 *     kanon ve Kemal'in cevapları.
 * İkinci basışta iş kalmaz. Kems Company'nin ana logosu ve Dondurmacı
 * Kızlar'ın külahlı logosu Kemal küçültüp yükleyince eklenecek.
 */

const ADRES = '/galeri/logolar/';

export const KOOPERATIF_ID = 'kurum_kemskoy_ziraat';
export const BIRLIK_ZEYTIN_ID = 'urun_birlik_zeytin';
export const BIRLIK_BIRASI_ID = 'urun_birlik_birasi';

type Hedef = { id: string } | { kurum: RegExp };

export interface Logo {
  anahtar: string;
  baslik: string;
  dosya: string;
  /** Bu logo kimin */
  hedef: Hedef;
  /** Kurumun birincil logosu olur */
  birincil?: boolean;
  /** Galeri'de yerini aldığı eski küçük kopyanın anahtarı (metadata.canvaKaynak) */
  eski?: string;
}

export const LOGOLAR: Logo[] = [
  { anahtar: 'logo:kems-bayrak', baslik: 'Kems Company — bayrak logo', dosya: 'kems-company-bayrak.webp', hedef: { id: 'kems_company' }, eski: 'canva:kems:11' },
  { anahtar: 'logo:kems-harf', baslik: 'Kems Company — harf logo (KC)', dosya: 'kems-company-harf.webp', hedef: { id: 'kems_company' }, eski: 'canva:kems:12' },
  { anahtar: 'logo:dirlik', baslik: 'Dirlik Spor Kulübü arması', dosya: 'dirlik-spor-kulubu.webp', hedef: { id: 'marka_dirlik' }, birincil: true, eski: 'canva:kems:9' },
  { anahtar: 'logo:kucukcetmi', baslik: 'Küçükçetmi Sürek Kulübü — logo', dosya: 'kucukcetmi-surek-kulubu.webp', hedef: { kurum: /küçükçetmi/i }, birincil: true, eski: 'canva:kucukcetmi:3' },
  { anahtar: 'logo:kucukcetmi-harf', baslik: 'Küçükçetmi Sürek Kulübü — harf logo (KÇ)', dosya: 'kucukcetmi-harf.webp', hedef: { kurum: /küçükçetmi/i }, eski: 'canva:kucukcetmi:2' },
  { anahtar: 'logo:kucukcetmi-maskot', baslik: 'Küçükçetmi Sürek Kulübü — maskot (Kangal)', dosya: 'kucukcetmi-maskot.webp', hedef: { kurum: /küçükçetmi/i }, eski: 'canva:kucukcetmi:1' },
  { anahtar: 'logo:imperial', baslik: 'The Imperial Kemsköy — logo', dosya: 'the-imperial-kemskoy.webp', hedef: { id: 'kemskoy_hotel' }, birincil: true },
  { anahtar: 'logo:dondurmaci-yazi', baslik: 'Dondurmacı Kızlar — yazı logo', dosya: 'dondurmaci-kizlar-yazi.webp', hedef: { id: 'viki_mekan_liman_kafe' } },
  { anahtar: 'logo:birlik-zeytin', baslik: 'Birlik Zeytin etiketi', dosya: 'birlik-zeytin.webp', hedef: { id: BIRLIK_ZEYTIN_ID }, eski: 'canva:kems:4' },
  { anahtar: 'logo:birlik-birasi', baslik: 'Birlik Birası etiketi', dosya: 'birlik-birasi.webp', hedef: { id: BIRLIK_BIRASI_ID }, eski: 'canva:kems:3' }
];

export const logoAdresi = (l: Logo) => ADRES + l.dosya;

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string };

const bos = (): Pick<Item, 'tags' | 'links' | 'notes' | 'images' | 'isProposal' | 'archived'> =>
  ({ tags: [], links: [], notes: '', images: [], isProposal: false, archived: false });

/** Açılacak maddeler: metin boş, künyede yalnız kanon ve Kemal'in cevapları */
const YENI_MADDELER: Array<YeniKayit & { id: string }> = [
  {
    ...bos(), id: KOOPERATIF_ID, title: 'Kemsköy Ziraat İşletmeleri Kurumu', area: 'duzada', type: 'kulüp',
    status: 'Fikir', priority: 'orta', tags: ['marka', 'kurum'],
    metadata: {
      markaTuru: 'kulüp markası', ustMarka: 'marka_kems', region: 'çiftlik', merkezi: 'Çiftlik Mahallesi',
      profile: {
        founded: '1950–1970 arası',
        field: 'Kooperatif; Çiftlik\'te zeytinyağı fabrikası. Birlik markası (1994–): Birlik Zeytin, Birlik Birası'
      }
    }
  },
  {
    ...bos(), id: BIRLIK_ZEYTIN_ID, title: 'Birlik Zeytin', area: 'duzada', type: 'ürün', status: 'Fikir', priority: 'orta',
    metadata: { profile: { owner: 'Kemsköy Ziraat İşletmeleri Kurumu (Birlik markası, 1994–)' } }
  },
  {
    ...bos(), id: BIRLIK_BIRASI_ID, title: 'Birlik Birası', area: 'duzada', type: 'ürün', status: 'Fikir', priority: 'orta',
    metadata: { profile: { owner: 'Kemsköy Ziraat İşletmeleri Kurumu (Birlik markası, 1994–)' } }
  }
];

function hedefBul(h: Hedef, items: Item[]): Item | undefined {
  if ('id' in h) return items.find(i => i.id === h.id && !i.archived);
  return items.find(i => !i.archived && kurumMu(i) && h.kurum.test(i.title));
}

export interface LogoIsleri {
  /** Açılacak maddeler */
  acilacak: Array<YeniKayit & { id: string }>;
  /** Birincil logosu değişecek kurumlar */
  birincil: Array<{ item: Item; logo: Logo; guncel: Item }>;
  /** Galeri'de büyüğüyle değişecek eski kopyalar */
  degisecek: Array<{ item: Item; logo: Logo; guncel: Item }>;
  /** Galeri'ye eklenecek logolar */
  eklenecek: Array<{ logo: Logo; kayit: YeniKayit; hedefAdi: string }>;
}

/** Yapılacaklar; hepsi boşsa kart görünmez */
export function logoIsleri(items: Item[]): LogoIsleri {
  const simdi = Date.now();
  const acilacak = YENI_MADDELER.filter(m => !items.some(i => i.id === m.id));
  // Açılacakları da hedef sayabilmek için (aynı basışta önce onlar yazılır)
  const tum = [...items, ...acilacak.map(m => ({ ...m, createdAt: simdi, updatedAt: simdi, userId: '' }) as Item)];
  const birincil: LogoIsleri['birincil'] = [];
  const degisecek: LogoIsleri['degisecek'] = [];
  const eklenecek: LogoIsleri['eklenecek'] = [];
  const galeri = items.filter(i => i.type === 'ilham_gorsel' && !i.archived);
  const kaynak = (g: Item) => String((g.metadata as Record<string, unknown> | undefined)?.canvaKaynak || '');

  for (const l of LOGOLAR) {
    const adres = logoAdresi(l);
    const hedef = hedefBul(l.hedef, tum);
    if (l.birincil && hedef && items.includes(hedef)) {
      const kit: BrandKit = hedef.metadata?.brandKit ?? { selectedLogo: '', ideaLogos: [], colorPalette: [], exemplaryWorks: [] };
      if (kit.logoBase64 !== adres) {
        birincil.push({ item: hedef, logo: l, guncel: { ...hedef, metadata: { ...hedef.metadata, brandKit: { ...kit, logoBase64: adres } }, updatedAt: simdi } });
      }
    }
    const varOlan = galeri.find(g => kaynak(g) === l.anahtar) || (l.eski ? galeri.find(g => kaynak(g) === l.eski) : undefined);
    if (varOlan) {
      if ((varOlan.images || [])[0] !== adres) {
        degisecek.push({
          item: varOlan, logo: l,
          guncel: {
            ...varOlan, title: l.baslik, images: [adres], updatedAt: simdi,
            metadata: { ...varOlan.metadata, canvaKaynak: l.anahtar, ...(hedef ? { bagliId: hedef.id } : {}) }
          }
        });
      }
    } else {
      eklenecek.push({
        logo: l, hedefAdi: hedef?.title || '',
        kayit: {
          ...bos(), title: l.baslik, area: 'ilham', type: 'ilham_gorsel', status: 'Galeride', priority: 'düşük',
          tags: ['galeri', 'logo', 'canva'], images: [adres],
          metadata: { gorselTuru: 'logo', canvaKaynak: l.anahtar, canvaTasarim: 'KKM Logo', ...(hedef ? { bagliId: hedef.id } : {}) }
        }
      });
    }
  }
  return { acilacak, birincil, degisecek, eklenecek };
}

export const logoIsiVar = (x: LogoIsleri) =>
  x.acilacak.length + x.birincil.length + x.degisecek.length + x.eklenecek.length > 0;
