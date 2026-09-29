import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Sayfanın kendi rayı.
 *
 * Kemal: "ray açılır kapanır olmalı, sayfanın rayı onun altında olmalı."
 *
 * Ana ray (Komuta Merkezi, Markalar, Düzada…) hangi sayfada olduğunu
 * söylüyor. Bu ray ise o sayfanın İÇİNDE nerede olduğunu söylüyor. Komuta
 * Merkezi dokuz bölümlük tek bir uzun kaydırmaydı; aşağıda ne olduğunu
 * görmek için sonuna kadar inmek gerekiyordu.
 *
 * Çalışma biçimi: sayfa bölümlerini bildiriyor, ray onları ana rayın altına
 * (App.tsx'teki yuvaya) portal ile basıyor. Hangi bölümün ekranda olduğunu
 * IntersectionObserver takip ediyor, tıklayınca oraya kayıyor.
 *
 * İki kipte çalışır:
 *   - KAYDIRMA kipi (varsayılan): bölümler aynı sayfada alt alta duruyordur.
 *     Tıklayınca oraya kayar, kaydırdıkça hangisinde olduğun yanar.
 *     Komuta Merkezi böyle.
 *   - SEKME kipi (`aktifId` + `onSec` verilince): bölümler aslında sekmedir,
 *     aynı anda yalnız biri çizilir. Tıklayınca sekme değişir. Merch ve
 *     Düzada böyle — onlarda kaydırılacak bir şey yok, ekran değişiyor.
 *
 * Yuva yoksa — dar ekran, ray daraltılmış, ya da sayfa App dışında
 * kullanılıyorsa — hiçbir şey çizmiyor. Sayfa yine de normal çalışır.
 */

export const SAYFA_RAYI_YUVASI = 'sayfa-rayi-yuvasi';

export interface RayBolumu {
  /** Bölümün DOM kimliği — sayfada aynı id'li bir eleman olmalı */
  id: string;
  label: string;
}

interface SayfaRayiProps {
  bolumler: RayBolumu[];
  /** Ray başlığı — sayfanın adı */
  baslik?: string;
  /** Sekme kipi: dışarıdan seçili bölüm */
  aktifId?: string;
  /** Sekme kipi: tıklanınca çağrılır. Verilirse kaydırma yapılmaz. */
  onSec?: (id: string) => void;
}

export const SayfaRayi: React.FC<SayfaRayiProps> = ({
  bolumler, baslik, aktifId, onSec
}) => {
  const sekmeKipi = typeof onSec === 'function';
  const [yuva, setYuva] = useState<HTMLElement | null>(null);
  const [aktif, setAktif] = useState<string | null>(bolumler[0]?.id ?? null);
  const bolumlerRef = useRef(bolumler);
  bolumlerRef.current = bolumler;
  /*
   * Tıklamadan sonra kısa bir süre gözlemciyi dinlemiyoruz. Yoksa kısa bir
   * bölüme tıklayınca ekranda bir sonraki bölüm daha çok göründüğü için o
   * seçili görünüyordu: "Son dokunulan"a basıp "Evren özeti" yanıyordu.
   */
  const kilitliyeKadar = useRef(0);

  /*
   * Yuva App tarafından çiziliyor; bu bileşen ondan önce ya da sonra
   * bağlanabilir. O yüzden bir kere arayıp bırakmak yerine, bulunana kadar
   * kısa aralıklarla bakıyoruz — ray daraltılıp açıldığında da yeniden
   * yakalansın.
   */
  useEffect(() => {
    const bak = () => {
      const e = document.getElementById(SAYFA_RAYI_YUVASI);
      setYuva(prev => (prev === e ? prev : e));
    };
    bak();
    const z = window.setInterval(bak, 400);
    return () => window.clearInterval(z);
  }, []);

  useEffect(() => {
    if (sekmeKipi) return;   // sekmede kaydırılacak bir şey yok
    const hedefler = bolumler
      .map(b => document.getElementById(b.id))
      .filter((e): e is HTMLElement => e !== null);
    if (hedefler.length === 0) return;

    const gozlemci = new IntersectionObserver(
      girisler => {
        // Ekranda en çok görünen bölüm aktif sayılır
        const gorunur = girisler
          .filter(g => g.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (gorunur && Date.now() > kilitliyeKadar.current) {
          setAktif(gorunur.target.id);
        }
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: [0.05, 0.3, 0.6] }
    );
    hedefler.forEach(e => gozlemci.observe(e));
    return () => gozlemci.disconnect();
  }, [bolumler, sekmeKipi]);

  if (!yuva || bolumler.length === 0) return null;

  const secili = sekmeKipi ? aktifId : aktif;

  const git = (id: string) => {
    if (sekmeKipi) { onSec!(id); return; }
    const e = document.getElementById(id);
    if (!e) return;
    e.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAktif(id);
    kilitliyeKadar.current = Date.now() + 900;  // yumuşak kaydırma bitene dek
  };

  return createPortal(
    /*
     * Paket 4: yuva artık menünün yanında dar bir sütun (masaüstü) ya da
     * sayfanın üstünde yana kayan bir şerit (telefon).
     */
    <div className="-mx-4 px-4 lg:mx-0 lg:px-0">
      <span className="hidden lg:block text-[10px] font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#95A1C2] font-bold px-1 mb-1.5">
        {baslik ?? 'Bu sayfada'}
      </span>
      <nav className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-visible font-mono text-[11px] pb-1 lg:pb-0">
        {bolumler.map(b => {
          const bu = secili === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => git(b.id)}
              className={`shrink-0 lg:w-full text-left px-3 py-2 lg:py-1.5 rounded-full lg:rounded-lg flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap border lg:border-0 ${
                bu
                  ? 'text-[#0E1C4F] dark:text-[#F3EFE8] font-bold bg-[#FAF8F5] lg:bg-[#F3EFE8] dark:bg-[#17345A] border-[#CFC5B4] dark:border-[#2C3C72]'
                  : 'text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F6F1E7] dark:hover:bg-[#202E5C] border-[#CFC5B4]/70 dark:border-[#2C3C72]'
              }`}
            >
              <span
                className={`hidden lg:block w-1 h-3.5 rounded-full shrink-0 ${
                  bu ? 'bg-[#F26B6F]' : 'bg-[#CFC5B4]/60 dark:bg-[#2C3C72]'
                }`}
              />
              <span className="lg:truncate">{b.label}</span>
            </button>
          );
        })}
      </nav>
    </div>,
    yuva
  );
};

export default SayfaRayi;
