import React, { useMemo, useState } from 'react';
import type { Item } from '../types';
import { W5_GORSELLERI, w5GorselAdresi, W5_ETIKETI } from '../lib/w5Gorselleri';
import { ANA_MARKA_KIMLIKLERI, kurumMu } from '../lib/markaYapisi';

/**
 * Galeriye kullanılan görseller (29 Eylül). Kemal: "Galeriye bir tur çektiğin
 * ve kullandığın şeyleri ekle." Galeri boştu; Canva'dan alınan 17 görsel ve
 * ana sayfadaki küçük harita depoda duruyordu ama galeride kaydı yoktu.
 *
 * W5 kartından bağımsız: yalnız galeride eksik olanları ekler, ikinci
 * basışta bir şey yapmaz. Görsel, adı tutan bir maddeye bağlanır.
 */

interface EkGorsel { anahtar: string; baslik: string; adres: string; tur: string; canvaTasarim?: string; hedefId?: string }

const HARITA: EkGorsel = { anahtar: 'harita-kucuk', baslik: 'Düzada haritası (küçük)', adres: '/harita-kucuk.webp', tur: 'harita' };

function gorselListesi(items: Item[]): EkGorsel[] {
  const kems = items.find(i => ANA_MARKA_KIMLIKLERI.includes(i.id))
    ?? items.find(i => i.type === 'marka' && !kurumMu(i) && i.title.trim().toLocaleLowerCase('tr') === 'kems company');
  return [
    ...W5_GORSELLERI.map(g => ({
      anahtar: g.anahtar,
      baslik: g.baslik,
      adres: w5GorselAdresi(g),
      tur: g.tur,
      canvaTasarim: g.canvaTasarim,
      hedefId: g.hedefKimlik === 'kems'
        ? kems?.id
        : g.hedefKimlik
          ? items.find(i => i.id === g.hedefKimlik)?.id
          : g.hedefAd ? items.find(i => !i.archived && kurumMu(i) && g.hedefAd!.test(i.title))?.id : undefined
    })),
    HARITA
  ];
}

export function galeridenEksikler(items: Item[]): EkGorsel[] {
  const var_ = new Set(items
    .filter(i => i.type === 'ilham_gorsel' && !i.archived)
    .map(i => String((i.metadata as Record<string, unknown> | undefined)?.canvaKaynak || '')));
  return gorselListesi(items).filter(g => !var_.has(g.anahtar));
}

const veriyeCevir = async (adres: string) => {
  const yanit = await fetch(adres);
  if (!yanit.ok) throw new Error(String(yanit.status));
  const blob = await yanit.blob();
  return new Promise<string>((coz, red) => {
    const r = new FileReader();
    r.onload = () => coz(String(r.result || ''));
    r.onerror = () => red(new Error('okunamadı'));
    r.readAsDataURL(blob);
  });
};

interface Props {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export const GaleriYedegiKarti: React.FC<Props> = ({ items, onAddItem }) => {
  const eksik = useMemo(() => galeridenEksikler(items), [items]);
  const [calisiyor, setCalisiyor] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);

  const ekle = async () => {
    setCalisiyor(true);
    let n = 0;
    const hatalar: string[] = [];
    try {
      for (const g of eksik) {
        try {
          const veri = await veriyeCevir(g.adres);
          if (!veri.startsWith('data:image/')) { hatalar.push(g.baslik); continue; }
          await onAddItem({
            title: g.baslik,
            area: 'ilham',
            type: 'ilham_gorsel',
            status: 'Galeride',
            priority: 'düşük',
            tags: ['galeri', g.tur, ...(g.canvaTasarim ? ['canva', W5_ETIKETI] : [])],
            links: [],
            notes: '',
            images: [veri],
            isProposal: false,
            archived: false,
            metadata: {
              gorselTuru: g.tur,
              canvaKaynak: g.anahtar,
              ...(g.canvaTasarim ? { canvaTasarim: g.canvaTasarim } : {}),
              ...(g.hedefId ? { bagliId: g.hedefId } : {})
            }
          });
          n++;
        } catch { hatalar.push(g.baslik); }
      }
      setRapor(`${n} görsel galeriye eklendi.` + (hatalar.length ? ` Okunamayan: ${hatalar.join(', ')}. Tekrar basınca yalnız bunlar denenir.` : ''));
    } finally {
      setCalisiyor(false);
    }
  };

  if (!eksik.length) {
    return rapor ? <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{rapor}</p> : null;
  }
  return (
    <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
      <span className="font-mono text-lg font-bold text-[#D6484C] dark:text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">{eksik.length}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">kullanılan görsel galeride yok</span>
        <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
          Canva'dan alınan logolar, armalar, etiketler ve küçük harita. Adı tutan maddeye bağlanır.
          {rapor && <span className="block mt-1">{rapor}</span>}
        </span>
      </span>
      <button type="button" onClick={ekle} disabled={calisiyor} className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer">
        {calisiyor ? 'Ekleniyor…' : 'Galeriye ekle'}
      </button>
    </div>
  );
};

export default GaleriYedegiKarti;
