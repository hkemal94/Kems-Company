import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { Item } from '../types';
import { kanonKararlari } from '../lib/kanonKararlari';

/**
 * Kanon kararları ve eski otel yazıları kartı (29 Eylül akşamı).
 * Sıra Temizlik kartıyla aynı: önce değişecek kayıtların yedeği iner, sonra
 * "Vikiye işle" açılır. Yazılınca iş kalmaz, kart kendini gizler.
 */

interface Props {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
}

export const KanonKarti: React.FC<Props> = ({ items, onUpdateItem }) => {
  const liste = useMemo(() => kanonKararlari(items), [items]);
  const [yedeklendi, setYedeklendi] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);

  const yedekIndir = () => {
    const eskiler = items.filter(i => liste.some(l => l.item.id === i.id));
    const dosya = new Blob([JSON.stringify({
      uygulama: 'Kems Komuta Merkezi',
      tur: 'kanon-kararlari-oncesi-yedek',
      tarih: new Date().toISOString(),
      items: eskiler
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(dosya);
    a.download = `kems-kanon-oncesi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setYedeklendi(true);
  };

  const isle = async () => {
    setCalisiyor(true);
    let n = 0;
    try {
      for (const d of liste) { await onUpdateItem(d.item); n++; }
      setRapor(`${n} madde güncellendi. Yedek dosyası indirilenler klasöründe.`);
    } catch (e) {
      setRapor(`${n} madde yazıldı, sonra hata: ${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`);
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
          <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">kanon kararların ve eski otel yazıları vikiye işlenecek</span>
          <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
            Eskibey Ailesi, Yağ Fabrikası, Küçükkuyu Gençlerbirliği, Eylül Hanım (yalnız ad), Kemsköy adı, antik yerleşim,
            kesinleşen adlar; Ekim 2003 paragrafı, Liman 54 / Peron cümleleri ve Oda Yapısı bölümü silinir. Önce yedek iner.
          </span>
        </span>
      </div>

      <button type="button" onClick={() => setAcik(a => !a)} className="mt-2 flex items-center gap-1 text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#D6484C] cursor-pointer">
        {acik ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {acik ? 'listeyi kapat' : 'neler değişecek?'}
      </button>
      {acik && (
        <ul className="mt-1 max-h-72 overflow-y-auto text-[11px] text-[#0E1C4F] dark:text-[#F3EFE8] divide-y divide-[#CFC5B4]/50 dark:divide-[#2C3C72]">
          {liste.map(d => (
            <li key={d.item.id} className="py-1.5">
              <b className="block">{d.item.title || d.item.id}</b>
              {d.neler.map((n, i) => <span key={i} className="block text-[#6A5E4C] dark:text-[#A6B0C9]">· {n}</span>)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={yedekIndir} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 cursor-pointer">
          <Download className="w-3.5 h-3.5" /> {yedeklendi ? 'Yedek indi ✓' : '1 · Yedeği indir'}
        </button>
        <button
          type="button"
          onClick={isle}
          disabled={!yedeklendi || calisiyor}
          title={yedeklendi ? '' : 'Önce yedeği indir'}
          className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-white hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
        >
          {calisiyor ? 'Yazılıyor…' : '2 · Vikiye işle'}
        </button>
      </div>
      {rapor && <p className="mt-2 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{rapor}</p>}
    </div>
  );
};

export default KanonKarti;
