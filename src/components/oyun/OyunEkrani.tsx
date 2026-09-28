import React, { useEffect, useState } from 'react';
import type { Item, AreaType } from '../../types';
import OyunStudyo from './OyunStudyo';
import Oyun from '../Oyun';

/**
 * Oyun sekmesinin kabuğu.
 *
 * Kemal: "Prototip olsun ama ekranda direkt o görünmesin, bir yerlere sakla."
 *
 * Otel simülasyonu silinmiyor — oyun oynanabilir bir dijital oyun olacak ve
 * o ekrandaki gün şablonu, işlemler ve doluluk mantığı mekanik denemesi
 * olarak işe yarayacak. Ama ortada durmuyor:
 *
 *   - Sekme düğmesi yok. Oyun sekmesi doğrudan stüdyoyu açıyor.
 *   - İki yolu var: adres satırına #simulasyon eklemek, ya da stüdyo
 *     sayfasının en altındaki sessiz satıra tıklamak.
 *
 * Neden ikisi birden: yalnız adres satırı olsa unutulur ve prototip
 * kaybolur; yalnız alttaki satır olsa "ekranda görünmesin" tam olmaz.
 * Sayfanın en dibindeki soluk bir satır, arayan bulur ama göze girmez.
 */

const ANAHTAR = '#simulasyon';

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
  const [simulasyon, setSimulasyon] = useState(
    () => {
      try { return window.location.hash === ANAHTAR; } catch { return false; }
    }
  );

  // Adres satırı elle değişirse de açılsın/kapansın
  useEffect(() => {
    const dinle = () => {
      try { setSimulasyon(window.location.hash === ANAHTAR); } catch { /* yok */ }
    };
    window.addEventListener('hashchange', dinle);
    return () => window.removeEventListener('hashchange', dinle);
  }, []);

  const ac = () => {
    try { window.location.hash = ANAHTAR; } catch { setSimulasyon(true); }
    setSimulasyon(true);
  };

  const kapat = () => {
    try {
      // hash'i temizle ama sayfayı başa attırma
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch { /* yok */ }
    setSimulasyon(false);
  };

  if (simulasyon) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '0.16em', color: '#F26B6F' }}
          >
            Prototip · otel simülasyonu
          </span>
          <span className="flex-1 h-px bg-[#CFC5B4] dark:bg-[#2C3C72]" />
          <button
            onClick={kapat}
            className="font-mono cursor-pointer text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#F26B6F]"
            style={{ fontSize: 11 }}
          >
            ← Stüdyoya dön
          </button>
        </div>
        <Oyun
          items={p.items}
          activeItemId={p.activeItemId}
          onSelectItem={p.onSelectItem}
          onUpdateItem={p.onUpdateItem}
          onDeleteItem={p.onDeleteItem}
          onAddItem={p.onAddItem}
          onNavigateToTab={p.onNavigateToTab}
        />
      </div>
    );
  }

  return (
    <div>
      <OyunStudyo
        items={p.items}
        onAddItem={p.onAddItem}
        onUpdateItem={p.onUpdateItem}
        onSelectArea={p.onSelectArea}
      />

      {/* Sayfanın en dibi: prototipe giden sessiz kapı */}
      <div
        className="mt-12 pt-3 border-t"
        style={{ borderColor: 'rgba(207,197,180,0.4)' }}
      >
        <button
          onClick={ac}
          className="font-mono cursor-pointer"
          style={{ fontSize: 10, letterSpacing: '0.1em', color: '#BBA591' }}
          title="Eski otel simülasyonu — mekanik denemesi olarak saklanıyor"
        >
          prototip: otel simülasyonu →
        </button>
      </div>
    </div>
  );
};

export default OyunEkrani;
