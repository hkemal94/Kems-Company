import { useEffect } from 'react';

/**
 * Kaydedilmemiş değişiklik uyarısı (1 Ekim, Kemal: "kaydetmeden çıkmaya
 * kalkarsan uyarsın"). Kaydet düğmesi olan formlar bu kancayla kendini
 * bildirir; sayfa değiştirilirken ya da sekme kapatılırken sorulur.
 */
const acikFormlar = new Set<symbol>();

export function useKaydedilmemis(degisti: boolean) {
  useEffect(() => {
    if (!degisti) return;
    const anahtar = Symbol('form');
    acikFormlar.add(anahtar);
    const kapanis = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', kapanis);
    return () => { acikFormlar.delete(anahtar); window.removeEventListener('beforeunload', kapanis); };
  }, [degisti]);
}

/** Kaydedilmemiş değişiklik varsa sorar; devam edilecekse true döner */
export function ayrilmayaIzinVar(): boolean {
  if (acikFormlar.size === 0) return true;
  return window.confirm('Kaydedilmemiş değişiklik var. Kaydetmeden çıkılsın mı?');
}
