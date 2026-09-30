import React, { useMemo } from 'react';
import type { Item } from '../types';
import { durumOranlari } from '../lib/durumOranlari';
import { YuzdeSeridi, type SeritHedefi } from './anasayfa/YuzdeSeridi';
import { Bosluklar } from './Bosluklar';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';
import { KkmPaneli } from './anasayfa/KkmPaneli';

const RAY: RayBolumu[] = [
  { id: 'durum-kkm', label: 'Sıradaki işler' },
  { id: 'yol-haritasi', label: 'Yol haritası' },
  { id: 'durum-yuzdeler', label: 'Yüzdeler' },
  { id: 'bos-ozet', label: 'Boşluklar' },
  { id: 'bos-liste', label: 'Boş alanlar' }
];

/**
 * Durum (29 Eylül). Kemal: "Yüzdeler güzel, alttakiler artık gereksiz."
 * Eski Komuta Merkezi'nin projeler, bu hafta, son dokunulan, evren özeti ve
 * yapay zekâ köşesi bölümleri silindi; kanallar Markalar → Kems Company'ye
 * taşındı. Burada yüzdeler, sayılarıyla; altında Boşluklar (Kemal:
 * "Durum ile boşlukları birleştir, birbirine çok yakın başlıklar").
 */
export const Durum: React.FC<{
  items: Item[];
  onSec: (h: SeritHedefi) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  /** Haftalık özetin gideceği adres: Kemal'in kendi Google hesabı */
  eposta?: string | null;
}> = ({ items, onSec, onUpdateItem, onAddItem, eposta }) => {
  const oranlar = useMemo(() => durumOranlari(items), [items]);
  const tarih = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6A5E4C] dark:text-[#A6B0C9]">{tarih}</div>
        <h1 className="mt-1 font-bold text-[24px] tracking-tight text-[#0E1C4F] dark:text-[#F3EFE8]">Durum</h1>
        <p className="mt-1 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">Her kart kendi sayfasına götürür. Sayılar kayıtlardan sayılır; kayıt yoksa "–".</p>
      </div>
      <SayfaRayi baslik="Durum" bolumler={RAY} />
      <section id="durum-kkm" className="scroll-mt-24">
        <KkmPaneli items={items} oranlar={oranlar} eposta={eposta} onUpdateItem={onUpdateItem} onAddItem={onAddItem} />
      </section>
      <section id="durum-yuzdeler" className="scroll-mt-24">
        <YuzdeSeridi oranlar={oranlar} onSec={onSec} ayrintili />
      </section>
      {/* Boşluklar burada (29 Eylül): ayrı sayfası kalktı */}
      <Bosluklar items={items} onUpdateItem={onUpdateItem} gomulu />
    </div>
  );
};

export default Durum;
