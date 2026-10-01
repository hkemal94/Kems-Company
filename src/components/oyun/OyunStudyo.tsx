import React, { useMemo, useState } from 'react';
import { SayfaBasi } from '../kabuk/SayfaBasi';
import { BolumBasligi, BosSatir, IlerlemeHalkasi, Rozet } from '../kabuk/Parcalar';
import {
  Plus, ChevronLeft, ChevronRight, UserPlus, Trash2, X, Check, Download, Lightbulb, Target
} from 'lucide-react';
import type { Item, AreaType } from '../../types';
import {
  ASAMALAR, oyunIsleri, gddBolumleri, GDD_BOLUMLERI, projeAsamasi, BOLUM_ACIKLAMASI,
  KONSEPT_BOLUMLERI, MEKANIK_BOLUMLERI, ADIM_SIRASI, bolumYapildi, FIKIR_KATEGORILERI,
  oyunFikirleri, oyunBelgesi, GDD_SECIMLERI, secilenler
} from './OyunSureci';
import NpcSihirbazi from './NpcSihirbazi';
import { OyunVitrini } from './OyunVitrini';
import { GddBolumu } from './GddBolumu';
import { SayfaRayi } from '../SayfaRayi';
import { DUGME_BOS, DUGME_LAC, IKINCIL, KART, YAZI } from '../anasayfa/stil';

/**
 * Oyun: fikir ve süreç (1 Ekim). Kemal: "Oyun ekranı 7 ekran ama bir işe
 * yaramıyor, sadece tıklanıyor; nihai bir yere kayıt da belge de
 * oluşturmuyor" ve "basit bir otomasyon, sektörü bilmediğim için bana ne
 * istediğimi anlatabilen". Üç sekme:
 *
 *   Künye ve konsept   — tanıtım künyesi + kimlik bölümleri
 *   Adım adım süreç    — "Şimdi odaklan": sıradaki boş adım, sade açıklamasıyla
 *   Mekanikler ve notlar — oynanış bölümleri + kategorili fikir notları
 *
 * Her şey Kemal'in kayıtlarına yazılır (gdd_bolum, oyun_fikir, oyun_is,
 * oyun_tanitim) ve "Oyun dosyasını indir" ile tek belge olur. Oyunun kendisi
 * ayrı depoda; buradan oraya bir şey yazılmaz.
 */

type Sekme = 'kunye' | 'surec' | 'mekanik';
type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string };

export interface OyunStudyoProps {
  items: Item[];
  onAddItem: (item: YeniKayit) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onSelectArea?: (area: AreaType, itemId?: string) => void;
  onDeleteItem?: (id: string) => Promise<void>;
}

/** Fikir notu penceresi: başlık, kategori, not */
const FikirNotu: React.FC<{
  kayit?: Item;
  onKaydet: (v: { baslik: string; kategori: string; not: string }) => Promise<void>;
  onSil?: () => Promise<void>;
  onKapat: () => void;
}> = ({ kayit, onKaydet, onSil, onKapat }) => {
  const [baslik, setBaslik] = useState(kayit?.title || '');
  const [kategori, setKategori] = useState<string>(String((kayit?.metadata as any)?.kategori || 'Mekanik'));
  const [not, setNot] = useState(kayit?.notes || '');
  const [yaziliyor, setYaziliyor] = useState(false);
  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baslik.trim() || yaziliyor) return;
    setYaziliyor(true);
    try { await onKaydet({ baslik: baslik.trim(), kategori, not: not.trim() }); onKapat(); } finally { setYaziliyor(false); }
  };
  const kutu = 'w-full text-[14px] bg-[#F3EFE8] dark:bg-[#0B132B] text-[#0E1C4F] dark:text-[#F3EFE8] rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-[#F26B6F]/50';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end lg:items-center justify-center" onClick={onKapat}>
      <form onSubmit={kaydet} onClick={e => e.stopPropagation()} className="w-full lg:max-w-lg rounded-t-2xl lg:rounded-2xl bg-[#FAF8F5] dark:bg-[#13204A] p-5 space-y-4 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#D6484C] dark:text-[#F26B6F]" />
          <h3 className={`flex-1 text-[16px] font-bold ${YAZI}`}>{kayit ? 'Fikir notu' : 'Yeni fikir notu'}</h3>
          <button type="button" onClick={onKapat} aria-label="Kapat" className={`w-11 h-11 rounded-full flex items-center justify-center ${IKINCIL} cursor-pointer`}><X className="w-5 h-5" /></button>
        </div>
        <input autoFocus value={baslik} onChange={e => setBaslik(e.target.value)} placeholder="Fikir, tek satır…" className={kutu} />
        <div>
          <div className={`mb-2 text-[12px] font-bold uppercase tracking-[0.14em] ${IKINCIL}`}>Kategori</div>
          <div className="flex flex-wrap gap-1.5">
            {FIKIR_KATEGORILERI.map(k => (
              <button key={k} type="button" onClick={() => setKategori(k)} aria-pressed={kategori === k}
                className={`min-h-11 lg:min-h-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border cursor-pointer ${kategori === k ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] border-transparent' : `border-[#CFC5B4] dark:border-[#2C3C72] ${YAZI}`}`}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <textarea value={not} onChange={e => setNot(e.target.value)} rows={4} placeholder="Ayrıntı (isteğe bağlı)…" className={kutu} />
        <div className="flex items-center gap-2">
          {onSil && <button type="button" onClick={() => void onSil().then(onKapat)} className={`${DUGME_BOS} text-[#B23A40]`}><Trash2 className="w-3.5 h-3.5" /> Sil</button>}
          <span className="flex-1" />
          <button type="submit" disabled={!baslik.trim() || yaziliyor} className={DUGME_LAC}><Check className="w-3.5 h-3.5" /> Kaydet</button>
        </div>
      </form>
    </div>
  );
};

export const OyunStudyo: React.FC<OyunStudyoProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const isler = useMemo(() => oyunIsleri(items), [items]);
  const suAn = useMemo(() => projeAsamasi(items), [items]);
  const belgeler = useMemo(() => gddBolumleri(items), [items]);
  const fikirler = useMemo(() => oyunFikirleri(items), [items]);
  const gddSayim = useMemo(() => {
    let dolu = 0, toplam = 0;
    for (const [bolumId, secimler] of Object.entries(GDD_SECIMLERI)) {
      const k = belgeler.find(b => (b.metadata as any)?.bolumId === bolumId);
      for (const sc of secimler) { toplam++; if (k && secilenler(k.notes || '', sc).length) dolu++; }
    }
    return { dolu, toplam };
  }, [belgeler]);

  const [sekme, setSekme] = useState<Sekme>('kunye');
  const [yeniIs, setYeniIs] = useState<string | null>(null);
  const [yeniBaslik, setYeniBaslik] = useState('');
  const [npcAcik, setNpcAcik] = useState(false);
  const [belgeYaziliyor, setBelgeYaziliyor] = useState<string | null>(null);
  /** Süreçte elle seçilen adım; yoksa sıradaki boş adım */
  const [seciliAdim, setSeciliAdim] = useState<string | null>(null);
  const [fikirPenceresi, setFikirPenceresi] = useState<Item | 'yeni' | null>(null);
  const [katSuz, setKatSuz] = useState('');

  const kayitBul = (id: string) => belgeler.find(k => (k.metadata as any)?.bolumId === id);
  const yapilan = ADIM_SIRASI.filter(id => bolumYapildi(kayitBul(id))).length;
  const siradaki = ADIM_SIRASI.find(id => !bolumYapildi(kayitBul(id))) ?? null;
  const odak = seciliAdim ?? siradaki;

  const isEkle = async (asamaId: string) => {
    const baslik = yeniBaslik.trim();
    if (!baslik) return;
    await onAddItem({
      title: baslik, area: 'oyun', type: 'oyun_is', status: 'Fikir', priority: 'orta',
      tags: ['oyun', 'is'], links: [], notes: '', images: [], isProposal: false, archived: false,
      metadata: { asama: asamaId }
    });
    setYeniBaslik(''); setYeniIs(null);
  };

  const tasi = async (is: Item, yon: 1 | -1) => {
    const simdiki = String((is.metadata as any)?.asama || 'konsept');
    const i = ASAMALAR.findIndex(a => a.id === simdiki);
    const hedef = ASAMALAR[Math.min(Math.max(i + yon, 0), ASAMALAR.length - 1)];
    if (hedef.id === simdiki) return;
    await onUpdateItem({ ...is, metadata: { ...((is.metadata || {}) as any), asama: hedef.id }, updatedAt: Date.now() });
  };

  /** Tasarım belgesi bölümünü açar — Kemal'in seçimi ya da yazısıyla */
  const belgeAc = async (bolum: { id: string; ad: string; soru: string }, notlar = '') => {
    if (belgeYaziliyor) return;
    setBelgeYaziliyor(bolum.id);
    try {
      await onAddItem({
        title: bolum.ad, area: 'oyun', type: 'gdd_bolum', status: 'Fikir', priority: 'orta',
        tags: ['oyun', 'gdd'], links: [], notes: notlar, images: [], isProposal: false, archived: false,
        metadata: { bolumId: bolum.id, soru: bolum.soru }
      });
    } finally { setBelgeYaziliyor(null); }
  };
  const belgeYaz = async (kayit: Item, metin: string) => { await onUpdateItem({ ...kayit, notes: metin, updatedAt: Date.now() }); };

  const fikirKaydet = async (v: { baslik: string; kategori: string; not: string }) => {
    const eski = fikirPenceresi !== 'yeni' ? fikirPenceresi : null;
    if (eski) {
      await onUpdateItem({ ...eski, title: v.baslik, notes: v.not, metadata: { ...(eski.metadata || {}), kategori: v.kategori }, updatedAt: Date.now() });
    } else {
      await onAddItem({
        title: v.baslik, area: 'oyun', type: 'oyun_fikir', status: 'Fikir', priority: 'orta',
        tags: ['oyun', 'fikir-notu'], links: [], notes: v.not, images: [], isProposal: false, archived: false,
        metadata: { kategori: v.kategori }
      });
    }
  };

  const belgeIndir = () => {
    const blob = new Blob([oyunBelgesi(items)], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oyun-dosyasi-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const bolum = (id: string) => {
    const b = GDD_BOLUMLERI.find(x => x.id === id)!;
    return <GddBolumu key={id} bolum={b} kayit={kayitBul(id)} onAc={notlar => belgeAc(b, notlar)} onYaz={belgeYaz} />;
  };

  // ------------------------------------------------------------ sekmeler

  const Kunye = (
    <div className="space-y-5">
      <OyunVitrini items={items} asama={suAn} gddDolu={gddSayim.dolu} gddToplam={gddSayim.toplam} onAddItem={onAddItem} onUpdateItem={onUpdateItem} />
      <section className="space-y-3">
        <BolumBasligi baslik="Konsept" sayi={`${KONSEPT_BOLUMLERI.filter(id => bolumYapildi(kayitBul(id))).length}/${KONSEPT_BOLUMLERI.length}`} />
        <div className="grid gap-3 lg:grid-cols-2 items-start">{KONSEPT_BOLUMLERI.map(bolum)}</div>
      </section>
    </div>
  );

  const odakBolum = odak ? GDD_BOLUMLERI.find(x => x.id === odak)! : null;
  const odakSira = odak ? ADIM_SIRASI.indexOf(odak) : -1;
  const Surec = (
    <div className="space-y-5">
      {/* İlerleme ve "Şimdi odaklan" */}
      <section className={`${KART} p-4 flex items-center gap-4`}>
        <IlerlemeHalkasi yuzde={(yapilan / ADIM_SIRASI.length) * 100} boyut={64} />
        <div className="flex-1 min-w-0">
          <div className={`text-[12px] font-bold uppercase tracking-[0.16em] ${IKINCIL}`}>Tasarım belgesi</div>
          <div className={`text-[16px] font-bold ${YAZI}`}>{yapilan} / {ADIM_SIRASI.length} adım</div>
          <div className={`text-[13px] ${IKINCIL}`}>{siradaki ? 'Her adımda bir soru; seç ya da yaz, sonraki adım gelir.' : 'Bütün adımlar dolu. İstediğin adımı açıp düzeltebilirsin.'}</div>
        </div>
      </section>

      {odakBolum && (
        <section className="space-y-2">
          <BolumBasligi
            baslik={seciliAdim && seciliAdim !== siradaki ? `Adım ${odakSira + 1} · ${odakBolum.ad}` : `Şimdi odaklan · adım ${odakSira + 1}`}
            renk="dikkat"
            ek={seciliAdim && seciliAdim !== siradaki && siradaki ? <button type="button" onClick={() => setSeciliAdim(null)} className={DUGME_BOS}>Sıradakine dön</button> : undefined}
          />
          <div className="rounded-2xl bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] p-4 flex gap-3">
            <Target className="w-5 h-5 shrink-0 mt-0.5 text-[#F26B6F]" />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{odakBolum.soru}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#C9D0E3]">{BOLUM_ACIKLAMASI[odakBolum.id]}</p>
            </div>
          </div>
          {bolum(odakBolum.id)}
          <div className="flex justify-between gap-2">
            <button type="button" disabled={odakSira <= 0} onClick={() => setSeciliAdim(ADIM_SIRASI[odakSira - 1])} className={DUGME_BOS}><ChevronLeft className="w-4 h-4" /> Önceki adım</button>
            <button type="button" disabled={odakSira >= ADIM_SIRASI.length - 1} onClick={() => setSeciliAdim(ADIM_SIRASI[odakSira + 1])} className={DUGME_LAC}>Sonraki adım <ChevronRight className="w-4 h-4" /></button>
          </div>
        </section>
      )}

      {/* Bütün adımlar */}
      <section className="space-y-2">
        <BolumBasligi baslik="Bütün adımlar" sayi={`${yapilan}/${ADIM_SIRASI.length}`} renk="bitti" />
        <ol className={`${KART} p-1.5`}>
          {ADIM_SIRASI.map((id, n) => {
            const b = GDD_BOLUMLERI.find(x => x.id === id)!;
            const tamam = bolumYapildi(kayitBul(id));
            const bu = id === odak;
            return (
              <li key={id}>
                <button type="button" onClick={() => { setSeciliAdim(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-xl text-left cursor-pointer ${bu ? 'bg-[#F3EFE8] dark:bg-[#0B132B]' : 'hover:bg-[#F3EFE8]/60 dark:hover:bg-[#0B132B]/60'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold ${tamam ? 'bg-[#336659] text-white' : bu ? 'bg-[#F26B6F] text-white' : 'border border-[#BBA591] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}>
                    {tamam ? <Check className="w-4 h-4" /> : n + 1}
                  </span>
                  <span className={`flex-1 min-w-0 text-[14px] font-semibold ${YAZI}`}>{b.ad}</span>
                  {tamam ? <Rozet renk="bitti">dolu</Rozet> : <Rozet renk="bekliyor">boş</Rozet>}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Stüdyo aşaması ve işler */}
      <section className="space-y-2">
        <BolumBasligi baslik="Yapım aşaması ve işler" sayi={isler.length} renk="lacivert" />
        <p className={`text-[13px] ${IKINCIL}`}>
          Sektörün zinciri: her aşamanın bir çıktısı var, çıktı olmadan sonrakine geçilmez. Proje, işi en geride kalan aşamadadır
          {suAn ? <> — şu an <b className={YAZI}>{suAn.ad}</b>.</> : '. Henüz iş yok.'}
        </p>
        <div className="space-y-2">
          {ASAMALAR.map((a, i) => {
            const bunlar = isler.filter(x => String((x.metadata as any)?.asama || 'konsept') === a.id);
            const aktif = suAn?.id === a.id;
            return (
              <div key={a.id} className={`${KART} overflow-hidden ${aktif ? 'ring-2 ring-[#F26B6F]/60' : ''}`}>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-[12px] font-bold tabular-nums ${IKINCIL}`}>{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] font-semibold ${YAZI}`}>{a.ad} <span className={`text-[12px] font-normal ${IKINCIL}`}>{a.terim}</span></div>
                    <div className={`text-[12px] leading-snug ${IKINCIL}`}>{a.cikti}</div>
                  </div>
                  <span className={`text-[13px] tabular-nums font-bold ${bunlar.length ? 'text-[#D6484C] dark:text-[#F26B6F]' : IKINCIL}`}>{bunlar.length}</span>
                  <button type="button" onClick={() => { setYeniIs(a.id); setYeniBaslik(''); }} aria-label={`${a.ad} aşamasına iş ekle`} className={`w-11 h-11 rounded-full flex items-center justify-center ${IKINCIL} hover:text-[#F26B6F] cursor-pointer`}><Plus className="w-4 h-4" /></button>
                </div>
                {yeniIs === a.id && (
                  <form onSubmit={e => { e.preventDefault(); void isEkle(a.id); }} className="px-4 pb-3 flex items-center gap-2">
                    <input autoFocus value={yeniBaslik} onChange={e => setYeniBaslik(e.target.value)} placeholder="İşin adı"
                      className="flex-1 min-w-0 text-[14px] bg-[#F3EFE8] dark:bg-[#0B132B] text-[#0E1C4F] dark:text-[#F3EFE8] rounded-lg p-2.5 focus:outline-hidden" />
                    <button type="submit" disabled={!yeniBaslik.trim()} className={DUGME_LAC}>Ekle</button>
                    <button type="button" onClick={() => setYeniIs(null)} aria-label="Vazgeç" className={`w-11 h-11 flex items-center justify-center ${IKINCIL} cursor-pointer`}><X className="w-4 h-4" /></button>
                  </form>
                )}
                {bunlar.length > 0 && (
                  <ul className="border-t border-[#E4DCCD] dark:border-[#2C3C72]">
                    {bunlar.map(is => (
                      <li key={is.id} className="flex items-center gap-1 pl-4 pr-1 border-b last:border-b-0 border-[#E4DCCD]/70 dark:border-[#2C3C72]/50">
                        <span className={`flex-1 min-w-0 text-[13px] truncate ${YAZI}`}>{is.title}</span>
                        <button type="button" onClick={() => void tasi(is, -1)} aria-label="Bir aşama geri" className={`w-11 h-11 flex items-center justify-center ${IKINCIL} hover:text-[#F26B6F] cursor-pointer`}><ChevronLeft className="w-4 h-4" /></button>
                        <button type="button" onClick={() => void tasi(is, 1)} aria-label="Bir aşama ileri" className={`w-11 h-11 flex items-center justify-center ${IKINCIL} hover:text-[#F26B6F] cursor-pointer`}><ChevronRight className="w-4 h-4" /></button>
                        {onDeleteItem && <button type="button" onClick={() => void onDeleteItem(is.id)} aria-label="Sil" className={`w-11 h-11 flex items-center justify-center ${IKINCIL} hover:text-[#F26B6F] cursor-pointer`}><Trash2 className="w-4 h-4" /></button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  const gorunenFikir = katSuz ? fikirler.filter(f => (f.metadata as any)?.kategori === katSuz) : fikirler;
  const Mekanik = (
    <div className="space-y-5">
      <section className="space-y-3">
        <BolumBasligi
          baslik="Fikir notları"
          sayi={fikirler.length}
          ek={<button type="button" onClick={() => setFikirPenceresi('yeni')} className={DUGME_LAC}><Plus className="w-3.5 h-3.5" /> Fikir notu</button>}
        />
        {fikirler.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-4 px-4 lg:mx-0 lg:px-0">
            {['', ...FIKIR_KATEGORILERI].map(k => {
              const n = k ? fikirler.filter(f => (f.metadata as any)?.kategori === k).length : fikirler.length;
              if (k && !n) return null;
              return (
                <button key={k || 'hepsi'} type="button" onClick={() => setKatSuz(k)}
                  className={`shrink-0 min-h-11 lg:min-h-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border cursor-pointer whitespace-nowrap ${katSuz === k ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] border-transparent' : `bg-[#FAF8F5] dark:bg-[#13204A] border-[#CFC5B4] dark:border-[#2C3C72] ${IKINCIL}`}`}>
                  {k || 'Hepsi'} · {n}
                </button>
              );
            })}
          </div>
        )}
        {fikirler.length === 0 ? (
          <BosSatir yazi="Henüz fikir notu yok" onEkle={() => setFikirPenceresi('yeni')} />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {gorunenFikir.map(f => (
              <button key={f.id} type="button" onClick={() => setFikirPenceresi(f)} className={`${KART} p-3.5 text-left cursor-pointer hover:ring-2 hover:ring-[#F26B6F]/40`}>
                <div className="flex items-center gap-2">
                  <Rozet renk="bekliyor">{String((f.metadata as any)?.kategori || 'Diğer')}</Rozet>
                  <span className={`ml-auto text-[12px] ${IKINCIL}`}>{new Date(f.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className={`mt-1.5 text-[14px] font-semibold ${YAZI}`}>{f.title}</div>
                {f.notes && <div className={`mt-0.5 text-[13px] line-clamp-2 ${IKINCIL}`}>{f.notes}</div>}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <BolumBasligi baslik="Oynanış ve görünüş" sayi={`${MEKANIK_BOLUMLERI.filter(id => bolumYapildi(kayitBul(id))).length}/${MEKANIK_BOLUMLERI.length}`} renk="bitti" />
        <div className="grid gap-3 lg:grid-cols-2 items-start">{MEKANIK_BOLUMLERI.map(bolum)}</div>
      </section>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SayfaBasi baslik="Oyun">
        <button type="button" onClick={belgeIndir} className={DUGME_BOS} title="Künye, tasarım belgesi, fikir notları ve işler tek dosyada">
          <Download className="w-3.5 h-3.5" /> Oyun dosyasını indir
        </button>
        <button type="button" onClick={() => setNpcAcik(true)} className={DUGME_BOS}><UserPlus className="w-3.5 h-3.5" /> NPC yarat</button>
      </SayfaBasi>

      <SayfaRayi
        baslik="Oyun"
        bolumler={[
          { id: 'kunye', label: 'Künye ve konsept' },
          { id: 'surec', label: `Adım adım süreç · ${yapilan}/${ADIM_SIRASI.length}` },
          { id: 'mekanik', label: `Mekanikler ve notlar${fikirler.length ? ` · ${fikirler.length}` : ''}` }
        ]}
        aktifId={sekme}
        onSec={id => { setSekme(id as Sekme); window.scrollTo({ top: 0 }); }}
      />

      {sekme === 'kunye' && Kunye}
      {sekme === 'surec' && Surec}
      {sekme === 'mekanik' && Mekanik}

      {fikirPenceresi && (
        <FikirNotu
          key={fikirPenceresi === 'yeni' ? 'yeni' : fikirPenceresi.id}
          kayit={fikirPenceresi === 'yeni' ? undefined : fikirPenceresi}
          onKaydet={fikirKaydet}
          onSil={fikirPenceresi !== 'yeni' && onDeleteItem ? () => onDeleteItem(fikirPenceresi.id) : undefined}
          onKapat={() => setFikirPenceresi(null)}
        />
      )}

      {npcAcik && <NpcSihirbazi items={items} onAddItem={onAddItem} onKapat={() => setNpcAcik(false)} />}
    </div>
  );
};

export default OyunStudyo;
