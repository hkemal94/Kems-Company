import type { SinirHatlari } from './sinirBolgeleri';

/**
 * Harita düzeni kaydının biçimi (H1).
 *
 * Ayrı dosyada, çünkü uygulamanın ana paketi bunu okuyor; `duzenKatmani`
 * ise 1 MB'lık harita verisini içeri çekiyor ve yalnızca harita sekmesi
 * açılınca yüklenmeli.
 *
 * Sonraki paketler bu kayda alan ekleyecek (H3 mekânlar, H5 gizlenen
 * yapılar). `surum` bunun için var.
 */
export const DUZEN_SURUMU = 1;

/**
 * Bir mekânın elle yapılmış düzeltmesi (H3).
 *
 * İki ayrı işi görür:
 *   - üreteçten gelen bir yapının taşınması, adının değişmesi, silinmesi
 *   - haritaya elle eklenen yeni bir mekân (`yeni: true`)
 *
 * Yalnız değişen alanlar yazılır; dokunulmayanlar üreteçten gelmeye devam
 * eder. Böylece `gen/duzada.py` yeniden çalıştığında elle yapılan iş durur.
 */
export interface MekanKaydi {
  /** Üretilmiş bir yapının düzeltmesi değil, elle eklenmiş mekân */
  yeni?: boolean;
  ad?: string;
  tur?: string;
  /** Taşındıysa tabanın yeni merkezi — [boylam, enlem] */
  konum?: [number, number];
  /** Haritadan kaldırıldı. Üretilmiş yapı silinmez, gizlenir. */
  silindi?: boolean;
  /** Konumdan bulunan mahalle — bilgi amaçlı, wiki eşleşmesi için */
  mahalle?: string | null;
  wikiId?: string | null;
  /** Yeni mekânlar: taban kotu ve kat yüksekliği (metre) */
  taban?: number;
  yukseklik?: number;
  /** Yeni mekânlar: taban kenarının yarısı (derece) */
  yaricap?: number;
}

export type MekanDuzeni = Record<string, MekanKaydi>;

export interface HaritaDuzeni {
  surum: number;
  /** ms cinsinden son değişiklik zamanı */
  guncelleme: number;
  /** Sınır hatları — yalnız üreteçten farklı olanların kontrol noktaları */
  hatlar: SinirHatlari;
  /** Yollar — yalnız üreteçten farklı olanların kontrol noktaları */
  yollar: SinirHatlari;
  /**
   * Mekânlar (H3). Eski kayıtlarda yok — okurken boş kabul edilir, bu yüzden
   * isteğe bağlı. Firestore kuralı yalnız ilk dört alanın varlığına bakıyor,
   * bu alan kuralı bozmuyor.
   */
  mekanlar?: MekanDuzeni;
}
