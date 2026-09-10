import { Item, ItemType } from '../../types';
import { DEFAULT_QUESTIONS_BY_CAT } from '../DuzadaWiki';
import { parseKunye } from './kunyeParser';

/**
 * ItemType değerleri ile künye şemasının anahtarları birebir aynı değil
 * (örn. 'karakter' ve 'kisi' aynı şemayı kullanır). Eşleme burada.
 */
const TYPE_TO_SCHEMA: Partial<Record<ItemType, string>> = {
  kisi: 'kisi',
  karakter: 'kisi',
  mekân: 'mekan',
  dükkân: 'mekan',
  yer: 'yer',
  marka: 'marka',
  kulüp: 'marka',
  olay: 'olay',
  ürün: 'urun',
  oda: 'oda'
};

export const TYPE_LABELS: Partial<Record<ItemType, string>> = {
  kisi: 'Kişi',
  karakter: 'Karakter',
  mekân: 'Mekân',
  dükkân: 'Dükkân',
  yer: 'Mahalle',
  marka: 'Marka',
  kulüp: 'Kulüp',
  olay: 'Olay',
  ürün: 'Eşya',
  oda: 'Oda'
};

/** Wiki'de kendi sayfası olan tipler */
export const WIKI_TYPES: ItemType[] = [
  'yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'olay', 'ürün', 'oda'
];

export function schemaKeyFor(type: ItemType): string | undefined {
  return TYPE_TO_SCHEMA[type];
}

export interface KunyeField {
  id: string;
  label: string;
  value: string;
}

/**
 * Bu alanlar yalnızca yönetim yüzünde görünür. Sırlar çatışma üretmek için
 * yazılıyor; ziyaretçiye açılırsa hikâyelerin sürprizi önceden yanar.
 */
const GIZLI_ALANLAR = new Set(['secrets', 'clues']);

/**
 * Ham bölge anahtarlarının insan okunur karşılığı. Künyede `eski_liman`
 * değil "İskele Mahallesi" yazmalı.
 */
export const BOLGE_ADLARI: Record<string, string> = {
  eski_liman: 'İskele Mahallesi',
  iskele: 'İskele Mahallesi',
  kemskoy: 'Kemsköy Caddesi',
  merkez: 'Merkez Mahallesi',
  liman: 'Liman Mahallesi',
  fener: 'Liman Mahallesi',
  ciftlik: 'Çiftlik Mahallesi',
  'çiftlik': 'Çiftlik Mahallesi',
  stad: 'Stadyum Mahallesi',
  stadyum: 'Stadyum Mahallesi'
};

export function bolgeAdi(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const key = raw.trim().toLocaleLowerCase('tr');
  if (BOLGE_ADLARI[key]) return BOLGE_ADLARI[key];
  // Ham anahtar gibi görünüyorsa (alt çizgili, hep küçük) okunur hale getir
  if (/^[a-zçğıöşü0-9_]+$/.test(key) && !/\s/.test(raw)) {
    return raw
      .split('_')
      .map(p => p.charAt(0).toLocaleUpperCase('tr') + p.slice(1))
      .join(' ');
  }
  return raw.trim();
}

/** 'metadata.profile.profession' gibi bir yolu güvenle okur */
function readPath(item: Item, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, item as unknown);
}

/**
 * Bir maddenin künye alanlarını şemadan çıkarır.
 * `title` ve `notes` künyeye girmez — onlar sayfanın başlığı ve gövdesidir.
 */
export function getKunyeFields(
  item: Item,
  opts: { includeEmpty?: boolean; includeSecrets?: boolean } = {}
): KunyeField[] {
  const key = schemaKeyFor(item.type);
  if (!key) return [];

  const schema = DEFAULT_QUESTIONS_BY_CAT[key] || [];
  const parsed = parseKunye(item);

  /** Şemadaki alan boşsa, notes'tan ayrıştırılan künyeden doldurmayı dener */
  const fromParsed = (label: string): string => {
    const want = label.toLocaleLowerCase('tr');
    const hit = parsed.fields.find(f => {
      const have = f.label.toLocaleLowerCase('tr');
      return have === want || want.includes(have) || have.includes(want);
    });
    return hit ? hit.value : '';
  };

  const schemaFields = schema
    .filter(f => f.fieldPath !== 'title' && f.fieldPath !== 'notes')
    .map(f => {
      const raw = readPath(item, f.fieldPath);
      let value =
        typeof raw === 'string' ? raw.trim()
        : typeof raw === 'number' ? String(raw)
        : '';

      if (!value) value = fromParsed(f.label);
      // Meslek alanı künye başlığından da gelebilir ("Ad (38) — Başaşçı")
      if (!value && f.id === 'profession' && parsed.rol) value = parsed.rol;
      // Ham bölge anahtarı yerine mahallenin adı
      if (f.id === 'region') value = bolgeAdi(value);

      return { id: f.id, label: f.label, value };
    })
    .filter(f => (opts.includeSecrets ? true : !GIZLI_ALANLAR.has(f.id)));

  /**
   * Şemada karşılığı olmayan künye alanları (Fizik, Saç, Gözler,
   * Sevdikleri, Sevmedikleri, Hobiler) kaybolmasın — künyenin altına eklenir.
   */
  const used = new Set(
    schemaFields
      .filter(f => f.value)
      .map(f => f.value.toLocaleLowerCase('tr'))
  );

  const extras: KunyeField[] = parsed.fields
    .filter(f => !used.has(f.value.toLocaleLowerCase('tr')))
    .map(f => ({ id: `ek_${f.label}`, label: f.label, value: f.value }));

  if (parsed.yas && !schemaFields.some(f => f.id === 'age' && f.value)) {
    extras.unshift({ id: 'ek_yas', label: 'Yaş', value: parsed.yas });
  }

  /**
   * Geniş zaman kuralı: wiki'nin "şimdi"si yoktur. Zamana bağlı olgular
   * ancak aralık olarak yazılır — "Faaliyette: 1954–". Aralığın kendisi
   * kalıcı bir olgudur, "şu anda açık" değildir.
   */
  const faaliyet = item.metadata?.faaliyet;
  if (typeof faaliyet === 'string' && faaliyet.trim()) {
    extras.unshift({ id: 'ek_faaliyet', label: 'Faaliyette', value: faaliyet.trim() });
  }

  const all = [...schemaFields, ...extras];
  return opts.includeEmpty ? all : all.filter(f => f.value.length > 0);
}

/**
 * Künyenin ne kadarının dolu olduğu — yönetim yüzündeki olgunluk göstergesi.
 * Yalnızca şema alanları sayılır; ayrıştırmadan gelen ek alanlar bonusdur.
 */
export function kunyeCompleteness(item: Item): { filled: number; total: number; pct: number } {
  const key = schemaKeyFor(item.type);
  if (!key) return { filled: 0, total: 0, pct: 0 };

  const schemaIds = new Set(
    (DEFAULT_QUESTIONS_BY_CAT[key] || [])
      .filter(f => f.fieldPath !== 'title' && f.fieldPath !== 'notes')
      .map(f => f.id)
  );

  const all = getKunyeFields(item, { includeEmpty: true }).filter(f => schemaIds.has(f.id));
  const filled = all.filter(f => f.value.length > 0).length;
  const total = all.length;
  return { filled, total, pct: total === 0 ? 0 : Math.round((filled / total) * 100) };
}

/**
 * Gövde metni. Künye bloğu ayrıştırılıp künye kutusuna taşındığı için
 * burada yalnızca gerçek düzyazı kalır — '* Fizik: ...' satırları gövdeyi
 * artık şişirmez.
 */
export function getArticleBody(item: Item): { heading?: string; text: string; status?: string }[] {
  const blocks: { heading?: string; text: string; status?: string }[] = [];

  const notes = parseKunye(item).body.trim();
  if (notes) blocks.push({ text: notes });

  const sections = item.metadata?.wikiSections;
  if (Array.isArray(sections)) {
    sections.forEach(s => {
      const text = (s?.content || '').trim();
      if (text) blocks.push({ heading: s.title, text, status: s.status });
    });
  }

  return blocks;
}

/**
 * Bu madde bir "taslak" mı — yönetim yüzünde öne çıkarılır.
 *
 * Ölçü, "doldurulmuş bilgi miktarı": gövde metni ile künye satırları
 * birlikte sayılır. Künyesi zengin ama gövdesi kısa bir karakter taslak
 * değildir; ikisi de boş olan taslaktır.
 */
export function isStub(item: Item): boolean {
  const chars = getArticleBody(item).reduce((n, b) => n + b.text.length, 0);
  const kunye = getKunyeFields(item);
  const kunyeChars = kunye.reduce((n, f) => n + f.value.length, 0);

  const bilgi = chars + kunyeChars;
  const { pct, total } = kunyeCompleteness(item);

  if (bilgi >= 800) return false;                        // uzun yazılmış madde
  if (bilgi >= 400 && kunye.length >= 4) return false;   // künyesi zengin madde
  return bilgi < 240 || (total > 0 && pct < 30 && kunye.length < 4);
}
