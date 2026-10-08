import type { Item, ItemType } from '../types';
import { BAG_TURLERI, type BagTuru } from '../utils/relations';

/**
 * Bağ türleri madde türüne özel (8 Ekim, Kemal: "Bir insan mekân ile evli
 * olamaz"; "künyede bağ kurarken bağ tipi ile maddelerde uymayan
 * entegrasyonlar yapabiliyorsun, bunu yapamaman gerekmez mi"). Tabloyu Kemal
 * onayladı. "A → tür → B": bağ A'nın kaydına yazılır, B hedeftir.
 *
 * Bağ ağı, toplu bağ ve düzenleyici yalnız uyan türleri gösterir. Var olan
 * uymayan bağlar silinmez; Eksikler'de listelenir.
 */

const KISI: ItemType[] = ['kisi', 'karakter'];
const AILE: ItemType[] = ['aile'];
const MEKAN: ItemType[] = ['mekân', 'dükkân'];
const KURUM: ItemType[] = ['kulüp', 'marka'];
const YER: ItemType[] = ['yer', 'cadde', 'meydan', 'yer_adi', 'ada', ...MEKAN];
const HER = '*' as const;

type Kume = ItemType[] | typeof HER;
const KURAL: Record<BagTuru, { kaynak: Kume; hedef: Kume }> = {
  'eşi': { kaynak: KISI, hedef: KISI },
  ebeveyni: { kaynak: KISI, hedef: KISI },
  'kardeşi': { kaynak: KISI, hedef: KISI },
  'akrabası': { kaynak: KISI, hedef: KISI },
  'arkadaşı': { kaynak: KISI, hedef: KISI },
  rakibi: { kaynak: KISI, hedef: KISI },
  'tanıdığı kişi': { kaynak: KISI, hedef: KISI },
  patronu: { kaynak: KISI, hedef: KISI },
  'iş ortağı': { kaynak: KISI, hedef: KISI },
  'çalışanı': { kaynak: KISI, hedef: [...MEKAN, ...KURUM] },
  'üyesi': { kaynak: KISI, hedef: [...KURUM, ...AILE] },
  // Sahiplik iki yönde de yazılmış (Kemal'in verisi: "kişi → sahibi → mekân");
  // ikisi de geçerli, ama yalnız sahip ile sahip olunan arasında
  sahibi: { kaynak: [...MEKAN, 'ürün', ...KISI, ...AILE, ...KURUM], hedef: [...KISI, ...AILE, ...KURUM, ...MEKAN, 'ürün'] },
  'bulunduğu yer': { kaynak: HER, hedef: YER },
  'ait olduğu marka': { kaynak: [...MEKAN, 'ürün', 'drop'], hedef: KURUM },
  'ilgili olay': { kaynak: HER, hedef: ['olay'] },
  'genel bağlantı': { kaynak: HER, hedef: HER }
};

const icinde = (k: Kume, t: ItemType) => k === HER || k.includes(t);

/** Kuralın geçtiği viki türleri; harita iğnesi, sosyal kanal gibi kayıtlar serbest */
const VIKI: ItemType[] = [...KISI, ...AILE, ...MEKAN, ...KURUM, 'yer', 'cadde', 'meydan', 'yer_adi', 'ada', 'olay', 'ürün', 'oda'];

/** Bu bağ türü bu iki madde türü arasında kurulabilir mi */
export function bagUygun(tur: BagTuru, kaynak: ItemType, hedef: ItemType): boolean {
  const k = KURAL[tur];
  // Tabloda olmayan (ileride eklenen) tür ya da viki dışı kayıt: serbest
  if (!k || !VIKI.includes(kaynak) || !VIKI.includes(hedef)) return true;
  // Sahiplik: iki taraf da aynı gruptan olmasın (mekân mekânın sahibi olmaz)
  if (tur === 'sahibi') {
    const sahip = [...KISI, ...AILE, ...KURUM], mal = [...MEKAN, 'ürün'] as ItemType[];
    return (mal.includes(kaynak) && sahip.includes(hedef)) || (sahip.includes(kaynak) && mal.includes(hedef));
  }
  return icinde(k.kaynak, kaynak) && icinde(k.hedef, hedef);
}

/** İki madde arasında kurulabilecek bağ türleri (sıra BAG_TURLERI'nin sırası) */
export function uygunTurler(kaynak: ItemType, hedef: ItemType): BagTuru[] {
  return BAG_TURLERI.map(b => b.id).filter(t => bagUygun(t, kaynak, hedef));
}

/** Bu madde türünün kaynak olabileceği bağ türleri (hedef henüz seçilmeden) */
export function kaynakTurleri(kaynak: ItemType): BagTuru[] {
  return BAG_TURLERI.map(b => b.id).filter(t => { const k = KURAL[t]; return !k || icinde(k.kaynak, kaynak); });
}

export interface UymayanBag { kaynak: Item; hedef: Item; tur: BagTuru }

/** Var olan ama tabloya uymayan bağlar (Eksikler'deki liste için; yazmaz) */
export function uymayanBaglar(items: Item[]): UymayanBag[] {
  const byId = new Map(items.map(i => [i.id, i]));
  const cikti: UymayanBag[] = [];
  for (const i of items) {
    if (i.archived) continue;
    for (const r of ((i.metadata?.relations as Array<{ targetId?: string; type?: BagTuru; isProposal?: boolean }>) || [])) {
      if (!r?.targetId || !r.type || r.isProposal) continue;
      const h = byId.get(r.targetId);
      if (!h || h.archived) continue;
      if (!bagUygun(r.type, i.type, h.type)) cikti.push({ kaynak: i, hedef: h, tur: r.type });
    }
  }
  return cikti;
}
