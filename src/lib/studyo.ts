import type { Item, ItemType, WikiSection } from '../types';
import { aiCagir, AiHatasi } from './aiCagir';

/**
 * Yapay zekâ stüdyosu (29 Eylül akşamı).
 *
 * Kemal'in kararları:
 *   - Bütün yapay zekâ işleri tek yerde, Araçlar'daki stüdyoda. Sayfalarda
 *     yalnız "✨ Stüdyoda aç" kalır; basınca stüdyo yan panelde, o madde
 *     seçili açılır.
 *   - Kartlar sayfaya göre gruplu: Viki · Yazı · Marka ve Merch · Kanon.
 *   - Her sonuç öneri tepsisine düşer (Adaylar'la tek tepsi). Kemal "Ekle"
 *     demeden hiçbir kayda yazılmaz; "Sil" deyince gider.
 *   - "Devam et" araçları kalır, yalnız stüdyoda.
 *   - Kota dolunca yalnız stüdyo "yarın tekrar dene" der; uygulamanın geri
 *     kalanı etkilenmez.
 *
 * Öneri ayrı bir kayıt: `type: 'aday'`, `metadata.aday.tur = 'yapay_zeka'`.
 * Firestore iç içe dizi kabul etmez; sonuçlar düz dizi ya da nesne dizisi.
 */

export type StudyoGrubu = 'viki' | 'yazi' | 'marka' | 'kanon' | 'sosyal';

export const GRUP_ADLARI: Record<StudyoGrubu, string> = {
  viki: 'Viki',
  yazi: 'Yazı',
  marka: 'Marka ve Merch',
  kanon: 'Kanon',
  sosyal: 'Sosyal medya'
};

export type SonucTuru = 'metin' | 'liste' | 'bolumler' | 'kunye' | 'renkler' | 'urunler';

/** "Ekle" düğmesinin ne yaptığı; null ise yalnız kopyalanır */
export type Uygulama = 'notlara-ekle' | 'bolum-ekle' | 'kunye-ekle' | 'baslik-yap' | 'metnin-yerine' | 'renk-ekle' | 'urun-ekle' | 'hashtag-ekle' | null;

export interface StudyoAraci {
  id: string;
  grup: StudyoGrubu;
  ad: string;
  aciklama: string;
  /** Hangi kayıtlarla çalışır (null: kayıt seçilmez, yalnız yazı) */
  hedefTurleri: ItemType[] | null;
  /** Serbest yazı kutusu (tema, not) */
  serbest?: string;
  sonuc: SonucTuru;
  uygulama: Uygulama;
  /** Kurgu metni yazar — Kemal'e hatırlatılır */
  kurgu?: boolean;
  task: string;
  veri: (hedef: Item | null, serbest: string, items: Item[]) => unknown;
}

const VIKI: ItemType[] = ['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'karakter', 'olay'];
const YAZI: ItemType[] = ['blog_post', 'kitap_bolum'];

const vikiBaglami = (items: Item[]) => items
  .filter(i => !i.archived && !i.isProposal && VIKI.includes(i.type))
  .slice(0, 80)
  .map(e => ({ title: e.title, type: e.type, notes: (e.notes || '').slice(0, 400) }));

export const STUDYO_ARACLARI: StudyoAraci[] = [
  // ---- Viki
  {
    id: 'viki-bolum', grup: 'viki', ad: 'Bölüm öner', kurgu: true,
    aciklama: 'Maddeye 3 bölüm başlığı ve kısa içerik önerir.',
    hedefTurleri: VIKI, sonuc: 'bolumler', uygulama: 'bolum-ekle', task: 'wiki-section-oner',
    veri: h => ({ title: h?.title, type: h?.type, notes: h?.notes || h?.title })
  },
  {
    id: 'viki-kunye', grup: 'viki', ad: 'Künye önerisi',
    aciklama: 'Maddenin metninden künye alanlarını çıkarır.',
    hedefTurleri: VIKI, sonuc: 'kunye', uygulama: 'kunye-ekle', task: 'kunya-cikar',
    veri: h => ({ title: h?.title, type: h?.type, notes: h?.notes || '' })
  },
  {
    id: 'viki-devam', grup: 'viki', ad: 'Devam et', kurgu: true,
    aciklama: 'Madde metnine bir paragraf ekler.',
    hedefTurleri: VIKI, sonuc: 'metin', uygulama: 'notlara-ekle', task: 'devam-et',
    veri: h => ({ text: h?.notes || '', notes: `Varlık: ${h?.title}, türü: ${h?.type}` })
  },
  // ---- Yazı
  {
    id: 'yazi-devam', grup: 'yazi', ad: 'Devam et', kurgu: true,
    aciklama: 'Blog yazısını ya da kitap bölümünü bir paragraf sürdürür.',
    hedefTurleri: YAZI, sonuc: 'metin', uygulama: 'notlara-ekle', task: 'devam-et',
    veri: h => ({ text: h?.notes || '', notes: `Başlık: ${h?.title}` })
  },
  {
    id: 'yazi-baslik', grup: 'yazi', ad: 'Başlık öner',
    aciklama: '5 başlık önerir; birini seçersen yazının başlığı olur.',
    hedefTurleri: YAZI, sonuc: 'liste', uygulama: 'baslik-yap', task: 'baslik-oner',
    veri: h => ({ text: h?.notes || h?.title })
  },
  {
    id: 'yazi-ton', grup: 'yazi', ad: 'Ton düzelt',
    aciklama: 'Metni daha sıcak, arşivsel bir tona çeker. Ekle deyince metnin yerine geçer.',
    hedefTurleri: YAZI, sonuc: 'metin', uygulama: 'metnin-yerine', task: 'ton-duzelt',
    veri: h => ({ text: h?.notes || '', style: 'Nostaljik arşivsel' })
  },
  {
    id: 'yazi-ozet', grup: 'yazi', ad: 'Bölüm özeti',
    aciklama: 'Kitap bölümünün kısa özetini çıkarır.',
    hedefTurleri: ['kitap_bolum'], sonuc: 'metin', uygulama: null, task: 'bolum-ozeti',
    veri: h => ({ text: h?.notes || '' })
  },
  {
    id: 'yazi-fikir', grup: 'yazi', ad: 'Sonraki bölüm için fikir', kurgu: true,
    aciklama: 'Bölümden sonra hikâyenin nereye gidebileceğine dair 3 fikir.',
    hedefTurleri: ['kitap_bolum'], sonuc: 'metin', uygulama: null, task: 'sonraki-fikir',
    veri: h => ({ text: h?.notes || '' })
  },
  // ---- Marka ve Merch
  {
    id: 'marka-renk', grup: 'marka', ad: 'Renk paleti öner',
    aciklama: 'Markanın ya da kurumun notlarından 4 renk önerir.',
    hedefTurleri: ['marka', 'kulüp'], sonuc: 'renkler', uygulama: 'renk-ekle', task: 'logo-renk-cikar',
    veri: h => ({ logoDescription: h?.metadata?.brandKit?.selectedLogo || h?.notes || h?.title })
  },
  {
    id: 'merch-oner', grup: 'marka', ad: 'Ürün fikri',
    aciklama: 'Bir drop için 3 ürün fikri. Ekle deyince ürün "Konsept" olarak drop\'a girer. Fiyat önermez.',
    hedefTurleri: ['drop'], serbest: 'Tema ya da not (isteğe bağlı)', sonuc: 'urunler', uygulama: 'urun-ekle', task: 'merch-oner',
    veri: (h, s) => ({ brandInfo: [h?.title, h?.notes].filter(Boolean).join(' — '), notes: s, category: 'hepsi' })
  },
  // ---- Kanon
  {
    id: 'kanon-tutarlilik', grup: 'kanon', ad: 'Tutarlılık kontrolü',
    aciklama: 'Metni vikiyle karşılaştırır, çelişki varsa söyler.',
    hedefTurleri: [...YAZI, ...VIKI], sonuc: 'metin', uygulama: null, task: 'tutarlilik-kontrolu',
    veri: (h, _s, items) => ({ text: h?.notes || '', wikiContext: vikiBaglami(items) })
  },
  {
    id: 'kanon-lore-bagi', grup: 'kanon', ad: 'Lore bağı',
    aciklama: 'Metnin vikideki hangi maddelerle bağlanabileceğini önerir.',
    hedefTurleri: [...YAZI, ...VIKI], sonuc: 'metin', uygulama: null, task: 'lore-bagi',
    veri: (h, _s, items) => ({ text: h?.notes || '', existingEntities: vikiBaglami(items).map(e => ({ title: e.title, type: e.type })) })
  },
  // ---- Sosyal medya (gönderi kartındaki "Stüdyoda aç")
  {
    id: 'sosyal-hashtag', grup: 'sosyal', ad: 'Hashtag öner',
    aciklama: 'Gönderinin metnine ve bağlarına bakıp hashtag önerir. Ekle deyince hashtag alanına eklenir.',
    hedefTurleri: ['sosyal_gonderi'], sonuc: 'liste', uygulama: 'hashtag-ekle', task: 'sosyal-hashtag',
    veri: (h, _s, items) => ({ baslik: h?.title || '', metin: h?.notes || '', baglar: (h?.links || []).map(id => items.find(i => i.id === id)?.title).filter(Boolean) })
  },
  {
    id: 'sosyal-metin', grup: 'sosyal', ad: 'Metin taslağı', kurgu: true,
    aciklama: 'Gönderi için kısa bir metin taslağı. Ekle deyince metnin yerine geçer.',
    hedefTurleri: ['sosyal_gonderi'], serbest: 'Ne anlatsın? (isteğe bağlı)', sonuc: 'metin', uygulama: 'metnin-yerine', task: 'sosyal-metin',
    veri: (h, s, items) => ({ baslik: h?.title || '', metin: h?.notes || '', istek: s, baglar: (h?.links || []).map(id => items.find(i => i.id === id)).filter(Boolean).map(i => ({ title: i!.title, notes: (i!.notes || '').slice(0, 400) })) })
  }
];

export const aracBul = (id?: string | null) => STUDYO_ARACLARI.find(a => a.id === id);

// ---------------------------------------------------------------- öneri kaydı

export interface StudyoSonucu {
  metin?: string;
  liste?: string[];
  bolumler?: Array<{ title: string; content: string }>;
  kunye?: Record<string, string>;
  renkler?: Array<{ hex: string; name: string }>;
  urunler?: Array<{ title: string; description: string; slogan: string }>;
}

export interface YapayZekaOnerisi extends StudyoSonucu {
  tur: 'yapay_zeka';
  durum: 'bekliyor';
  arac: string;
  hedefId: string;
  hedefAdi: string;
  tarih: string;
}

export const yapayZekaOnerisi = (i: Item): YapayZekaOnerisi | undefined => {
  const a = i.type === 'aday' ? (i.metadata?.aday as YapayZekaOnerisi | undefined) : undefined;
  return a?.tur === 'yapay_zeka' ? a : undefined;
};

function jsonAyikla(ham: unknown): unknown {
  if (typeof ham !== 'string') return ham;
  try { return JSON.parse(ham.replace(/^```(json)?|```$/gm, '').trim()); } catch { return null; }
}

const metinMi = (x: unknown): x is string => typeof x === 'string' && !!x.trim();

/** Sunucunun cevabını aracın sonuç türüne çevirir; bozuksa hata */
export function sonucuAyikla(arac: StudyoAraci, ham: unknown): StudyoSonucu {
  const bozuk = () => { throw new AiHatasi('Yapay zekâ beklenmedik bir cevap döndü; bir daha dene.'); };
  switch (arac.sonuc) {
    case 'metin':
      return metinMi(ham) ? { metin: ham.trim() } : bozuk();
    case 'liste': {
      const v = jsonAyikla(ham);
      return Array.isArray(v) && v.some(metinMi) ? { liste: v.filter(metinMi).map(x => x.trim()).slice(0, 8) } : bozuk();
    }
    case 'bolumler': {
      const v = jsonAyikla(ham);
      const b = Array.isArray(v) ? v.filter(x => x && metinMi(x.title)).map(x => ({ title: String(x.title), content: String(x.content || '') })) : [];
      return b.length ? { bolumler: b.slice(0, 6) } : bozuk();
    }
    case 'kunye': {
      const v = jsonAyikla(ham) as { profile?: Record<string, unknown> } | null;
      const p = v?.profile && typeof v.profile === 'object' ? v.profile : null;
      const k: Record<string, string> = {};
      for (const [a, d] of Object.entries(p || {})) if (metinMi(d)) k[a] = d.trim();
      return Object.keys(k).length ? { kunye: k } : bozuk();
    }
    case 'renkler': {
      const v = jsonAyikla(ham);
      const r = Array.isArray(v) ? v.filter(x => x && /^#[0-9a-f]{6}$/i.test(String(x.hex))).map(x => ({ hex: String(x.hex).toUpperCase(), name: String(x.name || '') })) : [];
      return r.length ? { renkler: r.slice(0, 6) } : bozuk();
    }
    case 'urunler': {
      const v = jsonAyikla(ham);
      const u = Array.isArray(v) ? v.filter(x => x && metinMi(x.title)).map(x => ({ title: String(x.title), description: String(x.description || ''), slogan: String(x.slogan || '') })) : [];
      return u.length ? { urunler: u.slice(0, 5) } : bozuk();
    }
  }
}

/** Öneri tepsisine yazılacak kayıt */
export function oneriKaydi(arac: StudyoAraci, hedef: Item | null, sonuc: StudyoSonucu): Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> {
  const bilgi: YapayZekaOnerisi = {
    tur: 'yapay_zeka', durum: 'bekliyor', arac: arac.id,
    hedefId: hedef?.id || '', hedefAdi: hedef?.title || '',
    tarih: new Date().toISOString().slice(0, 10),
    ...sonuc
  };
  return {
    title: `${arac.ad}${hedef ? ` · ${hedef.title}` : ''}`,
    area: 'komuta',
    type: 'aday',
    status: 'Fikir',
    priority: 'orta',
    tags: ['aday', 'studyo'],
    links: hedef ? [hedef.id] : [],
    notes: sonuc.metin || '',
    images: [],
    isProposal: false,
    archived: false,
    metadata: { aday: bilgi }
  };
}

// ---------------------------------------------------------------- "Ekle"

export interface EkleSecimi {
  /** baslik-yap: seçilen başlık; urun-ekle: hangi ürün (sıra) */
  secim?: string | number;
}

/**
 * "Ekle": öneriyi hedef kayda uygular. Yeni kayıt gerekiyorsa (ürün)
 * `yeni` döner. Hedef bulunamazsa null.
 */
export function oneriyiUygula(
  oneri: YapayZekaOnerisi, items: Item[], s: EkleSecimi = {}
): { guncel?: Item; yeni?: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> } | null {
  const arac = aracBul(oneri.arac);
  const hedef = items.find(i => i.id === oneri.hedefId);
  if (!arac?.uygulama || !hedef) return null;
  const simdi = Date.now();
  switch (arac.uygulama) {
    case 'notlara-ekle':
      return { guncel: { ...hedef, notes: [(hedef.notes || '').trim(), oneri.metin || ''].filter(Boolean).join('\n\n'), updatedAt: simdi } };
    case 'metnin-yerine':
      return oneri.metin ? { guncel: { ...hedef, notes: oneri.metin, updatedAt: simdi } } : null;
    case 'baslik-yap':
      return typeof s.secim === 'string' && s.secim.trim() ? { guncel: { ...hedef, title: s.secim.trim(), updatedAt: simdi } } : null;
    case 'bolum-ekle': {
      const eski = (hedef.metadata?.wikiSections as WikiSection[]) || [];
      const yeni: WikiSection[] = (oneri.bolumler || []).map((b, n) => ({ id: `studyo_${simdi}_${n}`, title: b.title, content: b.content, status: 'öneri' }));
      return { guncel: { ...hedef, metadata: { ...hedef.metadata, wikiSections: [...eski, ...yeni] }, updatedAt: simdi } };
    }
    case 'kunye-ekle': {
      // Dolu alanın üstüne yazılmaz; yalnız boş olanlar dolar
      const profil = { ...((hedef.metadata?.profile as Record<string, string>) || {}) };
      for (const [k, v] of Object.entries(oneri.kunye || {})) if (!String(profil[k] || '').trim()) profil[k] = v;
      return { guncel: { ...hedef, metadata: { ...hedef.metadata, profile: profil }, updatedAt: simdi } };
    }
    case 'renk-ekle': {
      const kit = hedef.metadata?.brandKit || { selectedLogo: '', ideaLogos: [], colorPalette: [], exemplaryWorks: [] };
      const palet = Array.from(new Set([...(kit.colorPalette || []), ...(oneri.renkler || []).map(r => r.hex)]));
      return { guncel: { ...hedef, metadata: { ...hedef.metadata, brandKit: { ...kit, colorPalette: palet } }, updatedAt: simdi } };
    }
    case 'hashtag-ekle': {
      const g = (hedef.metadata?.gonderi as Record<string, unknown>) || {};
      const eski = String(g.hashtag || '').split(/\s+/).filter(Boolean);
      const yeni = (oneri.liste || []).map(x => '#' + x.replace(/^#+/, '').replace(/\s+/g, ''));
      const hepsi = Array.from(new Set([...eski, ...yeni])).join(' ');
      return { guncel: { ...hedef, metadata: { ...hedef.metadata, gonderi: { ...g, hashtag: hepsi } }, updatedAt: simdi } };
    }
    case 'urun-ekle': {
      const u = oneri.urunler?.[typeof s.secim === 'number' ? s.secim : 0];
      if (!u) return null;
      return {
        yeni: {
          title: u.title,
          area: 'merch',
          type: 'merch_urun',
          status: 'Konsept',
          priority: 'orta',
          tags: ['merch', 'merch_urun'],
          links: [hedef.id],
          notes: [u.description, u.slogan ? `Slogan önerisi: ${u.slogan}` : ''].filter(Boolean).join('\n\n'),
          images: [],
          isProposal: false,
          archived: false,
          metadata: { dropId: hedef.id, themeId: hedef.metadata?.themeId || '', category: 'giyim' }
        }
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------- kota

const KOTA_ANAHTARI = 'kems_ai_kota_doldu';
const bugun = () => new Date().toISOString().slice(0, 10);

export type KotaHali = 'hazir' | 'doldu' | 'sunucu-yok';

export function kotaHali(): KotaHali {
  try {
    const v = localStorage.getItem(KOTA_ANAHTARI);
    if (v === `sunucu:${bugun()}`) return 'sunucu-yok';
    if (v === bugun()) return 'doldu';
  } catch { /* yok */ }
  return 'hazir';
}

function kotaYaz(v: string | null) {
  try { if (v) localStorage.setItem(KOTA_ANAHTARI, v); else localStorage.removeItem(KOTA_ANAHTARI); } catch { /* yok */ }
}

/**
 * Aracı çalıştırır. Kota ya da sunucu hatası günlük olarak not edilir;
 * stüdyonun üst satırı buradan okur. Başarılı çağrı notu siler.
 */
export async function araciCalistir(arac: StudyoAraci, hedef: Item | null, serbest: string, items: Item[]): Promise<StudyoSonucu> {
  try {
    const ham = await aiCagir<unknown>(arac.task, arac.veri(hedef, serbest, items));
    const sonuc = sonucuAyikla(arac, ham);
    kotaYaz(null);
    return sonuc;
  } catch (e) {
    hatayiNotEt(e);
    throw e;
  }
}

/** Kota ya da sunucu hatasını günlük not eder (stüdyonun üst satırı için) */
export function hatayiNotEt(e: unknown) {
  if (!(e instanceof AiHatasi)) return;
  if (e.sunucuYok) kotaYaz(`sunucu:${bugun()}`);
  else if (/kota|quota|RESOURCE_EXHAUSTED|429/i.test(e.message)) kotaYaz(bugun());
}

/** Başarılı çağrıdan sonra notu siler */
export const kotaNotunuSil = () => kotaYaz(null);
