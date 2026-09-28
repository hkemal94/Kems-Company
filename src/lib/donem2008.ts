import type { Item, WikiSection } from '../types';

/**
 * Dönem değişikliği: Ekim 2003 → Ekim 2008 (28 Eylül 2026).
 *
 * Kemal: oyunun dönemi "2007 sonu – 2008"; wikideki 2003 tarihi bütün evrende
 * buna göre düzeltilsin. Ekim 2008'in günleri Ekim 2003'le aynı haftanın
 * aynı günlerine düşüyor (6 Ekim 2008 de Pazartesi), bu yüzden yalnız yıl
 * değişiyor; 14 günün adları ve sırası olduğu gibi kalıyor.
 *
 * Yalnız "Ekim 2003" / "OCT 2003" gibi ay + yıl kalıpları değişir. Tek başına
 * geçen 2003'e (bir doğum yılı, bir koordinat) dokunulmaz.
 *
 * Aynı göçte otel maddesine oyun projesinin kararları da yazılır
 * (The Imperial Kemsköy reposu). Bölüm zaten varsa üzerine yazılmaz: Kemal
 * wikide düzenlediyse onun metni kalır.
 */

const AY_YIL = /\b(Ekim|EKİM|Oct|OCT)(\s+)2003\b/g;

function tarihiDuzelt<T>(deger: T): T {
  if (typeof deger === 'string') return deger.replace(AY_YIL, '$1$22008') as T;
  if (Array.isArray(deger)) return deger.map(tarihiDuzelt) as T;
  if (deger && typeof deger === 'object') {
    const cikti: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(deger)) cikti[k] = tarihiDuzelt(v);
    return cikti as T;
  }
  return deger;
}

const OYUN_REPO = 'https://github.com/hkemal94/TheImperialKemskoy';
const FIGMA = 'https://www.figma.com/design/A8sB4u37VEpVI4GG4VHs2p';

/** Otel maddesine eklenecek oyun bölümleri. */
export const OTEL_OYUN_BOLUMLERI: WikiSection[] = [
  {
    id: 'oyun_ozet',
    title: 'Oyun: The Imperial Kemsköy',
    content:
      'Papers, Please yapısında, birinci şahıs bir resepsiyon masası oyunu. Oyuncu masanın arkasında oturur; '
      + 'yalnız fareyle oynanır. 2D, vektörel çizim. Dönem: Ekim 2008, "Sezon Sonu" (6–19 Ekim 2008, 14 gün). '
      + `Kod: ${OYUN_REPO}`,
    status: 'resmi',
  },
  {
    id: 'oyun_ekran',
    title: 'Oyun: Ekran düzeni',
    content:
      'Ekran üç bölge: üstte lobi (kemerli pencereler, Ege manzarası, avizeler, zeytin ağaçları), ortada desk\'e gelen '
      + 'misafir (adaçayı yeşili lambri, Ege tablosu, duvar saati), altta masa. Masadaki dönem araçları: tüplü monitör '
      + '(kurgusal otel yönetim sistemi), tuşlu kablolu telefon, anahtar panosu, kayıt defteri, kredi kartı POS cihazı, '
      + 'hesap makinesi, kasa çekmecesi.',
    status: 'resmi',
  },
  {
    id: 'oyun_gorsel',
    title: 'Oyun: Görsel yön',
    content:
      'Aydınlık, bitkisel bir Ege oteli: adaçayı yeşili, terakota, eski parşömen, pudra gül, zeytin, Ege mavisi, pirinç. '
      + 'Yazı tipleri: başlıklarda Nunito, belge ve sistem yazılarında IBM Plex Mono. Görsellerin içine yazı konmaz; '
      + 'bütün yazılar oyunun çeviri dosyasından gelir. Gerçek marka ve logo kullanılmaz. Figma\'daki '
      + '"bright-botanical-blueprint" çalışması atmosfer referansıdır, oyuna doğrudan alınmaz. '
      + `Tasarım dosyası: ${FIGMA}`,
    status: 'resmi',
  },
  {
    id: 'oyun_anahtar_panosu',
    title: 'Oyun: Anahtar panosu',
    content:
      'Panoda her sütun bir kat (1–4), her satır bir oda (x01–x05). Bakımdaki odaların (203, 304) anahtarlığı '
      + 'terakota renkte, diğerleri pirinç.',
    status: 'resmi',
  },
  {
    id: 'oyun_oda_onerileri',
    title: 'Oda tutarsızlıkları (karar bekliyor)',
    content:
      'Barbaros Yılmaz 215 numaralı odada kalıyor, ama otelde x06 ve üstü oda yok. Öneri: 202 (Standart, 2. kat; '
      + 'hikâyede başka kimse kullanmıyor). Erdal Sönmez\'in 402 numaralı odası "Deluxe" deniyor, ama x02 odaları '
      + 'Standart. Öneri: 404 (Deluxe, 4. kat; hikâyede boş). Misafir kayıtları değiştirilmedi, karar Kemal\'in.',
    status: 'öneri',
  },
];

export interface Donem2008Durumu {
  /** Yazılacak kayıtlar (tarihi düzelen ve/veya bölüm eklenen) */
  degisenler: Item[];
  /** Tarihi düzelen kayıt sayısı */
  tarihSayisi: number;
  /** Otele eklenecek bölüm sayısı */
  bolumSayisi: number;
}

export function donem2008Durumu(items: Item[]): Donem2008Durumu {
  const degisenler: Item[] = [];
  let tarihSayisi = 0;
  let bolumSayisi = 0;

  for (const item of items) {
    if (item.archived) continue;
    // Firestore `undefined` yazmayı reddeder: metadata yoksa anahtar hiç eklenmez.
    let yeni: Item = { ...item, title: tarihiDuzelt(item.title), notes: tarihiDuzelt(item.notes) };
    if (item.metadata) yeni.metadata = tarihiDuzelt(item.metadata);
    const tarihDegisti = JSON.stringify(yeni) !== JSON.stringify(item);
    if (tarihDegisti) tarihSayisi++;

    let eklenen = 0;
    if (item.id === 'kemskoy_hotel') {
      const mevcut = yeni.metadata?.wikiSections ?? [];
      const varOlan = new Set(mevcut.map(b => b.id));
      const eksik = OTEL_OYUN_BOLUMLERI.filter(b => !varOlan.has(b.id));
      eklenen = eksik.length;
      if (eklenen > 0) {
        yeni = { ...yeni, metadata: { ...yeni.metadata, wikiSections: [...mevcut, ...eksik] } };
      }
      bolumSayisi = eklenen;
    }

    if (tarihDegisti || eklenen > 0) degisenler.push({ ...yeni, updatedAt: Date.now() });
  }

  return { degisenler, tarihSayisi, bolumSayisi };
}
