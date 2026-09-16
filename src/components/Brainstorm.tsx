import React, { useMemo, useRef, useState } from 'react';
import {
  Plus, ArrowRight, Archive, Clock, Inbox, Check
} from 'lucide-react';
import type { Item, ItemType, AreaType } from '../types';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

/**
 * Brainstorm — yeniden kuruldu.
 *
 * Kemal: "Brainstorm iyi bir fikir ama pratikte işe yaramıyor; yeniden
 * düşünülmeli."
 *
 * Eski ekran bir yapay zekâ fikir üreticisiydi: bağlam yazıyordun, sana
 * fikirler yazıyordu. İşe yaramamasının sebebi buydu — Kemal'in eksiği fikir
 * değil, kendi fikirlerini kaybetmemek. Üstelik 24. cevabında açıkça
 * "Sen bir şey yazma" dedi. Üreten ekranın burada işi yok.
 *
 * Yeni hâli bir gelen kutusu. Üç kural:
 *
 *  1. Girmek tek satır. Fikir aklına geldiği hızda yazılmalı, form
 *     doldurulmamalı.
 *  2. Her fikrin tek bir işi var: bir şeye dönüşmek. Dönüşünce kutudan
 *     çıkar — kişi, mekân, drop, yazı ya da oyun işi olur.
 *  3. Bekleyen fikir bayatlar. 30 günü geçenler ayrı durur: ya dönüştür,
 *     ya arşive kaldır. Kutuda sonsuza kadar duran fikir, kutuyu çöpe
 *     çevirir — eski ekranın asıl sorunu buydu.
 *
 * Hiçbir yere metin üretilmiyor: dönüşünce fikrin kendi cümlesi yeni kaydın
 * başlığı ve notu oluyor, üzerine bir şey eklenmiyor.
 */

const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'bs-kutu', label: 'Gelen kutusu' },
  { id: 'bs-bayat', label: 'Bekleyenler' },
  { id: 'bs-donusen', label: 'Dönüşenler' }
];

const BAYATLAMA_GUNU = 30;

/** Fikrin dönüşebileceği hedefler — evrenin gerçek tipleri */
const HEDEFLER: Array<{
  id: string; ad: string; tip: ItemType; alan: AreaType; durum: string; etiket: string[];
}> = [
  { id: 'kisi',   ad: 'Kişi',      tip: 'kisi',      alan: 'duzada', durum: 'Fikir',   etiket: ['duzada'] },
  { id: 'mekan',  ad: 'Mekân',     tip: 'mekân',     alan: 'duzada', durum: 'Fikir',   etiket: ['duzada'] },
  { id: 'olay',   ad: 'Olay',      tip: 'olay',      alan: 'duzada', durum: 'Fikir',   etiket: ['duzada'] },
  { id: 'drop',   ad: 'Drop',      tip: 'drop',      alan: 'merch',  durum: 'Konsept', etiket: ['merch', 'drop'] },
  { id: 'yazi',   ad: 'Blog yazısı', tip: 'blog_post', alan: 'blog', durum: 'Taslak',  etiket: ['blog'] },
  { id: 'oyunis', ad: 'Oyun işi',  tip: 'oyun_is',   alan: 'oyun',   durum: 'Fikir',   etiket: ['oyun', 'is'] }
];

function gunFarki(ms: number): number {
  return Math.floor((Date.now() - ms) / 86_400_000);
}

export interface BrainstormProps {
  items: Item[];
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export default function Brainstorm({
  items, onSelectItem, onUpdateItem, onAddItem
}: BrainstormProps) {
  const [metin, setMetin] = useState('');
  const [yaziliyor, setYaziliyor] = useState(false);
  const [donusturulen, setDonusturulen] = useState<string | null>(null);
  const [rapor, setRapor] = useState<string | null>(null);
  const girdi = useRef<HTMLInputElement | null>(null);

  const fikirler = useMemo(
    () => items
      // Günlük not da 'fikir' olarak kaydediliyor ama fikir değil —
      // gelen kutusunu kirletmesin.
      .filter(i => i.type === 'fikir' && !i.archived
        && !(i.metadata as any)?.donusenId
        && !(i.tags || []).includes('gunluk-not'))
      .sort((a, b) => b.createdAt - a.createdAt),
    [items]
  );

  const taze = useMemo(
    () => fikirler.filter(f => gunFarki(f.createdAt) < BAYATLAMA_GUNU),
    [fikirler]
  );
  const bayat = useMemo(
    () => fikirler.filter(f => gunFarki(f.createdAt) >= BAYATLAMA_GUNU),
    [fikirler]
  );
  const donusenler = useMemo(
    () => items
      .filter(i => i.type === 'fikir' && (i.metadata as any)?.donusenId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20),
    [items]
  );

  const ekle = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = metin.trim();
    if (!d || yaziliyor) return;
    setYaziliyor(true);
    try {
      await onAddItem({
        // Fikrin kendi cümlesi başlık oluyor; kısaltılmıyor, süslenmiyor
        title: d,
        area: 'brainstorm',
        type: 'fikir',
        status: 'Fikir',
        priority: 'orta',
        tags: ['fikir'],
        links: [],
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {}
      });
      setMetin('');
      girdi.current?.focus();
    } finally {
      setYaziliyor(false);
    }
  };

  /**
   * Fikri gerçek bir kayda çevirir.
   *
   * Fikir silinmiyor: dönüştüğü kaydın kimliğini taşıyarak "dönüşenler"e
   * geçiyor. Böylece bir fikrin nereye gittiği geriye dönük görülebiliyor.
   */
  const donustur = async (fikir: Item, hedefId: string) => {
    const h = HEDEFLER.find(x => x.id === hedefId);
    if (!h) return;
    const yeniKimlik = `${h.id}_${Date.now()}`;
    await onAddItem({
      title: fikir.title,
      area: h.alan,
      type: h.tip,
      status: h.durum,
      priority: fikir.priority,
      tags: [...h.etiket, 'fikirden'],
      links: [],
      notes: fikir.notes || '',
      images: [],
      isProposal: false,
      archived: false,
      metadata: {
        fikirKimligi: fikir.id,
        ...(h.id === 'oyunis' ? { asama: 'konsept' } : {})
      }
    });
    await onUpdateItem({
      ...fikir,
      metadata: {
        ...((fikir.metadata || {}) as any),
        donusenId: yeniKimlik,
        donusenTur: h.ad
      },
      updatedAt: Date.now()
    });
    setDonusturulen(null);
    setRapor(`"${fikir.title}" → ${h.ad} olarak açıldı.`);
  };

  const arsivle = async (f: Item) => {
    await onUpdateItem({ ...f, archived: true, updatedAt: Date.now() });
  };

  const FikirSatiri: React.FC<{ f: Item; bayatMi?: boolean }> = ({ f, bayatMi }) => {
    const acik = donusturulen === f.id;
    const gun = gunFarki(f.createdAt);
    return (
      <li
        className="rounded-xl border bg-[#FAF8F5] dark:bg-[#13204A] px-4 py-3"
        style={{ borderColor: bayatMi ? '#F26B6F66' : '#CFC5B4' }}
      >
        <div className="flex items-start gap-3">
          <span className="flex-1 min-w-0 text-[13px] text-[#1B2A4A] dark:text-[#F3EFE8]">
            {f.title}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-[#9A8C76] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {gun === 0 ? 'bugün' : `${gun} gün`}
          </span>
        </div>

        {acik ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {HEDEFLER.map(h => (
              <button
                key={h.id}
                onClick={() => void donustur(f, h.id)}
                className="px-2.5 py-1 text-[11px] font-mono rounded-lg border
                           border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C]
                           dark:text-[#A6B0C9] hover:border-[#F26B6F] hover:text-[#F26B6F]
                           cursor-pointer"
              >
                {h.ad}
              </button>
            ))}
            <button
              onClick={() => setDonusturulen(null)}
              className="px-2.5 py-1 text-[11px] font-mono text-[#9A8C76] cursor-pointer"
            >
              vazgeç
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => setDonusturulen(f.id)}
              className="flex items-center gap-1 text-[11px] font-mono text-[#F26B6F] cursor-pointer"
            >
              Şuna dönüştür <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => void arsivle(f)}
              className="flex items-center gap-1 text-[11px] font-mono text-[#9A8C76]
                         hover:text-[#F26B6F] cursor-pointer"
              title="Silinmez, arşive kalkar"
            >
              <Archive className="w-3 h-3" /> Arşive
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="pb-4 border-b border-[#CFC5B4] dark:border-[#2C3C72]">
        <h1 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8] italic">
          Fikirler
        </h1>
        <p className="mt-1 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9] max-w-2xl leading-relaxed">
          Gelen kutusu. Aklına geleni tek satır yaz, sonra bir gün gelip onu
          gerçek bir şeye dönüştür. Burada sana fikir üretilmiyor — eski ekran
          onu yapıyordu ve işe yaramıyordu.
        </p>
      </div>

      <SayfaRayi baslik="Fikirler" bolumler={RAY_BOLUMLERI} />

      {/* --- giriş --- */}
      <section id="bs-kutu" className="scroll-mt-24">
        <form onSubmit={ekle} className="flex items-center gap-2 mb-4">
          <input
            ref={girdi}
            value={metin}
            onChange={e => setMetin(e.target.value)}
            placeholder="Bir fikir yaz ve Enter'a bas…"
            className="flex-1 text-[13px] bg-white dark:bg-[#17345A] text-[#1B2A4A]
                       dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72]
                       rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-[#F26B6F]"
          />
          <button
            type="submit"
            disabled={!metin.trim() || yaziliyor}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-mono rounded-xl
                       bg-[#1B2A4A] text-[#F3EFE8] hover:opacity-90 disabled:opacity-30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Ekle
          </button>
        </form>

        {rapor && (
          <p className="mb-3 px-3 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A]
                        text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] flex items-center gap-1.5">
            <Check className="w-3 h-3 text-[#4A5E68]" /> {rapor}
          </p>
        )}

        {taze.length === 0 ? (
          <div className="flex items-center gap-2.5 px-4 py-6 rounded-xl border
                          border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A]">
            <Inbox className="w-4 h-4 text-[#CFC5B4] shrink-0" />
            <p className="text-[13px] text-[#6A5E4C] dark:text-[#A6B0C9]">
              Kutu boş. Bu iyi bir şey — dolmuş bir kutu, işlenmemiş fikir demek.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {taze.map(f => <FikirSatiri key={f.id} f={f} />)}
          </ul>
        )}
      </section>

      {/* --- bayatlayanlar --- */}
      {bayat.length > 0 && (
        <section id="bs-bayat" className="scroll-mt-24">
          <h2 className="mb-1 text-[11px] font-mono font-bold uppercase tracking-[0.18em]
                         text-[#6A5E4C] dark:text-[#A6B0C9]">
            {BAYATLAMA_GUNU} günden uzun bekleyenler · {bayat.length}
          </h2>
          <p className="mb-3 text-[11px] text-[#9A8C76] dark:text-[#6E7CA0]">
            Ya bir şeye dönüştür ya arşive kaldır. Kutuda duran fikir iş değil,
            yük.
          </p>
          <ul className="space-y-2">
            {bayat.map(f => <FikirSatiri key={f.id} f={f} bayatMi />)}
          </ul>
        </section>
      )}

      {/* --- dönüşenler --- */}
      {donusenler.length > 0 && (
        <section id="bs-donusen" className="scroll-mt-24">
          <h2 className="mb-3 text-[11px] font-mono font-bold uppercase tracking-[0.18em]
                         text-[#6A5E4C] dark:text-[#A6B0C9]">
            Dönüşenler
          </h2>
          <ul className="space-y-1.5">
            {donusenler.map(f => (
              <li
                key={f.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border
                           border-[#CFC5B4]/60 dark:border-[#2C3C72]/60"
              >
                <span className="flex-1 min-w-0 text-[12px] text-[#6A5E4C]
                                 dark:text-[#A6B0C9] truncate">
                  {f.title}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[#F26B6F]">
                  → {String((f.metadata as any)?.donusenTur || '')}
                </span>
                <button
                  onClick={() => onSelectItem(f.id)}
                  className="shrink-0 font-mono text-[10px] text-[#9A8C76] hover:text-[#F26B6F] cursor-pointer"
                >
                  aç
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
