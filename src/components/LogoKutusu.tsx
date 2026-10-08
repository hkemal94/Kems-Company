import React from 'react';
import { useLogoZemini, zeminSinifi } from '../lib/logoZemini';

/** Logo kutusu: beyaz logo lacivert, siyah logo krem zeminde görünür (8 Ekim) */
export const LogoKutusu: React.FC<{
  src: string;
  alt: string;
  /** Kutunun boyut ve kenar sınıfları (zemin rengi hariç) */
  className: string;
  /** Logo renkliyse kullanılacak zemin */
  zemin?: string;
  imgClassName?: string;
}> = ({ src, alt, className, zemin = 'bg-white dark:bg-[#0B132B]', imgClassName = 'max-w-full max-h-full object-contain' }) => {
  const z = useLogoZemini(src);
  return (
    <span className={`${className} ${zeminSinifi(z, zemin)}`}>
      <img src={src} alt={alt} loading="lazy" className={imgClassName} referrerPolicy="no-referrer" />
    </span>
  );
};

export default LogoKutusu;
