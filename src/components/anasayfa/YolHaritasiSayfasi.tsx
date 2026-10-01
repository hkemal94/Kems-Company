import React, { useMemo } from 'react';
import { SayfaBasi } from '../kabuk/SayfaBasi';
import type { Item } from '../../types';
import { durumOranlari } from '../../lib/durumOranlari';
import { KkmPaneli } from './KkmPaneli';

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
      <SayfaBasi baslik="Yol haritası" />
      <KkmPaneli items={items} oranlar={oranlar} eposta={eposta} onUpdateItem={onUpdateItem} onAddItem={onAddItem} />
    </div>
  );
};

export default YolHaritasiSayfasi;
