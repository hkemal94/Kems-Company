import React, { useMemo, useState } from 'react';
import { AlertTriangle, Tag, Wand2 } from 'lucide-react';
import type { Item } from '../types';
import {
  dropKunyesiBul, dropKunyesiniIsle, renkFarklari, renkleriDoldur
} from '../data/dropKunyeleri';

/**
 * Drop künyesi kartı (MR1).
 *
 * Uygulamada bir drop ad + durum + tema kimliğinden ibaretti. Oysa dropun
 * asıl kimliği — yıl, edisyon, beden seti, bakım etiketi, menşe — Canva'daki
 * lookbook'ta duruyordu. İki yerde iki ayrı gerçek olması, birinin eskimesi
 * demek.
 *
 * Kart o künyeyi dropun sayfasına getiriyor ve iki şey yapıyor:
 *  - boş alanları doldurur (eksiltmez)
 *  - lookbook ile uygulama arasındaki FARKLARI gösterir, kendiliğinden
 *    düzeltmez. Hangisinin doğru olduğu Kemal'in kararı.
 */

interface DropKunyesiProps {
  drop: Item;
  /** Bu dropa bağlı ürünler */
  urunler: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
}

export const DropKunyesi: React.FC<DropKunyesiProps> = ({
  drop, urunler, onUpdateItem
}) => {
  const kunye = useMemo(() => dropKunyesiBul(drop), [drop]);
  const [calisiyor, setCalisiyor] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);

  if (!kunye) return null;

  const md = drop.metadata ?? {};
  const yil = md.yil ?? kunye.yil;
  const edisyon = md.edisyon ?? kunye.edisyon;
  const bedenler: string[] = md.bedenler?.length ? md.bedenler : kunye.bedenler;
  const etiket: string[] = md.etiketSatirlari?.length
    ? md.etiketSatirlari : kunye.etiket;
  const islendi = !!md.kunyeKaynagi;

  const farklar = useMemo(
    () => renkFarklari(urunler, kunye), [urunler, kunye]
  );
  const renksiz = urunler.filter(
    u => !String(u.metadata?.variantColor || '').trim()
         && kunye.urunRenkleri[u.title.trim()]
  );

  const uygula = async () => {
    if (calisiyor) return;
    setCalisiyor(true);
    try {
      await onUpdateItem(dropKunyesiniIsle(drop, kunye));
      let renk = 0;
      for (const u of renksiz) {
        const yeni = renkleriDoldur(u, kunye);
        if (yeni) { await onUpdateItem(yeni); renk++; }
      }
      setRapor(
        `Künye işlendi${renk ? ` · ${renk} ürünün rengi dolduruldu` : ''}.`
      );
    } catch (e) {
      setRapor(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setCalisiyor(false);
    }
  };

  return (
    <div className="border border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl overflow-hidden bg-[#FAF8F5] dark:bg-[#13204A]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#CFC5B4]/60 dark:border-[#2C3C72] bg-[#F3EFE8]/70 dark:bg-[#17345A]/60">
        <Tag className="w-3.5 h-3.5 text-[#D35057]" />
        <h3 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#6A5E4C] dark:text-[#A6B0C9] font-bold">
          Drop Künyesi
        </h3>
        <span className="ml-auto text-[10px] font-mono text-[#9A8C76] dark:text-[#6E7CA0]">
          {kunye.kaynak}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#CFC5B4]/40 dark:bg-[#2C3C72]">
        {[
          ['Yıl', String(yil)],
          ['Edisyon', edisyon],
          ['Bedenler', bedenler.join(' · ')],
          ['Ürün', `${urunler.length} parça`]
        ].map(([etk, deger]) => (
          <div key={etk} className="px-4 py-3 bg-[#FAF8F5] dark:bg-[#13204A]">
            <p className="text-[10px] font-mono uppercase tracking-wide text-[#9A8C76] dark:text-[#6E7CA0] mb-0.5">
              {etk}
            </p>
            <p className="text-[13px] text-[#1B2A4A] dark:text-[#F3EFE8] leading-snug">
              {deger}
            </p>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-[#CFC5B4]/60 dark:border-[#2C3C72]">
        <p className="text-[10px] font-mono uppercase tracking-wide text-[#9A8C76] dark:text-[#6E7CA0] mb-1.5">
          Bakım / menşe etiketi
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-[#1B2A4A] dark:text-[#F3EFE8]">
          {etiket.join(' · ')}
        </p>
      </div>

      {/* Lookbook ile uygulama arasındaki farklar — sessizce düzeltilmez */}
      {(kunye.uyarilar.length > 0 || farklar.length > 0) && (
        <div className="px-4 py-3 border-t border-[#CFC5B4]/60 dark:border-[#2C3C72] space-y-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-[#D35057] font-bold">
            <AlertTriangle className="w-3 h-3" /> Karar bekleyen
          </p>
          <ul className="space-y-1">
            {kunye.uyarilar.map(u => (
              <li key={u} className="text-[11px] leading-snug text-[#6A5E4C] dark:text-[#A6B0C9]">
                · {u}
              </li>
            ))}
            {farklar.map(f => (
              <li key={f.item.id} className="text-[11px] leading-snug text-[#6A5E4C] dark:text-[#A6B0C9]">
                · <strong>{f.item.title}</strong>: uygulamada “{f.mevcut}”,
                {' '}lookbook'ta “{f.lookbook}”. Değiştirmedim.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[#CFC5B4]/60 dark:border-[#2C3C72]">
        <button
          type="button"
          onClick={uygula}
          disabled={calisiyor}
          title="Boş alanları lookbook'tan doldurur. Yazılmış hiçbir şeyi değiştirmez."
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#D35057] hover:text-[#D35057] transition-colors cursor-pointer disabled:opacity-40"
        >
          <Wand2 className="w-3.5 h-3.5" />
          {calisiyor ? 'İşleniyor…' : islendi ? 'Künyeyi tazele' : 'Künyeyi işle'}
        </button>
        {renksiz.length > 0 && !rapor && (
          <span className="text-[11px] text-[#9A8C76] dark:text-[#6E7CA0]">
            {renksiz.length} ürünün rengi boş — lookbook'tan dolabilir
          </span>
        )}
        {rapor && (
          <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            {rapor}
          </span>
        )}
      </div>
    </div>
  );
};

export default DropKunyesi;
