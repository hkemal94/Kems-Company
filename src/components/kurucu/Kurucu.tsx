import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hand, MousePointer2, PenLine, Redo2, Undo2, Check, X, Eye, EyeOff } from 'lucide-react';
import { DUZADA_GEO } from '../../data/duzadaGeo';
import { duzeniUygula, bosDuzen, type HaritaDuzeni } from '../harita/duzenKatmani';
import { catmullRom, type Nokta } from '../harita/sinirBolgeleri';
import { MAHALLE_TONU } from '../harita/haritaStili';
import type { KayitDurumu } from '../../lib/haritaDuzeni';
import {
  YOL_TURLERI, turBilgisi, bosTaslak, belgedenTaslak, taslaktanBelge, taslakBosMu,
  zeminCikar, yollariKur, yapistir, yeniYolId, derceye, uzunluk, karadaMi,
  type KurucuTaslak, type KurucuYol, type Yapisma, type YolTuru
} from './kurucuTipi';

/**
 * Kurucu — Düzada'nın şehir kurucusu (1. adım: yol aracı).
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
 * Geri al / yinele: düğmeler ya da Ctrl+Z / Ctrl+Y.
 */

type Arac = 'gez' | 'sec' | 'ciz';

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
      // yola noktadan bakılır
      const hedef = document.elementsFromPoint(e.clientX, e.clientY)
        .map(el => el.closest('[data-yol]')).find(Boolean);
      setSecili(hedef ? hedef.getAttribute('data-yol') : null);
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
      gizli: taslak.gizlenen.length
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
          arac === 'ciz' ? 'cursor-crosshair' : arac === 'gez' ? 'cursor-grab' : 'cursor-pointer'}`}
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

          {/* Binalar */}
          {zemin.binalar.map(bn => (
            <path key={bn.id} d={halkaYolu([bn.halka])} fill="#C2B193" stroke="#8E7C5E" strokeWidth={px(0.8)} />
          ))}

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
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['gez', 'Gez', Hand], ['sec', 'Seç', MousePointer2], ['ciz', 'Yol çiz', PenLine]
            ] as const).map(([id, ad, Ikon]) => (
              <button key={id} type="button" onClick={() => { setArac(id); setCizilen([]); if (id !== 'sec') setSecili(null); }}
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

        {arac === 'sec' && (
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
                <button type="button" onClick={() => gizleGoster(seciliYol)}
                  className="w-full py-1.5 rounded-md border border-[#F26B6F] text-[#F26B6F] text-[11px] cursor-pointer hover:bg-[#F26B6F]/10">
                  {seciliYol.gizli ? 'Taslağa geri getir' : 'Taslaktan kaldır'}
                </button>
                <p className="mt-1.5 text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
                  Kaldırılan yol silinmez; kesikli kırmızı görünür, geri getirilebilir.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bir yola dokun.</p>
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
              {ozet.gizli > 0 && <li><b>{ozet.gizli}</b> yol taslaktan kaldırıldı</li>}
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
