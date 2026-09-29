import { useMemo } from 'react';
import type { Item, WikiSection } from '../types';
import { bekleyenAdaylar, eskiOneriler, sorulacaklar } from './adaylar';
import { bekleyenDugmeler } from './bekleyenIsler';
import { tarihUyarilari } from './kanonTarihleri';
import { useHaritaDuzeni } from './haritaDuzeni';

/**
 * Bildirimler — menüdeki kırmızı nokta (Paket 4).
 *
 * Kemal'in seçimi (29 Eylül): onay bekleyen aday, tek seferlik düğme,
 * kanon uyarısı, günün sorusu — dördü de. Şimdilik yalnız uygulama içi;
 * telefon bildirimi ve e-posta ayrı bir iş.
 */

export type BildirimTuru = 'aday' | 'dugme' | 'kanon' | 'soru';

export interface Bildirim {
  tur: BildirimTuru;
  sayi: number;
  baslik: string;
  ayrinti: string;
  /** Kanon uyarısında sorunlu maddeler */
  maddeler?: Item[];
}

const CEVAP_ANAHTARI = 'kems_gunun_sorusu';
const bugun = () => new Date().toISOString().slice(0, 10);

/** Günün sorusu bugün cevaplandı ya da ertelendi */
export function gununSorusuBitti() {
  try { localStorage.setItem(CEVAP_ANAHTARI, bugun()); } catch { /* yok */ }
}
function gununSorusuBittiMi(): boolean {
  try { return localStorage.getItem(CEVAP_ANAHTARI) === bugun(); } catch { return false; }
}

const KANON_TURLERI = new Set(['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'olay', 'kitap_bolum', 'blog_post']);

/** Metninde kanonla çelişen bir tarih geçen maddeler */
export function kanonUyarililar(items: Item[]): Item[] {
  return items.filter(i => {
    if (i.archived || !KANON_TURLERI.has(i.type)) return false;
    const bolumler = ((i.metadata?.wikiSections as WikiSection[] | undefined) || []).map(b => b.content || '').join('\n\n');
    return tarihUyarilari([i.notes || '', bolumler].join('\n\n')).length > 0;
  });
}

export function useBildirimler(items: Item[], yenile = 0): Bildirim[] {
  const harita = useHaritaDuzeni();
  const haritaEski = !!(harita.duzen?.eskiKoordinat && harita.ilkYukleme);
  return useMemo(() => {
    if (!items.length) return [];
    const liste: Bildirim[] = [];
    const aday = bekleyenAdaylar(items).length + eskiOneriler(items).length;
    if (aday) liste.push({ tur: 'aday', sayi: aday, baslik: 'Onay bekleyen aday', ayrinti: 'Ana sayfada, Adaylar kutusunda' });
    if (!gununSorusuBittiMi() && sorulacaklar(items, 1).length) {
      liste.push({ tur: 'soru', sayi: 1, baslik: 'Günün sorusu', ayrinti: 'Henüz cevaplanmadı' });
    }
    const dugme = bekleyenDugmeler(items, haritaEski);
    if (dugme.length) liste.push({ tur: 'dugme', sayi: dugme.length, baslik: 'Tek seferlik düğme bekliyor', ayrinti: dugme.join(' · ') });
    const kanon = kanonUyarililar(items);
    if (kanon.length) liste.push({ tur: 'kanon', sayi: kanon.length, baslik: 'Kanon uyarısı', ayrinti: 'Metinde kanonla çelişen tarih', maddeler: kanon.slice(0, 5) });
    return liste;
    // `yenile`: günün sorusu cevaplanınca liste yeniden hesaplansın
  }, [items, haritaEski, yenile]); // eslint-disable-line react-hooks/exhaustive-deps
}
