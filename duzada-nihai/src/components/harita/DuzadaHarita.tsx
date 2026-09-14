import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DUZADA_GEO, DUZADA_MERKEZ, DUZADA_ALAN_KM2 } from '../../data/duzadaGeo';
import {
  DENIZ, GOK, KARA, YOL, YAPI, YUKSELTI, ZEMIN,
  MAHALLE_TONU, MAHALLE_TON_GUCU
} from './haritaStili';
import { PusulaGulu, OlcekCubugu, KagitDoku } from './haritaSusleri';
import {
  araziProtokolunuKur, araziKaynagi, ARAZI_KAYNAK, ARAZI_ABARTI
} from './duzadaArazi';

/**
 * Düzada haritası.
 *
 * Dışarıdan hiçbir harita servisi kullanılmaz — ne karo, ne font, ne
 * anahtar, ne hesap. Deniz, kara, yükselti bantları, dalga çizgileri,
 * yollar ve binalar tamamen `duzadaGeo.ts` içindeki kendi verimizden
 * çizilir.
 *
 * Görsel dil marka briefindeki "antik/vintage kartografi" tarifine göre:
 * kâğıt zemin, hipsometrik yükselti tonları, kıyıdan dışa açılan dalga
 * çizgileri, kaplamalı yollar, pusula gülü ve ölçek çubuğu.
 *
 * Etiketler harita katmanı değil, HTML işaretçileridir. Böylece dışarıdan
 * font indirilmesi gerekmez ve markanın kendi yazı tipleri kullanılır.
 */

/** Adayı kareye oturtan başlangıç görünümü */
const BASLANGIC = { zoom: 11.35, pitch: 46, bearing: -17 } as const;

/**
 * Etiket türlerinin görünür olduğu yakınlık aralıkları.
 *
 * Harita üzerinde çakışma çözümü yok (metin katmanı kullanmıyoruz), o yüzden
 * kalabalığı yakınlığa göre yönetiyoruz: uzaktayken yalnızca deniz ve
 * mahalle adları, yaklaştıkça koylar, zirveler ve en sonda yapılar.
 */
const ETIKET_ARALIK: Record<string, [number, number]> = {
  deniz: [9, 12.6],
  mahalle: [10.2, 15.2],
  su: [10.8, 14.4],
  zirve: [10.9, 15.6],
  yapi: [13.2, 22],
  // otel yerleşkesindeki ikincil yapılar en son açılır
  yerleske: [16.7, 22]
};

interface DuzadaHaritaProps {
  /** Bir binaya veya mahalleye tıklandığında ilgili wiki maddesini açar */
  onSelect?: (wikiId: string) => void;
  className?: string;
}

interface SecimBilgisi {
  wikiId: string;
  ad: string;
  tur: string;
  detay?: string;
}

/**
 * Etiket işaretçisinin DOM'unu kurar.
 *
 * İki katmanlı: dıştaki kök MapLibre'ye ait — kütüphane işaretçinin
 * `opacity` değerini kendisi yönetiyor ve dışarıdan yazılanı eziyor.
 * Bu yüzden görünürlüğü içteki katmandan sürüyoruz.
 */
function etiketElemani(p: Record<string, unknown>): {
  kok: HTMLElement;
  ic: HTMLElement;
} {
  const tur = String(p.tur);
  const kok = document.createElement('div');
  const ic = document.createElement('div');
  ic.className = 'duzada-etiket';
  ic.dataset.tur = tur;
  kok.appendChild(ic);

  const ad = document.createElement('span');
  ad.className = 'duzada-etiket-ad';
  ad.textContent = String(p.ad);
  ic.appendChild(ad);

  if (tur === 'zirve') {
    const ucgen = document.createElement('span');
    ucgen.className = 'duzada-zirve-isareti';
    ic.insertBefore(ucgen, ad);
    const rakim = document.createElement('span');
    rakim.className = 'duzada-etiket-alt';
    rakim.textContent = `${p.rakim} m`;
    ic.appendChild(rakim);
  }

  return { kok, ic };
}

export const DuzadaHarita: React.FC<DuzadaHaritaProps> = ({ onSelect, className }) => {
  const kapsayici = useRef<HTMLDivElement | null>(null);
  const harita = useRef<MLMap | null>(null);
  const [secim, setSecim] = useState<SecimBilgisi | null>(null);
  const [hazir, setHazir] = useState(false);
  const [yon, setYon] = useState(BASLANGIC.bearing);
  const [zoom, setZoom] = useState(BASLANGIC.zoom);

  useEffect(() => {
    if (!kapsayici.current || harita.current) return;

    // Arazi karolarını üreten protokol harita kurulmadan önce kayıtlı olmalı
    araziProtokolunuKur();

    const map = new maplibregl.Map({
      container: kapsayici.current,
      style: {
        version: 8,
        // glyphs tanımlanmıyor: harita üzerinde metin katmanı yok, etiketler
        // HTML işaretçisi olarak çiziliyor. Böylece dışarıdan font çekilmiyor.
        sources: {
          duzada: { type: 'geojson', data: DUZADA_GEO as never, promoteId: 'id' },
          [ARAZI_KAYNAK]: araziKaynagi()
        },
        layers: [{ id: 'deniz', type: 'background', paint: { 'background-color': DENIZ.orta } }]
      },
      center: DUZADA_MERKEZ,
      zoom: BASLANGIC.zoom,
      pitch: BASLANGIC.pitch,
      bearing: BASLANGIC.bearing,
      minZoom: 9.5,
      maxZoom: 19,
      maxPitch: 72,
      attributionControl: false
    });

    harita.current = map;
    (window as unknown as { __duzadaHarita?: MLMap }).__duzadaHarita = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('error', e => console.error('[harita]', e && (e as { error?: unknown }).error));

    // ---- etiketler: HTML işaretçisi ----
    const isaretciler: maplibregl.Marker[] = [];
    const etiketKayitlari: Array<{ el: HTMLElement; tur: string }> = [];

    const etiketGorunurluk = (z: number) => {
      etiketKayitlari.forEach(({ el, tur }) => {
        const aralik = ETIKET_ARALIK[tur];
        const gorunur = !aralik || (z >= aralik[0] && z <= aralik[1]);
        el.style.opacity = gorunur ? '1' : '0';
        el.style.pointerEvents = gorunur && tur === 'yapi' ? 'auto' : 'none';
      });
    };

    const etiketleriKur = () => {
      DUZADA_GEO.features
        .filter(f => f.properties?.katman === 'etiket')
        .forEach(f => {
          const p = f.properties as Record<string, unknown>;
          if (f.geometry.type !== 'Point') return;
          const koordinat = f.geometry.coordinates as [number, number];
          const tur = String(p.tur);
          const { kok, ic } = etiketElemani(p);
          ic.style.transition = 'opacity 240ms ease';

          if (p.wikiId && tur === 'yapi') {
            ic.style.cursor = 'pointer';
            ic.addEventListener('click', ev => {
              ev.stopPropagation();
              setSecim({ wikiId: String(p.wikiId), ad: String(p.ad), tur: 'Yapı' });
            });
          }

          // Yapı adı binanın üstünde dursun, üzerine binmesin
          const m = new maplibregl.Marker({
            element: kok,
            anchor: tur === 'yapi' ? 'bottom' : 'center',
            offset: tur === 'yapi' ? [0, -14] : [0, 0]
          })
            .setLngLat(koordinat)
            .addTo(map);

          isaretciler.push(m);
          etiketKayitlari.push({ el: ic, tur });
        });

      etiketGorunurluk(map.getZoom());
    };

    const katmanlariKur = () => {
      if (map.getLayer('ada')) return;
      const src = 'duzada';

      // ---- 3B arazi ----
      // Bütün çizim katmanları bu araziye giydiriliyor: yükselti bantları,
      // yollar, mahalle sınırları hep yamaca oturuyor. Abartı katsayısı
      // için duzadaArazi.ts'deki nota bak.
      map.setTerrain({ source: ARAZI_KAYNAK, exaggeration: ARAZI_ABARTI });

      // Arazi açıkken eğimli bakışta ufuk görünüyor. Gökyüzü mavi değil,
      // kâğıdın kendi tonu: harita bir sayfa gibi dursun, pencere gibi değil.
      map.setSky({
        'sky-color': GOK.ust,
        'horizon-color': GOK.ufuk,
        'fog-color': GOK.pus,
        'sky-horizon-blend': 0.9,
        'horizon-fog-blend': 0.55,
        'fog-ground-blend': 0.72,
        'atmosphere-blend': [
          'interpolate', ['linear'], ['zoom'], 10, 0.5, 13, 0.28, 16, 0.1
        ]
      });

      // ---- deniz: kıyıya yaklaştıkça açılan dalga çizgileri ----
      map.addLayer({
        id: 'dalgalar',
        type: 'line',
        source: src,
        filter: ['==', ['get', 'katman'], 'dalga'],
        paint: {
          'line-color': DENIZ.dalga,
          // en içteki halka en belirgin, dışa doğru siliniyor
          'line-width': ['interpolate', ['linear'], ['get', 'sira'], 0, 1.6, 4, 0.5],
          'line-opacity': ['interpolate', ['linear'], ['get', 'sira'], 0, 0.9, 4, 0.25]
        }
      });

      // ---- karanın kıyı halesi: adanın altında yumuşak bir taban ----
      map.addLayer({
        id: 'ada-hale',
        type: 'line',
        source: src,
        filter: ['==', ['get', 'katman'], 'ada'],
        paint: { 'line-color': KARA.kiyiHale, 'line-width': 14, 'line-blur': 10 }
      });

      // ---- kara ----
      map.addLayer({
        id: 'ada',
        type: 'fill',
        source: src,
        filter: ['==', ['get', 'katman'], 'ada'],
        paint: { 'fill-color': KARA.taban }
      });

      // ---- hipsometrik yükselti bantları (alçaktan yükseğe) ----
      YUKSELTI.slice(1).forEach(({ esik, renk }) => {
        map.addLayer({
          id: `rolyef-${esik}`,
          type: 'fill',
          source: src,
          filter: ['all', ['==', ['get', 'katman'], 'rolyef'], ['==', ['get', 'esik'], esik]],
          paint: { 'fill-color': renk }
        });
      });

      // bantların kenarına ince eşyükselti çizgisi — kartografik doku
      map.addLayer({
        id: 'rolyef-cizgi',
        type: 'line',
        source: src,
        filter: ['==', ['get', 'katman'], 'rolyef'],
        paint: {
          'line-color': 'rgba(111, 96, 71, 0.30)',
          'line-width': 0.7
        }
      });

      // ---- mahalle sınırları ----
      map.addLayer({
        id: 'mahalle-dolgu',
        type: 'fill',
        source: src,
        filter: ['==', ['get', 'katman'], 'mahalle'],
        paint: {
          'fill-color': [
            'match', ['get', 'id'],
            ...Object.entries(MAHALLE_TONU).flat(),
            '#8a7757'
          ] as unknown as maplibregl.ExpressionSpecification,
          // Üzerine gelince ton koyulaşıyor — tıklanabilir olduğu anlaşılsın
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'uzerinde'], false], 0.3,
            MAHALLE_TON_GUCU
          ]
        }
      });


      // ---- kıyı çizgisi ----
      map.addLayer({
        id: 'kiyi',
        type: 'line',
        source: src,
        filter: ['==', ['get', 'katman'], 'ada'],
        paint: { 'line-color': KARA.kiyiCizgi, 'line-width': 1.6 }
      });

      // ---- yollar ----
      // Dört kademe: ana yol (aynı zamanda mahalle sınırı), cadde, yol,
      // sokak. Kalınlık kademeyle değişiyor ki ağ ilk bakışta okunsun.
      const kademe = (anaYol: number, cadde: number, yol: number, sokak: number) => ([
        'case',
        ['==', ['get', 'tur'], 'ana yol'], anaYol,
        ['==', ['get', 'tur'], 'cadde'], cadde,
        ['==', ['get', 'tur'], 'sokak'], sokak,
        yol
      ] as unknown as maplibregl.ExpressionSpecification);

      const surulebilir: maplibregl.FilterSpecification = [
        'all', ['==', ['get', 'katman'], 'yol'], ['!=', ['get', 'tur'], 'merdiven']
      ];

      map.addLayer({
        id: 'yol-kaplama',
        type: 'line',
        source: src,
        filter: surulebilir,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': YOL.kaplama,
          'line-opacity': 0.7,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            11, kademe(4.2, 2.6, 2.2, 1.3),
            16, kademe(15, 10, 8, 5)
          ]
        }
      });

      map.addLayer({
        id: 'yol-dolgu',
        type: 'line',
        source: src,
        filter: surulebilir,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': YOL.dolgu,
          'line-opacity': 0.88,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            11, kademe(2.2, 1.3, 1.0, 0.6),
            16, kademe(10, 6.4, 5, 3)
          ]
        }
      });

      // ---- mahalle sınırı ----
      // Sınır, altındaki ana yolun üstünden geçen kesikli bir vurgu.
      // Yoldan sonra çiziliyor ki "bu yol aynı zamanda sınır" okunsun.
      map.addLayer({
        id: 'mahalle-sinir',
        type: 'line',
        source: src,
        filter: ['==', ['get', 'katman'], 'mahalle'],
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': KARA.mahalleSinir,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.1, 16, 2.4],
          'line-dasharray': [1.4, 2.2, 5, 2.2],
          'line-opacity': 0.9
        }
      });

      // ---- merdiven: basamakları andıran kesikli çizgi ----
      map.addLayer({
        id: 'merdiven',
        type: 'line',
        source: src,
        filter: ['all', ['==', ['get', 'katman'], 'yol'],
                 ['==', ['get', 'tur'], 'merdiven']],
        layout: { 'line-cap': 'butt' },
        paint: {
          'line-color': KARA.kiyiCizgi,
          'line-opacity': 0.75,
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 9],
          'line-dasharray': [0.6, 0.5]
        }
      });

      // ---- zemin öğeleri: teras ve bahçe ----
      // Düz plaka DEĞİL, araziye giydirilen dolgu. Uçurumun başındaki
      // teras prizma olarak çizilince tabanı düz kalıyor ve yamacın
      // üstünde havada bir çıkma gibi sarkıyordu; `fill` araziyi birebir
      // takip ediyor.
      map.addLayer({
        id: 'zemin-plaka',
        type: 'fill',
        source: src,
        filter: ['==', ['get', 'katman'], 'zemin'],
        paint: {
          'fill-color': [
            'case', ['==', ['get', 'tur'], 'bahçe'], ZEMIN.bahce, ZEMIN.teras
          ],
          'fill-opacity': 0.92
        }
      });

      map.addLayer({
        id: 'zemin-kenar',
        type: 'line',
        source: src,
        filter: ['==', ['get', 'katman'], 'zemin'],
        paint: {
          'line-color': [
            'case', ['==', ['get', 'tur'], 'bahçe'], ZEMIN.bahceKenar,
            ZEMIN.terasKenar
          ],
          'line-width': 1.1
        }
      });

      // ---- binalar: prizmalar ----
      map.addLayer({
        id: 'bina-golge',
        type: 'fill',
        source: src,
        filter: ['==', ['get', 'katman'], 'bina'],
        paint: {
          'fill-color': 'rgba(90, 76, 56, 0.30)',
          'fill-translate': [3, 3],
          'fill-translate-anchor': 'viewport'
        }
      });

      map.addLayer({
        id: 'binalar',
        type: 'fill-extrusion',
        source: src,
        filter: ['==', ['get', 'katman'], 'bina'],
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'uzerinde'], false], YAPI.vurgu,
            ['==', ['get', 'tur'], 'otel'], YAPI.otel,
            ['==', ['get', 'tur'], 'kule'], YAPI.kule,
            ['==', ['get', 'tur'], 'fener'], YAPI.fener,
            ['==', ['get', 'tur'], 'stadyum'], YAPI.stadyum,
            ['==', ['get', 'tur'], 'kulüp'], YAPI.kulup,
            ['==', ['get', 'tur'], 'iskele'], YAPI.iskele,
            YAPI.genel
          ],
          // Haritada gerçek 3B arazi yok: prizmalar kâğıdın üstünde durur.
          // Arazi kotu `taban` özelliğinde saklı ve künyede rakım olarak
          // gösteriliyor; buraya taşınırsa yapı havada asılı kalıyor.
          'fill-extrusion-base': 0,
          'fill-extrusion-height': ['get', 'yukseklik'],
          'fill-extrusion-opacity': 0.97,
          'fill-extrusion-vertical-gradient': true
        }
      });

      etiketleriKur();
      setHazir(true);
      setZoom(map.getZoom());
    };

    /**
     * React StrictMode efekti iki kez çalıştırır ve stil ikinci turda çoktan
     * yüklenmiş olabilir; o durumda `once('load')` hiç tetiklenmez. Bu yüzden
     * yüklüyse doğrudan kuruyoruz.
     */
    if (map.isStyleLoaded()) katmanlariKur();
    else map.once('load', katmanlariKur);

    // ---- etkileşim ----
    let uzerindeki: string | number | null = null;

    const uzerineGel = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!f) return;
      map.getCanvas().style.cursor = 'pointer';
      if (uzerindeki !== null) {
        map.setFeatureState({ source: 'duzada', id: uzerindeki }, { uzerinde: false });
      }
      const kimlik = (f.id ?? f.properties?.id) as string | number | undefined;
      if (kimlik !== undefined) {
        uzerindeki = kimlik;
        map.setFeatureState({ source: 'duzada', id: kimlik }, { uzerinde: true });
      }
    };

    const uzerindenCik = () => {
      map.getCanvas().style.cursor = '';
      if (uzerindeki !== null) {
        map.setFeatureState({ source: 'duzada', id: uzerindeki }, { uzerinde: false });
      }
      uzerindeki = null;
    };

    ['binalar', 'mahalle-dolgu'].forEach(katman => {
      map.on('mousemove', katman, uzerineGel);
      map.on('mouseleave', katman, uzerindenCik);
    });

    map.on('click', e => {
      const bulunan = map.queryRenderedFeatures(e.point, {
        layers: ['binalar', 'mahalle-dolgu']
      });
      const f = bulunan[0];
      if (!f) {
        setSecim(null);
        return;
      }
      const p = f.properties || {};
      const detay =
        p.katman === 'bina'
          ? [
              p.kat ? `${p.kat} kat` : null,
              p.yukseklik ? `${p.yukseklik} m yükseklik` : null,
              // arazi kotu: prizmalar kâğıdın üstünde duruyor, rakım burada
              typeof p.taban === 'number' && p.taban >= 1
                ? `${Math.round(p.taban)} m rakım` : null
            ].filter(Boolean).join(' · ')
          : p.alanKm2 ? `${p.alanKm2} km²` : undefined;

      setSecim({
        wikiId: String(p.wikiId || p.id || ''),
        ad: String(p.ad || ''),
        tur: p.katman === 'bina' ? String(p.tur || 'yapı') : 'Mahalle',
        detay
      });
    });

    const hareket = () => {
      setYon(map.getBearing());
      setZoom(map.getZoom());
      etiketGorunurluk(map.getZoom());
    };
    map.on('move', hareket);

    return () => {
      isaretciler.forEach(m => m.remove());
      map.remove();
      harita.current = null;
    };
  }, []);

  const gorunumuSifirla = () => {
    harita.current?.easeTo({ center: DUZADA_MERKEZ, ...BASLANGIC, duration: 1000 });
  };

  return (
    // `relative` her zaman kalmalı: bilgi kartı, seçim kartı ve sıfırlama
    // düğmesi buna göre konumlanıyor. Dışarıdan sınıf verilince düşerse
    // kutular sayfanın kendisine yapışıyordu.
    <div className={`relative ${className ?? 'w-full h-full min-h-[520px]'}`}>
      <div
        ref={kapsayici}
        className="w-full h-full rounded-lg overflow-hidden duzada-harita"
      />

      <KagitDoku />

      {/* Başlık kartuşu */}
      <div className="absolute top-4 left-4 px-4 py-3 rounded-sm bg-[#f4efe4]/94 backdrop-blur-[2px] border border-[#8a7757]/45 shadow-[2px_3px_0_0_rgba(90,76,56,0.14)] pointer-events-none">
        <p className="font-serif text-xl leading-none text-[#0e1c4f] tracking-wide">Düzada</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6f6047] mt-1.5">
          Ege Denizi
        </p>
        <div className="h-px bg-[#8a7757]/35 my-2" />
        <p className="font-mono text-[10px] text-[#6f6047] leading-relaxed">
          {DUZADA_ALAN_KM2} km²<br />
          zirve 742 m
        </p>
      </div>

      <PusulaGulu yon={yon} />
      <OlcekCubugu harita={harita} zoom={zoom} hazir={hazir} />

      {/* Seçim kartı */}
      {secim && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 p-4 rounded-sm bg-[#f4efe4]/96 backdrop-blur-[2px] border border-[#8a7757]/45 shadow-[2px_3px_0_0_rgba(90,76,56,0.14)]">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6f6047]">
            {secim.tur}
          </p>
          <p className="font-serif text-xl text-[#0e1c4f] leading-snug mt-1">{secim.ad}</p>
          {secim.detay && (
            <p className="font-mono text-[11px] text-[#6f6047] mt-1">{secim.detay}</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {secim.wikiId && onSelect && (
              <button
                type="button"
                onClick={() => onSelect(secim.wikiId)}
                className="text-[12px] px-3 py-1.5 rounded-sm border border-[#0e1c4f]/45 text-[#0e1c4f] hover:bg-[#0e1c4f] hover:text-[#f3efe8] transition-colors"
              >
                Viki maddesini aç
              </button>
            )}
            <button
              type="button"
              onClick={() => setSecim(null)}
              className="text-[12px] px-2 py-1.5 text-[#6f6047] hover:text-[#0e1c4f] transition-colors"
            >
              kapat
            </button>
          </div>
        </div>
      )}

      {hazir && (
        <button
          type="button"
          onClick={gorunumuSifirla}
          className="absolute bottom-4 right-4 text-[10px] font-mono uppercase tracking-[0.12em] px-3 py-2 rounded-sm bg-[#f4efe4]/94 backdrop-blur-[2px] border border-[#8a7757]/45 text-[#6f6047] hover:text-[#0e1c4f] transition-colors"
        >
          görünümü sıfırla
        </button>
      )}
    </div>
  );
};
