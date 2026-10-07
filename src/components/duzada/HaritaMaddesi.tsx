import React, { useState } from 'react';
import type { Item } from '../../types';
import { haritadaAra, maddeTohumu, kunyeSatiri, type HaritaKunyesi } from '../../lib/haritaMaddesi';

/**
 * Haritadaki bir yapı ya da mahalle tıklanınca maddesini açar (Atölye'de
 * harita, Düzada'da Evren Raporu). Madde yoksa, haritada karşılığı varsa,
 * boş künyeyi kurmayı teklif eden kutu çıkar (W1). Kayıt yalnız Kemal
 * "Maddeyi aç"a basınca yazılır.
 *
 * Bina `wikiId`'leri madde kimlikleriyle birebir aynı (kemskoy_hotel gibi).
 * Mahalleler ise haritada `yer_merkez`, vikide `region_merkez` diye
 * geçiyor; kimlik tutmazsa bölge anahtarı üzerinden aranır.
 */

interface Secenekler {
  items: Item[];
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  /** Bulunan (ya da yeni kurulan) maddeyi vikide açar */
  onMaddeAc: (id: string) => void;
}

const sadelestir = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, c => 'cgiosu'['çğıöşü'.indexOf(c)])
    .replace(/[^a-z0-9]/g, '');

export function useHaritaMaddesi({ items, onAddItem, onMaddeAc }: Secenekler) {
  const [eksikMadde, setEksikMadde] = useState<HaritaKunyesi | null>(null);
  const [maddeKuruluyor, setMaddeKuruluyor] = useState(false);

  const ac = (wikiId: string) => {
    // Sonradan bağlanan kayıt (Neyin Eksik → "Kayda bağla") da bulunur
    let hedef = items.find(it => it.id === wikiId) || items.find(it => !it.archived && it.metadata?.haritaWikiId === wikiId);
    if (!hedef && wikiId.startsWith('yer_')) {
      const anahtar = wikiId.slice(4); // merkez, liman, iskele, ciftlik, stadyum
      const bolgeler = items.filter(it => it.area === 'duzada' && it.type === 'yer' && !it.archived);
      hedef =
        bolgeler.find(it => sadelestir(it.metadata?.region || '') === anahtar) ||
        bolgeler.find(it => sadelestir(it.id) === `region${anahtar}`) ||
        bolgeler.find(it => sadelestir(it.title).startsWith(anahtar.slice(0, 4)));
    }
    if (hedef) { onMaddeAc(hedef.id); return; }
    const kunye = haritadaAra(wikiId);
    if (kunye) setEksikMadde(kunye);
  };

  const kur = async () => {
    if (!eksikMadde || maddeKuruluyor) return;
    setMaddeKuruluyor(true);
    try {
      await onAddItem(maddeTohumu(eksikMadde));
      onMaddeAc(eksikMadde.wikiId);
      setEksikMadde(null);
    } finally {
      setMaddeKuruluyor(false);
    }
  };

  const kutu = eksikMadde && (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans" onClick={() => setEksikMadde(null)}>
      <div className="bg-white dark:bg-[#12224A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-sans font-bold text-lg text-stone-800 dark:text-[#F3EFE8] tracking-tight">{eksikMadde.ad}</h3>
          <p className="mt-1 font-mono text-[11px] text-stone-500 dark:text-[#95A1C2]">{kunyeSatiri(eksikMadde)}</p>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          Bu yapının henüz wiki maddesi yok. Haritadaki bilgilerle boş bir
          künye açayım mı? Ad, mahalle, kat ve rakım haritadan gelir;
          metni sen yazarsın.
        </p>
        <div className="flex justify-end gap-2.5 pt-1">
          <button onClick={() => setEksikMadde(null)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#17345A] dark:hover:bg-[#17345A]/80 text-stone-700 dark:text-[#A6B0C9] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors">
            Şimdi değil
          </button>
          <button onClick={kur} disabled={maddeKuruluyor}
            className="px-4 py-2 bg-[#0E1C4F] dark:bg-[#2C3C72] hover:opacity-90 disabled:opacity-40 text-[#F3EFE8] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-opacity">
            {maddeKuruluyor ? 'Kuruluyor…' : 'Maddeyi aç'}
          </button>
        </div>
      </div>
    </div>
  );

  return { ac, kutu };
}
