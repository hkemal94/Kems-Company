import type { Item, ItemType } from '../types';
import { WIKI_TYPES, getKunyeFields } from '../components/wiki/wikiSchema';
import { haritaBeklentisi } from './eksikler';
import { ADA_KIMLIGI } from './vikiSifirlama';

/**
 * Durum yüzdelerinin maddeleri (7 Ekim, Kemal: "10 maddenin 9'unun yeri var
 * yazıyor, tıklayınca haritaya gidiyorum; bu maddelerin listesine gitmem
 * lazım"). Her yüzde için satırlar; eksikler önde. Sayılar durumOranlari ile
 * aynı kuraldan çıkar.
 */

export type ListeHedefi = 'kunye' | 'kitap' | 'harita';

export interface DurumSatiri {
  anahtar: string;
  ad: string;
  /** "3/7 dolu", "taslak", "maddesi yok" */
  not: string;
  tamam: boolean;
  /** Açılacak madde; yoksa satır yalnız bilgi */
  item?: Item;
}

const canli = (i: Item) => !i.archived && !i.isProposal;

export function durumSatirlari(items: Item[], hedef: ListeHedefi): DurumSatiri[] {
  let satirlar: DurumSatiri[] = [];
  if (hedef === 'kunye') {
    for (const i of items) {
      if (!canli(i) || !WIKI_TYPES.includes(i.type as ItemType) || i.id === ADA_KIMLIGI) continue;
      const alanlar = getKunyeFields(i, { includeEmpty: true });
      if (!alanlar.length) continue;
      const dolu = alanlar.filter(f => f.value.trim()).length;
      const bos = alanlar.filter(f => !f.value.trim()).map(f => f.label.toLocaleLowerCase('tr'));
      satirlar.push({
        anahtar: i.id, ad: i.title, item: i, tamam: dolu === alanlar.length,
        not: `${dolu}/${alanlar.length} dolu${bos.length ? ` · boş: ${bos.slice(0, 3).join(', ')}${bos.length > 3 ? '…' : ''}` : ''}`
      });
    }
    satirlar.sort((a, b) => oran(a) - oran(b));
  } else if (hedef === 'kitap') {
    const bolumler = items.filter(i => canli(i) && i.type === 'kitap_bolum' && !(i.tags || []).includes('oyun-tasarimi'));
    satirlar = bolumler.map(b => ({
      anahtar: b.id, ad: b.title, item: b, tamam: b.status === 'düzeltildi',
      not: b.status === 'düzeltildi' ? 'düzeltildi' : b.status === 'yazıldı' ? 'yazıldı' : 'taslak'
    }));
  } else {
    const canlilar = items.filter(canli);
    const kimlik = new Map(canlilar.map(i => [i.id, i]));
    // Haritadaki yapıya sonradan bağlanan kayıtlar da sayılır
    for (const i of canlilar) {
      const h = String(i.metadata?.haritaWikiId || '');
      if (h && !kimlik.has(h)) kimlik.set(h, i);
    }
    satirlar = haritaBeklentisi().map(y => {
      const m = kimlik.get(y.wikiId);
      return { anahtar: y.wikiId, ad: m?.title || y.ad, item: m, tamam: !!m, not: m ? 'maddesi var' : 'maddesi yok' };
    });
  }
  // Eksikler önde, sonra ada göre
  return satirlar.sort((a, b) => Number(a.tamam) - Number(b.tamam) || (hedef === 'kunye' ? 0 : a.ad.localeCompare(b.ad, 'tr')));
}

function oran(s: DurumSatiri): number {
  const m = /^(\d+)\/(\d+)/.exec(s.not);
  return m ? Number(m[1]) / Math.max(1, Number(m[2])) : 1;
}
