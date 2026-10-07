import type { Item } from '../types';
import { boslukDoldurma } from './boslukDoldurma';
import { silinecekler } from './temizlik';
import { mahalleAdDuzeltmeleri } from './vikiTemizligi';
import { galeridenEksikler } from '../components/GaleriYedegiKarti';

/**
 * Neyin Eksik'te basılmayı bekleyen tek seferlik düğmeler (bildirimler).
 * Kartların göründüğü koşulların aynısı; kart yoksa liste boş. Harita
 * düzeni ayrı bir belgede durduğu için dışarıdan verilir.
 *
 * 29 Eylül: işi biten göç kartları (viki sıfırlama, tema, marka yapısı,
 * otel temizliği, ø, boş projeler) silindi; yerine Temizlik kartı geldi.
 * 2 Ekim gece: soru-cevap, W3, W4, W5, kanon kararları, viki düzeni ve
 * koordinat kartları da işini bitirdi, silindi.
 */
export function bekleyenDugmeler(items: Item[], haritaEskiKoordinatta = false): string[] {
  if (!items.length) return [];
  const is: string[] = [];
  if (mahalleAdDuzeltmeleri(items).length) is.push('mahalle adlarındaki parantez');
  if (silinecekler(items).length) is.push('temizlik');
  if (galeridenEksikler(items).length) is.push('galeriye görseller');
  if (haritaEskiKoordinatta) is.push('harita düzeni yeni koordinata');
  if (boslukDoldurma(items).length) is.push('boşlukları künyeden doldur');
  return is;
}
