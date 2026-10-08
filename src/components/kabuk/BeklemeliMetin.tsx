import React, { useEffect, useRef, useState } from 'react';

/**
 * Yazarken kayda yazmayan metin kutusu (8 Ekim denetimi). Kitap ve Blog'da
 * başlık her harfte bütün kaydı yeniden yazıyordu (yazma kotası) ve her
 * harf ad değişikliği sayılıp yarım adlar eski adlara giriyordu. Burada
 * metin kutudan çıkınca (ya da Enter'la, sayfadan ayrılınca) bir kez yazılır.
 */
export const BeklemeliMetin: React.FC<{
  deger: string;
  onKaydet: (yeni: string) => void | Promise<void>;
  cokSatir?: boolean;
  rows?: number;
  className?: string;
  placeholder?: string;
}> = ({ deger, onKaydet, cokSatir, rows, className, placeholder }) => {
  const [yerel, setYerel] = useState(deger);
  const yazilan = useRef(deger);
  const sonYerel = useRef(deger);
  // Kayıt dışarıdan değişirse (başka madde açıldı) kutu onu gösterir
  useEffect(() => { setYerel(deger); sonYerel.current = deger; yazilan.current = deger; }, [deger]);
  const kaydet = () => {
    if (sonYerel.current === yazilan.current) return;
    yazilan.current = sonYerel.current;
    void onKaydet(sonYerel.current);
  };
  // Sayfadan ayrılırken yazılmamış metin kalmasın
  const kaydetRef = useRef(kaydet);
  kaydetRef.current = kaydet;
  useEffect(() => () => kaydetRef.current(), []);
  const ortak = {
    value: yerel,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setYerel(e.target.value); sonYerel.current = e.target.value; },
    onBlur: kaydet,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); } },
    className, placeholder
  };
  return cokSatir ? <textarea rows={rows} {...ortak} /> : <input type="text" {...ortak} />;
};

export default BeklemeliMetin;
