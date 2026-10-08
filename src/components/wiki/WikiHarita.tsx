import React, { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { Compass } from 'lucide-react';
import type { Item } from '../../types';
import { HARITA_YAPILARI } from '../../data/haritaYapilari';
import { MAHALLE_ADI } from '../../lib/haritaMaddesi';

/**
 * Maddenin harita karşılığı (W3).
 *
 * Bir mekân sayfasında "nerede" sorusunun cevabı künyede değil haritada
 * duruyordu; okuyan kişi iki sekme arasında gidip geliyordu. Bu kart, madde
 * ile haritadaki yapı arasındaki bağı sayfanın içinde gösteriyor.
 *
 * Veri haritadan OKUNUYOR, maddeye kopyalanmıyor: yapı düzenleyicide
 * taşınınca ya da adı değişince burası kendiliğinden doğru kalır.
 */

interface HaritaBilgisi {
  binaId: string;
  ad: string;
  mahalleAdi: string | null;
  kat: number | null;
  yukseklik: number | null;
  rakim: number | null;
  /** Aynı mahalledeki, maddesi olan diğer yapılar */
  komsular: Array<{ wikiId: string; ad: string }>;
}

/** Haritadaki yapının künye için gereken özellikleri */
type YapiOzellik = { id: string; ad: string; mahalle: string | null; kat: number | null; yukseklik: number | null; taban: number | null; wikiId?: string | null };

function bilgiKur(yapi: YapiOzellik, hepsi: YapiOzellik[]): HaritaBilgisi {
  const mahalleId = yapi.mahalle;
  const komsular = hepsi
    .filter(q => q.mahalle === mahalleId && q.id !== yapi.id && typeof q.wikiId === 'string' && q.wikiId)
    .map(q => ({ wikiId: String(q.wikiId), ad: q.ad }))
    // Aynı maddeye bağlı birden çok kütle (otelin kuleleri) bir kez görünsün
    .filter((k, i, h) => h.findIndex(x => x.wikiId === k.wikiId) === i)
    .slice(0, 8);
  return {
    binaId: yapi.id,
    ad: yapi.ad,
    mahalleAdi: mahalleId ? MAHALLE_ADI[mahalleId] ?? null : null,
    kat: typeof yapi.kat === 'number' ? yapi.kat : null,
    yukseklik: typeof yapi.yukseklik === 'number' ? yapi.yukseklik : null,
    rakim: typeof yapi.taban === 'number' && yapi.taban >= 1 ? Math.round(yapi.taban) : null,
    komsular
  };
}

/**
 * Önce maddesi olan yapıların kısa listesinden (`haritaYapilari.ts`, ~13 KB).
 * 8 Ekim denetimi: önceden bütün harita verisi (2,8 MB) Düzada açılırken
 * iniyordu. Haritadan açılıp sıradan bir eve bağlanan madde (`haritaBinaId`)
 * listede yoksa bütün veri yalnız o maddede, sonradan indirilir.
 */
function haritaBilgisi(item: Item, geo: FeatureCollection | null): HaritaBilgisi | null {
  const yapilar = HARITA_YAPILARI as YapiOzellik[];
  const binaId = item.metadata?.haritaBinaId;
  const kisa = yapilar.find(y => y.wikiId === item.id || y.id === binaId);
  if (kisa) return bilgiKur(kisa, yapilar);
  if (!binaId || !geo) return null;
  const f = geo.features.find(x => (x.properties as Record<string, unknown> | null)?.katman === 'bina' && (x.properties as Record<string, unknown>).id === binaId);
  if (!f) return null;
  const p = f.properties as Record<string, unknown>;
  return bilgiKur({
    id: String(p.id), ad: String(p.ad || ''), mahalle: typeof p.mahalle === 'string' ? p.mahalle : null,
    kat: typeof p.kat === 'number' ? p.kat : null, yukseklik: typeof p.yukseklik === 'number' ? p.yukseklik : null,
    taban: typeof p.taban === 'number' ? p.taban : null
  }, yapilar);
}

/** Bu maddenin haritada bir karşılığı var mı — yan sütunu açmaya değer mi */
export function haritaKarsiligiVar(item: Item): boolean {
  return haritaBilgisi(item, null) !== null || !!item.metadata?.haritaBinaId;
}

interface WikiHaritaProps {
  item: Item;
  onNavigate: (id: string) => void;
  /** Harita sekmesine geçiş — verilmezse düğme çıkmaz */
  onHaritayaGit?: (binaId: string) => void;
}

export const WikiHarita: React.FC<WikiHaritaProps> = ({
  item, onNavigate, onHaritayaGit
}) => {
  // Kısa listede olmayan bağlı yapı için bütün harita verisi gerektiğinde iner
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const gerek = !!item.metadata?.haritaBinaId && haritaBilgisi(item, null) === null;
  useEffect(() => {
    if (!gerek || geo) return;
    let iptal = false;
    void import('../../data/duzadaGeo').then(m => { if (!iptal) setGeo(m.DUZADA_GEO); });
    return () => { iptal = true; };
  }, [gerek, geo]);
  const bilgi = useMemo(() => haritaBilgisi(item, geo), [item, geo]);
  if (!bilgi) return null;

  const satirlar: Array<[string, string]> = [];
  if (bilgi.mahalleAdi) satirlar.push(['Mahalle', `${bilgi.mahalleAdi} Mahallesi`]);
  if (bilgi.kat) satirlar.push(['Kat', `${bilgi.kat}`]);
  if (bilgi.yukseklik) satirlar.push(['Yükseklik', `${bilgi.yukseklik} m`]);
  if (bilgi.rakim) satirlar.push(['Rakım', `${bilgi.rakim} m`]);
  // Haritadaki ad maddeninkinden farklıysa bunu gizlemek yerine göster:
  // ikisinden biri eskimiş demektir.
  if (bilgi.ad && bilgi.ad !== item.title) {
    satirlar.push(['Haritadaki adı', bilgi.ad]);
  }

  return (
    <div className="mt-4 border border-bej/50 dark:border-lacivert-600/50 rounded-lg overflow-hidden bg-krem-acik/70 dark:bg-lacivert-800/40 archive-shadow">
      <h2 className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/85 border-b border-bej/40 dark:border-lacivert-600/40 bg-bej/12 dark:bg-lacivert-600/25 flex items-center gap-1.5">
        <Compass size={12} /> Haritada
      </h2>

      {satirlar.length > 0 && (
        <dl className="divide-y divide-bej/30 dark:divide-lacivert-600/30">
          {satirlar.map(([etiket, deger]) => (
            <div key={etiket} className="px-4 py-2.5">
              <dt className="text-[10px] font-mono uppercase tracking-wide text-gri dark:text-bej/85 mb-0.5">
                {etiket}
              </dt>
              <dd className="text-[13px] text-lacivert dark:text-krem/90 leading-snug">
                {deger}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {bilgi.komsular.length > 0 && (
        <div className="px-4 py-3 border-t border-bej/40 dark:border-lacivert-600/40">
          <p className="text-[10px] font-mono uppercase tracking-wide text-gri dark:text-bej/85 mb-1.5">
            Aynı mahallede
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {bilgi.komsular.map(k => (
              <li key={k.wikiId}>
                <button
                  type="button"
                  onClick={() => onNavigate(k.wikiId)}
                  className="text-[12px] px-2 py-0.5 rounded border border-bej/50 dark:border-lacivert-600/50 text-lacivert dark:text-krem hover:border-lacivert/50 dark:hover:border-bej/50 hover:bg-lacivert/5 dark:hover:bg-bej/10 transition-colors"
                >
                  {k.ad}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onHaritayaGit && (
        <button
          type="button"
          onClick={() => onHaritayaGit(bilgi.binaId)}
          className="w-full px-4 py-2.5 border-t border-bej/40 dark:border-lacivert-600/40 text-[11px] font-mono text-gri dark:text-bej/85 hover:text-lacivert dark:hover:text-krem hover:bg-bej/12 dark:hover:bg-lacivert-600/25 transition-colors cursor-pointer text-left"
        >
          Haritada göster →
        </button>
      )}
    </div>
  );
};
