import React, { Suspense, lazy, useMemo } from 'react';
import { SayfaBasi } from '../kabuk/SayfaBasi';
import type { Item } from '../../types';
import { markaYapisi } from '../../lib/markaYapisi';

// three.js büyük; yalnız bu sayfa açılınca yüklenir
const Studyo3B = lazy(() => import('./Studyo3B'));

/** 3B stüdyo kendi sayfasında (30 Eylül: menüde kendi satırı) */
export const Studyo3BSayfasi: React.FC<{
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}> = ({ items, onUpdateItem, onAddItem }) => {
  const urunler = useMemo(() => items.filter(i => i.type === 'merch_urun'), [items]);
  const kurumlar = useMemo(() => markaYapisi(items).kurumlar, [items]);
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <SayfaBasi baslik="3B stüdyo" />
      <Suspense fallback={<div className="h-[60vh] rounded-2xl bg-[#F3EFE8] dark:bg-[#13204A] animate-pulse" />}>
        <Studyo3B items={items} urunler={urunler} kurumlar={kurumlar} onUpdateItem={onUpdateItem} onAddItem={onAddItem} />
      </Suspense>
    </div>
  );
};

export default Studyo3BSayfasi;
