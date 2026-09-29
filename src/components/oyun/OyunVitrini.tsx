import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Item } from '../../types';
import { compressImageBase64 } from '../../lib/imageCompressor';
import type { Asama } from './OyunSureci';

/**
 * Oyunun tanıtım künyesi (Paket 5). Kemal (yapısal 1. set): oyun "bir künye
 * gibi kalsın — durum, ekran görüntüleri, açıklama ve özet (depo bağlantısı
 * yok)". Durum süreçten kendiliğinden gelir; özet, açıklama ve görseller
 * Kemal'in. Boş alan boş görünür.
 */

export const TANITIM_ID = 'oyun_tanitim';
const EN_FAZLA_GORSEL = 4;

interface Props {
  items: Item[];
  asama: Asama | null;
  gddDolu: number;
  gddToplam: number;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
}

export const OyunVitrini: React.FC<Props> = ({ items, asama, gddDolu, gddToplam, onAddItem, onUpdateItem }) => {
  const kayit = items.find(i => i.id === TANITIM_ID && !i.archived);
  const meta = (kayit?.metadata || {}) as { ozet?: string; aciklama?: string };
  const gorseller = kayit?.images || [];
  const [ozet, setOzet] = useState(meta.ozet || '');
  const [aciklama, setAciklama] = useState(meta.aciklama || '');
  const [buyuk, setBuyuk] = useState<string | null>(null);
  const dosya = useRef<HTMLInputElement | null>(null);

  const yaz = async (degisen: Partial<Item> & { metadata?: Record<string, unknown> }) => {
    if (kayit) {
      await onUpdateItem({ ...kayit, ...degisen, metadata: { ...kayit.metadata, ...(degisen.metadata || {}) }, updatedAt: Date.now() });
    } else {
      await onAddItem({
        id: TANITIM_ID,
        title: 'Oyun tanıtımı',
        area: 'oyun',
        type: 'oyun_tanitim',
        status: 'Fikir',
        priority: 'orta',
        tags: ['oyun', 'tanitim'],
        links: [],
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        ...degisen,
        metadata: { ...(degisen.metadata || {}) }
      });
    }
  };

  const metinKaydet = (alan: 'ozet' | 'aciklama', deger: string) => {
    if ((meta[alan] || '') === deger) return;
    void yaz({ metadata: { ...meta, [alan]: deger } });
  };

  const gorselEkle = async (liste: FileList | null) => {
    if (!liste) return;
    const yeni: string[] = [];
    for (const f of Array.from(liste).slice(0, EN_FAZLA_GORSEL - gorseller.length)) {
      const ham = await new Promise<string>(coz => { const r = new FileReader(); r.onload = () => coz(String(r.result)); r.readAsDataURL(f); });
      yeni.push(await compressImageBase64(ham, 1100, 700, 0.72));
    }
    if (yeni.length) await yaz({ images: [...gorseller, ...yeni] });
  };

  const gorselKaldir = (g: string) => void yaz({ images: gorseller.filter(x => x !== g) });

  const kutu = 'w-full text-[13px] bg-white dark:bg-[#17345A] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-2.5 focus:outline-hidden focus:border-[#F26B6F]';

  return (
    <section id="oy-vitrin" className="scroll-mt-24 rounded-2xl bg-[#0E1C4F] dark:bg-[#13204A] dark:border dark:border-[#2C3C72] text-[#F3EFE8] p-4 lg:p-5">
      <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#A6B0C9]">Oyun · tanıtım</div>
      <div className="mt-2 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-full bg-[#F26B6F] text-white text-[11px] font-semibold">
              Durum: {asama ? `${asama.ad} (${asama.terim})` : 'başlamadı'}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-semibold">
              Tasarım belgesi: {gddDolu}/{gddToplam} seçim
            </span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A6B0C9] mb-1">Özet · tek cümle</div>
            <input value={ozet} onChange={e => setOzet(e.target.value)} onBlur={() => metinKaydet('ozet', ozet.trim())} placeholder="Oyunu tek cümleyle anlat…" className={kutu} />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A6B0C9] mb-1">Açıklama</div>
            <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} onBlur={() => metinKaydet('aciklama', aciklama.trim())} rows={4} placeholder="Tanıtım metni — sen yazıyorsun…" className={kutu} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#A6B0C9] mb-1">Ekran görüntüleri · en fazla {EN_FAZLA_GORSEL}</div>
          <div className="grid grid-cols-2 gap-2">
            {gorseller.map(g => (
              <div key={g.slice(-40)} className="relative group rounded-lg overflow-hidden bg-white/10 aspect-video">
                <button type="button" onClick={() => setBuyuk(g)} className="block w-full h-full cursor-zoom-in"><img src={g} alt="" className="w-full h-full object-cover" /></button>
                <button type="button" onClick={() => gorselKaldir(g)} title="Kaldır" className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 cursor-pointer"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {gorseller.length < EN_FAZLA_GORSEL && (
              <button type="button" onClick={() => dosya.current?.click()} className="aspect-video rounded-lg border border-dashed border-white/30 flex flex-col items-center justify-center gap-1 text-[11px] text-[#C9D0E3] hover:border-[#F26B6F] cursor-pointer">
                <ImagePlus className="w-5 h-5" /> Görsel ekle
              </button>
            )}
          </div>
          <input ref={dosya} type="file" accept="image/*" multiple className="hidden" onChange={e => { void gorselEkle(e.target.files); e.target.value = ''; }} />
        </div>
      </div>
      {buyuk && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setBuyuk(null)}>
          <img src={buyuk} alt="" className="max-w-full max-h-[90vh] rounded-xl" />
        </div>
      )}
    </section>
  );
};

export default OyunVitrini;
