import React, { useState } from 'react';
import type { Item, AreaType } from '../../types';
import OyunStudyo from './OyunStudyo';
import Oyun from '../Oyun';

/**
 * Oyun sekmesinin kabuğu.
 *
 * Kemal eski ekran için "fazla simülasyon ağırlıklı" dedi; ama o ekranda
 * gerçek iş var — otelin gün şablonu, işlemler, simülasyon gezintisi.
 * Silmiyoruz, ikinci plana alıyoruz: açılışta stüdyo süreci geliyor,
 * simülasyon bir tık uzakta duruyor.
 */

export interface OyunEkraniProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onNavigateToTab: (tabName: string, itemId?: string | null) => void;
  onSelectArea?: (area: AreaType, itemId?: string) => void;
}

export const OyunEkrani: React.FC<OyunEkraniProps> = (p) => {
  const [mod, setMod] = useState<'studyo' | 'simulasyon'>('studyo');

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-5">
        {([
          ['studyo', 'Stüdyo'],
          ['simulasyon', 'Simülasyon']
        ] as const).map(([id, ad]) => (
          <button
            key={id}
            onClick={() => setMod(id)}
            className={`px-3 py-1.5 text-[11px] font-mono rounded-lg border cursor-pointer transition-colors
              ${mod === id
                ? 'border-[#F26B6F] text-[#F26B6F]'
                : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#F26B6F]'}`}
          >
            {ad}
          </button>
        ))}
      </div>

      {mod === 'studyo' ? (
        <OyunStudyo
          items={p.items}
          onAddItem={p.onAddItem}
          onUpdateItem={p.onUpdateItem}
          onSelectArea={p.onSelectArea}
        />
      ) : (
        <Oyun
          items={p.items}
          activeItemId={p.activeItemId}
          onSelectItem={p.onSelectItem}
          onUpdateItem={p.onUpdateItem}
          onDeleteItem={p.onDeleteItem}
          onAddItem={p.onAddItem}
          onNavigateToTab={p.onNavigateToTab}
        />
      )}
    </div>
  );
};

export default OyunEkrani;
