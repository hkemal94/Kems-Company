import { Item } from '../../types';

/**
 * Künye ayrıştırıcı.
 *
 * İçe aktarılan karakterlerin bütün bilgisi `notes` içinde düzyazı olarak
 * duruyor (kemskoyData.ts → formatKunye):
 *
 *     Esra Gezgin (38) — Başaşçı
 *     * Fizik: 1,75 boyunda, 65 kilo...
 *     * Kişilik: Yetenekli, disiplinli...
 *     * Ayrıntı: 15 yıldır profesyonel olarak...
 *
 * Bu yüzden künye kutusu boş kalıyor, gövde metni şişiyor ve 94 karakterin
 * hepsi "taslak" görünüyor. Burada o blok okunur, alanlara ayrılır ve
 * geri kalan gerçek düzyazı ayrı döner.
 *
 * Veri DEĞİŞTİRİLMEZ — bu çalışma anında olur. Firestore'a kalıcı yazmak
 * istersen `migrateKunye` aşağıda.
 */

export interface ParsedKunye {
  /** Başlıktan gelenler */
  yas?: string;
  rol?: string;
  /** '* Alan: değer' satırları, sırası korunur */
  fields: Array<{ label: string; value: string }>;
  /** Künye bloğu çıkarıldıktan sonra kalan gerçek metin */
  body: string;
  /** Tek satırlık tanıtım — listelerde kullanılır */
  ozet: string;
}

/** '* Fizik: ...' veya '- Fizik: ...' satırlarını yakalar */
const FIELD_RE = /^\s*[*\-•]\s*([^:]{2,40}?)\s*:\s*(.+)$/;

/** 'Esra Gezgin (38) — Başaşçı' veya 'Ad — Rol' başlığı */
const HEADER_RE = /^(.+?)(?:\s*\((\d{1,3})\))?\s*[—–-]\s*(.+)$/;

/** Listelerde kullanılacak kısa tanıtım için tercih sırası */
const OZET_ONCELIK = ['kişilik', 'ayrıntı', 'fizik', 'hobiler', 'sevdikleri'];

/**
 * Bu alanlar künye satırı değil, düzyazıdır. "Ayrıntı" aslında karakterin
 * biyografisi — künye kutusuna sıkıştırılınca hem kutu uzuyor hem gövde
 * boş kalıyor. Bunlar gövdeye gider.
 */
const BODY_LABELS = new Set(['ayrıntı', 'ayrinti', 'geçmiş', 'hikaye', 'hikâye', 'özgeçmiş']);

const norm = (s: string) => s.trim().toLocaleLowerCase('tr');

export function parseKunye(item: Item): ParsedKunye {
  const raw = item.notes || '';
  const lines = raw.split('\n');

  const fields: Array<{ label: string; value: string }> = [];
  const bodyLines: string[] = [];
  const narrative: string[] = [];
  let yas: string | undefined;
  let rol: string | undefined;
  let headerConsumed = false;

  lines.forEach((line, idx) => {
    const fm = line.match(FIELD_RE);
    if (fm) {
      const label = fm[1].trim();
      const value = fm[2].trim();
      if (value && norm(value) !== 'belirtilmedi') {
        if (BODY_LABELS.has(norm(label))) narrative.push(value);
        else fields.push({ label, value });
      }
      return;
    }

    // Başlık satırı: yalnızca en baştaki (veya '---' sonrasındaki) ilk satırda ara
    if (!headerConsumed && line.trim()) {
      const prev = idx > 0 ? lines[idx - 1].trim() : '';
      const atStart = idx === 0 || prev === '' || prev === '---';
      if (atStart) {
        const hm = line.match(HEADER_RE);
        // Başlık, maddenin kendi adıyla başlıyorsa gerçekten künye başlığıdır
        if (hm && norm(hm[1]).startsWith(norm(item.title).slice(0, 8))) {
          yas = hm[2];
          rol = hm[3].trim();
          headerConsumed = true;
          return;
        }
      }
    }

    bodyLines.push(line);
  });

  const ownProse = bodyLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .trim();

  // Kendi metni varsa önce o, sonra künyeden çıkan biyografi
  const body = [ownProse, narrative.join(' ').trim()]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  // Özet: öncelik listesine göre ilk dolu alanın ilk cümlesi
  let ozet = '';
  for (const key of OZET_ONCELIK) {
    const hit = fields.find(f => norm(f.label) === key);
    if (hit) {
      ozet = hit.value.split(/(?<=[.!?])\s/)[0].trim();
      break;
    }
  }
  if (!ozet && body) {
    ozet = body.split(/(?<=[.!?])\s/)[0].trim();
  }
  if (ozet.length > 120) ozet = ozet.slice(0, 117).trimEnd() + '…';

  return { yas, rol, fields, body, ozet };
}

/** Bu maddede ayrıştırılabilir bir künye bloğu var mı */
export function hasParsedKunye(item: Item): boolean {
  const p = parseKunye(item);
  return p.fields.length > 0 || !!p.rol;
}

/**
 * Kişinin rolünü bulur: önce yapılandırılmış alan, sonra künye başlığı,
 * sonra etiketler.
 */
export function getRol(item: Item): string {
  const structured = item.metadata?.profile?.profession;
  if (typeof structured === 'string' && structured.trim()) return structured.trim();

  const parsed = parseKunye(item);
  if (parsed.rol) return parsed.rol;

  if (item.tags.includes('personel')) return 'Personel';
  if (item.tags.includes('misafir')) return 'Misafir';
  if (item.tags.includes('eskort')) return 'Eskort';
  return '';
}

/** Kişileri kabaca sınıflandırır — mekân sayfasında gruplama için */
export type KisiGrubu = 'personel' | 'misafir' | 'eskort' | 'diğer';

export function getKisiGrubu(item: Item): KisiGrubu {
  if (item.tags.includes('personel')) return 'personel';
  if (item.tags.includes('eskort')) return 'eskort';
  if (item.tags.includes('misafir')) return 'misafir';
  return 'diğer';
}

export const GRUP_BASLIK: Record<KisiGrubu, string> = {
  personel: 'Kadro',
  misafir: 'Misafirler',
  eskort: 'Eskortlar',
  diğer: 'Diğer'
};

/**
 * Kalıcı taşıma. Bunu bir kez çalıştırırsan künye bilgisi notes'tan çıkıp
 * metadata.profile içine yazılır ve notes yalnızca gerçek metni tutar.
 *
 * Geri dönüşü olmadığı için çağırmadan önce dışa aktarma alman iyi olur.
 * Wiki bu taşıma yapılmadan da doğru çalışır — taşıma sadece veriyi
 * temizler ve düzenleme formlarının da alanları görmesini sağlar.
 */
export function buildKunyeMigration(item: Item): Partial<Item> | null {
  const p = parseKunye(item);
  if (p.fields.length === 0 && !p.rol) return null;

  const LABEL_TO_PATH: Record<string, string> = {
    'kişilik': 'personality',
    'fizik': 'physique',
    'saç': 'hair',
    'gözler': 'eyes',
    'sevdikleri': 'likes',
    'sevmedikleri': 'dislikes',
    'hobiler': 'hobbies',
    'ayrıntı': 'origin'
  };

  const profile: Record<string, unknown> = { ...(item.metadata?.profile || {}) };

  if (p.rol && !profile.profession) profile.profession = p.rol;
  if (p.yas && !profile.age) profile.age = p.yas;

  p.fields.forEach(f => {
    const path = LABEL_TO_PATH[norm(f.label)];
    const key = path || norm(f.label);
    if (!profile[key]) profile[key] = f.value;
  });

  return {
    notes: p.body,
    metadata: { ...(item.metadata || {}), profile }
  };
}
