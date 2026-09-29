import type { Item } from '../types';
import { soruCevapAktarimi } from './soruCevapAktarimi';
import { w3Aktarimi } from './w3Aktarimi';
import { w4Aktarimi } from './w4Aktarimi';
import { w5Aktarimi } from './w5Aktarimi';
import { eskiYaziTemizligi } from './eskiYaziTemizligi';
import { silinecekler } from './temizlik';
import { galeridenEksikler } from '../components/GaleriYedegiKarti';

/**
 * Neyin Eksik'te basılmayı bekleyen tek seferlik düğmeler (bildirimler).
 * Kartların göründüğü koşulların aynısı; kart yoksa liste boş. Harita
 * düzeni ayrı bir belgede durduğu için dışarıdan verilir.
 *
 * 29 Eylül: işi biten göç kartları (viki sıfırlama, tema, marka yapısı,
 * otel temizliği, ø, boş projeler) silindi; yerine Temizlik kartı geldi.
 */
export function bekleyenDugmeler(items: Item[], haritaEskiKoordinatta = false): string[] {
  if (!items.length) return [];
  const is: string[] = [];
  if (silinecekler(items).length) is.push('temizlik');
  if (galeridenEksikler(items).length) is.push('galeriye görseller');
  if (w3Aktarimi(items).guncellenenler.length) is.push('W3 soru-cevapları');
  if (w4Aktarimi(items).guncellenenler.length) is.push('W4 soru-cevapları');
  if (haritaEskiKoordinatta) is.push('harita düzeni yeni koordinata');
  if (eskiYaziTemizligi(items).degisenler.length) is.push('eski otel yazıları');
  const w5 = w5Aktarimi(items);
  if (w5.guncellenenler.length + w5.gorseller.length) is.push('W5 viki düzeltmeleri');
  const sc = soruCevapAktarimi(items);
  if (sc.yeniler.length + sc.guncellenenler.length) is.push('soru-cevap aktarımı');
  return is;
}
