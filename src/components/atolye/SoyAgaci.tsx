import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { Item } from '../../types';
import { schemaKeyFor, getKunyeFields } from '../wiki/wikiSchema';
import { donemleriOku } from '../../lib/zamanCizgisi';
import {
  KUTU_BOY, KUTU_EN, YAN_GRUPLAR, diz, soyVerisi, suz, yilSiniri,
  type SoyBagi, type SoyBagTuru, type YanBag
} from '../../lib/soyAgaci';

/**
 * Atölye → Soy ağacı (6. gece). Kişiler kutu; ebeveyni bağıyla kuşaklar
 * yukarıdan aşağıya, eşler yan yana çift çizgiyle, çocuklar ebeveynlerin
 * altında. İş, arkadaşlık, rekabet yanda renkli eğri. Üstte aile, yan bağ
 * ve yıl / dönem süzgeci. Bağlar madde düzenleyicisinden (ya da bağ
 * ağından) kurulur; bu ekran kayda bir şey yazmaz.
 */

interface Props {
  items: Item[];
  onMaddeAc: (id: string) => void;
  /** Aile sayfasından "Soy ağacında aç" ile gelindiyse o aile */
  ilkAile?: string | null;
}

const BAG_ADI: Record<SoyBagTuru, string> = {
  ebeveyni: 'Ebeveyni', 'eşi': 'Eşi', 'kardeşi': 'Kardeşi', 'akrabası': 'Akrabası',
  patronu: 'Patronu', 'iş ortağı': 'İş ortağı', 'arkadaşı': 'Arkadaşı', rakibi: 'Rakibi', 'tanıdığı kişi': 'Tanıdığı'
};
/** Yan bağ renkleri: iş hardal, arkadaşlık yeşil, rekabet kiremit, tanıdık gri */
const YAN_RENGI: Record<YanBag, string> = {
  patronu: 'stroke-[#C99A2E]', 'iş ortağı': 'stroke-[#C99A2E]', 'arkadaşı': 'stroke-[#2F7D6D] dark:stroke-[#5FB3A0]',
  rakibi: 'stroke-[#F26B6F]', 'tanıdığı kişi': 'stroke-[#8C7B63] dark:stroke-[#A6B0C9]'
};
const CIP_NOKTASI: Record<string, string> = { is: 'bg-[#C99A2E]', arkadaslik: 'bg-[#2F7D6D]', rekabet: 'bg-[#F26B6F]', tanidik: 'bg-[#8C7B63]' };
/** Aile şeridi renkleri (sırayla) */
const AILE_RENGI = ['fill-[#0E1C4F] dark:fill-[#8FA3D9]', 'fill-[#F26B6F]', 'fill-[#C99A2E]', 'fill-[#2F7D6D]', 'fill-[#8A5A9E]', 'fill-[#3E7CB1]'];

const IKINCIL = 'text-[#6A5E4C] dark:text-[#A6B0C9]';
const KART = 'rounded-2xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#0E1733]';
const GIRDI = 'text-[12px] bg-white dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#F26B6F]';
const CIP = (secili: boolean) => `inline-flex items-center gap-1.5 min-h-8 px-2.5 py-0.5 rounded-full text-[11px] border cursor-pointer ${secili
  ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white border-transparent'
  : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#F26B6F]'}`;
const yilMetni = (b: { bas?: number; bit?: number }) => (b.bas === undefined ? '' : `${b.bas}–${b.bit ?? ''}`);

export const SoyAgaci: React.FC<Props> = ({ items, onMaddeAc, ilkAile = null }) => {
  const veri = useMemo(() => soyVerisi(items, (i, id) => {
    const anahtar = schemaKeyFor(i.type);
    return anahtar ? getKunyeFields(i).find(f => f.id === id)?.value || '' : '';
  }), [items]);
  const donemler = useMemo(() => donemleriOku(items), [items]);

  const [aileId, setAileId] = useState<string | null>(ilkAile);
  useEffect(() => { if (ilkAile) setAileId(ilkAile); }, [ilkAile]);
  const [yanGruplar, setYanGruplar] = useState<Set<string>>(() => new Set(['is', 'arkadaslik', 'rekabet']));
  const yanlar = useMemo(() => new Set(YAN_GRUPLAR.filter(g => yanGruplar.has(g.id)).flatMap(g => g.turler)), [yanGruplar]);
  const [aralik, setAralik] = useState<[number, number] | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [olcek, setOlcek] = useState(1);

  const sinir = useMemo(() => {
    const s = yilSiniri(veri);
    const ys = [...(s || []), ...donemler.flatMap(d => [d.bas, d.bit ?? d.bas])];
    return ys.length ? [Math.min(...ys), Math.max(...ys)] as [number, number] : null;
  }, [veri, donemler]);

  const gorunen = useMemo(() => suz(veri, { aralik, aileId, yanlar }), [veri, aralik, aileId, yanlar]);
  const konum = useMemo(() => diz(gorunen.kisiler, gorunen.baglar), [gorunen]);
  const kisi = useMemo(() => new Map(veri.kisiler.map(k => [k.id, k])), [veri]);
  const aileSirasi = useMemo(() => new Map(veri.aileler.map((a, n) => [a.id, n])), [veri]);

  const xs = [...konum.values()].map(p => p.x), ys = [...konum.values()].map(p => p.y);
  const pay = 40;
  const minX = xs.length ? Math.min(...xs) - pay : 0, minY = ys.length ? Math.min(...ys) - pay : 0;
  const en = xs.length ? Math.max(...xs) + KUTU_EN + pay - minX : 400;
  const boy = ys.length ? Math.max(...ys) + KUTU_BOY + pay - minY : 200;

  const merkez = (id: string) => { const p = konum.get(id)!; return { x: p.x + KUTU_EN / 2, y: p.y + KUTU_BOY / 2 }; };
  const aileBaglari = gorunen.baglar.filter(b => b.tur === 'ebeveyni' || b.tur === 'eşi' || b.tur === 'kardeşi' || b.tur === 'akrabası');
  const esler = new Set(gorunen.baglar.filter(b => b.tur === 'eşi').map(b => [b.a, b.b].sort().join('|')));
  // Çocuk → görünen ebeveynleri
  const ebeveynleri = new Map<string, string[]>();
  for (const b of aileBaglari) if (b.tur === 'ebeveyni') ebeveynleri.set(b.a, [...(ebeveynleri.get(b.a) || []), b.b]);
  const seciliBaglar = secili ? veri.baglar.filter(b => b.a === secili || b.b === secili) : [];
  const vurgu = (b: SoyBagi) => !!secili && (b.a === secili || b.b === secili);

  /** Ebeveynden çocuğa dik açılı çizgi; iki eş ebeveynde eşlerin ortasından iner */
  const cocukYolu = (cocuk: string, ps: string[]) => {
    const c = konum.get(cocuk)!;
    const cx = c.x + KUTU_EN / 2;
    let ax: number, ay: number;
    const iki = ps.length === 2 && esler.has([...ps].sort().join('|'));
    if (iki) {
      const a = merkez(ps[0]), b = merkez(ps[1]);
      ax = (a.x + b.x) / 2; ay = a.y;
    } else {
      const p = konum.get(ps[0])!;
      ax = p.x + KUTU_EN / 2; ay = p.y + KUTU_BOY;
    }
    const orta = c.y - 30;
    return `M${ax},${ay} V${orta} H${cx} V${c.y}`;
  };

  if (!veri.kisiler.length) {
    return (
      <div className={`${KART} p-6 space-y-2 max-w-2xl`}>
        <p className="text-[15px] font-semibold">Henüz kişi maddesi yok.</p>
        <p className={`text-[13px] ${IKINCIL} leading-relaxed`}>
          Vikide kişi maddeleri aç; düzenleyicide "Ebeveyni", "Eşi", "Kardeşi" bağlarını kur. Ağaç bağlardan kendiliğinden çizilir.
          Bağa yıl yazarsan ("1950–1975") ağacı yıla ya da döneme göre süzebilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Süzgeçler */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={aileId ?? ''} onChange={e => { setAileId(e.target.value || null); setSecili(null); }} aria-label="Aile" className={GIRDI}>
          <option value="">Bütün aileler</option>
          {veri.aileler.map(a => <option key={a.id} value={a.id}>{a.ad}</option>)}
        </select>
        {YAN_GRUPLAR.map(g => (
          <button key={g.id} type="button" aria-pressed={yanGruplar.has(g.id)} className={CIP(yanGruplar.has(g.id))}
            onClick={() => setYanGruplar(s => { const y = new Set(s); if (y.has(g.id)) y.delete(g.id); else y.add(g.id); return y; })}>
            <span className={`w-2 h-2 rounded-full ${CIP_NOKTASI[g.id]}`} />{g.ad}
          </button>
        ))}
        <span className="ml-auto inline-flex items-center gap-1">
          <button type="button" onClick={() => setOlcek(o => Math.max(0.4, o / 1.2))} aria-label="Uzaklaştır" className={`${GIRDI} !px-2`}><Minus className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setOlcek(o => Math.min(2, o * 1.2))} aria-label="Yakınlaştır" className={`${GIRDI} !px-2`}><Plus className="w-3.5 h-3.5" /></button>
        </span>
      </div>

      {/* Yıl ve dönem */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAralik(null)} className={CIP(aralik === null)}>Bütün zamanlar</button>
        {donemler.map(d => {
          const r: [number, number] = [d.bas, d.bit ?? (sinir ? sinir[1] : d.bas)];
          const sec = !!aralik && aralik[0] === r[0] && aralik[1] === r[1];
          return <button key={d.id} type="button" onClick={() => setAralik(r)} className={CIP(sec)}>{d.ad}</button>;
        })}
        {sinir && sinir[1] > sinir[0] && (
          <label className={`inline-flex items-center gap-2 text-[12px] ${IKINCIL}`}>
            Yıl
            <input type="range" min={sinir[0]} max={sinir[1]} value={aralik ? aralik[0] : sinir[0]}
              onChange={e => { const y = Number(e.target.value); setAralik([y, y]); }} className="w-40 accent-[#F26B6F]" aria-label="Yıl" />
            <span className="font-mono tabular-nums text-[#0E1C4F] dark:text-[#F3EFE8] w-20">
              {aralik ? (aralik[0] === aralik[1] ? aralik[0] : `${aralik[0]}–${aralik[1]}`) : '—'}
            </span>
          </label>
        )}
      </div>

      <div className="relative">
        <div className={`${KART} overflow-auto max-h-[calc(100dvh-20rem)] min-h-[360px]`}>
          <svg width={en * olcek} height={boy * olcek} viewBox={`${minX} ${minY} ${en} ${boy}`} role="img"
            aria-label={`Soy ağacı: ${gorunen.kisiler.length} kişi`} className="block" onClick={() => setSecili(null)}>
            {/* Yan bağlar (iş, arkadaşlık, rekabet): kutuların arkasında eğri */}
            {gorunen.baglar.filter(b => yanlar.has(b.tur as YanBag)).map((b, _, liste) => {
              const a = merkez(b.a), c = merkez(b.b);
              // Aynı iki kişi arasındaki ikinci, üçüncü bağ biraz daha yukarıdan geçer
              const cift = [b.a, b.b].sort().join('|');
              const sira = liste.filter(x => [x.a, x.b].sort().join('|') === cift).indexOf(b);
              const mx = (a.x + c.x) / 2, my = Math.min(a.y, c.y) - 60 - Math.abs(a.x - c.x) * 0.08 - sira * 28;
              return (
                <path key={b.id} d={`M${a.x},${a.y} Q${mx},${my} ${c.x},${c.y}`} fill="none" className={YAN_RENGI[b.tur as YanBag]}
                  strokeWidth={vurgu(b) ? 2.6 : 1.6} strokeDasharray={b.tur === 'rakibi' ? '7 5' : b.tur === 'arkadaşı' ? '2 4' : undefined}
                  opacity={secili && !vurgu(b) ? 0.2 : 0.9} strokeLinecap="round">
                  <title>{`${kisi.get(b.a)?.ad} — ${kisi.get(b.b)?.ad} · ${BAG_ADI[b.tur]}${yilMetni(b) ? ` · ${yilMetni(b)}` : ''}`}</title>
                </path>
              );
            })}
            {/* Akrabalık ve ortak ebeveyni olmayan kardeşler: noktalı */}
            {aileBaglari.filter(b => b.tur === 'akrabası' || b.tur === 'kardeşi').map(b => {
              const ortak = (ebeveynleri.get(b.a) || []).some(p => (ebeveynleri.get(b.b) || []).includes(p));
              if (b.tur === 'kardeşi' && ortak) return null;
              const a = konum.get(b.a)!, c = konum.get(b.b)!;
              const ax = a.x + KUTU_EN / 2, cx = c.x + KUTU_EN / 2, ust = Math.min(a.y, c.y) - 14;
              return <path key={b.id} d={`M${ax},${a.y} V${ust} H${cx} V${c.y}`} fill="none"
                className="stroke-[#8C7B63] dark:stroke-[#A6B0C9]" strokeWidth={1.3} strokeDasharray="2 3" opacity={secili && !vurgu(b) ? 0.2 : 0.9} />;
            })}
            {/* Ebeveyn → çocuk */}
            {[...ebeveynleri.entries()].map(([c, ps]) => (
              <path key={`c-${c}`} d={cocukYolu(c, ps)} fill="none" className="stroke-[#0E1C4F] dark:stroke-[#A6B0C9]"
                strokeWidth={secili && (secili === c || ps.includes(secili)) ? 2.4 : 1.5} opacity={secili && secili !== c && !ps.includes(secili) ? 0.25 : 0.85} />
            ))}
            {/* Eşler: çift çizgi */}
            {aileBaglari.filter(b => b.tur === 'eşi').map(b => {
              const [sol, sag] = [konum.get(b.a)!, konum.get(b.b)!].sort((p, q) => p.x - q.x);
              const y = sol.y + KUTU_BOY / 2;
              return (
                <g key={b.id} className="stroke-[#0E1C4F] dark:stroke-[#A6B0C9]" opacity={secili && !vurgu(b) ? 0.25 : 0.9}>
                  <line x1={sol.x + KUTU_EN} y1={y - 2} x2={sag.x} y2={y - 2} strokeWidth={1.4} />
                  <line x1={sol.x + KUTU_EN} y1={y + 2} x2={sag.x} y2={y + 2} strokeWidth={1.4} />
                  <title>{`Eşi${yilMetni(b) ? ` · ${yilMetni(b)}` : ''}`}</title>
                </g>
              );
            })}
            {/* Kişiler */}
            {gorunen.kisiler.map(k => {
              const p = konum.get(k.id)!;
              const sec = k.id === secili;
              const soluk = !!secili && !sec && !seciliBaglar.some(b => b.a === k.id || b.b === k.id);
              const n = k.aileId ? aileSirasi.get(k.aileId) : undefined;
              return (
                <g key={k.id} transform={`translate(${p.x} ${p.y})`} opacity={soluk ? 0.35 : 1} className="cursor-pointer"
                  onClick={e => { e.stopPropagation(); setSecili(k.id === secili ? null : k.id); }}>
                  <rect width={KUTU_EN} height={KUTU_BOY} rx={10} className={`fill-white dark:fill-[#13204A] ${sec ? 'stroke-[#F26B6F]' : 'stroke-[#CFC5B4] dark:stroke-[#2C3C72]'}`} strokeWidth={sec ? 2.2 : 1} />
                  {n !== undefined && <rect x={0} y={8} width={4} height={KUTU_BOY - 16} rx={2} className={AILE_RENGI[n % AILE_RENGI.length]} />}
                  <text x={14} y={k.yasamMetni ? 21 : 29} fontSize={13} fontWeight={600} className="fill-[#0E1C4F] dark:fill-[#F3EFE8]">
                    {k.ad.length > 20 ? k.ad.slice(0, 19) + '…' : k.ad}
                  </text>
                  {k.yasamMetni && <text x={14} y={37} fontSize={10.5} className="fill-[#6A5E4C] dark:fill-[#A6B0C9]">{k.yasamMetni}</text>}
                  <title>{k.ad}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Seçili kişi */}
        {secili && kisi.get(secili) && (() => {
          const k = kisi.get(secili)!;
          const aile = veri.aileler.find(a => a.id === k.aileId);
          return (
            <div className={`${KART} absolute right-3 top-3 w-72 max-w-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] overflow-y-auto p-3 space-y-2 shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)]`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold leading-snug">{k.ad}</div>
                  <div className={`text-[11px] ${IKINCIL}`}>{[aile?.ad, k.yasamMetni].filter(Boolean).join(' · ') || 'Kişi'}</div>
                </div>
                <button type="button" onClick={() => setSecili(null)} aria-label="Kapat" className={`p-1 ${IKINCIL}`}><X className="w-4 h-4" /></button>
              </div>
              {seciliBaglar.length ? (
                <ul className="space-y-1 text-[12px]">
                  {seciliBaglar.map(b => {
                    const o = b.a === secili ? b.b : b.a;
                    // Yönlü bağı kişinin gözünden söyle: "Ebeveyni" ya da "Çocuğu"
                    const ad = b.tur === 'ebeveyni' ? (b.a === secili ? 'Ebeveyni' : 'Çocuğu')
                      : b.tur === 'patronu' ? (b.a === secili ? 'Patronu' : 'Yanında çalışan') : BAG_ADI[b.tur];
                    return (
                      <li key={b.id} className="flex items-baseline gap-1.5">
                        <span className={`text-[11px] ${IKINCIL} w-24 shrink-0`}>{ad}</span>
                        <button type="button" onClick={() => setSecili(o)} className="text-left underline decoration-[#0E1C4F]/30 underline-offset-2 hover:decoration-[#F26B6F]">{kisi.get(o)?.ad}</button>
                        {yilMetni(b) && <span className={`text-[10.5px] font-mono ${IKINCIL}`}>{yilMetni(b)}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className={`text-[12px] ${IKINCIL}`}>Bu kişinin kişi bağı yok.</p>}
              <button type="button" onClick={() => onMaddeAc(k.id)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#0E1C4F] dark:bg-[#2C3C72] text-white cursor-pointer">Maddeyi aç</button>
            </div>
          );
        })()}
      </div>

      <p className={`text-[12px] ${IKINCIL} leading-relaxed`}>
        {gorunen.kisiler.length} kişi · {gorunen.baglar.length} bağ. Çift çizgi eş, dik çizgi ebeveyn → çocuk, noktalı çizgi akraba ya da kardeş.
        Bağları kişinin düzenleyicisinden kurarsın ("Ebeveyni", "Eşi", "Kardeşi", "Patronu"…); bağa yıl yazarsan ("1950–1975") yıl ve dönem süzgeci onu da süzer.
        Yılı yazılmamış bağ ve kişi her zaman görünür.
      </p>
    </div>
  );
};

export default SoyAgaci;
