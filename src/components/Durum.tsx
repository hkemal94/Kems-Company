import React, { useMemo } from 'react';
import type { Item } from '../types';
import { durumOranlari } from '../lib/durumOranlari';
import { YuzdeSeridi, type SeritHedefi } from './anasayfa/YuzdeSeridi';

/**
 * Durum (29 Eylül). Kemal: "Yüzdeler güzel, alttakiler artık gereksiz."
 * Eski Komuta Merkezi'nin projeler, bu hafta, son dokunulan, evren özeti ve
 * yapay zekâ köşesi bölümleri silindi; kanallar Markalar → Kems Company'ye
 * taşındı. Burada yalnız yüzdeler, sayılarıyla.
 */
export const Durum: React.FC<{ items: Item[]; onSec: (h: SeritHedefi) => void }> = ({ items, onSec }) => {
  const oranlar = useMemo(() => durumOranlari(items), [items]);
  const tarih = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6A5E4C] dark:text-[#A6B0C9]">{tarih}</div>
        <h1 className="mt-1 font-bold text-[24px] tracking-tight text-[#0E1C4F] dark:text-[#F3EFE8]">Durum</h1>
        <p className="mt-1 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">Her kart kendi sayfasına götürür. Sayılar kayıtlardan sayılır; kayıt yoksa "–".</p>
      </div>
      <YuzdeSeridi oranlar={oranlar} onSec={onSec} ayrintili />
    </div>
  );
};

export default Durum;
