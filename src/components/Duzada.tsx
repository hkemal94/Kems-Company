import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { HaritaBakisi } from './harita/DuzadaHarita';
import { AlertTriangle, Maximize2, Minimize2, Car, Moon, Snowflake } from 'lucide-react';
import { ATMOSFER_KAPALI, type AtmosferAyari } from './harita/atmosfer';
import { Item } from '../types';
import { SayfaBasi } from './kabuk/SayfaBasi';
import { WikiShell } from './wiki/WikiShell';

import { useHaritaDuzeni } from '../lib/haritaDuzeni';
import {
  haritadaAra, maddeTohumu, kunyeSatiri, type HaritaKunyesi
} from '../lib/haritaMaddesi';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

/** Düzada'nın üç yüzü — Viki, Harita ve Evren Raporu */
const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'wiki', label: 'Düzada Wiki' },
  { id: 'harita', label: 'Harita ve Kurucu' },
  { id: 'rapor', label: 'Evren Raporu' }
];

// Rapor sekmesi açılınca yüklenir (sayfa açılışı hafif kalsın diye)
const DuzadaRaporu = lazy(() =>
  import('./duzada/DuzadaRaporu').then(m => ({ default: m.DuzadaRaporu }))
);

// MapLibre haritası ~1 MB'lık bir paket (motor + arazi verisi). Sekme
// açılmadan indirilmesin diye tembel yükleniyor.
const DuzadaHarita = lazy(() =>
  import('./harita/DuzadaHarita').then(m => ({ default: m.DuzadaHarita }))
);
// Kurucu (şehir kurucu): harita verisini kullanır, sekme açılınca yüklenir
const Kurucu = lazy(() =>
  import('./kurucu/Kurucu').then(m => ({ default: m.Kurucu }))
);

interface DuzadaProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  /** Menüden doğrudan bir sekmeye gelmek için (telefonda "Harita", "Kurucu", "Rapor") */
  istek?: { sekme: 'wiki' | 'harita' | 'kurucu' | 'rapor'; n: number } | null;
}


export default function Duzada({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  istek = null
}: DuzadaProps) {
  // Harita düzeni (H1): elle yapılan harita düzenlemeleri — duzada/haritaDuzeni
  const haritaDuzeni = useHaritaDuzeni();
  // H2: harita sekmesinde görüntüleme ↔ düzenleme
  const [haritaDuzenleniyor, setHaritaDuzenleniyor] = useState(false);
  // Harita ve Kurucu tek ekran: 2D çalışma, 3D bakış (29 Eylül)
  const [haritaUc, setHaritaUc] = useState(false);
  // 2D ↔ 3D geçişinde kamera aynı yere baksın
  const haritaBakisi = useRef<HaritaBakisi | null>(null);
  const bakisiTut = useCallback((b: HaritaBakisi) => { haritaBakisi.current = b; }, []);

  /**
   * Tam ekran (30 Eylül, Kemal: "tam ekrana geçiremiyorum"). Tarayıcı
   * destekliyorsa gerçek tam ekran; desteklemiyorsa (iPhone) harita bütün
   * pencereyi kaplar. Esc ya da düğme ile çıkılır.
   */
  const haritaKabi = useRef<HTMLDivElement>(null);

  /**
   * Trafik, saat, mevsim (30 Eylül): sitede hep açık; KKM'de bu düğmelerle.
   * Seçim bu tarayıcıda hatırlanır (kayda yazılmaz).
   */
  const [atmosfer, setAtmosfer] = useState<AtmosferAyari>(() => {
    try { return { ...ATMOSFER_KAPALI, ...JSON.parse(localStorage.getItem('kems_harita_atmosfer') || '{}') }; } catch { return ATMOSFER_KAPALI; }
  });
  const atmosferDegistir = (k: keyof AtmosferAyari) => setAtmosfer(a => {
    const y = { ...a, [k]: !a[k] };
    try { localStorage.setItem('kems_harita_atmosfer', JSON.stringify(y)); } catch { /* yok */ }
    return y;
  });
  const [tamEkran, setTamEkran] = useState(false);
  const tamEkranDegistir = useCallback(() => {
    const el = haritaKabi.current;
    if (!tamEkran) {
      setTamEkran(true);
      try { void el?.requestFullscreen?.().catch(() => { /* kaplama yeter */ }); } catch { /* yok */ }
    } else {
      setTamEkran(false);
      try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* yok */ }
    }
  }, [tamEkran]);
  useEffect(() => {
    const cikti = () => { if (!document.fullscreenElement) setTamEkran(false); };
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') setTamEkran(false); };
    document.addEventListener('fullscreenchange', cikti);
    window.addEventListener('keydown', tus);
    return () => { document.removeEventListener('fullscreenchange', cikti); window.removeEventListener('keydown', tus); };
  }, []);
  // Harita kutusu büyüyünce çizim yeniden ölçülsün
  useEffect(() => { const z = setTimeout(() => window.dispatchEvent(new Event('resize')), 60); return () => clearTimeout(z); }, [tamEkran]);

  const gorunumDugmesi = (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F5]/95 dark:bg-[#13204A]/95 border border-[#CFC5B4] dark:border-[#2C3C72] shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)]">
      <span className="hidden sm:block px-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#6A5E4C] dark:text-[#A6B0C9]">Düzada</span>
      {([['2d', '2D · kur'], ['3d', '3D · bak']] as const).map(([id, ad]) => (
        <button key={id} type="button" onClick={() => setHaritaUc(id === '3d')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer ${(id === '3d') === haritaUc ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}>
          {ad}
        </button>
      ))}
      <button type="button" onClick={tamEkranDegistir} title={tamEkran ? 'Tam ekrandan çık (Esc)' : 'Tam ekran'} aria-label={tamEkran ? 'Tam ekrandan çık' : 'Tam ekran'}
        className="ml-0.5 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer">
        {tamEkran ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{tamEkran ? 'Küçült' : 'Tam ekran'}</span>
      </button>
    </div>
  );

  // Navigation / Tabs inside Düzada
  // Kurucu artık haritanın kendisi (29 Eylül): 'kurucu' isteği haritayı açar
  const [activeTab, setActiveTab] = useState<'wiki' | 'harita' | 'rapor'>(istek?.sekme === 'kurucu' ? 'harita' : istek?.sekme ?? 'wiki');
  useEffect(() => { if (istek) setActiveTab(istek.sekme === 'kurucu' ? 'harita' : istek.sekme); }, [istek?.n]);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  /**
   * Haritadaki bir yapı/mahalle tıklandığında ilgili arşiv maddesini açar.
   *
   * Bina `wikiId`'leri madde kimlikleriyle birebir aynı (kemskoy_hotel gibi).
   * Mahalleler ise haritada `yer_merkez`, arşivde `region_merkez` diye
   * geçiyor; o yüzden kimlik tutmazsa bölge anahtarı üzerinden aranıyor.
   */
  const sadelestir = (s: string) =>
    s
      .toLocaleLowerCase('tr')
      .replace(/[çğıöşü]/g, c => 'cgiosu'['çğıöşü'.indexOf(c)])
      .replace(/[^a-z0-9]/g, '');

  /** Haritadan gelip madde bulunamayınca açılan kutu (W1) */
  const [eksikMadde, setEksikMadde] = useState<HaritaKunyesi | null>(null);
  const [maddeKuruluyor, setMaddeKuruluyor] = useState(false);

  const haritaMaddesiniAc = (wikiId: string) => {
    // Sonradan bağlanan kayıt (Neyin Eksik → "Kayda bağla") da bulunur
    let hedef = items.find(it => it.id === wikiId) || items.find(it => !it.archived && it.metadata?.haritaWikiId === wikiId);
    if (!hedef && wikiId.startsWith('yer_')) {
      const anahtar = wikiId.slice(4); // merkez, liman, iskele, ciftlik, stadyum
      // Arşivdekiler atlanır: W1'de kalkan eski mahalle kayıtları bulunmasın
      const bolgeler = items.filter(it => it.area === 'duzada' && it.type === 'yer' && !it.archived);
      hedef =
        bolgeler.find(it => sadelestir(it.metadata?.region || '') === anahtar) ||
        bolgeler.find(it => sadelestir(it.id) === `region${anahtar}`) ||
        bolgeler.find(it => sadelestir(it.title).startsWith(anahtar.slice(0, 4)));
    }
    if (hedef) {
      setActiveTab('wiki');
      onSelectItem(hedef.id);
      return;
    }
    // W1: madde yok. Eskiden burada sessizce hiçbir şey olmuyordu.
    // Haritada karşılığı varsa maddeyi kurmayı teklif et.
    const kunye = haritadaAra(wikiId);
    if (kunye) setEksikMadde(kunye);
  };

  const eksikMaddeyiKur = async () => {
    if (!eksikMadde || maddeKuruluyor) return;
    setMaddeKuruluyor(true);
    try {
      await onAddItem(maddeTohumu(eksikMadde));
      setActiveTab('wiki');
      onSelectItem(eksikMadde.wikiId);
      setEksikMadde(null);
    } finally {
      setMaddeKuruluyor(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sade başlık (1 Ekim, K-2): sekmeler yalnız sayfa rayında; tutarlılık denetimi stüdyoda */}
      <SayfaBasi baslik="Düzada" />

      <SayfaRayi
        baslik="Düzada"
        bolumler={RAY_BOLUMLERI}
        aktifId={activeTab}
        onSec={id => setActiveTab(id as typeof activeTab)}
      />

      {/*
        HARİTA VE KURUCU (H, 29 Eylül) — tek ekran. Kemal: "Düzada Haritası
        ve Kurucu kısmını birbirine entegre et; city builder oyunlar gibi
        kontrol edebileceğim bir şey." 2D: çalışma ekranı (araçlar altta).
        3D: aynı ada eğik bakışla, yapılar kat sayısıyla yükselir.
      */}
      {activeTab === 'harita' && (
        haritaDuzeni.ilkYukleme ? (
          <div ref={haritaKabi} className={tamEkran ? 'fixed inset-0 z-[80] bg-[#1C4E8C]' : ''}>
          <Suspense fallback={<div className="h-[80vh] flex items-center justify-center rounded-2xl bg-[#1C4E8C] font-mono text-xs text-[#F3EFE8]">Harita yükleniyor…</div>}>
            {haritaUc ? (
              <div className="relative">
                <DuzadaHarita
                  className={tamEkran ? 'h-[100dvh] overflow-hidden' : 'h-[calc(100dvh-14.5rem)] sm:h-[calc(100vh-11rem)] min-h-[460px] sm:min-h-[520px] rounded-2xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72]'}
                  onSelect={haritaMaddesiniAc}
                  duzen={haritaDuzeni.duzen}
                  bakis={haritaBakisi.current}
                  onBakis={bakisiTut}
                  atmosfer={atmosfer}
                />
                <div className="absolute left-3 top-3 z-10">{gorunumDugmesi}</div>
                {/* Atmosfer düğmeleri sol altta: üstteki ada kartıyla çakışmasın */}
                <div className="absolute left-3 bottom-3 z-10">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F5]/95 dark:bg-[#13204A]/95 border border-[#CFC5B4] dark:border-[#2C3C72] shadow-[0_8px_24px_-12px_rgba(14,28,79,0.5)]">
                    {([['trafik', 'Trafik', Car], ['saat', 'Saat', Moon], ['mevsim', 'Mevsim', Snowflake]] as const).map(([k, ad, Ikon]) => (
                      <button key={k} type="button" onClick={() => atmosferDegistir(k)} aria-pressed={atmosfer[k]} aria-label={ad}
                        title={k === 'trafik' ? 'Araçlar, tekneler, feribot' : k === 'saat' ? 'Gerçek saate göre gündüz / gece' : 'Takvime göre yaz / kış'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer ${atmosfer[k] ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white' : 'text-[#6A5E4C] dark:text-[#A6B0C9]'}`}>
                        <Ikon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{ad}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Kurucu
                className={tamEkran ? 'h-[100dvh] !rounded-none !border-0' : 'h-[calc(100dvh-14.5rem)] sm:h-[calc(100vh-11rem)] min-h-[460px] sm:min-h-[520px]'}
                duzen={haritaDuzeni.duzen}
                kaydet={haritaDuzeni.kaydet}
                durum={haritaDuzeni.durum}
                items={items}
                onMaddeAc={id => { setActiveTab('wiki'); onSelectItem(id); }}
                ustSol={gorunumDugmesi}
                bakis={haritaBakisi.current}
                onBakis={bakisiTut}
              />
            )}
          </Suspense>
          </div>
        ) : (
          <div className="h-[80vh] flex items-center justify-center rounded-2xl bg-[#1C4E8C] font-mono text-xs text-[#F3EFE8]">Kayıtlı düzen okunuyor…</div>
        )
      )}


      {/* VIEW 1.5: WIKI MODU — yeni wiki katmanı (src/components/wiki) */}
      {activeTab === 'wiki' && (
        <WikiShell
          items={items}
          selectedId={activeItemId}
          onSelect={onSelectItem}
          onEdit={(id) => {
            setActiveTab('wiki');
            onSelectItem(id);
          }}
          onHaritayaGit={() => setActiveTab('harita')}
          onUpdateItem={onUpdateItem}
          onAddItem={onAddItem}
          onRaporAc={() => setActiveTab('rapor')}
          onSitede={(it, acik) => {
            // Yalnız Kemal basınca yazılır. Kayıt eskisinin üstüne eklenerek
            // yazıldığı için alanı silmek işe yaramıyor; kapatınca false yazılır.
            void onUpdateItem({ ...it, metadata: { ...(it.metadata || {}), sitede: acik } as Item['metadata'], updatedAt: Date.now() });
          }}
        />
      )}

      {/* VIEW 3: EVREN RAPORU — kapsamlı, yazdırılabilir resmi Düzada raporu */}
      {activeTab === 'rapor' && (
        <Suspense fallback={<div className="h-48 flex items-center justify-center font-mono text-xs text-[#6A5E4C] dark:text-[#A6B0C9] animate-pulse">Rapor hazırlanıyor…</div>}>
          <DuzadaRaporu
            items={items}
            onMaddeSec={haritaMaddesiniAc}
            onHaritayaGit={() => setActiveTab('harita')}
          />
        </Suspense>
      )}

      {/* Custom Confirm Modal for iframe environment safety */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-[#12224A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="font-sans font-bold text-lg text-stone-800 dark:text-[#F3EFE8] tracking-tight">{confirmModal.title}</h3>
            </div>
            
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {confirmModal.message}
            </p>
            
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#17345A] dark:hover:bg-[#17345A]/80 text-stone-700 dark:text-[#A6B0C9] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await action();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Eminim, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* W1 · Haritadaki yapının maddesi yok — kurmayı teklif et */}
      {eksikMadde && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
          onClick={() => setEksikMadde(null)}
        >
          <div
            className="bg-white dark:bg-[#12224A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="font-sans font-bold text-lg text-stone-800 dark:text-[#F3EFE8] tracking-tight">
                {eksikMadde.ad}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-stone-500 dark:text-[#95A1C2]">
                {kunyeSatiri(eksikMadde)}
              </p>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Bu yapının henüz wiki maddesi yok. Haritadaki bilgilerle boş bir
              künye açayım mı? Ad, mahalle, kat ve rakım haritadan gelir;
              metni sen yazarsın.
            </p>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => setEksikMadde(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-[#17345A] dark:hover:bg-[#17345A]/80 text-stone-700 dark:text-[#A6B0C9] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Şimdi değil
              </button>
              <button
                onClick={eksikMaddeyiKur}
                disabled={maddeKuruluyor}
                className="px-4 py-2 bg-[#0E1C4F] dark:bg-[#2C3C72] hover:opacity-90 disabled:opacity-40 text-[#F3EFE8] rounded-lg text-xs font-semibold font-mono cursor-pointer transition-opacity"
              >
                {maddeKuruluyor ? 'Kuruluyor…' : 'Maddeyi aç'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
