import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Trash2 } from 'lucide-react';
import type { Item } from '../types';
import { silinecekler, silmeOzeti } from '../lib/temizlik';

/**
 * Temizlik kartı (29 Eylül). Kemal: "Arka tarafta kullanmadığımız ne varsa
 * sil, arşiv işi beni sinirlendirdi." Silinecekler `lib/temizlik.ts`'de.
 *
 * Silme geri alınamaz; o yüzden sıra sabit: önce yedek iner (bütün
 * kayıtlar, bir .json dosyası), sonra "Sil" açılır. İkinci basışta silinecek
 * bir şey kalmaz, kart kendini gizler.
 */

interface Props {
  items: Item[];
  onDeleteItem: (id: string) => Promise<void>;
}

export const TemizlikKarti: React.FC<Props> = ({ items, onDeleteItem }) => {
  const liste = useMemo(() => silinecekler(items), [items]);
  const [yedeklendi, setYedeklendi] = useState(false);
  const [onay, setOnay] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);

  const yedekIndir = () => {
    const dosya = new Blob([JSON.stringify({
      uygulama: 'Kems Komuta Merkezi',
      tur: 'temizlik-oncesi-yedek',
      tarih: new Date().toISOString(),
      items
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(dosya);
    a.download = `kems-temizlik-oncesi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setYedeklendi(true);
  };

  const sil = async () => {
    setOnay(false);
    setCalisiyor(true);
    let n = 0;
    try {
      for (const s of liste) { await onDeleteItem(s.item.id); n++; }
      setRapor(`${n} kayıt silindi. Yedek dosyası indirilenler klasöründe.`);
    } catch (e) {
      setRapor(`${n} kayıt silindi, sonra hata: ${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`);
    } finally {
      setCalisiyor(false);
    }
  };

  if (!liste.length) {
    return rapor ? (
      <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{rapor}</p>
    ) : null;
  }

  return (
    <div className="mb-2.5 rounded-xl border border-[#F26B6F]/50 bg-[#FAF8F5] dark:bg-[#13204A] px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="font-mono text-lg font-bold text-[#D6484C] dark:text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">{liste.length}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">kullanılmayan kayıt silinecek</span>
          <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
            {silmeOzeti(liste)}. Önce bütün kayıtların yedeği iner, sonra silinir. Silinen geri gelmez.
          </span>
        </span>
      </div>

      <button type="button" onClick={() => setAcik(a => !a)} className="mt-2 flex items-center gap-1 text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#D6484C] cursor-pointer">
        {acik ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {acik ? 'listeyi kapat' : 'neler silinecek?'}
      </button>
      {acik && (
        <ul className="mt-1 max-h-60 overflow-y-auto text-[11px] text-[#0E1C4F] dark:text-[#F3EFE8] divide-y divide-[#CFC5B4]/50 dark:divide-[#2C3C72]">
          {liste.map(s => (
            <li key={s.item.id} className="py-1 flex gap-2">
              <span className="flex-1 min-w-0 truncate">{s.item.title || s.item.id}</span>
              <span className="shrink-0 text-[#6A5E4C] dark:text-[#A6B0C9]">{s.neden}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={yedekIndir} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 cursor-pointer">
          <Download className="w-3.5 h-3.5" /> {yedeklendi ? 'Yedek indi ✓' : '1 · Yedeği indir'}
        </button>
        {onay ? (
          <>
            <span className="text-[11px] font-semibold text-[#D6484C] dark:text-[#F26B6F]">{liste.length} kayıt kalıcı olarak silinsin mi?</span>
            <button type="button" onClick={() => setOnay(false)} className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] cursor-pointer">Vazgeç</button>
            <button type="button" onClick={sil} className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-white hover:opacity-90 cursor-pointer">Evet, sil</button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOnay(true)}
            disabled={!yedeklendi || calisiyor}
            title={yedeklendi ? '' : 'Önce yedeği indir'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#F26B6F] text-[#D6484C] dark:text-[#F26B6F] hover:bg-[#F26B6F]/10 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> {calisiyor ? 'Siliniyor…' : '2 · Sil'}
          </button>
        )}
      </div>
      {rapor && <p className="mt-2 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{rapor}</p>}
    </div>
  );
};

export default TemizlikKarti;
