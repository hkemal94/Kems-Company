import type { Item, WikiSection } from '../types';
import { kurumMu } from './markaYapisi';
import { ADA_KIMLIGI } from './vikiSifirlama';

/**
 * Kanon kararları ve eski otel yazıları (29 Eylül 2026 akşamı).
 *
 * Kemal ad ve tarih sorularını tek tek cevapladı; eski otel simülasyonundan
 * kalan yazılar için de karar verdi:
 *   - Düzada notundaki "Ekim 2003 (Sezon Sonu)" paragrafı silinir.
 *   - "Liman 54" ve "Peron" adlarının geçtiği cümleler çıkar.
 *   - Otelin "Oda Yapısı" bölümü silinir.
 *   - 20 oda kaydı ("Deluxe", "bakımda") Temizlik kartında bütünüyle
 *     silinir — `lib/temizlik.ts`. Burada başka maddelerdeki izler temizlenir.
 * Kanon: Küçükçetmi ailesi Eskibey Ailesi; kooperatifin Yağ Fabrikası
 * (kuruluş 1950–1970 arası); Dirlik'in rakibi Küçükkuyu Gençlerbirliği;
 * Dondurmacı Kızlar'ın sahibi şimdilik "Eylül Hanım" (yalnız ad, Kemal'in
 * kararı; başka bir şey yazılmaz); "Kemsköy" yerel söyleyiş; antik
 * yerleşim Bizans ağırlıklı; altı yapının adı kesinleşti.
 *
 * Arşiv yok (Kemal, 29 Eylül): eski yazı silinir. Kart önce değişecek
 * kayıtların yedeğini indirir. İkinci basışta yapılacak iş kalmaz.
 */

type Alanlar = Array<[string, string]>;

/** Eski simülasyonun izi: tek başına paragraf ya da cümle olarak silinir */
const ESKI_DONEM = /Ekim 2003|Oct(ober)? 2003|Sezon Sonu/i;
const ESKI_AD = /Liman 54|\bPeron\b/i;
const ESKI_BOLUM = /^\s*oda yapısı\s*$/i;
const ODA_IZI = /Deluxe|bakımda/i;

/** Eski yazı temizliği yalnız viki maddelerinde; blog ve kitap metni Kemal'in */
const VIKI_TURLERI = new Set(['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'olay']);

/** Kesinleşen geçici adlar (adiGecici işareti kalkar) */
const KESIN_ADLAR = /^(Güney Burnu|Liman Deposu|Düzada İlkokulu|Merkez Pazarı|Çarşı Apartmanı|Zeytinli Apartmanı)$/i;

/** Kimlik → künye satırı (aynı başlık varsa değeri değişir, yoksa eklenir) */
const KUNYE: Record<string, Alanlar> = {
  [ADA_KIMLIGI]: [
    ['Kemsköy adı', 'Yerel söyleyiş; kökeni bilinmiyor']
  ],
  viki_yer_ciftlik: [
    ['Küçükçetmi Çiftliği', "Eskibey Ailesi; Küçükkuyu'dan gelmiş (20. yy başı); çiftlik evi kulüp evi; mahallenin iç tarafında, tepeye yakın"],
    ['Kooperatif', 'Kemsköy Ziraat İşletmeleri Kurumu; Yağ Fabrikası'],
    ['Yağ Fabrikası', 'Kooperatifin zeytinyağı fabrikası; kuruluş 1950–1970 arası']
  ],
  viki_mekan_liman_kafe: [
    ['Sahibi', "Eylül Hanım (Sade Meze'nin de sahibi)"]
  ]
};

/** Kurumlar adla bulunur */
const KURUM_KUNYE: Array<[RegExp, Alanlar]> = [
  [/dirlik/i, [['Rakip', 'Küçükkuyu Gençlerbirliği; sevgi–nefret ilişkisi']]],
  [/küçükçetmi|kucukcetmi/i, [['Aile', 'Eskibey Ailesi']]]
];

/** Bölüm paragrafı değişimi: kimlik → [paragraf eşleşmesi, yeni paragraf] */
const PARAGRAF: Record<string, Array<[RegExp, string]>> = {
  [ADA_KIMLIGI]: [
    [/Antik yerleşimin dönemi belirlenmedi\./, "Liman'ın açığında antik amfora alanı; rehberli dalış. Antik yerleşim Bizans ağırlıklı; yer yer Antik Yunan izleri."]
  ]
};

const satirAnahtari = (k: string) => `* ${k}:`;

/** Künyede aynı başlıklı satırı değiştirir ya da ekler */
function kunyeYaz(notes: string, alanlar: Alanlar): string {
  let satirlar = (notes || '').split('\n');
  const eklenecek: string[] = [];
  for (const [k, v] of alanlar) {
    const yeni = `${satirAnahtari(k)} ${v}`;
    const i = satirlar.findIndex(s => s.trim().startsWith(satirAnahtari(k)));
    if (i < 0) eklenecek.push(yeni);
    else satirlar = satirlar.map((s, n) => (n === i ? yeni : s));
  }
  return [satirlar.join('\n').trim(), ...eklenecek].filter(Boolean).join('\n');
}

/** Bir metinden eski dönem paragraflarını ve eski adların geçtiği cümleleri çıkarır */
function metniTemizle(metin: string, silinen: string[]): string {
  const paragraflar = (metin || '').split(/\n\s*\n/);
  const kalan: string[] = [];
  for (const p of paragraflar) {
    if (ESKI_DONEM.test(p)) { silinen.push(p.trim()); continue; }
    // Satır satır (künye satırları ayrı satırda); satırda cümle cümle
    const satirlar = p.split('\n').map(satir => {
      if (!ESKI_AD.test(satir)) return satir;
      if (/^\s*\*\s[^:]+:/.test(satir)) { silinen.push(satir.trim()); return null; }
      const cumleler = satir.split(/(?<=[.!?])\s+/);
      const iyi = cumleler.filter(c => {
        if (ESKI_AD.test(c)) { silinen.push(c.trim()); return false; }
        return true;
      });
      return iyi.length ? iyi.join(' ') : null;
    }).filter((s): s is string => s !== null);
    if (satirlar.join('').trim()) kalan.push(satirlar.join('\n'));
  }
  return kalan.join('\n\n');
}

export interface KanonDegisikligi {
  item: Item;
  /** Kemal'e gösterilecek kısa açıklamalar */
  neler: string[];
}

export function kanonKararlari(items: Item[]): KanonDegisikligi[] {
  const cikti: KanonDegisikligi[] = [];
  // Odalar Temizlik kartında bütünüyle silinir; burada dokunulmaz
  const canli = items.filter(i => !i.archived && i.type !== 'aday' && i.type !== 'oda');

  for (const item of canli) {
    const neler: string[] = [];
    let notes = item.notes || '';
    let meta: Record<string, unknown> = { ...(item.metadata || {}) };
    let bolumler: WikiSection[] = ((item.metadata?.wikiSections as WikiSection[]) || []).map(b => ({ ...b }));
    let bolumDegisti = false;

    // 1. Eski otel yazıları — yalnız viki maddelerinde (blog ve kitap metnine dokunulmaz)
    const vikiMi = VIKI_TURLERI.has(item.type);
    const silinen: string[] = [];
    const yeniNotes = vikiMi ? metniTemizle(notes, silinen) : notes;
    if (silinen.length) { notes = yeniNotes; }
    const onceki = bolumler.length;
    bolumler = bolumler.filter(b => {
      if (vikiMi && ESKI_BOLUM.test(b.title || '')) { neler.push(`"${b.title}" bölümü silinir`); return false; }
      return true;
    });
    if (bolumler.length !== onceki) bolumDegisti = true;
    if (vikiMi) bolumler = bolumler.map(b => {
      const s: string[] = [];
      const c = metniTemizle(b.content || '', s);
      if (!s.length) return b;
      silinen.push(...s);
      bolumDegisti = true;
      return { ...b, content: c, status: c.trim() ? b.status : 'boş' };
    });
    for (const s of silinen) neler.push(`silinir: "${s.length > 90 ? s.slice(0, 90) + '…' : s}"`);

    // Künye (profil) alanları
    const profil = { ...((meta.profile as Record<string, unknown>) || {}) };
    let profilDegisti = false;
    for (const [k, v] of Object.entries(profil)) {
      if (typeof v === 'string' && (ESKI_DONEM.test(v) || ESKI_AD.test(v) || ODA_IZI.test(v))) {
        neler.push(`künye "${k}" boşalır`);
        profil[k] = '';
        profilDegisti = true;
      }
    }
    if (profilDegisti) meta.profile = profil;

    // Oda alanları
    if (typeof meta.roomType === 'string' && ODA_IZI.test(meta.roomType)) {
      neler.push(`oda tipi "${meta.roomType}" silinir`);
      meta.roomType = '';
    }
    for (const k of ['isMaintenance', 'maintenanceReason']) {
      const v = meta[k];
      if (v === true || (typeof v === 'string' && v.trim())) {
        neler.push('"bakımda" işareti silinir');
        meta[k] = typeof v === 'boolean' ? false : '';
      }
    }

    // 2. Kanon kararları
    const alanlar: Alanlar = [...(KUNYE[item.id] || [])];
    if ((item.type === 'kulüp' || item.type === 'marka') && kurumMu(item)) {
      for (const [ad, a] of KURUM_KUNYE) if (ad.test(item.title)) alanlar.push(...a);
    }
    if (alanlar.length) {
      const yazildi = kunyeYaz(notes, alanlar);
      if (yazildi !== notes.trim()) {
        for (const [k, v] of alanlar) {
          if (!notes.includes(`${satirAnahtari(k)} ${v}`)) neler.push(`künye · ${k}: ${v}`);
        }
        notes = yazildi;
      }
    }
    for (const [re, yeni] of PARAGRAF[item.id] || []) {
      bolumler = bolumler.map(b => {
        const p = (b.content || '').split(/\n\s*\n/);
        const i = p.findIndex(x => re.test(x));
        if (i < 0) return b;
        neler.push(`"${b.title}": ${yeni}`);
        bolumDegisti = true;
        return { ...b, content: p.map((x, n) => (n === i ? yeni : x)).join('\n\n') };
      });
    }
    if (meta.adiGecici && KESIN_ADLAR.test(item.title.trim())) {
      neler.push('adı kesinleşti ("geçici ad" işareti kalkar)');
      meta.adiGecici = false;
    }

    if (!neler.length) continue;
    if (bolumDegisti) meta.wikiSections = bolumler;
    cikti.push({ item: { ...item, notes, metadata: meta as Item['metadata'], updatedAt: Date.now() }, neler });
  }
  return cikti;
}
