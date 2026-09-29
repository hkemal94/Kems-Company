import type { Item } from '../types';
import { bosluklariCikar, alanaYaz } from '../components/Bosluklar';
import { bolgeAdi } from '../components/wiki/wikiSchema';

/**
 * Boşlukları künyeden doldur (29 Eylül gece). Kemal: "Bu boşluklardaki
 * soruların bir çoğunu zaten cevapladık."
 *
 * Cevaplar docs/03-duzada-kunyesi.md'de ve 29 Eylül gecesi tıklamalı
 * sorularda verildi; burada yalnız oradakiler var, yeni bilgi yok.
 * Yalnız BOŞ alan dolar, dolu alana dokunulmaz. Tarihçe (sayfa metni)
 * Kemal'in; hiç yazılmaz. İkinci basışta iş kalmaz.
 *
 * Mahalle alanı (region) sade anahtarla yazılır: iskele, liman, merkez,
 * ciftlik, stadyum — viki bunları "İskele Mahallesi" diye gösterir.
 */

type Cevaplar = Record<string, string>;

/** Madde adına göre cevaplar (alan kimliği → değer) */
const CEVAPLAR: Array<[RegExp, Cevaplar]> = [
  // ---- mekânlar
  [/imperial/i, {
    shopType: 'Otel', region: 'iskele', faaliyet: '1954–',
    manager: 'İstanbul merkezli bir şirket (adı yok)', season: 'Yıl boyu açık'
  }],
  [/^sade meze/i, {
    shopType: 'Meyhane', region: 'iskele', faaliyet: "1980'ler–",
    manager: 'Eylül Hanım', season: 'Yıl boyu açık'
  }],
  [/dondurmacı kızlar/i, {
    shopType: 'Dondurmacı; kışın tatlıcı / kafe', region: 'liman', faaliyet: '2000–',
    manager: 'Eylül Hanım', season: 'Yıl boyu (kışın tatlıcı / kafe)'
  }],
  [/deniz feneri/i, {
    shopType: 'Deniz feneri (otomatik)', region: 'liman', faaliyet: '19. yüzyıl–',
    manager: 'Devlet (kıyı emniyeti)', season: 'Yıl boyu'
  }],
  [/liman idare/i, {
    shopType: 'Liman başkanlığı, feribot gişesi ve bekleme salonu, sahil güvenlik',
    region: 'liman', manager: 'Devlet', season: 'Yıl boyu'
  }],
  [/belediye/i, {
    shopType: 'Belediye binası', region: 'merkez', faaliyet: '1980–',
    manager: 'Belediye', season: 'Yıl boyu'
  }],
  [/ilkokul/i, {
    shopType: 'Okul (ilk ve ortaokul; adanın tek okulu)', region: 'merkez',
    manager: 'Devlet', season: 'Öğretim yılı boyunca'
  }],
  [/merkez pazar/i, {
    shopType: 'Pazar', region: 'merkez', season: 'Yıl boyu; haftada bir, cumartesi'
  }],
  // ---- marka ve kurumlar
  [/^kems company$/i, {
    founded: '2024', region: 'iskele', field: 'Kems Company ürünleri ve kulüp serileri',
    colors: 'Lacivert #0E1C4F, kiremit #F26B6F, krem #F3EFE8'
  }],
  [/dirlik spor/i, {
    founded: '12 Mayıs 1957', region: 'stadyum', field: 'Futbol, su sporları'
  }],
  [/küçükçetmi sürek/i, {
    region: 'ciftlik', leader: 'Eskibey Ailesi',
    field: 'Sürek avı geleneği; nişancılık, doğa yürüyüşleri, Kangal yetiştiriciliği'
  }],
  // ---- mahalleler
  [/^liman mahalles/i, {
    konum: 'Adanın kuzeybatı ucu',
    landmarks: 'Deniz Feneri, Liman İdare Binası, balık hali, çekek yeri',
    sakinler: 'Liman çalışanları, balıkçılar, esnaf, genç aileler'
  }],
  [/^merkez mahalles/i, {
    konum: 'Adanın ortası',
    landmarks: 'Belediye Binası, meydan (taş çeşme, çınar), eski cami, kahvehane, okul',
    sakinler: 'Eski köylü aileler, kamu çalışanları, esnaf, emekliler'
  }],
  [/^iskele mahalles/i, {
    landmarks: 'The Imperial Kemsköy, Kemsköy Caddesi, eski kilise, Sade Meze',
    sakinler: 'Ekonomik olarak üst seviyedeki aileler'
  }],
  [/^stadyum mahalles/i, {
    landmarks: 'Dirlik Stadı, taraftar birahanesi, plaj',
    sakinler: 'Kulüp çevresi ve adaya sonradan yerleşen aileler'
  }],
  [/^çiftlik mahalles/i, {
    landmarks: 'Küçükçetmi Çiftliği, kooperatifin Yağ Fabrikası, butik şaraphaneler'
  }]
];

export interface BoslukDoldurma {
  item: Item;
  /** Kemal'e gösterilecek satırlar: "Sezon: Yıl boyu açık" */
  neler: string[];
}

export function boslukDoldurma(items: Item[]): BoslukDoldurma[] {
  const bosluklar = bosluklariCikar(items);
  const gruplar = new Map<string, BoslukDoldurma>();
  for (const b of bosluklar) {
    if (b.alanId === 'notes') continue;          // tarihçe Kemal'in
    const cevap = CEVAPLAR.find(([re]) => re.test(b.item.title.trim()))?.[1][b.alanId];
    if (!cevap) continue;
    const g = gruplar.get(b.item.id) || { item: b.item, neler: [] };
    g.item = alanaYaz(g.item, b.yol, cevap);
    g.neler.push(`${b.etiket}: ${b.alanId === 'region' ? bolgeAdi(cevap) : cevap}`);
    gruplar.set(b.item.id, g);
  }
  return [...gruplar.values()];
}
