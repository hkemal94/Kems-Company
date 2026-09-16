import React, { useMemo, useState } from 'react';
import { PenTool, BookOpen, Library } from 'lucide-react';
import Blog from './Blog';
import Kitap from './Kitap';
import { Item } from '../types';
import {
  ORNEK_PROJE_ID, ornekProje, ornekBolumler
} from '../data/hikayeOrnekleri';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'blog', label: 'Blog & İçerik' },
  { id: 'kitap', label: 'Kitap & Roman' }
];

interface YaziAtolyesiProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export default function YaziAtolyesi({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}: YaziAtolyesiProps) {
  const [subTab, setSubTab] = useState<'blog' | 'kitap'>('blog');

  /**
   * Açılış zinciri örneği (16 Eylül).
   *
   * Kemal hikâyeyi sıfırdan yazacak ama eldeki kurgu kaybolmasın istedi.
   * Bu düğme onu Kitap atölyesine bir ÖRNEK proje olarak getiriyor: altı
   * bölüm künyesi, kıymıklar, motifler ve beş yazım kuralı. Hepsi "öneri"
   * işaretli — kanon değil, yazarken bakılacak iskelet.
   */
  const ornekVar = useMemo(
    () => items.some(i => i.id === ORNEK_PROJE_ID),
    [items]
  );
  const [ornekKuruluyor, setOrnekKuruluyor] = useState(false);

  const ornegiGetir = async () => {
    if (ornekVar || ornekKuruluyor) return;
    setOrnekKuruluyor(true);
    try {
      await onAddItem(ornekProje());
      for (const b of ornekBolumler()) await onAddItem(b);
      setSubTab('kitap');
      onSelectItem(ORNEK_PROJE_ID);
    } finally {
      setOrnekKuruluyor(false);
    }
  };

  return (
    <div className="space-y-6">

      <SayfaRayi
        baslik="Yazı İşleri"
        bolumler={RAY_BOLUMLERI}
        aktifId={subTab}
        onSec={id => { setSubTab(id as typeof subTab); onSelectItem(null); }}
      />

      {/* Sub-tab switcher to unite blog and books in a single hub */}
      <div className="flex gap-2 border-b border-[#CFC5B4] pb-1">
        <button
          type="button"
          onClick={() => { setSubTab('blog'); onSelectItem(null); }}
          className={`px-4 py-2.5 text-xs font-mono font-bold flex items-center gap-2 rounded-t-lg transition-all border-t border-x ${
            subTab === 'blog'
              ? 'bg-[#F3EFE8] dark:bg-[#13204A] border-[#CFC5B4] text-[#1B2A4A] dark:text-[#F3EFE8] -mb-[5px] pb-3'
              : 'border-transparent text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8]/50'
          }`}
        >
          <PenTool className="w-4 h-4 text-[#D35057]" />
          <span>Blog & İçerik Atölyesi</span>
        </button>
        <button
          type="button"
          onClick={() => { setSubTab('kitap'); onSelectItem(null); }}
          className={`px-4 py-2.5 text-xs font-mono font-bold flex items-center gap-2 rounded-t-lg transition-all border-t border-x ${
            subTab === 'kitap'
              ? 'bg-[#F3EFE8] dark:bg-[#13204A] border-[#CFC5B4] text-[#1B2A4A] dark:text-[#F3EFE8] -mb-[5px] pb-3'
              : 'border-transparent text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8]/50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D35057]" />
          <span>Kitap & Roman Atölyesi</span>
        </button>

        {!ornekVar && (
          <button
            type="button"
            onClick={ornegiGetir}
            disabled={ornekKuruluyor}
            title="Excel'deki açılış zincirini örnek proje olarak getirir. Kanon değil; yeniden yazarken bakılacak iskelet."
            className="ml-auto mb-1 flex items-center gap-1.5 self-end px-3 py-1.5 text-[11px] font-mono rounded-lg border border-dashed border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8]/60 dark:hover:bg-[#17345A] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Library className="w-3.5 h-3.5" />
            <span>
              {ornekKuruluyor ? 'Getiriliyor…' : 'Açılış zinciri örneğini getir'}
            </span>
          </button>
        )}
      </div>

      {/* Embedded active workspace view */}
      <div className="pt-2">
        {subTab === 'blog' ? (
          <Blog
            items={items}
            activeItemId={activeItemId}
            onSelectItem={onSelectItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onAddItem={onAddItem}
          />
        ) : (
          <Kitap
            items={items}
            activeItemId={activeItemId}
            onSelectItem={onSelectItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onAddItem={onAddItem}
          />
        )}
      </div>
    </div>
  );
}
