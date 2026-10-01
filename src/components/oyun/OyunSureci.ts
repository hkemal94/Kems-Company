import type { Item } from '../../types';

/**
 * Oyun stüdyosu süreci (34 cevabın 25. maddesi).
 *
 * Kemal: "İyi bir süreç şeması yaz ve o sektörde kalsın."
 *
 * Aşağıdaki zincir oyun sektörünün kendi zinciri; uydurulmadı, sadeleştirildi:
 * konsept → tasarım belgesi → dikey dilim → üretim → alfa → beta → yayın.
 * Her aşamanın "çıkışı" var: o çıkış üretilmeden sonraki aşamaya geçilmez.
 * Şema bu yüzden isim listesi değil, kapı listesi.
 */

export interface Asama {
  id: string;
  ad: string;
  /** Sektördeki karşılığı — terimi kaybetmeyelim */
  terim: string;
  /** Bu aşama neyi üretir; üretilmeden ilerlenmez */
  cikti: string;
}

export const ASAMALAR: Asama[] = [
  {
    id: 'konsept', ad: 'Konsept', terim: 'concept',
    cikti: 'Tek sayfalık oyun fikri: kim oynuyor, ne yapıyor, neden devam ediyor'
  },
  {
    id: 'gdd', ad: 'Tasarım belgesi', terim: 'GDD',
    cikti: 'Oynanış, mekanikler, kapsam yazılı — ekip aynı oyunu anlıyor'
  },
  {
    id: 'dikey', ad: 'Dikey dilim', terim: 'vertical slice',
    cikti: 'Oynanabilir tek bölüm, bitmiş kalitede — oyun eğlenceli mi, burada anlaşılır'
  },
  {
    id: 'uretim', ad: 'Üretim', terim: 'production',
    cikti: 'Bütün içerik üretiliyor; yeni mekanik eklenmiyor'
  },
  {
    id: 'alfa', ad: 'Alfa', terim: 'alpha',
    cikti: 'Özellikler tamam (feature complete), içerik eksik olabilir'
  },
  {
    id: 'beta', ad: 'Beta', terim: 'beta',
    cikti: 'İçerik de tamam; yalnız hata ayıklama ve denge kalıyor'
  },
  {
    id: 'yayin', ad: 'Yayın', terim: 'release',
    cikti: 'Oyun dışarıda'
  }
];

/**
 * Tasarım belgesinin bölümleri.
 *
 * Yalnız başlıklar. İçlerine bir şey yazılmıyor — Kemal'in 17. cevabı:
 * "Sen aç bana bir düğme, yazma; sonrasında ben içlerindeki boşlukları
 * düzenlerim." Bunlar sektörün standart GDD başlıkları.
 */
export const GDD_BOLUMLERI: Array<{ id: string; ad: string; soru: string }> = [
  { id: 'kunye',     ad: 'Künye',                soru: 'Oyunun adı, türü, platformu, hedef oyuncusu' },
  { id: 'ozet',      ad: 'Tek cümlelik özet',    soru: 'Oyunu tek cümleyle nasıl anlatırsın?' },
  { id: 'dongu',     ad: 'Oynanış döngüsü',      soru: 'Oyuncu bir oturumda hangi adımları tekrar eder?' },
  { id: 'mekanik',   ad: 'Mekanikler',           soru: 'Oyuncu ne yapabilir? Kurallar neler?' },
  { id: 'kontrol',   ad: 'Kontroller',           soru: 'Oyun nasıl oynanıyor — fare, klavye, dokunma?' },
  { id: 'ilerleme',  ad: 'İlerleme ve ödül',     soru: 'Oyuncu neden devam eder? Ne kazanır?' },
  { id: 'dunya',     ad: 'Dünya ve kurgu',       soru: 'Oyun Düzada evreninin neresinde geçiyor?' },
  { id: 'karakter',  ad: 'Karakterler',          soru: 'Kim oynanıyor, kimlerle karşılaşılıyor?' },
  { id: 'arayuz',    ad: 'Arayüz',               soru: 'Ekranda ne görünüyor?' },
  { id: 'gorsel',    ad: 'Görsel dil',           soru: 'Oyun neye benziyor? Marka paletiyle ilişkisi ne?' },
  { id: 'ses',       ad: 'Ses',                  soru: 'Müzik ve ses oyunu nasıl taşıyor?' },
  { id: 'kapsam',    ad: 'Kapsam ve takvim',     soru: 'Ne kadar içerik, ne kadar sürede?' },
  { id: 'risk',      ad: 'Riskler',              soru: 'Bu projeyi ne batırır?' }
];

/**
 * Birden çok oyun (1 Ekim, Kemal: "Oyunlar listesi + künye"). Her oyun bir
 * `oyun_tanitim` kaydıdır. İş, tasarım belgesi ve fikir notları
 * `metadata.oyunId` ile oyununa bağlanır. Bu alan yoksa kayıt ilk oyunundur
 * (`oyun_tanitim`); eski kayıtlar böylece taşınmadan yerinde kalır.
 */
export const ILK_OYUN_ID = 'oyun_tanitim';
export const oyunKimligi = (i: Item): string => String((i.metadata as any)?.oyunId || ILK_OYUN_ID);
const buOyunun = (i: Item, oyunId?: string) => !oyunId || oyunKimligi(i) === oyunId;

/**
 * Oyunlar listesi. Hiç tanıtım kaydı yokken ilk oyunun işi ya da belgesi
 * varsa, o oyun kaydı açılmamış hâliyle (adsız) listede görünür.
 */
export function oyunlar(items: Item[]): Array<{ id: string; kayit?: Item }> {
  const kayitlar = items.filter(i => i.type === 'oyun_tanitim' && !i.archived).sort((a, b) => a.createdAt - b.createdAt);
  const liste: Array<{ id: string; kayit?: Item }> = kayitlar.map(k => ({ id: k.id, kayit: k }));
  const ilkVar = kayitlar.some(k => k.id === ILK_OYUN_ID);
  const ilkinVerisi = items.some(i => ['oyun_is', 'gdd_bolum', 'oyun_fikir'].includes(i.type) && !i.archived && oyunKimligi(i) === ILK_OYUN_ID);
  if (!ilkVar && (ilkinVerisi || !kayitlar.length)) liste.unshift({ id: ILK_OYUN_ID });
  return liste;
}

/** Oyunun adı: Kemal'in künyede yazdığı; yoksa boş */
export const oyunAdi = (kayit?: Item): string => String((kayit?.metadata as any)?.ad || '').trim();

/** Süreçteki iş kartları */
export function oyunIsleri(items: Item[], oyunId?: string): Item[] {
  return items.filter(i => i.type === 'oyun_is' && !i.archived && !i.isProposal && buOyunun(i, oyunId));
}

/** Tasarım belgesi bölümleri — açılmış olanlar */
export function gddBolumleri(items: Item[], oyunId?: string): Item[] {
  return items.filter(i => i.type === 'gdd_bolum' && !i.archived && buOyunun(i, oyunId));
}

/**
 * Projenin şu anki aşaması: iş kartı bulunan en geri aşama.
 *
 * Sebebi: bir stüdyo "beta"da değildir, en geride kalan işi neredeyse
 * oradadır. Tek bir kart konseptte duruyorsa proje konsepttedir.
 */
export function projeAsamasi(items: Item[], oyunId?: string): Asama | null {
  const isler = oyunIsleri(items, oyunId);
  if (!isler.length) return null;
  for (const a of ASAMALAR) {
    if (isler.some(i => String((i.metadata as any)?.asama || 'konsept') === a.id)) return a;
  }
  return null;
}

/**
 * Tıklamalı tasarım belgesi (Paket 5, 29 Eylül). Kemal: oyun kısmına
 * "tıklamalı bir GDD otomasyonu". Her bölümde tasarım kararları seçenekle
 * seçilir; seçim bölümün metnine "* Etiket: değer" satırı olarak yazılır,
 * altına serbest yazı eklenebilir. Seçenekler kurgu değil, tasarım
 * kararıdır; ad ve hikâye soran yerlerde seçenek yok, kutu var.
 */
export interface GddSecimi { id: string; etiket: string; secenekler: string[]; coklu?: boolean }

export const GDD_SECIMLERI: Record<string, GddSecimi[]> = {
  kunye: [
    { id: 'tur', etiket: 'Tür', secenekler: ['Yönetim / tycoon', 'Şehir kurma', 'Anlatı macerası', 'Bulmaca', 'Rol yapma (RPG)', 'Kart oyunu'], coklu: true },
    { id: 'platform', etiket: 'Platform', secenekler: ['PC', 'Mac', 'Mobil', 'Web tarayıcı', 'Konsol'], coklu: true },
    { id: 'oyuncu', etiket: 'Hedef oyuncu', secenekler: ['Sakin, rahat oynayan', 'Hikâye seven', 'Strateji seven', 'Aile / herkes'], coklu: true },
    { id: 'kip', etiket: 'Oyuncu sayısı', secenekler: ['Tek oyunculu', 'Çok oyunculu', 'İkisi de'] }
  ],
  dongu: [
    { id: 'oturum', etiket: 'Bir oturum', secenekler: ['5–10 dakika', '15–30 dakika', '30–60 dakika', '1 saatten uzun'] },
    { id: 'zaman', etiket: 'Zaman nasıl akar', secenekler: ['Gün gün ilerler', 'Sıra tabanlı', 'Gerçek zamanlı', 'Bölüm bölüm'] }
  ],
  mekanik: [
    { id: 'mekanik', etiket: 'Ana mekanikler', secenekler: ['Kaynak yönetimi', 'Diyalog seçimleri', 'Keşif', 'İnşa / yerleştirme', 'Envanter', 'Zaman yönetimi', 'Müşteri / misafir karşılama'], coklu: true }
  ],
  kontrol: [
    { id: 'kontrol', etiket: 'Kontrol', secenekler: ['Fare ve klavye', 'Yalnız fare', 'Dokunmatik', 'Oyun kolu'], coklu: true }
  ],
  ilerleme: [
    { id: 'odul', etiket: 'Oyuncu ne kazanır', secenekler: ['Hikâye bölümleri açılır', 'Yeni alanlar açılır', 'Para / itibar', 'Başarımlar', 'Koleksiyon'], coklu: true },
    { id: 'son', etiket: 'Oyunun sonu', secenekler: ['Tek son', 'Birden çok son', 'Sonu yok (açık uçlu)'] }
  ],
  dunya: [
    { id: 'yer', etiket: 'Düzada\'da nerede', secenekler: ['Bütün ada', 'Tek bir mahalle', 'Tek bir mekân', 'Ada ve çevresi'] },
    { id: 'donem', etiket: 'Zaman aralığı', secenekler: ['Tek bir sezon', 'Birkaç yıl', 'Onyıllara yayılır'] }
  ],
  karakter: [
    { id: 'oyuncuKim', etiket: 'Oyuncu kim', secenekler: ['Adı olan bir karakter', 'Adsız, oyuncunun kendisi', 'Birden çok karakter'] }
  ],
  arayuz: [
    { id: 'kamera', etiket: 'Kamera', secenekler: ['Üstten', 'İzometrik', '2D yandan', 'Birinci şahıs', 'Menü / kart tabanlı'] }
  ],
  gorsel: [
    { id: 'stil', etiket: 'Görsel stil', secenekler: ['Piksel sanat', 'El çizimi 2D', 'Düşük poligon 3D', 'Gerçekçi 3D', 'Kâğıt / kolaj'] },
    { id: 'palet', etiket: 'Palet', secenekler: ['Marka paleti (lacivert, kiremit, krem)', 'Kendi paleti'] }
  ],
  ses: [
    { id: 'muzik', etiket: 'Müzik', secenekler: ['Ege / yerel çalgılar', 'Lo-fi', 'Orkestral', 'Yalnız ortam sesi'] },
    { id: 'seslendirme', etiket: 'Seslendirme', secenekler: ['Yok', 'Kısmi', 'Tam'] }
  ],
  kapsam: [
    { id: 'sure', etiket: 'Oyun süresi', secenekler: ['1–3 saat', '5–10 saat', '20 saatten uzun', 'Sınırsız'] },
    { id: 'takvim', etiket: 'Takvim', secenekler: ['3 ay', '6 ay', '1 yıl', 'Belirsiz'] },
    { id: 'ekip', etiket: 'Ekip', secenekler: ['Tek kişi', '2–3 kişi', 'Stüdyo'] }
  ],
  risk: [
    { id: 'risk', etiket: 'Riskler', secenekler: ['Kapsam büyür', 'Zaman yetmez', 'Teknik zorluk', 'Finansman', 'Motivasyon düşer'], coklu: true }
  ]
};

const satirRe = (etiket: string) =>
  new RegExp(`^\\* ${etiket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.*)$`, 'm');

/** Bölüm metnindeki seçili değerler ("* Tür: A, B" → ['A','B']) */
export function secilenler(notlar: string, s: GddSecimi): string[] {
  const m = (notlar || '').match(satirRe(s.etiket));
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** Bir seçeneğe basılınca metnin yeni hâli */
export function secimiUygula(notlar: string, s: GddSecimi, secenek: string): string {
  const once = secilenler(notlar, s);
  const sonra = s.coklu
    ? (once.includes(secenek) ? once.filter(x => x !== secenek) : [...once, secenek])
    : (once[0] === secenek ? [] : [secenek]);
  const re = satirRe(s.etiket);
  const satir = `* ${s.etiket}: ${sonra.join(', ')}`;
  const metin = notlar || '';
  if (re.test(metin)) {
    return (sonra.length ? metin.replace(re, satir) : metin.replace(new RegExp(re.source + '\\n?', 'm'), '')).trim();
  }
  if (!sonra.length) return metin;
  // Seçim satırları metnin başında toplanır, serbest yazı altta kalır
  const satirlar = metin.split('\n');
  const son = satirlar.reduce((n, l, i) => (l.startsWith('* ') ? i + 1 : n), 0);
  satirlar.splice(son, 0, satir);
  return satirlar.join('\n').trim();
}

/** Serbest yazı kısmı (seçim satırları hariç) */
export const serbestYazi = (notlar: string) =>
  (notlar || '').split('\n').filter(l => !l.startsWith('* ')).join('\n').trim();
export const secimSatirlari = (notlar: string) =>
  (notlar || '').split('\n').filter(l => l.startsWith('* ')).join('\n');

/**
 * Adım adım süreç (1 Ekim, Kemal: "sektörü bilmediğim için bana ne
 * istediğimi anlatabilen basit bir otomasyon"). Tasarım belgesinin her
 * bölümü bir adım; her adımın yanında sektör dilinin sade açıklaması var.
 * Açıklamalar kurgu değil, yol gösterici; adları ve hikâyeyi Kemal yazar.
 */
export const BOLUM_ACIKLAMASI: Record<string, string> = {
  kunye: 'Oyunun kimlik kartı. Türünü, nerede oynanacağını ve kimin için olduğunu seç; sonraki her karar buna göre şekillenir.',
  ozet: 'Sektörde "elevator pitch" denir: oyunu bilmeyen birine tek cümlede anlatış. Yazamıyorsan oyun henüz netleşmemiştir; sorun değil, sonra dön.',
  dongu: '"Core loop": oyuncunun bir oturumda tekrar tekrar yaptığı küçük döngü (ör. hazırlan → karşıla → kazan → geliştir). Oyunun kalbi budur.',
  mekanik: 'Oyuncunun yapabildiği eylemler ve kurallar. Az ama iyi işleyen mekanik, çok ama dağınık mekanikten iyidir.',
  kontrol: 'Oyuncunun oyunla nasıl konuştuğu: fare, dokunma, kol. Seçtiğin platformla uyumlu olmalı.',
  ilerleme: 'Oyuncuyu geri getiren şey: açılan yerler, kazanılan ödüller, ilerleyen hikâye.',
  dunya: 'Oyunun Düzada\'da nerede ve hangi zaman aralığında geçtiği. Yer seç; hikâyeyi sen yazarsın.',
  karakter: 'Oyuncunun kim olduğu ve kimlerle karşılaştığı. Adları sen koyarsın; vikideki kişiler buraya bağlanabilir.',
  arayuz: 'Ekranda oyuncunun gördüğü her şey: kamera açısı, menüler, göstergeler.',
  gorsel: 'Oyunun neye benzediği. Küçük ekip için sade bir stil hem hızlı hem tutarlı olur.',
  ses: 'Müzik ve sesler oyunun havasını taşır. Seslendirme pahalıdır; çoğu küçük oyun onsuz ya da kısmi yapar.',
  kapsam: 'Ne kadar içerik, ne kadar sürede, kaç kişiyle. Küçük ve bitmiş oyun, büyük ve bitmemiş oyundan iyidir.',
  risk: 'Projeyi durdurabilecek şeyler. Önceden adını koymak önlem almayı kolaylaştırır.'
};

/** Sekmelere dağılım: künye/konsept ve mekanik/notlar */
export const KONSEPT_BOLUMLERI = ['kunye', 'ozet', 'dunya', 'karakter'];
export const MEKANIK_BOLUMLERI = ['dongu', 'mekanik', 'kontrol', 'ilerleme', 'arayuz', 'gorsel', 'ses'];
/** Adım sırası: önce kimlik, sonra oynanış, sonra görünüş, en son plan */
export const ADIM_SIRASI = ['kunye', 'ozet', 'dongu', 'mekanik', 'kontrol', 'ilerleme', 'dunya', 'karakter', 'arayuz', 'gorsel', 'ses', 'kapsam', 'risk'];

/** Bir bölüm "yapıldı" sayılır: en az bir seçim ya da yazı varsa */
export function bolumYapildi(kayit: Item | undefined): boolean {
  return !!kayit && !!(kayit.notes || '').trim();
}

/** Fikir notu kategorileri (oyun dosyasında durur) */
export const FIKIR_KATEGORILERI = ['Mekanik', 'Hikâye', 'Karakter', 'Görsel', 'Ses', 'Teknik', 'Diğer'] as const;

export function oyunFikirleri(items: Item[], oyunId?: string): Item[] {
  return items.filter(i => i.type === 'oyun_fikir' && !i.archived && buOyunun(i, oyunId)).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Oyun künyesi satırları (viki künyesi gibi). Değerler yalnız Kemal'in
 * tasarım belgesindeki seçimlerinden gelir; seçilmemişse boş. Her satır,
 * dolduğu adımı bilir (boşsa oraya götürülür).
 */
export const KUNYE_SATIRLARI: Array<{ etiket: string; bolumId: string; secimId: string }> = [
  { etiket: 'Tür', bolumId: 'kunye', secimId: 'tur' },
  { etiket: 'Platform', bolumId: 'kunye', secimId: 'platform' },
  { etiket: 'Hedef oyuncu', bolumId: 'kunye', secimId: 'oyuncu' },
  { etiket: 'Oyuncu sayısı', bolumId: 'kunye', secimId: 'kip' },
  { etiket: 'Düzada\'da nerede', bolumId: 'dunya', secimId: 'yer' },
  { etiket: 'Zaman aralığı', bolumId: 'dunya', secimId: 'donem' },
  { etiket: 'Kamera', bolumId: 'arayuz', secimId: 'kamera' },
  { etiket: 'Görsel stil', bolumId: 'gorsel', secimId: 'stil' },
  { etiket: 'Oyun süresi', bolumId: 'kapsam', secimId: 'sure' },
  { etiket: 'Takvim', bolumId: 'kapsam', secimId: 'takvim' },
  { etiket: 'Ekip', bolumId: 'kapsam', secimId: 'ekip' }
];

export function kunyeDegeri(belgeler: Item[], satir: { bolumId: string; secimId: string }): string {
  const k = belgeler.find(b => (b.metadata as any)?.bolumId === satir.bolumId);
  const s = (GDD_SECIMLERI[satir.bolumId] || []).find(x => x.id === satir.secimId);
  return k && s ? secilenler(k.notes || '', s).join(', ') : '';
}

/**
 * Oyun dosyası: künye, tasarım belgesi, fikir notları ve işler tek
 * belgede (Markdown). Yalnız Kemal'in kayıtları; boş bölüm "boş" yazar.
 */
export function oyunBelgesi(items: Item[], oyunId: string = ILK_OYUN_ID): string {
  const tanitim = items.find(i => i.id === oyunId && !i.archived);
  const meta = (tanitim?.metadata || {}) as { ozet?: string; aciklama?: string };
  const bolumler = gddBolumleri(items, oyunId);
  const asama = projeAsamasi(items, oyunId);
  const s: string[] = [];
  const tarih = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  s.push(`# ${oyunAdi(tanitim) || 'Adsız oyun'} · oyun dosyası`, '', `Kems Komuta Merkezi · ${tarih}`, '');
  s.push('## Künye', '');
  s.push(`- Ad: ${oyunAdi(tanitim) || 'boş'}`);
  s.push(`- Durum: ${asama ? `${asama.ad} (${asama.terim})` : 'başlamadı'}`);
  for (const k of KUNYE_SATIRLARI) s.push(`- ${k.etiket}: ${kunyeDegeri(bolumler, k) || 'boş'}`);
  s.push(`- Özet: ${meta.ozet?.trim() || 'boş'}`);
  s.push('', '### Açıklama', '', meta.aciklama?.trim() || 'boş', '');
  s.push('## Tasarım belgesi', '');
  for (const id of ADIM_SIRASI) {
    const b = GDD_BOLUMLERI.find(x => x.id === id)!;
    const k = bolumler.find(x => (x.metadata as any)?.bolumId === id);
    s.push(`### ${b.ad}`, '', (k?.notes || '').trim() || 'boş', '');
  }
  s.push('## Fikir notları', '');
  const fikirler = oyunFikirleri(items, oyunId);
  if (!fikirler.length) s.push('boş', '');
  for (const kat of FIKIR_KATEGORILERI) {
    const bunlar = fikirler.filter(f => (f.metadata as any)?.kategori === kat || (kat === 'Diğer' && !FIKIR_KATEGORILERI.includes((f.metadata as any)?.kategori)));
    if (!bunlar.length) continue;
    s.push(`### ${kat}`, '');
    for (const f of bunlar) s.push(`- **${f.title}**${f.notes?.trim() ? ` — ${f.notes.trim().replace(/\n+/g, ' ')}` : ''}`);
    s.push('');
  }
  s.push('## İşler', '');
  const isler = oyunIsleri(items, oyunId);
  if (!isler.length) s.push('boş', '');
  for (const a of ASAMALAR) {
    const bunlar = isler.filter(i => String((i.metadata as any)?.asama || 'konsept') === a.id);
    if (!bunlar.length) continue;
    s.push(`### ${a.ad}`, '', ...bunlar.map(i => `- ${i.title}`), '');
  }
  return s.join('\n');
}
