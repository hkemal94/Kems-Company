import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CircleCheck, Compass } from 'lucide-react';
import type { AreaType, Item } from '../types';
import { DUZADA_GEO } from '../data/duzadaGeo';
import { isStub, getKunyeFields, getArticleBody } from './wiki/wikiSchema';
import { getRol } from './wiki/kunyeParser';
import { isEntityUnlinked } from '../utils/relations';
import { oTemizligi } from '../lib/yaziTemizligi';
import { temaDurumu, temaKaldirmaYazilari } from '../lib/temaKaldirma';
import { markaYapisi, markaGocu, markaGocuYazilari } from '../lib/markaYapisi';
import { otelTemizligi } from '../lib/otelTemizligi';
import { vikiSifirlama, vikiSifirlamaYazilari } from '../lib/vikiSifirlama';
import { soruCevapAktarimi } from '../lib/soruCevapAktarimi';
import { w3Aktarimi } from '../lib/w3Aktarimi';
import { w4Aktarimi } from '../lib/w4Aktarimi';
import { w5Aktarimi, w5GorselAdresi, W5_ETIKETI } from '../lib/w5Aktarimi';
import { eskiYaziTemizligi } from '../lib/eskiYaziTemizligi';

/**
 * "Neyin eksik" paneli (A1).
 *
 * Anasayfada zaten sayılar vardı: 93 kişi, 43 mekân, 3 marka. Ama sayı
 * "ne yapmam lazım" sorusuna cevap vermiyor. 93 kişinin kaçının görevi boş,
 * haritadaki kaç yapının maddesi hiç açılmamış, hangi markanın sloganı yok —
 * bunları görmek için tek tek gezmek gerekiyordu.
 *
 * Bu panel onları tek ekranda topluyor. Her satır: kaç tane, neyin eksik,
 * tıklayınca nereye gidiyor. Hiçbir şey eksik değilse panel kendini gizler —
 * boş bir "her şey yolunda" kutusu yer kaplamasın.
 *
 * Kural: uydurma iş üretmiyor. Her satır gerçek bir veriden sayılıyor;
 * sayı sıfırsa satır yok.
 */

export interface Eksik {
  anahtar: string;
  sayi: number;
  baslik: string;
  aciklama: string;
  alan: AreaType;
  /** Tıklayınca açılacak madde — varsa doğrudan oraya gider */
  hedefId?: string;
  /**
   * Bu başlığın altındaki kayıtlar ve her birinde eksik olan (29 Eylül,
   * Kemal: "basınca genel bir yere varıyor, direkt o başlığı öneri olarak
   * görebilmek isterim"). Satıra basınca liste yerinde açılır.
   */
  kayitlar?: Array<{ id?: string; ad: string; not?: string }>;
}

/** Maddenin künyesinde boş kalan alanlar — "neyi eksik" satırı */
function bosAlanlar(i: Item): string {
  const bos = getKunyeFields(i, { includeEmpty: true }).filter(f => !f.value).map(f => f.label.toLocaleLowerCase('tr'));
  const govde = getArticleBody(i).length === 0;
  const parcalar = [...(govde ? ['sayfa metni'] : []), ...bos];
  return parcalar.length ? `boş: ${parcalar.slice(0, 4).join(', ')}${parcalar.length > 4 ? '…' : ''}` : '';
}

/** Haritada maddesi olması gereken yapılar */
function haritaBeklentisi(): Array<{ wikiId: string; ad: string }> {
  const cikti: Array<{ wikiId: string; ad: string }> = [];
  for (const f of DUZADA_GEO.features) {
    const p = f.properties as Record<string, unknown> | null;
    if (!p || p.katman !== 'bina') continue;
    if (typeof p.wikiId !== 'string' || !p.wikiId) continue;
    if (cikti.some(x => x.wikiId === p.wikiId)) continue;  // otelin kuleleri
    cikti.push({ wikiId: p.wikiId, ad: String(p.ad || '') });
  }
  return cikti;
}

/**
 * Kişinin rolü belli mi.
 *
 * Rol ayrı bir metadata alanı DEĞİL: künye metninden, profilden ya da
 * etiketten çözülüyor. İlk yazdığımda metadata'da `gorev` diye bir alan
 * aradım, öyle bir alan yok, o yüzden 94 kişinin 94'ü "eksik" çıktı —
 * hiçbir işe yaramayan bir sayı. getRol uygulamanın kendi çözümleyicisi.
 */
function rolBos(i: Item): boolean {
  return !getRol(i).trim();
}

export function eksikleriCikar(items: Item[]): Eksik[] {
  const canli = items.filter(i => !i.archived);
  const kimlikler = new Set(canli.map(i => i.id));
  const eksikler: Eksik[] = [];

  // --- Harita: maddesi hiç açılmamış yapılar
  const maddesiz = haritaBeklentisi().filter(b => !kimlikler.has(b.wikiId));
  if (maddesiz.length) {
    eksikler.push({
      anahtar: 'harita-madde',
      sayi: maddesiz.length,
      baslik: 'yapının maddesi yok',
      aciklama: maddesiz.slice(0, 3).map(b => b.ad).join(', ')
        + (maddesiz.length > 3 ? '…' : '')
        + ' · haritada üstüne tıkla, künyesi haritadan dolsun',
      alan: 'duzada',
      kayitlar: maddesiz.map(b => ({ ad: b.ad || b.wikiId, not: 'Düzada Haritası\'nda yapının üstüne tıkla' }))
    });
  }

  // --- Wiki: açılmış ama içi boş maddeler
  const wikiTipleri = new Set(['mekân', 'dükkân', 'kulüp', 'yer', 'kisi', 'karakter']);
  const taslaklar = canli.filter(
    i => wikiTipleri.has(i.type) && !i.isProposal && isStub(i)
  );
  if (taslaklar.length) {
    eksikler.push({
      anahtar: 'taslak',
      sayi: taslaklar.length,
      baslik: 'madde taslak hâlde',
      aciklama: 'künyesi ya da gövdesi doldurulmayı bekliyor',
      alan: 'duzada',
      hedefId: taslaklar[0].id,
      kayitlar: taslaklar.map(i => ({ id: i.id, ad: i.title, not: bosAlanlar(i) }))
    });
  }

  // --- Wiki: evrende hiçbir şeye bağlı olmayanlar
  const kopuk = canli.filter(
    i => wikiTipleri.has(i.type) && !i.isProposal && isEntityUnlinked(i, canli)
  );
  if (kopuk.length) {
    eksikler.push({
      anahtar: 'kopuk',
      sayi: kopuk.length,
      baslik: 'madde hiçbir şeye bağlı değil',
      aciklama: 'bağlanmayan madde wiki\'yi ölü gösterir — en az bir ilişki kur',
      alan: 'duzada',
      hedefId: kopuk[0].id,
      kayitlar: kopuk.map(i => ({ id: i.id, ad: i.title, not: 'hiçbir maddeye bağlı değil' }))
    });
  }

  // --- Kişiler: görevi yazılmamış olanlar
  const gorevsiz = canli.filter(
    i => (i.type === 'kisi' || i.type === 'karakter') && !i.isProposal && rolBos(i)
  );
  if (gorevsiz.length) {
    eksikler.push({
      anahtar: 'gorev',
      sayi: gorevsiz.length,
      baslik: 'kişinin rolü belli değil',
      aciklama: 'künyesinde ne iş yaptığı yazmıyor',
      alan: 'duzada',
      hedefId: gorevsiz[0].id,
      kayitlar: gorevsiz.map(i => ({ id: i.id, ad: i.title, not: 'rolü yazılmamış' }))
    });
  }

  // --- Mekânlar: adı hâlâ jenerik olanlar
  const adsiz = canli.filter(i => !i.isProposal && i.metadata?.adiGecici);
  if (adsiz.length) {
    eksikler.push({
      anahtar: 'ad',
      sayi: adsiz.length,
      baslik: 'yerin adı hâlâ geçici',
      aciklama: adsiz.slice(0, 3).map(i => i.title).join(', '),
      alan: 'duzada',
      hedefId: adsiz[0].id,
      kayitlar: adsiz.map(i => ({ id: i.id, ad: i.title, not: 'ad geçici; asıl adı sen koyacaksın' }))
    });
  }

  // --- Markalar: künyesi yarım olanlar
  /*
   * Marka künyesinin VAR olması yetmiyor: uygulama yeni marka açarken
   * hazır bir kit koyuyor — font 'Inter', palet rastgele. Küçükçetmi'nin
   * kaydında böyle bir palet duruyordu, gerçek markayla (krem + mürekkep)
   * hiç ilgisi yoktu. O yüzden ölçü "kit var mı" değil, "kit gerçek mi".
   */
  // Marka yapısı (7. madde): Kems Company + kurgu içi kurumlar. İkisinin de
  // künyesi gerçek olmalı; kurumun sloganı boş kalabilir (Kemal'in kararı).
  const yapi = markaYapisi(items);
  const markalar = yapi.hepsi.filter(i => !i.isProposal);
  const varsayilanMarka = markalar.filter(i => {
    const bk = i.metadata?.brandKit;
    if (!bk) return true;
    const fontVarsayilan = !bk.selectedFont || bk.selectedFont.trim() === 'Inter';
    const paletBos = !bk.colorPalette?.length;
    const sessiz = !bk.slogan?.trim() && !bk.voiceTone?.trim();
    return fontVarsayilan || paletBos || sessiz;
  });
  if (varsayilanMarka.length) {
    eksikler.push({
      anahtar: 'marka',
      sayi: varsayilanMarka.length,
      baslik: 'markanın künyesi hâlâ varsayılan',
      aciklama: varsayilanMarka.map(i => i.title).join(', ')
        + ' · Markalar\'daki "Canva künyelerini uygula" düğmesi bunu doldurur',
      alan: 'markalar',
      hedefId: varsayilanMarka[0].id,
      kayitlar: varsayilanMarka.map(i => {
        const bk = i.metadata?.brandKit;
        const neler = [
          ...(!bk?.selectedFont || bk.selectedFont.trim() === 'Inter' ? ['yazı tipi'] : []),
          ...(!bk?.colorPalette?.length ? ['renkler'] : []),
          ...(!bk?.slogan?.trim() && !bk?.voiceTone?.trim() ? ['slogan / ses tonu'] : [])
        ];
        return { id: i.id, ad: i.title, not: neler.length ? `varsayılan: ${neler.join(', ')}` : '' };
      })
    });
  }

  // --- Merch: dropu olmayan ürün
  const droplar = new Set(canli.filter(i => i.type === 'drop').map(i => i.id));
  const dropsuzUrun = canli.filter(
    i => i.type === 'merch_urun' && !i.isProposal
      && !droplar.has(String(i.metadata?.dropId || ''))
  );
  if (dropsuzUrun.length) {
    eksikler.push({
      anahtar: 'urun-drop',
      sayi: dropsuzUrun.length,
      baslik: 'ürün bir dropa bağlı değil',
      aciklama: dropsuzUrun.slice(0, 3).map(i => i.title).join(', '),
      alan: 'merch',
      hedefId: dropsuzUrun[0].id,
      kayitlar: dropsuzUrun.map(i => ({ id: i.id, ad: i.title, not: 'bir dropa bağla' }))
    });
  }

  // --- Merch: markası olmayan drop
  // Eskiden burada "dropun teması seçilmemiş" vardı; tema katmanı kaldırıldı
  // (34 cevabın 16. maddesi), artık eksik olan şey markanın kendisi.
  // Satan her zaman gerçek marka (Kems Company). brandId bir kurumu
  // gösteriyorsa drop da "markasız" sayılır — kurum ürün satmaz, ürün
  // kurumdan gelir. Kurum bağı ayrı alanda: kurumId.
  const markaKimlikleri = new Set(
    [yapi.anaMarka, ...yapi.digerMarkalar].filter(Boolean).map(i => i!.id)
  );
  const markasizDrop = canli.filter(
    i => i.type === 'drop' && !i.isProposal
      && !markaKimlikleri.has(String(i.metadata?.brandId || ''))
  );
  if (markasizDrop.length) {
    eksikler.push({
      anahtar: 'drop-marka',
      sayi: markasizDrop.length,
      baslik: 'drop bir markaya bağlı değil',
      aciklama: markasizDrop.map(i => i.title).join(', '),
      alan: 'merch',
      hedefId: markasizDrop[0].id,
      kayitlar: markasizDrop.map(i => ({ id: i.id, ad: i.title, not: 'satan marka seçilmemiş (Kems Company)' }))
    });
  }

  return eksikler.sort((a, b) => b.sayi - a.sayi);
}

/**
 * İçi boş kitap projesi / serisi (34 cevabın 26. maddesi).
 *
 * Kemal: "The Imperial oyunun senaryosu olacaktı, şimdilik silebilirsin içi
 * boş çünkü." Silmiyoruz, arşivliyoruz — bu projede silinen geri gelmiyor,
 * arşivlenen geliyor. Kural tek bir kayda değil, içi boş her projeye işliyor:
 * bölümü olmayan ve gövdesi 120 harften kısa olan proje kaydı.
 */
export function bosProjeler(items: Item[]): Item[] {
  const canli = items.filter(i => !i.archived);
  const bolumSahibi = new Set(
    canli.filter(i => i.type === 'kitap_bolum')
      .map(i => String((i.metadata as any)?.bookId || ''))
  );
  return canli.filter(
    i => i.type === 'kitap_proje' && !i.isProposal
      && !bolumSahibi.has(i.id)
      && (i.notes || '').trim().length < 120
  );
}

interface EksiklerProps {
  items: Item[];
  onSelectArea: (area: AreaType, itemId?: string) => void;
  /** Kayıt yazma — ø temizliği için */
  onUpdateItem?: (item: Item) => Promise<void>;
  /** W5: galeriye görsel eklemek için */
  onAddItem?: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export const Eksikler: React.FC<EksiklerProps> = ({
  items, onSelectArea, onUpdateItem, onAddItem
}) => {
  const eksikler = useMemo(() => eksikleriCikar(items), [items]);
  /** Listesi açık olan eksik başlığı */
  const [acikEksik, setAcikEksik] = useState<string | null>(null);

  /**
   * Norveç ø'sü. Veriye bir kere girmiş ve her yere yayılmış; tek tek
   * düzeltmek mümkün değil. Burası onu sayıyor ve tek düğmeye bağlıyor.
   */
  const temizlik = useMemo(() => oTemizligi(items), [items]);
  const [temizleniyor, setTemizleniyor] = useState(false);
  const [temizlikRaporu, setTemizlikRaporu] = useState<string | null>(null);

  /**
   * Tema katmanının kaldırılması — tek seferlik göç. Eski tema kayıtları
   * arşive kalkar, markaları altlarındaki droplara geçer. Silme yok.
   */
  const tema = useMemo(() => temaDurumu(items), [items]);
  const [temaGocu, setTemaGocu] = useState(false);
  const [temaRaporu, setTemaRaporu] = useState<string | null>(null);

  const temayiKaldir = async () => {
    if (!onUpdateItem || temaGocu) return;
    setTemaGocu(true);
    try {
      const yazilacak = temaKaldirmaYazilari(items);
      let n = 0;
      for (const kayit of yazilacak) { await onUpdateItem(kayit); n++; }
      setTemaRaporu(
        `${tema.temalar.length} tema arşivlendi, ${tema.droplar.length} drop `
        + `doğrudan markaya bağlandı (${n} kayıt yazıldı).`
      );
    } catch (e) {
      setTemaRaporu(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setTemaGocu(false);
    }
  };

  /**
   * Marka yapısı · Adım 2 — kulüpler kurum olur, dropları kurumuna bağlanır.
   * Tek seferlik. Kimlik, künye, arma, palet değişmez; hiçbir şey silinmez.
   */
  const marka = useMemo(() => markaGocu(items), [items]);
  const [markaIsi, setMarkaIsi] = useState(false);
  const [markaRaporu, setMarkaRaporu] = useState<string | null>(null);

  const markayiGocur = async () => {
    if (!onUpdateItem || markaIsi) return;
    setMarkaIsi(true);
    try {
      const yazilacak = markaGocuYazilari(items);
      let n = 0;
      for (const kayit of yazilacak) { await onUpdateItem(kayit); n++; }
      setMarkaRaporu(
        `${marka.tipiDegisecek.length} kulüp kurum oldu, `
        + `${marka.baglanacakDrop.length} drop kurumuna bağlandı (${n} kayıt yazıldı). `
        + `Satan hepsinde Kems Company.`
      );
    } catch (e) {
      setMarkaRaporu(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setMarkaIsi(false);
    }
  };

  /**
   * Otel maddesi temizliği — "Ekim 2008'e taşı" düğmesine basıldıysa veride
   * kalan izi geri alır. Basılmadıysa kart hiç görünmez.
   */
  const otel = useMemo(() => otelTemizligi(items), [items]);
  const [otelIsi, setOtelIsi] = useState(false);
  const [otelRaporu, setOtelRaporu] = useState<string | null>(null);

  const oteliTemizle = async () => {
    if (!onUpdateItem || otelIsi) return;
    setOtelIsi(true);
    try {
      let n = 0;
      for (const kayit of otel.degisenler) { await onUpdateItem(kayit); n++; }
      setOtelRaporu(
        `${otel.bolumSayisi} oyun bölümü vikiden arşive taşındı, `
        + `${otel.tarihSayisi} kayıtta "Ekim 2008" geri alındı (${n} kayıt yazıldı).`
      );
    } catch (e) {
      setOtelRaporu(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setOtelIsi(false);
    }
  };

  const temizle = async () => {
    if (!onUpdateItem || temizleniyor) return;
    setTemizleniyor(true);
    try {
      let n = 0;
      for (const kayit of temizlik.degisenler) { await onUpdateItem(kayit); n++; }
      setTemizlikRaporu(`${n} kayıt düzeltildi.`);
    } catch (e) {
      setTemizlikRaporu(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setTemizleniyor(false);
    }
  };

  /**
   * Vikinin baştan kurulması (W1) — kişiler, odalar, mekânlar arşive kalkar.
   * Ada kaydı, marka/kurumlar ve harita verisi yerinde kalır. Silme yok.
   */
  const viki = useMemo(() => vikiSifirlama(items), [items]);
  const [vikiIsi, setVikiIsi] = useState(false);
  const [vikiRaporu, setVikiRaporu] = useState<string | null>(null);
  // Onay kartın içinde sorulur. window.confirm AI Studio önizlemesinde
  // (çerçeve içinde) engelleniyor, sessizce "hayır" dönüyordu.
  const [vikiOnay, setVikiOnay] = useState(false);

  const vikiyiArsivle = async () => {
    if (!onUpdateItem || vikiIsi) return;
    setVikiOnay(false);
    setVikiIsi(true);
    let n = 0;
    try {
      for (const kayit of vikiSifirlamaYazilari(items)) { await onUpdateItem(kayit); n++; }
      setVikiRaporu(`${n} kayıt arşive kalktı. Viki soru-cevaba hazır.`);
    } catch (e) {
      // Yarıda kaldıysa kart kalan kayıtlarla yeniden görünür; tekrar basılabilir
      setVikiRaporu(
        `${n} kayıt arşive kalktı, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setVikiIsi(false);
    }
  };

  /**
   * Soru-cevapların vikiye aktarılması (W2) — mahalleler, mekânlar, otel,
   * ada ve kurumlar. Kurgu metni yok; yalnız Kemal'in cevapları.
   */
  const aktarim = useMemo(() => soruCevapAktarimi(items), [items]);
  const aktarimIsiVar = aktarim.yeniler.length + aktarim.guncellenenler.length > 0;
  const [aktarimIsi, setAktarimIsi] = useState(false);
  const [aktarimRaporu, setAktarimRaporu] = useState<string | null>(null);
  const [aktarimOnay, setAktarimOnay] = useState(false);

  const vikiyeAktar = async () => {
    if (!onUpdateItem || aktarimIsi) return;
    setAktarimOnay(false);
    setAktarimIsi(true);
    let n = 0;
    try {
      for (const kayit of [...aktarim.yeniler, ...aktarim.guncellenenler]) {
        await onUpdateItem(kayit);
        n++;
      }
      setAktarimRaporu(
        `${n} kayıt yazıldı. Tarihçe gibi boş bölümler "boş" işaretli; onları sen yazacaksın.`
        + (aktarim.bulunamayan.length ? ` Bulunamayan: ${aktarim.bulunamayan.join(', ')}.` : '')
      );
    } catch (e) {
      // Yazılanlar ikinci basışta atlanır; kalanlar için tekrar basılabilir
      setAktarimRaporu(
        `${n} kayıt yazıldı, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setAktarimIsi(false);
    }
  };

  /** W3 soru-cevapları vikiye — tarih aralıkları ve bilgi satırları */
  const w3 = useMemo(() => w3Aktarimi(items), [items]);
  const [w3Isi, setW3Isi] = useState(false);
  const [w3Raporu, setW3Raporu] = useState<string | null>(null);
  const [w3Onay, setW3Onay] = useState(false);

  const w3Aktar = async () => {
    if (!onUpdateItem || w3Isi) return;
    setW3Onay(false);
    setW3Isi(true);
    let n = 0;
    try {
      for (const kayit of w3.guncellenenler) { await onUpdateItem(kayit); n++; }
      setW3Raporu(
        `${n} kayıt güncellendi.`
        + (w3.bulunamayan.length ? ` Bulunamayan: ${w3.bulunamayan.join(', ')}.` : '')
      );
    } catch (e) {
      setW3Raporu(
        `${n} kayıt güncellendi, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setW3Isi(false);
    }
  };

  /** Ada hayatı bilgileri vikiye (W4) — W3 bitince görünür */
  const w4 = useMemo(() => w4Aktarimi(items), [items]);
  const [w4Isi, setW4Isi] = useState(false);
  const [w4Raporu, setW4Raporu] = useState<string | null>(null);
  const [w4Onay, setW4Onay] = useState(false);

  const w4Aktar = async () => {
    if (!onUpdateItem || w4Isi) return;
    setW4Onay(false);
    setW4Isi(true);
    let n = 0;
    try {
      for (const kayit of w4.guncellenenler) { await onUpdateItem(kayit); n++; }
      setW4Raporu(
        `${n} kayıt güncellendi.`
        + (w4.bulunamayan.length ? ` Bulunamayan: ${w4.bulunamayan.join(', ')}.` : '')
      );
    } catch (e) {
      setW4Raporu(
        `${n} kayıt güncellendi, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setW4Isi(false);
    }
  };

  /** W5: viki düzeltmeleri + Canva görselleri galeriye — W4 bitince görünür */
  const w5 = useMemo(() => w5Aktarimi(items), [items]);
  const w5Is = w5.guncellenenler.length + w5.gorseller.length;
  const [w5Isi, setW5Isi] = useState(false);
  const [w5Raporu, setW5Raporu] = useState<string | null>(null);
  const [w5Onay, setW5Onay] = useState(false);

  const w5Aktar = async () => {
    if (!onUpdateItem || !onAddItem || w5Isi) return;
    setW5Onay(false);
    setW5Isi(true);
    let kayit = 0;
    let gorsel = 0;
    const hatalar: string[] = [];
    try {
      // 1. Görsel dosyaları depodan okunur (public/galeri/canva)
      const veriler = new Map<string, string>();
      for (const { gorsel: g } of w5.gorseller) {
        try {
          const yanit = await fetch(w5GorselAdresi(g));
          if (!yanit.ok) throw new Error(String(yanit.status));
          const blob = await yanit.blob();
          const veri = await new Promise<string>((coz, red) => {
            const r = new FileReader();
            r.onload = () => coz(String(r.result || ''));
            r.onerror = () => red(new Error('okunamadı'));
            r.readAsDataURL(blob);
          });
          if (veri.startsWith('data:image/')) veriler.set(g.anahtar, veri);
          else hatalar.push(`${g.baslik}: görsel değil`);
        } catch (e) {
          hatalar.push(`${g.baslik}: ${e instanceof Error ? e.message : 'okunamadı'}`);
        }
      }

      // 2. Kayda bağlanacak görseller, kayıt kimliğine göre
      const bagliGorseller = new Map<string, string[]>();
      for (const { gorsel: g, hedefId } of w5.gorseller) {
        const veri = veriler.get(g.anahtar);
        if (!hedefId || !veri) continue;
        bagliGorseller.set(hedefId, [...(bagliGorseller.get(hedefId) || []), veri]);
      }
      const gorselEkle = (i: Item): Item => {
        const ek = (bagliGorseller.get(i.id) || []).filter(v => !(i.images || []).includes(v));
        return ek.length ? { ...i, images: [...(i.images || []), ...ek] } : i;
      };

      // 3. Viki kayıtları (görselleriyle birlikte)
      const yazilan = new Set<string>();
      for (const k of w5.guncellenenler) {
        await onUpdateItem(gorselEkle(k));
        yazilan.add(k.id);
        kayit++;
      }
      // Etiketi daha önce almış kayıtlara yalnız görsel eklenir
      for (const hedefId of bagliGorseller.keys()) {
        if (yazilan.has(hedefId)) continue;
        const hedef = items.find(i => i.id === hedefId);
        if (!hedef) continue;
        const yeni = gorselEkle(hedef);
        if (yeni !== hedef) { await onUpdateItem({ ...yeni, updatedAt: Date.now() }); kayit++; }
      }

      // 4. Galeri kayıtları
      for (const { gorsel: g, hedefId } of w5.gorseller) {
        const veri = veriler.get(g.anahtar);
        if (!veri) continue;
        await onAddItem({
          title: g.baslik,
          area: 'ilham',
          type: 'ilham_gorsel',
          status: 'Arşivde',
          priority: 'düşük',
          tags: ['galeri', g.tur, 'canva', W5_ETIKETI],
          links: [],
          notes: '',
          images: [veri],
          isProposal: false,
          archived: false,
          metadata: {
            gorselTuru: g.tur,
            kaynakDosya: g.dosya,
            canvaKaynak: g.anahtar,
            canvaTasarim: g.canvaTasarim,
            ...(hedefId ? { bagliId: hedefId } : {})
          }
        });
        gorsel++;
      }
      setW5Raporu(
        `${kayit} kayıt güncellendi, ${gorsel} görsel galeriye eklendi.`
        + (w5.bulunamayan.length ? ` Bulunamayan: ${w5.bulunamayan.join(', ')}.` : '')
        + (hatalar.length ? ` Okunamayan görsel: ${hatalar.join('; ')}. Tekrar basınca yalnız bunlar denenir.` : '')
      );
    } catch (e) {
      setW5Raporu(
        `${kayit} kayıt, ${gorsel} görsel yazıldı, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setW5Isi(false);
    }
  };

  /** Eski otel simülasyonundan kalan yazılar — tek düğmeyle "eski metin"e */
  const eskiYazi = useMemo(() => eskiYaziTemizligi(items), [items]);
  const [eskiIsi, setEskiIsi] = useState(false);
  const [eskiRaporu, setEskiRaporu] = useState<string | null>(null);
  const [eskiOnay, setEskiOnay] = useState(false);

  const eskiYazilariKaldir = async () => {
    if (!onUpdateItem || eskiIsi) return;
    setEskiOnay(false);
    setEskiIsi(true);
    let n = 0;
    try {
      for (const kayit of eskiYazi.degisenler) { await onUpdateItem(kayit); n++; }
      setEskiRaporu(`${n} kayıttan eski yazılar kaldırıldı. Silinmedi — kaydın "eski metin" alanında duruyor.`);
    } catch (e) {
      setEskiRaporu(`${n} kayıt yazıldı, sonra hata: ${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`);
    } finally {
      setEskiIsi(false);
    }
  };

  /** İçi boş proje kayıtları — tek düğmeyle arşive */
  const bosProje = useMemo(() => bosProjeler(items), [items]);
  const [projeIsi, setProjeIsi] = useState(false);
  const [projeRaporu, setProjeRaporu] = useState<string | null>(null);

  const bosProjeleriArsivle = async () => {
    if (!onUpdateItem || projeIsi) return;
    setProjeIsi(true);
    try {
      let n = 0;
      for (const p of bosProje) {
        await onUpdateItem({ ...p, archived: true, updatedAt: Date.now() });
        n++;
      }
      setProjeRaporu(`${n} boş proje arşivlendi. Silinmedi — arşivden geri gelir.`);
    } catch (e) {
      setProjeRaporu(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setProjeIsi(false);
    }
  };

  // Veri henüz yüklenmediyse panel açılmasın: boş listeyi "her şey tamam"
  // diye göstermek yanlış olur.
  // Bu satır bütün useMemo/useState'lerin ALTINDA olmalı: üstte dururken veri
  // yüklenince çağrılan kanca sayısı değişiyordu, React bunu hata sayar.
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-[12px] font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <Compass className="w-4 h-4 text-[#F26B6F]" />
        Neyin Eksik
      </h2>

      {/* Vikinin baştan kurulması (W1) — tek seferlik */}
      {onUpdateItem && viki.arsivlenecek.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {viki.arsivlenecek.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              viki baştan kuruluyor: kayıtlar arşive kalkacak
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {viki.dagilim.map(d => `${d.sayi} ${d.tur}`).join(' · ')}.
              Ada kaydı, Kems Company, kurumlar ve harita yerinde kalır.
              Hiçbir şey silinmez; arşivden geri gelir.
            </span>
          </span>
          {vikiOnay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {viki.arsivlenecek.length} kayıt arşive kalksın mı?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setVikiOnay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={vikiyiArsivle}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, kaldır
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setVikiOnay(true)}
              disabled={vikiIsi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {vikiIsi ? 'Arşivleniyor…' : 'Arşive kaldır'}
            </button>
          )}
        </div>
      )}
      {vikiRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {vikiRaporu}
        </p>
      )}

      {/* W3 soru-cevapları vikiye — tek seferlik */}
      {onUpdateItem && w3.guncellenenler.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {w3.guncellenenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              yeni soru-cevaplar (W3) vikiye aktarılmayı bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {w3.ozet.join(' · ')}.
              Tarihçe bölümleri boş kalır. Hiçbir şey silinmez.
            </span>
          </span>
          {w3Onay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {w3.guncellenenler.length} kayıt güncellensin mi?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setW3Onay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={w3Aktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setW3Onay(true)}
              disabled={w3Isi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {w3Isi ? 'Aktarılıyor…' : 'Vikiye aktar'}
            </button>
          )}
        </div>
      )}
      {w3Raporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {w3Raporu}
        </p>
      )}

      {/* Ada hayatı vikiye (W4) — tek seferlik; önce W3 */}
      {onUpdateItem && w3.guncellenenler.length === 0 && w4.guncellenenler.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {w4.guncellenenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              ada hayatı bilgileri (W4) vikiye aktarılmayı bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {w4.ozet.join(' · ')}.
              Yalnız ekleme; var olan yazıya dokunulmaz, hiçbir şey silinmez.
            </span>
          </span>
          {w4Onay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {w4.guncellenenler.length} kayıt güncellensin mi?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setW4Onay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={w4Aktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setW4Onay(true)}
              disabled={w4Isi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {w4Isi ? 'Aktarılıyor…' : 'Vikiye aktar'}
            </button>
          )}
        </div>
      )}
      {w4Raporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {w4Raporu}
        </p>
      )}

      {/* Eski simülasyon yazıları — tek seferlik */}
      {onUpdateItem && eskiYazi.degisenler.length > 0 && (
        <div className="mb-2.5 flex flex-wrap sm:flex-nowrap items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {eskiYazi.degisenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              eski otel simülasyonundan kalan yazılar vikide duruyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
              {eskiYazi.parca} parça: Ekim 2003 / Sezon Sonu, Liman 54, Peron, Oda Yapısı, Deluxe, bakımda.
              Vikiden kalkar; silinmez, kaydın "eski metin" alanına taşınır.
            </span>
          </span>
          {eskiOnay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {eskiYazi.degisenler.length} kayıttan kaldırılsın mı?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEskiOnay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={eskiYazilariKaldir}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, kaldır
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEskiOnay(true)}
              disabled={eskiIsi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {eskiIsi ? 'Kaldırılıyor…' : 'Vikiden kaldır'}
            </button>
          )}
        </div>
      )}
      {eskiRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {eskiRaporu}
        </p>
      )}

      {/* Viki düzeltmeleri + Canva görselleri (W5) — tek seferlik; önce W4 */}
      {onUpdateItem && onAddItem && w3.guncellenenler.length === 0 && w4.guncellenenler.length === 0 && w5Is > 0 && (
        <div className="mb-2.5 flex flex-wrap sm:flex-nowrap items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {w5Is}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              viki düzeltmeleri ve Canva görselleri (W5) bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
              {w5.ozet.join(' · ')}.
              Değişen satırların eskisi "eski metin"e taşınır; hiçbir şey silinmez.
            </span>
          </span>
          {w5Onay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {w5.guncellenenler.length} kayıt ve {w5.gorseller.length} görsel yazılsın mı?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setW5Onay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={w5Aktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setW5Onay(true)}
              disabled={w5Isi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {w5Isi ? 'Aktarılıyor…' : 'Aktar'}
            </button>
          )}
        </div>
      )}
      {w5Raporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {w5Raporu}
        </p>
      )}

      {/* Soru-cevaplar vikiye (W2) — tek seferlik */}
      {onUpdateItem && aktarimIsiVar && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {aktarim.yeniler.length + aktarim.guncellenenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              soru-cevaplar vikiye aktarılmayı bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {aktarim.ozet.join(' · ')}.
              Yalnız senin cevapların yazılır; boş bölümler boş kalır.
              Hiçbir şey silinmez.
            </span>
          </span>
          {aktarimOnay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {aktarim.yeniler.length + aktarim.guncellenenler.length} kayıt yazılsın mı?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAktarimOnay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={vikiyeAktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAktarimOnay(true)}
              disabled={aktarimIsi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {aktarimIsi ? 'Aktarılıyor…' : 'Vikiye aktar'}
            </button>
          )}
        </div>
      )}
      {aktarimRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {aktarimRaporu}
        </p>
      )}

      {/* ø temizliği — normal bir "eksik" değil, tek seferlik bir düzeltme */}
      {onUpdateItem && temizlik.degisenler.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {temizlik.harf}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              yerde Norveç ø'sü var
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {temizlik.degisenler.length} kayıtta geçiyor — "Kemskøy" gibi.
              Kimliklere ve görsellere dokunulmaz, yalnız ø → ö.
            </span>
          </span>
          <button
            type="button"
            onClick={temizle}
            disabled={temizleniyor}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {temizleniyor ? 'Düzeltiliyor…' : 'Düzelt'}
          </button>
        </div>
      )}
      {/* Marka yapısı · Adım 2 — tek seferlik göç */}
      {onUpdateItem && (marka.tipiDegisecek.length > 0 || marka.baglanacakDrop.length > 0) && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {marka.tipiDegisecek.length + marka.baglanacakDrop.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              kulüp hâlâ marka olarak kayıtlı
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {marka.tipiDegisecek.map(k => k.title).join(', ') || 'Kurumlar'} kurum olur
              {marka.baglanacakDrop.length > 0
                ? `; ${marka.baglanacakDrop.length} drop kendi kurumuna bağlanır, satan Kems Company kalır.`
                : '.'} Arma, palet ve künye olduğu gibi kalır. Hiçbir şey silinmez.
            </span>
          </span>
          <button
            type="button"
            onClick={markayiGocur}
            disabled={markaIsi}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {markaIsi ? 'Taşınıyor…' : 'Kuruma çevir'}
          </button>
        </div>
      )}
      {markaRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {markaRaporu}
        </p>
      )}

      {/* Otel maddesi temizliği — 2008 düğmesinin izi */}
      {onUpdateItem && otel.degisenler.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {otel.degisenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              kayıtta oyun verisi vikiye karışmış
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              "Ekim 2008'e taşı" düğmesinden kalan iz.
              {otel.bolumSayisi > 0 ? ` Otel maddesindeki ${otel.bolumSayisi} "Oyun:" bölümü vikiden çıkıp kaydın arşivine taşınır.` : ''}
              {otel.tarihSayisi > 0 ? ` ${otel.tarihSayisi} kayıtta "Ekim 2008" eski hâline döner.` : ''}
              {' '}Silme yok.
            </span>
          </span>
          <button
            type="button"
            onClick={oteliTemizle}
            disabled={otelIsi}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {otelIsi ? 'Temizleniyor…' : 'Temizle'}
          </button>
        </div>
      )}
      {otelRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {otelRaporu}
        </p>
      )}

      {/* Tema katmanının kaldırılması — tek seferlik göç */}
      {onUpdateItem && tema.temalar.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {tema.temalar.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              tema kaydı hâlâ duruyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              Zincir artık marka → drop → ürün. Temalar arşive kalkar,
              {tema.markaDevri > 0
                ? ` ${tema.markaDevri} dropun markası temadan devralınır.`
                : ' dropların marka bağı korunur.'} Hiçbir şey silinmez.
            </span>
          </span>
          <button
            type="button"
            onClick={temayiKaldir}
            disabled={temaGocu}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {temaGocu ? 'Taşınıyor…' : 'Katmanı kaldır'}
          </button>
        </div>
      )}
      {temaRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {temaRaporu}
        </p>
      )}

      {/* İçi boş proje kayıtları */}
      {onUpdateItem && bosProje.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {bosProje.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              proje kaydı boş duruyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {bosProje.map(p => p.title).join(', ')} · bölümü yok, gövdesi yok.
              Arşive kalkar, silinmez.
            </span>
          </span>
          <button
            type="button"
            onClick={bosProjeleriArsivle}
            disabled={projeIsi}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {projeIsi ? 'Arşivleniyor…' : 'Arşivle'}
          </button>
        </div>
      )}
      {projeRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {projeRaporu}
        </p>
      )}

      {temizlikRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {temizlikRaporu}
        </p>
      )}

      {eksikler.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A]">
          <CircleCheck className="w-4 h-4 text-[#4A5E68] dark:text-[#A6B0C9] shrink-0" />
          <p className="text-[13px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            Takip ettiğim boşluk kalmadı. Yeni bir şey eklediğinde burası
            kendiliğinden dolar.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {eksikler.map(e => {
            const acik = acikEksik === e.anahtar;
            const liste = e.kayitlar || [];
            return (
            <li key={e.anahtar} className={acik ? 'sm:col-span-2' : ''}>
              <button
                type="button"
                onClick={() => liste.length ? setAcikEksik(acik ? null : e.anahtar) : onSelectArea(e.alan, e.hedefId)}
                aria-expanded={liste.length ? acik : undefined}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] hover:border-[#F26B6F] dark:hover:border-[#F26B6F] transition-colors cursor-pointer group archive-shadow ${acik ? 'rounded-t-xl border-[#F26B6F] dark:border-[#F26B6F]' : 'rounded-xl'}`}
              >
                <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
                  {e.sayi}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
                    {e.baslik}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
                    {e.aciklama}
                  </span>
                </span>
                {liste.length
                  ? <ChevronDown className={`w-3.5 h-3.5 mt-1 shrink-0 transition-transform ${acik ? 'rotate-180 text-[#F26B6F]' : 'text-[#6A5E4C] dark:text-[#95A1C2]'} group-hover:text-[#F26B6F]`} />
                  : <ArrowRight className="w-3.5 h-3.5 mt-1 shrink-0 text-[#6A5E4C] dark:text-[#95A1C2] group-hover:text-[#F26B6F] transition-colors" />}
              </button>
              {acik && (
                <div className="border border-t-0 border-[#F26B6F] rounded-b-xl bg-white/70 dark:bg-[#0E1C4F]/60 max-h-80 overflow-y-auto">
                  <ul className="divide-y divide-[#CFC5B4]/50 dark:divide-[#2C3C72]/60">
                    {liste.map((k, n) => (
                      <li key={(k.id || k.ad) + n}>
                        {k.id ? (
                          <button
                            type="button"
                            onClick={() => onSelectArea(e.alan, k.id)}
                            className="w-full text-left flex items-baseline gap-3 px-4 py-2 hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer"
                          >
                            <span className="text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] shrink-0 max-w-[45%] truncate">{k.ad}</span>
                            <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] min-w-0 truncate flex-1">{k.not}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 self-center text-[#F26B6F]" />
                          </button>
                        ) : (
                          <div className="flex items-baseline gap-3 px-4 py-2">
                            <span className="text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] shrink-0 max-w-[45%] truncate">{k.ad}</span>
                            <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] min-w-0 truncate">{k.not}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Eksikler;
