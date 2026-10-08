import type { Item } from '../types';

/**
 * Marka yapısı (7. madde, adım 1).
 *
 * Kemal'in 28 Eylül kararı: **Kems Company tek markadır.** Dirlik Spor
 * Kulübü ve Küçükçetmi Sürek Kulübü marka değil, kurgu içi kurum. Kurum
 * altında drop serisi açılabilir; ama gerçekte satan her zaman Kems
 * Company (bkz. aşağıda dropBaglari).
 *
 * Veride durum (28 Eylül, yedekten ölçüldü — tahmin değil):
 *   - kems_company                 → type 'marka'  (çatı marka)
 *   - marka_1782600611254_j7gg5    → type 'marka'  (Küçükçetmi — kurum olmalı)
 *   - Dirlik Spor Kulübü           → KAYIT YOK. Yalnız drop'u ve stadı var.
 *
 * Bu dosya henüz hiçbir kaydı değiştirmiyor. İşi yalnızca ayırmak: hangi
 * kayıt marka, hangisi kurum. Markalar ekranı buna göre iki liste çiziyor.
 * Kayıtların tipini düzelten tek seferlik göç bir sonraki adımda.
 *
 * Ayrım üç yoldan biriyle tanınıyor — göç öncesinde de sonrasında da doğru
 * çalışsın diye:
 *   1. type === 'kulüp'                     (göçten sonra)
 *   2. tags içinde 'kurum'                  (elle işaretlenmişse)
 *   3. metadata.markaTuru === 'kulüp markası'  (künye dosyasından gelen)
 */

export const KURUM_ETIKETI = 'kurum';

/** Künye dosyasındaki tür adı — kurum sayılan kayıtların işareti */
export const KURUM_TURU = 'kulüp markası';

/** Çatı markanın kimlikleri: veride biri, künye dosyasında öteki */
export const ANA_MARKA_KIMLIKLERI = ['kems_company', 'marka_kems'];

/**
 * Vikideki herhangi bir madde (otel, şirket, dernek…) Kemal madde
 * düzenleyicide tiklerse Markalar'da kurum olarak görünür (1 Ekim, Kemal:
 * "ben tikle seçerim"). Kendiliğinden hiçbir madde kurum olmaz.
 */
export const KURUM_TIKI = 'kurumOlarakGoster';

export function kurumMu(i: Item): boolean {
  if (i.type === 'kulüp') return true;
  if ((i.metadata as any)?.[KURUM_TIKI] === true) return true;
  if ((i.tags || []).includes(KURUM_ETIKETI)) return true;
  return (i.metadata as any)?.markaTuru === KURUM_TURU;
}

export interface MarkaYapisi {
  /** Kems Company — tek marka */
  anaMarka: Item | null;
  /** Kurgu içi kurumlar (kulüpler) */
  kurumlar: Item[];
  /**
   * Ana marka dışında kalan, kurum da olmayan 'marka' kayıtları. Normalde
   * boş olmalı; boş değilse ya yeni bir marka açılmış ya bir kurum yanlış
   * tiple duruyor. Ekranda görünür kalsın diye ayrı tutuluyor.
   */
  digerMarkalar: Item[];
  /** Ekranın gezineceği tam liste — marka önce, kurumlar sonra */
  hepsi: Item[];
}

export function markaYapisi(items: Item[]): MarkaYapisi {
  const canli = items.filter(i => !i.archived);

  const kurumlar = canli.filter(
    i => ((i.type === 'marka' || i.type === 'kulüp') && kurumMu(i)) || (i.metadata as any)?.[KURUM_TIKI] === true
  );
  const markalar = canli.filter(i => i.type === 'marka' && !kurumMu(i));

  const anaMarka =
    markalar.find(i => ANA_MARKA_KIMLIKLERI.includes(i.id))
    || markalar.find(i => i.title.trim().toLocaleLowerCase('tr') === 'kems company')
    || markalar[0]
    || null;

  const digerMarkalar = markalar.filter(i => i.id !== anaMarka?.id);

  return {
    anaMarka,
    kurumlar,
    digerMarkalar,
    hepsi: [
      ...(anaMarka ? [anaMarka] : []),
      ...digerMarkalar,
      ...kurumlar
    ]
  };
}

/**
 * Drop'un kime ait olduğu — iki katman, iki alan.
 *
 * Kemal (28 Eylül): "Kurumlar da ürün çıkarabilir ama ana marka altında
 * çıkarır. Küçükçetmi kurumu altında üç dört farklı başlıkta drop serisi
 * çıkarabilirim ama hepsi Kems Company markasının ürünleri olur."
 *
 * Gerçek hayat ile evren arasındaki ayrım:
 *   - brandId  → GERÇEK HAYAT. Ürünü satan. Her zaman Kems Company.
 *   - kurumId  → EVREN. Ürünün adada kimden çıktığı. İsteğe bağlı.
 *
 * Zincir: marka → (kurum) → drop → ürün. Kurumsuz drop da geçerli —
 * Basics 1 gibi doğrudan Kems Company'den çıkan seriler.
 */
export const KURUM_ALANI = 'kurumId';

/**
 * Bir sayfadan drop açılırken yazılacak bağlar. Kurum sayfasından açılan
 * drop'un markası kurumun kendisi değil, ana marka olur.
 *
 * Firestore: `undefined` yazmak bütün kaydı reddettiriyor. O yüzden olmayan
 * alan nesneye hiç konmuyor.
 */
export function dropBaglari(
  kaynak: Item,
  yapi: MarkaYapisi
): { brandId?: string; kurumId?: string } {
  if (!kurumMu(kaynak)) return { brandId: kaynak.id };
  const bag: { brandId?: string; kurumId?: string } = { kurumId: kaynak.id };
  if (yapi.anaMarka) bag.brandId = yapi.anaMarka.id;
  return bag;
}
