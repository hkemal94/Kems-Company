import type { Item, ItemType } from '../types';
import { adiCoz } from './alanSablonu';
import { eksikBolumler } from './yerTurleri';

/**
 * Madde soru turu (8 Ekim; `docs/soru-cevap/madde-1.md`). Kanonda yazılı
 * olup maddesi olmayan yerler boş metinle açılır, künyelerine yalnız
 * kanondaki ve Kemal'in bu turdaki cevapları yazılır. Yanlış alana düşmüş
 * eski bilgiler düzeltilir. Tek seferlik: açılmış madde (aynı ad ya da takma
 * ad) yeniden açılmaz, düzelmiş alana yeniden yazılmaz.
 */

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

interface Tohum {
  ad: string;
  tur: ItemType;
  bolge?: string;
  profil?: Record<string, string>;
  faaliyet?: string;
}

const MEKAN = (ad: string, bolge: string, shopType: string, ek: Record<string, string> = {}, faaliyet?: string): Tohum =>
  ({ ad, tur: 'mekân', bolge, profil: { shopType, ...ek }, ...(faaliyet ? { faaliyet } : {}) });

/** Açılacak maddeler; adlar yer tarifiyle (Kemal: "ad koyunca değişir") */
export const TOHUMLAR: Tohum[] = [
  // Merkez
  MEKAN('Merkez Camii', 'merkez', 'Cami'),
  MEKAN('Merkez Kahvehanesi', 'merkez', 'Kahvehane', {}, "1950–1970'ler–"),
  { ad: 'Merkez Meydanı', tur: 'meydan', bolge: 'merkez', profil: { cevresi: 'Merkez Kahvehanesi, Merkez Pazarı, bakkal, fırın, taş çeşme, çınar' } },
  MEKAN('Jandarma Karakolu', 'merkez', 'Jandarma karakolu', { manager: 'Devlet' }, 'Köy döneminden–'),
  MEKAN('Merkez Postanesi', 'merkez', 'Postane', { manager: 'Devlet' }, "1950–1970'ler–"),
  MEKAN('Merkez Sağlık Ocağı', 'merkez', 'Sağlık ocağı', { manager: 'Devlet' }, '1980 sonrası–'),
  MEKAN('Merkez Eczanesi', 'merkez', 'Eczane', {}, '1980 sonrası–'),
  // İskele, Liman, Stadyum
  MEKAN('Eski Kilise', 'iskele', 'Kilise (küçük şapel), boş', { manager: 'Belediye (kapalı)' }, '18. yüzyıl–'),
  MEKAN('Rum Mezarlığı', 'iskele', 'Mezarlık (Eski Kilise\'nin yanında)'),
  MEKAN('Liman Balık Hali', 'liman', 'Balık hali'),
  MEKAN('Liman Balık Lokantası', 'liman', 'Balık lokantası'),
  MEKAN('Taraftar Birahanesi', 'stadyum', 'Birahane (plaja bakan kıyıda)'),
  // Yer adları
  { ad: 'Kuzey Sırtı', tur: 'yer_adi', profil: { yerTuru: 'Sırt · 386 m', adinKokeni: 'Yönünden: adanın kuzeyindeki sırt' } },
  { ad: 'Çetmi Sırtı', tur: 'yer_adi', profil: { yerTuru: 'Sırt · 254 m', adinKokeni: "Küçükçetmi'den: Eskibey Ailesi'nin geldiği köy" } },
  { ad: 'Fener Burnu', tur: 'yer_adi', profil: { yerTuru: 'Burun · 118 m', adinKokeni: "Deniz Feneri'nden: fenerin durduğu burun" } },
  { ad: 'İskele Koyu', tur: 'yer_adi', bolge: 'iskele', profil: { yerTuru: 'Koy, plaj' } },
  { ad: 'Stadyum Plajı', tur: 'yer_adi', bolge: 'stadyum', profil: { yerTuru: 'Plaj (kumlu-çakıllı)' } },
  { ad: 'Amfora Alanı', tur: 'yer_adi', bolge: 'liman', profil: { yerTuru: "Sualtı antik amfora alanı (Liman'ın açığında)" } },
  // Yollar (Sahil Yolu: çevre yolu maddesinin adı değişir, aşağıda)
  { ad: 'Kemsköy Caddesi', tur: 'cadde', bolge: 'İskele Mahallesi', profil: { uzerindekiler: 'Kems Company dükkânı, Sade Meze, Eski Kilise, barlar ve meyhaneler' } },
  { ad: 'Sahil Merdiveni', tur: 'cadde', bolge: 'İskele Mahallesi', profil: { uzerindekiler: 'The Imperial Kemsköy' } },
  { ad: 'Otel Yolu', tur: 'cadde', bolge: 'İskele Mahallesi', profil: { uzerindekiler: 'The Imperial Kemsköy' } },
  // Aile ve çiftlik
  { ad: 'Eskibey Ailesi', tur: 'aile', bolge: 'ciftlik', profil: { ugras: 'Zeytincilik', mekanlar: 'Küçükçetmi Çiftliği', gelis: "20. yüzyıl başı, Küçükkuyu'nun Küçükçetmi köyünden" } },
  MEKAN('Küçükçetmi Çiftliği', 'ciftlik', 'Çiftlik (Küçükçetmi Sürek Kulübü\'nün evi)', { manager: 'Eskibey Ailesi' })
];

const canli = (items: Item[]) => items.filter(i => !i.archived);

function tohumKaydi(t: Tohum): YeniKayit {
  const bolumler = eksikBolumler(t.tur, [], `mst_${t.ad.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g, '_')}`);
  return {
    title: t.ad, area: 'duzada', type: t.tur, status: 'Fikir', priority: 'orta',
    tags: [], links: [], notes: '', images: [], isProposal: false, archived: false,
    metadata: {
      ...(t.bolge ? { region: t.bolge } : {}),
      ...(t.profil ? { profile: t.profil } : {}),
      ...(t.faaliyet ? { faaliyet: t.faaliyet } : {}),
      ...(bolumler.length ? { wikiSections: bolumler } : {})
    }
  };
}

/** Henüz açılmamış maddeler */
export function acilacaklar(items: Item[]): YeniKayit[] {
  const c = canli(items);
  return TOHUMLAR
    .filter(t => !adiCoz(t.ad, c))
    .map(tohumKaydi)
    // Sahil Yolu: çevre yolu maddesi varsa onun adı değişir (düzeltmelerde); yoksa açılır
    .concat(c.some(i => i.metadata?.cevreYolu === true) || adiCoz('Sahil Yolu', c) ? [] : [{
      ...tohumKaydi({ ad: 'Sahil Yolu', tur: 'cadde' }),
      metadata: { cevreYolu: true, wikiSections: eksikBolumler('cadde', [], 'mst_sahil_yolu') }
    }]);
}

const bul = (items: Item[], ad: string) => adiCoz(ad, canli(items));
const profil = (i: Item) => ((i.metadata?.profile as Record<string, string> | undefined) || {});

/** Var olan maddelerde düzeltmeler (Firestore birleştirerek yazar: alan boş metinle temizlenir) */
export function duzeltmeler(items: Item[]): Array<{ item: Item; neler: string[] }> {
  const c = canli(items);
  const cikti: Array<{ item: Item; neler: string[] }> = [];
  const simdi = Date.now();
  const ekle = (i: Item | null | undefined, neler: string[], yeni: (i: Item) => Item) => {
    if (!i || !neler.length) return;
    cikti.push({ item: { ...yeni(i), updatedAt: simdi }, neler });
  };

  // Çevre yolu → Sahil Yolu (kanondaki ad); Sahil Yolu maddesi yoksa
  const cevre = c.find(i => i.metadata?.cevreYolu === true);
  if (cevre && cevre.title !== 'Sahil Yolu' && !bul(items, 'Sahil Yolu')) {
    ekle(cevre, ['adı Sahil Yolu oldu'], i => ({ ...i, title: 'Sahil Yolu' }));
  }

  const stad = bul(items, 'Stadyum Mahallesi');
  if (stad) {
    const p = profil(stad);
    const n: string[] = [];
    if (p.shopType) n.push('künyedeki "Tür" yazısı silindi');
    if (p.style) n.push('künyedeki "Mimari" yazısı silindi');
    ekle(stad, n, i => ({ ...i, metadata: { ...i.metadata, profile: { ...profil(i), shopType: '', style: '' } } }));
  }

  const surek = bul(items, 'Küçükçetmi Sürek Kulübü');
  if (surek) {
    const p = profil(surek);
    const kurulus = '1950–1980 arası';
    const faaliyet = "Kuruluştan 1990–2000'lere: sürek avı; cemiyet ve hayırseverler kulübü. Av bırakıldıktan sonra: nişancılık, doğa yürüyüşleri, Kangal yetiştiriciliği, buluşma yeri.";
    const n: string[] = [];
    if (p.founded !== kurulus) n.push(`kuruluş: ${kurulus}`);
    if (p.field !== faaliyet) n.push('faaliyet dönemlere göre yazıldı');
    if (p.leader) n.push('"Baş Sürekçi" silindi');
    if (p.secrecy) n.push('"Üyelik: 40" silindi');
    ekle(surek, n, i => ({ ...i, metadata: { ...i.metadata, profile: { ...profil(i), founded: kurulus, field: faaliyet, leader: '', secrecy: '' } } }));
  }

  const yil = (ad: string, deger: string) => {
    const i = bul(items, ad);
    if (i && i.metadata?.faaliyet !== deger) ekle(i, [`faaliyet: ${deger}`], x => ({ ...x, metadata: { ...x.metadata, faaliyet: deger } }));
  };
  yil('Dirlik Stadı', "1980'ler–");
  yil('Düzada İlkokulu', "1920–1940'lar–");
  yil('Merkez Pazarı', 'Köy döneminden–');

  // Zaten var olan maddeler (ör. taşıma kartıyla Cadde'ye geçen Kemsköy
  // Caddesi): yalnız boş künye alanları dolar, dolu alana dokunulmaz
  for (const t of TOHUMLAR) {
    const i = bul(items, t.ad);
    if (!i || cikti.some(x => x.item.id === i.id)) continue;
    const p = profil(i);
    const bos = Object.entries(t.profil || {}).filter(([k]) => !String(p[k] || '').trim());
    const n = bos.map(([k]) => `künye: ${k}`);
    const bolgeBos = t.bolge && !String(i.metadata?.region || '').trim();
    const faaliyetBos = t.faaliyet && !String(i.metadata?.faaliyet || '').trim();
    if (bolgeBos) n.push('mahalle');
    if (faaliyetBos) n.push('faaliyet');
    ekle(i, n.length ? [`boş alanlar doldu (${n.length})`] : [], x => ({
      ...x,
      metadata: {
        ...x.metadata,
        ...(bos.length ? { profile: { ...profil(x), ...Object.fromEntries(bos) } } : {}),
        ...(bolgeBos ? { region: t.bolge } : {}),
        ...(faaliyetBos ? { faaliyet: t.faaliyet } : {})
      }
    }));
  }
  return cikti;
}

export const maddeSoruTuruIsVar = (items: Item[]) => acilacaklar(items).length > 0 || duzeltmeler(items).length > 0;
