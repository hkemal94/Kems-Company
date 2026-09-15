import { DUZADA_GEO } from '../../data/duzadaGeo';

/**
 * Sınır hatlarından mahalle çokgenleri.
 *
 * Üreteçteki bölme işleminin TypeScript karşılığı. Düzenleyicide bir sınır
 * sürüklendiğinde mahallelerin de anında yeniden boyanması için gerekiyor —
 * yoksa çizgiyi oynatıyorsun ama altındaki renk yerinde kalıyor ve nereyi
 * neye kattığın görünmüyor.
 *
 * Çokgen cebiri (kesişim, fark) YOK ve bilerek yok: yeni bir bağımlılık
 * gerekmesin diye bölme tamamen dizi işiyle yapılıyor.
 *
 *   Merkez  = Çember Sınırı'nın kendisi.
 *   Dilim   = [radyal A] + [kıyı yayı A→B] + [radyal B tersten]
 *             + [çember yayı B→A tersten]
 *
 * Bunun tutması için radyalin ilk noktası çemberin, son noktası da kıyının
 * ÜSTÜNDE olmalı. Düzenleyici bu iki ucu zaten yapışık tutuyor.
 */

export type Nokta = [number, number];

/** Sınır hattı kimlikleri — üreteçteki `SINIR_RADYALLERI` ile aynı sıra */
export const RADYAL_SIRASI = [
  'sinir_dogu',
  'sinir_kuzey',
  'sinir_bati',
  'sinir_guney'
] as const;

export const CEMBER_ID = 'sinir_cember';

export interface SinirHatlari {
  [id: string]: Nokta[];
}

/** Düzenleyicinin kaç tutamak göstereceği */
export const KONTROL_ADEDI: Record<string, number> = {
  sinir_cember: 30,
  sinir_dogu: 10,
  sinir_kuzey: 10,
  sinir_bati: 10,
  sinir_guney: 10
};

/** Haritadaki halihazırdaki sınır hatları, kontrol noktalarına indirilmiş */
export function baslangicHatlari(): SinirHatlari {
  const hatlar: SinirHatlari = {};
  for (const f of DUZADA_GEO.features) {
    const p = f.properties as Record<string, unknown> | null;
    if (!p || p.katman !== 'sinir') continue;
    if (f.geometry.type !== 'LineString') continue;
    let koordinat = f.geometry.coordinates as Nokta[];
    // Çember kapalı yazılıyor; düzenlerken son tekrar noktası fazlalık
    if (p.tur === 'cember' && koordinat.length > 1) {
      const ilk = koordinat[0];
      const son = koordinat[koordinat.length - 1];
      if (ilk[0] === son[0] && ilk[1] === son[1]) {
        koordinat = koordinat.slice(0, -1);
      }
    }
    const id = String(p.id);
    hatlar[id] = kontrolNoktalari(
      koordinat.map(k => [k[0], k[1]] as Nokta),
      KONTROL_ADEDI[id] ?? 12,
      p.tur === 'cember'
    );
  }
  return hatlar;
}

/** Düzenlenebilir yol: üreteçten gelen hâli + kaç tutamak göstereceği */
export interface YolKaydi {
  id: string;
  ad: string;
  tur: string;
  kapali: boolean;
  kontrol: Nokta[];
}

/** Yolun kaç kontrol noktasıyla düzenleneceği — uzunluğuna göre */
function yolKontrolAdedi(noktaSayisi: number, tur: string): number {
  if (tur === 'ana yol') return 28;        // Sahil Yolu: uzun halka
  if (noktaSayisi <= 8) return noktaSayisi;
  return Math.max(5, Math.min(16, Math.round(noktaSayisi / 4)));
}

/**
 * Haritadaki yollar, kontrol noktalarına indirilmiş hâlde.
 *
 * Sokaklar dışarıda bırakılıyor: 35 tanesi var, hepsi kısa ve düzenleyicide
 * listeyi boğuyorlar. Ana yol / cadde / yol / merdiven düzenlenebilir.
 */
export function baslangicYollari(): YolKaydi[] {
  const cikti: YolKaydi[] = [];
  for (const f of DUZADA_GEO.features) {
    const p = f.properties as Record<string, unknown> | null;
    if (!p || p.katman !== 'yol') continue;
    if (f.geometry.type !== 'LineString') continue;
    const tur = String(p.tur ?? 'yol');
    if (tur === 'sokak') continue;
    let koordinat = (f.geometry.coordinates as Nokta[]).map(
      k => [k[0], k[1]] as Nokta
    );
    const ilk = koordinat[0];
    const son = koordinat[koordinat.length - 1];
    const kapali = koordinat.length > 3
      && Math.abs(ilk[0] - son[0]) < 1e-9 && Math.abs(ilk[1] - son[1]) < 1e-9;
    if (kapali) koordinat = koordinat.slice(0, -1);
    cikti.push({
      id: String(p.id),
      ad: String(p.ad ?? p.id),
      tur,
      kapali,
      kontrol: kontrolNoktalari(
        koordinat, yolKontrolAdedi(koordinat.length, tur), kapali
      )
    });
  }
  return cikti;
}

/** Ada kıyı çizgisi (kapanış noktası atılmış hâlde) */
export function kiyiHalkasi(): Nokta[] {
  const f = DUZADA_GEO.features.find(
    g => (g.properties as Record<string, unknown> | null)?.katman === 'ada'
  );
  if (!f || f.geometry.type !== 'Polygon') return [];
  const halka = f.geometry.coordinates[0] as Nokta[];
  const ilk = halka[0];
  const son = halka[halka.length - 1];
  const kapali = ilk[0] === son[0] && ilk[1] === son[1];
  return (kapali ? halka.slice(0, -1) : halka).map(k => [k[0], k[1]] as Nokta);
}

/**
 * Bir hattı yay uzunluğuna göre `adet` kontrol noktasına indirger.
 *
 * Üreteç sınırları yüzlerce noktayla yazıyor (çember 180, her radyal 41):
 * çizim için doğru, elle düzenlemek için felaket — 439 tutamak arasında
 * hiçbir şey seçilemiyor. Düzenleyici seyrek bir kontrol çokgeni üstünde
 * çalışıyor, eğri aşağıdaki `catmullRom` ile geri kazanılıyor.
 */
export function kontrolNoktalari(
  hat: Nokta[], adet: number, kapali: boolean
): Nokta[] {
  if (hat.length <= adet) return hat.map(p => [p[0], p[1]] as Nokta);
  const dizi = kapali ? [...hat, hat[0]] : hat;
  const yay: number[] = [0];
  for (let i = 1; i < dizi.length; i++) {
    yay.push(yay[i - 1] + Math.hypot(dizi[i][0] - dizi[i - 1][0],
                                     dizi[i][1] - dizi[i - 1][1]));
  }
  const toplam = yay[yay.length - 1];
  const cikti: Nokta[] = [];
  const bolen = kapali ? adet : adet - 1;
  for (let k = 0; k < adet; k++) {
    const hedef = (toplam * k) / bolen;
    let i = 1;
    while (i < yay.length - 1 && yay[i] < hedef) i++;
    const t = (hedef - yay[i - 1]) / Math.max(yay[i] - yay[i - 1], 1e-12);
    cikti.push([
      dizi[i - 1][0] + (dizi[i][0] - dizi[i - 1][0]) * t,
      dizi[i - 1][1] + (dizi[i][1] - dizi[i - 1][1]) * t
    ]);
  }
  return cikti;
}

/**
 * Kontrol noktalarından geçen yumuşak eğri (Catmull-Rom).
 *
 * `gen/duzada.py` içindeki `catmull_rom` ile BİREBİR aynı olmalı: ekranda
 * gördüğün eğri ile üretecin kullandığı eğri aynı şey olsun.
 */
export function catmullRom(
  kontrol: Nokta[], kapali: boolean, bolme = 8
): Nokta[] {
  const n = kontrol.length;
  if (n < 3) return kontrol.map(p => [p[0], p[1]] as Nokta);
  const al = (i: number): Nokta => {
    if (kapali) return kontrol[((i % n) + n) % n];
    return kontrol[Math.max(0, Math.min(n - 1, i))];
  };
  const cikti: Nokta[] = [];
  const son = kapali ? n : n - 1;
  for (let i = 0; i < son; i++) {
    const p0 = al(i - 1), p1 = al(i), p2 = al(i + 1), p3 = al(i + 2);
    for (let j = 0; j < bolme; j++) {
      const t = j / bolme;
      const t2 = t * t;
      const t3 = t2 * t;
      cikti.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t
          + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
          + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t
          + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
          + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  if (!kapali) cikti.push(kontrol[n - 1]);
  return cikti;
}

function uzaklik(a: Nokta, b: Nokta): number {
  // Enlem/boylam farkı; küçük ölçekte yön bulmak için yeterli
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Halkada verilen noktaya en yakın köşenin sırası */
export function enYakinKose(halka: Nokta[], nokta: Nokta): number {
  let en = 0;
  let enMesafe = Infinity;
  for (let i = 0; i < halka.length; i++) {
    const d = uzaklik(halka[i], nokta);
    if (d < enMesafe) {
      enMesafe = d;
      en = i;
    }
  }
  return en;
}

/**
 * Kapalı bir halkada `bas` sırasından `son` sırasına giden yay.
 *
 * `ileri` yönü, halkanın kendi sırasıyla aynı yön demek. İki yönden hangisi
 * doğru olduğunu çağıran karar veriyor; burada yalnızca dilimleniyor.
 */
function yay(halka: Nokta[], bas: number, son: number, ileri: boolean): Nokta[] {
  const n = halka.length;
  const cikti: Nokta[] = [];
  let i = bas;
  // n adımdan fazlası olamaz: sonsuz döngüye karşı sigorta
  for (let adim = 0; adim <= n; adim++) {
    cikti.push(halka[i]);
    if (i === son) break;
    i = ileri ? (i + 1) % n : (i - 1 + n) % n;
  }
  return cikti;
}

/** Bir çokgenin işaretli alanı — yönü (saat yönü mü değil mi) verir */
function isaretliAlan(halka: Nokta[]): number {
  let toplam = 0;
  for (let i = 0; i < halka.length; i++) {
    const [x1, y1] = halka[i];
    const [x2, y2] = halka[(i + 1) % halka.length];
    toplam += x1 * y2 - x2 * y1;
  }
  return toplam / 2;
}

export interface Bolge {
  id: string;
  halka: Nokta[];
  /** Kabaca alan (derece²) — yalnız karşılaştırmak için */
  alan: number;
}

/**
 * Sınır hatlarından beş mahalle çokgeni üretir.
 *
 * `mahalleSirasi[i]`, RADYAL_SIRASI[i] ile RADYAL_SIRASI[i+1] arasındaki
 * dilimin kimliği.
 */
/** Kontrol noktalarından çizilecek/kullanılacak gerçek hat */
export function hattinEgrisi(id: string, kontrol: Nokta[]): Nokta[] {
  return catmullRom(kontrol, id === CEMBER_ID, 8);
}


export function bolgeleriKur(
  hatlar: SinirHatlari,
  kiyi: Nokta[],
  mahalleSirasi: string[],
  /**
   * Hazır eğriler. Verilen hat için kontrol noktalarından eğri kurulmaz,
   * bu kullanılır — dokunulmamış sınırlar üretecin kendi çizgisiyle kalsın.
   */
  hazirEgri: SinirHatlari = {}
): Bolge[] {
  const egri = (id: string) => hazirEgri[id] ?? hattinEgrisi(id, hatlar[id]);
  const cember = (hazirEgri[CEMBER_ID] || hatlar[CEMBER_ID]) && egri(CEMBER_ID);
  if (!cember || cember.length < 3 || kiyi.length < 3) return [];

  const bolgeler: Bolge[] = [
    { id: 'yer_merkez', halka: cember, alan: Math.abs(isaretliAlan(cember)) }
  ];

  // Halkaların yönü tutarlı olsun: ikisi de saat yönünün tersine
  const kiyiTers = isaretliAlan(kiyi) < 0 ? [...kiyi].reverse() : kiyi;
  const cemberTers = isaretliAlan(cember) < 0 ? [...cember].reverse() : cember;

  for (let i = 0; i < RADYAL_SIRASI.length; i++) {
    const aId = RADYAL_SIRASI[i];
    const bId = RADYAL_SIRASI[(i + 1) % RADYAL_SIRASI.length];
    if ((!hatlar[aId] && !hazirEgri[aId]) || (!hatlar[bId] && !hazirEgri[bId])) continue;
    const a = egri(aId);
    const b = egri(bId);
    if (a.length < 2 || b.length < 2) continue;

    const aKiyi = enYakinKose(kiyiTers, a[a.length - 1]);
    const bKiyi = enYakinKose(kiyiTers, b[b.length - 1]);
    const aCember = enYakinKose(cemberTers, a[0]);
    const bCember = enYakinKose(cemberTers, b[0]);

    const halka: Nokta[] = [
      ...a,
      ...yay(kiyiTers, aKiyi, bKiyi, true).slice(1),
      ...[...b].reverse().slice(1),
      ...yay(cemberTers, bCember, aCember, false).slice(1)
    ];

    bolgeler.push({
      id: mahalleSirasi[i] ?? `dilim_${i}`,
      halka,
      alan: Math.abs(isaretliAlan(halka))
    });
  }
  return bolgeler;
}

/** Bölgeleri haritaya verilebilecek GeoJSON'a çevirir */
export function bolgeGeoJSON(bolgeler: Bolge[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: bolgeler.map(b => ({
      type: 'Feature' as const,
      id: b.id,
      properties: { id: b.id },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...b.halka, b.halka[0]]]
      }
    }))
  };
}
