import React, { useMemo, useState } from 'react';
import { Library } from 'lucide-react';
import Blog from './Blog';
import Kitap from './Kitap';
import { Item } from '../types';
import {
  ORNEK_PROJE_ID, ornekProje, ornekBolumler
} from '../data/hikayeOrnekleri';
import { SayfaBasi } from './kabuk/SayfaBasi';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'blog', label: 'Blog' },
  { id: 'kitap', label: 'Kitap' }
];

interface YaziAtolyesiProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  /** Menüden doğrudan Kitap ya da Blog'a gelmek için */
  istek?: { sekme: 'blog' | 'kitap'; n: number } | null;
}

export default function YaziAtolyesi({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  istek = null
}: YaziAtolyesiProps) {
  const [subTab, setSubTab] = useState<'blog' | 'kitap'>(istek?.sekme ?? 'blog');
  React.useEffect(() => { if (istek) setSubTab(istek.sekme); }, [istek?.n]);

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
        baslik="Yazı"
        bolumler={RAY_BOLUMLERI}
        aktifId={subTab}
        onSec={id => { setSubTab(id as typeof subTab); onSelectItem(null); }}
      />

      {/* Sade başlık (1 Ekim, K-2): Blog / Kitap seçimi yalnız sayfa rayında */}
      <SayfaBasi baslik="Yazı">
        {!ornekVar && (
          <button
            type="button"
            onClick={ornegiGetir}
            disabled={ornekKuruluyor}
            title="Excel'deki açılış zincirini örnek proje olarak getirir. Kanon değil; yeniden yazarken bakılacak iskelet."
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg border border-dashed border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8]/60 dark:hover:bg-[#17345A] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Library className="w-3.5 h-3.5" />
            <span>
              {ornekKuruluyor ? 'Getiriliyor…' : 'Açılış zinciri örneğini getir'}
            </span>
          </button>
        )}
      </SayfaBasi>

      {/* Embedded active workspace view */}
      <div>
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
