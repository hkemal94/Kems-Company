import type { Item, WikiSection } from '../types';
import { kurumMu } from './markaYapisi';
import { ADA_KIMLIGI } from './vikiSifirlama';
import { OTEL_KIMLIGI } from './otelTemizligi';
import type { EskiMetin } from './soruCevapAktarimi';

/**
 * W3 soru-cevaplarının vikiye aktarılması (28 Eylül 2026).
 *
 * Kaynak: docs/soru-cevap/w3.md. W2 gibi: cümle kurulmaz, cevaplar künyeye
 * "* Alan: değer" satırı olarak eklenir. Tarihçe bölümleri boş kalır —
 * metni Kemal yazacak; tarih aralıkları künyede durur.
 *
 * Kemal'in kararları:
 *   - Ada maddesinin başındaki "takımadanın kalbi … melankolik" paragrafı
 *     `eskiMetin`e taşınır (ada tek ada; hava "nostaljik ve canlı").
 *   - Feribot anakarada Küçükkuyu'ya gider ("Ayvalık tarafı" düzelir).
 *
 * Silme yok. Her kayıt etiketle işaretlenir; ikinci basış hiçbir şey yapmaz.
 */

export const W3_ETIKETI = 'soru-cevap-w3';
const GUN = '2026-09-28';

/** Kimlik → künyeye eklenecek satırlar */
const KUNYE_EKLERI: Record<string, Array<[string, string]>> = {
  viki_yer_iskele: [
    ['Otelden önce', "Köyün iskelesi ve birkaç balıkçı evi"],
    ['Sakinler', "Otelle birlikte otelciler ve varlıklı yazlıkçılar (1954 sonrası)"],
    ['Mahalle', "Halk 1954 sonrası mahalle dedi; resmî olması belediyeyle (1980 sonrası)"],
    ['Liman taşınınca', "Feribot yeni limana gitti; İskele otel, eğlence ve küçük teknelerin yeri"]
  ],
  viki_yer_merkez: [
    ['Köken', "Antik; Ada Tepesi'nde yerleşim duvarları"],
    ['Merkez Mahallesi', "Belediye kurulunca (1980 sonrası)"],
    ['Okul', "1920–1940'lar"]
  ],
  viki_yer_liman: [
    ['Kuruluş', "1980–1990'lar"],
    ['Öncesi', "Fener ve koyun çevresinde zeytinlik"]
  ],
  viki_yer_stadyum: [
    ['Oluşum', "Statın çevresinde büyüdü"],
    ['Sakinler', "Kulüp çevresi, adaya sonradan yerleşen aileler"]
  ],
  viki_yer_ciftlik: [
    ['Yapı', "Hep dağınık küçük çiftlikler"],
    ['Zeytinyağı', "Kooperatifin modern, küçük fabrikası (1950–1970'ler)"]
  ],
  viki_mekan_meyhane: [
    ['Bina', "Eski zeytinyağı fabrikası (19. yy sonu – 1920'ler kuruldu, 1950–1970'lerde kapandı)"]
  ],
  viki_mekan_fener: [
    ['Bekçilik', "Bekçi fenerin yanındaki evde yaşardı; 1980–1990'larda otomatiğe geçti"]
  ],
  [OTEL_KIMLIGI]: [
    ['Sezon', "Yıl boyu açık; kışın az misafir ve az personelle"]
  ]
};

/** Kurumlar kimlikle değil adla bulunur */
const KURUM_EKLERI: Array<{ adi: string; ad: RegExp; alanlar: Array<[string, string]> }> = [
  {
    adi: 'Dirlik Spor Kulübü', ad: /dirlik/i, alanlar: [
      ['Kuruluş', "1950–1970'ler; köy döneminde toprak sahada oynayan amatör çocuklar"],
      ['Stat', "Sonradan yapıldı"],
      ['Su sporları', "İskele'nin koyunda"]
    ]
  },
  {
    adi: 'Küçükçetmi Sürek Kulübü', ad: /küçükçetmi|kucukcetmi/i, alanlar: [
      ['Köken', "Köyde eski sürek avı geleneği; kulüp sonradan resmîleşti"],
      ['Av', "1990–2000'lerde bırakıldı; gelenek kulüpte sürer"]
    ]
  }
];

/** Bölüm içeriğine eklenecek / değişecek satırlar */
const MERKEZ_CARSI = "Meydan çevresinde: kahvehane, bakkal, fırın.";
const ULASIM = [
  'Anakarayla bağlantı: her gün feribot; fırtınada sefer iptal olur.',
  'Anakara iskelesi: Küçükkuyu (Çanakkale).'
];
/** Ada maddesinin başındaki, Kemal'in eski metne taşıttığı paragraf */
const ESKI_PARAGRAF = /takımada|melankolik/i;

const kunyeMetni = (alanlar: Array<[string, string]>) =>
  alanlar.map(([k, v]) => `* ${k}: ${v}`).join('\n');

function etiketle(tags: string[] | undefined): string[] {
  const t = tags || [];
  return t.includes(W3_ETIKETI) ? t : [...t, W3_ETIKETI];
}

function notaEkle(item: Item, alanlar: Array<[string, string]>): Item {
  const eklenecek = alanlar.filter(([k]) => !(item.notes || '').includes(`* ${k}:`));
  const notes = [(item.notes || '').trim(), kunyeMetni(eklenecek)].filter(Boolean).join('\n');
  return { ...item, notes, tags: etiketle(item.tags), updatedAt: Date.now() };
}

function adaDuzeltmesi(ada: Item): { kayit: Item; tasinan: number } {
  const eski: EskiMetin[] = [...((ada.metadata?.eskiMetin as EskiMetin[]) || [])];
  const paragraflar = (ada.notes || '').split(/\n\s*\n/);
  const kalan = paragraflar.filter(p => {
    if (ESKI_PARAGRAF.test(p)) {
      eski.push({ kaynak: 'gövde', metin: p.trim(), tasindi: GUN });
      return false;
    }
    return true;
  });
  const tasinan = paragraflar.length - kalan.length;

  // Ulaşım satırları: "Anakarayla bağlantı" ve "Bağlı olduğu kıyı" yenilenir
  const bolumler: WikiSection[] = ((ada.metadata?.wikiSections as WikiSection[]) || []).map(b => {
    const satirlar = (b.content || '').split(/\n\s*\n/);
    const eskiUlasim = satirlar.some(s => /^(Anakarayla bağlantı|Bağlı olduğu kıyı):/.test(s.trim()));
    if (!eskiUlasim) return b;
    const digerleri = satirlar.filter(s => !/^(Anakarayla bağlantı|Bağlı olduğu kıyı):/.test(s.trim()));
    return { ...b, content: [...digerleri, ...ULASIM].filter(s => s.trim()).join('\n\n') };
  });

  return {
    tasinan,
    kayit: {
      ...ada,
      notes: kalan.join('\n\n').trim(),
      tags: etiketle(ada.tags),
      updatedAt: Date.now(),
      metadata: { ...ada.metadata, wikiSections: bolumler, eskiMetin: eski }
    }
  };
}

export interface W3Aktarimi {
  guncellenenler: Item[];
  ozet: string[];
  bulunamayan: string[];
}

export function w3Aktarimi(items: Item[]): W3Aktarimi {
  const guncellenenler: Item[] = [];
  const ozet: string[] = [];
  const bulunamayan: string[] = [];
  const bekliyor = (i: Item | undefined) => !!i && !(i.tags || []).includes(W3_ETIKETI);

  // Ada
  const ada = items.find(i => i.id === ADA_KIMLIGI);
  if (bekliyor(ada)) {
    const { kayit, tasinan } = adaDuzeltmesi(ada!);
    guncellenenler.push(kayit);
    ozet.push('Ada: feribot Küçükkuyu' + (tasinan ? ', eski paragraf "eski metin"e taşınır' : ''));
  } else if (!ada) bulunamayan.push('ada kaydı');

  // Mahalleler, mekânlar, otel
  let kunyeSayisi = 0;
  for (const [id, alanlar] of Object.entries(KUNYE_EKLERI)) {
    const kayit = items.find(i => i.id === id);
    if (!kayit) { bulunamayan.push(id); continue; }
    if (!bekliyor(kayit)) continue;
    let yeni = notaEkle(kayit, alanlar);
    if (id === 'viki_mekan_fener') {
      yeni = { ...yeni, metadata: { ...yeni.metadata, faaliyet: '19. yüzyıl–' } };
    }
    if (id === 'viki_yer_merkez') {
      const bolumler = ((yeni.metadata?.wikiSections as WikiSection[]) || []).map(b =>
        /çarşı/i.test(b.title) && !(b.content || '').trim()
          ? { ...b, content: MERKEZ_CARSI, status: 'resmi' as const }
          : b
      );
      yeni = { ...yeni, metadata: { ...yeni.metadata, wikiSections: bolumler } };
    }
    guncellenenler.push(yeni);
    kunyeSayisi++;
  }
  if (kunyeSayisi) ozet.push(`${kunyeSayisi} maddenin künyesine tarih ve bilgi satırları`);

  // Kurumlar
  const kurumlar = items.filter(
    i => !i.archived && (i.type === 'kulüp' || i.type === 'marka') && kurumMu(i)
  );
  for (const ek of KURUM_EKLERI) {
    const kurum = kurumlar.find(k => ek.ad.test(k.title));
    if (!kurum) { bulunamayan.push(ek.adi); continue; }
    if (!bekliyor(kurum)) continue;
    guncellenenler.push(notaEkle(kurum, ek.alanlar));
    ozet.push(`${kurum.title}: künye`);
  }

  return { guncellenenler, ozet, bulunamayan };
}
