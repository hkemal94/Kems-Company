import React, { useEffect, useMemo, useState } from 'react';
import { Menu, X, Globe, UserRound, Search, ShoppingBag, ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { Item } from '../../types';
import { DuzadaHarita } from '../harita/DuzadaHarita';
import { useHaritaDuzeni } from '../../lib/haritaDuzeni';
import { TYPE_LABELS } from '../wiki/wikiSchema';

/**
 * Site önizlemesi (29 Eylül gece). kems.company'nin ilk hâli; şimdilik
 * yalnız KKM içinde, tam sayfa (açılır pencere değil — Kemal). Adres
 * çubuğunda `#site`; geri tuşu çalışır.
 *
 * Kemal'in kararları:
 *   - Anasayfa: canlı 3D harita yavaşça döner (manzara videosu gelene
 *     kadar); ortada yarı saydam etiket.
 *   - Sol üstte menü: Dükkân · Keşfet. Menü adları Türkçe.
 *   - Sağ üstte dil, hesap, arama, dükkân. Yalnız arama çalışır; diğerleri
 *     soluk.
 *   - Dükkân sekmesi Merch'teki droplardan gelir; mağaza bağlanana kadar
 *     soluk.
 *   - Sitede yalnız Kemal'in "Sitede göster" dediği maddeler görünür.
 * Keşfet sayfaları sonraki adımlarda; şimdilik "yakında".
 */

type SiteSayfasi = 'ana' | 'duzada' | 'viki' | 'urunler' | 'haberler' | 'projeler' | 'hakkinda' | 'iletisim' | 'ara';

const KESFET: Array<{ id: SiteSayfasi; ad: string; alt: string }> = [
  { id: 'duzada', ad: 'Düzada', alt: 'ada haritası' },
  { id: 'viki', ad: 'Viki', alt: 'evrenin maddeleri' },
  { id: 'urunler', ad: 'Ürünler', alt: 'droplar ve hikâyeleri' },
  { id: 'haberler', ad: 'Haberler', alt: 'blog ve bülten' },
  { id: 'projeler', ad: 'Projeler', alt: 'oyunlar, diğer işler' },
  { id: 'hakkinda', ad: 'Hakkında', alt: '' },
  { id: 'iletisim', ad: 'İletişim', alt: 'hesaplar, e-posta' }
];

/** `#site/viki` → 'viki'; tanınmayan her şey anasayfa */
const hashtenSayfa = (): SiteSayfasi => {
  const p = (typeof location !== 'undefined' ? location.hash : '').replace(/^#site\/?/, '').split('/')[0];
  return (['ara', ...KESFET.map(k => k.id)] as string[]).includes(p) ? p as SiteSayfasi : 'ana';
};
const sayfayaGit = (s: SiteSayfasi) => { location.hash = s === 'ana' ? 'site' : `site/${s}`; };

/** Sitede gösterilen maddeler: yalnız Kemal'in işaretledikleri */
export const sitedekiMaddeler = (items: Item[]) =>
  items.filter(i => i.metadata?.sitede === true && !i.archived && !i.isProposal);

const trKucuk = (s: string) => s.toLocaleLowerCase('tr');

interface Props {
  items: Item[];
  /** KKM'ye dön */
  onKapat: () => void;
}

export const Site: React.FC<Props> = ({ items, onKapat }) => {
  const [sayfa, setSayfa] = useState<SiteSayfasi>(hashtenSayfa);
  const [menuAcik, setMenuAcik] = useState(false);
  const [sekme, setSekme] = useState<'kesfet' | 'dukkan'>('kesfet');
  const [aranan, setAranan] = useState('');
  const { duzen } = useHaritaDuzeni();

  useEffect(() => {
    const degisti = () => { setSayfa(hashtenSayfa()); setMenuAcik(false); };
    window.addEventListener('hashchange', degisti);
    return () => window.removeEventListener('hashchange', degisti);
  }, []);

  useEffect(() => {
    if (!menuAcik) return;
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAcik(false); };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [menuAcik]);

  const droplar = useMemo(() => items.filter(i => i.type === 'drop' && !i.archived && !i.isProposal)
    .sort((a, b) => a.title.localeCompare(b.title, 'tr')), [items]);
  const sitedekiler = useMemo(() => sitedekiMaddeler(items), [items]);
  const sonuclar = useMemo(() => {
    const q = trKucuk(aranan.trim());
    return sitedekiler.filter(i => !q || trKucuk(i.title).includes(q) || trKucuk(i.notes || '').includes(q)).slice(0, 30);
  }, [sitedekiler, aranan]);

  const ana = sayfa === 'ana';
  const baslik = KESFET.find(k => k.id === sayfa);

  const simge = `w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-full flex items-center justify-center border backdrop-blur-md ${ana ? 'bg-[#0E1C4F]/35 border-[#F3EFE8]/25 text-[#F3EFE8]' : 'bg-[#0E1C4F] border-transparent text-[#F3EFE8]'}`;

  return (
    <div className="fixed inset-0 overflow-hidden font-sans bg-[#1C4E8C] text-[#F3EFE8]">
      {/* ---- anasayfa: dönen ada ---- */}
      {ana && (
        <>
          <DuzadaHarita vitrin duzen={duzen} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(14,28,79,.45),rgba(14,28,79,0)_28%,rgba(14,28,79,0)_70%,rgba(14,28,79,.5))]" />
          <div className="absolute left-1/2 top-[72%] sm:top-1/2 -translate-x-1/2 -translate-y-1/2 text-center px-7 sm:px-10 pt-5 sm:pt-6 pb-4 sm:pb-5 rounded-[18px] bg-[#F3EFE8]/80 backdrop-blur-md text-[#0E1C4F] shadow-[0_30px_60px_-30px_rgba(14,28,79,.6)] max-w-[86vw]">
            <div className="font-extrabold text-[30px] sm:text-[40px] leading-none tracking-tight">KEMS</div>
            <div className="mx-auto mt-1.5 w-max bg-[#F26B6F] text-white text-[11px] sm:text-[13px] font-bold tracking-[0.32em] pl-3.5 pr-2.5 py-0.5">COMPANY</div>
            <div className="mt-3.5 text-[14px] font-semibold">Made with Culture</div>
            <div className="mt-1 text-[11px] tracking-[0.2em] uppercase opacity-70">Est. 2024 · Düzada, TR</div>
          </div>
        </>
      )}

      {/* ---- iç sayfalar ---- */}
      {!ana && (
        <main className="absolute inset-0 overflow-y-auto bg-[#F3EFE8] text-[#0E1C4F] pt-24 sm:pt-28 pb-24 px-4 sm:px-10">
          <div className="max-w-3xl mx-auto">
            {sayfa === 'ara' ? (
              <>
                <h1 className="text-[34px] sm:text-[44px] font-bold tracking-tight">Ara</h1>
                <input
                  autoFocus
                  value={aranan}
                  onChange={e => setAranan(e.target.value)}
                  placeholder="Madde, yer, kişi…"
                  className="mt-5 w-full text-[17px] bg-white border border-[#CFC5B4] rounded-xl px-4 py-3 focus:outline-hidden focus:border-[#F26B6F]"
                />
                <div className="mt-5 divide-y divide-[#E4DCCD]">
                  {sitedekiler.length === 0 && (
                    <p className="py-6 text-[14px] text-[#6A5E4C]">
                      Sitede henüz madde yok. KKM'de bir viki maddesini açıp "Sitede göster"e basınca burada aranır.
                    </p>
                  )}
                  {sitedekiler.length > 0 && sonuclar.length === 0 && <p className="py-6 text-[14px] text-[#6A5E4C]">Bulunamadı.</p>}
                  {sonuclar.map(i => (
                    <button key={i.id} type="button" onClick={() => sayfayaGit('viki')} className="w-full text-left py-3.5 flex items-baseline justify-between gap-3 hover:text-[#D6484C] cursor-pointer">
                      <span className="text-[18px] font-semibold">{i.title}</span>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#6A5E4C]">{TYPE_LABELS[i.type] || i.type}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6A5E4C]">{baslik?.alt || 'Kems Company'}</div>
                <h1 className="mt-1 text-[34px] sm:text-[44px] font-bold tracking-tight">{baslik?.ad}</h1>
                <p className="mt-4 text-[15px] text-[#6A5E4C]">Bu sayfa yakında.</p>
                {sayfa === 'viki' && sitedekiler.length > 0 && (
                  <p className="mt-2 text-[13px] text-[#6A5E4C]">Sitede gösterilmeye hazır {sitedekiler.length} madde var.</p>
                )}
              </>
            )}
          </div>
        </main>
      )}

      {/* ---- üst çubuk ---- */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between gap-3 px-3.5 sm:px-7 py-3.5 sm:py-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMenuAcik(true)} title="Menü" className={`${simge} cursor-pointer`}><Menu className="w-5 h-5" /></button>
          {!ana && (
            <button type="button" onClick={() => sayfayaGit('ana')} className="font-extrabold text-[17px] tracking-tight text-[#0E1C4F] cursor-pointer">KEMS COMPANY</button>
          )}
        </div>
        <div className="flex gap-1.5 sm:gap-2.5">
          <span title="Dil · yakında" className={`${simge} opacity-40`}><Globe className="w-5 h-5" /></span>
          <span title="Hesap · yakında" className={`${simge} opacity-40`}><UserRound className="w-5 h-5" /></span>
          <button type="button" onClick={() => sayfayaGit('ara')} title="Ara" className={`${simge} cursor-pointer`}><Search className="w-5 h-5" /></button>
          <span title="Dükkân · mağaza bağlanınca" className={`${simge} opacity-40`}><ShoppingBag className="w-5 h-5" /></span>
        </div>
      </header>

      {/* ---- menü ---- */}
      {menuAcik && (
        <>
          <div className="absolute inset-0 z-20 bg-[#0E1C4F]/35" onClick={() => setMenuAcik(false)} />
          <nav className="absolute inset-y-0 left-0 z-30 w-full sm:w-[380px] bg-[#0E1C4F] text-[#F3EFE8] flex flex-col px-6 sm:px-7 py-5 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => { setMenuAcik(false); sayfayaGit('ana'); }} className="font-extrabold text-[18px] cursor-pointer">KEMS COMPANY</button>
              <button type="button" onClick={() => setMenuAcik(false)} title="Kapat" className="w-10 h-10 rounded-full border border-[#F3EFE8]/25 flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 mt-8">
              {(['dukkan', 'kesfet'] as const).map(s => (
                <button key={s} type="button" onClick={() => setSekme(s)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold tracking-[0.14em] uppercase border cursor-pointer ${sekme === s ? 'bg-[#F3EFE8] text-[#0E1C4F] border-transparent' : 'border-[#F3EFE8]/25 text-[#F3EFE8]/70'}`}>
                  {s === 'dukkan' ? 'Dükkân' : 'Keşfet'}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-col overflow-y-auto">
              {sekme === 'kesfet' && KESFET.map(k => (
                <button key={k.id} type="button" onClick={() => sayfayaGit(k.id)}
                  className={`flex items-baseline justify-between gap-3 py-3 border-b border-[#F3EFE8]/15 text-left text-[20px] sm:text-[22px] font-semibold hover:text-[#F26B6F] cursor-pointer ${sayfa === k.id ? 'text-[#F26B6F]' : ''}`}>
                  {k.ad}<small className="text-[11px] font-medium opacity-55">{k.alt}</small>
                </button>
              ))}
              {sekme === 'dukkan' && (droplar.length === 0
                ? <p className="text-[13px] opacity-60 py-3">Merch'te drop yok.</p>
                : droplar.map(d => (
                  <span key={d.id} title="Mağaza bağlanınca açılır" className="flex items-baseline justify-between gap-3 py-3 border-b border-[#F3EFE8]/15 text-[20px] sm:text-[22px] font-semibold opacity-45">
                    {d.title}<small className="text-[11px] font-medium inline-flex items-center gap-0.5">drop <ArrowUpRight className="w-3 h-3" /></small>
                  </span>
                )))}
            </div>
            <p className="mt-auto pt-4 text-[11px] opacity-55 leading-relaxed">
              {sekme === 'dukkan'
                ? 'Dükkân dış mağazaya gider. Mağaza henüz bağlanmadı; o zamana kadar soluk durur.'
                : 'Kems Company · Est. 2024 · Düzada, TR'}
            </p>
          </nav>
        </>
      )}

      {/* ---- KKM'ye dönüş: yalnız önizlemede ---- */}
      <button type="button" onClick={onKapat} className="absolute left-3.5 sm:left-4 bottom-3.5 sm:bottom-4 z-10 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[#0E1C4F]/75 text-[#F3EFE8] px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#0E1C4F]">
        <ArrowLeft className="w-3.5 h-3.5" /> KKM'ye dön · önizleme
      </button>
    </div>
  );
};

export default Site;
