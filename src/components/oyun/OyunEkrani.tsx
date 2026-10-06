import React from 'react';
import type { Item, AreaType } from '../../types';
import OyunStudyoDefault, { OyunStudyo as OyunStudyoNamed } from './OyunStudyo';

const OyunStudyoComponent = OyunStudyoDefault || OyunStudyoNamed;

/**
 * Oyun sekmesinin kabuğu.
 *
 * Eski otel simülasyonu (#simulasyon ile açılan gizli prototip) SİLİNDİ
 * (29 Eylül, Kemal: "arka tarafta kullanmadığımız ne varsa sil"). Açıldığında
 * 70'ten fazla otel kişisini vikiye yeniden yazıyordu. Oyun ayrı bir depoda
 * (hkemal94/TheImperialKemskoy); burada yalnız stüdyo var.
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

export const OyunEkrani: React.FC<OyunEkraniProps> = (p) => (
  <OyunStudyoComponent
    items={p.items}
    onAddItem={p.onAddItem}
    onUpdateItem={p.onUpdateItem}
    onSelectArea={p.onSelectArea}
    onDeleteItem={p.onDeleteItem}
  />
);

export default OyunEkrani;
