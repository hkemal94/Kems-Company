import React, { useState } from 'react';
import { Globe, ExternalLink, X } from 'lucide-react';
import type { Item } from '../../types';
import { sitedekiMaddeler } from './Site';
import { TYPE_LABELS } from '../wiki/wikiSchema';
import { DUGME_BOS, DUGME_LAC, ETIKET, IKINCIL, KART, YAZI } from '../anasayfa/stil';

/**
 * Site (KKM tarafı, 29 Eylül gece). Kemal: "Sitede görünenler listesi olsun."
 * Burası yalnız Kemal'in; ziyaretçinin gördüğü sitede böyle düğmeler yok.
 * Maddeyi siteye viki sayfasındaki "sitede göster" ekler; buradan kaldırılır.
 */

interface Props {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onOnizleme: () => void;
  onMaddeyiAc: (item: Item) => void;
}

export const SiteYonetimi: React.FC<Props> = ({ items, onUpdateItem, onOnizleme, onMaddeyiAc }) => {
  const [kaldiriliyor, setKaldiriliyor] = useState<string | null>(null);
  const liste = sitedekiMaddeler(items).sort((a, b) => a.title.localeCompare(b.title, 'tr'));

  const kaldir = async (i: Item) => {
    setKaldiriliyor(i.id);
    try {
      // Alanı silmek yetmiyor (kayıt üstüne eklenerek yazılıyor); false yazılır
      await onUpdateItem({ ...i, metadata: { ...(i.metadata || {}), sitede: false } as Item['metadata'], updatedAt: Date.now() });
    } finally {
      setKaldiriliyor(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-0">
          <div className={ETIKET}>Araçlar</div>
          <h1 className={`mt-1 text-[22px] lg:text-[28px] font-bold tracking-tight ${YAZI}`}>Site</h1>
          <p className={`mt-1 text-[13px] ${IKINCIL}`}>kems.company'nin önizlemesi. Sitede yalnız burada listelenen maddeler görünür.</p>
        </div>
        <button type="button" onClick={onOnizleme} className={`${DUGME_LAC} inline-flex items-center gap-1.5`}>
          <ExternalLink className="w-3.5 h-3.5" /> Önizlemeyi aç
        </button>
      </div>

      <section className={`${KART} p-4`}>
        <div className={`${ETIKET} mb-2`}>Sitede görünenler{liste.length ? ` · ${liste.length}` : ''}</div>
        {liste.length === 0 ? (
          <p className={`text-[13px] ${IKINCIL}`}>
            Sitede henüz madde yok. Vikide bir maddeyi açıp başlığın yanındaki <span className="inline-flex items-center gap-1 font-semibold"><Globe className="w-3 h-3" /> sitede göster</span>'e bas.
          </p>
        ) : (
          <ul className="divide-y divide-[#E4DCCD] dark:divide-[#2C3C72]">
            {liste.map(i => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <button type="button" onClick={() => onMaddeyiAc(i)} className={`flex-1 min-w-0 text-left cursor-pointer hover:text-[#D6484C]`}>
                  <span className={`block truncate text-[14px] font-semibold ${YAZI}`}>{i.title}</span>
                  <span className={`block text-[11px] ${IKINCIL}`}>{TYPE_LABELS[i.type] || i.type}</span>
                </button>
                <button type="button" disabled={kaldiriliyor === i.id} onClick={() => void kaldir(i)} className={`${DUGME_BOS} inline-flex items-center gap-1 shrink-0`}>
                  <X className="w-3 h-3" /> {kaldiriliyor === i.id ? 'Kaldırılıyor…' : 'Siteden kaldır'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SiteYonetimi;
