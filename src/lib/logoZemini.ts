import { useEffect, useState } from 'react';

/**
 * Şeffaf logonun hangi zeminde görüneceği (8 Ekim). Kems'in "KC" harfi beyaz,
 * Küçükçetmi harfi siyah; düz beyaz ya da koyu kutuda kayboluyorlardı.
 * Logonun dolu piksellerinin ortalama parlaklığına bakılır:
 * çok açıksa 'koyu' zemin, çok koyuysa 'acik' zemin, renkliyse null (olduğu gibi).
 */
export type LogoZemini = 'koyu' | 'acik' | null;

const onbellek = new Map<string, LogoZemini>();

const olc = (src: string): Promise<LogoZemini> => new Promise(coz => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const k = 48;
      const tuval = document.createElement('canvas');
      tuval.width = k; tuval.height = k;
      const c = tuval.getContext('2d');
      if (!c) return coz(null);
      c.drawImage(img, 0, 0, k, k);
      const v = c.getImageData(0, 0, k, k).data;
      let top = 0, n = 0, seffaf = 0;
      for (let i = 0; i < v.length; i += 4) {
        if (v[i + 3] < 128) { seffaf++; continue; }
        top += 0.299 * v[i] + 0.587 * v[i + 1] + 0.114 * v[i + 2]; n++;
      }
      // Şeffaf yeri az olan logo zaten kendi zeminini taşır
      if (!n || seffaf < k * k * 0.08) return coz(null);
      const ort = top / n;
      coz(ort > 225 ? 'koyu' : ort < 40 ? 'acik' : null);
    } catch { coz(null); }
  };
  img.onerror = () => coz(null);
  img.src = src;
});

export const useLogoZemini = (src: string | undefined): LogoZemini => {
  const [zemin, setZemin] = useState<LogoZemini>(() => (src && onbellek.get(src)) ?? null);
  useEffect(() => {
    if (!src) { setZemin(null); return; }
    if (onbellek.has(src)) { setZemin(onbellek.get(src)!); return; }
    let iptal = false;
    void olc(src).then(z => { onbellek.set(src, z); if (!iptal) setZemin(z); });
    return () => { iptal = true; };
  }, [src]);
  return zemin;
};

/** Zemine göre kutu sınıfı; null ise verilen varsayılan kalır */
export const zeminSinifi = (z: LogoZemini, varsayilan: string) =>
  z === 'koyu' ? 'bg-[#0E1C4F]' : z === 'acik' ? 'bg-[#F3EFE8]' : varsayilan;
