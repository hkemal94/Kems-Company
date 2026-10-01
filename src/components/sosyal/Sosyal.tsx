import { takvimOlaylari, type TakvimOlayi } from '../../lib/takvim';
import { SayfaBasi } from '../kabuk/SayfaBasi';
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, EyeOff, Eye } from 'lucide-react';
import type { Item } from '../../types';
import {
  AY_ADLARI, GUN_KISA, KANALLAR, TURLER, asamasi, ayIzgarasi, bosYerler, bugunTarih, gonderiBilgisi,
  gonderiGuncelle, gonderiler, seriBilgisi, seriler, tarihYaz, turBul, turStili, TUR_SINIFI, yeniGonderi,
  type GonderiBilgisi
} from '../../lib/sosyal';
import { GonderiKarti } from './GonderiKarti';
import { SeriListesi } from './Seriler';
import { DUGME_BOS, DUGME_LAC, ETIKET, IKINCIL, KART, YAZI } from '../anasayfa/stil';

/**
 * Sosyal medya sayfası (Araçlar, 29 Eylül gece).
 *
 * Masaüstü: solda ay takvimi, sağda fikir kutusu ve Instagram ızgarası.
 * Telefon: sekmeler — Takvim (gün listesi) · Fikirler · Seriler · Izgara.
 * Hiçbir şey kendiliğinden kaydolmaz: seri boş yerleri yalnız görünür,
 * gönderi Kemal basınca açılır. Paylaşımı Kemal yapar.
 */

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
type Gorunum = 'takvim' | 'fikir' | 'seri' | 'izgara';

interface Props {
  items: Item[];
  onAddItem: (item: YeniKayit & { id?: string }) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  /** Başka sayfadan (ör. "Son dokunulanlar") basılan gönderi ya da seri */
  acilacakId?: string | null;
}

const IZGARA_ANAHTARI = 'kems_sosyal_izgara';
const izgaraOku = () => { try { return localStorage.getItem(IZGARA_ANAHTARI) !== 'kapali'; } catch { return true; } };
const izgaraYaz = (acik: boolean) => { try { localStorage.setItem(IZGARA_ANAHTARI, acik ? 'acik' : 'kapali'); } catch { /* yok */ } };

const cip = (on: boolean) => `shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer whitespace-nowrap ${on ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white border-transparent' : `bg-white dark:bg-[#17345A] border-[#CFC5B4] dark:border-[#2C3C72] ${YAZI}`}`;

const ASAMA_RENGI: Record<string, string> = {
  Fikir: 'bg-[#F3EFE8] text-[#6A5E4C] dark:bg-[#17345A] dark:text-[#A6B0C9]',
  Taslak: 'bg-[#F3EFE8] text-[#6A5E4C] dark:bg-[#17345A] dark:text-[#A6B0C9]',
  Hazır: 'bg-[#E5EFE3] text-[#3F6B45] dark:bg-[#23452B] dark:text-[#B9D8BC]',
  Paylaşıldı: 'bg-[#0E1C4F] text-white dark:bg-[#2C3C72]'
};

export const Sosyal: React.FC<Props> = ({ items, onAddItem, onUpdateItem, onDeleteItem, acilacakId = null }) => {
  const bugun = bugunTarih();
  const [ay, setAy] = useState(() => { const d = new Date(); return { y: d.getFullYear(), a: d.getMonth() }; });
  const [gorunum, setGorunum] = useState<Gorunum>('takvim');
  const [kanalSuz, setKanalSuz] = useState('');
  const [seriSuz, setSeriSuz] = useState('');
  const [acikId, setAcikId] = useState<string | null>(null);
  const [izgaraAcik, setIzgaraAcik] = useState(izgaraOku);
  const [surukle, setSurukle] = useState<string | null>(null);
  const [hedef, setHedef] = useState<string | null>(null);
  useEffect(() => {
    const k = acilacakId ? items.find(i => i.id === acilacakId) : undefined;
    if (!k) return;
    if (k.type === 'sosyal_seri') setGorunum('seri');
    else if (k.type === 'sosyal_gonderi') setAcikId(k.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acilacakId]);

  const tum = useMemo(() => gonderiler(items), [items]);
  const seriListesi = useMemo(() => seriler(items).sort((a, b) => a.createdAt - b.createdAt), [items]);
  const seriBul = (id: string) => seriListesi.find(s => s.id === id);

  const uyar = (g: Item) => {
    const b = gonderiBilgisi(g);
    return (!kanalSuz || b.kanallar.includes(kanalSuz)) && (!seriSuz || b.seriId === seriSuz);
  };
  const tarihli = tum.filter(g => gonderiBilgisi(g).tarih && uyar(g));
  const fikirler = tum.filter(g => !gonderiBilgisi(g).tarih && uyar(g)).sort((a, b) => b.createdAt - a.createdAt);
  const gunde = (t: string) => tarihli.filter(g => gonderiBilgisi(g).tarih === t)
    .sort((a, b) => (gonderiBilgisi(a).saat || '99').localeCompare(gonderiBilgisi(b).saat || '99'));

  // Düzenli serilerin bu aydaki boş yerleri — yalnız görünür, kaydolmaz
  const bosYer = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const s of seriListesi) {
      if (seriSuz && s.id !== seriSuz) continue;
      if (kanalSuz && !seriBilgisi(s).kanallar.includes(kanalSuz)) continue;
      for (const t of bosYerler(s, tum, ay.y, ay.a, bugun)) m.set(t, [...(m.get(t) || []), s]);
    }
    return m;
  }, [seriListesi, tum, ay, bugun, seriSuz, kanalSuz]);

  const yeni = (b: Partial<GonderiBilgisi>) => {
    const id = `sosyal_gonderi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setAcikId(id);
    void onAddItem({ ...yeniGonderi(b), id });
  };
  const seriIcin = (seri: Item, tarih: string) => yeni({ tarih, seriId: seri.id, kanallar: seriBilgisi(seri).kanallar });
  const tasi = (id: string | null, tarih: string) => {
    const g = id && tum.find(x => x.id === id);
    setSurukle(null); setHedef(null);
    if (g && gonderiBilgisi(g).tarih !== tarih) void onUpdateItem(gonderiGuncelle(g, { tarih }));
  };
  const birak = (tarih: string) => ({
    onDragOver: (e: React.DragEvent) => { if (surukle) { e.preventDefault(); setHedef(tarih || 'fikir'); } },
    onDragLeave: () => setHedef(h => (h === (tarih || 'fikir') ? null : h)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); tasi(surukle || e.dataTransfer.getData('text/plain'), tarih); }
  });

  const ayDegis = (n: number) => setAy(({ y, a }) => { const d = new Date(y, a + n, 1); return { y: d.getFullYear(), a: d.getMonth() }; });
  const buAy = ay.y === new Date().getFullYear() && ay.a === new Date().getMonth();
  const yeniTarih = buAy ? bugun : tarihYaz(ay.y, ay.a, 1);
  const acik = acikId ? tum.find(g => g.id === acikId) : undefined;

  // ---------------------------------------------------------------- parçalar

  // Bileşen değil, düz işlev: sürüklerken yeniden kurulmasın (sürükleme kopar)
  const gonderiCip = (g: Item, ince?: boolean) => {
    const b = gonderiBilgisi(g);
    const seri = seriBul(b.seriId);
    const tur = turBul(b.tur);
    const asama = asamasi(g);
    return (
      <div
        key={g.id}
        draggable
        onDragStart={e => { setSurukle(g.id); e.dataTransfer.setData('text/plain', g.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { setSurukle(null); setHedef(null); }}
        onClick={() => setAcikId(g.id)}
        title={g.title}
        className={`rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] border-l-4 bg-[#FAF8F5] dark:bg-[#13204A] cursor-pointer hover:border-[#F26B6F] ${ince ? 'px-1.5 py-1' : 'px-2.5 py-2'} ${surukle === g.id ? 'opacity-40' : ''}`}
        style={{ borderLeftColor: seri ? seriBilgisi(seri).renk : undefined }}
      >
        <div className={`flex items-center gap-1.5 min-w-0 font-semibold ${YAZI} ${ince ? 'text-[11px]' : 'text-[13px]'}`}>
          {tur && <i className={`w-2 h-2 rounded-full shrink-0 block ${TUR_SINIFI}`} style={turStili(tur.id)} />}
          <span className="truncate">{b.saat && !ince ? `${b.saat} · ` : ''}{g.title}</span>
        </div>
        <div className={`flex flex-wrap items-center gap-1 mt-0.5 ${IKINCIL} ${ince ? 'text-[9px]' : 'text-[10.5px]'}`}>
          {b.kanallar.map(k => {
            const kanal = KANALLAR.find(x => x.id === k);
            return kanal && <span key={k} className={`font-bold px-1 rounded border border-[#CFC5B4] dark:border-[#2C3C72] ${b.paylasilan.includes(k) ? 'bg-[#0E1C4F] text-white dark:bg-[#2C3C72] border-transparent' : 'bg-white dark:bg-[#17345A]'}`}>{kanal.kisa}</span>;
          })}
          <span className={`font-bold uppercase tracking-wide px-1 rounded ${ASAMA_RENGI[asama]}`}>{asama}</span>
          {seri && !ince && <span className="truncate">· {seri.title}</span>}
        </div>
      </div>
    );
  };

  const bosYerCip = (s: Item, tarih: string, ince?: boolean) => (
    <button
      key={s.id}
      type="button"
      onClick={() => seriIcin(s, tarih)}
      title={`${s.title} · boş yer — basınca gönderi açılır`}
      className={`w-full text-left rounded-lg border-[1.5px] border-dashed border-l-4 border-[#CFC5B4] dark:border-[#2C3C72] ${IKINCIL} hover:border-[#F26B6F] cursor-pointer ${ince ? 'px-1.5 py-1 text-[10.5px]' : 'px-2.5 py-2 text-[12px]'}`}
      style={{ borderLeftColor: seriBilgisi(s).renk }}
    >
      <span className="font-semibold truncate block">{s.title}</span>
      <span className={ince ? 'text-[9px]' : 'text-[11px]'}>+ boş yer</span>
    </button>
  );

  /** Drop çıkışları (yapisal-4, 35: tek takvim). Tarih Merch'te girilir; burada yalnız görünür. */
  const droplar = takvimOlaylari(items, ay.y, ay.a, ['drop']);
  const dropCip = (d: TakvimOlayi, ince = false) => (
    <div key={d.id} title={`Drop çıkışı · ${d.baslik}`} className={`rounded-lg bg-[#F26B6F] text-white font-semibold truncate ${ince ? 'px-1.5 py-0.5 text-[10.5px]' : 'px-2.5 py-1.5 text-[12px]'}`}>
      Drop · {d.baslik}
    </div>
  );

  const Suzgec = (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      <button type="button" onClick={() => setKanalSuz('')} className={cip(!kanalSuz)}>Tüm kanallar</button>
      {KANALLAR.map(k => <button key={k.id} type="button" onClick={() => setKanalSuz(s => (s === k.id ? '' : k.id))} className={cip(kanalSuz === k.id)}>{k.ad}</button>)}
      {seriListesi.length > 0 && (
        <select value={seriSuz} onChange={e => setSeriSuz(e.target.value)} className={`${cip(!!seriSuz)} pr-1 focus:outline-hidden`}>
          <option value="">Bütün seriler</option>
          {seriListesi.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      )}
    </div>
  );

  const AyBasligi = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => ayDegis(-1)} title="Önceki ay" className={`w-9 h-9 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] flex items-center justify-center ${IKINCIL} cursor-pointer hover:border-[#F26B6F]`}><ChevronLeft className="w-4 h-4" /></button>
      <div className={`flex-1 lg:flex-none lg:min-w-[150px] text-center text-[17px] font-bold ${YAZI}`}>{AY_ADLARI[ay.a]} {ay.y}</div>
      <button type="button" onClick={() => ayDegis(1)} title="Sonraki ay" className={`w-9 h-9 rounded-full border border-[#CFC5B4] dark:border-[#2C3C72] flex items-center justify-center ${IKINCIL} cursor-pointer hover:border-[#F26B6F]`}><ChevronRight className="w-4 h-4" /></button>
      {!buAy && <button type="button" onClick={() => { const d = new Date(); setAy({ y: d.getFullYear(), a: d.getMonth() }); }} className={DUGME_BOS}>Bugün</button>}
    </div>
  );

  // Masaüstü: ay ızgarası
  const AyIzgarasi = (
    <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#CFC5B4] dark:bg-[#2C3C72]">
      {GUN_KISA.map(g => <div key={g} className={`bg-[#F3EFE8] dark:bg-[#17345A] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${IKINCIL}`}>{g}</div>)}
      {ayIzgarasi(ay.y, ay.a).map((gun, n) => {
        if (!gun) return <div key={`b${n}`} className="bg-[#EFE9DF] dark:bg-[#0F1A3D] min-h-[118px]" />;
        const t = tarihYaz(ay.y, ay.a, gun);
        const liste = gunde(t);
        const bos = bosYer.get(t) || [];
        return (
          <div key={t} {...birak(t)} className={`group relative min-h-[118px] p-1.5 space-y-1 ${hedef === t ? 'bg-[#FDECEC] dark:bg-[#3A2440]' : t < bugun ? 'bg-[#F7F4EF] dark:bg-[#111C42]' : 'bg-[#FAF8F5] dark:bg-[#13204A]'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${t === bugun ? 'bg-[#F26B6F] text-white' : t < bugun ? 'text-[#B3A894] dark:text-[#6F7BA0]' : YAZI}`}>{gun}</span>
              <button type="button" onClick={() => yeni({ tarih: t })} title="Bu güne gönderi" className={`w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 ${IKINCIL} hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer`}><Plus className="w-3.5 h-3.5" /></button>
            </div>
            {(droplar.get(t) || []).map(d => dropCip(d, true))}
            {liste.map(g => gonderiCip(g, true))}
            {bos.map(s => bosYerCip(s, t, true))}
          </div>
        );
      })}
    </div>
  );

  // Telefon: gün listesi (içi dolu günler + bugün)
  const gunListesi = (() => {
    const g: string[] = [];
    const sayi = new Date(ay.y, ay.a + 1, 0).getDate();
    for (let d = 1; d <= sayi; d++) {
      const t = tarihYaz(ay.y, ay.a, d);
      if (t === bugun || gunde(t).length || bosYer.has(t) || droplar.has(t)) g.push(t);
    }
    return g;
  })();
  const GunListesi = (
    <div className="space-y-1">
      {gunListesi.length === 0 && <p className={`text-[13px] py-6 text-center ${IKINCIL}`}>Bu ay boş.</p>}
      {gunListesi.map(t => {
        const d = new Date(t + 'T12:00');
        const liste = gunde(t);
        const bos = bosYer.get(t) || [];
        return (
          <div key={t} className="flex gap-3">
            <div className="w-11 shrink-0 text-center pt-1.5">
              <div className={`text-[20px] font-bold leading-none ${t === bugun ? 'text-[#F26B6F]' : YAZI}`}>{d.getDate()}</div>
              <div className={`text-[10px] font-bold uppercase tracking-[0.1em] ${IKINCIL}`}>{GUN_KISA[(d.getDay() + 6) % 7]}</div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5 pb-2 border-b border-[#E4DCCD] dark:border-[#2C3C72]">
              {(droplar.get(t) || []).map(d => dropCip(d))}
              {liste.map(g => gonderiCip(g))}
              {bos.map(s => bosYerCip(s, t))}
              {!liste.length && !bos.length && (
                <button type="button" onClick={() => yeni({ tarih: t })} className={`text-[12px] py-2 ${IKINCIL} cursor-pointer`}>— bugün boş · + gönderi</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const FikirKutusu = (
    <section {...birak('')} className={`${KART} p-3 space-y-2 ${hedef === 'fikir' ? 'ring-2 ring-[#F26B6F]' : ''}`}>
      <div className="flex items-center gap-2">
        <div className={`flex-1 ${ETIKET}`}>Fikir kutusu · tarihsiz{fikirler.length ? ` · ${fikirler.length}` : ''}</div>
        <button type="button" onClick={() => yeni({})} className={`${DUGME_BOS} inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Fikir</button>
      </div>
      {fikirler.length === 0 && <p className={`text-[12px] ${IKINCIL}`}>Tarihi olmayan fikirler burada durur.</p>}
      <div className="space-y-1.5 lg:max-h-[46vh] lg:overflow-y-auto">
        {fikirler.map(g => gonderiCip(g))}
      </div>
      <p className={`text-[11px] ${IKINCIL}`}>
        <span className="hidden lg:inline">Bir fikri takvimde bir güne sürükle, tarih alır. Günden buraya sürüklersen tarihi kalkar.</span>
        <span className="lg:hidden">Tarih vermek için fikri aç, tarih seç.</span>
      </p>
    </section>
  );

  // Izgara: Instagram'a işaretli, tarihli gönderiler; yeniden eskiye.
  // Paylaşılmamışlar soluk (üstte, çünkü tarihleri ileride).
  const izgara = tum.filter(g => { const b = gonderiBilgisi(g); return b.tarih && b.kanallar.includes('instagram'); })
    .sort((a, b) => gonderiBilgisi(b).tarih.localeCompare(gonderiBilgisi(a).tarih) || (gonderiBilgisi(b).saat || '').localeCompare(gonderiBilgisi(a).saat || ''))
    .slice(0, 18);
  const Izgara = (
    <section className={`${KART} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <div className={`flex-1 ${ETIKET}`}>Izgara · Instagram</div>
        <button type="button" onClick={() => { setIzgaraAcik(a => { izgaraYaz(!a); return !a; }); }} title={izgaraAcik ? 'Gizle' : 'Göster'} className={`hidden lg:flex w-7 h-7 rounded-full items-center justify-center ${IKINCIL} hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer`}>
          {izgaraAcik ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className={izgaraAcik ? '' : 'lg:hidden'}>
        {izgara.length === 0 ? (
          <p className={`text-[12px] ${IKINCIL}`}>Instagram'a işaretli, tarihli gönderi yok.</p>
        ) : (
          <div className="grid grid-cols-3 gap-[3px]">
            {izgara.map(g => {
              const b = gonderiBilgisi(g);
              const paylasildi = b.paylasilan.includes('instagram');
              const gorsel = g.images?.[0];
              return (
                <button key={g.id} type="button" onClick={() => setAcikId(g.id)} title={`${g.title} · ${b.tarih}`}
                  className={`aspect-square cursor-pointer overflow-hidden ${gorsel ? '' : TUR_SINIFI} ${paylasildi ? '' : 'opacity-45'}`}
                  style={gorsel ? { background: `center/cover no-repeat url("${gorsel}")` } : turStili(b.tur)} />
              );
            })}
          </div>
        )}
        <p className={`mt-2 text-[11px] ${IKINCIL}`}>Soluk kareler henüz paylaşılmadı. Görseli olmayan kare türünün renginde.</p>
      </div>
    </section>
  );

  const TurLejanti = (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${IKINCIL}`}>
      <span className={ETIKET}>Tür · yalnız KKM</span>
      {TURLER.map(t => <span key={t.id} className="inline-flex items-center gap-1"><i className={`w-2 h-2 rounded-full block ${TUR_SINIFI}`} style={turStili(t.id)} />{t.ad}</span>)}
    </div>
  );

  const SEKMELER: Array<{ id: Gorunum; ad: string; telefon?: boolean }> = [
    { id: 'takvim', ad: 'Takvim' },
    { id: 'fikir', ad: `Fikirler${fikirler.length ? ` ${fikirler.length}` : ''}`, telefon: true },
    { id: 'seri', ad: 'Seriler' },
    { id: 'izgara', ad: 'Izgara', telefon: true }
  ];
  // Masaüstünde fikir ve ızgara yan sütunda; o sekmeler takvime düşer
  const AKTIF = 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] border-transparent';
  const PASIF = `bg-[#FAF8F5] dark:bg-[#13204A] ${IKINCIL} border-[#CFC5B4] dark:border-[#2C3C72]`;
  const sekmeSinifi = (id: Gorunum) => {
    if (id === gorunum) return AKTIF;
    if (id === 'takvim' && gorunum !== 'seri') return `${PASIF} lg:bg-[#0E1C4F] lg:dark:bg-[#2C3C72] lg:text-[#F3EFE8] lg:border-transparent`;
    return PASIF;
  };
  const masaSeri = gorunum === 'seri';

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20 lg:pb-0">
      {/* Telefonda yeni gönderi sağ alttaki düğmeden */}
      <SayfaBasi baslik="Sosyal medya" yalnizMasada>
        <button type="button" onClick={() => yeni({})} className={`${DUGME_BOS} inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Fikir</button>
        <button type="button" onClick={() => yeni({ tarih: yeniTarih })} className={`${DUGME_LAC} inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> Gönderi</button>
      </SayfaBasi>

      <div className="flex gap-1.5">
        {SEKMELER.map(s => (
          <button key={s.id} type="button" onClick={() => setGorunum(s.id)}
            className={`${s.telefon ? 'lg:hidden' : ''} flex-1 lg:flex-none lg:px-5 py-2 rounded-xl text-[12.5px] font-semibold border cursor-pointer ${sekmeSinifi(s.id)}`}>
            {s.ad}
          </button>
        ))}
      </div>

      {masaSeri ? (
        <SeriListesi
          items={items}
          bugun={bugun}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onTakvimde={id => { setSeriSuz(id); setKanalSuz(''); setGorunum('takvim'); const d = new Date(); setAy({ y: d.getFullYear(), a: d.getMonth() }); }}
          onBosYer={seriIcin}
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-4 items-start space-y-4 lg:space-y-0">
          <div className={`${gorunum === 'takvim' ? '' : 'hidden'} lg:block space-y-3 min-w-0`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
              {AyBasligi}
              <div className="min-w-0 flex-1">{Suzgec}</div>
            </div>
            <div className="hidden lg:block">{AyIzgarasi}</div>
            <div className="lg:hidden">{GunListesi}</div>
            {TurLejanti}
          </div>
          <div className="space-y-4">
            <div className={`${gorunum === 'fikir' ? '' : 'hidden'} lg:block`}>{FikirKutusu}</div>
            <div className={`${gorunum === 'izgara' ? '' : 'hidden'} lg:block`}>{Izgara}</div>
          </div>
        </div>
      )}

      {/* Telefon: artı düğmesi */}
      {gorunum !== 'seri' && (
        <button type="button" onClick={() => (gorunum === 'fikir' ? yeni({}) : yeni({ tarih: yeniTarih, kanallar: gorunum === 'izgara' ? ['instagram'] : [] }))}
          title={gorunum === 'fikir' ? 'Yeni fikir' : 'Yeni gönderi'}
          className="lg:hidden fixed right-4 bottom-[8.5rem] z-30 w-14 h-14 rounded-full bg-[#F26B6F] text-white flex items-center justify-center shadow-[0_10px_24px_-10px_rgba(14,28,79,.6)] cursor-pointer">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {acik && (
        <GonderiKarti item={acik} items={items} onUpdateItem={onUpdateItem} onDeleteItem={onDeleteItem} onKapat={() => setAcikId(null)} />
      )}
    </div>
  );
};

export default Sosyal;
