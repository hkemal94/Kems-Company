import React, { useMemo, useState } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, UserPlus, FileText, Trash2, X
} from 'lucide-react';
import type { Item, AreaType } from '../../types';
import {
  ASAMALAR, asamaBul, asamaSayilari, oyunIsleri, gddBolumleri,
  GDD_BOLUMLERI, projeAsamasi
} from './OyunSureci';
import NpcSihirbazi from './NpcSihirbazi';
import { OyunVitrini } from './OyunVitrini';
import { GddBolumu } from './GddBolumu';
import { GDD_SECIMLERI, secilenler } from './OyunSureci';
import { SayfaRayi, type RayBolumu } from '../SayfaRayi';

/**
 * Oyun stüdyosu ekranı.
 *
 * Kemal: "Oyun bölümü yanlış, fazla simülasyon ağırlıklı; gerçek bir oyun
 * stüdyosu süreci gibi yürüsün." Eski ekran gün gün otel simülasyonu
 * tasarlıyordu — o iş silinmedi, "Simülasyon" sekmesinde duruyor. Burası
 * projenin kendisini yürüten yer:
 *
 *   Süreç    — sektörün zinciri, her aşamanın çıktısıyla
 *   İşler    — kart kart iş, aşamalar arasında ileri/geri
 *   Belge    — tasarım belgesinin bölümleri, başlık açılır, metni Kemal yazar
 *   NPC      — klavyesiz, çoktan seçmeli kişi yaratma
 *
 * Bu ekran hiçbir yere metin yazmıyor. Açtığı her şey boş açılıyor.
 */

const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'oy-vitrin', label: 'Tanıtım' },
  { id: 'oy-surec', label: 'Süreç' },
  { id: 'oy-isler', label: 'İşler' },
  { id: 'oy-belge', label: 'Tasarım belgesi' }
];

export interface OyunStudyoProps {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onSelectArea?: (area: AreaType, itemId?: string) => void;
  onDeleteItem?: (id: string) => Promise<void>;
}

export const OyunStudyo: React.FC<OyunStudyoProps> = ({
  items, onAddItem, onUpdateItem, onSelectArea, onDeleteItem
}) => {
  const isler = useMemo(() => oyunIsleri(items), [items]);
  const sayilar = useMemo(() => asamaSayilari(items), [items]);
  const suAn = useMemo(() => projeAsamasi(items), [items]);
  const belgeler = useMemo(() => gddBolumleri(items), [items]);
  /** Tıklamalı tasarım belgesinde yapılmış seçim sayısı / toplam */
  const gddSayim = useMemo(() => {
    let dolu = 0, toplam = 0;
    for (const [bolumId, secimler] of Object.entries(GDD_SECIMLERI)) {
      const k = belgeler.find(b => (b.metadata as any)?.bolumId === bolumId);
      for (const sc of secimler) { toplam++; if (k && secilenler(k.notes || '', sc).length) dolu++; }
    }
    return { dolu, toplam };
  }, [belgeler]);

  const [yeniIs, setYeniIs] = useState<string | null>(null);  // aşama kimliği
  const [yeniBaslik, setYeniBaslik] = useState('');
  const [npcAcik, setNpcAcik] = useState(false);
  const [acikAsama, setAcikAsama] = useState<string | null>(null);
  const [belgeYaziliyor, setBelgeYaziliyor] = useState<string | null>(null);

  const isEkle = async (asamaId: string) => {
    const baslik = yeniBaslik.trim();
    if (!baslik) return;
    await onAddItem({
      title: baslik,
      area: 'oyun',
      type: 'oyun_is',
      status: 'Fikir',
      priority: 'orta',
      tags: ['oyun', 'is'],
      links: [],
      notes: '',
      images: [],
      isProposal: false,
      archived: false,
      metadata: { asama: asamaId }
    });
    setYeniBaslik('');
    setYeniIs(null);
  };

  const tasi = async (is: Item, yon: 1 | -1) => {
    const simdiki = String((is.metadata as any)?.asama || 'konsept');
    const i = ASAMALAR.findIndex(a => a.id === simdiki);
    const hedef = ASAMALAR[Math.min(Math.max(i + yon, 0), ASAMALAR.length - 1)];
    if (hedef.id === simdiki) return;
    await onUpdateItem({
      ...is,
      metadata: { ...((is.metadata || {}) as any), asama: hedef.id },
      updatedAt: Date.now()
    });
  };

  // 29 Eylül, kural değişti: arşiv yok, iş kartı silinir
  const arsivle = async (is: Item) => {
    if (onDeleteItem) await onDeleteItem(is.id);
  };

  /** Tasarım belgesi bölümünü açar — boş, metin yazılmaz */
  const belgeAc = async (bolum: { id: string; ad: string; soru: string }, notlar = '') => {
    if (belgeYaziliyor) return;
    setBelgeYaziliyor(bolum.id);
    try {
      await onAddItem({
        title: bolum.ad,
        area: 'oyun',
        type: 'gdd_bolum',
        status: 'Fikir',
        priority: 'orta',
        tags: ['oyun', 'gdd'],
        links: [],
        notes: notlar,
        images: [],
        isProposal: false,
        archived: false,
        metadata: { bolumId: bolum.id, soru: bolum.soru }
      });
    } finally {
      setBelgeYaziliyor(null);
    }
  };

  const belgeYaz = async (kayit: Item, metin: string) => {
    await onUpdateItem({ ...kayit, notes: metin, updatedAt: Date.now() });
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="pb-4 border-b border-[#CFC5B4] dark:border-[#2C3C72] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sans font-bold text-xl text-[#0E1C4F] dark:text-[#F3EFE8] tracking-tight">
            Oyun Stüdyosu
          </h1>
          <p className="mt-1 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            {suAn
              ? <>Proje şu an <b>{suAn.ad}</b> aşamasında — en geride kalan iş oradan.</>
              : 'Henüz iş kartı yok. Süreç aşağıda; ilk kartı Konsept\'e ekleyerek başla.'}
          </p>
        </div>
        <button
          onClick={() => setNpcAcik(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono rounded-lg
                     border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C]
                     dark:text-[#A6B0C9] hover:border-[#F26B6F] cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" /> NPC yarat
        </button>
      </div>

      <SayfaRayi baslik="Oyun" bolumler={RAY_BOLUMLERI} />

      {/* --- 0 · TANITIM (Paket 5) ----------------------------------- */}
      <OyunVitrini items={items} asama={suAn} gddDolu={gddSayim.dolu} gddToplam={gddSayim.toplam} onAddItem={onAddItem} onUpdateItem={onUpdateItem} />

      {/* --- 1 · SÜREÇ ---------------------------------------------- */}
      <section id="oy-surec" className="scroll-mt-24">
        <h2 className="mb-3 text-[11px] font-mono font-bold uppercase tracking-[0.18em]
                       text-[#6A5E4C] dark:text-[#A6B0C9]">
          Süreç
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ASAMALAR.map((a, i) => {
            const aktif = suAn?.id === a.id;
            return (
              <div
                key={a.id}
                className="rounded-xl border p-3 bg-[#FAF8F5] dark:bg-[#13204A]"
                style={{ borderColor: aktif ? '#F26B6F' : '#CFC5B4' }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] text-[#6A5E4C] dark:text-[#A6B0C9]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`font-mono text-[15px] font-bold tabular-nums ${sayilar[a.id] ? 'text-[#F26B6F]' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
                  >
                    {sayilar[a.id]}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] mt-0.5">
                  {a.ad}
                  <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9]">
                    {a.terim}
                  </span>
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[#6A5E4C] dark:text-[#95A1C2]">
                  {a.cikti}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 2 · İŞLER ---------------------------------------------- */}
      <section id="oy-isler" className="scroll-mt-24">
        <h2 className="mb-3 text-[11px] font-mono font-bold uppercase tracking-[0.18em]
                       text-[#6A5E4C] dark:text-[#A6B0C9]">
          İşler
        </h2>
        <div className="space-y-2.5">
          {ASAMALAR.map(a => {
            const bunlar = isler.filter(
              i => String((i.metadata as any)?.asama || 'konsept') === a.id
            );
            const acik = acikAsama === a.id || bunlar.length > 0;
            return (
              <div
                key={a.id}
                className="rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72]
                           bg-[#FAF8F5] dark:bg-[#13204A] overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <button
                    onClick={() => setAcikAsama(acikAsama === a.id ? null : a.id)}
                    className="flex-1 text-left cursor-pointer"
                  >
                    <span className="text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
                      {a.ad}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
                      {bunlar.length}
                    </span>
                  </button>
                  <button
                    onClick={() => { setYeniIs(a.id); setYeniBaslik(''); }}
                    title={`${a.ad} aşamasına iş ekle`}
                    className="p-1 text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#F26B6F] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {yeniIs === a.id && (
                  <form
                    onSubmit={e => { e.preventDefault(); void isEkle(a.id); }}
                    className="px-4 pb-3 flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={yeniBaslik}
                      onChange={e => setYeniBaslik(e.target.value)}
                      placeholder="İşin adı"
                      className="flex-1 text-[12px] bg-white dark:bg-[#17345A] text-[#0E1C4F]
                                 dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72]
                                 rounded-lg p-2 focus:outline-hidden focus:border-[#F26B6F]"
                    />
                    <button
                      type="submit"
                      disabled={!yeniBaslik.trim()}
                      className="px-3 py-2 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72]
                                 text-[#F3EFE8] disabled:opacity-30 cursor-pointer"
                    >
                      Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => setYeniIs(null)}
                      className="p-1.5 text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#F26B6F] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {acik && bunlar.length > 0 && (
                  <ul className="border-t border-[#CFC5B4]/50 dark:border-[#2C3C72]">
                    {bunlar.map(is => (
                      <li
                        key={is.id}
                        className="flex items-center gap-2 px-4 py-2 border-b last:border-b-0
                                   border-[#CFC5B4]/30 dark:border-[#2C3C72]/50"
                      >
                        <span className="flex-1 min-w-0 text-[12px] text-[#0E1C4F]
                                         dark:text-[#F3EFE8] truncate">
                          {is.title}
                        </span>
                        <button
                          onClick={() => void tasi(is, -1)}
                          title="Bir aşama geri"
                          className="p-1 text-[#CFC5B4] hover:text-[#F26B6F] cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void tasi(is, 1)}
                          title="Bir aşama ileri"
                          className="p-1 text-[#CFC5B4] hover:text-[#F26B6F] cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void arsivle(is)}
                          title="Sil"
                          className="p-1 text-[#CFC5B4] hover:text-[#F26B6F] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- 3 · TASARIM BELGESİ ------------------------------------- */}
      <section id="oy-belge" className="scroll-mt-24">
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.18em]
                         text-[#6A5E4C] dark:text-[#A6B0C9]">
            Tasarım belgesi
          </h2>
          <span className="font-mono text-[10px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            {gddSayim.dolu}/{gddSayim.toplam} seçim · {belgeler.length}/{GDD_BOLUMLERI.length} bölüm açık
          </span>
        </div>
        <p className="mb-3 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] max-w-2xl">
          Tasarım kararlarını seçeneklere tıklayarak ver; seçimin bölümün
          metnine yazılır. Ad ve hikâye isteyen yerlerde seçenek yok — kutuyu
          sen dolduruyorsun.
        </p>
        <div className="grid gap-2.5 lg:grid-cols-2 items-start">
          {GDD_BOLUMLERI.map(b => (
            <GddBolumu
              key={b.id}
              bolum={b}
              kayit={belgeler.find(k => (k.metadata as any)?.bolumId === b.id)}
              onAc={notlar => belgeAc(b, notlar)}
              onYaz={belgeYaz}
            />
          ))}
        </div>
      </section>

      {npcAcik && (
        <NpcSihirbazi
          items={items}
          onAddItem={onAddItem}
          onKapat={() => setNpcAcik(false)}
        />
      )}
    </div>
  );
};

export default OyunStudyo;
