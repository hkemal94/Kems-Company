import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Item } from '../../types';
import { TYPE_LABELS } from '../wiki/wikiSchema';
import { TUR_NOKTASI } from './turRenkleri';
import {
  donemAdaylari, donemKaydi, donemleriOku, reddedilenDonemler, zamanKayitlari,
  type Donem, type ZamanKaydi
} from '../../lib/zamanCizgisi';

/**
 * Atölye → Zaman çizgisi (5. gece). Her madde bir satır; künyedeki
 * tarihler yıl ekseninde: aralık çubuk, tek tarih nokta, açık uçlu aralık
 * ("1954–") sağa doğru solar. Arkada Kemal'in dönemleri bant olarak.
 * Çizgiye basınca madde açılır; tarih maddeden değişir. Kayda yalnız
 * dönem "Ekle", dönemin ×'i ve adayın "Önerme"si yazar.
 */

interface Props {
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onMaddeAc: (id: string) => void;
}

/** Dönem bantlarının renkleri (sırayla) */
const BANT = [
  { zemin: 'bg-[#F26B6F]/10', yazi: 'text-[#B8454A] dark:text-[#F7A3A6]', cizgi: 'border-[#F26B6F]/40' },
  { zemin: 'bg-[#0E1C4F]/[0.07] dark:bg-[#8FA3D9]/10', yazi: 'text-[#0E1C4F] dark:text-[#B9C6EA]', cizgi: 'border-[#0E1C4F]/30 dark:border-[#8FA3D9]/40' },
  { zemin: 'bg-[#C99A2E]/12', yazi: 'text-[#8A6516] dark:text-[#E2C277]', cizgi: 'border-[#C99A2E]/40' },
  { zemin: 'bg-[#2F7D6D]/10', yazi: 'text-[#2F7D6D] dark:text-[#7FCBB8]', cizgi: 'border-[#2F7D6D]/40' },
  { zemin: 'bg-[#8A5A9E]/10', yazi: 'text-[#6E4581] dark:text-[#C9A6D8]', cizgi: 'border-[#8A5A9E]/40' }
];
const GIRDI = 'text-[12px] bg-white dark:bg-[#0E1733] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#F26B6F]';
const DUGME = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] text-[#0E1C4F] dark:text-[#F3EFE8] hover:border-[#F26B6F] disabled:opacity-40';
const DOLU = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer bg-[#0E1C4F] dark:bg-[#2C3C72] text-white disabled:opacity-40';
const IKINCIL = 'text-[#6A5E4C] dark:text-[#A6B0C9]';
const KART = 'rounded-2xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#0E1733]';

const aralikMetni = (k: Pick<ZamanKaydi, 'bas' | 'bit'>) => (k.bit === undefined ? String(k.bas) : k.bit === null ? `${k.bas}–` : `${k.bas}–${k.bit}`);

export const ZamanCizgisi: React.FC<Props> = ({ items, onUpdateItem, onAddItem, onMaddeAc }) => {
  const { kayitlar, okunamayanlar } = useMemo(() => zamanKayitlari(items), [items]);
  const donemler = useMemo(() => donemleriOku(items), [items]);
  const reddedilen = useMemo(() => reddedilenDonemler(items), [items]);
  const adaylar = useMemo(() => donemAdaylari(items, donemler, reddedilen), [items, donemler, reddedilen]);

  // Satırlar: madde başına bir satır, en erken tarihine göre
  const satirlar = useMemo(() => {
    const m = new Map<string, ZamanKaydi[]>();
    for (const k of kayitlar) m.set(k.maddeId, [...(m.get(k.maddeId) || []), k]);
    return Array.from(m.values()).sort((a, b) => a[0].bas - b[0].bas || a[0].madde.localeCompare(b[0].madde, 'tr'));
  }, [kayitlar]);

  // Eksenin başı (yalnız ekranda): tek bir eski tarih bütün çizgiyi sıkıştırmasın
  const [eksenBasi, setEksenBasi] = useState<number | null>(null);
  // Eksen: en erken ile en geç yıl (dönemler dahil), onluğa yuvarlanmış
  const tum = useMemo(() => {
    const yillar = [...kayitlar.flatMap(k => [k.bas, k.bit ?? k.bas]), ...donemler.flatMap(d => [d.bas, d.bit ?? d.bas])];
    if (!yillar.length) return { bas: 1900, bit: 2030, adim: 10 };
    const b0 = Math.floor((Math.min(...yillar) - 5) / 10) * 10;
    const b1 = Math.ceil((Math.max(...yillar) + 8) / 10) * 10;
    const aralik = b1 - b0;
    return { bas: b0, bit: b1, adim: aralik > 300 ? 50 : aralik > 140 ? 20 : 10 };
  }, [kayitlar, donemler]);
  const baslangiclar = useMemo(() => {
    const l: number[] = [];
    for (let y = Math.ceil((tum.bas + 1) / 50) * 50; y < tum.bit - 30; y += 50) l.push(y);
    return l;
  }, [tum]);
  const bas = eksenBasi !== null && eksenBasi > tum.bas && eksenBasi < tum.bit ? eksenBasi : tum.bas;
  const bit = tum.bit;
  const adim = bit - bas > 300 ? 50 : bit - bas > 140 ? 20 : 10;
  /** Eksen dışında kalan baş eksenin soluna yapışır */
  const yuzde = (y: number) => `${((Math.max(y, bas) - bas) / (bit - bas)) * 100}%`;
  const isaretler = useMemo(() => {
    const l: number[] = [];
    for (let y = Math.ceil(bas / adim) * adim; y <= bit; y += adim) l.push(y);
    return l;
  }, [bas, bit, adim]);

  // Dönem formu
  const [ad, setAd] = useState('');
  const [yilBas, setYilBas] = useState('');
  const [yilBit, setYilBit] = useState('');
  const [yaziliyor, setYaziliyor] = useState(false);
  const [mesaj, setMesaj] = useState('');
  const basSayi = Number(yilBas), bitSayi = yilBit.trim() ? Number(yilBit) : undefined;
  const formGecerli = ad.trim().length > 0 && /^-?\d{1,4}$/.test(yilBas.trim())
    && (bitSayi === undefined || (/^-?\d{1,4}$/.test(yilBit.trim()) && bitSayi >= basSayi));

  const yaz = async (yeni: Donem[], red?: string[], tamam?: string) => {
    setYaziliyor(true); setMesaj('');
    try {
      const k = donemKaydi(items, yeni, red);
      if (k.guncel) await onUpdateItem(k.guncel); else if (k.yeni) await onAddItem(k.yeni);
      if (tamam) setMesaj(tamam);
      return true;
    } catch { setMesaj('Kaydedilemedi; yeniden dene.'); return false; }
    finally { setYaziliyor(false); }
  };
  const ekle = async () => {
    if (!formGecerli) return;
    const d: Donem = { id: `donem_${Date.now()}`, ad: ad.trim(), bas: basSayi, ...(bitSayi !== undefined ? { bit: bitSayi } : {}) };
    if (await yaz([...donemler, d], undefined, `"${d.ad}" eklendi.`)) { setAd(''); setYilBas(''); setYilBit(''); }
  };

  return (
    <div className="space-y-4">
      <p className={`text-[13px] ${IKINCIL} max-w-3xl leading-relaxed`}>
        Künyedeki tarihler (kuruluş, açılış, yapım, faaliyet…) yıl ekseninde. Çubuk aralık, nokta tek tarih; ucu solan çubuk bitişi
        olmayan aralık ("1954–"). Arkadaki bantlar senin dönemlerin. Bir satıra basınca madde açılır; tarihi oradan değiştirirsin.
      </p>

      {baslangiclar.length > 0 && (
        <label className={`inline-flex items-center gap-2 text-[12px] ${IKINCIL}`}>
          Eksen
          <select value={eksenBasi ?? ''} onChange={e => setEksenBasi(e.target.value ? Number(e.target.value) : null)} className={GIRDI}>
            <option value="">bütün yıllar ({tum.bas}–)</option>
            {baslangiclar.map(y => <option key={y} value={y}>{y}–</option>)}
          </select>
        </label>
      )}

      {/* Çizgi */}
      <div className={`${KART} overflow-x-auto`}>
        <div className="min-w-[760px] p-3">
          {/* Dönem başlıkları */}
          {donemler.length > 0 && (
            <div className="grid grid-cols-[11rem_1fr] gap-2 mb-1">
              <div className={`text-[10px] font-mono font-bold uppercase tracking-[0.14em] ${IKINCIL} self-end`}>Dönemler</div>
              <div className="relative h-6">
                {donemler.map((d, n) => (
                  <div key={d.id} title={`${d.ad} · ${aralikMetni({ bas: d.bas, bit: d.bit ?? null })}`}
                    className={`absolute top-0 h-6 px-1.5 flex items-center rounded-md text-[11px] font-semibold truncate ${BANT[n % BANT.length].zemin} ${BANT[n % BANT.length].yazi}`}
                    style={{ left: yuzde(d.bas), width: `calc(${yuzde(d.bit ?? bit)} - ${yuzde(d.bas)})` }}>
                    {d.ad}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eksen */}
          <div className="grid grid-cols-[11rem_1fr] gap-2">
            <div />
            <div className="relative h-5 border-b border-[#CFC5B4] dark:border-[#2C3C72]">
              {isaretler.map(y => (
                <span key={y} className={`absolute bottom-1 -translate-x-1/2 text-[10px] font-mono tabular-nums ${IKINCIL}`} style={{ left: yuzde(y) }}>{y}</span>
              ))}
            </div>
          </div>

          {/* Satırlar */}
          <div className="relative">
            {/* Dönem bantları ve on yıl çizgileri satırların arkasında */}
            <div className="absolute inset-0 grid grid-cols-[11rem_1fr] gap-2 pointer-events-none" aria-hidden="true">
              <div />
              <div className="relative">
                {isaretler.map(y => <span key={y} className="absolute inset-y-0 border-l border-[#E4DCCD] dark:border-[#1C2A55]" style={{ left: yuzde(y) }} />)}
                {donemler.map((d, n) => (
                  <span key={d.id} className={`absolute inset-y-0 border-x ${BANT[n % BANT.length].zemin} ${BANT[n % BANT.length].cizgi}`}
                    style={{ left: yuzde(d.bas), width: `calc(${yuzde(d.bit ?? bit)} - ${yuzde(d.bas)})` }} />
                ))}
              </div>
            </div>

            {!satirlar.length && <p className={`relative py-6 text-[13px] ${IKINCIL}`}>Künyelerde okunabilen tarih yok.</p>}
            {satirlar.map(s => (
              <button key={s[0].maddeId} type="button" onClick={() => onMaddeAc(s[0].maddeId)}
                title={s.map(k => `${k.alan}: ${k.metin}`).join('\n')}
                className="relative w-full grid grid-cols-[11rem_1fr] gap-2 items-center py-1 text-left rounded-md hover:bg-[#F3EFE8]/80 dark:hover:bg-[#13204A]/80 cursor-pointer group">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TUR_NOKTASI[s[0].tur] || 'bg-[#6A5E4C]'}`} />
                  <span className="text-[12px] truncate group-hover:text-[#F26B6F]">{s[0].madde}</span>
                </span>
                <span className="relative h-5">
                  {s.map((k, n) => {
                    const renk = TUR_NOKTASI[k.tur] || 'bg-[#6A5E4C]';
                    if (k.bit === undefined) {
                      if (k.bas < bas) return null;
                      return <span key={n} className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-[#FAF8F5] dark:ring-[#0E1733] ${renk}`} style={{ left: yuzde(k.bas) }} />;
                    }
                    const son = k.bit ?? bit;
                    if (son < bas) return null;
                    return (
                      <span key={n} className={`absolute top-1/2 -translate-y-1/2 h-2 rounded-full ${renk} ${k.yaklasik ? 'opacity-60' : ''}`}
                        style={{
                          left: yuzde(k.bas), width: `max(6px, calc(${yuzde(son)} - ${yuzde(k.bas)}))`,
                          ...(k.bit === null ? { maskImage: 'linear-gradient(to right, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent)' } : {})
                        }} />
                    );
                  })}
                  {/* Satırın tarih yazısı: ilk kaydın sağında */}
                  <span className={`absolute top-1/2 -translate-y-1/2 ml-2 text-[10px] font-mono whitespace-nowrap ${IKINCIL}`}
                    style={{ left: s[0].bit === undefined ? yuzde(s[0].bas) : yuzde(s[0].bit ?? bit), ...(s[0].bit === null ? { display: 'none' } : {}) }}>
                    {(s[0].bit ?? s[0].bas) < bas && s[0].bit !== null ? '← ' : ''}{s.map(k => aralikMetni(k)).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className={`text-[11px] ${IKINCIL}`}>
        {satirlar.length} madde · {kayitlar.length} tarih. Soluk çubuk yaklaşık ("1980'ler", "19. yüzyıl").
        {okunamayanlar.length > 0 && ` Okunamayan ${okunamayanlar.length} tarih aşağıda.`}
      </p>

      {/* Dönemler */}
      <section className={`${KART} p-4 space-y-3`}>
        <div className={`text-[10px] font-mono font-bold uppercase tracking-[0.14em] ${IKINCIL}`}>Dönemler</div>
        {donemler.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {donemler.map((d, n) => (
              <li key={d.id} className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-[12px] ${BANT[n % BANT.length].zemin} ${BANT[n % BANT.length].yazi}`}>
                <b>{d.ad}</b> <span className="font-mono text-[11px]">{aralikMetni({ bas: d.bas, bit: d.bit ?? null })}</span>
                <button type="button" disabled={yaziliyor} onClick={() => void yaz(donemler.filter(x => x.id !== d.id), undefined, `"${d.ad}" silindi.`)}
                  aria-label={`${d.ad} dönemini sil`} title="Dönemi sil" className="p-0.5 rounded-full hover:bg-white/60 dark:hover:bg-black/20 disabled:opacity-40"><X className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
        ) : <p className={`text-[12px] ${IKINCIL}`}>Henüz dönem yok. Adı ve yılları sen verirsin.</p>}

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] flex-1 min-w-[12rem]">
            <span className={IKINCIL}>Dönemin adı</span>
            <input value={ad} onChange={e => setAd(e.target.value)} className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] w-24">
            <span className={IKINCIL}>Başlangıç</span>
            <input value={yilBas} onChange={e => setYilBas(e.target.value)} inputMode="numeric" placeholder="yıl" className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] w-24">
            <span className={IKINCIL}>Bitiş</span>
            <input value={yilBit} onChange={e => setYilBit(e.target.value)} inputMode="numeric" placeholder="açık" className={GIRDI} />
          </label>
          <button type="button" onClick={() => void ekle()} disabled={!formGecerli || yaziliyor} className={DOLU}><Plus className="w-3.5 h-3.5" /> Ekle</button>
        </div>
        <p className={`text-[11px] ${IKINCIL}`}>Bitişi boş bırakırsan dönem açık uçlu çizilir. Yıl yazmazsan "Ekle" basılmaz.</p>
        {mesaj && <p role="status" className="text-[12px] text-[#F26B6F]">{mesaj}</p>}

        {adaylar.length > 0 && (
          <div className="pt-2 border-t border-[#E4DCCD] dark:border-[#2C3C72] space-y-2">
            <div className={`text-[10px] font-mono font-bold uppercase tracking-[0.14em] ${IKINCIL}`}>Yazılarında geçen dönemler · aday</div>
            <ul className="divide-y divide-[#E4DCCD] dark:divide-[#2C3C72]">
              {adaylar.map(a => (
                <li key={a.ad} className="py-2 flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-[14rem]">
                    <div className="text-[13px] font-semibold">{a.ad}</div>
                    <div className={`text-[11px] ${IKINCIL}`}>
                      {a.sayi} kez:{' '}
                      {a.kaynaklar.slice(0, 3).map((k, n) => (
                        <React.Fragment key={k.id}>{n > 0 && ', '}
                          <button type="button" onClick={() => onMaddeAc(k.id)} className="underline decoration-[#0E1C4F]/30 underline-offset-2 hover:decoration-[#F26B6F]">{k.ad}</button>
                        </React.Fragment>
                      ))}
                      {a.kaynaklar.length > 3 && ` ve ${a.kaynaklar.length - 3} yer daha`}
                    </div>
                    {a.ornek && <div className={`mt-0.5 text-[11px] italic ${IKINCIL}`}>“{a.ornek}”</div>}
                  </div>
                  <button type="button" onClick={() => { setAd(a.ad); setMesaj('Yılları yaz, sonra "Ekle".'); }} className={DUGME}>Bu adla başla</button>
                  <button type="button" disabled={yaziliyor} onClick={() => void yaz(donemler, Array.from(new Set([...reddedilen, a.ad])))} title="Bu adı bir daha önerme" className={DUGME}>Önerme</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {okunamayanlar.length > 0 && (
        <section className={`${KART} p-4 space-y-2`}>
          <div className={`text-[10px] font-mono font-bold uppercase tracking-[0.14em] ${IKINCIL}`}>Çizgiye konamayan tarihler</div>
          <ul className="space-y-1 text-[12px]">
            {okunamayanlar.map((o, n) => (
              <li key={n}>
                <button type="button" onClick={() => onMaddeAc(o.maddeId)} className="underline decoration-[#0E1C4F]/30 underline-offset-2 hover:decoration-[#F26B6F]">{o.madde}</button>
                <span className={IKINCIL}> · {o.alan}: {o.metin}</span>
              </li>
            ))}
          </ul>
          <p className={`text-[11px] ${IKINCIL}`}>Yıl ya da yüzyıl olarak yazılırsa çizgiye gelir.</p>
        </section>
      )}
    </div>
  );
};

export default ZamanCizgisi;
