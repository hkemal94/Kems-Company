import type { Item } from '../types';

/**
 * Mahalle metinleri (1 Ekim gece, metin soru turu).
 *
 * Kemal'in cevaplarından çıkan iskelet (`docs/soru-cevap/metin-1.md`).
 * Stüdyodaki "Mahalle metinleri" kartı bunu tek seferde yapay zekâya
 * verir; gelen 8 bölüm, her biri kendi mahallesinin maddesine ayrı öneri
 * olarak tepsiye düşer. Kemal "Ekle" demeden hiçbir kayda yazılmaz.
 *
 * Bu bir iskelet: yalnız kanondaki bilgiler ve Kemal'in cevapları. Yeni
 * bilgi buraya Kemal'e sorulmadan eklenmez.
 */

export interface MahalleBolumu {
  anahtar: string;
  /** Maddeyi bulmak için ad (küçük harf, baş eşleşmesi) */
  mahalleAdlari: string[];
  mahalle: string;
  bolum: string;
  paragraf: number;
  iskelet: string[];
  /** Kemal'in seçtiği tek sözlü anlatının konusu; yoksa söylenti yazılmaz */
  soylenti?: string;
}

export const MAHALLE_ISKELETI: MahalleBolumu[] = [
  {
    anahtar: 'merkez-tarihce', mahalleAdlari: ['merkez mahallesi', 'merkez'], mahalle: 'Merkez Mahallesi', bolum: 'Tarihçe', paragraf: 3,
    iskelet: [
      'Antik köken: yerleşim eski; Ada Tepesi\'nde antik yerleşim duvarları.',
      'Köy dönemi: Düzada Köyü; meydan, taş çeşme, yaşlı çınar; okul 1920–1940\'lar; 1923 mübadelesinde Merkez\'deki Rum aileler de ayrıldı; otelden (1954) sonra İskele\'deki mübadele aileleri evlerini yazlıkçılara satıp Merkez\'e geçti; kahvehane 1950–1970\'ler.',
      'Belediye dönemi (1980–): köy Merkez Mahallesi oldu; belediye binası, cami yenilendi; jandarma karakolu, itfaiye, sağlık ocağı. Müstakil evler, apartman yok.'
    ],
    soylenti: 'Meydandaki taş çeşmenin antik bir kaynağın üstüne yapıldığı anlatılır (tek cümle, kanıtlanmış bilgi değil).'
  },
  {
    anahtar: 'merkez-carsi', mahalleAdlari: ['merkez mahallesi', 'merkez'], mahalle: 'Merkez Mahallesi', bolum: 'Çarşı ve işletmeler', paragraf: 2,
    iskelet: [
      'Meydan çevresi: kahvehane (Dirlik\'in deplasman maçları burada izlenir), bakkal, fırın, eczane; terzi, kasap, berber (ad ve tarih verilmez).',
      'Meydanda cumartesi pazarı kurulur (ayrıntı yok). Adada banka yok.'
    ]
  },
  {
    anahtar: 'liman-tarihce', mahalleAdlari: ['liman mahallesi', 'liman'], mahalle: 'Liman Mahallesi', bolum: 'Tarihçe', paragraf: 3,
    iskelet: [
      '1980 öncesi: fener ve koyun çevresi zeytinlik.',
      '1980–1990\'lar: İskele operasyonel olarak yetersiz kalınca devlet, kuzeybatıdaki derin ve poyraza kapalı koya limanı yaptı; liman inşaatında antik amfora alanı bulundu.',
      'Oturan düzen: feribot (1950\'lerden beri kamu hattı) ve balık hali İskele\'den taşındı; büyük balıkçı tekneleri, çekek yeri, Liman İdare Binası (liman başkanlığı, feribot gişesi, bekleme salonu, sahil güvenlik), mendirek içinde birkaç yat iskelesi (marina yok), deniz taksisi kooperatifi; İskele ile hafif bir rekabet.'
    ]
  },
  {
    anahtar: 'liman-fener', mahalleAdlari: ['liman mahallesi', 'liman'], mahalle: 'Liman Mahallesi', bolum: 'Deniz Feneri', paragraf: 2,
    iskelet: [
      '19. yüzyıl (kimin yaptığı yazılmaz); adanın kuzeybatı ucunda, limanı yukarıdan görür. Bekçi fenerin yanındaki evde yaşardı.',
      '1970\'lerde otomatiğe geçti; bekçi evi sahil güvenliğin kullanımına geçti. Fener ziyarete açık; içine çıkılır, limana bakan manzara.'
    ]
  },
  {
    anahtar: 'iskele-tarihce', mahalleAdlari: ['iskele mahallesi', 'iskele', 'kemsköy'], mahalle: 'İskele Mahallesi / Kemsköy', bolum: 'Tarihçe', paragraf: 3,
    iskelet: [
      'Düzada Köyü\'nün iskelesi ve birkaç balıkçı evi, köyün dışında kalan Kemsköy; 18. yüzyıl kilisesi ve yanında eski Rum mezarlığı. 1923 mübadelesi: kilisenin Rum cemaati gitti, gelen aileler boşalan evlere yerleşti; kilise o zamandan beri boş (belediye bakar, kapalı).',
      'Otel (1954): devlet misafirhanesi olarak yapıldı, 1960\'larda İstanbul merkezli büyük bir şirkete geçip otel oldu (şirketin adı yazılmaz); adada yaz turizmi başladı; otelciler ve varlıklı yazlıkçılar yerleşti, mübadele aileleri evlerini satıp Merkez\'e geçti; halk 1954 sonrası "mahalle" dedi, resmî mahalle olması belediyeyle.',
      '1970\'lerden barlar; Kemsköy Caddesi yavaş yavaş dükkânlı yazlık caddesine döndü; eski zeytinyağı fabrikasının taş binası Sade Meyhane oldu; 1980–1990\'larda feribot ve balık hali Liman\'a taşındı, İskele otel, eğlence ve küçük teknelerin yeri olarak kaldı.'
    ]
  },
  {
    anahtar: 'stadyum-tarihce', mahalleAdlari: ['stadyum mahallesi', 'stadyum'], mahalle: 'Stadyum Mahallesi', bolum: 'Tarihçe', paragraf: 2,
    iskelet: [
      '1950\'lerden toprak saha çevresinde küçük bir yerleşim; Dirlik Spor Kulübü 12 Mayıs 1957\'de, köy döneminde, toprak sahada oynayan amatör çocuklarla kuruldu.',
      '1980\'lerde stat mahalleyi büyüttü; kulüp çevresi ve adaya sonradan yerleşen aileler; Stadyum kıyısında kumlu-çakıllı plaj.'
    ],
    soylenti: '1950\'lerde toprak sahada oynanan ilk maç üzerine bir anlatı (tek cümle; ayrıntı uydurma, yalnız böyle bir anlatı olduğunu söyle).'
  },
  {
    anahtar: 'stadyum-stat', mahalleAdlari: ['stadyum mahallesi', 'stadyum'], mahalle: 'Stadyum Mahallesi', bolum: 'Dirlik Stadı', paragraf: 2,
    iskelet: [
      '1980\'ler; devlet yaptı; eski toprak sahanın yerine, iki tribünlü, en fazla ~1.000 kişilik. İç saha maçlarında ada stada taşınır.',
      'Taraftar birahanesi plajın üstünde, plaja bakan kıyıda; maç öncesi buluşma yeri. Rakip Küçükkuyu tarafından bir kulüp (adı yazılmaz); rekabet sevgi–nefret ilişkisi.'
    ]
  },
  {
    anahtar: 'ciftlik-tarihce', mahalleAdlari: ['çiftlik mahallesi', 'çiftlik'], mahalle: 'Çiftlik Mahallesi', bolum: 'Tarihçe', paragraf: 3,
    iskelet: [
      'Hep dağınık küçük aile çiftliklerinin bölgesi; taş, avlulu çiftlik evleri; asırlık ve yeni zeytinlikler; 20. yüzyıl başında adaya gelen aileler.',
      'Küçükçetmi Çiftliği: Küçükkuyu\'nun bir köyünden 20. yüzyıl başında gelen bir ailenin çiftliği; Küçükçetmi Sürek Kulübü\'nü bu aile kurdu, çiftlik evi kulüp evi; sürek avı köyde eski gelenek; Kangal\'ın kökü zeytinlikleri ve sürüleri koruyan çiftlik bekçileri.',
      '1950–1970\'ler kooperatifin modern, küçük zeytinyağı fabrikası (bütün adanın zeytincileri üye); 2000 sonrası butik aile şaraphaneleri (bağcılık adada bu dönemde başladı); Ada Tepesi yamaçlarında arıcılık, çam balı.'
    ]
  }
];

const kucuk = (s: string) => s.trim().toLocaleLowerCase('tr');

/** Mahallenin viki maddesi (yer / bölge), yoksa null */
export function mahalleMaddesi(items: Item[], adlar: string[]): Item | null {
  const adaylar = items.filter(i => !i.archived && !i.isProposal && i.type !== 'aday');
  for (const ad of adlar) {
    const tam = adaylar.find(i => kucuk(i.title) === ad);
    if (tam) return tam;
  }
  for (const ad of adlar) {
    const bas = adaylar.find(i => i.type === 'yer' && kucuk(i.title).startsWith(ad));
    if (bas) return bas;
  }
  return null;
}

/** Yapay zekâya giden veri */
export const mahalleMetniVerisi = () => ({
  bolumler: MAHALLE_ISKELETI.map(b => ({
    anahtar: b.anahtar, mahalle: b.mahalle, bolum: b.bolum, paragraf: b.paragraf,
    iskelet: b.iskelet, soylenti: b.soylenti || ''
  }))
});
