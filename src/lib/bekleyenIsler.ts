import type { Item } from '../types';
import { oTemizligi } from './yaziTemizligi';
import { temaDurumu } from './temaKaldirma';
import { markaGocu } from './markaYapisi';
import { otelTemizligi } from './otelTemizligi';
import { vikiSifirlama } from './vikiSifirlama';
import { soruCevapAktarimi } from './soruCevapAktarimi';
import { w3Aktarimi } from './w3Aktarimi';
import { w4Aktarimi } from './w4Aktarimi';
import { w5Aktarimi } from './w5Aktarimi';
import { eskiYaziTemizligi } from './eskiYaziTemizligi';
import { bosProjeler } from '../components/Eksikler';

/**
 * Neyin Eksik'te basılmayı bekleyen tek seferlik düğmeler (Paket 4,
 * bildirimler). Kartların göründüğü koşulların aynısı; kart yoksa liste
 * boş. Harita düzeni ayrı bir belgede durduğu için dışarıdan verilir.
 */
export function bekleyenDugmeler(items: Item[], haritaEskiKoordinatta = false): string[] {
  if (!items.length) return [];
  const is: string[] = [];
  if (vikiSifirlama(items).arsivlenecek.length) is.push('viki baştan kurulumu');
  if (w3Aktarimi(items).guncellenenler.length) is.push('W3 soru-cevapları');
  if (w4Aktarimi(items).guncellenenler.length) is.push('W4 soru-cevapları');
  if (haritaEskiKoordinatta) is.push('harita düzeni yeni koordinata');
  if (eskiYaziTemizligi(items).degisenler.length) is.push('eski otel yazıları');
  const w5 = w5Aktarimi(items);
  if (w5.guncellenenler.length + w5.gorseller.length) is.push('W5 viki düzeltmeleri');
  const sc = soruCevapAktarimi(items);
  if (sc.yeniler.length + sc.guncellenenler.length) is.push('soru-cevap aktarımı');
  if (oTemizligi(items).degisenler.length) is.push('ø → ö yazım düzeltmesi');
  const m = markaGocu(items);
  if (m.tipiDegisecek.length || m.baglanacakDrop.length) is.push('marka yapısı');
  if (otelTemizligi(items).degisenler.length) is.push('otel temizliği');
  if (temaDurumu(items).temalar.length) is.push('tema katmanı');
  if (bosProjeler(items).length) is.push('boş projeler');
  return is;
}
