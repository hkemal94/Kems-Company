/**
 * Trafik, saat, mevsim ayarı (30 Eylül). Ayrı dosyada (8 Ekim denetimi):
 * `atmosfer.ts` harita motorunu (MapLibre) içeriyor; Atölye ve Site yalnız
 * bu ayar için onu içe alınca motor 3D açılmadan iniyordu.
 */
export interface AtmosferAyari { trafik: boolean; saat: boolean; mevsim: boolean }
export const ATMOSFER_ACIK: AtmosferAyari = { trafik: true, saat: true, mevsim: true };
export const ATMOSFER_KAPALI: AtmosferAyari = { trafik: false, saat: false, mevsim: false };
