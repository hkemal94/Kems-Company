import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import type { Item } from '../types';
import { kitapBilgisi, kitapEpub, kitapPdf } from '../lib/kitapCiktisi';

/**
 * Kitabı indir (7. gece, 8 Ekim). Kitap kartında "PDF · EPUB"; açılan
 * kutuda bölümler işaretlenir (Kemal: "inerken seçeyim") ve yazar adı
 * yazılır. Yazar adı yalnız "İndir"e basınca kitabın kaydına yazılır,
 * bir sonraki indirmede hazır gelir.
 */
export const KitapIndir: React.FC<{
  kitap: Item;
  bolumler: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
}> = ({ kitap, bolumler, onUpdateItem }) => {
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState<Set<string>>(() => new Set(bolumler.map(b => b.id)));
  const [yazar, setYazar] = useState(String(kitap.metadata?.yazar || ''));
  const [calisiyor, setCalisiyor] = useState<'pdf' | 'epub' | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const ac = () => { setSecili(new Set(bolumler.map(b => b.id))); setYazar(String(kitap.metadata?.yazar || '')); setHata(null); setAcik(true); };

  const indir = async (tur: 'pdf' | 'epub') => {
    if (calisiyor) return;
    setCalisiyor(tur); setHata(null);
    try {
      if (yazar.trim() !== String(kitap.metadata?.yazar || '')) {
        await onUpdateItem({ ...kitap, metadata: { ...(kitap.metadata || {}), yazar: yazar.trim() }, updatedAt: Date.now() });
      }
      const k = kitapBilgisi(kitap, bolumler.filter(b => secili.has(b.id)), yazar);
      if (tur === 'pdf') await kitapPdf(k);
      else kitapEpub(k, `kems-kitap-${kitap.id}`);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İndirilemedi.');
    } finally { setCalisiyor(null); }
  };

  const degistir = (id: string) => setSecili(s => { const y = new Set(s); if (y.has(id)) y.delete(id); else y.add(id); return y; });
  const dugme = 'min-h-9 px-3 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer';

  return (
    <>
      <button type="button" onClick={ac} title="Kitabı PDF ya da EPUB olarak indir"
        className="text-[11px] font-mono underline underline-offset-2 decoration-[#0E1C4F]/30 text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#F26B6F] cursor-pointer">
        indir · PDF · EPUB
      </button>
      {acik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1C4F]/40 p-4" onClick={() => setAcik(false)}>
          <div role="dialog" aria-label="Kitabı indir" onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] p-5 space-y-4">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#6A5E4C] dark:text-[#A6B0C9]">Kitabı indir</div>
                <div className="text-[16px] font-bold text-[#0E1C4F] dark:text-[#F3EFE8] truncate">{kitap.title}</div>
              </div>
              <button type="button" aria-label="Kapat" onClick={() => setAcik(false)} className="cursor-pointer"><X className="w-4 h-4 text-[#6A5E4C]" /></button>
            </div>

            <label className="block">
              <span className="block mb-1 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Yazar adı (kapakta; boş bırakırsan yazılmaz)</span>
              <input value={yazar} onChange={e => setYazar(e.target.value)}
                className="w-full min-h-9 px-3 rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-white dark:bg-[#17345A] text-[13px] text-[#0E1C4F] dark:text-[#F3EFE8] focus:outline-hidden focus:border-[#F26B6F]" />
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bölümler · {secili.size} / {bolumler.length}</span>
                <button type="button" onClick={() => setSecili(new Set(bolumler.map(b => b.id)))} className="text-[11px] text-[#D6484C] dark:text-[#F26B6F] hover:underline cursor-pointer">hepsi</button>
                <button type="button" onClick={() => setSecili(new Set())} className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] hover:underline cursor-pointer">hiçbiri</button>
              </div>
              {bolumler.length ? (
                <ul className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] divide-y divide-[#CFC5B4]/60 dark:divide-[#2C3C72]">
                  {bolumler.map((b, n) => (
                    <li key={b.id}>
                      <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                        <input type="checkbox" checked={secili.has(b.id)} onChange={() => degistir(b.id)} className="accent-[#F26B6F]" />
                        <span className="flex-1 min-w-0 truncate text-[13px] text-[#0E1C4F] dark:text-[#F3EFE8]">{n + 1}. {b.title || 'Adsız bölüm'}</span>
                        <span className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9]">{b.status}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[12px] italic text-[#6A5E4C] dark:text-[#A6B0C9]">Bu kitapta henüz bölüm yok.</p>}
            </div>

            <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
              Başta kapak, içindekiler ve (yazılıysa) kitap notu olur. PDF kitap boyunda (A5).
            </p>
            {hata && <p className="text-[12px] text-[#B23A40] dark:text-[#F26B6F]">{hata}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!secili.size || !!calisiyor} onClick={() => void indir('pdf')} className={dugme}>
                <Download className="w-3.5 h-3.5" /> {calisiyor === 'pdf' ? 'Hazırlanıyor…' : 'PDF indir'}
              </button>
              <button type="button" disabled={!secili.size || !!calisiyor} onClick={() => void indir('epub')} className={dugme}>
                <Download className="w-3.5 h-3.5" /> {calisiyor === 'epub' ? 'Hazırlanıyor…' : 'EPUB indir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KitapIndir;
