import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Hand, MousePointer2, PenLine, Redo2, Undo2, Check, X, Eye, EyeOff, Home, LayoutGrid, RotateCcw, RotateCw, MapPinned, Pentagon, TreePine, Link2, Minus, Plus, ExternalLink } from 'lucide-react';
import type { Item } from '../../types';
import { DEM_SINIR } from '../../data/duzadaDem';
import { ANIT_KALIPLARI, kalipBul, kalibiYerlestir, alan, merkez as cokgenMerkezi, yolCokgeneBiniyor } from './anitKaliplari';
import { belgelerAyniMi } from './kurucuHarita';
import type { KurucuBelge } from '../harita/duzenTipi';
import { DUZADA_GEO } from '../../data/duzadaGeo';
import type { HaritaBakisi } from '../harita/DuzadaHarita';
import { duzeniUygula, bosDuzen, type HaritaDuzeni } from '../harita/duzenKatmani';
import { catmullRom, type Nokta } from '../harita/sinirBolgeleri';
import { MAHALLE_TONU } from '../harita/haritaStili';
import type { KayitDurumu } from '../../lib/haritaDuzeni';
import {
  YOL_TURLERI, turBilgisi, bosTaslak, belgedenTaslak, taslaktanBelge, taslakBosMu,
  zeminCikar, yollariKur, yapistir, yeniYolId, derceye, metreye, uzunluk, karadaMi, DOGA_TURLERI,
  binalariKur, binaKonabilirMi, hattaUzaklik,
  type KurucuTaslak, type KurucuYol, type KurucuBina, type Yapisma, type YolTuru, type Cati, type DogaTuru
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

type Arac = 'gez' | 'sec' | 'ciz' | 'bina' | 'sablon' | 'ozel' | 'doga' | 'bagla' | 'sil';

interface KurucuProps {
  duzen: HaritaDuzeni | null;
  kaydet: (d: HaritaDuzeni) => Promise<void>;
  durum: KayitDurumu;
  /**
   * "Haritaya işle"de haritanın önceki Kurucu hâli buraya verilir; Düzada
   * onu arşivli bir kayıt olarak saklar (hiçbir şey silinmez).
   */
  arsivle?: (onceki: KurucuBelge) => Promise<void>;
  className?: string;
  /** Madde bağlama için viki maddeleri (H, 29 Eylül) */
  items?: Item[];
  /** "Maddeyi aç" */
  onMaddeAc?: (id: string) => void;
  /** Sol üstte gösterilecek başlık / görünüm düğmesi (Düzada verir) */
  ustSol?: React.ReactNode;
  /** 2D ↔ 3D geçişinde aynı yere bakmak için (Düzada tutar) */
  bakis?: HaritaBakisi | null;
  onBakis?: (b: HaritaBakisi) => void;
}

interface Gorunum { x: number; y: number; w: number }

/** MapLibre'de yakınlık 0'da bir pikselin ekvatordaki metresi (512 px karo) */
const EKVATOR_MPP = 78271.517;

const egri = (k: Nokta[]) => catmullRom(k, false, 6);
const yolYolu = (m: Nokta[]) =>
  m.length ? 'M' + m.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') : '';
const halkaYolu = (h: Nokta[][]) =>
  h.map(r => 'M' + r.map(p => `${p[0].toFixed(0)},${p[1].toFixed(0)}`).join('L') + 'Z').join('');

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export function Kurucu({ duzen, kaydet, durum, arsivle, className, items = [], onMaddeAc, ustSol, bakis, onBakis }: KurucuProps) {
  // ---- veri -------------------------------------------------------------------
  // Zemin bugünkü haritadır; Kurucu açıkken harita düzeni değişse bile zemin
  // açılıştaki hâlde kalır (çizerken altındaki yolların kaymaması için).
  // Haritaya işlenmiş Kurucu katmanı zemine katılmaz: o zaten taslakta.
  const [zemin] = useState(() => zeminCikar(duzeniUygula(DUZADA_GEO, duzen, { kurucuHaric: true })));

  // Geri al / yinele: taslağın her hâli sırayla saklanır (en fazla 100)
  const [tarihce, setTarihce] = useState<{ hal: KurucuTaslak[]; i: number }>(
    () => ({ hal: [belgedenTaslak(duzen?.kurucu ?? duzen?.kurucuIslenen)], i: 0 })
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
  const ilkBakis = useRef(bakis ?? null);
  useEffect(() => {
    if (sigdi.current || boyut.w < 50 || boyut.h < 50) return;
    const el = kutu.current;
    if (!el || el.clientWidth !== boyut.w) return;
    sigdi.current = true;
    // 3D'den gelindiyse aynı yere bak; yoksa bütün ada
    const b = ilkBakis.current;
    if (b) {
      const cosE = Math.cos((b.merkez[1] * Math.PI) / 180);
      const w = Math.min(Math.max((EKVATOR_MPP * cosE / 2 ** b.zoom) * boyut.w, 60), 40000);
      const m = metreye(b.merkez);
      setGorunum({ x: m[0] - w / 2, y: m[1] - (w * boyut.h / boyut.w) / 2, w });
    } else {
      setGorunum(sigdir(boyut.w, boyut.h));
    }
  }, [boyut, sigdir]);
  const olcek = boyut.w / gorunum.w; // piksel / metre
  const h = boyut.h / olcek;

  // Baktığı yeri Düzada'ya bildir (3D açılınca oradan başlasın)
  useEffect(() => {
    if (!sigdi.current || !onBakis) return;
    const merkez = derceye([gorunum.x + gorunum.w / 2, gorunum.y + h / 2]) as [number, number];
    const cosE = Math.cos((merkez[1] * Math.PI) / 180);
    onBakis({ merkez, zoom: Math.log2((EKVATOR_MPP * cosE * boyut.w) / gorunum.w) });
  }, [gorunum, h, boyut.w, onBakis]);

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
  const [arac, setArac] = useState<Arac>('gez');
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

  // ---- özel yapı, doğa, madde bağı (H, 29 Eylül) ------------------------------
  const [ozelKat, setOzelKat] = useState(3);
  const [ozelCati, setOzelCati] = useState<Cati>('duz');
  const [kalipId, setKalipId] = useState<string | null>(null);
  const [kalipAci, setKalipAci] = useState(0); // derece
  const [dogaTur, setDogaTur] = useState<DogaTuru>('zeytinlik');
  const [cokgen, setCokgen] = useState<Nokta[]>([]); // metre; özel yapı / doğa çizimi
  const [baglaArama, setBaglaArama] = useState('');
  /** Sürüklenen köşe: özel yapının köşesi, bırakılınca taslağa yazılır */
  const [surukKose, setSurukKose] = useState<{ id: string; i: number; m: Nokta } | null>(null);

  const ozelYapilar = useMemo(() => (Object.entries(taslak.ozelYapilar) as Array<[string, KurucuTaslak['ozelYapilar'][string]]>).map(([id, o]) => {
    const k = o.koseler.map(metreye);
    return { id, ...o, m: k, gizli: taslak.gizlenen.includes(id) };
  }), [taslak.ozelYapilar, taslak.gizlenen]);
  const dogaAlanlari = useMemo(() => (Object.entries(taslak.doga) as Array<[string, KurucuTaslak['doga'][string]]>).map(([id, d]) => ({ id, tur: d.tur, m: d.koseler.map(metreye) })), [taslak.doga]);

  /** Yapı yolun üstüne biniyorsa o yolun adı (yoksa null) */
  const ustundekiYol = useCallback((k: Nokta[]) =>
    yollar.find(y => !y.gizli && yolCokgeneBiniyor(y.m, k)) ?? null, [yollar]);

  /** Özel yapı / doğa çokgenini kapatır ve taslağa yazar */
  const cokgeniBitir = useCallback((k: Nokta[] = cokgen) => {
    if (k.length < 3) { setUyari('En az üç köşe gerekir.'); return; }
    if (arac === 'ozel') {
      const yol = ustundekiYol(k);
      if (yol) { setUyari(`Yapı yolun üstüne biniyor (${yol.ad}). Köşeleri yoldan uzağa koy ya da önce yolu Kaldır.`); return; }
      degistir(t => ({ ...t, ozelYapilar: { ...t.ozelYapilar, [yeniYolId(t.ozelYapilar, 'kurucu_ozel')]: { koseler: k.map(derceye), kat: ozelKat, cati: ozelCati } } }));
      setUyari(`Özel yapı kondu · ${Math.round(alan(k))} m² · ${ozelKat} kat`);
    } else {
      degistir(t => ({ ...t, doga: { ...t.doga, [yeniYolId(t.doga, 'kurucu_doga')]: { tur: dogaTur, koseler: k.map(derceye) } } }));
    }
    setCokgen([]);
  }, [cokgen, arac, ozelKat, ozelCati, dogaTur, degistir, ustundekiYol]);

  const kalibiKoy = useCallback((m: Nokta) => {
    const k = kalipBul(kalipId ?? undefined);
    if (!k) return;
    const koseler = kalibiYerlestir(k, m, (kalipAci * Math.PI) / 180);
    if (!koseler.every(p => karadaMi(p, zemin.ada))) { setUyari('Kalıp denize taşıyor — karada daha geniş bir yer seç.'); return; }
    const yol = ustundekiYol(koseler);
    if (yol) { setUyari(`Kalıp yolun üstüne biniyor (${yol.ad}). Yolun yanına koy ya da yönünü çevir.`); return; }
    degistir(t => ({ ...t, ozelYapilar: { ...t.ozelYapilar, [yeniYolId(t.ozelYapilar, 'kurucu_ozel')]: { koseler: koseler.map(derceye), kat: k.kat, cati: 'duz', kalip: k.id } } }));
    setUyari(`${k.ad} kondu · ${k.kat} kat. Seç ile katını, köşelerini ve yönünü değiştirebilirsin.`);
  }, [kalipId, kalipAci, zemin.ada, degistir, ustundekiYol]);

  const ozelDegistir = (id: string, f: (o: KurucuTaslak['ozelYapilar'][string]) => KurucuTaslak['ozelYapilar'][string]) =>
    degistir(t => t.ozelYapilar[id] ? { ...t, ozelYapilar: { ...t.ozelYapilar, [id]: f(t.ozelYapilar[id]) } } : t);

  const ozelDondur = (id: string, derece: number) => ozelDegistir(id, o => {
    const k = o.koseler.map(metreye);
    const c = cokgenMerkezi(k);
    const a = (derece * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
    return { ...o, koseler: k.map(([x, y]) => derceye([c[0] + (x - c[0]) * co - (y - c[1]) * si, c[1] + (x - c[0]) * si + (y - c[1]) * co])) };
  });

  /** Kurucu'da konan özel yapı ve doğa alanı taslaktan silinir (kural: silme var) */
  const taslaktanSil = (id: string) => degistir(t => {
    const oz = { ...t.ozelYapilar }; delete oz[id];
    const dg = { ...t.doga }; delete dg[id];
    const bg = { ...t.baglar }; delete bg[id];
    return { ...t, ozelYapilar: oz, doga: dg, baglar: bg };
  });

  const bagla = (yapiId: string, maddeId: string | null) => degistir(t => {
    const bg = { ...t.baglar };
    if (maddeId) bg[yapiId] = maddeId; else delete bg[yapiId];
    return { ...t, baglar: bg };
  });

  /** Bağlanabilecek viki maddeleri: yerler, mekânlar, kurumlar */
  const baglanabilir = useMemo(() => items.filter(i => !i.archived && !i.isProposal
    && ['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'oda'].includes(i.type)), [items]);
  const maddeAdi = (id?: string | null) => (id ? items.find(i => i.id === id)?.title : undefined);

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
    if (en.d < 35 && !['meydan', 'agac', 'cesme', 'bag'].includes(tur)) {
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
      else if (e.key === 'Enter' && (arac === 'ozel' || arac === 'doga') && cokgen.length >= 3) cokgeniBitir();
      else if (e.key === 'Escape') { setCizilen([]); setCokgen([]); setSecili(null); }
      else if (e.key === 'Backspace' && arac === 'ciz' && cizilen.length) { e.preventDefault(); setCizilen(c => c.slice(0, -1)); }
      else if (e.key === 'Backspace' && (arac === 'ozel' || arac === 'doga') && cokgen.length) { e.preventDefault(); setCokgen(c => c.slice(0, -1)); }
      // Seçili yol ya da yapı Delete / Backspace ile kaldırılır
      else if ((e.key === 'Delete' || e.key === 'Backspace') && arac === 'sec' && secili) { e.preventDefault(); kaldirGeriGetir(secili); setSecili(null); }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [arac, bitir, cizilen.length, geriAl, yinele, secili, cokgen.length, cokgeniBitir]);

  // ---- işaretçi: kaydır / tıkla / çimdikle ------------------------------------
  const basilanlar = useRef(new Map<number, { x: number; y: number }>());
  const surukleme = useRef<{ x: number; y: number; g: Gorunum; oynadi: boolean } | null>(null);
  const cimdik = useRef<{ d: number; g: Gorunum; m: Nokta } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // Seçili özel yapının köşesi tutulduysa: köşe sürüklenir, harita kaymaz
    const kose = (e.target as Element).closest?.('[data-kose]');
    if (kose && arac === 'sec') {
      const [id, i] = String(kose.getAttribute('data-kose')).split('|');
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setSurukKose({ id, i: Number(i), m: ekrandanMetre(e.clientX, e.clientY) });
      return;
    }
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
    if (surukKose) { setSurukKose({ ...surukKose, m: ekrandanMetre(e.clientX, e.clientY) }); return; }
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
    } else if (arac === 'bina' || arac === 'sablon' || arac === 'ozel' || arac === 'doga') {
      setImlec(ekrandanMetre(e.clientX, e.clientY));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (surukKose) {
      const { id, i, m } = surukKose;
      setSurukKose(null);
      if (!karadaMi(m, zemin.ada)) { setUyari('Köşe denize taşınamaz.'); return; }
      ozelDegistir(id, o => ({ ...o, koseler: o.koseler.map((k, j) => (j === i ? derceye(m) : k)) }));
      return;
    }
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
      const oz = altta.map(el => el.closest('[data-ozel]')).find(Boolean);
      const bn = altta.map(el => el.closest('[data-bina]')).find(Boolean);
      const yl = altta.map(el => el.closest('[data-yol]')).find(Boolean);
      const dg = altta.map(el => el.closest('[data-doga]')).find(Boolean);
      setSecili(oz ? oz.getAttribute('data-ozel') : bn ? bn.getAttribute('data-bina') : yl ? yl.getAttribute('data-yol') : dg ? dg.getAttribute('data-doga') : null);
    } else if (arac === 'sil') {
      // Kaldır aracı: dokunulan yol ya da yapı tek dokunuşta kaldırılır;
      // kaldırılmışa dokununca geri gelir (29 Eylül, Kemal: "yolların
      // silinmesi daha kolay olmalı"). Silinmez; Geri al da çalışır.
      const altta = document.elementsFromPoint(e.clientX, e.clientY);
      const oz = altta.map(el => el.closest('[data-ozel]')).find(Boolean);
      const dg = altta.map(el => el.closest('[data-doga]')).find(Boolean);
      if (oz || dg) { taslaktanSil(String((oz ?? dg)!.getAttribute(oz ? 'data-ozel' : 'data-doga'))); return; }
      const bn = altta.map(el => el.closest('[data-bina]')).find(Boolean);
      const yl = altta.map(el => el.closest('[data-yol]')).find(Boolean);
      const id = bn ? bn.getAttribute('data-bina') : yl ? yl.getAttribute('data-yol') : null;
      if (id) kaldirGeriGetir(id);
    } else if (arac === 'ozel' && kalipId) {
      kalibiKoy(ekrandanMetre(e.clientX, e.clientY));
    } else if (arac === 'ozel' || arac === 'doga') {
      const m = ekrandanMetre(e.clientX, e.clientY);
      // İlk köşeye dönülünce çokgen kapanır
      if (cokgen.length >= 3 && Math.hypot(m[0] - cokgen[0][0], m[1] - cokgen[0][1]) < 10 / olcek) { cokgeniBitir(); return; }
      if (!karadaMi(m, zemin.ada)) { setUyari('Köşe denize konamaz — karada bir nokta seç.'); return; }
      setCokgen(c => [...c, m]);
    } else if (arac === 'bagla') {
      const altta = document.elementsFromPoint(e.clientX, e.clientY);
      const oz = altta.map(el => el.closest('[data-ozel]')).find(Boolean);
      const bn = altta.map(el => el.closest('[data-bina]')).find(Boolean);
      const id = oz ? oz.getAttribute('data-ozel') : bn ? bn.getAttribute('data-bina') : null;
      setSecili(id);
      setBaglaArama('');
      if (!id) setUyari('Bir yapıya dokun; ardından maddesini seç.');
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
  const gizleGoster = (y: KurucuYol) => kaldirGeriGetir(y.id);
  function kaldirGeriGetir(id: string) {
    degistir(t => ({
      ...t,
      gizlenen: t.gizlenen.includes(id) ? t.gizlenen.filter(x => x !== id) : [...t.gizlenen, id]
    }));
  }

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
      bina: Object.keys(taslak.yeniBinalar).length,
      ozel: Object.keys(taslak.ozelYapilar).length,
      doga: Object.keys(taslak.doga).length,
      bag: Object.keys(taslak.baglar).length
    };
  }, [taslak]);
  const degisiklikSayisi = ozet.yeni + ozet.tur + ozet.gizli + ozet.bina + ozet.ozel + ozet.doga + ozet.bag;

  // ---- Haritaya işle ------------------------------------------------------------
  const taslakBelgesi = useMemo(() => taslaktanBelge(taslak), [taslak]);
  // Kayıt buluttan geri dönene kadar az önce işlenen hâl burada tutulur
  const [yerelIslenen, setYerelIslenen] = useState<KurucuBelge | undefined>(undefined);
  const islenmemis = !belgelerAyniMi(taslakBelgesi, duzen?.kurucuIslenen)
    && !belgelerAyniMi(taslakBelgesi, yerelIslenen);
  const [isleOnay, setIsleOnay] = useState(false);
  const [isleniyor, setIsleniyor] = useState(false);
  const [isleRaporu, setIsleRaporu] = useState<string | null>(null);
  const haritayaIsle = async () => {
    if (isleniyor) return;
    setIsleOnay(false);
    setIsleniyor(true);
    try {
      const onceki = yerelIslenen ?? duzen?.kurucuIslenen;
      if (onceki && !belgelerAyniMi(onceki, undefined) && arsivle) await arsivle(onceki);
      const d = sonDuzen.current ?? bosDuzen();
      await kaydet({ ...d, guncelleme: Date.now(), kurucu: taslakBelgesi, kurucuIslenen: taslakBelgesi });
      setYerelIslenen(taslakBelgesi);
      setIsleRaporu('Haritaya işlendi. "3D · bak" ile ve sitede görünür.'
        + (onceki && arsivle ? ' Önceki hâl arşive kalktı.' : ''));
    } catch (e) {
      setIsleRaporu(`İşlenemedi: ${e instanceof Error ? e.message : 'bilinmeyen hata'}. Taslak duruyor, tekrar dene.`);
    } finally {
      setIsleniyor(false);
    }
  };

  const cizimUzunlugu = useMemo(() => {
    const hat = imlec && arac === 'ciz' && cizilen.length ? [...cizilen, imlec] : cizilen;
    return hat.length >= 2 ? uzunluk(hat.map(derceye)) : 0;
  }, [cizilen, imlec, arac]);

  // ---- çizim ------------------------------------------------------------------
  const px = (n: number) => n / olcek; // piksel → metre (kalınlık için)
  /**
   * Yol kalınlığı yakınlaşmaya bağlı: sokak düzeyinde tam kalınlık, adanın
   * tamamına bakarken üçte birine iner (29 Eylül, Kemal: "zoom out'tayken
   * yollar çok kalın görünüyor").
   */
  const yolOrani = Math.min(1, Math.max(0.35, olcek * 1.4));
  const yk = (n: number) => px(n * yolOrani);
  const gorunenYollar = [...yollar].sort((a, b) =>
    ['patika', 'toprak', 'sokak', 'ana'].indexOf(a.tur) - ['patika', 'toprak', 'sokak', 'ana'].indexOf(b.tur));

  const kayitYazisi: Record<KayitDurumu, string> = {
    yukleniyor: 'Yükleniyor…', hazir: 'Taslak hazır', kaydediliyor: 'Kaydediliyor…',
    kaydedildi: 'Taslak kaydedildi', yerelde: 'Bu tarayıcıda saklandı (bağlantı yok)'
  };

  // ---- seçili nesne -----------------------------------------------------------
  const seciliOzel = ozelYapilar.find(o => o.id === secili) ?? null;
  const seciliDoga = dogaAlanlari.find(d => d.id === secili) ?? null;
  const fiziki = useMemo(() => {
    const a = metreye([DEM_SINIR[0], DEM_SINIR[3]]);
    const b = metreye([DEM_SINIR[2], DEM_SINIR[1]]);
    return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] };
  }, []);
  const ozelKoseleri = (o: { id: string; m: Nokta[] }) =>
    surukKose && surukKose.id === o.id ? o.m.map((p, i) => (i === surukKose.i ? surukKose.m : p)) : o.m;

  const kart = 'rounded-2xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5]/95 dark:bg-[#13204A]/95 backdrop-blur-sm shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)] text-[#0E1C4F] dark:text-[#F3EFE8]';
  const etiket = 'text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#6A5E4C] dark:text-[#A6B0C9]';
  const cip = (aktif: boolean) => `px-2.5 py-1 rounded-full text-[11px] border cursor-pointer ${aktif ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white border-transparent' : 'border-[#CFC5B4] dark:border-[#2C3C72] hover:border-[#F26B6F]'}`;
  const dugmeBos = 'flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] cursor-pointer hover:border-[#F26B6F] disabled:opacity-35';

  /** Madde bağı kutusu — seçili yapı için */
  const maddeBagi = (yapiId: string, varsayilan?: string) => {
    const mevcut = taslak.baglar[yapiId] ?? varsayilan;
    const q = baglaArama.trim().toLocaleLowerCase('tr');
    const liste = baglanabilir.filter(i => !q || i.title.toLocaleLowerCase('tr').includes(q)).slice(0, 7);
    return (
      <div className="mt-2 pt-2 border-t border-[#CFC5B4] dark:border-[#2C3C72]">
        <div className={etiket}>Viki maddesi</div>
        {mevcut ? (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="flex-1 min-w-0 truncate text-[12px] font-semibold">{maddeAdi(mevcut) ?? 'bağlı (madde bulunamadı)'}</span>
            {onMaddeAc && <button type="button" onClick={() => onMaddeAc(mevcut)} className={dugmeBos}><ExternalLink className="w-3 h-3" />Aç</button>}
            {taslak.baglar[yapiId] && <button type="button" onClick={() => bagla(yapiId, null)} className={dugmeBos} title="Bağı kaldır"><X className="w-3 h-3" /></button>}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bağlı madde yok.</p>
        )}
        <input
          value={baglaArama}
          onChange={e => setBaglaArama(e.target.value)}
          placeholder="Madde ara ve bağla…"
          className="mt-1.5 w-full text-[12px] rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-white dark:bg-[#17345A] px-2 py-1.5 focus:outline-hidden focus:border-[#F26B6F]"
        />
        {(q || arac === 'bagla') && (
          <ul className="mt-1 max-h-40 overflow-y-auto">
            {liste.map(i => (
              <li key={i.id}>
                <button type="button" onClick={() => { bagla(yapiId, i.id); setBaglaArama(''); }}
                  className={`w-full text-left px-2 py-1 rounded-md text-[12px] cursor-pointer hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] ${mevcut === i.id ? 'font-semibold text-[#D6484C] dark:text-[#F26B6F]' : ''}`}>
                  {i.title} <span className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">· {i.type}</span>
                </button>
              </li>
            ))}
            {!liste.length && <li className="px-2 py-1 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Eşleşen madde yok.</li>}
          </ul>
        )}
      </div>
    );
  };

  const ARACLAR: Array<{ id: Arac; ad: string; Ikon: React.ElementType; telefonda?: boolean }> = [
    { id: 'gez', ad: 'Gez', Ikon: Hand, telefonda: true },
    { id: 'sec', ad: 'Seç', Ikon: MousePointer2, telefonda: true },
    { id: 'ciz', ad: 'Yol', Ikon: PenLine },
    { id: 'bina', ad: 'Bina', Ikon: Home },
    { id: 'sablon', ad: 'Şablon', Ikon: LayoutGrid },
    { id: 'ozel', ad: 'Özel yapı', Ikon: Pentagon },
    { id: 'doga', ad: 'Doğa', Ikon: TreePine },
    { id: 'bagla', ad: 'Madde bağla', Ikon: Link2 },
    { id: 'sil', ad: 'Kaldır', Ikon: Eraser, telefonda: true }
  ];
  const aracSec = (id: Arac) => { setArac(id); setCizilen([]); setCokgen([]); setImlec(null); if (id !== 'sec' && id !== 'bagla') setSecili(null); };

  const ipucu = (() => {
    if (arac === 'ciz') return cizilen.length === 0
      ? `${turBilgisi(cizTur).ad}: ilk noktaya dokun. Yol ve kavşak yakınında nokta yapışır.`
      : `${cizilen.length} nokta · ${km(cizimUzunlugu)} — bitirmek için Enter, çift tık ya da "Bitir"`;
    if (arac === 'ozel' && kalipId) return `${kalipBul(kalipId)?.ad}: yerleştirmek için dokun. Yönü aşağıdan çevir.`;
    if (arac === 'ozel' || arac === 'doga') return cokgen.length === 0
      ? `${arac === 'ozel' ? 'Özel yapı' : DOGA_TURLERI.find(d => d.id === dogaTur)!.ad}: köşelere sırayla dokun. İlk köşeye dönünce kapanır.`
      : `${cokgen.length} köşe · ${cokgen.length >= 3 ? `${Math.round(alan(cokgen))} m² — ilk köşeye dokun ya da Enter` : 'devam et'} · ⌫ son köşeyi siler`;
    if (arac === 'bagla') return 'Bağlamak istediğin yapıya dokun, sonra sağdan maddesini seç.';
    if (arac === 'bina') return `${binaBilgisi(binaTur).ad}: dokun. Yola yakınsa yola dönük oturur.`;
    if (arac === 'sablon') return `${SABLONLAR.find(x => x.id === sablonId)!.ad}: yerleştirmek için dokun.`;
    if (arac === 'sil') return 'Kaldırmak istediğin şeye dokun. Haritadan gelenler geri getirilebilir; Kurucu\'da konan özel yapı ve doğa silinir.';
    if (arac === 'sec') return 'Bir yola, yapıya ya da doğa alanına dokun.';
    return null;
  })();

  const seciliVar = !!(seciliOzel || seciliBina || seciliYol || seciliDoga);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[#CFC5B4] dark:border-[#2C3C72] ${className ?? ''}`}>
      {/* Harita alanı */}
      <div
        ref={kutu}
        className={`absolute inset-0 bg-[#1C4E8C] touch-none select-none ${
          ['ciz', 'bina', 'sablon', 'sil', 'ozel', 'doga'].includes(arac) ? 'cursor-crosshair' : arac === 'gez' ? 'cursor-grab' : 'cursor-pointer'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setImlec(null); setYapisma(null); }}
        onWheel={onWheel}
        onDoubleClick={() => { if (arac === 'ciz') bitir(); else if ((arac === 'ozel' || arac === 'doga') && cokgen.length >= 3) cokgeniBitir(); }}
        data-kurucu-alan
      >
        <svg width={boyut.w} height={boyut.h} viewBox={`${gorunum.x} ${gorunum.y} ${gorunum.w} ${h}`} className="block">
          <defs>
            <pattern id="agac-deseni" width={14} height={14} patternUnits="userSpaceOnUse">
              <circle cx={4} cy={4} r={3.2} fill="#46643A" opacity={0.85} />
              <circle cx={11} cy={10} r={2.8} fill="#3C5A33" opacity={0.85} />
            </pattern>
            <pattern id="zeytin-deseni" width={10} height={10} patternUnits="userSpaceOnUse">
              <circle cx={5} cy={5} r={2.4} fill="#6F8747" opacity={0.9} />
            </pattern>
          </defs>

          {/* Fiziki ada: yükselti verisinden üretilen doku (29 Eylül) */}
          <image href={`${import.meta.env.BASE_URL || '/'}ada-fiziki.webp`} x={fiziki.x} y={fiziki.y}
            width={fiziki.w} height={fiziki.h} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />

          {/* Doğa alanları */}
          {dogaAlanlari.map(d => {
            const bi = DOGA_TURLERI.find(x => x.id === d.tur)!;
            const sec = d.id === secili;
            return (
              <g key={d.id} data-doga={d.id}>
                <path d={halkaYolu([d.m])} fill={bi.renk} fillOpacity={0.55} stroke={sec ? '#F26B6F' : bi.kenar} strokeWidth={px(sec ? 2.5 : 1)} />
                {d.tur !== 'kumsal' && <path d={halkaYolu([d.m])} fill={`url(#${d.tur === 'orman' ? 'agac' : 'zeytin'}-deseni)`} style={{ pointerEvents: 'none' }} />}
              </g>
            );
          })}

          {/* Yollar: önce kenarlar, sonra dolgu */}
          {gorunenYollar.map(y => {
            if (y.gizli && !gizliGoster) return null;
            const b = turBilgisi(y.tur);
            if (y.gizli || !b.kenar) return null;
            return <path key={`k-${y.id}`} d={yolYolu(y.m)} fill="none" stroke={b.kenar}
              strokeWidth={yk(b.kalinlik + 2)} strokeLinecap="round" strokeLinejoin="round" />;
          })}
          {gorunenYollar.map(y => {
            if (y.gizli && !gizliGoster) return null;
            const b = turBilgisi(y.tur);
            const sec = y.id === secili;
            return (
              <g key={y.id} data-yol={y.id}>
                <path d={yolYolu(y.m)} fill="none" stroke="transparent" strokeWidth={px(14)} />
                {sec && <path d={yolYolu(y.m)} fill="none" stroke="#F26B6F" strokeOpacity={0.45}
                  strokeWidth={yk(b.kalinlik) + px(6)} strokeLinecap="round" strokeLinejoin="round" />}
                <path d={yolYolu(y.m)} fill="none"
                  stroke={y.gizli ? '#F26B6F' : b.renk} strokeOpacity={y.gizli ? 0.5 : 1}
                  strokeWidth={y.gizli ? px(1.5) : yk(b.kalinlik)}
                  strokeDasharray={y.gizli ? `${px(4)} ${px(4)}` : b.kesik ? b.kesik.split(' ').map(n => px(Number(n))).join(' ') : undefined}
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}

          {/* Binalar */}
          {binalar.map(bn => {
            if (bn.gizli && !gizliGoster) return null;
            const bi = bn.tur ? binaBilgisi(bn.tur) : null;
            const sec = bn.id === secili;
            const bagli = !!(taslak.baglar[bn.id] ?? bn.wikiId);
            return (
              <g key={bn.id} data-bina={bn.id}>
                {!bn.gizli && !bi?.yuvarlak && <path d={halkaYolu([bn.kose.map(p => [p[0] + px(2), p[1] + px(2)] as Nokta)])} fill="rgba(14,28,79,0.25)" />}
                {bi?.yuvarlak ? (
                  <circle cx={bn.m[0]} cy={bn.m[1]} r={(bn.en ?? 10) / 2}
                    fill={bn.gizli ? 'none' : bi.renk} fillOpacity={0.95}
                    stroke={sec ? '#F26B6F' : bn.gizli ? '#F26B6F' : bi.kenar} strokeWidth={px(sec ? 2.5 : 0.8)}
                    strokeDasharray={bn.gizli ? `${px(3)} ${px(3)}` : undefined} />
                ) : (
                  <path d={halkaYolu([bn.kose])}
                    fill={bn.gizli ? 'none' : bi ? bi.renk : '#E9E1D3'}
                    stroke={sec ? '#F26B6F' : bn.gizli ? '#F26B6F' : bagli ? '#0E1C4F' : bi ? bi.kenar : '#8C7B63'}
                    strokeWidth={px(sec ? 2.5 : bagli ? 1.4 : 0.8)}
                    strokeDasharray={bn.gizli || (bn.tur === 'meydan') ? `${px(3)} ${px(3)}` : undefined} />
                )}
              </g>
            );
          })}

          {/* Özel yapılar: gölge + taban + kat yazısı */}
          {ozelYapilar.map(o => {
            const k = ozelKoseleri(o);
            const sec = o.id === secili;
            const c = cokgenMerkezi(k);
            const golge = px(2) + o.kat * px(0.9);
            // Küçük görünen yapıda yazı binayı örtmesin: yalnız seçiliyken ya da yeterince büyükken
            const xler = k.map(p => p[0]);
            const yaziSigar = (Math.max(...xler) - Math.min(...xler)) / px(1) > 56;
            return (
              <g key={o.id} data-ozel={o.id}>
                <path d={halkaYolu([k.map(p => [p[0] + golge, p[1] + golge] as Nokta)])} fill="rgba(14,28,79,0.3)" />
                <path d={halkaYolu([k])} fill="#F3EDE2" stroke={sec ? '#F26B6F' : '#8C7B63'} strokeWidth={px(sec ? 2.8 : 1.2)} />
                {o.cati === 'besik' && k.length === 4 && (
                  <line x1={(k[0][0] + k[3][0]) / 2} y1={(k[0][1] + k[3][1]) / 2} x2={(k[1][0] + k[2][0]) / 2} y2={(k[1][1] + k[2][1]) / 2}
                    stroke="#B8A588" strokeWidth={px(1.2)} />
                )}
                {(yaziSigar || sec) && (
                  <text x={c[0]} y={c[1]} textAnchor="middle" dominantBaseline="middle" fontSize={px(11)} fontWeight={600}
                    fill="#0E1C4F" style={{ pointerEvents: 'none' }}>
                    {maddeAdi(taslak.baglar[o.id]) ?? `${o.kat} kat`}
                  </text>
                )}
                {sec && arac === 'sec' && k.map((p, i) => (
                  <circle key={i} data-kose={`${o.id}|${i}`} cx={p[0]} cy={p[1]} r={px(6)}
                    fill="#fff" stroke="#F26B6F" strokeWidth={px(2)} style={{ cursor: 'move' }} />
                ))}
              </g>
            );
          })}

          {/* Şablon ve bina önizlemesi */}
          {sablonOnizleme && (
            <g style={{ pointerEvents: 'none' }} opacity={0.75}>
              {sablonOnizleme.yollar.map((y, i) => (
                <path key={i} d={yolYolu(y.m)} fill="none" stroke="#F26B6F" strokeWidth={yk(turBilgisi(y.tur).kalinlik)} strokeLinecap="round" strokeLinejoin="round" />
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
              : <path d={halkaYolu([binaKoseleri(t.m, t.en, t.boy, t.aci)])} fill={bi.renk} fillOpacity={0.6} stroke="#F26B6F" strokeWidth={px(1.5)} style={{ pointerEvents: 'none' }} />;
          })()}
          {arac === 'ozel' && kalipId && imlec && (() => {
            const k = kalibiYerlestir(kalipBul(kalipId)!, imlec, (kalipAci * Math.PI) / 180);
            return <path d={halkaYolu([k])} fill="#F26B6F" fillOpacity={0.3} stroke="#F26B6F" strokeWidth={px(1.5)} style={{ pointerEvents: 'none' }} />;
          })()}

          {/* Etiketler: yalnız ad (mahalle sınırı çizilmez) */}
          {zemin.etiketler.map((et, i) => (
            <text key={i} x={et.m[0]} y={et.m[1]} textAnchor="middle"
              fontSize={px(et.tur === 'mahalle' ? 13 : 10)} fontWeight={et.tur === 'mahalle' ? 700 : 500}
              letterSpacing={et.tur === 'mahalle' ? px(2.5) : 0}
              fill="#FAF8F5" stroke="rgba(14,28,79,0.55)" strokeWidth={px(3)} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
              {et.tur === 'mahalle' ? et.ad.toLocaleUpperCase('tr') : et.ad}
            </text>
          ))}

          {/* Çizilen yol */}
          {arac === 'ciz' && cizilen.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              <path d={yolYolu(cizilen.length >= 3 ? egri(cizilen) : cizilen)} fill="none" stroke="#F26B6F"
                strokeWidth={yk(turBilgisi(cizTur).kalinlik)} strokeLinecap="round" strokeLinejoin="round" />
              {imlec && <path d={yolYolu([cizilen[cizilen.length - 1], imlec])} fill="none" stroke="#F26B6F" strokeWidth={px(1.5)} strokeDasharray={`${px(5)} ${px(4)}`} />}
              {cizilen.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={px(i === 0 ? 5 : 3.5)} fill={i === 0 ? '#F3EFE8' : '#F26B6F'} stroke="#0E1C4F" strokeWidth={px(1.2)} />
              ))}
            </g>
          )}
          {arac === 'ciz' && yapisma && (
            <circle cx={yapisma.m[0]} cy={yapisma.m[1]} r={px(yapisma.tur === 'hat' ? 6 : 8)} fill="none" stroke="#0E1C4F" strokeWidth={px(2)} style={{ pointerEvents: 'none' }} />
          )}

          {/* Çizilen özel yapı / doğa çokgeni */}
          {(arac === 'ozel' || arac === 'doga') && cokgen.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              <path d={'M' + cokgen.map(p => `${p[0]},${p[1]}`).join('L')} fill="rgba(242,107,111,0.2)" stroke="#F26B6F" strokeWidth={px(2.5)} />
              {imlec && <path d={`M${cokgen[cokgen.length - 1][0]},${cokgen[cokgen.length - 1][1]}L${imlec[0]},${imlec[1]}L${cokgen[0][0]},${cokgen[0][1]}`}
                fill="none" stroke="#F26B6F" strokeWidth={px(1.5)} strokeDasharray={`${px(5)} ${px(4)}`} />}
              {cokgen.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={px(i === 0 ? 6 : 4)} fill="#fff" stroke="#F26B6F" strokeWidth={px(2.2)} />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Sol üst: başlık ve görünüm düğmesi (Düzada'dan) */}
      {ustSol && <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 pointer-events-none [&>*]:pointer-events-auto">{ustSol}</div>}

      {/* Sağ üst: taslak ve Haritaya işle */}
      <div className={`${kart} absolute right-3 top-16 sm:top-3 z-10 px-3 py-2 flex flex-wrap items-center gap-2 text-[12px] max-w-[calc(100%-1.5rem)]`}>
        <span>{degisiklikSayisi ? <>Taslak · <b className="text-[#D6484C] dark:text-[#F26B6F]">{degisiklikSayisi} değişiklik</b></> : 'Taslak boş'}</span>
        <span className="hidden sm:inline text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">{kayitYazisi[durum]}</span>
        <button type="button" onClick={geriAl} disabled={adim === 0} className={dugmeBos} title="Geri al (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={yinele} disabled={adim >= gecmis.length - 1} className={`${dugmeBos} hidden sm:flex`} title="Yinele (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></button>
        {isleOnay ? (
          <>
            <span className="text-[11px] font-semibold text-[#D6484C] dark:text-[#F26B6F]">Haritaya işlensin mi?</span>
            <button type="button" onClick={() => setIsleOnay(false)} className={dugmeBos}>Vazgeç</button>
            <button type="button" onClick={haritayaIsle} className="px-3 py-1.5 rounded-lg bg-[#F26B6F] text-white text-[11px] font-semibold cursor-pointer">Evet, işle</button>
          </>
        ) : (
          <button type="button" onClick={() => { setIsleRaporu(null); setIsleOnay(true); }} disabled={!islenmemis || isleniyor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F26B6F] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40">
            <MapPinned className="w-3.5 h-3.5" />{isleniyor ? 'İşleniyor…' : islenmemis ? 'Haritaya işle' : 'Haritada'}
          </button>
        )}
        {isleRaporu && <span className="basis-full text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">{isleRaporu}</span>}
      </div>

      {/* Yakınlaştırma */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1">
        <button type="button" onClick={() => yakinlas(1 / 1.5)} className={`${kart} w-9 h-9 flex items-center justify-center cursor-pointer`}><Plus className="w-4 h-4" /></button>
        <button type="button" onClick={() => yakinlas(1.5)} className={`${kart} w-9 h-9 flex items-center justify-center cursor-pointer`}><Minus className="w-4 h-4" /></button>
      </div>

      {/* İpucu */}
      {ipucu && (
        <div className="absolute left-1/2 -translate-x-1/2 top-16 z-10 max-w-[80%] px-3 py-1.5 rounded-full bg-[#0E1C4F]/85 text-[11px] text-[#F3EFE8] pointer-events-none text-center hidden sm:block">
          {ipucu}
        </div>
      )}
      {uyari && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-40 z-20 px-3 py-1.5 rounded-lg bg-[#F26B6F] text-[12px] text-white shadow pointer-events-none">
          {uyari}
        </div>
      )}

      {/* Sağ: seçili nesnenin kartı */}
      {seciliVar && (arac === 'sec' || arac === 'bagla') && (
        <div className={`${kart} absolute z-10 right-3 top-16 w-72 max-w-[calc(100%-1.5rem)] max-h-[calc(100%-13rem)] overflow-y-auto p-3 text-[12px]`}>
          <div className="flex items-start justify-between gap-2">
            <div className={etiket}>{seciliOzel ? 'Seçili · özel yapı' : seciliBina ? 'Seçili · yapı' : seciliYol ? 'Seçili · yol' : 'Seçili · doğa'}</div>
            <button type="button" onClick={() => setSecili(null)} className="p-0.5 cursor-pointer text-[#6A5E4C] dark:text-[#A6B0C9]"><X className="w-3.5 h-3.5" /></button>
          </div>

          {seciliOzel && (() => {
            const kl = kalipBul(seciliOzel.kalip);
            const ustYol = ustundekiYol(ozelKoseleri(seciliOzel));
            return (
              <>
                <div className="mt-1 text-[15px] font-bold">{maddeAdi(taslak.baglar[seciliOzel.id]) ?? kl?.ad ?? 'Özel yapı'}</div>
                <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{kl ? `Kalıp: ${kl.ad}` : 'Elle çizildi'} · taban {Math.round(alan(seciliOzel.m))} m²</div>
                {ustYol && (
                  <div className="mt-1.5 rounded-lg bg-[#F26B6F]/12 text-[#B83A3F] dark:text-[#F26B6F] text-[11px] px-2 py-1">
                    Yolun üstüne biniyor: {ustYol.ad}. Köşeleri sürükleyip yoldan çek.
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10">Kat</span>
                  <button type="button" className={dugmeBos} onClick={() => ozelDegistir(seciliOzel.id, o => ({ ...o, kat: Math.max(1, o.kat - 1) }))}><Minus className="w-3 h-3" /></button>
                  <b className="w-6 text-center tabular-nums">{seciliOzel.kat}</b>
                  <button type="button" className={dugmeBos} onClick={() => ozelDegistir(seciliOzel.id, o => ({ ...o, kat: Math.min(30, o.kat + 1) }))}><Plus className="w-3 h-3" /></button>
                  <span className="text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">≈ {Math.round(seciliOzel.kat * 3.2)} m</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-10">Çatı</span>
                  <button type="button" className={cip(seciliOzel.cati === 'duz')} onClick={() => ozelDegistir(seciliOzel.id, o => ({ ...o, cati: 'duz' }))}>Düz</button>
                  <button type="button" className={cip(seciliOzel.cati === 'besik')} onClick={() => ozelDegistir(seciliOzel.id, o => ({ ...o, cati: 'besik' }))}>Beşik</button>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" className={`${dugmeBos} flex-1`} onClick={() => ozelDondur(seciliOzel.id, -15)}><RotateCcw className="w-3.5 h-3.5" />Döndür</button>
                  <button type="button" className={`${dugmeBos} flex-1`} onClick={() => ozelDondur(seciliOzel.id, 15)}><RotateCw className="w-3.5 h-3.5" />Döndür</button>
                </div>
                <p className="mt-1.5 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">Köşeleri düzeltmek için beyaz noktaları sürükle.</p>
                {maddeBagi(seciliOzel.id)}
                <button type="button" onClick={() => { taslaktanSil(seciliOzel.id); setSecili(null); }}
                  className="mt-2 w-full py-1.5 rounded-lg border border-[#F26B6F] text-[#D6484C] dark:text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">Sil</button>
              </>
            );
          })()}

          {seciliBina && (
            <>
              <div className="mt-1 text-[15px] font-bold">{maddeAdi(taslak.baglar[seciliBina.id] ?? seciliBina.wikiId) ?? (seciliBina.tur ? binaBilgisi(seciliBina.tur).ad : seciliBina.ad)}</div>
              <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{seciliBina.yeni ? 'Kurucu\'da kondu' : 'Haritadan'}{seciliBina.kat ? ` · ${seciliBina.kat} kat` : ''}</div>
              {seciliBina.yeni && seciliBina.tur && (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {BINA_TURLERI.filter(b => b.elle).map(b => (
                      <button key={b.id} type="button" onClick={() => binaDegistir(seciliBina, x => ({ ...x, tur: b.id, en: b.en, boy: b.boy }))}
                        className={cip(seciliBina.tur === b.id)}>{b.ad}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button type="button" className={`${dugmeBos} flex-1`} onClick={() => binaDegistir(seciliBina, x => ({ ...x, aci: x.aci - Math.PI / 12 }))}><RotateCcw className="w-3.5 h-3.5" />Döndür</button>
                    <button type="button" className={`${dugmeBos} flex-1`} onClick={() => binaDegistir(seciliBina, x => ({ ...x, aci: x.aci + Math.PI / 12 }))}><RotateCw className="w-3.5 h-3.5" />Döndür</button>
                  </div>
                </>
              )}
              {maddeBagi(seciliBina.id, seciliBina.wikiId)}
              <button type="button" onClick={() => binaGizleGoster(seciliBina)}
                className="mt-2 w-full py-1.5 rounded-lg border border-[#F26B6F] text-[#D6484C] dark:text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">
                {seciliBina.gizli ? 'Geri getir' : 'Kaldır'}
              </button>
            </>
          )}

          {seciliYol && !seciliBina && !seciliOzel && (
            <>
              <div className="mt-1 text-[15px] font-bold">{seciliYol.ad}</div>
              <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{seciliYol.yeni ? 'Kurucu\'da çizildi' : `Haritadan · ${seciliYol.haritaTur}`} · {km(uzunluk(seciliYol.m.map(derceye)))}</div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {YOL_TURLERI.map(t => <button key={t.id} type="button" onClick={() => turDegistir(seciliYol, t.id)} className={cip(seciliYol.tur === t.id)}>{t.ad}</button>)}
              </div>
              {!seciliYol.gizli && (
                <div className="mt-2 flex gap-1">
                  <select value={dolguTur} onChange={e => setDolguTur(e.target.value as BinaTuru)}
                    className="flex-1 min-w-0 text-[11px] rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] bg-transparent px-1">
                    {BINA_TURLERI.filter(b => ['ev', 'dukkanli', 'yazlik', 'ciftlik'].includes(b.id)).map(b => <option key={b.id} value={b.id}>{b.ad}</option>)}
                  </select>
                  <button type="button" onClick={() => kenariDoldur(seciliYol, dolguTur)} className="px-2 py-1 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[11px] cursor-pointer">Kenarını doldur</button>
                </div>
              )}
              <button type="button" onClick={() => gizleGoster(seciliYol)}
                className="mt-2 w-full py-1.5 rounded-lg border border-[#F26B6F] text-[#D6484C] dark:text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">
                {seciliYol.gizli ? 'Geri getir' : 'Kaldır'}
              </button>
            </>
          )}

          {seciliDoga && !seciliOzel && !seciliBina && !seciliYol && (
            <>
              <div className="mt-1 text-[15px] font-bold">{DOGA_TURLERI.find(d => d.id === seciliDoga.tur)!.ad}</div>
              <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{Math.round(alan(seciliDoga.m)).toLocaleString('tr-TR')} m²</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {DOGA_TURLERI.map(d => (
                  <button key={d.id} type="button" className={cip(seciliDoga.tur === d.id)}
                    onClick={() => degistir(t => ({ ...t, doga: { ...t.doga, [seciliDoga.id]: { ...t.doga[seciliDoga.id], tur: d.id } } }))}>{d.ad}</button>
                ))}
              </div>
              <button type="button" onClick={() => { taslaktanSil(seciliDoga.id); setSecili(null); }}
                className="mt-2 w-full py-1.5 rounded-lg border border-[#F26B6F] text-[#D6484C] dark:text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">Sil</button>
            </>
          )}
        </div>
      )}

      {/* Alt: seçili aracın ayarları + araç çubuğu */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 flex flex-col items-center gap-2 w-[calc(100%-1.5rem)] max-w-max">
        {arac === 'ciz' && (
          <div className={`${kart} hidden lg:flex items-center gap-2 px-3 py-2`}>
            <span className={etiket}>Yol türü</span>
            {YOL_TURLERI.map(t => <button key={t.id} type="button" onClick={() => setCizTur(t.id)} className={cip(cizTur === t.id)} title={t.aciklama}>{t.ad}</button>)}
            <button type="button" onClick={() => bitir()} disabled={cizilen.length < 2} className={dugmeBos}><Check className="w-3.5 h-3.5" />Bitir</button>
            <button type="button" onClick={() => setCizilen([])} disabled={!cizilen.length} className={dugmeBos}><X className="w-3.5 h-3.5" />Vazgeç</button>
          </div>
        )}
        {arac === 'bina' && (
          <div className={`${kart} hidden lg:flex flex-wrap items-center gap-1.5 px-3 py-2 max-w-[900px]`}>
            <span className={etiket}>Bina</span>
            {BINA_TURLERI.filter(b => b.elle).map(b => <button key={b.id} type="button" onClick={() => setBinaTur(b.id)} className={cip(binaTur === b.id)}>{b.ad}</button>)}
          </div>
        )}
        {arac === 'sablon' && (
          <div className={`${kart} hidden lg:flex flex-wrap items-center gap-2 px-3 py-2 max-w-[900px]`}>
            <span className={etiket}>Şablon</span>
            {SABLONLAR.map(t => <button key={t.id} type="button" onClick={() => setSablonId(t.id)} className={cip(sablonId === t.id)} title={t.aciklama}>{t.ad}</button>)}
            <span className="text-[11px]">Yön</span>
            <input type="range" min={0} max={359} step={5} value={sablonAci} onChange={e => setSablonAci(Number(e.target.value))} />
            <span className="text-[11px]">Boyut</span>
            <input type="range" min={0.6} max={1.6} step={0.05} value={sablonOlcek} onChange={e => setSablonOlcek(Number(e.target.value))} />
          </div>
        )}
        {arac === 'ozel' && (
          <div className={`${kart} hidden lg:flex flex-wrap items-center gap-2 px-3 py-2 max-w-[1000px]`}>
            <span className={etiket}>Özel yapı</span>
            <button type="button" onClick={() => setKalipId(null)} className={cip(!kalipId)}>Köşe köşe çiz</button>
            {!kalipId && (
              <>
                <span className="text-[11px]">Kat</span>
                <button type="button" className={dugmeBos} onClick={() => setOzelKat(k => Math.max(1, k - 1))}><Minus className="w-3 h-3" /></button>
                <b className="text-[12px] tabular-nums">{ozelKat}</b>
                <button type="button" className={dugmeBos} onClick={() => setOzelKat(k => Math.min(30, k + 1))}><Plus className="w-3 h-3" /></button>
                <button type="button" className={cip(ozelCati === 'duz')} onClick={() => setOzelCati('duz')}>Düz çatı</button>
                <button type="button" className={cip(ozelCati === 'besik')} onClick={() => setOzelCati('besik')}>Beşik çatı</button>
                {cokgen.length >= 3 && <button type="button" onClick={() => cokgeniBitir()} className={dugmeBos}><Check className="w-3.5 h-3.5" />Kapat</button>}
              </>
            )}
            <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">ya da kalıp:</span>
            {ANIT_KALIPLARI.map(k => <button key={k.id} type="button" onClick={() => { setKalipId(k.id); setCokgen([]); }} className={cip(kalipId === k.id)} title={k.aciklama}>{k.ad}</button>)}
            {kalipId && (
              <>
                <span className="text-[11px]">Yön</span>
                <input type="range" min={0} max={359} step={5} value={kalipAci} onChange={e => setKalipAci(Number(e.target.value))} />
                <span className="text-[11px] font-mono w-9">{kalipAci}°</span>
              </>
            )}
          </div>
        )}
        {arac === 'doga' && (
          <div className={`${kart} hidden lg:flex items-center gap-2 px-3 py-2`}>
            <span className={etiket}>Doğa</span>
            {DOGA_TURLERI.map(d => <button key={d.id} type="button" onClick={() => setDogaTur(d.id)} className={cip(dogaTur === d.id)} title={d.aciklama}>{d.ad}</button>)}
            {cokgen.length >= 3 && <button type="button" onClick={() => cokgeniBitir()} className={dugmeBos}><Check className="w-3.5 h-3.5" />Kapat</button>}
          </div>
        )}

        <div className="flex items-stretch gap-1 p-1.5 rounded-2xl bg-[#0E1C4F]/95 border border-[#2C3C72] shadow-[0_10px_26px_-10px_rgba(0,0,0,0.6)] max-w-full overflow-x-auto">
          {ARACLAR.map(({ id, ad, Ikon, telefonda }) => (
            <button key={id} type="button" onClick={() => aracSec(id)}
              className={`${telefonda ? 'flex' : 'hidden lg:flex'} flex-col items-center justify-center gap-0.5 min-w-[64px] px-2 py-1.5 rounded-xl text-[10.5px] cursor-pointer ${arac === id ? 'bg-[#F26B6F] text-white' : 'text-[#C9D0E3] hover:bg-white/10'}`}>
              <Ikon className="w-[18px] h-[18px]" />
              {id === 'sec' ? <><span className="lg:hidden">Bilgi</span><span className="hidden lg:inline">{ad}</span></> : ad}
            </button>
          ))}
          <span className="w-px my-1.5 bg-[#2C3C72]" />
          <button type="button" onClick={geriAl} disabled={adim === 0} className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] px-2 py-1.5 rounded-xl text-[10.5px] text-[#C9D0E3] hover:bg-white/10 disabled:opacity-35 cursor-pointer">
            <Undo2 className="w-[18px] h-[18px]" />Geri al
          </button>
          <button type="button" onClick={() => setGizliGoster(g => !g)} className="hidden lg:flex flex-col items-center justify-center gap-0.5 min-w-[60px] px-2 py-1.5 rounded-xl text-[10.5px] text-[#C9D0E3] hover:bg-white/10 cursor-pointer" title="Kaldırılanları göster / gizle">
            {gizliGoster ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}Kaldırılan
          </button>
        </div>
      </div>

      {/* Ölçek */}
      <div className="absolute left-3 bottom-3 z-10 hidden lg:block px-2 py-1 rounded-lg bg-[#FAF8F5]/90 text-[10px] font-mono text-[#6A5E4C] pointer-events-none">
        {(() => {
          const hedef = 100 / olcek;
          const adimlar = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
          const m = adimlar.find(a => a >= hedef) ?? 5000;
          return <span className="flex items-center gap-1.5"><span className="inline-block h-1 bg-[#0E1C4F]" style={{ width: m * olcek }} />{km(m)}</span>;
        })()}
      </div>
    </div>
  );
}
