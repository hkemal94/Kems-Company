import React, { createContext, useContext } from 'react';

/**
 * Bir sayfa başka bir sayfanın sekmesi olarak çiziliyorsa (7 Ekim: Fanzin
 * Yazı'da, Takvim ve Yol haritası Durum'da, Galeri Markalar'da) kendi büyük
 * başlığını ve sayfa rayını çizmez; düğmeleri kalır.
 */
export const GomuluSayfa = createContext(false);
export const useGomulu = () => useContext(GomuluSayfa);

/**
 * Sade sayfa başı (1 Ekim, K-2; Kemal: "başlıklar menüdeki adlarla aynı
 * olsun"). Tek satır: solda menüdeki ad, sağda o sayfanın düğmeleri.
 * Telefonda ad üst çubukta zaten yazdığı için burada gizlenir; yalnız
 * düğmeler kalır. Düğme yoksa telefonda hiç yer kaplamaz.
 */
export const SayfaBasi: React.FC<{ baslik: string; children?: React.ReactNode; className?: string; yalnizMasada?: boolean }> = ({ baslik, children, className = '', yalnizMasada }) => {
  const gomulu = useGomulu();
  if (gomulu && !children) return null;
  return (
    <div className={`${children && !yalnizMasada ? 'flex' : 'hidden lg:flex'} flex-wrap items-center gap-2 ${className}`}>
      {!gomulu && <h1 className="hidden lg:block text-[24px] font-bold tracking-tight text-[#0E1C4F] dark:text-[#F3EFE8]">{baslik}</h1>}
      {children && <div className={`flex flex-wrap items-center gap-1.5 ${gomulu ? '' : 'lg:ml-auto'}`}>{children}</div>}
    </div>
  );
};

export default SayfaBasi;
