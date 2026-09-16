import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  DUZADA_GEO, DUZADA_MERKEZ, DUZADA_DILIM_SIRASI
} from '../../data/duzadaGeo';
import {
  DENIZ, GOK, KARA, YOL, YUKSELTI, MAHALLE_TONU, MAHALLE_TON_GUCU
} from './haritaStili';
import {
  araziProtokolunuKur, araziKaynagi, ARAZI_KAYNAK, ARAZI_ABARTI
} from './duzadaArazi';
import {
  baslangicHatlari, baslangicYollari, kiyiHalkasi, bolgeleriKur,
  bolgeGeoJSON, hattinEgrisi, catmullRom, CEMBER_ID, RADYAL_SIRASI,
  type Nokta, type SinirHatlari, type YolKaydi
} from './sinirBolgeleri';
import { manyetikCek, type ManyetikTur } from './manyetik';
import { kotlariYukle, kotOku, yoluOlc, denizeTasiyorMu } from './duzadaKot';
import {
  birlesikHatlar, birlesikYollar, duzeniCikar, duzenBosMu, duzeniUygula,
  poligonMerkezi, yeniMekanId, MEKAN_YARICAP, MEKAN_YUKSEKLIK,
  type HaritaDuzeni, type MekanDuzeni
} from './duzenKatmani';
import type { FeatureCollection } from 'geojson';
import type { KayitDurumu } from '../../lib/haritaDuzeni';

/**
 * Düzada harita düzenleyicisi — sınırlar ve yollar.
 *
 * Amaç tek şey: Kemal'in çizgileri kendi eliyle oynatabilmesi. Anlatması
 * zor olan "şurası biraz aşağı insin" türü düzeltmeler burada iki saniyede
 * yapılıyor.
 *
 * Kayıt (H1): "Kaydet" düğmesiyle (Ctrl+S) "harita düzeni" kaydına yazılır
 * (önce tarayıcıya, sonra Firestore'a). Otomatik kayıt yok — bu Kemal'in
 * kararı. Yalnızca üreteçten farklı olan hatlar yazılır; görüntüleme
 * haritası açılışta bunları üretilmiş verinin üstüne bindirir.
 *
 * İki şey düzenleme sırasında ANINDA güncelleniyor:
 *   - mahalleler yeniden boyanıyor (neyi neye kattığın görünsün)
 *   - seçili yolun uzunluğu ve eğimi ölçülüyor (dağa yol çıkarmayasın)
 */

const KAYNAK = 'duzada';
const BOLGE_KAYNAK = 'duzenleme-bolge';
const HAT_KAYNAK = 'duzenleme-hat';
const KOSE_KAYNAK = 'duzenleme-kose';
const MANYETIK_KAYNAK = 'duzenleme-manyetik';

/** Elle eklenebilen mekân türleri — açılır listede çıkar */
const MEKAN_TURLERI = [
  'kafe', 'meyhane', 'restoran', 'dükkân', 'konut', 'apartman', 'otel',
  'kamu binası', 'okul', 'pazar', 'tesis', 'kulüp', 'iskele', 'yapı'
];

type Sekme = 'sinir' | 'yol' | 'mekan';

const SINIR_ADI: Record<string, string> = {
  sinir_cember: 'Çember Sınırı',
  sinir_dogu: 'Doğu sınırı',
  sinir_kuzey: 'Kuzey sınırı',
  sinir_bati: 'Batı sınırı',
  sinir_guney: 'Güney sınırı'
};

const TUR_BASLIK: Record<string, string> = {
  'ana yol': 'Ana yol',
  cadde: 'Cadde',
  yol: 'Yol',
  merdiven: 'Merdiven'
};

/** Radyalin ilk ucu çembere, son ucu kıyıya yapışık kalmalı */
type UcTuru = 'serbest' | 'cember' | 'kiyi';

function ucTuru(
  sekme: Sekme, hatId: string, sira: number, uzunluk: number
): UcTuru {
  if (sekme === 'yol') return 'serbest';
  if (hatId === CEMBER_ID) return 'serbest';
  if (sira === 0) return 'cember';
  if (sira === uzunluk - 1) return 'kiyi';
  return 'serbest';
}

/** Bir halkanın üstünde, verilen noktaya en yakın konum */
function halkayaYapistir(halka: Nokta[], nokta: Nokta): Nokta {
  let en: Nokta = halka[0];
  let enMesafe = Infinity;
  for (let i = 0; i < halka.length; i++) {
    const a = halka[i];
    const b = halka[(i + 1) % halka.length];
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const kare = vx * vx + vy * vy;
    let t = kare === 0 ? 0 : ((nokta[0] - a[0]) * vx + (nokta[1] - a[1]) * vy) / kare;
    t = Math.max(0, Math.min(1, t));
    const p: Nokta = [a[0] + vx * t, a[1] + vy * t];
    const d = Math.hypot(p[0] - nokta[0], p[1] - nokta[1]);
    if (d < enMesafe) { enMesafe = d; en = p; }
  }
  return en;
}

/** Mekân sürüklemesinde `sira` yerine kullanılan işaret */
const MEKAN_SIRA = -1;

interface Secim { hatId: string; sira: number; }

export interface HaritaDuzenleyiciProps {
  /** Açılıştaki kayıtlı düzen — bileşen yalnızca yüklendikten sonra kurulmalı */
  duzen: HaritaDuzeni | null;
  kaydet: (duzen: HaritaDuzeni) => Promise<void>;
  durum: KayitDurumu;
  hata?: string | null;
  /** Verilirse üstte "Bitti" düğmesi çıkar */
  onKapat?: () => void;
  className?: string;
}

const DURUM_METNI: Record<KayitDurumu, string> = {
  yukleniyor: 'Yükleniyor…',
  hazir: 'Kayıtlı',
  kaydediliyor: 'Kaydediliyor…',
  kaydedildi: 'Kaydedildi',
  yerelde: 'Buluta yazılamadı — bu tarayıcıda saklandı'
};

/** Klavye kısayolları bir metin kutusuna yazarken tetiklenmesin */
function yaziAlaninda(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const etiket = el.tagName;
  return etiket === 'INPUT' || etiket === 'TEXTAREA' || etiket === 'SELECT'
    || el.isContentEditable;
}

const TASLAK_ANAHTARI = 'kems_harita_taslak';

function taslakYaz(d: HaritaDuzeni) {
  try { localStorage.setItem(TASLAK_ANAHTARI, JSON.stringify({ ...d, guncelleme: Date.now() })); }
  catch { /* depolama kapalı */ }
}
function taslakOku(): HaritaDuzeni | null {
  try {
    const ham = localStorage.getItem(TASLAK_ANAHTARI);
    if (!ham) return null;
    const v = JSON.parse(ham);
    return v && v.hatlar && v.yollar ? v as HaritaDuzeni : null;
  } catch { return null; }
}
function taslakSil() {
  try { localStorage.removeItem(TASLAK_ANAHTARI); } catch { /* yok */ }
}

export const HaritaDuzenleyici: React.FC<HaritaDuzenleyiciProps> = ({
  duzen, kaydet, durum: kayitDurumu, hata, onKapat, className
}) => {
  const kapsayici = useRef<HTMLDivElement | null>(null);
  const harita = useRef<MLMap | null>(null);
  const [hazir, setHazir] = useState(false);
  const [kotHazir, setKotHazir] = useState(false);

  const kiyi = useMemo(() => kiyiHalkasi(), []);
  const yolKayitlari = useMemo(() => baslangicYollari(), []);

  const [sekme, setSekme] = useState<Sekme>('sinir');
  const [hatlar, setHatlar] = useState<SinirHatlari>(() => birlesikHatlar(duzen));
  const [yollar, setYollar] = useState<SinirHatlari>(() => birlesikYollar(duzen));
  const [seciliYol, setSeciliYol] = useState<string | null>(null);
  const [mekanlar, setMekanlar] = useState<MekanDuzeni>(
    () => duzen?.mekanlar ?? {}
  );
  const [seciliMekan, setSeciliMekan] = useState<string | null>(null);
  /** Açıkken haritaya tıklamak yeni mekân koyar */
  const [ekleKipi, setEkleKipi] = useState(false);
  /** Mekân listesindeki arama kutusu */
  const [mekanArama, setMekanArama] = useState('');
  /** Toplu işlem için işaretlenen mekânlar */
  const [isaretli, setIsaretli] = useState<Set<string>>(() => new Set());
  const [secim, setSecim] = useState<Secim | null>(null);
  const [gecmis, setGecmis] = useState<Array<{
    sekme: Sekme; hatlar: SinirHatlari; yollar: SinirHatlari;
    mekanlar: MekanDuzeni;
  }>>([]);
  const [ileti, setIleti] = useState<string | null>(null);

  /**
   * Tam ekran. Sekme içindeki panel sınır çizmek için dar kalıyor; bu kip
   * düzenleyiciyi pencerenin tamamına yayar. Esc ile kapanır.
   */
  const [tamEkran, setTamEkran] = useState(false);

  const [manyetik, setManyetik] = useState(true);
  /**
   * Katman görünürlüğü. Kemal: "mahalleler her saniye açık kalmak zorunda
   * değil, harita işlemlerini aç kapa olarak yapabiliriz."
   *
   * Not: alttaki "Mıknatıs" kutucukları görünürlük değil, köşenin neye
   * yapışacağını seçiyordu — Kemal onları katman anahtarı sandı. Artık
   * görünürlüğün kendi bloğu var, mıknatısınki ayrı ve öyle adlandırıldı.
   */
  const [acikKatmanlar, setAcikKatmanlar] = useState<Set<string>>(
    () => new Set(['bolge-dolgu', 'yollar', 'esyukselti', 'kiyi'])
  );
  const katmaniCevir = useCallback((id: string) => {
    setAcikKatmanlar(s => {
      const y = new Set(s);
      y.has(id) ? y.delete(id) : y.add(id);
      return y;
    });
  }, []);

  const [manyetikTur, setManyetikTur] = useState<Set<ManyetikTur>>(
    () => new Set<ManyetikTur>(['yol', 'esyukselti', 'kiyi'])
  );
  const [yapisti, setYapisti] = useState<string | null>(null);

  // Fare olayları React durumunu okuyamıyor (harita bir kez kuruluyor),
  // güncel hâli ref'te tutuyoruz.
  // Arka plandaki yollar ve mıknatıs, yolların ŞİMDİKİ hâlini kullansın
  // (kayıtlı düzen + bu oturumdaki değişiklikler), üreteçteki eskisini değil.
  const yolDuzeni = useMemo(
    () => ({ ...duzeniCikar({}, yollar, mekanlar), hatlar: {} }),
    [yollar, mekanlar]
  );
  const canliGeo = useMemo<FeatureCollection>(
    () => duzeniUygula(DUZADA_GEO, yolDuzeni),
    [yolDuzeni]
  );

  const durum = useRef({
    sekme, hatlar, yollar, seciliYol, manyetik, manyetikTur, canliGeo,
    mekanlar, ekleKipi
  });
  durum.current = {
    sekme, hatlar, yollar, seciliYol, manyetik, manyetikTur, canliGeo,
    mekanlar, ekleKipi
  };
  const surukleme = useRef<Secim | null>(null);
  // Ctrl+S klavye dinleyicisi aşağıda tanımlanan kaydetme işlevine buradan ulaşır
  const kaydetRef = useRef<() => Promise<void>>(async () => {});

  const yolBilgisi = useMemo(
    () => Object.fromEntries(yolKayitlari.map(y => [y.id, y])),
    [yolKayitlari]
  );

  /** O anda ekranda düzenlenen hatlar */
  const aktifHatlar = useMemo((): SinirHatlari => {
    if (sekme === 'sinir') return hatlar;
    if (!seciliYol) return {};
    return { [seciliYol]: yollar[seciliYol] ?? [] };
  }, [sekme, hatlar, yollar, seciliYol]);

  const bolgeler = useMemo(
    () => bolgeleriKur(hatlar, kiyi, DUZADA_DILIM_SIRASI),
    [hatlar, kiyi]
  );

  const gecmiseYaz = useCallback(() => {
    setGecmis(g => [...g.slice(-40), {
      sekme: durum.current.sekme,
      hatlar: durum.current.hatlar,
      yollar: durum.current.yollar,
      mekanlar: durum.current.mekanlar
    }]);
  }, []);

  const geriAl = useCallback(() => {
    setGecmis(g => {
      if (!g.length) return g;
      const son = g[g.length - 1];
      setSekme(son.sekme);
      setHatlar(son.hatlar);
      setYollar(son.yollar);
      setMekanlar(son.mekanlar);
      return g.slice(0, -1);
    });
  }, []);

  const hattiYaz = useCallback((id: string, nokta: Nokta[]) => {
    if (durum.current.sekme === 'sinir') setHatlar(h => ({ ...h, [id]: nokta }));
    else setYollar(y => ({ ...y, [id]: nokta }));
  }, []);

  // ---- harita kurulumu ----------------------------------------------------
  useEffect(() => {
    if (!kapsayici.current || harita.current) return;
    araziProtokolunuKur();
    kotlariYukle().then(() => setKotHazir(true)).catch(() => setKotHazir(false));

    const map = new maplibregl.Map({
      container: kapsayici.current,
      style: {
        version: 8,
        sources: {
          [KAYNAK]: { type: 'geojson', data: durum.current.canliGeo as never },
          [ARAZI_KAYNAK]: araziKaynagi(),
          [BOLGE_KAYNAK]: { type: 'geojson', data: bolgeGeoJSON([]) as never },
          [HAT_KAYNAK]: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] } as never
          },
          [KOSE_KAYNAK]: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] } as never
          },
          [MANYETIK_KAYNAK]: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] } as never
          }
        },
        layers: [
          { id: 'deniz', type: 'background', paint: { 'background-color': DENIZ.orta } }
        ]
      },
      center: DUZADA_MERKEZ,
      zoom: 10.6,
      minZoom: 9.5,
      maxZoom: 18,
      attributionControl: false
    });
    harita.current = map;
    (window as unknown as { __duzadaDuzenleyici?: MLMap }).__duzadaDuzenleyici = map;
    map.addControl(new maplibregl.NavigationControl({}), 'top-right');
    map.doubleClickZoom.disable();

    const kur = () => {
      if (map.getLayer('ada')) return;
      map.setTerrain({ source: ARAZI_KAYNAK, exaggeration: ARAZI_ABARTI });
      map.setSky({
        'sky-color': GOK.ust, 'horizon-color': GOK.ufuk, 'fog-color': GOK.pus,
        'sky-horizon-blend': 0.9, 'fog-ground-blend': 0.72
      });

      map.addLayer({
        id: 'ada', type: 'fill', source: KAYNAK,
        filter: ['==', ['get', 'katman'], 'ada'],
        paint: { 'fill-color': KARA.taban }
      });

      YUKSELTI.slice(1).forEach(({ esik, renk }) => {
        map.addLayer({
          id: `rolyef-${esik}`, type: 'fill', source: KAYNAK,
          filter: ['all', ['==', ['get', 'katman'], 'rolyef'],
            ['==', ['get', 'esik'], esik]],
          paint: { 'fill-color': renk, 'fill-opacity': 0.85 }
        });
      });

      map.addLayer({
        id: 'bolge-dolgu', type: 'fill', source: BOLGE_KAYNAK,
        paint: {
          'fill-color': [
            'match', ['get', 'id'],
            ...Object.entries(MAHALLE_TONU).flat(), '#8a7757'
          ] as unknown as maplibregl.ExpressionSpecification,
          'fill-opacity': MAHALLE_TON_GUCU * 1.7
        }
      });

      // Eşyükselti çizgileri — hem okunurluk hem mıknatıs hedefi
      map.addLayer({
        id: 'esyukselti', type: 'line', source: KAYNAK,
        filter: ['==', ['get', 'katman'], 'rolyef'],
        paint: {
          'line-color': '#8a7757', 'line-opacity': 0.35, 'line-width': 0.8
        }
      });

      map.addLayer({
        id: 'kiyi', type: 'line', source: KAYNAK,
        filter: ['==', ['get', 'katman'], 'ada'],
        paint: { 'line-color': KARA.kiyiCizgi, 'line-width': 1.4 }
      });

      /*
       * Yol ağı. Bu katmanın filtresi `id == '__yok__'` olarak kalmıştı —
       * yani hiçbir zaman hiçbir şey çizmiyordu. Düzenleyicide görünen tek
       * yol, seçtiğin yolun kontrol noktalarıydı. Kemal'in iki şikâyeti de
       * buradan geliyordu: "yollarda düzenleme yaparken hepsi kapanıyor,
       * nereye yol çektiğimi göremiyorum" ve "binayı nereye eklediğimi
       * göremiyorum yollar görünmediği için".
       */
      map.addLayer({
        id: 'yollar', type: 'line', source: KAYNAK,
        filter: ['==', ['get', 'katman'], 'yol'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': YOL.kaplama, 'line-opacity': 0.5,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 4]
        }
      });

      // Mekânlar (H3) — düzenleyicide binalar 2B çizilir; amaç görünürlük
      // değil, tutulup taşınabilmeleri. Üç boyutlu hâli görüntüleme
      // haritasında.
      map.addLayer({
        id: 'mekanlar-dolgu', type: 'fill', source: KAYNAK,
        filter: ['==', ['get', 'katman'], 'bina'],
        paint: {
          'fill-color': [
            'case', ['boolean', ['get', 'elle'], false], '#336659', '#8a7a5e'
          ],
          'fill-opacity': 0.55
        }
      });
      map.addLayer({
        id: 'mekan-secili', type: 'line', source: KAYNAK,
        filter: ['==', ['get', 'id'], '__yok__'],
        paint: { 'line-color': '#d35057', 'line-width': 2.5 }
      });

      // Seçili yol — tıklayınca hangisini seçtiğin belli olsun
      map.addLayer({
        id: 'yol-secili', type: 'line', source: KAYNAK,
        filter: ['==', ['get', 'id'], '__yok__'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#d35057', 'line-opacity': 0.55,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 20],
          'line-blur': 1.5
        }
      });

      map.addLayer({
        id: 'sinir-hat', type: 'line', source: HAT_KAYNAK,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case', ['boolean', ['get', 'uyari'], false], '#d35057', '#3a2f22'
          ],
          'line-width': 2.6,
          'line-dasharray': [2, 1.6]
        }
      });

      map.addLayer({
        id: 'sinir-kose', type: 'circle', source: KOSE_KAYNAK,
        paint: {
          'circle-radius': [
            'case', ['boolean', ['get', 'secili'], false], 7,
            ['==', ['get', 'uc'], 'serbest'], 4.5, 5.5
          ],
          'circle-color': [
            'case',
            ['boolean', ['get', 'secili'], false], '#d35057',
            ['==', ['get', 'uc'], 'serbest'], '#f3efe8', '#bba591'
          ],
          'circle-stroke-color': '#3a2f22',
          'circle-stroke-width': 1.2
        }
      });

      // Mıknatıs yakaladığında nereye yapıştığını gösteren halka
      map.addLayer({
        id: 'manyetik-isaret', type: 'circle', source: MANYETIK_KAYNAK,
        paint: {
          'circle-radius': 11,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': '#336659',
          'circle-stroke-width': 2
        }
      });

      setHazir(true);
    };

    if (map.isStyleLoaded()) kur();
    else map.once('load', kur);

    // ---- sürükleme ----
    const yakinKose = (e: MapMouseEvent): Secim | null => {
      // Mekânlar sekmesinde sürüklenen şey bir köşe değil, binanın kendisi.
      // Aynı sürükleme düzeneğini kullanabilmek için sıra = -1 veriyoruz.
      if (durum.current.sekme === 'mekan') {
        const bina = map.queryRenderedFeatures(
          [[e.point.x - 4, e.point.y - 4], [e.point.x + 4, e.point.y + 4]],
          { layers: ['mekanlar-dolgu'] }
        )[0];
        if (!bina) return null;
        const bp = bina.properties as Record<string, unknown>;
        return { hatId: String(bp.id), sira: MEKAN_SIRA };
      }
      const vurulan = map.queryRenderedFeatures(
        [[e.point.x - 9, e.point.y - 9], [e.point.x + 9, e.point.y + 9]],
        { layers: ['sinir-kose'] }
      );
      const f = vurulan[0];
      if (!f) return null;
      const p = f.properties as Record<string, unknown>;
      return { hatId: String(p.hatId), sira: Number(p.sira) };
    };

    /** Ekrandaki `piksel` kadar mesafenin derece karşılığı */
    const dereceEsigi = (piksel: number) => {
      const a = map.unproject([0, 0]);
      const b = map.unproject([piksel, 0]);
      return Math.abs(b.lng - a.lng);
    };

    const basla = (e: MapMouseEvent) => {
      const k = yakinKose(e);
      if (!k) return;
      e.preventDefault();
      surukleme.current = k;
      if (k.sira === MEKAN_SIRA) { setSeciliMekan(k.hatId); setSecim(null); }
      else setSecim(k);
      gecmiseYaz();
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    };

    const hareket = (e: MapMouseEvent) => {
      if (!surukleme.current) {
        map.getCanvas().style.cursor = yakinKose(e) ? 'grab' : '';
        return;
      }
      const { hatId, sira } = surukleme.current;
      const d = durum.current;

      // Mekân taşıma: bina merkezi imleci izler
      if (sira === MEKAN_SIRA) {
        const konum: Nokta = [e.lngLat.lng, e.lngLat.lat];
        setMekanlar(m => ({
          ...m,
          [hatId]: {
            ...(m[hatId] ?? {}),
            konum,
            taban: Number(kotOku(konum[0], konum[1]).toFixed(1))
          }
        }));
        return;
      }

      const mevcut = d.sekme === 'sinir' ? d.hatlar[hatId] : d.yollar[hatId];
      if (!mevcut) return;

      let yeni: Nokta = [e.lngLat.lng, e.lngLat.lat];
      const tur = ucTuru(d.sekme, hatId, sira, mevcut.length);

      // Mıknatıs önce: yola/eşyükseltiye yapış
      let yapisan: string | null = null;
      if (d.manyetik) {
        const cekim = manyetikCek(
          yeni, dereceEsigi(13), d.manyetikTur, d.canliGeo,
          d.sekme === 'yol' ? hatId : null
        );
        if (cekim) {
          yeni = cekim.nokta;
          yapisan = `${cekim.tur === 'yol' ? 'yol' :
            cekim.tur === 'kiyi' ? 'kıyı' : 'eşyükselti'} · ${cekim.ad}`;
        }
      }
      // Uç kuralı mıknatısı ezer: çember/kıyı bağı kopmamalı
      if (tur === 'kiyi') { yeni = halkayaYapistir(kiyi, yeni); yapisan = 'kıyı'; }
      if (tur === 'cember') {
        yeni = halkayaYapistir(
          catmullRom(d.hatlar[CEMBER_ID] ?? kiyi, true, 8), yeni
        );
        yapisan = 'çember';
      }
      setYapisti(yapisan);

      const kopya = [...mevcut];
      kopya[sira] = yeni;
      if (d.sekme === 'sinir') setHatlar(h => ({ ...h, [hatId]: kopya }));
      else setYollar(y => ({ ...y, [hatId]: kopya }));
    };

    const bitir = () => {
      if (!surukleme.current) return;
      surukleme.current = null;
      setYapisti(null);
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    };

    map.on('mousedown', basla);
    map.on('mousemove', hareket);
    map.on('mouseup', bitir);
    map.on('mouseout', bitir);

    return () => { map.remove(); harita.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- çizim güncellemesi -------------------------------------------------
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir) return;

    (map.getSource(BOLGE_KAYNAK) as maplibregl.GeoJSONSource)
      ?.setData(bolgeGeoJSON(bolgeler) as never);

    const girdiler = Object.entries(aktifHatlar) as Array<[string, Nokta[]]>;

    const hatOzellik = girdiler.map(([id, nokta]) => {
      const kapali = sekme === 'sinir'
        ? id === CEMBER_ID
        : Boolean(yolBilgisi[id]?.kapali);
      const egri = catmullRom(nokta, kapali, 8);
      const uyari = sekme === 'yol' && kotHazir && denizeTasiyorMu(egri);
      return {
        type: 'Feature' as const,
        properties: { id, uyari },
        geometry: {
          type: 'LineString' as const,
          coordinates: kapali ? [...egri, egri[0]] : egri
        }
      };
    });
    (map.getSource(HAT_KAYNAK) as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection', features: hatOzellik
    } as never);

    const koseler = girdiler.flatMap(([id, nokta]) =>
      nokta.map((n, i) => ({
        type: 'Feature' as const,
        properties: {
          hatId: id, sira: i,
          uc: ucTuru(sekme, id, i, nokta.length),
          secili: secim?.hatId === id && secim?.sira === i
        },
        geometry: { type: 'Point' as const, coordinates: n }
      }))
    );
    (map.getSource(KOSE_KAYNAK) as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection', features: koseler
    } as never);
  }, [aktifHatlar, bolgeler, secim, hazir, sekme, yolBilgisi, kotHazir]);

  // Arka plan yollarını güncelle — sürükleme bitince, sık değil
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir) return;
    const z = setTimeout(() => {
      (map.getSource(KAYNAK) as maplibregl.GeoJSONSource | undefined)
        ?.setData(canliGeo as never);
    }, 300);
    return () => clearTimeout(z);
  }, [canliGeo, hazir]);

  // Mıknatıs işareti
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir) return;
    const kose = secim && aktifHatlar[secim.hatId]?.[secim.sira];
    const goster = yapisti && kose;
    (map.getSource(MANYETIK_KAYNAK) as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: goster ? [{
        type: 'Feature', properties: {},
        geometry: { type: 'Point', coordinates: kose }
      }] : []
    } as never);
  }, [yapisti, secim, aktifHatlar, hazir]);

  /**
   * Seçili köşeyi siler.
   *
   * Hem Delete tuşu hem panelin "Köşeyi sil" düğmesi buraya bağlı — klavye
   * kısayolu tek yol olarak kalırsa kimse bulamıyor.
   *
   * @returns silinebildi mi (düğmenin sebebi göstermesi için)
   */
  const koseyiSil = useCallback((): boolean => {
    if (!secim) return false;
    const hat = aktifHatlar[secim.hatId];
    if (!hat || hat.length <= 4) {
      setIleti('Hat en az dört köşeli kalmalı.');
      return false;
    }
    if (ucTuru(sekme, secim.hatId, secim.sira, hat.length) !== 'serbest') {
      setIleti('Uç köşe silinemez — çembere ve kıyıya bağlı kalmalı.');
      return false;
    }
    gecmiseYaz();
    hattiYaz(secim.hatId, hat.filter((_, i) => i !== secim.sira));
    setSecim(null);
    return true;
  }, [secim, aktifHatlar, sekme, gecmiseYaz, hattiYaz]);

  /** Seçili köşe silinebilir mi — düğmenin açık/soluk olması için */
  const silinebilir = useMemo(() => {
    if (!secim) return false;
    const hat = aktifHatlar[secim.hatId];
    if (!hat || hat.length <= 4) return false;
    return ucTuru(sekme, secim.hatId, secim.sira, hat.length) === 'serbest';
  }, [secim, aktifHatlar, sekme]);

  // ---- klavye -------------------------------------------------------------
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (yaziAlaninda(e)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); void kaydetRef.current(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); geriAl(); return;
      }
      if (e.key === 'm' || e.key === 'M') { setManyetik(m => !m); return; }
      if (e.key === 'Escape') { setTamEkran(false); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && secim) {
        e.preventDefault();
        koseyiSil();
      }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [secim, geriAl, koseyiSil]);

  // ---- köşe ekleme: hatta çift tık ---------------------------------------
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir) return;
    const ciftTik = (e: MapMouseEvent) => {
      const vurulan = map.queryRenderedFeatures(
        [[e.point.x - 8, e.point.y - 8], [e.point.x + 8, e.point.y + 8]],
        { layers: ['sinir-hat'] }
      );
      const f = vurulan[0];
      if (!f) return;
      e.preventDefault();
      const id = String((f.properties as Record<string, unknown>).id);
      const d = durum.current;
      const hat = d.sekme === 'sinir' ? d.hatlar[id] : d.yollar[id];
      if (!hat) return;
      const tikla: Nokta = [e.lngLat.lng, e.lngLat.lat];
      const kapali = d.sekme === 'sinir'
        ? id === CEMBER_ID : Boolean(yolBilgisi[id]?.kapali);
      let enIyi = 0;
      let enMesafe = Infinity;
      const son = kapali ? hat.length : hat.length - 1;
      for (let i = 0; i < son; i++) {
        const a = hat[i];
        const b = hat[(i + 1) % hat.length];
        const orta: Nokta = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const m = Math.hypot(orta[0] - tikla[0], orta[1] - tikla[1]);
        if (m < enMesafe) { enMesafe = m; enIyi = i; }
      }
      gecmiseYaz();
      const kopya = [...hat];
      kopya.splice(enIyi + 1, 0, tikla);
      hattiYaz(id, kopya);
      setSecim({ hatId: id, sira: enIyi + 1 });
    };
    map.on('dblclick', ciftTik);
    return () => { map.off('dblclick', ciftTik); };
  }, [hazir, gecmiseYaz, hattiYaz, yolBilgisi]);

  // ---- mekânlar (H3) ------------------------------------------------------

  /** Haritadaki bütün mekânlar: üreteçten gelenler + elle eklenenler */
  const mekanListesi = useMemo(() => {
    const cikti: Array<{
      id: string; ad: string; tur: string; mahalle: string | null;
      elle: boolean; silindi: boolean;
    }> = [];
    for (const f of DUZADA_GEO.features) {
      const p = f.properties as Record<string, unknown> | null;
      if (!p || p.katman !== 'bina') continue;
      const id = String(p.id);
      const d = mekanlar[id];
      cikti.push({
        id,
        ad: String(d?.ad ?? p.ad ?? id),
        tur: String(d?.tur ?? p.tur ?? 'yapı'),
        mahalle: (d?.mahalle ?? p.mahalle ?? null) as string | null,
        elle: false,
        silindi: Boolean(d?.silindi)
      });
    }
    for (const [id, d] of Object.entries(mekanlar) as Array<
      [string, MekanDuzeni[string]]
    >) {
      if (!d.yeni) continue;
      cikti.push({
        id, ad: d.ad ?? 'Adsız mekân', tur: d.tur ?? 'yapı',
        mahalle: d.mahalle ?? null, elle: true, silindi: Boolean(d.silindi)
      });
    }
    return cikti.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  }, [mekanlar]);

  /** Bir mekânın haritadaki konumu — taşınmışsa yeni, değilse üreteçteki */
  const mekanKonumu = useCallback((id: string): Nokta | null => {
    const d = mekanlar[id];
    if (d?.konum) return d.konum;
    for (const f of DUZADA_GEO.features) {
      const p = f.properties as Record<string, unknown> | null;
      if (!p || String(p.id) !== id || f.geometry.type !== 'Polygon') continue;
      return poligonMerkezi((f.geometry.coordinates as Nokta[][])[0]);
    }
    return null;
  }, [mekanlar]);

  /**
   * Listeden seçilen mekâna git. Binalar ada ölçeğinde görünmeyecek kadar
   * küçük; seçip de haritada bulamamak en can sıkıcı yanıydı.
   */
  const mekanaGit = useCallback((id: string) => {
    setSeciliMekan(id);
    setSecim(null);
    const k = mekanKonumu(id);
    const map = harita.current;
    if (!k || !map) return;
    map.easeTo({
      center: k, zoom: Math.max(map.getZoom(), 17), duration: 700
    });
  }, [mekanKonumu]);

  const seciliMekanKaydi = useMemo(
    () => mekanListesi.find(m => m.id === seciliMekan) ?? null,
    [mekanListesi, seciliMekan]
  );

  /** Konumun hangi mahalleye düştüğü — mekân eklerken kendiliğinden bulunur */
  const mahalleBul = useCallback((nokta: Nokta): string | null => {
    for (const b of bolgeler) {
      const h = b.halka;
      let icinde = false;
      for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
        const [xi, yi] = h[i]; const [xj, yj] = h[j];
        if ((yi > nokta[1]) !== (yj > nokta[1])
          && nokta[0] < ((xj - xi) * (nokta[1] - yi)) / (yj - yi) + xi) {
          icinde = !icinde;
        }
      }
      if (icinde) return b.id;
    }
    return null;
  }, [bolgeler]);

  /** Haritada tıklanan yere yeni bir mekân koyar */
  const mekanEkle = useCallback((nokta: Nokta) => {
    const id = yeniMekanId(durum.current.mekanlar);
    gecmiseYaz();
    setMekanlar(m => ({
      ...m,
      [id]: {
        yeni: true, ad: 'Yeni mekân', tur: 'yapı', konum: nokta,
        mahalle: mahalleBul(nokta),
        taban: Number(kotOku(nokta[0], nokta[1]).toFixed(1)),
        yukseklik: MEKAN_YUKSEKLIK, yaricap: MEKAN_YARICAP
      }
    }));
    setSeciliMekan(id);
    setEkleKipi(false);
    setIleti('Mekân eklendi — adını ve türünü panelden yaz.');
  }, [gecmiseYaz, mahalleBul]);

  /** Seçili mekânın bir alanını değiştirir */
  const mekaniGuncelle = useCallback((id: string, yama: Record<string, unknown>) => {
    setMekanlar(m => ({ ...m, [id]: { ...(m[id] ?? {}), ...yama } }));
  }, []);

  /** Elle eklenen mekân tamamen silinir; üretilmiş yapı gizlenir */
  const mekaniSil = useCallback((id: string) => {
    gecmiseYaz();
    setMekanlar(m => {
      const kopya = { ...m };
      if (kopya[id]?.yeni) delete kopya[id];
      else kopya[id] = { ...(kopya[id] ?? {}), silindi: true };
      return kopya;
    });
    setSeciliMekan(null);
  }, [gecmiseYaz]);

  /** Arama kutusuna uyan mekânlar */
  const suzulmusMekanlar = useMemo(() => {
    const a = mekanArama.trim().toLocaleLowerCase('tr');
    if (!a) return mekanListesi;
    return mekanListesi.filter(
      m => m.ad.toLocaleLowerCase('tr').includes(a)
        || m.tur.toLocaleLowerCase('tr').includes(a)
    );
  }, [mekanListesi, mekanArama]);

  /**
   * Mekânları mahalleye göre grupla (Kemal: "tüm mekânlar tek listede,
   * bunun mahalleye göre bölünmesi lazım") ve gizlenenleri listeden çıkar
   * ("silinen mekânlar hâlâ burada duruyor"). Gizlenenler kaybolmuyor,
   * listenin altında kendi katlanır bölümünde duruyor — geri alınabilsin.
   */
  const MAHALLE_ADLARI: Record<string, string> = {
    yer_merkez: 'Merkez', yer_liman: 'Liman', yer_iskele: 'İskele',
    yer_stadyum: 'Stadyum', yer_ciftlik: 'Çiftlik'
  };

  const mekanGruplari = useMemo(() => {
    const gorunen = suzulmusMekanlar.filter(m => !m.silindi);
    const harita = new Map<string, typeof gorunen>();
    for (const m of gorunen) {
      const ad = m.mahalle ? MAHALLE_ADLARI[m.mahalle] ?? m.mahalle : 'Mahallesiz';
      if (!harita.has(ad)) harita.set(ad, []);
      harita.get(ad)!.push(m);
    }
    return [...harita.entries()].sort((x, y) => {
      if (x[0] === 'Mahallesiz') return 1;
      if (y[0] === 'Mahallesiz') return -1;
      return x[0].localeCompare(y[0], 'tr');
    });
  }, [suzulmusMekanlar]);

  const gizlenenMekanlar = useMemo(
    () => suzulmusMekanlar.filter(m => m.silindi),
    [suzulmusMekanlar]
  );
  const [gizlenenAcik, setGizlenenAcik] = useState(false);
  const [kapaliMahalleler, setKapaliMahalleler] = useState<Set<string>>(
    () => new Set()
  );
  const mahalleyiCevir = useCallback((ad: string) => {
    setKapaliMahalleler(s => {
      const y = new Set(s);
      y.has(ad) ? y.delete(ad) : y.add(ad);
      return y;
    });
  }, []);

  const isaretiCevir = useCallback((id: string) => {
    setIsaretli(s => {
      const y = new Set(s);
      if (y.has(id)) y.delete(id); else y.add(id);
      return y;
    });
  }, []);

  /** Süzülmüş listenin tamamını işaretler ya da işareti kaldırır */
  const hepsiniIsaretle = useCallback(() => {
    setIsaretli(s => {
      const gorunen = suzulmusMekanlar.filter(m => !m.silindi).map(m => m.id);
      const hepsiVar = gorunen.length > 0 && gorunen.every(id => s.has(id));
      const y = new Set(s);
      gorunen.forEach(id => { if (hepsiVar) y.delete(id); else y.add(id); });
      return y;
    });
  }, [suzulmusMekanlar]);

  /** İşaretli mekânları tek hamlede kaldırır — tek Ctrl+Z ile geri gelir */
  const isaretlileriSil = useCallback(() => {
    if (!isaretli.size) return;
    gecmiseYaz();
    setMekanlar(m => {
      const kopya = { ...m };
      isaretli.forEach(id => {
        if (kopya[id]?.yeni) delete kopya[id];
        else kopya[id] = { ...(kopya[id] ?? {}), silindi: true };
      });
      return kopya;
    });
    setIleti(`${isaretli.size} mekân haritadan kaldırıldı — Ctrl+Z geri alır.`);
    setIsaretli(new Set());
    setSeciliMekan(null);
  }, [isaretli, gecmiseYaz]);

  /** Gizlenmiş bir yapıyı geri getirir */
  const mekaniGeriGetir = useCallback((id: string) => {
    gecmiseYaz();
    setMekanlar(m => {
      const kayit = { ...(m[id] ?? {}) };
      delete kayit.silindi;
      const kopya = { ...m };
      if (Object.keys(kayit).length === 0) delete kopya[id];
      else kopya[id] = kayit;
      return kopya;
    });
  }, [gecmiseYaz]);

  // Mekân katmanları yalnız Mekânlar sekmesinde görünsün
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir || !map.getLayer('mekanlar-dolgu')) return;
    const gorunur = sekme === 'mekan' ? 'visible' : 'none';
    map.setLayoutProperty('mekanlar-dolgu', 'visibility', gorunur);
    map.setLayoutProperty('mekan-secili', 'visibility', gorunur);
    map.setFilter('mekan-secili', [
      '==', ['get', 'id'], sekme === 'mekan' && seciliMekan ? seciliMekan : '__yok__'
    ]);
  }, [hazir, sekme, seciliMekan]);

  // Ekleme kipinde haritaya tıklayınca mekân koy
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir || !ekleKipi) return;
    map.getCanvas().style.cursor = 'crosshair';
    const tik = (e: MapMouseEvent) => {
      mekanEkle([e.lngLat.lng, e.lngLat.lat]);
    };
    map.on('click', tik);
    return () => {
      map.off('click', tik);
      const c = map.getCanvas();
      if (c.style.cursor === 'crosshair') c.style.cursor = '';
    };
  }, [hazir, ekleKipi, mekanEkle]);

  // Katman görünürlüğünü haritaya uygula
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir) return;
    for (const id of ['bolge-dolgu', 'yollar', 'esyukselti', 'kiyi']) {
      if (!map.getLayer(id)) continue;
      map.setLayoutProperty(
        id, 'visibility', acikKatmanlar.has(id) ? 'visible' : 'none'
      );
    }
  }, [hazir, acikKatmanlar]);

  // Seçili yolu haritada vurgula
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir || !map.getLayer('yol-secili')) return;
    map.setFilter('yol-secili', [
      '==', ['get', 'id'], sekme === 'yol' && seciliYol ? seciliYol : '__yok__'
    ]);
  }, [hazir, sekme, seciliYol]);

  // Tam ekrana girip çıkınca tuval yeniden ölçülmeli
  useEffect(() => {
    const map = harita.current;
    if (!map) return;
    const z = setTimeout(() => map.resize(), 60);
    return () => clearTimeout(z);
  }, [tamEkran]);

  // ---- yol seçimi: haritada yola tıkla ------------------------------------
  /*
   * Yollar sekmesinde bir yol, listeden seçilene kadar düzenlenebilir hâle
   * gelmiyordu; haritada düz bir çizgi gibi duruyordu. Sınırlar sekmesinde
   * köşeler kendiliğinden göründüğü için bu tutarsızlık "yollar düzenlenemiyor"
   * izlenimi veriyor. Artık yolun üstüne tıklamak da seçiyor.
   */
  useEffect(() => {
    const map = harita.current;
    if (!map || !hazir) return;

    const duzenlenebilirIdler = new Set(yolKayitlari.map(y => y.id));

    /** Tıklanan noktadaki düzenlenebilir yol */
    const yoluBul = (e: MapMouseEvent): string | null => {
      const vurulan = map.queryRenderedFeatures(
        [[e.point.x - 7, e.point.y - 7], [e.point.x + 7, e.point.y + 7]],
        { layers: ['yollar'] }
      );
      for (const f of vurulan) {
        const id = String((f.properties as Record<string, unknown>)?.id ?? '');
        if (duzenlenebilirIdler.has(id)) return id;
      }
      // Düzenlenemeyen bir şeye (sokak) tıklandıysa sebebini söyle
      if (vurulan.length) return '';
      return null;
    };

    const tik = (e: MapMouseEvent) => {
      if (durum.current.sekme !== 'yol') return;
      // Köşe sürüklemesi kendi olayını çalıştırdıysa karışma
      if (surukleme.current) return;
      const id = yoluBul(e);
      if (id === null) return;
      if (id === '') {
        setIleti('Bu yol düzenlenmiyor — sokaklar listede yok.');
        return;
      }
      setSeciliYol(id);
      setSecim(null);
    };

    const imlec = (e: MapMouseEvent) => {
      if (durum.current.sekme !== 'yol' || surukleme.current) return;
      const canvas = map.getCanvas();
      // Köşe imleci (grab) önceliklidir, ona dokunma
      if (canvas.style.cursor === 'grab' || canvas.style.cursor === 'grabbing') return;
      const id = yoluBul(e);
      canvas.style.cursor = id ? 'pointer' : '';
    };

    map.on('click', tik);
    map.on('mousemove', imlec);
    return () => { map.off('click', tik); map.off('mousemove', imlec); };
  }, [hazir, yolKayitlari]);


  // ---- kayıt: Kaydet düğmesi (H1) -----------------------------------------
  // Karar: otomatik kayıt yok. Değişiklik Kaydet'e basınca kalıcı olur.
  // Kaydedilmemiş iş kaybolmasın diye yalnızca bir TASLAK tutulur: düzenleyici
  // kaydedilmeden kapanırsa (sekme değişti, sayfa yenilendi) tarayıcıya
  // yazılır, bir sonraki açılışta "geri yükle / at" diye sorulur.
  const imzasi = (d: HaritaDuzeni) =>
    JSON.stringify(d, (k, v) => (k === 'guncelleme' ? undefined : v));

  const [kayitliImza, setKayitliImza] = useState(() =>
    imzasi(duzeniCikar(birlesikHatlar(duzen), birlesikYollar(duzen), duzen?.mekanlar ?? {}))
  );
  const simdiki = useMemo(
    () => duzeniCikar(hatlar, yollar, mekanlar), [hatlar, yollar, mekanlar]
  );
  const kaydedilmemis = imzasi(simdiki) !== kayitliImza;
  const [cikisSor, setCikisSor] = useState(false);

  const [taslak, setTaslak] = useState<HaritaDuzeni | null>(() => {
    const t = taslakOku();
    if (!t) return null;
    const kayitli = imzasi(duzeniCikar(birlesikHatlar(duzen), birlesikYollar(duzen), duzen?.mekanlar ?? {}));
    if (imzasi(t) === kayitli) { taslakSil(); return null; }
    return t;
  });

  const kaydetDugmesi = useCallback(async () => {
    const d = duzeniCikar(hatlar, yollar, mekanlar);
    setKayitliImza(imzasi(d));
    taslakSil();
    setTaslak(null);
    await kaydet(d);
  }, [hatlar, yollar, mekanlar, kaydet]);
  kaydetRef.current = kaydetDugmesi;

  // Kapanırken ya da sayfa giderken kaydedilmemiş iş varsa taslağa yaz
  const kapanisDurumu = useRef({ kaydedilmemis, simdiki });
  const bilerekVazgecti = useRef(false);
  kapanisDurumu.current = { kaydedilmemis, simdiki };
  useEffect(() => {
    const gidiyor = (e: BeforeUnloadEvent) => {
      if (!kapanisDurumu.current.kaydedilmemis || bilerekVazgecti.current) return;
      taslakYaz(kapanisDurumu.current.simdiki);
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', gidiyor);
    return () => {
      window.removeEventListener('beforeunload', gidiyor);
      if (kapanisDurumu.current.kaydedilmemis && !bilerekVazgecti.current) {
        taslakYaz(kapanisDurumu.current.simdiki);
      }
    };
  }, []);

  const taslagiYukle = () => {
    if (!taslak) return;
    gecmiseYaz();
    setHatlar(birlesikHatlar(taslak));
    setYollar(birlesikYollar(taslak));
    setTaslak(null);
    setIleti('Taslak yüklendi — kalıcı olması için Kaydet.');
  };
  const taslagiAt = () => { taslakSil(); setTaslak(null); };

  const kapat = () => {
    if (kaydedilmemis) { setCikisSor(true); return; }
    onKapat?.();
  };
  const kaydetVeKapat = async () => {
    setCikisSor(false);
    await kaydetDugmesi();
    onKapat?.();
  };
  const kaydetmedenKapat = () => {
    // Bilerek vazgeçti: taslak da tutulmasın
    bilerekVazgecti.current = true;
    taslakSil();
    setCikisSor(false);
    onKapat?.();
  };

  const kayitliDuzen = !duzenBosMu(simdiki);
  const durumMetni = kaydedilmemis && kayitDurumu !== 'kaydediliyor'
    ? 'Kaydedilmemiş değişiklik var'
    : DURUM_METNI[kayitDurumu];

  // ---- dışa / içe aktarma (yedek) -----------------------------------------
  const paketle = useCallback(() => ({
    surum: 2,
    olusturma: new Date().toISOString(),
    not: 'Düzada harita düzeni — yedek',
    hatlar: Object.fromEntries(
      (Object.entries(hatlar) as Array<[string, Nokta[]]>).map(([id, n]) => [
        id, n.map(p => [Number(p[0].toFixed(6)), Number(p[1].toFixed(6))])
      ])
    ),
    yollar: Object.fromEntries(
      (Object.entries(yollar) as Array<[string, Nokta[]]>).map(([id, n]) => [
        id, n.map(p => [Number(p[0].toFixed(6)), Number(p[1].toFixed(6))])
      ])
    )
  }), [hatlar, yollar]);

  const disaAktar = useCallback(() => {
    const blob = new Blob([JSON.stringify(paketle(), null, 1)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'duzada-harita-duzeni.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setIleti('Yedek indirildi.');
  }, [paketle]);

  const iceAktar = useCallback((dosya: File) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      try {
        const veri = JSON.parse(String(okuyucu.result));
        if (!veri?.hatlar) throw new Error('hatlar yok');
        gecmiseYaz();
        setHatlar(veri.hatlar as SinirHatlari);
        if (veri.yollar) setYollar(y => ({ ...y, ...veri.yollar }));
        setIleti('Düzenleme yüklendi.');
      } catch {
        setIleti('Dosya okunamadı — harita düzeni yedeği olmalı.');
      }
    };
    okuyucu.readAsText(dosya);
  }, [gecmiseYaz]);

  const sifirla = useCallback(() => {
    gecmiseYaz();
    if (sekme === 'sinir') {
      setHatlar(baslangicHatlari());
      setIleti('Sınırlar üretecin hesapladığı hâle döndü.');
    } else {
      setYollar(Object.fromEntries(yolKayitlari.map(y => [y.id, y.kontrol])));
      setIleti('Yollar üretecin hesapladığı hâle döndü.');
    }
    setSecim(null);
  }, [gecmiseYaz, sekme, yolKayitlari]);

  useEffect(() => {
    if (!ileti) return;
    const z = setTimeout(() => setIleti(null), 4500);
    return () => clearTimeout(z);
  }, [ileti]);

  const alanlar = useMemo(() => {
    const toplam = bolgeler.reduce((t, b) => t + b.alan, 0);
    return bolgeler.map(b => ({
      id: b.id, yuzde: toplam ? (b.alan / toplam) * 100 : 0
    }));
  }, [bolgeler]);

  /** Seçili yolun canlı ölçüsü */
  const yolOlcusu = useMemo(() => {
    if (sekme !== 'yol' || !seciliYol || !kotHazir) return null;
    const kontrol = yollar[seciliYol];
    if (!kontrol?.length) return null;
    const egri = catmullRom(kontrol, Boolean(yolBilgisi[seciliYol]?.kapali), 8);
    return { ...yoluOlc(egri), denizde: denizeTasiyorMu(egri) };
  }, [sekme, seciliYol, yollar, yolBilgisi, kotHazir]);

  const yolGruplari = useMemo(() => {
    const gruplar = new Map<string, YolKaydi[]>();
    for (const y of yolKayitlari) {
      if (!gruplar.has(y.tur)) gruplar.set(y.tur, []);
      gruplar.get(y.tur)!.push(y);
    }
    return [...gruplar.entries()];
  }, [yolKayitlari]);

  const turDegistir = (t: ManyetikTur) => {
    setManyetikTur(s => {
      const y = new Set(s);
      if (y.has(t)) y.delete(t); else y.add(t);
      return y;
    });
  };

  const sekmeDugmesi = (s: Sekme, etiket: string) => (
    <button
      onClick={() => { setSekme(s); setSecim(null); }}
      className={`flex-1 py-2 text-[13px] border-b-2 ${sekme === s
        ? 'border-kiremit text-lacivert font-medium'
        : 'border-transparent text-[#6f6047] hover:bg-[#e8dfcc]'}`}
    >
      {etiket}
    </button>
  );

  return (
    <div className={
      tamEkran
        ? 'fixed inset-0 z-50 flex bg-krem'
        : `flex bg-krem ${className ?? 'w-screen h-screen'}`
    }>
      <div className="relative flex-1">
        <div ref={kapsayici} className="duzada-harita w-full h-full" />

        <button
          onClick={() => setTamEkran(t => !t)}
          title={tamEkran ? 'Tam ekrandan çık (Esc)' : 'Tam ekran'}
          className="absolute top-3 left-3 px-3 py-1.5 rounded-sm text-[12px]
                     border border-[#bba591] bg-[#f4efe4]/90 text-[#3a2f22]
                     hover:bg-[#e8dfcc] backdrop-blur-sm"
        >
          {tamEkran ? 'Tam ekrandan çık' : 'Tam ekran'}
        </button>

        {yapisti && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1
                          rounded-sm bg-[#336659] text-krem text-[12px]
                          font-mono pointer-events-none">
            yapıştı: {yapisti}
          </div>
        )}
      </div>

      <aside className="w-80 shrink-0 border-l border-[#bba591] bg-[#f4efe4]
                        overflow-y-auto text-[13px] text-[#3a2f22]">
        <div className="px-4 pt-4 flex items-start gap-2">
          <div className="flex-1">
            <h1 className="font-serif text-lg text-lacivert">Harita düzenleyici</h1>
            <p className={`mt-0.5 font-mono text-[11px] ${
              kayitDurumu === 'yerelde' || kaydedilmemis ? 'text-kiremit' : 'text-[#6f6047]'}`}
              title={hata ?? undefined}>
              {durumMetni}
              {kayitliDuzen && !kaydedilmemis && kayitDurumu !== 'yerelde'
                ? ' · elle düzenleme var' : ''}
            </p>
          </div>
          {onKapat && (
            <button
              onClick={kapat}
              className="shrink-0 px-3 py-1.5 rounded-sm border border-[#bba591]
                         text-[12px] hover:bg-[#e8dfcc]"
            >
              Bitti
            </button>
          )}
        </div>

        <div className="px-4 mt-3 flex gap-2">
          <button
            onClick={() => void kaydetDugmesi()}
            disabled={!kaydedilmemis}
            className="flex-1 py-2 rounded-sm bg-lacivert text-krem font-medium
                       hover:bg-lacivert-800 disabled:opacity-40
                       disabled:cursor-default"
            title="Ctrl+S"
          >
            Kaydet
          </button>
          <button
            onClick={geriAl}
            disabled={!gecmis.length}
            className="px-3 py-2 rounded-sm border border-[#bba591]
                       hover:bg-[#e8dfcc] disabled:opacity-40 disabled:cursor-default"
            title="Ctrl+Z"
          >
            Geri al
          </button>
        </div>

        {cikisSor && (
          <div className="mx-4 mt-3 p-3 rounded-sm border border-kiremit/50 bg-kiremit/10">
            <p className="text-[12px] leading-snug">
              Kaydedilmemiş değişiklik var. Ne yapalım?
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              <button onClick={() => void kaydetVeKapat()}
                className="py-1.5 rounded-sm bg-lacivert text-krem text-[12px]
                           hover:bg-lacivert-800">
                Kaydet ve çık
              </button>
              <button onClick={kaydetmedenKapat}
                className="py-1.5 rounded-sm border border-[#bba591] text-[12px]
                           hover:bg-[#e8dfcc]">
                Kaydetmeden çık
              </button>
              <button onClick={() => setCikisSor(false)}
                className="py-1 text-[12px] text-[#6f6047] hover:underline">
                Vazgeç, düzenlemeye devam
              </button>
            </div>
          </div>
        )}

        {taslak && (
          <div className="mx-4 mt-3 p-3 rounded-sm border border-[#bba591] bg-[#efe7d6]">
            <p className="text-[12px] leading-snug">
              Geçen sefer kaydedilmeden kalmış bir taslak var.
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={taslagiYukle}
                className="flex-1 py-1.5 rounded-sm bg-lacivert text-krem text-[12px]
                           hover:bg-lacivert-800">
                Geri yükle
              </button>
              <button onClick={taslagiAt}
                className="flex-1 py-1.5 rounded-sm border border-[#bba591] text-[12px]
                           hover:bg-[#e8dfcc]">
                At
              </button>
            </div>
          </div>
        )}

        <div className="flex mt-3 border-b border-[#bba591]">
          {sekmeDugmesi('sinir', 'Sınırlar')}
          {sekmeDugmesi('yol', 'Yollar')}
          {sekmeDugmesi('mekan', 'Mekânlar')}
        </div>

        <div className="p-4">
          <ul className="list-disc pl-4 space-y-1 leading-snug text-[#6f6047]">
            {sekme === 'mekan' ? (
              <>
                <li><b className="text-[#3a2f22]">Binaya tıkla</b> — seçer</li>
                <li>Binayı <b className="text-[#3a2f22]">sürükle</b> — taşır</li>
                <li>Listeden seçince harita oraya gider</li>
                <li><b className="text-[#3a2f22]">Ctrl+Z</b> geri alır</li>
              </>
            ) : (
              <>
                {sekme === 'yol' && (
                  <li><b className="text-[#3a2f22]">Yola tıkla</b> — düzenlemek
                    için seçer</li>
                )}
                <li>Köşeyi <b className="text-[#3a2f22]">sürükle</b></li>
                <li>Hatta <b className="text-[#3a2f22]">çift tıkla</b> — köşe ekler</li>
                <li>Köşeyi seçip <b className="text-[#3a2f22]">Delete</b> —
                  ya da aşağıdaki düğme</li>
                <li><b className="text-[#3a2f22]">Ctrl+Z</b> geri alır,
                  <b className="text-[#3a2f22]"> M</b> mıknatısı açıp kapar</li>
              </>
            )}
          </ul>

          {sekme !== 'mekan' && <button
            onClick={() => koseyiSil()}
            disabled={!secim}
            title={
              !secim ? 'Önce bir köşe seç'
                : silinebilir ? 'Delete tuşu da aynı işi yapar'
                  : 'Bu köşe silinemez'
            }
            className={`mt-3 w-full py-2 rounded-sm border text-[13px]
              ${secim && silinebilir
                ? 'border-kiremit text-kiremit hover:bg-[#f0e3e0]'
                : 'border-[#bba591] text-[#6f6047] opacity-50 cursor-default'}`}
          >
            {secim ? 'Seçili köşeyi sil' : 'Köşeyi sil — önce bir köşe seç'}
          </button>}

          {/* --- katman görünürlüğü: her sekmede geçerli --- */}
          <div className="mt-4 p-2.5 rounded-sm border border-[#bba591]
                          bg-[#efe7d6]">
            <div className="font-mono text-[11px] uppercase tracking-wider
                            text-[#6f6047] mb-1.5">Görünen katmanlar</div>
            <div className="space-y-1">
              {([
                ['bolge-dolgu', 'Mahalleler'],
                ['yollar', 'Yollar'],
                ['esyukselti', 'Eşyükseltiler'],
                ['kiyi', 'Kıyı']
              ] as Array<[string, string]>).map(([id, ad]) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acikKatmanlar.has(id)}
                    onChange={() => katmaniCevir(id)}
                  />
                  <span>{ad}</span>
                </label>
              ))}
            </div>
          </div>

          {/* --- mıknatıs: yalnız hat düzenlerken anlamlı --- */}
          {sekme !== 'mekan' && <div className="mt-3 p-2.5 rounded-sm border border-[#bba591]
                          bg-[#efe7d6]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manyetik}
                onChange={e => setManyetik(e.target.checked)}
              />
              <span className="font-medium">Mıknatıs</span>
              <span className="ml-auto font-mono text-[11px] text-[#6f6047]">
                13 px
              </span>
            </label>
            <p className="text-[11px] leading-snug text-[#6f6047] mt-1">
              Köşeyi yaklaştırınca kendiliğinden yapışır.
            </p>
            <p className="text-[11px] text-[#6f6047] mt-2 mb-1">
              Neye yapışsın:
            </p>
            <div className="space-y-1">
              {([
                ['yol', 'Yollara'],
                ['esyukselti', 'Eşyükseltilere'],
                ['kiyi', 'Kıyıya']
              ] as Array<[ManyetikTur, string]>).map(([t, ad]) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!manyetik}
                    checked={manyetikTur.has(t)}
                    onChange={() => turDegistir(t)}
                  />
                  <span className={manyetik ? '' : 'text-[#a89a83]'}>{ad}</span>
                </label>
              ))}
            </div>
          </div>}

          {/* --- sekmeye özel --- */}
          {sekme === 'mekan' ? (
            <>
              <button
                onClick={() => setEkleKipi(k => !k)}
                className={`mt-4 w-full py-2 rounded-sm text-[13px] border
                  ${ekleKipi
                    ? 'bg-[#336659] text-krem border-[#336659]'
                    : 'border-[#bba591] hover:bg-[#e8dfcc]'}`}
              >
                {ekleKipi ? 'Haritada bir yere tıkla — vazgeç' : '+ Yeni mekân ekle'}
              </button>

              {seciliMekanKaydi ? (
                <div className="mt-4 p-3 rounded-sm border border-[#bba591]
                                bg-[#efe7d6] space-y-2.5">
                  <div className="font-mono text-[11px] uppercase tracking-wider
                                  text-[#6f6047]">
                    {seciliMekanKaydi.elle ? 'Elle eklenen mekân' : 'Üretilmiş yapı'}
                  </div>

                  <label className="block">
                    <span className="text-[11px] text-[#6f6047]">Ad</span>
                    <input
                      type="text"
                      value={seciliMekanKaydi.ad}
                      onChange={e =>
                        mekaniGuncelle(seciliMekanKaydi.id, { ad: e.target.value })}
                      className="mt-0.5 w-full px-2 py-1 rounded-sm border
                                 border-[#bba591] bg-krem text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] text-[#6f6047]">Tür</span>
                    <select
                      value={seciliMekanKaydi.tur}
                      onChange={e =>
                        mekaniGuncelle(seciliMekanKaydi.id, { tur: e.target.value })}
                      className="mt-0.5 w-full px-2 py-1 rounded-sm border
                                 border-[#bba591] bg-krem text-[13px]"
                    >
                      {[...new Set([seciliMekanKaydi.tur, ...MEKAN_TURLERI])]
                        .map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>

                  <p className="text-[11px] text-[#6f6047] leading-snug">
                    Mahalle: <b className="text-[#3a2f22]">
                      {seciliMekanKaydi.mahalle
                        ? seciliMekanKaydi.mahalle.replace('yer_', '')
                        : 'konumdan bulunamadı'}
                    </b><br />
                    Taşımak için binayı haritada sürükle.
                  </p>

                  {seciliMekanKaydi.silindi ? (
                    <button
                      onClick={() => mekaniGeriGetir(seciliMekanKaydi.id)}
                      className="w-full py-1.5 rounded-sm border border-[#bba591]
                                 text-[12px] hover:bg-[#e8dfcc]"
                    >
                      Geri getir
                    </button>
                  ) : (
                    <button
                      onClick={() => mekaniSil(seciliMekanKaydi.id)}
                      className="w-full py-1.5 rounded-sm border border-kiremit
                                 text-kiremit text-[12px] hover:bg-[#f0e3e0]"
                    >
                      {seciliMekanKaydi.elle ? 'Mekânı sil' : 'Haritadan kaldır'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-snug text-[#6f6047]">
                  Düzenlemek için <b className="text-[#3a2f22]">haritada bir
                  binaya tıkla</b> ya da aşağıdaki listeden seç. Yeşil olanlar
                  senin elinle eklediklerin.
                </p>
              )}

              <div className="mt-4">
                <div className="font-mono text-[11px] uppercase tracking-wider
                                text-[#6f6047] mb-1.5">
                  Mekânlar · {mekanListesi.filter(m => !m.silindi).length}
                </div>

                <input
                  type="text"
                  value={mekanArama}
                  onChange={e => setMekanArama(e.target.value)}
                  placeholder="Ara — örn. Kemsköy"
                  className="w-full px-2 py-1 rounded-sm border border-[#bba591]
                             bg-krem text-[12px]"
                />

                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <button
                    onClick={hepsiniIsaretle}
                    className="px-2 py-1 rounded-sm border border-[#bba591]
                               hover:bg-[#e8dfcc]"
                  >
                    {mekanArama ? 'Görünenleri seç' : 'Tümünü seç'}
                  </button>
                  {isaretli.size > 0 && (
                    <>
                      <button
                        onClick={isaretlileriSil}
                        className="px-2 py-1 rounded-sm border border-kiremit
                                   text-kiremit hover:bg-[#f0e3e0]"
                      >
                        {isaretli.size} tanesini kaldır
                      </button>
                      <button
                        onClick={() => setIsaretli(new Set())}
                        className="text-[#6f6047] underline"
                      >
                        vazgeç
                      </button>
                    </>
                  )}
                </div>

                {/* Mahalle mahalle — her başlık kendi içinde katlanır */}
                <div className="mt-1.5 max-h-72 overflow-y-auto pr-1">
                  {mekanGruplari.map(([mahalle, liste]) => {
                    const kapali = kapaliMahalleler.has(mahalle);
                    return (
                      <div key={mahalle} className="mb-1.5">
                        <button
                          onClick={() => mahalleyiCevir(mahalle)}
                          className="w-full flex items-center gap-1.5 px-1 py-1
                                     font-mono text-[10px] uppercase tracking-wider
                                     text-[#6f6047] hover:text-[#3a2f22]"
                        >
                          <span className="w-3 text-left">{kapali ? '▸' : '▾'}</span>
                          <span className="flex-1 text-left">{mahalle}</span>
                          <span className="opacity-60">{liste.length}</span>
                        </button>

                        {!kapali && liste.map(m => (
                          <div
                            key={m.id}
                            className={`flex items-center gap-2 px-2 py-1 rounded-sm
                              mb-0.5 ml-3 border text-[12px]
                              ${seciliMekan === m.id
                                ? 'border-kiremit bg-[#f0e3e0]'
                                : 'border-transparent hover:bg-[#e8dfcc]'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isaretli.has(m.id)}
                              onChange={() => isaretiCevir(m.id)}
                              title="Toplu kaldırmak için işaretle"
                              className="shrink-0 cursor-pointer"
                            />
                            <button
                              onClick={() => mekanaGit(m.id)}
                              className="flex-1 text-left flex items-center
                                         justify-between gap-2 min-w-0"
                            >
                              <span className="truncate">
                                {m.elle && <span className="text-[#336659]">• </span>}
                                {m.ad}
                              </span>
                              <span className="shrink-0 text-[10px] text-[#6f6047]">
                                {m.tur}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {!mekanGruplari.length && (
                    <p className="px-2 py-2 text-[11px] text-[#6f6047]">
                      Aramaya uyan mekân yok.
                    </p>
                  )}

                  {/* Gizlenenler listeden çıkar ama kaybolmaz */}
                  {gizlenenMekanlar.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#d9d2c4]">
                      <button
                        onClick={() => setGizlenenAcik(a => !a)}
                        className="w-full flex items-center gap-1.5 px-1 py-1
                                   font-mono text-[10px] uppercase tracking-wider
                                   text-[#6f6047] hover:text-[#3a2f22]"
                      >
                        <span className="w-3 text-left">
                          {gizlenenAcik ? '▾' : '▸'}
                        </span>
                        <span className="flex-1 text-left">Gizlenenler</span>
                        <span className="opacity-60">{gizlenenMekanlar.length}</span>
                      </button>
                      {gizlenenAcik && gizlenenMekanlar.map(m => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-2 py-1 ml-3
                                     text-[12px] text-[#6f6047]"
                        >
                          <span className="flex-1 truncate line-through opacity-60">
                            {m.ad}
                          </span>
                          <button
                            onClick={() => mekaniGeriGetir(m.id)}
                            className="shrink-0 text-[10px] underline
                                       hover:text-[#3a2f22]"
                          >
                            geri getir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : sekme === 'sinir' ? (
            <>
              <div className="mt-4">
                <div className="font-mono text-[11px] uppercase tracking-wider
                                text-[#6f6047] mb-1.5">Hatlar</div>
                {[CEMBER_ID, ...RADYAL_SIRASI].map(id => (
                  <button
                    key={id}
                    onClick={() => setSecim({ hatId: id, sira: -1 })}
                    className={`block w-full text-left px-2 py-1 rounded-sm mb-0.5
                                border ${secim?.hatId === id
                        ? 'border-kiremit bg-kiremit/10'
                        : 'border-transparent hover:bg-[#e8dfcc]'}`}
                  >
                    {SINIR_ADI[id] ?? id}
                    <span className="float-right font-mono text-[11px]
                                     text-[#6f6047]">
                      {hatlar[id]?.length ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="font-mono text-[11px] uppercase tracking-wider
                                text-[#6f6047] mb-1.5">Alan dengesi</div>
                {alanlar.map(a => (
                  <div key={a.id} className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-sm shrink-0"
                      style={{ background: MAHALLE_TONU[a.id] ?? '#8a7757' }} />
                    <span className="flex-1">{a.id.replace('yer_', '')}</span>
                    <span className="font-mono text-[11px] text-[#6f6047]">
                      %{a.yuzde.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] leading-snug text-[#6f6047]">
                Bej köşeler uçlar: çembere ve kıyıya yapışık kalırlar.
              </p>
            </>
          ) : (
            <>
              {yolOlcusu && (
                <div className="mt-2 p-2.5 rounded-sm border border-[#bba591]
                                bg-[#efe7d6] space-y-1">
                  <div className="font-mono text-[11px] uppercase tracking-wider
                                  text-[#6f6047]">Ölçü</div>
                  <div className="flex justify-between">
                    <span>Uzunluk</span>
                    <span className="font-mono">
                      {(yolOlcusu.uzunluk / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kot</span>
                    <span className="font-mono">
                    {yolOlcusu.altKot.toFixed(0)}–{yolOlcusu.ustKot.toFixed(0)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ortalama eğim</span>
                    <span className={`font-mono ${yolOlcusu.ortalamaEgim > 13
                      ? 'text-kiremit font-bold' : ''}`}>
                      %{yolOlcusu.ortalamaEgim.toFixed(1)}
                    </span>
                  </div>
                {yolOlcusu.ortalamaEgim > 13 && (
                    <p className="text-[11px] leading-snug text-kiremit">
                      %13'ü aştı — gerçek dağ yolları bu kadar dik olmaz.
                    </p>
                  )}
                {yolOlcusu.denizde && (
                    <p className="text-[11px] leading-snug text-kiremit">
                      Yol denize taşıyor.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <div className="font-mono text-[11px] uppercase tracking-wider
                                text-[#6f6047] mb-1.5">
                  Yol seç
                </div>
                {yolGruplari.map(([tur, liste]) => (
                  <div key={tur} className="mb-2">
                    <div className="text-[11px] text-[#6f6047] px-1">
                      {TUR_BASLIK[tur] ?? tur}
                    </div>
                    {liste.map(y => (
                      <button
                        key={y.id}
                        onClick={() => { setSeciliYol(y.id); setSecim(null); }}
                        className={`block w-full text-left px-2 py-1 rounded-sm
                                    mb-0.5 border ${seciliYol === y.id
                            ? 'border-kiremit bg-kiremit/10'
                            : 'border-transparent hover:bg-[#e8dfcc]'}`}
                      >
                        {y.ad}
                        <span className="float-right font-mono text-[11px]
                                         text-[#6f6047]">
                          {yollar[y.id]?.length ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {!seciliYol && (
                <p className="mt-2 text-[11px] leading-snug text-[#6f6047]">
                  Düzenlemek için <b className="text-[#3a2f22]">haritada bir
                  yola tıkla</b> ya da yukarıdaki listeden seç. Sokaklar listede
                  yok — 35 tanesi var ve hepsi kısa.
                </p>
              )}
            </>
          )}

          {/* --- sıfırlama ve yedek --- */}
          <div className="mt-5 space-y-2">
            <button onClick={sifirla}
              className="w-full py-1.5 rounded-sm border border-[#bba591]
                         text-[#6f6047] hover:bg-[#e8dfcc]">
              {sekme === 'sinir' ? 'Sınırları başa döndür' : 'Yolları başa döndür'}
            </button>
            <p className="text-[11px] leading-snug text-[#6f6047]">
              Kaydet'e basana kadar kalıcı olmaz. Yanlışlıkla bastıysan Geri al.
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={disaAktar}
                className="flex-1 py-1.5 rounded-sm border border-[#bba591]
                           hover:bg-[#e8dfcc] text-[12px]">
                Yedek indir
              </button>
              <label className="flex-1 py-1.5 rounded-sm border border-[#bba591]
                                hover:bg-[#e8dfcc] text-center cursor-pointer
                                text-[12px]">
                Yedek yükle
                <input type="file" accept="application/json,.json" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) iceAktar(f);
                    e.currentTarget.value = '';
                  }} />
              </label>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-snug text-[#6f6047]">
            Kalıcı olması için Kaydet (Ctrl+S). Dosya indirmen gerekmez —
            yedek düğmeleri yalnızca istersen.
          </p>

          {ileti && (
            <div className="mt-3 px-2 py-1.5 rounded-sm bg-kiremit/12
                            border border-kiremit/40 text-[12px]">
              {ileti}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
