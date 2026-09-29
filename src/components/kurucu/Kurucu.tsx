import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hand, MousePointer2, PenLine, Redo2, Undo2, Check, X, Eye, EyeOff, Home, LayoutGrid, RotateCcw, RotateCw } from 'lucide-react';
import { DUZADA_GEO } from '../../data/duzadaGeo';
import { duzeniUygula, bosDuzen, type HaritaDuzeni } from '../harita/duzenKatmani';
import { catmullRom, type Nokta } from '../harita/sinirBolgeleri';
import { MAHALLE_TONU } from '../harita/haritaStili';
import type { KayitDurumu } from '../../lib/haritaDuzeni';
import {
  YOL_TURLERI, turBilgisi, bosTaslak, belgedenTaslak, taslaktanBelge, taslakBosMu,
  zeminCikar, yollariKur, yapistir, yeniYolId, derceye, uzunluk, karadaMi,
  binalariKur, binaKonabilirMi, hattaUzaklik,
  type KurucuTaslak, type KurucuYol, type KurucuBina, type Yapisma, type YolTuru
} from './kurucuTipi';
import {
  BINA_TURLERI, SABLONLAR, binaBilgisi, binaKoseleri, hatBoyuBinalar, sablonuYerlestir,
  type BinaTuru, type SablonCikti
} from './kurucuSablonlari';

/**
 * Kurucu — Düzada'nın şehir kurucusu (1. adım: yol aracı · 2. adım: bina
 * aracı ve hazır mahalle şablonları).
 *
 * Üstten plan. Açılışta bugünkü haritayı (elle yapılan düzen dahil) gösterir.
 * Her çizim bir TASLAK'a yazılır; harita değişmez. "Haritaya işle" sonraki
 * adımda gelecek.
 *
 * Araçlar:
 *   - Gez: sürükle-kaydır, tekerlek / düğmelerle yakınlaş
 *   - Seç: yola dokun → türünü değiştir, taslaktan kaldır / geri getir
 *   - Yol çiz: türü seç, noktaları tıkla; kavşağa ve yola yapışır.
 *     Bitir: Enter ya da çift tık · Vazgeç: Esc · son noktayı sil: ⌫
 *   - Bina: türü seç, dokun; yola yakınsa yola dönük oturur
 *   - Şablon: hazır mahalle dokusu; döndür, büyüt, dokunduğun yere yerleşir
 *   - Seç → yol → "Kenarını evlerle doldur"
 * Geri al / yinele: düğmeler ya da Ctrl+Z / Ctrl+Y.
 */

type Arac = 'gez' | 'sec' | 'ciz' | 'bina' | 'sablon';

interface KurucuProps {
  duzen: HaritaDuzeni | null;
  kaydet: (d: HaritaDuzeni) => Promise<void>;
  durum: KayitDurumu;
  className?: string;
}

interface Gorunum { x: number; y: number; w: number }

const egri = (k: Nokta[]) => catmullRom(k, false, 6);
const yolYolu = (m: Nokta[]) =>
  m.length ? 'M' + m.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') : '';
const halkaYolu = (h: Nokta[][]) =>
  h.map(r => 'M' + r.map(p => `${p[0].toFixed(0)},${p[1].toFixed(0)}`).join('L') + 'Z').join('');

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export function Kurucu({ duzen, kaydet, durum, className }: KurucuProps) {
  // ---- veri -------------------------------------------------------------------
  // Zemin bugünkü haritadır; Kurucu açıkken harita düzeni değişse bile zemin
  // açılıştaki hâlde kalır (çizerken altındaki yolların kaymaması için).
  const [zemin] = useState(() => zeminCikar(duzeniUygula(DUZADA_GEO, duzen)));

  // Geri al / yinele: taslağın her hâli sırayla saklanır (en fazla 100)
  const [tarihce, setTarihce] = useState<{ hal: KurucuTaslak[]; i: number }>(
    () => ({ hal: [belgedenTaslak(duzen?.kurucu)], i: 0 })
  );
  const taslak = tarihce.hal[tarihce.i];
  const gecmis = tarihce.hal;
  const adim = tarihce.i;

  const degistir = useCallback((f: (t: KurucuTaslak) => KurucuTaslak) => {
    setTarihce(({ hal, i }) => {
      const yeni = [...hal.slice(0, i + 1), f(hal[i])].slice(-100);
      return { hal: yeni, i: yeni.length - 1 };
    });
  }, []);

  const geriAl = useCallback(() => setTarihce(t => ({ ...t, i: Math.max(0, t.i - 1) })), []);
  const yinele = useCallback(() => setTarihce(t => ({ ...t, i: Math.min(t.hal.length - 1, t.i + 1) })), []);

  const yollar = useMemo(() => yollariKur(zemin, taslak, egri), [zemin, taslak]);
  const binalar = useMemo(() => binalariKur(zemin, taslak, binaKoseleri), [zemin, taslak]);

  // ---- kayıt (her değişiklikten 1 sn sonra) ----------------------------------
  const ilkTaslak = useRef(taslak);
  const sonDuzen = useRef(duzen);
  useEffect(() => { sonDuzen.current = duzen; }, [duzen]);
  useEffect(() => {
    if (taslak === ilkTaslak.current) return;
    const zaman = setTimeout(() => {
      const d = sonDuzen.current ?? bosDuzen();
      void kaydet({ ...d, guncelleme: Date.now(), kurucu: taslaktanBelge(taslak) });
    }, 1000);
    return () => clearTimeout(zaman);
  }, [taslak, kaydet]);

  // ---- görünüm ----------------------------------------------------------------
  const kutu = useRef<HTMLDivElement>(null);
  const [boyut, setBoyut] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = kutu.current;
    if (!el) return;
    const g = new ResizeObserver(() => setBoyut({ w: el.clientWidth, h: el.clientHeight }));
    g.observe(el);
    return () => g.disconnect();
  }, []);

  // Adayı kutuya sığdırır (en ve boy), ortalar
  const sigdir = useCallback((kw: number, kh: number): Gorunum => {
    const xs = zemin.ada.flat().map(p => p[0]);
    const ys = zemin.ada.flat().map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const aw = (maxX - minX) * 1.08, ah = (maxY - minY) * 1.08;
    const w = Math.max(aw, ah * (kw / Math.max(kh, 1)));
    const hh = w * (kh / Math.max(kw, 1));
    return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - hh / 2, w };
  }, [zemin]);
  const [gorunum, setGorunum] = useState<Gorunum>(() => sigdir(800, 600));
  const sigdi = useRef(false);
  useEffect(() => {
    if (sigdi.current || boyut.w < 50 || boyut.h < 50) return;
    const el = kutu.current;
    if (!el || el.clientWidth !== boyut.w) return;
    sigdi.current = true;
    setGorunum(sigdir(boyut.w, boyut.h));
  }, [boyut, sigdir]);
  const olcek = boyut.w / gorunum.w; // piksel / metre
  const h = boyut.h / olcek;

  const ekrandanMetre = useCallback((cx: number, cy: number): Nokta => {
    const r = kutu.current!.getBoundingClientRect();
    return [gorunum.x + (cx - r.left) / olcek, gorunum.y + (cy - r.top) / olcek];
  }, [gorunum, olcek]);

  const yakinlas = useCallback((kat: number, merkez?: Nokta) => {
    setGorunum(g => {
      const w = Math.min(Math.max(g.w * kat, 60), 40000);
      const m = merkez ?? [g.x + g.w / 2, g.y + (boyut.h / (boyut.w / g.w)) / 2];
      const oran = w / g.w;
      return { x: m[0] - (m[0] - g.x) * oran, y: m[1] - (m[1] - g.y) * oran, w };
    });
  }, [boyut]);

  // ---- araçlar ----------------------------------------------------------------
  const [arac, setArac] = useState<Arac>('ciz');
  const [cizTur, setCizTur] = useState<YolTuru>('sokak');
  const [cizilen, setCizilen] = useState<Nokta[]>([]); // metre
  const [imlec, setImlec] = useState<Nokta | null>(null);
  const [yapisma, setYapisma] = useState<Yapisma | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [gizliGoster, setGizliGoster] = useState(true);
  const [uyari, setUyari] = useState<string | null>(null);
  const [binaTur, setBinaTur] = useState<BinaTuru>('ev');
  const [sablonId, setSablonId] = useState(SABLONLAR[0].id);
  const [sablonAci, setSablonAci] = useState(0); // derece
  const [sablonOlcek, setSablonOlcek] = useState(1);
  const sablonHam = useMemo(() => SABLONLAR.find(x => x.id === sablonId)!.uret(), [sablonId]);
  useEffect(() => {
    if (!uyari) return;
    const z = setTimeout(() => setUyari(null), 2200);
    return () => clearTimeout(z);
  }, [uyari]);

  const bitir = useCallback((ekle?: Nokta) => {
    const c = ekle ? [...cizilen, ekle] : cizilen;
    if (c.length >= 2) {
      degistir(t => {
        const id = yeniYolId(t.yeniYollar);
        return { ...t, yeniYollar: { ...t.yeniYollar, [id]: { tur: cizTur, noktalar: c.map(derceye) } } };
      });
    }
    setCizilen([]);
  }, [cizilen, cizTur, degistir]);

  // ---- bina ve şablon yerleştirme ---------------------------------------------
  const gorunurYolHatlari = useMemo(() => yollar.filter(y => !y.gizli).map(y => y.m), [yollar]);

  /** Dokunulan yere bina: 35 m içinde yol varsa yola dönük, yoldan geri çekilmiş */
  const binaTaslagi = useCallback((m: Nokta, tur: BinaTuru) => {
    const b = binaBilgisi(tur);
    let en = { d: Infinity, aci: 0, q: m as Nokta };
    for (const h of gorunurYolHatlari) {
      const u = hattaUzaklik(m, h);
      if (u.d < en.d) en = u;
    }
    if (en.d < 35 && !['meydan', 'agac', 'cesme'].includes(tur)) {
      const yan = Math.sign((m[0] - en.q[0]) * -Math.sin(en.aci) + (m[1] - en.q[1]) * Math.cos(en.aci)) || 1;
      const d = 3.5 + b.boy / 2;
      return { tur, m: [en.q[0] - Math.sin(en.aci) * d * yan, en.q[1] + Math.cos(en.aci) * d * yan] as Nokta, en: b.en, boy: b.boy, aci: en.aci };
    }
    return { tur, m, en: b.en, boy: b.boy, aci: 0 };
  }, [gorunurYolHatlari]);

  /** Binaları süzüp taslağa ekler; kaç tanesinin konduğunu döndürür */
  // `kendiArasinda: false` — şablonun parçaları zaten birbirine göre dizili
  // (meydanın ortasında çeşme, sahanın kenarında tribün); yalnız haritadaki
  // mevcut yapılara bakılır.
  const binalariEkle = useCallback((adaylar: Array<{ tur: BinaTuru; m: Nokta; en: number; boy: number; aci: number }>,
    ekYollar: Nokta[][] = [], yolKontrolu = true, kendiArasinda = true) => {
    const engel = binalar.map(b => ({ m: b.m, r: b.r, gizli: b.gizli }));
    const konan: typeof adaylar = [];
    for (const a of adaylar) {
      if (!binaKonabilirMi(a, zemin.ada, engel, yolKontrolu ? [...gorunurYolHatlari, ...ekYollar] : ekYollar)) continue;
      konan.push(a);
      if (kendiArasinda) engel.push({ m: a.m, r: Math.hypot(a.en, a.boy) / 2, gizli: false });
    }
    return konan;
  }, [binalar, gorunurYolHatlari, zemin.ada]);

  const sablonOnizleme = useMemo((): SablonCikti | null => {
    if (arac !== 'sablon' || !imlec) return null;
    return sablonuYerlestir(sablonHam, imlec, (sablonAci * Math.PI) / 180, sablonOlcek);
  }, [arac, imlec, sablonHam, sablonAci, sablonOlcek]);

  const sablonuKoy = useCallback((merkez: Nokta) => {
    const c = sablonuYerlestir(sablonHam, merkez, (sablonAci * Math.PI) / 180, sablonOlcek);
    // Yollar: denize düşen noktalar kırpılır, iki noktadan kısa kalan atılır
    const yeniYollar: Array<{ tur: YolTuru; m: Nokta[] }> = [];
    for (const y of c.yollar) {
      const kara = y.m.filter(p => karadaMi(p, zemin.ada));
      if (kara.length >= 2) yeniYollar.push({ tur: y.tur, m: kara });
    }
    // Binalar: şablonun kendi yollarına göre zaten dizili; yalnız mevcut
    // haritaya ve denize bakılır
    const konan = binalariEkle(c.binalar, [], true, false);
    if (!yeniYollar.length && !konan.length) { setUyari('Şablon buraya sığmadı — karada, boş bir yer seç.'); return; }
    degistir(t => {
      const yY = { ...t.yeniYollar };
      for (const y of yeniYollar) yY[yeniYolId(yY)] = { tur: y.tur, noktalar: y.m.map(derceye) };
      const yB = { ...t.yeniBinalar };
      for (const b of konan) yB[yeniYolId(yB, 'kurucu_bina')] = { tur: b.tur, merkez: derceye(b.m), en: b.en, boy: b.boy, aci: b.aci };
      return { ...t, yeniYollar: yY, yeniBinalar: yB };
    });
    const atlanan = c.binalar.length - konan.length;
    setUyari(`${yeniYollar.length} yol, ${konan.length} yapı kondu` + (atlanan ? ` · ${atlanan} yapı sığmadı (deniz ya da mevcut bina)` : ''));
  }, [sablonHam, sablonAci, sablonOlcek, zemin.ada, binalariEkle, degistir]);

  const binaKoy = useCallback((m: Nokta) => {
    const aday = binaTaslagi(m, binaTur);
    const konan = binalariEkle([aday]);
    if (!konan.length) { setUyari('Buraya konmadı: deniz, yol ya da başka bir bina var.'); return; }
    degistir(t => ({
      ...t,
      yeniBinalar: { ...t.yeniBinalar, [yeniYolId(t.yeniBinalar, 'kurucu_bina')]: { tur: aday.tur, merkez: derceye(aday.m), en: aday.en, boy: aday.boy, aci: aday.aci } }
    }));
  }, [binaTaslagi, binaTur, binalariEkle, degistir]);

  const kenariDoldur = useCallback((y: KurucuYol, tur: BinaTuru) => {
    const b = binaBilgisi(tur);
    const adaylar = hatBoyuBinalar(y.m, tur, b.en + 6, 3.5, [1, -1], Math.random, 0.1);
    const digerYollar = yollar.filter(o => !o.gizli && o.id !== y.id).map(o => o.m);
    const konan = binalariEkle(adaylar, digerYollar, false);
    if (!konan.length) { setUyari('Yol kenarında boş yer bulunamadı.'); return; }
    degistir(t => {
      const yB = { ...t.yeniBinalar };
      for (const k of konan) yB[yeniYolId(yB, 'kurucu_bina')] = { tur: k.tur, merkez: derceye(k.m), en: k.en, boy: k.boy, aci: k.aci };
      return { ...t, yeniBinalar: yB };
    });
    setUyari(`${konan.length} yapı kondu`);
  }, [yollar, binalariEkle, degistir]);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement;
      if (hedef && /INPUT|TEXTAREA|SELECT/.test(hedef.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); geriAl(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); yinele(); }
      else if (e.key === 'Enter' && arac === 'ciz') bitir();
      else if (e.key === 'Escape') { setCizilen([]); setSecili(null); }
      else if (e.key === 'Backspace' && arac === 'ciz' && cizilen.length) { e.preventDefault(); setCizilen(c => c.slice(0, -1)); }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [arac, bitir, cizilen.length, geriAl, yinele]);

  // ---- işaretçi: kaydır / tıkla / çimdikle ------------------------------------
  const basilanlar = useRef(new Map<number, { x: number; y: number }>());
  const surukleme = useRef<{ x: number; y: number; g: Gorunum; oynadi: boolean } | null>(null);
  const cimdik = useRef<{ d: number; g: Gorunum; m: Nokta } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    basilanlar.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (basilanlar.current.size === 2) {
      const [a, b] = [...basilanlar.current.values()];
      cimdik.current = {
        d: Math.hypot(a.x - b.x, a.y - b.y), g: gorunum,
        m: ekrandanMetre((a.x + b.x) / 2, (a.y + b.y) / 2)
      };
      surukleme.current = null;
      return;
    }
    surukleme.current = { x: e.clientX, y: e.clientY, g: gorunum, oynadi: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (basilanlar.current.has(e.pointerId)) basilanlar.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cimdik.current && basilanlar.current.size === 2) {
      const [a, b] = [...basilanlar.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const c = cimdik.current;
      const w = Math.min(Math.max(c.g.w * (c.d / Math.max(d, 1)), 60), 40000);
      const oran = w / c.g.w;
      setGorunum({ x: c.m[0] - (c.m[0] - c.g.x) * oran, y: c.m[1] - (c.m[1] - c.g.y) * oran, w });
      return;
    }
    const s = surukleme.current;
    if (s) {
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.oynadi && Math.hypot(dx, dy) > 5) s.oynadi = true;
      if (s.oynadi) {
        setGorunum({ ...s.g, x: s.g.x - dx / olcek, y: s.g.y - dy / olcek });
        return;
      }
    }
    if (arac === 'ciz') {
      const m = ekrandanMetre(e.clientX, e.clientY);
      const y = yapistir(m, yollar, 12 / olcek, cizilen);
      setYapisma(y);
      setImlec(y ? y.m : m);
    } else if (arac === 'bina' || arac === 'sablon') {
      setImlec(ekrandanMetre(e.clientX, e.clientY));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    basilanlar.current.delete(e.pointerId);
    if (basilanlar.current.size < 2) cimdik.current = null;
    const s = surukleme.current;
    surukleme.current = null;
    if (!s || s.oynadi) return;
    // Tıklama
    if (arac === 'ciz') {
      const m = ekrandanMetre(e.clientX, e.clientY);
      const y = yapistir(m, yollar, 12 / olcek, cizilen);
      // İlk noktaya dönülürse yol kapanır ve biter
      if (y?.tur === 'uc') { bitir(y.m); return; }
      const nokta = y ? y.m : m;
      if (!karadaMi(nokta, zemin.ada)) { setUyari('Yol denize çizilemez — karada bir nokta seç.'); return; }
      setCizilen(c => {
        const son = c[c.length - 1];
        if (son && Math.hypot(son[0] - nokta[0], son[1] - nokta[1]) < 2 / olcek) return c;
        return [...c, nokta];
      });
    } else if (arac === 'sec') {
      // İşaretçi yakalandığı için hedef kutunun kendisi olur; altındaki
      // yola / binaya noktadan bakılır. Bina yolun önünde seçilir.
      const altta = document.elementsFromPoint(e.clientX, e.clientY);
      const bn = altta.map(el => el.closest('[data-bina]')).find(Boolean);
      const yl = altta.map(el => el.closest('[data-yol]')).find(Boolean);
      setSecili(bn ? bn.getAttribute('data-bina') : yl ? yl.getAttribute('data-yol') : null);
    } else if (arac === 'bina') {
      binaKoy(ekrandanMetre(e.clientX, e.clientY));
    } else if (arac === 'sablon') {
      sablonuKoy(ekrandanMetre(e.clientX, e.clientY));
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    yakinlas(e.deltaY > 0 ? 1.18 : 1 / 1.18, ekrandanMetre(e.clientX, e.clientY));
  };

  // Sayfa kaymasın diye tekerlek dinleyicisi pasif olmayan olarak eklenir
  useEffect(() => {
    const el = kutu.current;
    if (!el) return;
    const dur = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', dur, { passive: false });
    return () => el.removeEventListener('wheel', dur);
  }, []);

  // ---- seçili yol işlemleri ---------------------------------------------------
  const seciliYol = yollar.find(y => y.id === secili) ?? null;
  const seciliBina = binalar.find(b => b.id === secili) ?? null;
  const binaDegistir = (b: KurucuBina, f: (x: KurucuTaslak['yeniBinalar'][string]) => KurucuTaslak['yeniBinalar'][string]) =>
    degistir(t => ({ ...t, yeniBinalar: { ...t.yeniBinalar, [b.id]: f(t.yeniBinalar[b.id]) } }));
  const binaGizleGoster = (b: KurucuBina) => degistir(t => ({
    ...t,
    gizlenen: t.gizlenen.includes(b.id) ? t.gizlenen.filter(x => x !== b.id) : [...t.gizlenen, b.id]
  }));
  const [dolguTur, setDolguTur] = useState<BinaTuru>('ev');
  const turDegistir = (y: KurucuYol, tur: YolTuru) => degistir(t => {
    if (y.yeni) {
      const eski = t.yeniYollar[y.id];
      return { ...t, yeniYollar: { ...t.yeniYollar, [y.id]: { ...eski, tur } } };
    }
    return { ...t, turDegisikligi: { ...t.turDegisikligi, [y.id]: tur } };
  });
  const gizleGoster = (y: KurucuYol) => degistir(t => ({
    ...t,
    gizlenen: t.gizlenen.includes(y.id) ? t.gizlenen.filter(x => x !== y.id) : [...t.gizlenen, y.id]
  }));

  // ---- özet -------------------------------------------------------------------
  const ozet = useMemo(() => {
    const yeni = Object.values(taslak.yeniYollar);
    const gizli = new Set(taslak.gizlenen);
    let uzun = 0;
    for (const [id, y] of Object.entries(taslak.yeniYollar)) {
      if (!gizli.has(id)) uzun += uzunluk(egri((y as { noktalar: Nokta[] }).noktalar));
    }
    return {
      yeni: yeni.length, uzun,
      tur: Object.keys(taslak.turDegisikligi).length,
      gizli: taslak.gizlenen.length,
      bina: Object.keys(taslak.yeniBinalar).length
    };
  }, [taslak]);

  const cizimUzunlugu = useMemo(() => {
    const hat = imlec && arac === 'ciz' && cizilen.length ? [...cizilen, imlec] : cizilen;
    return hat.length >= 2 ? uzunluk(hat.map(derceye)) : 0;
  }, [cizilen, imlec, arac]);

  // ---- çizim ------------------------------------------------------------------
  const px = (n: number) => n / olcek; // piksel → metre (kalınlık için)
  const gorunenYollar = [...yollar].sort((a, b) =>
    ['patika', 'toprak', 'sokak', 'ana'].indexOf(a.tur) - ['patika', 'toprak', 'sokak', 'ana'].indexOf(b.tur));

  const kayitYazisi: Record<KayitDurumu, string> = {
    yukleniyor: 'Yükleniyor…', hazir: 'Taslak hazır', kaydediliyor: 'Kaydediliyor…',
    kaydedildi: 'Taslak kaydedildi', yerelde: 'Bu tarayıcıda saklandı (bağlantı yok)'
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-3 h-full ${className ?? ''}`}>
      {/* Harita alanı */}
      <div
        ref={kutu}
        className={`relative flex-1 min-h-[60vh] lg:min-h-0 rounded-lg overflow-hidden border border-[#B9C7BD] bg-[#C9DCE0] touch-none select-none ${
          arac === 'ciz' || arac === 'bina' || arac === 'sablon' ? 'cursor-crosshair' : arac === 'gez' ? 'cursor-grab' : 'cursor-pointer'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setImlec(null); setYapisma(null); }}
        onWheel={onWheel}
        onDoubleClick={() => { if (arac === 'ciz') bitir(); }}
        data-kurucu-alan
      >
        <svg
          width={boyut.w} height={boyut.h}
          viewBox={`${gorunum.x} ${gorunum.y} ${gorunum.w} ${h}`}
          className="block"
        >
          {/* Kara */}
          <path d={halkaYolu(zemin.ada)} fill="#EFE8DA" stroke="#B9A98C" strokeWidth={px(1.2)} fillRule="evenodd" />
          {zemin.mahalleler.map(m => (
            <path key={m.id} d={halkaYolu(m.halka)} fill={MAHALLE_TONU[m.id] ?? '#999'} fillOpacity={0.12}
              stroke={MAHALLE_TONU[m.id] ?? '#999'} strokeOpacity={0.45} strokeWidth={px(1)} strokeDasharray={`${px(6)} ${px(4)}`} />
          ))}

          {/* Yollar: önce kenarlar, sonra dolgu */}
          {gorunenYollar.map(y => {
            if (y.gizli && !gizliGoster) return null;
            const b = turBilgisi(y.tur);
            if (y.gizli || !b.kenar) return null;
            return <path key={`k-${y.id}`} d={yolYolu(y.m)} fill="none" stroke={b.kenar}
              strokeWidth={px(b.kalinlik + 2)} strokeLinecap="round" strokeLinejoin="round" />;
          })}
          {gorunenYollar.map(y => {
            if (y.gizli && !gizliGoster) return null;
            const b = turBilgisi(y.tur);
            const sec = y.id === secili;
            return (
              <g key={y.id} data-yol={y.id}>
                {/* Dokunma payı */}
                <path d={yolYolu(y.m)} fill="none" stroke="transparent" strokeWidth={px(14)} />
                {sec && <path d={yolYolu(y.m)} fill="none" stroke="#F26B6F" strokeOpacity={0.45}
                  strokeWidth={px(b.kalinlik + 8)} strokeLinecap="round" strokeLinejoin="round" />}
                <path
                  d={yolYolu(y.m)} fill="none"
                  stroke={y.gizli ? '#F26B6F' : b.renk}
                  strokeOpacity={y.gizli ? 0.5 : 1}
                  strokeWidth={px(y.gizli ? 1.5 : b.kalinlik)}
                  strokeDasharray={y.gizli ? `${px(4)} ${px(4)}` : b.kesik ? b.kesik.split(' ').map(n => px(Number(n))).join(' ') : undefined}
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {y.yeni && !y.gizli && (
                  <path d={yolYolu(y.m)} fill="none" stroke="#0E1C4F" strokeOpacity={0.35}
                    strokeWidth={px(1)} strokeLinecap="round" />
                )}
              </g>
            );
          })}

          {/* Binalar: haritadakiler ve taslakta konanlar */}
          {binalar.map(bn => {
            if (bn.gizli && !gizliGoster) return null;
            const bi = bn.tur ? binaBilgisi(bn.tur) : null;
            const sec = bn.id === secili;
            const acik = bn.tur && ['meydan', 'saha'].includes(bn.tur);
            return (
              <g key={bn.id} data-bina={bn.id}>
                {bi?.yuvarlak ? (
                  <circle cx={bn.m[0]} cy={bn.m[1]} r={(bn.en ?? 10) / 2}
                    fill={bn.gizli ? 'none' : bi.renk} fillOpacity={0.9}
                    stroke={sec ? '#F26B6F' : bn.gizli ? '#F26B6F' : bi.kenar} strokeWidth={px(sec ? 2.5 : 0.8)}
                    strokeDasharray={bn.gizli ? `${px(3)} ${px(3)}` : undefined} />
                ) : (
                  <path d={halkaYolu([bn.kose])}
                    fill={bn.gizli ? 'none' : bi ? bi.renk : '#C2B193'}
                    stroke={sec ? '#F26B6F' : bn.gizli ? '#F26B6F' : bi ? bi.kenar : '#8E7C5E'}
                    strokeWidth={px(sec ? 2.5 : acik ? 1 : 0.8)}
                    strokeDasharray={bn.gizli || (bn.tur === 'meydan') ? `${px(3)} ${px(3)}` : undefined} />
                )}
                {bn.tur === 'saha' && !bn.gizli && (
                  <line x1={bn.m[0]} y1={bn.m[1] - (bn.boy ?? 0) / 2 + 2} x2={bn.m[0]} y2={bn.m[1] + (bn.boy ?? 0) / 2 - 2}
                    transform={`rotate(${((bn.aci ?? 0) * 180) / Math.PI} ${bn.m[0]} ${bn.m[1]})`}
                    stroke="#F3EFE8" strokeWidth={px(1)} />
                )}
              </g>
            );
          })}

          {/* Şablon önizlemesi */}
          {sablonOnizleme && (
            <g style={{ pointerEvents: 'none' }} opacity={0.75}>
              {sablonOnizleme.yollar.map((y, i) => (
                <path key={i} d={yolYolu(y.m)} fill="none" stroke="#F26B6F"
                  strokeWidth={px(turBilgisi(y.tur).kalinlik)} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={turBilgisi(y.tur).kesik ? turBilgisi(y.tur).kesik!.split(' ').map(n => px(Number(n))).join(' ') : undefined} />
              ))}
              {sablonOnizleme.binalar.map((b, i) => (
                binaBilgisi(b.tur).yuvarlak
                  ? <circle key={i} cx={b.m[0]} cy={b.m[1]} r={b.en / 2} fill="#F26B6F" fillOpacity={0.35} stroke="#F26B6F" strokeWidth={px(1)} />
                  : <path key={i} d={halkaYolu([binaKoseleri(b.m, b.en, b.boy, b.aci)])} fill="#F26B6F" fillOpacity={0.3} stroke="#F26B6F" strokeWidth={px(1)} />
              ))}
            </g>
          )}
          {arac === 'bina' && imlec && (() => {
            const t = binaTaslagi(imlec, binaTur);
            const bi = binaBilgisi(binaTur);
            return bi.yuvarlak
              ? <circle cx={t.m[0]} cy={t.m[1]} r={t.en / 2} fill={bi.renk} fillOpacity={0.6} stroke="#F26B6F" strokeWidth={px(1.5)} style={{ pointerEvents: 'none' }} />
              : <path d={halkaYolu([binaKoseleri(t.m, t.en, t.boy, t.aci)])} fill={bi.renk} fillOpacity={0.6}
                  stroke="#F26B6F" strokeWidth={px(1.5)} style={{ pointerEvents: 'none' }} />;
          })()}

          {/* Etiketler */}
          {zemin.etiketler.map((et, i) => (
            <text key={i} x={et.m[0]} y={et.m[1]} textAnchor="middle"
              fontSize={px(et.tur === 'mahalle' ? 13 : 10)} fontWeight={et.tur === 'mahalle' ? 700 : 500}
              fill={et.tur === 'mahalle' ? '#0E1C4F' : '#6A5E4C'} fillOpacity={0.8}
              stroke="#EFE8DA" strokeWidth={px(3)} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
              {et.ad}
            </text>
          ))}

          {/* Çizilen yol */}
          {arac === 'ciz' && cizilen.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              <path d={yolYolu(cizilen.length >= 3 ? egri(cizilen) : cizilen)} fill="none"
                stroke={turBilgisi(cizTur).kenar ?? turBilgisi(cizTur).renk} strokeWidth={px(turBilgisi(cizTur).kalinlik + 2)}
                strokeLinecap="round" strokeLinejoin="round" />
              <path d={yolYolu(cizilen.length >= 3 ? egri(cizilen) : cizilen)} fill="none"
                stroke="#F26B6F" strokeWidth={px(turBilgisi(cizTur).kalinlik)} strokeLinecap="round" strokeLinejoin="round" />
              {imlec && (
                <path d={yolYolu([cizilen[cizilen.length - 1], imlec])} fill="none" stroke="#F26B6F"
                  strokeWidth={px(1.5)} strokeDasharray={`${px(5)} ${px(4)}`} />
              )}
              {cizilen.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={px(i === 0 ? 5 : 3.5)}
                  fill={i === 0 ? '#F3EFE8' : '#F26B6F'} stroke="#0E1C4F" strokeWidth={px(1.2)} />
              ))}
            </g>
          )}
          {arac === 'ciz' && yapisma && (
            <circle cx={yapisma.m[0]} cy={yapisma.m[1]} r={px(yapisma.tur === 'hat' ? 6 : 8)}
              fill="none" stroke="#0E1C4F" strokeWidth={px(2)} style={{ pointerEvents: 'none' }} />
          )}
        </svg>

        {/* Yakınlaştırma */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => yakinlas(1 / 1.5)}
            className="w-8 h-8 rounded-md bg-[#F3EFE8] border border-[#CFC5B4] text-[#0E1C4F] font-bold cursor-pointer">+</button>
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => yakinlas(1.5)}
            className="w-8 h-8 rounded-md bg-[#F3EFE8] border border-[#CFC5B4] text-[#0E1C4F] font-bold cursor-pointer">−</button>
        </div>

        {/* Ölçek */}
        <div className="absolute left-2 bottom-2 px-2 py-1 rounded bg-[#F3EFE8]/90 text-[10px] font-mono text-[#6A5E4C] pointer-events-none">
          {(() => {
            const hedef = 100 / olcek;
            const adimlar = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
            const m = adimlar.find(a => a >= hedef) ?? 5000;
            return (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1 bg-[#0E1C4F]" style={{ width: m * olcek }} />
                {km(m)}
              </span>
            );
          })()}
        </div>

        {uyari && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-10 px-3 py-1.5 rounded-md bg-[#F26B6F] text-[12px] text-white shadow pointer-events-none">
            {uyari}
          </div>
        )}

        {(arac === 'bina' || arac === 'sablon') && (
          <div className="absolute left-2 top-2 max-w-[70%] px-2.5 py-1.5 rounded-md bg-[#0E1C4F]/85 text-[11px] text-[#F3EFE8] pointer-events-none">
            {arac === 'bina'
              ? `${binaBilgisi(binaTur).ad}: dokun. Yola yakınsa yola dönük oturur.`
              : `${SABLONLAR.find(x => x.id === sablonId)!.ad}: yerleştirmek için dokun. Denize ve mevcut binalara düşen parçalar konmaz.`}
          </div>
        )}

        {/* Çizim ipucu */}
        {arac === 'ciz' && (
          <div className="absolute left-2 top-2 max-w-[70%] px-2.5 py-1.5 rounded-md bg-[#0E1C4F]/85 text-[11px] text-[#F3EFE8] pointer-events-none">
            {cizilen.length === 0
              ? `${turBilgisi(cizTur).ad}: ilk noktaya dokun. Yol ve kavşak yakınında nokta yapışır.`
              : `${cizilen.length} nokta · ${km(cizimUzunlugu)} — bitirmek için Enter, çift tık ya da "Bitir"`}
          </div>
        )}
      </div>

      {/* Panel */}
      <div className="lg:w-72 shrink-0 flex flex-col gap-3 text-[#0E1C4F] dark:text-[#F3EFE8]">
        <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Araç</div>
          <div className="grid grid-cols-5 lg:grid-cols-3 gap-1.5">
            {([
              ['gez', 'Gez', Hand], ['sec', 'Seç', MousePointer2], ['ciz', 'Yol çiz', PenLine],
              ['bina', 'Bina', Home], ['sablon', 'Şablon', LayoutGrid]
            ] as const).map(([id, ad, Ikon]) => (
              <button key={id} type="button" onClick={() => { setArac(id); setCizilen([]); setImlec(null); if (id !== 'sec') setSecili(null); }}
                className={`flex flex-col items-center gap-1 py-2 rounded-md text-[11px] cursor-pointer border ${
                  arac === id ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] border-[#0E1C4F]' : 'border-[#CFC5B4] dark:border-[#2C3C72] hover:border-[#0E1C4F]'}`}>
                <Ikon className="w-4 h-4" />{ad}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 mt-2">
            <button type="button" onClick={geriAl} disabled={adim === 0}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] cursor-pointer disabled:opacity-35">
              <Undo2 className="w-3.5 h-3.5" /> Geri al
            </button>
            <button type="button" onClick={yinele} disabled={adim >= gecmis.length - 1}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] cursor-pointer disabled:opacity-35">
              <Redo2 className="w-3.5 h-3.5" /> Yinele
            </button>
          </div>
        </div>

        {arac === 'ciz' && (
          <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Yol türü</div>
            <div className="flex flex-col gap-1">
              {YOL_TURLERI.map(t => (
                <button key={t.id} type="button" onClick={() => setCizTur(t.id)}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left cursor-pointer border ${
                    cizTur === t.id ? 'border-[#F26B6F] bg-white/60 dark:bg-[#17345A]' : 'border-transparent hover:border-[#CFC5B4]'}`}>
                  <svg width="34" height="10" className="shrink-0">
                    {t.kenar && <line x1="2" y1="5" x2="32" y2="5" stroke={t.kenar} strokeWidth={t.kalinlik + 2} strokeLinecap="round" />}
                    <line x1="2" y1="5" x2="32" y2="5" stroke={t.renk} strokeWidth={t.kalinlik} strokeDasharray={t.kesik} strokeLinecap="round" />
                  </svg>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold">{t.ad}</span>
                    <span className="block text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-tight">{t.aciklama}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <button type="button" onClick={() => bitir()} disabled={cizilen.length < 2}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[11px] cursor-pointer disabled:opacity-35">
                <Check className="w-3.5 h-3.5" /> Bitir
              </button>
              <button type="button" onClick={() => setCizilen([])} disabled={!cizilen.length}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] cursor-pointer disabled:opacity-35">
                <X className="w-3.5 h-3.5" /> Vazgeç
              </button>
            </div>
          </div>
        )}

        {arac === 'bina' && (
          <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Bina türü</div>
            <div className="grid grid-cols-2 gap-1">
              {BINA_TURLERI.filter(b => b.elle).map(b => (
                <button key={b.id} type="button" onClick={() => setBinaTur(b.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left cursor-pointer border ${
                    binaTur === b.id ? 'border-[#F26B6F] bg-white/60 dark:bg-[#17345A]' : 'border-[#CFC5B4] dark:border-[#2C3C72]'}`}>
                  <span className={`inline-block w-3 h-3 shrink-0 border ${b.yuvarlak ? 'rounded-full' : 'rounded-[2px]'}`}
                    style={{ background: b.renk, borderColor: b.kenar }} />
                  <span className="text-[11px] leading-tight">{b.ad}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
              {binaBilgisi(binaTur).aciklama} · {binaBilgisi(binaTur).en}×{binaBilgisi(binaTur).boy} m.
              Bir yolun iki yanını evlerle doldurmak için: <b>Seç</b> → yola dokun → <b>Kenarını doldur</b>.
            </p>
          </div>
        )}

        {arac === 'sablon' && (
          <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Mahalle şablonu</div>
            <div className="flex flex-col gap-1">
              {SABLONLAR.map(t => (
                <button key={t.id} type="button" onClick={() => setSablonId(t.id)}
                  className={`px-2 py-1.5 rounded-md text-left cursor-pointer border ${
                    sablonId === t.id ? 'border-[#F26B6F] bg-white/60 dark:bg-[#17345A]' : 'border-transparent hover:border-[#CFC5B4]'}`}>
                  <span className="block text-[12px] font-semibold">{t.ad}</span>
                  <span className="block text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-tight">{t.aciklama}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              <span className="w-12 shrink-0">Yön</span>
              <button type="button" onClick={() => setSablonAci(a => (a - 15 + 360) % 360)}
                className="p-1 rounded border border-[#CFC5B4] dark:border-[#2C3C72] cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>
              <input type="range" min={0} max={359} step={5} value={sablonAci} onChange={e => setSablonAci(Number(e.target.value))} className="flex-1" />
              <button type="button" onClick={() => setSablonAci(a => (a + 15) % 360)}
                className="p-1 rounded border border-[#CFC5B4] dark:border-[#2C3C72] cursor-pointer"><RotateCw className="w-3.5 h-3.5" /></button>
              <span className="w-9 text-right font-mono">{sablonAci}°</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className="w-12 shrink-0">Boyut</span>
              <input type="range" min={0.6} max={1.6} step={0.05} value={sablonOlcek} onChange={e => setSablonOlcek(Number(e.target.value))} className="flex-1" />
              <span className="w-9 text-right font-mono">×{sablonOlcek.toFixed(2)}</span>
            </div>
            <p className="mt-2 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
              {sablonHam.yollar.length} yol · {sablonHam.binalar.length} yapı. Yerleşen sokak ve binalara ad verilmez.
              Tek adımda geri alınır.
            </p>
          </div>
        )}

        {arac === 'sec' && seciliBina && (
          <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Seçili yapı</div>
            <div className="text-[13px] font-semibold">{seciliBina.tur ? binaBilgisi(seciliBina.tur).ad : seciliBina.ad}</div>
            <div className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">
              {seciliBina.yeni ? 'Kurucuda kondu' : 'Haritadan'}
            </div>
            {seciliBina.yeni && seciliBina.tur && (
              <>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {BINA_TURLERI.filter(b => b.elle).map(b => (
                    <button key={b.id} type="button"
                      onClick={() => binaDegistir(seciliBina, x => ({ ...x, tur: b.id, en: b.en, boy: b.boy }))}
                      className={`px-2 py-1 rounded-md text-[11px] cursor-pointer border ${
                        seciliBina.tur === b.id ? 'border-[#F26B6F] bg-white/60 dark:bg-[#17345A] font-semibold' : 'border-[#CFC5B4] dark:border-[#2C3C72]'}`}>
                      {b.ad}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 mb-2">
                  <button type="button" onClick={() => binaDegistir(seciliBina, x => ({ ...x, aci: x.aci - Math.PI / 12 }))}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" /> Döndür
                  </button>
                  <button type="button" onClick={() => binaDegistir(seciliBina, x => ({ ...x, aci: x.aci + Math.PI / 12 }))}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] cursor-pointer">
                    <RotateCw className="w-3.5 h-3.5" /> Döndür
                  </button>
                </div>
              </>
            )}
            <button type="button" onClick={() => binaGizleGoster(seciliBina)}
              className="w-full py-1.5 rounded-md border border-[#F26B6F] text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">
              {seciliBina.gizli ? 'Taslağa geri getir' : 'Taslaktan kaldır'}
            </button>
          </div>
        )}

        {arac === 'sec' && !seciliBina && (
          <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Seçili yol</div>
            {seciliYol ? (
              <>
                <div className="text-[13px] font-semibold">{seciliYol.ad}</div>
                <div className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">
                  {seciliYol.yeni ? 'Kurucuda çizildi' : `Haritadan · ${seciliYol.haritaTur}`} · {km(uzunluk(seciliYol.m.map(derceye)))}
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {YOL_TURLERI.map(t => (
                    <button key={t.id} type="button" onClick={() => turDegistir(seciliYol, t.id)}
                      className={`px-2 py-1 rounded-md text-[11px] cursor-pointer border ${
                        seciliYol.tur === t.id ? 'border-[#F26B6F] bg-white/60 dark:bg-[#17345A] font-semibold' : 'border-[#CFC5B4] dark:border-[#2C3C72]'}`}>
                      {t.ad}
                    </button>
                  ))}
                </div>
                {!seciliYol.gizli && (
                  <div className="mb-2 p-2 rounded-md bg-white/50 dark:bg-[#17345A]">
                    <div className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">Kenarını doldur</div>
                    <div className="flex gap-1">
                      <select value={dolguTur} onChange={e => setDolguTur(e.target.value as BinaTuru)}
                        className="flex-1 min-w-0 text-[11px] rounded border border-[#CFC5B4] dark:border-[#2C3C72] bg-transparent px-1">
                        {BINA_TURLERI.filter(b => ['ev', 'dukkanli', 'yazlik', 'ciftlik'].includes(b.id)).map(b => (
                          <option key={b.id} value={b.id}>{b.ad}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => kenariDoldur(seciliYol, dolguTur)}
                        className="px-2 py-1 rounded-md bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[11px] cursor-pointer">
                        Doldur
                      </button>
                    </div>
                  </div>
                )}
                <button type="button" onClick={() => gizleGoster(seciliYol)}
                  className="w-full py-1.5 rounded-md border border-[#F26B6F] text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">
                  {seciliYol.gizli ? 'Taslağa geri getir' : 'Taslaktan kaldır'}
                </button>
                <p className="mt-1.5 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
                  Kaldırılan yol silinmez; kesikli kırmızı görünür, geri getirilebilir.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bir yola ya da binaya dokun.</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8] dark:bg-[#13204A] p-3 text-[11px]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2">Taslak</div>
          {taslakBosMu(taslak) ? (
            <p className="text-[#6A5E4C] dark:text-[#A6B0C9]">Henüz değişiklik yok. Harita bugünkü hâlinde.</p>
          ) : (
            <ul className="space-y-0.5">
              {ozet.yeni > 0 && <li><b>{ozet.yeni}</b> yeni yol · {km(ozet.uzun)}</li>}
              {ozet.tur > 0 && <li><b>{ozet.tur}</b> yolun türü değişti</li>}
              {ozet.bina > 0 && <li><b>{ozet.bina}</b> yeni yapı</li>}
              {ozet.gizli > 0 && <li><b>{ozet.gizli}</b> yol / yapı taslaktan kaldırıldı</li>}
            </ul>
          )}
          <button type="button" onClick={() => setGizliGoster(g => !g)}
            className="mt-2 flex items-center gap-1 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] cursor-pointer">
            {gizliGoster ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {gizliGoster ? 'Kaldırılanları gizle' : 'Kaldırılanları göster'}
          </button>
          <div className="mt-2 pt-2 border-t border-[#CFC5B4] dark:border-[#2C3C72] text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
            {kayitYazisi[durum]}. Harita değişmez; "Haritaya işle" sonraki adımda gelecek.
          </div>
        </div>
      </div>
    </div>
  );
}
