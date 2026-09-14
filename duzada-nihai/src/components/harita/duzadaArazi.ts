import * as maplibregl from 'maplibre-gl';
// MapLibre karoları bir Web Worker'da işliyor ve o worker'ın adresini kendi
// paket dosyasının yanından (`import.meta.url`) türetiyor. Vite derlemeyi
// `assets/` altında topladığında o adres kayboluyor: worker hiç açılmıyor,
// harita sessizce boş deniz olarak kalıyordu — konsola tek satır hata
// düşmeden. Worker'ı Vite'a ayrı bir paket olarak kurdurup adresi elle
// veriyoruz. (Geliştirme sunucusunda sorun çıkmıyordu, yalnız yayın
// derlemesinde.)
import isciAdresi from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { DEM_PNG, DEM_SINIR } from '../../data/duzadaDem';

maplibregl.setWorkerUrl(isciAdresi);

/**
 * Düzada'nın 3B arazisi.
 *
 * MapLibre araziyi "raster-dem" karolarından kurar: rakımın renk
 * kanallarına gömüldüğü PNG'ler. Dışarıdan karo servisi kullanmıyoruz —
 * ne anahtar, ne hesap, ne ağ. Onun yerine adanın tamamı tek bir PNG'ye
 * kodlanmış durumda (`duzadaDem.ts`, ~36 KB) ve buradaki özel protokol
 * MapLibre her karo istediğinde o görüntüden ilgili parçayı kesip veriyor.
 *
 * Kodlama Terrarium: rakım = (R * 256 + G + B / 256) - 32768
 */

export const ARAZI_PROTOKOL = 'duzada-dem';
export const ARAZI_KAYNAK = 'duzada-arazi';

/**
 * Abartı katsayısı.
 *
 * 18 km genişliğinde bir adada 742 m gerçek ölçekte neredeyse düz görünür
 * (yatay/düşey oran 1:24). Haritacılıkta kabartma bu yüzden abartılır;
 * 1.6 kabartmayı okunur kılarken adayı hâlâ inandırıcı bırakıyor.
 */
export const ARAZI_ABARTI = 1.6;

const KARO = 256;
const [BATI, GUNEY, DOGU, KUZEY] = DEM_SINIR;

let kaynakGorsel: Promise<CanvasImageSource> | null = null;
let kayitli = false;

function gorseliYukle(): Promise<CanvasImageSource> {
  if (!kaynakGorsel) {
    kaynakGorsel = new Promise((coz, hata) => {
      const im = new Image();
      im.onload = () => coz(im);
      im.onerror = () => hata(new Error('DEM görüntüsü yüklenemedi'));
      im.src = DEM_PNG;
    });
  }
  return kaynakGorsel;
}

/** Web Mercator karo numarasından enlem (derece) */
function karoEnlem(y: number, z: number): number {
  const n = Math.PI * (1 - (2 * y) / Math.pow(2, z));
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Web Mercator karo numarasından boylam (derece) */
function karoBoylam(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

/**
 * Bir karoyu üretir.
 *
 * DEM enlem/boylamda düzgün aralıklı, karo ise Mercator'da. Bir karonun
 * kapsadığı enlem aralığı bu ölçeklerde çok küçük olduğu için aradaki
 * eğrilik fark edilmiyor; doğrudan dikdörtgen bir kesit alıyoruz.
 */
async function karoUret(z: number, x: number, y: number): Promise<ArrayBuffer> {
  const gorsel = await gorseliYukle();
  const en = (gorsel as HTMLImageElement).naturalWidth;
  const boy = (gorsel as HTMLImageElement).naturalHeight;

  const tuval = document.createElement('canvas');
  tuval.width = KARO;
  tuval.height = KARO;
  const ct = tuval.getContext('2d');
  if (!ct) throw new Error('2B bağlam alınamadı');

  // Karonun kapsamadığı her yer deniz seviyesi: Terrarium'da 0 m = #800000
  ct.fillStyle = '#800000';
  ct.fillRect(0, 0, KARO, KARO);

  const bati = karoBoylam(x, z);
  const dogu = karoBoylam(x + 1, z);
  const kuzey = karoEnlem(y, z);
  const guney = karoEnlem(y + 1, z);

  // Karonun DEM üzerindeki piksel karşılığı
  const px = (lng: number) => ((lng - BATI) / (DOGU - BATI)) * en;
  const py = (lat: number) => ((KUZEY - lat) / (KUZEY - GUNEY)) * boy;

  const sx = px(bati);
  const sy = py(kuzey);
  const sEn = px(dogu) - sx;
  const sBoy = py(guney) - sy;

  if (sEn > 0 && sBoy > 0 && sx < en && sy < boy && sx + sEn > 0 && sy + sBoy > 0) {
    // Ara değerleri yumuşak alsın: karo DEM hücresinden küçük olduğunda
    // basamaklı arazi yerine düzgün yamaç çıkar.
    ct.imageSmoothingEnabled = true;
    ct.imageSmoothingQuality = 'high';
    ct.drawImage(gorsel, sx, sy, sEn, sBoy, 0, 0, KARO, KARO);
  }

  const blob: Blob = await new Promise((coz, hata) =>
    tuval.toBlob(b => (b ? coz(b) : hata(new Error('karo çizilemedi'))), 'image/png')
  );
  return blob.arrayBuffer();
}

/**
 * Protokolü bir kez kaydeder. Harita bileşeni kurulmadan önce çağrılmalı.
 */
export function araziProtokolunuKur(): void {
  if (kayitli) return;
  kayitli = true;
  maplibregl.addProtocol(ARAZI_PROTOKOL, async params => {
    const eslesme = /\/\/(\d+)\/(\d+)\/(\d+)/.exec(params.url);
    if (!eslesme) throw new Error(`geçersiz arazi karosu: ${params.url}`);
    const [, z, x, y] = eslesme;
    const veri = await karoUret(Number(z), Number(x), Number(y));
    return { data: veri };
  });
}

/** Stile eklenecek raster-dem kaynağı */
export const araziKaynagi = (): maplibregl.RasterDEMSourceSpecification => ({
  type: 'raster-dem',
  tiles: [`${ARAZI_PROTOKOL}://{z}/{x}/{y}`],
  tileSize: KARO,
  encoding: 'terrarium',
  minzoom: 8,
  // DEM ~35 m hücreli; bundan ötesini istemek boşuna karo üretir.
  maxzoom: 15,
  bounds: DEM_SINIR
});
