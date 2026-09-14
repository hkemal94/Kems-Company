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
import { kotlariYukle, yoluOlc, denizeTasiyorMu } from './duzadaKot';

/**
 * Düzada harita düzenleyicisi — sınırlar ve yollar.
 *
 * Amaç tek şey: Kemal'in çizgileri kendi eliyle oynatabilmesi. Anlatması
 * zor olan "şurası biraz aşağı insin" türü düzeltmeler burada iki saniyede
 * yapılıyor, sonra tek JSON dosyası olarak dışarı aktarılıyor. Dosya
 * `gen/sinir-duzenleme.json` olarak üretecin yanına konunca üreteç kendi
 * hesapladıklarının yerine onu kullanıyor.
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

type Sekme = 'sinir' | 'yol';

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

interface Secim { hatId: string; sira: number; }

export const HaritaDuzenleyici: React.FC = () => {
  const kapsayici = useRef<HTMLDivElement | null>(null);
  const harita = useRef<MLMap | null>(null);
  const [hazir, setHazir] = useState(false);
  const [kotHazir, setKotHazir] = useState(false);

  const kiyi = useMemo(() => kiyiHalkasi(), []);
  const yolKayitlari = useMemo(() => baslangicYollari(), []);

  const [sekme, setSekme] = useState<Sekme>('sinir');
  const [hatlar, setHatlar] = useState<SinirHatlari>(() => baslangicHatlari());
  const [yollar, setYollar] = useState<SinirHatlari>(() =>
    Object.fromEntries(baslangicYollari().map(y => [y.id, y.kontrol]))
  );
  const [seciliYol, setSeciliYol] = useState<string | null>(null);
  const [secim, setSecim] = useState<Secim | null>(null);
  const [gecmis, setGecmis] = useState<Array<{
    sekme: Sekme; hatlar: SinirHatlari; yollar: SinirHatlari;
  }>>([]);
  const [ileti, setIleti] = useState<string | null>(null);

  const [manyetik, setManyetik] = useState(true);
  const [manyetikTur, setManyetikTur] = useState<Set<ManyetikTur>>(
    () => new Set<ManyetikTur>(['yol', 'esyukselti', 'kiyi'])
  );
  const [yapisti, setYapisti] = useState<string | null>(null);

  // Fare olayları React durumunu okuyamıyor (harita bir kez kuruluyor),
  // güncel hâli ref'te tutuyoruz.
  const durum = useRef({
    sekme, hatlar, yollar, seciliYol, manyetik, manyetikTur
  });
  durum.current = { sekme, hatlar, yollar, seciliYol, manyetik, manyetikTur };
  const surukleme = useRef<Secim | null>(null);

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
      yollar: durum.current.yollar
    }]);
  }, []);

  const geriAl = useCallback(() => {
    setGecmis(g => {
      if (!g.length) return g;
      const son = g[g.length - 1];
      setSekme(son.sekme);
      setHatlar(son.hatlar);
      setYollar(son.yollar);
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
          [KAYNAK]: { type: 'geojson', data: DUZADA_GEO as never },
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

      map.addLayer({
        id: 'yollar', type: 'line', source: KAYNAK,
        filter: ['==', ['get', 'katman'], 'yol'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': YOL.kaplama, 'line-opacity': 0.5,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 16, 4]
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
      setSecim(k);
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
      const mevcut = d.sekme === 'sinir' ? d.hatlar[hatId] : d.yollar[hatId];
      if (!mevcut) return;

      let yeni: Nokta = [e.lngLat.lng, e.lngLat.lat];
      const tur = ucTuru(d.sekme, hatId, sira, mevcut.length);

      // Mıknatıs önce: yola/eşyükseltiye yapış
      let yapisan: string | null = null;
      if (d.manyetik) {
        const cekim = manyetikCek(yeni, dereceEsigi(13), d.manyetikTur);
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

  // ---- klavye -------------------------------------------------------------
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); geriAl(); return;
      }
      if (e.key === 'm' || e.key === 'M') { setManyetik(m => !m); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && secim) {
        const hat = aktifHatlar[secim.hatId];
        if (!hat || hat.length <= 4) {
          setIleti('Hat en az dört köşeli kalmalı.'); return;
        }
        if (ucTuru(sekme, secim.hatId, secim.sira, hat.length) !== 'serbest') {
          setIleti('Uç köşe silinemez — çembere ve kıyıya bağlı kalmalı.');
          return;
        }
        e.preventDefault();
        gecmiseYaz();
        hattiYaz(secim.hatId, hat.filter((_, i) => i !== secim.sira));
        setSecim(null);
      }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [secim, aktifHatlar, sekme, geriAl, gecmiseYaz, hattiYaz]);

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

  // ---- dışa / içe aktarma -------------------------------------------------
  const paketle = useCallback(() => ({
    surum: 2,
    olusturma: new Date().toISOString(),
    not: 'Düzada düzenlemesi — gen/sinir-duzenleme.json olarak kaydet',
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
    a.download = 'sinir-duzenleme.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setIleti('sinir-duzenleme.json indirildi.');
  }, [paketle]);

  const panoyaKopyala = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(paketle()));
      setIleti('JSON panoya kopyalandı.');
    } catch {
      setIleti('Pano kullanılamadı — "Dosyayı indir" düğmesini kullan.');
    }
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
        setIleti('Dosya okunamadı — sinir-duzenleme.json olmalı.');
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
    <div className="w-screen h-screen flex bg-krem">
      <div className="relative flex-1">
        <div ref={kapsayici} className="duzada-harita w-full h-full" />
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
        <div className="px-4 pt-4">
          <h1 className="font-serif text-lg text-lacivert">Harita düzenleyici</h1>
        </div>

        <div className="flex mt-3 border-b border-[#bba591]">
          {sekmeDugmesi('sinir', 'Sınırlar')}
          {sekmeDugmesi('yol', 'Yollar')}
        </div>

        <div className="p-4">
          <ul className="list-disc pl-4 space-y-1 leading-snug text-[#6f6047]">
            <li>Köşeyi <b className="text-[#3a2f22]">sürükle</b></li>
            <li>Hatta <b className="text-[#3a2f22]">çift tıkla</b> — köşe ekler</li>
            <li>Köşeyi seçip <b className="text-[#3a2f22]">Delete</b></li>
            <li><b className="text-[#3a2f22]">Ctrl+Z</b> geri alır,
              <b className="text-[#3a2f22]"> M</b> mıknatısı açıp kapar</li>
          </ul>

          {/* --- mıknatıs --- */}
          <div className="mt-4 p-2.5 rounded-sm border border-[#bba591]
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
            <div className="mt-2 space-y-1">
              {([
                ['yol', 'Yollar'],
                ['esyukselti', 'Eşyükseltiler'],
                ['kiyi', 'Kıyı']
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
          </div>

          {/* --- sekmeye özel --- */}
          {sekme === 'sinir' ? (
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
                  Düzenlemek için listeden bir yol seç. Sokaklar listede yok —
                  35 tanesi var ve hepsi kısa.
                </p>
              )}
            </>
          )}

          {/* --- dosya --- */}
          <div className="mt-5 space-y-2">
            <button onClick={disaAktar}
              className="w-full py-2 rounded-sm bg-lacivert text-krem
                         font-medium hover:bg-lacivert-800">
              Dosyayı indir
            </button>
            <button onClick={panoyaKopyala}
              className="w-full py-1.5 rounded-sm border border-[#bba591]
                         hover:bg-[#e8dfcc]">
              JSON'u panoya kopyala
            </button>
            <label className="block w-full py-1.5 rounded-sm border
                              border-[#bba591] hover:bg-[#e8dfcc] text-center
                              cursor-pointer">
              Düzenleme yükle
              <input type="file" accept="application/json,.json" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) iceAktar(f);
                  e.currentTarget.value = '';
                }} />
            </label>
            <button onClick={sifirla}
              className="w-full py-1.5 rounded-sm border border-[#bba591]
                         text-[#6f6047] hover:bg-[#e8dfcc]">
              {sekme === 'sinir' ? 'Sınırları başa döndür' : 'Yolları başa döndür'}
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-snug text-[#6f6047]">
            İndirdiğin dosya hem sınırları hem yolları taşır.
            <code className="font-mono"> gen/</code> klasörüne
            <code className="font-mono"> sinir-duzenleme.json</code> adıyla koy.
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
