import { jsPDF } from 'jspdf';
import type { Item } from '../types';
import { WIKI_TYPES, TYPE_LABELS, isStub, BOLGE_ADLARI } from '../components/wiki/wikiSchema';
import { DUZADA_ALAN_KM2, DUZADA_MERKEZ } from '../data/duzadaGeo';

/**
 * jsPDF Type1 yazı tipi (Helvetica) için Türkçe karakterleri güvenle dönüştürür.
 * ğ, ş, ı gibi Type1 standart glif havuzunda bulunmayan harflerin bozuk
 * görünmesini önler.
 */
function trPdf(metin: string | undefined | null): string {
  if (!metin) return '';
  return metin
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

export interface DuzadaPdfRaporuSecenekleri {
  dosyaAdi?: string;
  kaydet?: boolean;
}

/**
 * Düzada evreni için filtrelenmiş verilerden resmi, yazdırılabilir ve
 * profesyonel mizanpaja sahip çok sayfalı PDF raporu üretir.
 */
export function generateDuzadaPdf(
  items: Item[],
  options: DuzadaPdfRaporuSecenekleri = { kaydet: true }
): jsPDF {
  // A4 Boyutu: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const SAYFA_GENISLIGI = 210;
  const SAYFA_YUKSEKLIGI = 297;
  const MARGIN_SOL = 15;
  const MARGIN_SAG = 15;
  const IC_GENISLIK = SAYFA_GENISLIGI - MARGIN_SOL - MARGIN_SAG; // 180 mm
  const MARGIN_ALT = 20;

  // Renk Paleti
  const RENK_LACIVERT: [number, number, number] = [14, 28, 79];   // #0E1C4F
  const RENK_KIREMIT: [number, number, number] = [242, 107, 111];  // #F26B6F
  const RENK_GRI: [number, number, number] = [106, 94, 76];       // #6A5E4C
  const RENK_CIZGI: [number, number, number] = [207, 197, 180];   // #CFC5B4
  const RENK_ZEMIN: [number, number, number] = [250, 248, 245];   // #FAF8F5
  const RENK_YAZI: [number, number, number] = [30, 35, 45];

  // 1. Düzada ve Viki içeriklerini filtrele
  const duzadaItems = items.filter(
    i => !i.archived && (i.area === 'duzada' || WIKI_TYPES.includes(i.type))
  );

  const kisiler = duzadaItems.filter(i => i.type === 'kisi' || i.type === 'karakter');
  const mekanlar = duzadaItems.filter(i => i.type === 'mekân' || i.type === 'dükkân');
  const kurumlar = duzadaItems.filter(i => i.type === 'kulüp' || i.type === 'marka');
  const aileler = duzadaItems.filter(i => i.type === 'aile');
  const olaylar = duzadaItems.filter(i => i.type === 'olay');
  const esyalar = duzadaItems.filter(i => i.type === 'ürün');
  const odalar = duzadaItems.filter(i => i.type === 'oda');
  const haritaIsaretleri = duzadaItems.filter(i => i.type === 'map_pin' || i.type === 'map_settings');
  const taslakSayisi = duzadaItems.filter(isStub).length;

  let y = 18;

  // Sayfa kontrolü ve yeni sayfa ekleme
  function checkPage(ekstraYukseklik: number) {
    if (y + ekstraYukseklik > SAYFA_YUKSEKLIGI - MARGIN_ALT) {
      doc.addPage();
      y = 18;
      cizUstBilgi();
    }
  }

  // Sayfa başındaki küçük arşiv başlığı
  function cizUstBilgi() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...RENK_GRI);
    doc.text(trPdf('KEMS COMPANY ARCHIVES · DUZADA EVREN RAPORU'), MARGIN_SOL, y);
    doc.setFont('helvetica', 'normal');
    doc.text(trPdf('EST. 2024 · DUZADA, TR'), SAYFA_GENISLIGI - MARGIN_SAG, y, { align: 'right' });
    
    y += 2.5;
    doc.setDrawColor(...RENK_CIZGI);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_SOL, y, SAYFA_GENISLIGI - MARGIN_SAG, y);
    y += 6;
  }

  // Bölüm Başlığı Çizici
  function cizBolumBasligi(baslik: string) {
    checkPage(14);
    doc.setDrawColor(...RENK_KIREMIT);
    doc.setFillColor(...RENK_LACIVERT);
    doc.rect(MARGIN_SOL, y, 2.5, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...RENK_LACIVERT);
    doc.text(trPdf(baslik.toUpperCase()), MARGIN_SOL + 5, y + 4.5);

    y += 9;
  }

  // ---------------------------------------------------------------------------
  // SAYFA 1: KAPAK VE YÖNETİCİ ÖZETİ
  // ---------------------------------------------------------------------------
  cizUstBilgi();

  // Ana Antet Başlığı
  doc.setFillColor(...RENK_LACIVERT);
  doc.rect(MARGIN_SOL, y, 32, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(trPdf('RESMI EVREN BELGESI'), MARGIN_SOL + 3, y + 3.6);

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...RENK_LACIVERT);
  doc.text(trPdf('DUZADA EVREN RAPORU'), MARGIN_SOL, y);

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...RENK_GRI);
  doc.text(
    trPdf('Kanonik Cografya, Kentsel Mahalleler, Ada Varliklari ve Tarihsel Kronoloji Dokumu'),
    MARGIN_SOL,
    y
  );

  y += 7;
  doc.setDrawColor(...RENK_LACIVERT);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_SOL, y, SAYFA_GENISLIGI - MARGIN_SAG, y);
  y += 6;

  // İstatistik Kartları Çizelgesi
  doc.setFillColor(...RENK_ZEMIN);
  doc.setDrawColor(...RENK_CIZGI);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_SOL, y, IC_GENISLIK, 18, 2, 2, 'FD');

  const sutunGenislik = IC_GENISLIK / 4;
  const istatistikler = [
    { baslik: 'TOPLAM VARLIK', deger: String(duzadaItems.length), alt: 'Kayitli Oge' },
    { baslik: 'KISI / SAKIN', deger: String(kisiler.length), alt: 'Ada Nufusu' },
    { baslik: 'MEKAN & KURUM', deger: String(mekanlar.length + kurumlar.length), alt: 'Isletme & Tesis' },
    { baslik: 'KANON MAHALLE', deger: '5', alt: 'Resmi Bolge' }
  ];

  istatistikler.forEach((st, i) => {
    const xPos = MARGIN_SOL + i * sutunGenislik + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...RENK_GRI);
    doc.text(trPdf(st.baslik), xPos, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(i === 3 ? RENK_KIREMIT[0] : RENK_LACIVERT[0], i === 3 ? RENK_KIREMIT[1] : RENK_LACIVERT[1], i === 3 ? RENK_KIREMIT[2] : RENK_LACIVERT[2]);
    doc.text(st.deger, xPos, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...RENK_GRI);
    doc.text(trPdf(st.alt), xPos, y + 14.5);
  });

  y += 24;

  // BÖLÜM 1: COĞRAFİ VE FİZİKSEL KANON
  cizBolumBasligi('1. Cografi ve Fiziksel Kanon');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...RENK_YAZI);
  const cografyaMetin = doc.splitTextToSize(
    trPdf(
      'Duzada, Ege Denizi aciklarinda (39.60 K - 25.85 D) yer alan, antik donemden bu yana yerlesim goren kurgusal bir adadir. ' +
      'Bozcaada\'nin guneybatisinda, Babakale\'nin batisinda, Turk karasularinda bulunur. Idari bakimdan Canakkale\'nin Ayvacik ilcesine bagli ' +
      'bir beldedir. Anakara baglantisi 65 km dogudaki Kucukkuyu uzerinden kamu feribotlariyla saglanir.'
    ),
    IC_GENISLIK
  );
  doc.text(cografyaMetin, MARGIN_SOL, y);
  y += cografyaMetin.length * 4.2 + 2;

  // Coğrafi Ölçüler Tablosu
  const olculer = [
    ['Yuzolcumu', `${DUZADA_ALAN_KM2} km2`, 'Sabit kanon degeri; yuvarlanmaz veya degistirilmez.'],
    ['Dogu-Bati Genislik', '18.7 km', 'En genis yatay eksen.'],
    ['Kuzey-Guney Uzunluk', '12.7 km', 'Ada govde ekseni.'],
    ['Kiyi Seridi', '52.7 km', 'Girintili koylar, kumsallar ve burunlar dahil.'],
    ['Ada Tepesi (Zirve)', '742 m', 'Adanin en yuksek noktasi; antik surlar ve Yangin Kulesi.'],
    ['Nufus Rejimi', '3.000 - 15.000', 'Kisin ~3.500 yerlesik; yazin turizmle 3-4 katina cikar.']
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setFillColor(...RENK_ZEMIN);
  doc.rect(MARGIN_SOL, y, IC_GENISLIK, 5, 'F');
  doc.setTextColor(...RENK_LACIVERT);
  doc.text(trPdf('OLCU / NITELIK'), MARGIN_SOL + 2, y + 3.5);
  doc.text(trPdf('KANONIK DEGER'), MARGIN_SOL + 50, y + 3.5);
  doc.text(trPdf('ACIKLAMA'), MARGIN_SOL + 85, y + 3.5);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  olculer.forEach(([ad, val, not]) => {
    doc.setDrawColor(...RENK_CIZGI);
    doc.setLineWidth(0.15);
    doc.line(MARGIN_SOL, y, SAYFA_GENISLIGI - MARGIN_SAG, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RENK_YAZI);
    doc.text(trPdf(ad), MARGIN_SOL + 2, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RENK_KIREMIT);
    doc.text(trPdf(val), MARGIN_SOL + 50, y + 3.5);

    doc.setTextColor(...RENK_GRI);
    doc.text(trPdf(not), MARGIN_SOL + 85, y + 3.5);
    y += 4.5;
  });

  y += 6;

  // BÖLÜM 2: BEŞ KANONİK MAHALLE
  cizBolumBasligi('2. Bes Kanonik Mahalle ve Kentsel Yapi');

  const mahalleler = [
    {
      ad: 'Merkez Mahallesi (Eski Duzada Koyu)',
      detay: 'Idari ve geleneksel merkez. Apartman yoktur; tas ve kagir ada evleri hakimdir. Koy meydani, asirlik cinar, antik kaynak ustune yapilan tas cesme, Belediye Binasi, Ilkokul, Cumartesi Pazari ve Merkez Kahvehanesi buradadir.'
    },
    {
      ad: 'Liman Mahallesi (Yeni Liman)',
      detay: '1980-1990\'larda acilan modern liman. Deniz Feneri (19. yy), Liman Idare Binasi (baskanlik, gise, sahil guvenlik), balik hali, cekek yeri, Dondurmaci Kizlar ve antik amfora batigi dalis alani bulunur.'
    },
    {
      ad: 'Iskele Mahallesi / Kemskoy',
      detay: 'Eski balikci iskelesi. 1954 oteliyle baslayan yaz turizminin ve elit yasamin merkezi. The Imperial Kemskoy (1954), Kemskoy Caddesi, Sade Meze (eski fabrika), bos Tarihi Rum Kilisesi ve Kems Company Dukkani yer alir.'
    },
    {
      ad: 'Stadyum Mahallesi',
      detay: 'Adanin spor hayati ve genclik kulturu. Dirlik Stadi (1980\'ler, ~1.000 kisilik, iki tribunlu), Dirlik Spor Kulubu (Kurulus: 12 Mayis 1957), sahil kiyisindaki Taraftar Birahanesi ve Stadyum Plaji buradadir.'
    },
    {
      ad: 'Ciftlik Mahallesi',
      detay: 'Kirsal pastoral bolge; asirlik zeytinlikler ve baglar. Kucukcetmi Surek Kulubu (Kangal armali), Kemskoy Ziraat Isletmeleri Kurumu (Zeytinyagi Kooperatifi), butik aile saraphaneleri ve Ada Tepesi ariliklari yer alir.'
    }
  ];

  mahalleler.forEach(m => {
    checkPage(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...RENK_LACIVERT);
    doc.text(trPdf(`* ${m.ad}`), MARGIN_SOL + 1, y);
    y += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...RENK_YAZI);
    const mMetin = doc.splitTextToSize(trPdf(m.detay), IC_GENISLIK - 4);
    doc.text(mMetin, MARGIN_SOL + 4, y);
    y += mMetin.length * 3.6 + 2;
  });

  y += 4;

  // BÖLÜM 3: VARLIKLAR VE KURUMLAR (ENTITIES)
  cizBolumBasligi('3. Varliklar ve Toplumsal Yapi (Entities)');

  checkPage(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...RENK_LACIVERT);
  doc.text(trPdf('Kilit Kurumlar, Mekanlar ve Markalar:'), MARGIN_SOL, y);
  y += 4.5;

  const kilitVarliklar = [
    { ad: 'Kems Company', tur: 'Cati Marka', yer: 'Kemskoy Caddesi', not: '2024/2025 kurulusu. Lacivert, kiremit, krem renkler. Merch ve yayinlarin cati markasi.' },
    { ad: 'The Imperial Kemskoy', tur: 'Mekan / Otel', yer: 'Iskele Mahallesi', not: '1954 acilisi. Kesme tas, 4 kat, 20 oda, Haydarpasa minyaturu uslubu, ozel sahil koyu.' },
    { ad: 'Dirlik Spor Kulubu', tur: 'Spor Kulubu', yer: 'Stadyum Mahallesi', not: '12 Mayis 1957 kurulusu. Kolej Laciverti, kiremit, krem. Yelkenli armada tek spor kulubu.' },
    { ad: 'Kucukcetmi Surek Kulubu', tur: 'Kultur Kulubu', yer: 'Ciftlik Mahallesi', not: 'Kangal amblemli. Tek renk murekkep cizgi. Doga yuruyusu, nisancilik ve koruma.' },
    { ad: 'Sade Meze', tur: 'Meyhane', yer: 'Iskele Mahallesi', not: '19. yy sonu tas zeytinyagi fabrikasindan 1980\'lerde donusturulen ada meyhanesi.' },
    { ad: 'Deniz Feneri', tur: 'Simge Yapi', yer: 'Liman Mahallesi', not: '19. yy insasi, 1970\'lerde otomatik sisteme gecen ada feneri. Ziyarete acik.' },
    { ad: 'Dondurmaci Kizlar', tur: 'Kafe / Dukkan', yer: 'Liman Mahallesi', not: '2000 sonrasi acilan simge dondurmaci ve kislik tatlici.' }
  ];

  kilitVarliklar.forEach(kv => {
    checkPage(9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...RENK_LACIVERT);
    doc.text(trPdf(`[${kv.tur}] ${kv.ad}`), MARGIN_SOL + 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RENK_KIREMIT);
    doc.text(trPdf(`(${kv.yer})`), MARGIN_SOL + 60, y);

    y += 3.2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RENK_GRI);
    doc.text(trPdf(kv.not), MARGIN_SOL + 4, y);
    y += 4.5;
  });

  // Kişiler ve Sakinler Özeti
  checkPage(18);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...RENK_LACIVERT);
  doc.text(trPdf(`Ada Sakinleri Envanteri (${kisiler.length} Kayitli Kisi):`), MARGIN_SOL, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...RENK_YAZI);
  const kisiNotu = doc.splitTextToSize(
    trPdf(
      'Sistemde kayitli 94 kisi bulunmaktadir. Karakterler "Ada Sakini" koruma modeliyle saklanir; ' +
      'otelden veya kurgudan ayrilan kisiler silinmez, ada-sakini statuse gecirilir. ' +
      'Ornek sakinler: Barbaros Yilmaz, Deniz (resepsiyon), Eleni, Tarik (belboy), Melek (kat hizmetleri), ' +
      'Sade Meze ve Dondurmaci Kizlar\'in sahibi ada kokenli kadin isletmeci, balikcilar ve koy esnafi.'
    ),
    IC_GENISLIK
  );
  doc.text(kisiNotu, MARGIN_SOL, y);
  y += kisiNotu.length * 3.8 + 4;

  // BÖLÜM 4: KANONİK TARİHÇE VE KRONOLOJİ (LORE)
  cizBolumBasligi('4. Tarihsel Kronoloji ve Kanon Silsilesi (Lore)');

  const kronoloji = [
    ['Antik Donem', 'Ada Tepesi sur duvarlari ve Liman acigindaki Amfora batik alani.'],
    ['18. Yuzyil', 'Iskele\'deki Rum Tas Kilisesi ve yanindaki mezarlik insasi.'],
    ['19. Yuzyil', 'Deniz Feneri\'nin insasi (gaz lambali kule ve bekci evi).'],
    ['1920-1940\'lar', 'Duzada Ilkokulu\'nun koy doneminde egitime baslamasi.'],
    ['1923 (Lozan)', 'Rum cemaatinin ayrilisi; Selanik ve Girit gocmenlerinin yerlesimi. Kilise bos kalir.'],
    ['1954', 'The Imperial Kemskoy acilir (Devlet misafirhanesi olarak baslar; otele donusur). Yaz turizmi baslar.'],
    ['12 Mayis 1957', 'Dirlik Spor Kulubu koy doneminde toprak sahada amator genclerce kurulur.'],
    ['1970\'ler', 'Deniz Feneri otomatige gecer; koye elektrik sebekesi baglanir.'],
    ['1980\'ler', 'Duzada Belediyesi kurulur (Koy -> Merkez Mahallesi). Yeni Liman ve Dirlik Stadi yapilir. Sade Meze acilir.'],
    ['1990\'lar', 'Surek avi birakilir; Kucukcetmi Kulubu doga ve koruma kulubune evrilir.'],
    ['2000 Sonrasi', 'Dondurmaci Kizlar acilir. Ciftlik\'te bagcilik ve butik saraphaneler kurulur.'],
    ['2024 / 2025', 'Kems Company kurulur ve Kemskoy Caddesi magazasi faaliyete gecer.']
  ];

  kronoloji.forEach(([tarih, olay]) => {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...RENK_KIREMIT);
    doc.text(trPdf(tarih), MARGIN_SOL + 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RENK_YAZI);
    doc.text(trPdf(`: ${olay}`), MARGIN_SOL + 30, y);
    y += 4.5;
  });

  y += 4;

  // BÖLÜM 5: KANON YAZIM VE TUTARLILIK KURALLARI
  cizBolumBasligi('5. Kanon Denetim ve Yazim Standartlari');

  const kurallar = [
    ['Norvecce "o" Yasagi', 'Evrende "Kemskoy" yaziminda asla "o" harfi kullanilmaz. Tek resmi bicim Kemskoy\'dur.'],
    ['Departman Kurali', 'Otel ici birimler (Resepsiyon, Kat Hizmetleri vb.) kurumsal departmandir; uydurma marka yapilmaz.'],
    ['1980 Siniri', '1980 oncesi metinlerde Liman Mahallesi, Dirlik Stadi, Belediye, Sade Meze ve Saglik Ocagi gecemez.'],
    ['1954 Siniri', '1954 oncesinde The Imperial Kemskoy var olamaz.'],
    ['Ada Sakini Kurali', 'Oteli terk eden karakterler silinmez; ada-sakini etiketiyle evrende yasamayi surdurur.']
  ];

  kurallar.forEach(([kural, aciklama]) => {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...RENK_LACIVERT);
    doc.text(trPdf(`* ${kural}:`), MARGIN_SOL + 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RENK_GRI);
    doc.text(trPdf(aciklama), MARGIN_SOL + 38, y);
    y += 4.5;
  });

  // ---------------------------------------------------------------------------
  // ALT BİLGİ VE SAYFA NUMARALANDIRMA (TÜM SAYFALAR)
  // ---------------------------------------------------------------------------
  const toplamSayfa = doc.getNumberOfPages();
  for (let i = 1; i <= toplamSayfa; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RENK_CIZGI);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_SOL, SAYFA_YUKSEKLIGI - 12, SAYFA_GENISLIGI - MARGIN_SAG, SAYFA_YUKSEKLIGI - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...RENK_GRI);
    doc.text(
      trPdf('Kems Komuta Merkezi Master Raporu · Duzada, TR · Made with Culture'),
      MARGIN_SOL,
      SAYFA_YUKSEKLIGI - 8
    );
    doc.text(
      trPdf(`Sayfa ${i} / ${toplamSayfa}`),
      SAYFA_GENISLIGI - MARGIN_SAG,
      SAYFA_YUKSEKLIGI - 8,
      { align: 'right' }
    );
  }

  // PDF Dosyasını İndir
  if (options.kaydet) {
    const dosyaAdi = options.dosyaAdi || `duzada-evren-raporu-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(dosyaAdi);
  }

  return doc;
}
