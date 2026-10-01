import React, { useMemo } from 'react';
import { SayfaBasi } from './kabuk/SayfaBasi';
import type { Item } from '../types';
import { durumOranlari } from '../lib/durumOranlari';
import { YuzdeSeridi, type SeritHedefi } from './anasayfa/YuzdeSeridi';
import { Bosluklar } from './Bosluklar';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

const RAY: RayBolumu[] = [
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
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SayfaBasi baslik="Durum" />
      <SayfaRayi baslik="Durum" bolumler={RAY} />
      <section id="durum-yuzdeler" className="scroll-mt-24">
        <YuzdeSeridi oranlar={oranlar} onSec={onSec} ayrintili />
      </section>
      {/* Boşluklar burada (29 Eylül): ayrı sayfası kalktı */}
      <Bosluklar items={items} onUpdateItem={onUpdateItem} gomulu />
    </div>
  );
};

export default Durum;
