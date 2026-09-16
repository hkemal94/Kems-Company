import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  DUZEN_SURUMU, type HaritaDuzeni, type MekanDuzeni, type MekanKaydi
} from '../components/harita/duzenTipi';
import type { Nokta, SinirHatlari } from '../components/harita/sinirBolgeleri';

/**
 * Harita düzeninin saklanması (H1).
 *
 * Yer: `duzada/haritaDuzeni` — tek belge, sabit yol.
 *
 * Kullanıcıya değil dünyaya ait. Açık erişim modunda uid tarayıcı
 * hafızasına bağlı olduğu için (App.tsx) kullanıcı altına yazmak düzeni
 * cihaza ve tarayıcıya bağlardı: başka cihazdan girince ya da tarayıcıyı
 * temizleyince kaybolmuş görünürdü. Kemal'in kararı: sabit yol.
 *
 * Firestore iç içe dizi kabul etmiyor ([[x,y],[x,y]] yazılamaz). Her hat
 * düz sayı dizisi olarak yazılıyor: [x0, y0, x1, y1, ...].
 *
 * İki kat güvence:
 *   1. Her kayıt ÖNCE bu tarayıcıya (localStorage) yazılır.
 *   2. Sonra Firestore'a. Firestore'a yazılamazsa yerel kopya kalır ve bir
 *      sonraki açılışta, buluttakinden yeniyse yeniden gönderilir.
 * Hangisi yeniyse o kazanır (`guncelleme` alanı).
 */

const KOLEKSIYON = 'duzada';
const BELGE = 'haritaDuzeni';
const YEREL_ANAHTAR = 'kems_harita_duzeni';
const belgeYolu = () => doc(db, KOLEKSIYON, BELGE);

type DuzHatlar = Record<string, number[]>;

interface Belge {
  surum: number;
  guncelleme: number;
  hatlar: DuzHatlar;
  yollar: DuzHatlar;
  /** Mekânlar (H3). Eski kayıtlarda yok. */
  mekanlar: MekanDuzeni;
}

const duzle = (h: SinirHatlari): DuzHatlar =>
  Object.fromEntries(Object.entries(h).map(([id, n]) => [id, n.flat()]));

const coz = (h: unknown): SinirHatlari => {
  if (!h || typeof h !== 'object') return {};
  const cikti: SinirHatlari = {};
  for (const [id, dizi] of Object.entries(h as Record<string, unknown>)) {
    if (!Array.isArray(dizi) || dizi.length < 4) continue;
    const n: Nokta[] = [];
    for (let i = 0; i + 1 < dizi.length; i += 2) {
      const x = Number(dizi[i]);
      const y = Number(dizi[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) n.push([x, y]);
    }
    if (n.length >= 2) cikti[id] = n;
  }
  return cikti;
};

/**
 * Firestore tanımsız (undefined) alan kabul etmiyor; tek bir tanımsız alan
 * bütün yazmayı düşürür. Mekân kaydındaki alanların çoğu isteğe bağlı
 * olduğu için yazmadan önce ayıklanıyor.
 */
const mekanlariTemizle = (m: MekanDuzeni | undefined): MekanDuzeni => {
  const cikti: MekanDuzeni = {};
  for (const [id, kayit] of Object.entries(m ?? {})) {
    const temiz: Record<string, unknown> = {};
    for (const [alan, deger] of Object.entries(kayit ?? {})) {
      if (deger !== undefined) temiz[alan] = deger;
    }
    cikti[id] = temiz as MekanKaydi;
  }
  return cikti;
};

const mekanlariCoz = (m: unknown): MekanDuzeni => {
  if (!m || typeof m !== 'object') return {};
  const cikti: MekanDuzeni = {};
  for (const [id, ham] of Object.entries(m as Record<string, unknown>)) {
    if (!ham || typeof ham !== 'object') continue;
    const k = ham as Record<string, unknown>;
    const kayit: MekanKaydi = {};
    if (typeof k.yeni === 'boolean') kayit.yeni = k.yeni;
    if (typeof k.ad === 'string') kayit.ad = k.ad;
    if (typeof k.tur === 'string') kayit.tur = k.tur;
    if (typeof k.silindi === 'boolean') kayit.silindi = k.silindi;
    if (typeof k.mahalle === 'string' || k.mahalle === null) {
      kayit.mahalle = k.mahalle as string | null;
    }
    if (typeof k.wikiId === 'string' || k.wikiId === null) {
      kayit.wikiId = k.wikiId as string | null;
    }
    for (const sayi of ['taban', 'yukseklik', 'yaricap'] as const) {
      if (Number.isFinite(k[sayi])) kayit[sayi] = Number(k[sayi]);
    }
    if (Array.isArray(k.konum) && k.konum.length >= 2
      && Number.isFinite(Number(k.konum[0])) && Number.isFinite(Number(k.konum[1]))) {
      kayit.konum = [Number(k.konum[0]), Number(k.konum[1])];
    }
    if (Object.keys(kayit).length) cikti[id] = kayit;
  }
  return cikti;
};

const belgeye = (d: HaritaDuzeni): Belge => ({
  surum: DUZEN_SURUMU,
  guncelleme: d.guncelleme,
  hatlar: duzle(d.hatlar),
  yollar: duzle(d.yollar),
  mekanlar: mekanlariTemizle(d.mekanlar)
});

const belgeden = (b: unknown): HaritaDuzeni | null => {
  if (!b || typeof b !== 'object') return null;
  const v = b as Partial<Belge>;
  return {
    surum: Number(v.surum ?? DUZEN_SURUMU),
    guncelleme: Number(v.guncelleme ?? 0),
    hatlar: coz(v.hatlar),
    yollar: coz(v.yollar),
    mekanlar: mekanlariCoz(v.mekanlar)
  };
};

function yereldenOku(): HaritaDuzeni | null {
  try {
    const ham = localStorage.getItem(YEREL_ANAHTAR);
    return ham ? belgeden(JSON.parse(ham)) : null;
  } catch {
    return null;
  }
}

function yereleYaz(d: HaritaDuzeni) {
  try {
    localStorage.setItem(YEREL_ANAHTAR, JSON.stringify(belgeye(d)));
  } catch { /* depolama kapalıysa bulut yine dener */ }
}

export type KayitDurumu =
  | 'yukleniyor'
  | 'hazir'
  | 'kaydediliyor'
  | 'kaydedildi'
  | 'yerelde'; // buluta yazılamadı, bu tarayıcıda duruyor

/**
 * Firestore bağlantı yokken `setDoc` sonsuza dek bekler (yazıyı kuyruğa
 * alır, bağlantı gelince gönderir). Ekranın "Kaydediliyor…"da takılı
 * kalmaması için 8 sn sonra "yerelde" sayıyoruz; kuyruk yine de işler.
 */
async function buluta(d: HaritaDuzeni) {
  let zaman: ReturnType<typeof setTimeout> | undefined;
  const bekle = new Promise<never>((_, ret) => {
    zaman = setTimeout(() => ret({ code: 'zaman-asimi' }), 8000);
  });
  try {
    await Promise.race([setDoc(belgeYolu(), belgeye(d)), bekle]);
  } finally {
    clearTimeout(zaman);
  }
}

/**
 * Düzeni canlı dinler ve kaydetme işlevi verir.
 *
 * `duzen` her zaman elde olan en yeni hâldir (bulut ya da yerel).
 */
export function useHaritaDuzeni() {
  const [duzen, setDuzen] = useState<HaritaDuzeni | null>(() => yereldenOku());
  const [durum, setDurum] = useState<KayitDurumu>('yukleniyor');
  const [hata, setHata] = useState<string | null>(null);
  const [ilkYukleme, setIlkYukleme] = useState(false);
  const sonYazilan = useRef(0);

  useEffect(() => {
    setDuzen(yereldenOku());
    setIlkYukleme(false);
    setDurum('yukleniyor');
    let ilk = true;

    // Bağlantı yoksa ilk yanıt çok gecikebilir: 5 sn sonra yerel kopyayla aç
    const yedekZaman = setTimeout(() => {
      if (!ilk) return;
      setIlkYukleme(true);
      setDurum('yerelde');
      setHata('bağlantı-yok');
    }, 5000);

    const birak = onSnapshot(
      belgeYolu(),
      snap => {
        const bulut = snap.exists() ? belgeden(snap.data()) : null;
        const yerel = yereldenOku();
        const bulutZaman = bulut?.guncelleme ?? 0;
        const yerelZaman = yerel?.guncelleme ?? 0;

        if (yerel && yerelZaman > bulutZaman) {
          // Önceki bir kayıt buluta ulaşamamış — şimdi gönder
          setDuzen(yerel);
          if (ilk) {
            setDurum('kaydediliyor');
            buluta(yerel)
              .then(() => { setDurum('kaydedildi'); setHata(null); })
              .catch(e => { setDurum('yerelde'); setHata(String(e?.code ?? e)); });
          }
        } else {
          // Kendi yazdığımızın yankısını tekrar işlemeye gerek yok
          if (!(bulut && bulutZaman === sonYazilan.current && !ilk)) {
            setDuzen(bulut);
            if (bulut) yereleYaz(bulut);
          }
          if (ilk) setDurum('hazir');
        }
        if (ilk) { ilk = false; setIlkYukleme(true); clearTimeout(yedekZaman); }
      },
      e => {
        // Okuma izni yok / bağlantı yok: yerel kopyayla devam
        console.error('[harita düzeni] okunamadı', e);
        setHata(String((e as { code?: string })?.code ?? e));
        setDurum('yerelde');
        setIlkYukleme(true);
        clearTimeout(yedekZaman);
      }
    );
    return () => { clearTimeout(yedekZaman); birak(); };
  }, []);

  const kaydet = useCallback(async (yeni: HaritaDuzeni) => {
    const d = { ...yeni, guncelleme: yeni.guncelleme || Date.now() };
    sonYazilan.current = d.guncelleme;
    yereleYaz(d);
    setDuzen(d);
    setDurum('kaydediliyor');
    try {
      await buluta(d);
      setDurum('kaydedildi');
      setHata(null);
    } catch (e) {
      console.error('[harita düzeni] buluta yazılamadı', e);
      setDurum('yerelde');
      setHata(String((e as { code?: string })?.code ?? e));
    }
  }, []);

  return { duzen: duzen ?? null, durum, hata, ilkYukleme, kaydet };
}

// ---- yedekleme (K2) -------------------------------------------------------

/**
 * Harita düzeninin yedeğe girecek hâli.
 *
 * Yerel kopyadan okunuyor: her kayıt önce oraya yazıldığı için buluttakiyle
 * aynı ya da ondan yeni. Böylece yedek almak için ağ gerekmiyor.
 */
export function haritaDuzeniniYedekIcinOku(): unknown {
  try {
    const ham = localStorage.getItem(YEREL_ANAHTAR);
    return ham ? JSON.parse(ham) : null;
  } catch {
    return null;
  }
}

/** Yedekten gelen harita düzenini geri yazar — önce yerele, sonra buluta */
export async function haritaDuzeniniYedektenYaz(ham: unknown): Promise<void> {
  const d = belgeden(ham);
  if (!d) return;
  const belge = belgeye({ ...d, guncelleme: Date.now() });
  try { localStorage.setItem(YEREL_ANAHTAR, JSON.stringify(belge)); } catch { /* yok */ }
  await setDoc(belgeYolu(), belge);
}
