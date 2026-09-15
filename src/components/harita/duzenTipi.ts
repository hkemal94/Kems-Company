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

export interface HaritaDuzeni {
  surum: number;
  /** ms cinsinden son değişiklik zamanı */
  guncelleme: number;
  /** Sınır hatları — yalnız üreteçten farklı olanların kontrol noktaları */
  hatlar: SinirHatlari;
  /** Yollar — yalnız üreteçten farklı olanların kontrol noktaları */
  yollar: SinirHatlari;
}
