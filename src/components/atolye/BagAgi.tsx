import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, LocateFixed, Minus, Plus, RotateCcw, Save, X } from 'lucide-react';
import type { Item, ItemType } from '../../types';
import { BAG_TURLERI, type BagTuru } from '../../utils/relations';
import { TYPE_LABELS, schemaKeyFor, getKunyeFields } from '../wiki/wikiSchema';
import { TUR_RENGI, TUR_NOKTASI } from './turRenkleri';
import {
  agKur, bagEkle, diz, kenarAdi, yerlesimKaydi, yerlesimOku,
  type AgKenari, type KenarTuru, type Konum
} from '../../lib/bagAgi';

/**
 * Atölye → Bağ ağı (5. gece). Maddeler nokta, bağlar çizgi. Türe göre
 * renk; tür ve bağ süzgeci; bir maddeye basınca komşuları öne çıkar.
 * Noktalar sürüklenir; yerleşim "Yerleşimi kaydet"le `kkm_ayar`'a yazılır.
 * Ağdan bağ kurulur: seçili madde → "Bağ kur" → başka maddeye bas → tür → "Bağla"
 * (bağ ilk maddeye yazılır). Başka hiçbir şey kayda yazılmaz.
 */

interface Props {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onMaddeAc: (id: string) => void;
}

/** Süzgeç çipleri: kişi ve karakter tek çip */
const CIP_TURLERI: ItemType[] = ['yer', 'mekân', 'dükkân', 'kulüp', 'marka', 'kisi', 'aile', 'olay', 'ürün', 'oda'];
const turAnahtari = (t: ItemType): ItemType => (t === 'karakter' ? 'kisi' : t);

/** Bağ türü → çizgi biçimi */
const CIZGI: Record<KenarTuru, string> = {
  'bulunduğu yer': '', sahibi: '', 'çalışanı': '', 'üyesi': '', 'akrabası': '',
  'ait olduğu marka': '', 'ilgili olay': '6 4', 'tanıdığı kişi': '6 4', 'genel bağlantı': '2 4', 'künye': '1 3'
};
const KENAR_TURLERI: KenarTuru[] = [...BAG_TURLERI.map(b => b.id), 'künye'];

const CIP = (secili: boolean) => `inline-flex items-center gap-1.5 min-h-8 px-2.5 py-0.5 rounded-full text-[11px] border cursor-pointer ${secili
  ? 'border-[#0E1C4F] dark:border-[#A6B0C9] text-[#0E1C4F] dark:text-[#F3EFE8] bg-white dark:bg-[#13204A]'
  : 'border-[#CFC5B4]/70 dark:border-[#2C3C72] text-[#6A5E4C]/70 dark:text-[#A6B0C9]/60 line-through decoration-1'}`;
const DUGME = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] text-[#0E1C4F] dark:text-[#F3EFE8] hover:border-[#F26B6F] disabled:opacity-40';
const DOLU = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer bg-[#0E1C4F] dark:bg-[#2C3C72] text-white disabled:opacity-40';

export const BagAgi: React.FC<Props> = ({ items, onUpdateItem, onAddItem, onMaddeAc }) => {
  const ag = useMemo(() => agKur(items, i => schemaKeyFor(i.type),
    (i, id) => getKunyeFields(i).find(f => f.id === id)?.value || ''), [items]);
  const kayitli = useMemo(() => yerlesimOku(items), [items]);

  // Konumlar: kayıtlı yerleşim + kayıtta olmayanlar için dizme
  const [konumlar, setKonumlar] = useState<Map<string, Konum>>(() => diz(ag.dugumler, ag.kenarlar, kayitli));
  const [degisti, setDegisti] = useState(false);
  // Yeni madde gelirse (ya da kayıt değişirse) eksik konumlar dizilir; elle oynatılanlar korunur
  useEffect(() => {
    setKonumlar(eski => {
      if (ag.dugumler.every(d => eski.has(d.id))) return eski;
      const sabit = new Map<string, Konum>(eski);
      for (const [id, k] of kayitli) if (!sabit.has(id)) sabit.set(id, k);
      return diz(ag.dugumler, ag.kenarlar, sabit);
    });
  }, [ag, kayitli]);

  const [turler, setTurler] = useState<Set<ItemType>>(() => new Set(CIP_TURLERI.filter(t => t !== 'oda')));
  const [bagTurleri, setBagTurleri] = useState<Set<KenarTuru>>(() => new Set(KENAR_TURLERI));
  const [secili, setSecili] = useState<string | null>(null);
  const [ara, setAra] = useState('');
  // Bağ kurma: seçili maddeden başka bir maddeye
  const [bagModu, setBagModu] = useState(false);
  const [hedef, setHedef] = useState<string | null>(null);
  const [yeniTur, setYeniTur] = useState<BagTuru>('genel bağlantı');
  const [yaziliyor, setYaziliyor] = useState(false);
  const [mesaj, setMesaj] = useState('');

  const gorunenDugumler = useMemo(() => ag.dugumler.filter(d => turler.has(turAnahtari(d.tur))), [ag, turler]);
  const gorunenIdler = useMemo(() => new Set(gorunenDugumler.map(d => d.id)), [gorunenDugumler]);
  const gorunenKenarlar = useMemo(() => ag.kenarlar.filter(e => bagTurleri.has(e.tur) && gorunenIdler.has(e.a) && gorunenIdler.has(e.b)), [ag, bagTurleri, gorunenIdler]);
  const komsular = useMemo(() => {
    if (!secili) return null;
    const s = new Set([secili]);
    for (const e of gorunenKenarlar) { if (e.a === secili) s.add(e.b); if (e.b === secili) s.add(e.a); }
    return s;
  }, [secili, gorunenKenarlar]);
  const seciliBaglar = useMemo(() => (secili ? ag.kenarlar.filter(e => e.a === secili || e.b === secili) : []), [secili, ag]);
  const adi = (id: string) => ag.dugumler.find(d => d.id === id)?.ad || '';
  const baglantiSayisi = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of gorunenKenarlar) { m.set(e.a, (m.get(e.a) || 0) + 1); m.set(e.b, (m.get(e.b) || 0) + 1); }
    return m;
  }, [gorunenKenarlar]);

  // ---- Bakış: kaydırma ve yakınlaştırma (yalnız ekranda; kayda yazılmaz)
  const svgRef = useRef<SVGSVGElement>(null);
  const [bakis, setBakis] = useState({ x: 0, y: 0, olcek: 1 });
  const sigdir = () => {
    const el = svgRef.current;
    const ks = gorunenDugumler.map(d => konumlar.get(d.id)).filter(Boolean) as Konum[];
    if (!el || !ks.length) return;
    const minX = Math.min(...ks.map(k => k.x)) - 60, maxX = Math.max(...ks.map(k => k.x)) + 60;
    const minY = Math.min(...ks.map(k => k.y)) - 40, maxY = Math.max(...ks.map(k => k.y)) + 40;
    const { width, height } = el.getBoundingClientRect();
    const olcek = Math.min(2, width / (maxX - minX), height / (maxY - minY));
    setBakis({ olcek, x: width / 2 - ((minX + maxX) / 2) * olcek, y: height / 2 - ((minY + maxY) / 2) * olcek });
  };
  // İlk açılışta bütün ağ ekrana sığsın
  const sigdi = useRef(false);
  useEffect(() => { if (!sigdi.current && konumlar.size) { sigdi.current = true; sigdir(); } }, [konumlar]);
  const yakinlas = (oran: number, cx?: number, cy?: number) => setBakis(b => {
    const el = svgRef.current?.getBoundingClientRect();
    const px = cx ?? (el ? el.width / 2 : 0), py = cy ?? (el ? el.height / 2 : 0);
    const olcek = Math.max(0.2, Math.min(4, b.olcek * oran));
    const o = olcek / b.olcek;
    return { olcek, x: px - (px - b.x) * o, y: py - (py - b.y) * o };
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const tekerlek = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      yakinlas(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', tekerlek, { passive: false });
    return () => el.removeEventListener('wheel', tekerlek);
  }, []);

  // ---- Sürükleme: noktaya basılıysa nokta, boşluğa basılıysa bakış kayar
  const surukle = useRef<{ tur: 'dugum' | 'bakis'; id?: string; sx: number; sy: number; ox: number; oy: number; oynadi: boolean } | null>(null);
  const basla = (e: React.PointerEvent, id?: string) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const k = id ? konumlar.get(id) : null;
    surukle.current = id && k
      ? { tur: 'dugum', id, sx: e.clientX, sy: e.clientY, ox: k.x, oy: k.y, oynadi: false }
      : { tur: 'bakis', sx: e.clientX, sy: e.clientY, ox: bakis.x, oy: bakis.y, oynadi: false };
  };
  const hareket = (e: React.PointerEvent) => {
    const s = surukle.current;
    if (!s) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) s.oynadi = true;
    if (!s.oynadi) return;
    if (s.tur === 'dugum' && s.id) {
      const id = s.id;
      setKonumlar(m => new Map(m).set(id, { x: s.ox + dx / bakis.olcek, y: s.oy + dy / bakis.olcek }));
      setDegisti(true);
    } else setBakis(b => ({ ...b, x: s.ox + dx, y: s.oy + dy }));
  };
  const birak = () => {
    const s = surukle.current;
    surukle.current = null;
    if (!s || s.oynadi) return;
    // Tıklama
    if (s.tur === 'dugum' && s.id) dugumeBas(s.id);
    else if (!bagModu) setSecili(null);
  };
  const dugumeBas = (id: string) => {
    setMesaj('');
    if (bagModu && secili && id !== secili) { setHedef(id); return; }
    setSecili(id); setBagModu(false); setHedef(null);
  };

  // ---- Kayıt (yalnız düğmeyle)
  const yerlesimiKaydet = async () => {
    setYaziliyor(true); setMesaj('');
    try {
      const k = yerlesimKaydi(items, konumlar);
      if (k.guncel) await onUpdateItem(k.guncel); else if (k.yeni) await onAddItem(k.yeni);
      setDegisti(false); setMesaj('Yerleşim kaydedildi.');
    } catch { setMesaj('Yerleşim kaydedilemedi; yeniden dene.'); }
    finally { setYaziliyor(false); }
  };
  const bagla = async () => {
    if (!secili || !hedef) return;
    const kaynak = items.find(i => i.id === secili);
    if (!kaynak) return;
    const yeni = bagEkle(kaynak, hedef, yeniTur);
    if (!yeni) { setMesaj('Bu bağ zaten var.'); return; }
    setYaziliyor(true); setMesaj('');
    try { await onUpdateItem(yeni); setBagModu(false); setHedef(null); setMesaj('Bağ kuruldu.'); }
    catch { setMesaj('Bağ kaydedilemedi; yeniden dene.'); }
    finally { setYaziliyor(false); }
  };
  const yenidenDiz = () => { setKonumlar(diz(ag.dugumler, ag.kenarlar)); setDegisti(true); setTimeout(sigdir, 0); };

  // Arama: yazılan ada ilk uyan madde seçilir ve ortaya alınır
  const bul = (q: string) => {
    setAra(q);
    const k = q.trim().toLocaleLowerCase('tr');
    if (!k) return;
    const d = gorunenDugumler.find(x => x.ad.toLocaleLowerCase('tr').includes(k));
    const p = d && konumlar.get(d.id);
    const el = svgRef.current?.getBoundingClientRect();
    if (!d || !p || !el) return;
    setSecili(d.id); setBagModu(false); setHedef(null);
    setBakis(b => ({ ...b, x: el.width / 2 - p.x * b.olcek, y: el.height / 2 - p.y * b.olcek }));
  };

  const soluk = (id: string) => !!komsular && !komsular.has(id) && id !== hedef;
  const kenarSoluk = (e: AgKenari) => !!secili && e.a !== secili && e.b !== secili;
  const seciliMadde = secili ? ag.dugumler.find(d => d.id === secili) : null;

  return (
    <div className="space-y-3">
      {/* Süzgeçler */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CIP_TURLERI.filter(t => ag.dugumler.some(d => turAnahtari(d.tur) === t)).map(t => (
          <button key={t} type="button" aria-pressed={turler.has(t)} className={CIP(turler.has(t))}
            onClick={() => setTurler(s => { const y = new Set(s); if (y.has(t)) y.delete(t); else y.add(t); return y; })}>
            <span className={`w-2.5 h-2.5 rounded-full ${TUR_NOKTASI[t]}`} />{TYPE_LABELS[t] || t}
          </button>
        ))}
        <input value={ara} onChange={e => bul(e.target.value)} placeholder="Ağda madde bul…" aria-label="Ağda madde bul"
          className="ml-auto w-full sm:w-56 text-[12px] bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#F26B6F]" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {KENAR_TURLERI.filter(t => ag.kenarlar.some(e => e.tur === t)).map(t => (
          <button key={t} type="button" aria-pressed={bagTurleri.has(t)} className={CIP(bagTurleri.has(t))}
            onClick={() => setBagTurleri(s => { const y = new Set(s); if (y.has(t)) y.delete(t); else y.add(t); return y; })}>
            <svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" className="stroke-current" strokeWidth="1.6" strokeDasharray={CIZGI[t]} /></svg>
            {kenarAdi({ tur: t })}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#0E1733]">
        <svg ref={svgRef} role="img" aria-label={`Bağ ağı: ${gorunenDugumler.length} madde, ${gorunenKenarlar.length} bağ`}
          className={`block w-full h-[calc(100dvh-20rem)] min-h-[420px] touch-none select-none ${bagModu ? 'cursor-crosshair' : 'cursor-grab'}`}
          onPointerDown={e => basla(e)} onPointerMove={hareket} onPointerUp={birak} onPointerCancel={() => { surukle.current = null; }}>
          <g transform={`translate(${bakis.x} ${bakis.y}) scale(${bakis.olcek})`}>
            {gorunenKenarlar.map(e => {
              const a = konumlar.get(e.a), b = konumlar.get(e.b);
              if (!a || !b) return null;
              const vurgu = secili && !kenarSoluk(e);
              return (
                <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  className={vurgu ? 'stroke-[#F26B6F]' : 'stroke-[#6A5E4C] dark:stroke-[#A6B0C9]'}
                  strokeOpacity={kenarSoluk(e) ? 0.08 : vurgu ? 0.9 : 0.35} strokeWidth={(vurgu ? 1.8 : 1.1) / Math.sqrt(bakis.olcek)}
                  strokeDasharray={e.oneri ? '3 3' : CIZGI[e.tur]}>
                  <title>{`${adi(e.a)} — ${adi(e.b)} · ${kenarAdi(e)}${e.oneri ? ' (öneri)' : ''}`}</title>
                </line>
              );
            })}
            {secili && hedef && (() => {
              const a = konumlar.get(secili), b = konumlar.get(hedef);
              return a && b ? <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-[#F26B6F]" strokeWidth={2.2 / Math.sqrt(bakis.olcek)} strokeDasharray="5 4" /> : null;
            })()}
            {gorunenDugumler.map(d => {
              const p = konumlar.get(d.id);
              if (!p) return null;
              const r = 5 + Math.min(9, Math.sqrt(baglantiSayisi.get(d.id) || 0) * 2.2);
              const isaretli = d.id === secili || d.id === hedef;
              return (
                <g key={d.id} transform={`translate(${p.x} ${p.y})`} opacity={soluk(d.id) ? 0.18 : 1}
                  onPointerDown={e => basla(e, d.id)} className="cursor-pointer">
                  {isaretli && <circle r={r + 5} className="fill-none stroke-[#F26B6F]" strokeWidth={2} />}
                  <circle r={r} className={`${TUR_RENGI[d.tur] || 'fill-[#6A5E4C]'} stroke-[#FAF8F5] dark:stroke-[#0E1733]`} strokeWidth={1.5} />
                  <text y={r + 12} textAnchor="middle" fontSize={11 / Math.sqrt(bakis.olcek)}
                    className={`fill-[#0E1C4F] dark:fill-[#F3EFE8] stroke-[#FAF8F5] dark:stroke-[#0E1733] ${isaretli ? 'font-bold' : ''}`}
                    style={{ paintOrder: 'stroke', strokeWidth: 3, strokeLinejoin: 'round' }}>
                    {d.ad}
                  </text>
                  <title>{`${d.ad} · ${TYPE_LABELS[d.tur] || d.tur} · ${baglantiSayisi.get(d.id) || 0} bağ`}</title>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Bakış düğmeleri */}
        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <button type="button" onClick={() => yakinlas(1.25)} aria-label="Yakınlaştır" className={DUGME}><Plus className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => yakinlas(0.8)} aria-label="Uzaklaştır" className={DUGME}><Minus className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={sigdir} aria-label="Ağı sığdır" title="Ağı sığdır" className={DUGME}><LocateFixed className="w-3.5 h-3.5" /></button>
        </div>

        {/* Alt şerit: sayı, yerleşim */}
        <div className="absolute left-3 bottom-3 right-3 flex flex-wrap items-center gap-2 pointer-events-none">
          <span className="pointer-events-auto text-[11px] font-mono px-2 py-1 rounded-md bg-[#FAF8F5]/90 dark:bg-[#13204A]/90 text-[#6A5E4C] dark:text-[#A6B0C9]">
            {gorunenDugumler.length} madde · {gorunenKenarlar.length} bağ
          </span>
          <span className="flex-1" />
          <button type="button" onClick={yenidenDiz} className={`${DUGME} pointer-events-auto`} title="Ağı baştan diz (kaydetmeden önce kayda yazılmaz)">
            <RotateCcw className="w-3.5 h-3.5" /> Yeniden diz
          </button>
          <button type="button" onClick={() => void yerlesimiKaydet()} disabled={!degisti || yaziliyor} className={`${DOLU} pointer-events-auto`}>
            <Save className="w-3.5 h-3.5" /> Yerleşimi kaydet
          </button>
        </div>

        {/* Seçili madde kartı */}
        {seciliMadde && (
          <div className="absolute left-3 top-3 w-[min(20rem,calc(100%-4.5rem))] max-h-[calc(100%-5rem)] overflow-y-auto rounded-xl bg-[#FAF8F5]/97 dark:bg-[#13204A]/97 border border-[#CFC5B4] dark:border-[#2C3C72] shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)] p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${TUR_NOKTASI[turAnahtari(seciliMadde.tur)]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold leading-snug">{seciliMadde.ad}</div>
                <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{TYPE_LABELS[seciliMadde.tur] || seciliMadde.tur} · {seciliBaglar.length} bağ</div>
              </div>
              <button type="button" onClick={() => { setSecili(null); setBagModu(false); setHedef(null); }} aria-label="Kapat" className="p-1 text-[#6A5E4C] dark:text-[#A6B0C9]"><X className="w-4 h-4" /></button>
            </div>
            {seciliBaglar.length > 0 && (
              <ul className="space-y-1 text-[12px]">
                {seciliBaglar.map(e => {
                  const o = e.a === secili ? e.b : e.a;
                  return (
                    <li key={e.id} className="flex items-baseline gap-1.5">
                      <button type="button" onClick={() => dugumeBas(o)} className="text-left underline decoration-[#0E1C4F]/30 dark:decoration-[#A6B0C9]/40 underline-offset-2 hover:decoration-[#F26B6F]">{adi(o)}</button>
                      <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">· {kenarAdi(e)}{e.oneri ? ' (öneri)' : ''}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {!bagModu ? (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => onMaddeAc(seciliMadde.id)} className={DOLU}>Maddeyi aç</button>
                <button type="button" onClick={() => { setBagModu(true); setHedef(null); setMesaj(''); }} className={DUGME}><Link2 className="w-3.5 h-3.5" /> Bağ kur</button>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-dashed border-[#F26B6F]/60 p-2">
                <p className="text-[12px]">{hedef ? <>Bağ: <b>{seciliMadde.ad}</b> → <b>{adi(hedef)}</b></> : 'Ağda bağlanacak maddeye bas ya da listeden seç.'}</p>
                <select value={hedef || ''} onChange={e => setHedef(e.target.value || null)} aria-label="Bağlanacak madde"
                  className="w-full text-[12px] bg-white dark:bg-[#0E1733] border border-[#CFC5B4] dark:border-[#2C3C72] rounded px-2 py-1.5">
                  <option value="">Madde seç…</option>
                  {ag.dugumler.filter(d => d.id !== secili).map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
                <select value={yeniTur} onChange={e => setYeniTur(e.target.value as BagTuru)} aria-label="Bağ türü"
                  className="w-full text-[12px] bg-white dark:bg-[#0E1733] border border-[#CFC5B4] dark:border-[#2C3C72] rounded px-2 py-1.5">
                  {BAG_TURLERI.map(b => <option key={b.id} value={b.id}>{b.ad}</option>)}
                </select>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => void bagla()} disabled={!hedef || yaziliyor} className={DOLU}>Bağla</button>
                  <button type="button" onClick={() => { setBagModu(false); setHedef(null); }} className={DUGME}>Vazgeç</button>
                </div>
                <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bağ "{seciliMadde.ad}" maddesine yazılır; düzenleyicide de görünür.</p>
              </div>
            )}
            {mesaj && <p className="text-[12px] text-[#F26B6F]" role="status">{mesaj}</p>}
          </div>
        )}
        {!seciliMadde && mesaj && (
          <p role="status" className="absolute left-3 top-3 text-[12px] px-2 py-1 rounded-md bg-[#FAF8F5]/95 dark:bg-[#13204A]/95 text-[#F26B6F]">{mesaj}</p>
        )}
      </div>
      <p className="text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-relaxed">
        Noktayı sürükle, boşluğu sürükleyerek gez, tekerlekle yakınlaştır. Nokta ne kadar büyükse o kadar çok bağı var.
        Çizgiler: düz = düzenleyicideki bağ ve üst madde, kesik = olay ve tanıdık, noktalı = künyedeki bağ alanı.
        Yerleşim yalnız "Yerleşimi kaydet"e basınca kayda yazılır.
      </p>
    </div>
  );
};

export default BagAgi;
