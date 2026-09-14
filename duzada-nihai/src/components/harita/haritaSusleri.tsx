import React, { useMemo } from 'react';
import type { Map as MLMap } from 'maplibre-gl';

/**
 * Haritanın kartografik süsleri: pusula gülü, ölçek çubuğu ve kâğıt dokusu.
 * Hepsi harita tuvalinin üstünde duran HTML/SVG katmanlarıdır — dışarıdan
 * hiçbir varlık indirilmez.
 */

const MUREKKEP = '#6f6047';
const LACIVERT = '#0e1c4f';

/** Klasik pusula gülü. Harita döndükçe kendisi de döner. */
export const PusulaGulu: React.FC<{ yon: number }> = ({ yon }) => (
  <div className="absolute top-4 right-16 pointer-events-none select-none">
    <svg
      width="76"
      height="76"
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${-yon}deg)`, transition: 'transform 80ms linear' }}
    >
      <circle cx="50" cy="50" r="46" fill="#f4efe4" fillOpacity="0.9"
              stroke={MUREKKEP} strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="50" cy="50" r="38" fill="none"
              stroke={MUREKKEP} strokeOpacity="0.28" strokeWidth="0.6" />

      {/* ara yönler — ince yıldız */}
      <g opacity="0.5">
        {[45, 135, 225, 315].map(a => (
          <polygon
            key={a}
            points="50,50 46,46 50,16 54,46"
            fill={MUREKKEP}
            fillOpacity="0.55"
            transform={`rotate(${a} 50 50)`}
          />
        ))}
      </g>

      {/* ana yönler */}
      {[90, 180, 270].map(a => (
        <polygon
          key={a}
          points="50,50 45,45 50,10 55,45"
          fill={MUREKKEP}
          fillOpacity="0.8"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      {/* kuzey ucu vurgulu */}
      <polygon points="50,50 45,45 50,8 55,45" fill={LACIVERT} />

      <circle cx="50" cy="50" r="3.2" fill="#f4efe4" stroke={MUREKKEP} strokeWidth="1" />

      <text x="50" y="6.5" textAnchor="middle" fontSize="9"
            fontFamily="Georgia, serif" fill={LACIVERT} fontWeight="700">K</text>
      <text x="94.5" y="53" textAnchor="middle" fontSize="7.5"
            fontFamily="Georgia, serif" fill={MUREKKEP}>D</text>
      <text x="50" y="98" textAnchor="middle" fontSize="7.5"
            fontFamily="Georgia, serif" fill={MUREKKEP}>G</text>
      <text x="5.5" y="53" textAnchor="middle" fontSize="7.5"
            fontFamily="Georgia, serif" fill={MUREKKEP}>B</text>
    </svg>
  </div>
);

/** Yakınlık değiştikçe yeniden hesaplanan, şeritli eski usul ölçek çubuğu. */
export const OlcekCubugu: React.FC<{
  harita: React.RefObject<MLMap | null>;
  zoom: number;
  /** Harita kurulduğunda yeniden hesaplansın diye */
  hazir: boolean;
}> = ({ harita, zoom, hazir }) => {
  const olcu = useMemo(() => {
    const map = harita.current;
    if (!map || !hazir) return null;

    // Ekranın ortasında bir pikselin kaç metreye denk geldiği
    const enlem = map.getCenter().lat;
    const metrePiksel =
      (156543.03392 * Math.cos((enlem * Math.PI) / 180)) / Math.pow(2, zoom);
    if (!isFinite(metrePiksel) || metrePiksel <= 0) return null;

    // 120 piksele en yakın "yuvarlak" mesafeyi seç
    const adaylar = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    const hedefMetre = metrePiksel * 120;
    const secilen =
      adaylar.find(a => a >= hedefMetre) ?? adaylar[adaylar.length - 1];

    return {
      metre: secilen,
      piksel: secilen / metrePiksel,
      etiket: secilen >= 1000 ? `${secilen / 1000} km` : `${secilen} m`
    };
  }, [harita, zoom, hazir]);

  if (!olcu || olcu.piksel < 30) return null;

  const yariPiksel = olcu.piksel / 2;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none select-none">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-end" style={{ width: olcu.piksel }}>
          {/* iki şeritli klasik çubuk */}
          <div
            style={{ width: yariPiksel }}
            className="h-2 border border-[#6f6047]/70 bg-[#6f6047]/85"
          />
          <div
            style={{ width: yariPiksel }}
            className="h-2 border border-[#6f6047]/70 border-l-0 bg-[#f4efe4]/85"
          />
        </div>
        <div
          className="flex justify-between font-mono text-[9px] text-[#6f6047]"
          style={{ width: olcu.piksel }}
        >
          <span>0</span>
          <span>{olcu.etiket}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Kâğıt dokusu ve kenar gölgesi. Haritanın üstünde durur, tıklamaları
 * geçirir; çarpma karışımıyla altındaki renkleri hafifçe kirletir.
 */
export const KagitDoku: React.FC = () => (
  <>
    <div
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{
        mixBlendMode: 'multiply',
        opacity: 0.5,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E\")"
      }}
    />
    <div
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{
        boxShadow: 'inset 0 0 90px 20px rgba(20, 30, 60, 0.28)'
      }}
    />
  </>
);
