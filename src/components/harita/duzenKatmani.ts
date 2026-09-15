import type { Feature, FeatureCollection } from 'geojson';
import { DUZADA_GEO, DUZADA_DILIM_SIRASI } from '../../data/duzadaGeo';
import {
  baslangicHatlari, baslangicYollari, bolgeleriKur, catmullRom, kiyiHalkasi,
  CEMBER_ID, RADYAL_SIRASI, type Nokta, type SinirHatlari
} from './sinirBolgeleri';
import { DUZEN_SURUMU, type HaritaDuzeni } from './duzenTipi';

export { DUZEN_SURUMU, type HaritaDuzeni };

/**
 * Harita düzeni katmanı (H1).
 *
 * `duzadaGeo.ts` üreteçten gelir ve yeniden üretilebilir. Kemal'in elle
 * yaptığı düzeltmeler oraya YAZILMAZ; ayrı bir "düzen" kaydında tutulur ve
 * açılışta üretilmiş verinin üstüne bindirilir. Böylece üreteç yeniden
 * çalışsa bile elle yapılanlar kaybolmaz.
 *
 * Düzen yalnızca DEĞİŞEN hatları taşır. Dokunulmamış bir yol üreteç ne
 * derse onu izler; dokunulmuş olan, üreteç ne derse desin Kemal'in hâlinde
 * kalır.
 */

export const bosDuzen = (): HaritaDuzeni => ({
  surum: DUZEN_SURUMU, guncelleme: 0, hatlar: {}, yollar: {}
});

// ---- üretilmiş taban (bir kez hesaplanır) ---------------------------------

let tabanOnbellek: {
  hatlar: SinirHatlari;
  yollar: SinirHatlari;
  kapaliYol: Record<string, boolean>;
} | null = null;

function taban() {
  if (!tabanOnbellek) {
    const yollar = baslangicYollari();
    tabanOnbellek = {
      hatlar: baslangicHatlari(),
      yollar: Object.fromEntries(yollar.map(y => [y.id, y.kontrol])),
      kapaliYol: Object.fromEntries(yollar.map(y => [y.id, y.kapali]))
    };
  }
  return tabanOnbellek;
}

/** Üretecin sınır çizgileri (çemberin kapanış noktası atılmış) — düzende olmayanlar */
function uretilmisSinirlar(haric: SinirHatlari): SinirHatlari {
  const cikti: SinirHatlari = {};
  for (const f of DUZADA_GEO.features) {
    const p = f.properties as Record<string, unknown> | null;
    if (!p || p.katman !== 'sinir' || f.geometry.type !== 'LineString') continue;
    const id = String(p.id);
    if (haric[id]) continue;
    let k = (f.geometry.coordinates as number[][]).map(c => [c[0], c[1]] as Nokta);
    if (id === CEMBER_ID && k.length > 1
      && k[0][0] === k[k.length - 1][0] && k[0][1] === k[k.length - 1][1]) {
      k = k.slice(0, -1);
    }
    cikti[id] = k;
  }
  return cikti;
}

/** Üreteç hâli + düzen: düzenleyicinin açılışta göstereceği hatlar */
export function birlesikHatlar(duzen: HaritaDuzeni | null): SinirHatlari {
  return { ...taban().hatlar, ...(duzen?.hatlar ?? {}) };
}

export function birlesikYollar(duzen: HaritaDuzeni | null): SinirHatlari {
  const t = taban().yollar;
  // Üreteçte artık olmayan bir yolun düzenini taşıma — çizecek yeri yok
  const d = Object.fromEntries(
    Object.entries(duzen?.yollar ?? {}).filter(([id]) => id in t)
  );
  return { ...t, ...d };
}

// ---- fark çıkarma ---------------------------------------------------------

const ESIK = 1e-7; // ~1 cm

function ayniHat(a: Nokta[] | undefined, b: Nokta[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i][0] - b[i][0]) > ESIK || Math.abs(a[i][1] - b[i][1]) > ESIK) {
      return false;
    }
  }
  return true;
}

function yuvarla(hat: Nokta[]): Nokta[] {
  return hat.map(p => [Number(p[0].toFixed(7)), Number(p[1].toFixed(7))] as Nokta);
}

/** Düzenleyicideki tam hâlden yalnızca üreteçten farklı olanları ayırır */
export function duzeniCikar(hatlar: SinirHatlari, yollar: SinirHatlari): HaritaDuzeni {
  const t = taban();
  const fark = (hepsi: SinirHatlari, tabanHat: SinirHatlari) =>
    Object.fromEntries(
      (Object.entries(hepsi) as Array<[string, Nokta[]]>)
        .filter(([id, n]) => !ayniHat(n, tabanHat[id]))
        .map(([id, n]) => [id, yuvarla(n)])
    );
  return {
    surum: DUZEN_SURUMU,
    guncelleme: Date.now(),
    hatlar: fark(hatlar, t.hatlar),
    yollar: fark(yollar, t.yollar)
  };
}

export function duzenBosMu(duzen: HaritaDuzeni | null): boolean {
  return !duzen
    || (Object.keys(duzen.hatlar).length === 0 && Object.keys(duzen.yollar).length === 0);
}

// ---- uygulama: üretilmiş veri + düzen → çizilecek veri --------------------

/** Derece² → km², adanın enleminde */
function kmKare(dereceKare: number, enlem: number): number {
  const km = 111.32;
  // 162.2 / 162.5: üretecin projeksiyonlu alanıyla aynı ölçeğe getirir
  return dereceKare * km * km * Math.cos((enlem * Math.PI) / 180) * 0.9982;
}

/**
 * Üretilmiş GeoJSON'un üstüne düzeni bindirir. Düzen boşsa girdinin
 * kendisini döndürür (kopya yok, maliyet yok).
 */
export function duzeniUygula(
  geo: FeatureCollection = DUZADA_GEO,
  duzen: HaritaDuzeni | null
): FeatureCollection {
  if (duzenBosMu(duzen)) return geo;
  const d = duzen!;

  const sinirDegisti = Object.keys(d.hatlar).length > 0;
  const yollar = d.yollar;
  const { kapaliYol } = taban();

  let bolgeHalkasi: Record<string, { halka: Nokta[]; alan: number }> = {};
  let hatlar: SinirHatlari = {};
  if (sinirDegisti) {
    hatlar = birlesikHatlar(d);
    // Dokunulmamış sınırlar üretecin tam çözünürlüklü çizgisiyle girer;
    // yalnız düzenlenenler kontrol noktalarından yeniden kurulur.
    const bolgeler = bolgeleriKur(
      hatlar, kiyiHalkasi(), DUZADA_DILIM_SIRASI, uretilmisSinirlar(d.hatlar)
    );
    // Yalnız düzenlenen hatta komşu mahalleler yeniden kurulur; öbürleri
    // üretecin çokgeniyle kalır (TS bölmesi üreteçle birebir değil, ~1-2 km²
    // oynayabiliyor — dokunulmayan mahalleye bu oynama yansımasın).
    const etkilenen = new Set<string>();
    if (d.hatlar[CEMBER_ID]) {
      etkilenen.add('yer_merkez');
      DUZADA_DILIM_SIRASI.forEach(m => etkilenen.add(m));
    }
    RADYAL_SIRASI.forEach((rid, i) => {
      if (!d.hatlar[rid]) return;
      const n = RADYAL_SIRASI.length;
      etkilenen.add(DUZADA_DILIM_SIRASI[i]);
      etkilenen.add(DUZADA_DILIM_SIRASI[(i - 1 + n) % n]);
    });
    bolgeHalkasi = Object.fromEntries(
      bolgeler.filter(b => etkilenen.has(b.id)).map(b => [b.id, b])
    );
  }

  const features: Feature[] = geo.features.map(f => {
    const p = f.properties as Record<string, unknown> | null;
    if (!p) return f;
    const id = String(p.id ?? '');

    if (p.katman === 'yol' && yollar[id]) {
      const kapali = Boolean(kapaliYol[id]);
      const egri = catmullRom(yollar[id], kapali, 8);
      return {
        ...f,
        geometry: {
          type: 'LineString',
          coordinates: kapali ? [...egri, egri[0]] : egri
        }
      };
    }

    if (sinirDegisti && p.katman === 'sinir' && d.hatlar[id]) {
      const kapali = id === CEMBER_ID;
      const egri = catmullRom(hatlar[id], kapali, 8);
      return {
        ...f,
        geometry: {
          type: 'LineString',
          coordinates: kapali ? [...egri, egri[0]] : egri
        }
      };
    }

    if (sinirDegisti && p.katman === 'mahalle' && bolgeHalkasi[id]) {
      const b = bolgeHalkasi[id];
      if (b.halka.length < 3) return f;
      const enlem = b.halka[0][1];
      return {
        ...f,
        properties: { ...p, alanKm2: Number(kmKare(b.alan, enlem).toFixed(1)) },
        geometry: { type: 'Polygon', coordinates: [[...b.halka, b.halka[0]]] }
      };
    }

    return f;
  });

  return { ...geo, features };
}
