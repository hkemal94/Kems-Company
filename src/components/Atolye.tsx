import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Maximize2, Minimize2, Car, Moon, Snowflake } from 'lucide-react';
import { isaretle } from '../lib/olcumler';
import type { HaritaBakisi } from './harita/DuzadaHarita';
import { ATMOSFER_KAPALI, type AtmosferAyari } from './harita/atmosfer';
import type { Item } from '../types';
import { SayfaBasi } from './kabuk/SayfaBasi';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';
import { useHaritaDuzeni } from '../lib/haritaDuzeni';
import { useHaritaMaddesi } from './duzada/HaritaMaddesi';

/**
 * Atölye (4. gece, 7 Ekim; vvd'den): evrenin çalışma araçları tek bölümde.
 * Şimdilik Harita ve Kurucu (29 Eylül'den beri tek ekran: 2D kur, 3D bak);
 * bağ ağı, soy ağacı ve tuval geldikleri gece raya eklenir (Kemal:
 * "görünmesin"). Düzada viki ve Evren Raporu olarak kaldı.
 */
const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'harita', label: 'Harita ve Kurucu' }
];

// MapLibre haritası ~1 MB'lık bir paket (motor + arazi verisi); 3D'ye geçince indirilir
const DuzadaHarita = lazy(() =>
  import('./harita/DuzadaHarita').then(m => ({ default: m.DuzadaHarita }))
);
// Kurucu (şehir kurucu): harita verisini kullanır, sayfa açılınca yüklenir
const Kurucu = lazy(() =>
  import('./kurucu/Kurucu').then(m => ({ default: m.Kurucu }))
);

interface AtolyeProps {
  items: Item[];
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  /** Haritadan seçilen maddeyi Düzada vikisinde açar */
  onMaddeAc: (id: string) => void;
}

export default function Atolye({ items, onAddItem, onMaddeAc }: AtolyeProps) {
  const haritaDuzeni = useHaritaDuzeni();
  const haritaMaddesi = useHaritaMaddesi({ items, onAddItem, onMaddeAc });
  // 2D çalışma, 3D bakış (29 Eylül)
  const [haritaUc, setHaritaUc] = useState(false);
  // 2D ↔ 3D geçişinde kamera aynı yere baksın
  const haritaBakisi = useRef<HaritaBakisi | null>(null);
  const bakisiTut = useCallback((b: HaritaBakisi) => { haritaBakisi.current = b; }, []);
  // Açılış hızı (3. gece): Atölye'ye her girişte ölçüm baştan
  useEffect(() => { isaretle('harita-basladi'); }, []);

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

  return (
    <div className="space-y-6">
      <SayfaBasi baslik="Atölye" />
      <SayfaRayi baslik="Atölye" bolumler={RAY_BOLUMLERI} aktifId="harita" onSec={() => { /* tek bölüm */ }} />

      {/*
        HARİTA VE KURUCU (H, 29 Eylül) — tek ekran. Kemal: "Düzada Haritası
        ve Kurucu kısmını birbirine entegre et; city builder oyunlar gibi
        kontrol edebileceğim bir şey." 2D: çalışma ekranı (araçlar altta).
        3D: aynı ada eğik bakışla, yapılar kat sayısıyla yükselir.
      */}
      {haritaDuzeni.ilkYukleme ? (
        <div ref={haritaKabi} className={tamEkran ? 'fixed inset-0 z-[80] bg-[#1C4E8C]' : ''}>
          <Suspense fallback={<div className="h-[80vh] flex items-center justify-center rounded-2xl bg-[#1C4E8C] font-mono text-xs text-[#F3EFE8]">Harita yükleniyor…</div>}>
            {haritaUc ? (
              <div className="relative">
                <DuzadaHarita
                  className={tamEkran ? 'h-[100dvh] overflow-hidden' : 'h-[calc(100dvh-14.5rem)] sm:h-[calc(100vh-11rem)] min-h-[460px] sm:min-h-[520px] rounded-2xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72]'}
                  onSelect={haritaMaddesi.ac}
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
                onMaddeAc={onMaddeAc}
                ustSol={gorunumDugmesi}
                bakis={haritaBakisi.current}
                onBakis={bakisiTut}
              />
            )}
          </Suspense>
        </div>
      ) : (
        <div className="h-[80vh] flex items-center justify-center rounded-2xl bg-[#1C4E8C] font-mono text-xs text-[#F3EFE8]">Kayıtlı düzen okunuyor…</div>
      )}

      {haritaMaddesi.kutu}
    </div>
  );
}
