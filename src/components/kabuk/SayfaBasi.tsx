import React from 'react';

/**
 * Sade sayfa başı (1 Ekim, K-2; Kemal: "başlıklar menüdeki adlarla aynı
 * olsun"). Tek satır: solda menüdeki ad, sağda o sayfanın düğmeleri.
 * Telefonda ad üst çubukta zaten yazdığı için burada gizlenir; yalnız
 * düğmeler kalır. Düğme yoksa telefonda hiç yer kaplamaz.
 */
export const SayfaBasi: React.FC<{ baslik: string; children?: React.ReactNode; className?: string; yalnizMasada?: boolean }> = ({ baslik, children, className = '', yalnizMasada }) => (
  <div className={`${children && !yalnizMasada ? 'flex' : 'hidden lg:flex'} flex-wrap items-center gap-2 ${className}`}>
    <h1 className="hidden lg:block text-[24px] font-bold tracking-tight text-[#0E1C4F] dark:text-[#F3EFE8]">{baslik}</h1>
    {children && <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">{children}</div>}
  </div>
);

export default SayfaBasi;
