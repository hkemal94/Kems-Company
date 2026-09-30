import React, { useMemo } from 'react';
import type { Item } from '../../types';
import { durumOranlari } from '../../lib/durumOranlari';
import { KkmPaneli } from './KkmPaneli';
import { ETIKET, IKINCIL, YAZI } from './stil';

/** Yol haritası kendi sayfasında (30 Eylül: menüde kendi satırı) */
export const YolHaritasiSayfasi: React.FC<{
  items: Item[];
  eposta?: string | null;
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}> = ({ items, eposta, onUpdateItem, onAddItem }) => {
  const oranlar = useMemo(() => durumOranlari(items), [items]);
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <div className={ETIKET}>Araçlar</div>
        <h1 className={`mt-1 text-[22px] lg:text-[28px] font-bold tracking-tight ${YAZI}`}>Yol haritası</h1>
        <p className={`mt-1 text-[13px] ${IKINCIL}`}>Karar verilmiş ama uygulamada henüz olmayan işler, sıradaki üç iş, hedefler ve haftalık özet.</p>
      </div>
      <KkmPaneli items={items} oranlar={oranlar} eposta={eposta} onUpdateItem={onUpdateItem} onAddItem={onAddItem} />
    </div>
  );
};

export default YolHaritasiSayfasi;
