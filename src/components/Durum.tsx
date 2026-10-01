import React, { useMemo } from 'react';
import { SayfaBasi } from './kabuk/SayfaBasi';
import type { AreaType, Item } from '../types';
import { durumOranlari } from '../lib/durumOranlari';
import { eksikleriCikar } from '../lib/eksikler';
import { YuzdeSeridi, type SeritHedefi } from './anasayfa/YuzdeSeridi';
import { Bosluklar } from './Bosluklar';
import { Eksikler } from './Eksikler';
import { SayfaRayi } from './SayfaRayi';

export type DurumSekmesi = 'yuzdeler' | 'eksikler' | 'bosluklar';

/**
 * Durum (29 Eylül; 1 Ekim'de Neyin Eksik de buraya katıldı). Kemal:
 * "Durum ile Neyin Eksik birleşsin, adı Durum." Üç sekme: Yüzdeler ·
 * Eksikler · Boşluklar. Aynı anda yalnız biri çizilir; sayfa kısa kalır.
 * Tek seferlik düğmeler (Temizlik, aktarımlar) Eksikler sekmesinde.
 */
export const Durum: React.FC<{
  items: Item[];
  sekme: DurumSekmesi;
  onSekme: (s: DurumSekmesi) => void;
  onSec: (h: SeritHedefi) => void;
  onSelectArea: (area: AreaType, itemId?: string) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  /** Ana sayfadan bir eksiğe basılınca o başlık açık gelir */
  eksikAcik?: string | null;
  /** Haftalık özetin gideceği adres: Kemal'in kendi Google hesabı */
  eposta?: string | null;
}> = ({ items, sekme, onSekme, onSec, onSelectArea, onUpdateItem, onAddItem, onDeleteItem, eksikAcik }) => {
  const oranlar = useMemo(() => durumOranlari(items), [items]);
  const eksikSayisi = useMemo(() => eksikleriCikar(items).length, [items]);
  const bolumler = [
    { id: 'yuzdeler', label: 'Yüzdeler' },
    { id: 'eksikler', label: eksikSayisi ? `Eksikler · ${eksikSayisi}` : 'Eksikler' },
    { id: 'bosluklar', label: 'Boşluklar' }
  ];
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SayfaBasi baslik="Durum" />
      <SayfaRayi baslik="Durum" bolumler={bolumler} aktifId={sekme} onSec={id => onSekme(id as DurumSekmesi)} />
      {sekme === 'yuzdeler' && (
        <section id="durum-yuzdeler">
          <YuzdeSeridi oranlar={oranlar} onSec={onSec} ayrintili />
        </section>
      )}
      {sekme === 'eksikler' && (
        <Eksikler
          items={items}
          onSelectArea={onSelectArea}
          onUpdateItem={onUpdateItem}
          onAddItem={onAddItem}
          baslangicAcik={eksikAcik}
          onDeleteItem={onDeleteItem}
        />
      )}
      {sekme === 'bosluklar' && <Bosluklar items={items} onUpdateItem={onUpdateItem} gomulu />}
    </div>
  );
};

export default Durum;
