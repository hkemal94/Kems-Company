/**
 * Yalnızca önizleme içindir. Uygulamanın kendisine dokunmaz.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { WikiShell } from '../src/components/wiki/WikiShell';
import { Item } from '../src/types';
import { KEMSKOY_HOTEL, KEMSKOY_PEOPLE } from '../src/data/kemskoyData';
import { KEMSKOY_VENUES, KISI_BIRIM } from '../src/data/kemskoyVenues';

const now = Date.now();
const asItem = (k: any): Item => ({ ...k, createdAt: now, updatedAt: now, userId: 'demo' });

/** Mahalleler */
const iskele = asItem({
  id: 'yer_iskele',
  title: 'İskele Mahallesi',
  area: 'duzada',
  type: 'yer',
  status: 'Fikir',
  priority: 'yüksek',
  tags: ['mahalle'],
  links: [],
  notes:
    'Eski zamanlarda Düzada Köyü’nün iskelesi olarak anılan, ada daha düşük nüfusluyken köyün dışında kalan mahalle. Mahalle ilk zamanlarında Kemsköy adıyla anılır; yerleşim büyüdükçe eski ad ana caddede kalır ve bugün Kemsköy Caddesi olarak bilinir.\n\nCaddeye bağlanan sokaklarda ekonomik olarak daha üst seviyedeki mahalle sakinleri oturur. Adanın eğlence mekânları ile ilk oteli The Imperial Kemsköy buradadır.',
  images: [],
  archived: false,
  isProposal: false,
  metadata: {
    faaliyet: '1954–',
    profile: {
      population: 'Yaklaşık 340 hane',
      landmarks: 'Kemsköy Caddesi, eski iskele taşı, The Imperial Kemsköy',
      vibe: 'Asil ama biraz kendini beğenmiş; akşamları canlanır'
    }
  }
});

const limanMah = asItem({
  id: 'yer_liman',
  title: 'Liman Mahallesi',
  area: 'duzada',
  type: 'yer',
  status: 'Fikir',
  priority: 'orta',
  tags: ['mahalle'],
  links: [],
  notes:
    'İskelenin operasyonel olarak yetersiz kalması sebebiyle inşa edilen yeni liman ve çevresini kapsayan mahalle.',
  images: [],
  archived: false,
  isProposal: false,
  metadata: { profile: { vibe: 'İşlek, gündüz canlı' } }
});

const fener = asItem({
  id: 'mekan_fener',
  title: 'Deniz Feneri',
  area: 'duzada',
  type: 'mekân',
  status: 'Fikir',
  priority: 'orta',
  tags: ['fener'],
  links: [],
  notes: 'Adanın kuzeybatı ucunda bulunan, limanı yukarıdan gören fener yapısı.',
  images: [],
  archived: false,
  isProposal: false,
  metadata: { placeId: 'yer_liman', profile: { shopType: 'deniz feneri', style: 'Taş kule' } }
});

/** Otel — geniş zamanda, oyun kaydı olmadan */
const hotel = asItem({
  ...KEMSKOY_HOTEL,
  title: 'The Imperial Kemsköy',
  isProposal: false,
  notes:
    'Düzada’da, İskele Mahallesi’nde bulunan neo-klasik üsluplu otel. Haydarpaşa Garı’nın küçültülmüş bir yorumu olarak tasarlanmıştır; denize bakan bir uçurumun yanında konumlanır ve taş merdivenlerle aşağıdaki küçük sahile inilir.\n\nLobi, iç avlu ve yirmi odası vardır. Yeme-içme ve eğlence birimleri otelin kendi bünyesindedir.',
  metadata: {
    ...(KEMSKOY_HOTEL.metadata || {}),
    placeId: 'yer_iskele',
    faaliyet: '1954–',
    profile: {
      shopType: 'Otel',
      style: 'Neo-klasik taş yapı',
      manager: 'Cemal Salda',
      secrets: 'Şarap mahzeninden sahile inen, kuruluştan kalma kapalı bir tünel.',
      region: 'iskele'
    }
  }
});

/** Odalar — kalıcı özellikleriyle, doluluk bilgisi olmadan */
const rooms: Item[] = Array.from({ length: 20 }, (_, i) => {
  const kat = Math.floor(i / 5) + 1;
  const no = kat * 100 + (i % 5) + 1;
  const tip = (i % 5) < 2 ? 'Standart' : (i % 5) === 2 ? 'Suite' : 'Deluxe';
  return asItem({
    id: `oda_${no}`,
    title: `Oda ${no}`,
    area: 'duzada',
    type: 'oda',
    status: 'Fikir',
    priority: 'düşük',
    tags: ['oda'],
    links: [],
    notes:
      i % 6 === 0
        ? 'Denize bakan köşe oda. Pencere kanadı sabahları kendiliğinden aralanır; personel bunu rüzgâra verir.'
        : '',
    images: [],
    archived: false,
    isProposal: false,
    metadata: {
      placeId: 'kemskoy_hotel',
      profile: { floor: `${kat}. Kat`, roomType: tip }
    }
  });
});

/** Kişiler — her biri çalıştığı birime bağlı */
const people: Item[] = KEMSKOY_PEOPLE.map(p => {
  const birim = KISI_BIRIM[p.title];
  const it = asItem(p);
  return {
    ...it,
    metadata: {
      ...(it.metadata || {}),
      ...(birim ? { placeId: birim } : {})
    }
  };
});

const items: Item[] = [
  iskele,
  limanMah,
  fener,
  hotel,
  ...KEMSKOY_VENUES.map(asItem),
  ...people,
  ...rooms
];

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WikiShell items={items} />
  </React.StrictMode>
);
