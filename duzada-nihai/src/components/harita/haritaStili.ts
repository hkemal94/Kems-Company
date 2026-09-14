/**
 * Düzada haritasının görsel dili.
 *
 * Marka briefindeki "antik/vintage kartografi" tarifine göre kuruldu:
 * kâğıt zemin, hipsometrik yükselti tonları, kıyıdan dışa açılan dalga
 * çizgileri, kaplamalı yollar. Palet marka renklerinden türetildi —
 * krem tabandan bej üzerinden zeytin/taş tonlarına çıkar.
 */

export const DENIZ = {
  derin: '#0b1740',
  orta: '#0e1c4f',
  sig: '#16295f',
  dalga: 'rgba(243, 239, 232, 0.20)'
} as const;

/**
 * Kıyıdan zirveye hipsometrik basamaklar. Eşik değerleri metredir ve
 * üreteçteki BANTLAR dizisiyle birebir eşleşmelidir. Alçak kotlarda sık:
 * kıyı sekisi (ilk 30 m) haritada okunabilsin diye.
 */
export const YUKSELTI: Array<{ esik: number; renk: string }> = [
  { esik: 0, renk: '#f1ece1' },
  { esik: 10, renk: '#ece5d7' },
  { esik: 25, renk: '#e5dcca' },
  { esik: 50, renk: '#ddd2bd' },
  { esik: 90, renk: '#d4c7ae' },
  { esik: 150, renk: '#cabb9e' },
  { esik: 230, renk: '#bfae8d' },
  { esik: 330, renk: '#b2a07d' },
  { esik: 450, renk: '#a4916e' },
  { esik: 580, renk: '#948160' },
  { esik: 690, renk: '#837155' }
];

/**
 * Gökyüzü. Arazi açıkken eğimli bakışta ufuk görünüyor; mavi bir gök
 * haritayı pencereye çevirirdi. Bunun yerine kâğıdın kendi tonları:
 * ufukta sıcak krem, yukarı çıkıldıkça soluk bir kül.
 */
export const GOK = {
  ust: '#cfc7b6',
  ufuk: '#f2ece0',
  pus: '#e6dcc8'
} as const;

export const KARA = {
  taban: '#f1ece1',
  /** Yapının altındaki kayalık kütle — arazi kotunu gövdeleştirir */
  kaide: '#c9bda4',
  kiyiCizgi: '#6f6047',
  kiyiHale: 'rgba(111, 96, 71, 0.16)',
  mahalleSinir: 'rgba(111, 96, 71, 0.45)'
} as const;

export const YOL = {
  kaplama: '#8a7757',
  dolgu: '#f4ecdb'
} as const;

export const YAPI = {
  /** Diorama'daki sıcak taş ve kiremit tonlarından */
  otel: '#c2a184',
  kule: '#b08f72',
  fener: '#efe7d8',
  stadyum: '#5d7d6a',
  kulup: '#75845f',
  iskele: '#9c8467',
  genel: '#c2b193',
  vurgu: '#d35057'
} as const;

/**
 * Mahalle tonları.
 *
 * İdari sınırlar yollara oturuyor ama beş bölgenin ilk bakışta ayrışması
 * için ince bir renk yıkaması gerekiyordu. Tonlar kasıtlı olarak çok
 * soluk: kabartma ve kâğıt dokusu altta okunmaya devam etsin, harita
 * siyasi haritaya dönüşmesin.
 */
export const MAHALLE_TONU: Record<string, string> = {
  yer_merkez:  '#8a7757',   // yayla — toprak
  yer_liman:   '#4a7d6e',   // körfez — çam (soluk)
  yer_iskele:  '#a8655e',   // koy — kiremitin kırılmış hâli
  yer_stadyum: '#778f66',   // kuzey sırtı — zeytin
  yer_ciftlik: '#b3986f'    // doğu ovası — anız
};

/**
 * Yıkamanın gücü. Fazlası kabartmayı boğuyor; markanın ham kiremiti
 * (#d35057) bu güçte pembe bir blok gibi duruyordu, o yüzden yukarıdaki
 * tonlar kırılmış hâlleriyle kullanılıyor.
 */
export const MAHALLE_TON_GUCU = 0.115;

/** Bina olmayan zemin öğeleri: teras, bahçe */
export const ZEMIN = {
  teras: '#e6dcc6',
  terasKenar: 'rgba(111, 96, 71, 0.55)',
  bahce: '#b9c4a4',
  bahceKenar: 'rgba(90, 110, 80, 0.45)'
} as const;

/** MapLibre'nin `interpolate` ifadesi için düz dizi: [eşik, renk, ...] */
export const yukseltiRampasi = (): (number | string)[] =>
  YUKSELTI.flatMap(k => [k.esik, k.renk]);
