import React, { useState, useMemo, useRef } from 'react';
import {
  Printer, Copy, Check, Download, FileText, Layers, MapPin, Compass,
  Users, Building, Landmark, ShoppingBag, Flag, Calendar, Eye,
  Search, Shield, AlertTriangle, ArrowRight, BookOpen, Sparkles
} from 'lucide-react';
import type { Item, ItemType } from '../../types';
import { WIKI_TYPES, TYPE_LABELS, isStub, BOLGE_ADLARI } from '../wiki/wikiSchema';
import { HARITA_YAPILARI } from '../../data/haritaYapilari';
import { DUZADA_ALAN_KM2, DUZADA_MERKEZ } from '../../data/duzadaGeo';
import { TARIH_KURALLARI } from '../../lib/kanonTarihleri';
import { MAHALLE_ISKELETI } from '../../lib/mahalleMetinleri';
import { generateDuzadaPdf } from '../../lib/duzadaPdf';

interface DuzadaRaporuProps {
  items: Item[];
  onMaddeSec?: (id: string) => void;
  onHaritayaGit?: () => void;
}

export const DuzadaRaporu: React.FC<DuzadaRaporuProps> = ({
  items,
  onMaddeSec,
  onHaritayaGit
}) => {
  const [gorunum, setGorunum] = useState<'belge' | 'markdown'>('belge');
  const [arama, setArama] = useState('');
  const [kopyalandi, setKopyalandi] = useState(false);
  const raporRef = useRef<HTMLDivElement>(null);

  // 1. Düzada ve Viki içeriklerini filtrele
  const duzadaItems = useMemo(() => {
    return items.filter(
      i => !i.archived && (i.area === 'duzada' || WIKI_TYPES.includes(i.type))
    );
  }, [items]);

  // Varlık türlerine göre sınıflandırma
  const kategoriler = useMemo(() => {
    const kisiler = duzadaItems.filter(i => i.type === 'kisi' || i.type === 'karakter');
    const mekanlar = duzadaItems.filter(i => i.type === 'mekân' || i.type === 'dükkân');
    const kurumlar = duzadaItems.filter(i => i.type === 'kulüp' || i.type === 'marka');
    const yerler = duzadaItems.filter(i => i.type === 'yer');
    const aileler = duzadaItems.filter(i => i.type === 'aile');
    const olaylar = duzadaItems.filter(i => i.type === 'olay');
    const esyalar = duzadaItems.filter(i => i.type === 'ürün');
    const odalar = duzadaItems.filter(i => i.type === 'oda');
    const haritaIsaretleri = duzadaItems.filter(i => i.type === 'map_pin' || i.type === 'map_settings');

    const taslakSayisi = duzadaItems.filter(isStub).length;
    const sitedeOlanlar = duzadaItems.filter(i => i.metadata?.sitede === true).length;

    return {
      kisiler,
      mekanlar,
      kurumlar,
      yerler,
      aileler,
      olaylar,
      esyalar,
      odalar,
      haritaIsaretleri,
      taslakSayisi,
      sitedeOlanlar
    };
  }, [duzadaItems]);

  // 5 Kanonik Mahalle ve bağlı yapılar
  const mahalleDetaylari = useMemo(() => {
    const mahalleListesi = [
      {
        id: 'merkez',
        ad: 'Merkez Mahallesi',
        eskiAd: 'Düzada Köyü',
        karakter: 'İdari merkez, köy meydanı, kamu kurumları, esnaf çarşısı. Apartman yok, kagir ve taş ada evleri.',
        simgeler: ['Köy Meydanı & Yaşlı Çınar', 'Antik Taş Çeşme', 'Belediye Binası', 'Düzada İlkokulu', 'Merkez Pazarı', 'Merkez Kahvehanesi']
      },
      {
        id: 'liman',
        ad: 'Liman Mahallesi',
        eskiAd: 'Yeni Liman',
        karakter: '1980–1990’larda devlet eliyle açılan modern liman; feribot, deniz taksi kooperatifi, balık hali ve kuzeybatı feneri.',
        simgeler: ['Deniz Feneri (19. yy)', 'Liman İdare Binası', 'Balık Hali & Çekek Yeri', 'Dondurmacı Kızlar', 'Antik Amfora Batık Alanı']
      },
      {
        id: 'iskele',
        ad: 'İskele Mahallesi / Kemsköy',
        eskiAd: 'Kemsköy Rıhtımı',
        karakter: 'Eski köy iskelesi; 1954 oteliyle başlayan elit turizm merkezi, gece hayatı, butikler ve Kemsköy Caddesi.',
        simgeler: ['The Imperial Kemsköy (1954)', 'Kemsköy Caddesi', 'Sade Meze (Eski Taş Fabrika)', 'Tarihi Boş Taş Kilise & Rum Mezarlığı', 'Kems Company Dükkânı']
      },
      {
        id: 'stadyum',
        ad: 'Stadyum Mahallesi',
        eskiAd: 'Stat Çevresi',
        karakter: 'Adanın spor hayatı, Dirlik Spor Kulübü ve halk plajının birleştiği genç, canlı yerleşim.',
        simgeler: ['Dirlik Stadı (1980’ler, ~1.000 kişilik)', 'Dirlik Spor Kulübü (Kuruluş: 12 Mayıs 1957)', 'Taraftar Birahanesi', 'Stadyum Halk Plajı']
      },
      {
        id: 'ciftlik',
        ad: 'Çiftlik Mahallesi',
        eskiAd: 'Küçükçetmi Arazileri',
        karakter: 'Pastoral kırsal doku, asırlık zeytinlikler, zeytinyağı kooperatifi, sürek kulübü ve butik şaraphaneler.',
        simgeler: ['Küçükçetmi Sürek Kulübü (Kangal Armalı)', 'Kemsköy Ziraat İşletmeleri Kurumu (Zeytinyağı Fabrikası)', 'Butik Aile Şaraphaneleri', 'Ada Tepesi Çam Balı Arılıkları']
      }
    ];

    return mahalleListesi.map(m => {
      const bagliMaddeler = duzadaItems.filter(i => {
        const reg = (i.metadata?.region || '').toLowerCase();
        return reg.includes(m.id) || reg.includes(m.ad.toLowerCase()) || (i.title.toLowerCase().includes(m.id));
      });
      return { ...m, bagliMaddeler };
    });
  }, [duzadaItems]);

  // Arama filtrelemesi
  const filtrelenmisKisiler = useMemo(() => {
    if (!arama.trim()) return kategoriler.kisiler;
    const q = arama.toLowerCase();
    return kategoriler.kisiler.filter(k =>
      k.title.toLowerCase().includes(q) ||
      (k.notes || '').toLowerCase().includes(q) ||
      (k.metadata?.profile?.profession || '').toLowerCase().includes(q)
    );
  }, [kategoriler.kisiler, arama]);

  const filtrelenmisMekanlar = useMemo(() => {
    if (!arama.trim()) return kategoriler.mekanlar;
    const q = arama.toLowerCase();
    return kategoriler.mekanlar.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q) ||
      (m.metadata?.region || '').toLowerCase().includes(q)
    );
  }, [kategoriler.mekanlar, arama]);

  // Dinamik Markdown Çıktısı Üretme (items güncel verisine göre)
  const markdownIcerik = useMemo(() => {
    const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    return `# DÜZADA EVRENİ RESMİ RAPORU
**Kems Company Arşivi · Rapor No: DZD-2026-M1**  
**Tarih:** ${bugun}  
**Menşe:** Düzada, TR · Made with Culture  

---

## 1. YÖNETİCİ ÖZETİ VE MEVCUT DURUM
- **Toplam Kayıtlı Varlık Sayısı:** ${duzadaItems.length}
- **Kişi & Sakin Sayısı:** ${kategoriler.kisiler.length}
- **Mekân & Dükkân Sayısı:** ${kategoriler.mekanlar.length}
- **Kurum & Kulüp Sayısı:** ${kategoriler.kurumlar.length}
- **Tarihi Aileler:** ${kategoriler.aileler.length}
- **Resmi Mahalleler:** 5 (Merkez, Liman, İskele, Stadyum, Çiftlik)
- **Taslak (Stub) Maddeler:** ${kategoriler.taslakSayisi}
- **Sitede Yayında Olan Maddeler:** ${kategoriler.sitedeOlanlar}

---

## 2. COĞRAFYA VE SABİT ÖLÇÜLER (GEOGRAPHY)
Düzada kurgusaldır ancak gerçek Ege Denizi koordinatları ve fiziksel denizcilik dinamikleriyle haritalandırılmıştır:
- **Koordinatlar:** ${DUZADA_MERKEZ[1]}° K · ${DUZADA_MERKEZ[0]}° D (Bozcaada güneybatısı, Babakale batısı, Ayvacık beldesi).
- **Yüzölçümü:** ${DUZADA_ALAN_KM2} km² (Sabit değerdir; yuvarlanmaz).
- **Genişlik & Uzunluk:** Doğu–Batı: 18,7 km | Kuzey–Güney: 12,7 km.
- **Kıyı Şeridi:** 52,7 km.
- **En Yüksek Nokta:** Ada Tepesi (742 m). Antik duvarlar ve Yangın Gözetleme Kulesi burada yer alır.
- **İkincil Tepeler:** Kuzey Sırtı (386 m), Çetmi Sırtı (254 m), Fener Burnu (118 m).
- **Ulaşım Hattı:** Küçükkuyu (65 km doğuda) tarifeli kamu arabalı feribotu. Feribota kural olarak sadece adalıların araçları alınır.

### Mahalle Dağılımı:
${mahalleDetaylari.map(m => `
### ${m.ad} (${m.eskiAd})
- **Kentsel Nitelik:** ${m.karakter}
- **Simgeler:** ${m.simgeler.join(', ')}
- **Sistemde Kayıtlı İlişkili Varlıklar:** ${m.bagliMaddeler.length} kayıt
`).join('')}

---

## 3. VARLIKLAR VE TOPLUMSAL YAPI (ENTITIES)

### 3.1. Mekânlar, Dükkânlar ve Kurumlar (${kategoriler.mekanlar.length + kategoriler.kurumlar.length} Kayıt)
${kategoriler.kurumlar.map(k => `- **[${TYPE_LABELS[k.type] || k.type}] ${k.title}:** ${k.notes || 'Açıklama girilmedi.'} (Mahalle: ${k.metadata?.region || 'Belirtilmedi'})`).join('\n')}
${kategoriler.mekanlar.map(m => `- **[${TYPE_LABELS[m.type] || m.type}] ${m.title}:** ${m.notes || 'Açıklama girilmedi.'} (Mahalle: ${m.metadata?.region || 'Belirtilmedi'})`).join('\n')}

### 3.2. Ada Sakinleri ve Karakterler (${kategoriler.kisiler.length} Kayıt)
${kategoriler.kisiler.slice(0, 40).map(k => `- **${k.title}:** ${k.metadata?.profile?.profession || 'Ada Sakini'} · Mahalle: ${k.metadata?.region || 'Belirtilmedi'} · Durum: ${k.status || 'Kayıtlı'}`).join('\n')}
${kategoriler.kisiler.length > 40 ? `\n*(Ve sistemde kayıtlı ${kategoriler.kisiler.length - 40} diğer kişi...)*` : ''}

---

## 4. KANONİK TARİHÇE VE KRONOLOJİ (LORE)
Düzada'nın değişmez tarihsel mihenk taşları:

1. **Antik Dönem:** Ada Tepesi akropol kalıntıları ve Liman açığındaki Amfora Batık Alanı.
2. **18. Yüzyıl:** İskele'deki Taş Kilise (Rum şapeli) inşası.
3. **19. Yüzyıl:** Deniz Feneri'nin inşası (gaz lambalı bekçi dönemi).
4. **1923 (Lozan Mübadelesi):** Köy ve İskele Rumlarının ayrılışı; Selanik ve Girit göçmenlerinin gelişi. Boşalan kilise belediye korumasına geçer.
5. **1954:** The Imperial Kemsköy'ün açılışı (Haydarpaşa Garı minyatürü üslubunda devlet misafirhanesi olarak başlayıp otele evrilmesi). Ada turizmi başlar.
6. **12 Mayıs 1957:** Dirlik Spor Kulübü'nün köy döneminde toprak sahada amatör gençlerle kuruluşu.
7. **1970'ler:** Deniz Feneri'nin otomatiğe geçmesi, bekçi evinin Sahil Güvenliğe devri; köy elektrik şebekesi.
8. **1980'ler:** Düzada Köyü'nün Merkez Mahallesi olması ve Düzada Belediyesi'nin kuruluşu; Yeni Liman inşası; Dirlik Stadı'nın yapımı (~1.000 kişilik); Sade Meze'nin eski yağ fabrikasından meyhaneye dönüşmesi.
9. **1990'lar:** Sürek avının terk edilmesi; Küçükçetmi Sürek Kulübü'nün kültür ve doğa kulübüne dönüşü.
10. **2000 Sonrası:** Dondurmacı Kızlar'ın açılışı, bağcılık ve butik şaraphaneler.
11. **2024 / 2025:** Kems Company kuruluşu ve Kemsköy Caddesi mağazasının açılması.

---

## 5. KANON KURALLARI VE YAZIM STANDARTLARI
- **Yazım Kuralı:** Kesinlikle Norveççe "ø" kullanılmaz. Tek doğru biçim **Kemsköy**'dür.
- **Departmanlar:** Otel departmanları (Resepsiyon, Kat Hizmetleri vb.) marka değil, kurum içi birimdir.
- **Tarih Sınırları:** 1980 öncesi metinlerde "Liman Mahallesi", "Dirlik Stadı", "Belediye", "Sağlık Ocağı" geçemez. 1954 öncesinde The Imperial Kemsköy var olamaz. 1979 sonrası "Fener bekçisi" bulunamaz.
- **"Ada Sakini" Kuralı:** Otelden ayrılan veya senaryodan çıkan karakterler silinmez; \`ada-sakini\` etiketiyle evrende yaşamaya devam eder.

---
*Rapor Sonu · Kems Komuta Merkezi Otomatik Derlemesi*
`;
  }, [duzadaItems, kategoriler, mahalleDetaylari]);

  // Markdown Kopyalama
  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(markdownIcerik);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Hata durumunda sessiz kal
    }
  };

  // Markdown Dosyası Olarak İndirme
  const indirMarkdown = () => {
    const blob = new Blob([markdownIcerik], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duzada-evren-raporu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const indirPdf = () => {
    setPdfHazirlaniyor(true);
    try {
      generateDuzadaPdf(items);
    } catch (e) {
      console.error('PDF üretilirken hata oluştu:', e);
    } finally {
      setPdfHazirlaniyor(false);
    }
  };

  // Yazdırma (Print)
  const yazdir = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Üst Eylem ve Kontrol Çubuğu (Yazdırmada gizlenir) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#0E1C4F] dark:text-[#F3EFE8] leading-tight">
              Düzada Evren Raporu
            </h2>
            <p className="text-[11px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9]">
              {duzadaItems.length} kayıtlı varlık · Kanon dökümü · PDF & Baskı
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Görünüm Geçişi */}
          <div className="flex items-center rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] p-0.5 bg-white/70 dark:bg-[#0B132B]">
            <button
              type="button"
              onClick={() => setGorunum('belge')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                gorunum === 'belge'
                  ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white'
                  : 'text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#0E1C4F]'
              }`}
            >
              Belge Görünümü
            </button>
            <button
              type="button"
              onClick={() => setGorunum('markdown')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                gorunum === 'markdown'
                  ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white'
                  : 'text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#0E1C4F]'
              }`}
            >
              Ham Markdown
            </button>
          </div>

          {/* Dışa Aktarma Butonları */}
          <button
            type="button"
            onClick={kopyala}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] hover:bg-stone-100 cursor-pointer transition-colors"
            title="Markdown Metnini Kopyala"
          >
            {kopyalandi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {kopyalandi ? 'Kopyalandı' : 'Markdown Kopyala'}
          </button>

          <button
            type="button"
            onClick={indirMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] hover:bg-stone-100 cursor-pointer transition-colors"
            title="Markdown Olarak İndir"
          >
            <Download className="w-3.5 h-3.5" />
            İndir (.md)
          </button>

          <button
            type="button"
            onClick={indirPdf}
            disabled={pdfHazirlaniyor}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] hover:opacity-90 text-[#F3EFE8] text-[12px] font-semibold cursor-pointer transition-opacity shadow-xs"
            title="Düzada Raporunu Doğrudan PDF Olarak İndir"
          >
            <Download className="w-3.5 h-3.5 text-[#F26B6F]" />
            {pdfHazirlaniyor ? 'PDF Hazırlanıyor…' : 'PDF İndir'}
          </button>

          <button
            type="button"
            onClick={yazdir}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F26B6F] hover:bg-[#E05357] text-white text-[12px] font-semibold shadow-xs cursor-pointer transition-colors"
            title="Yazdır veya Tarayıcıdan PDF Kaydet"
          >
            <Printer className="w-3.5 h-3.5" />
            Yazdır
          </button>
        </div>
      </div>

      {/* HAM MARKDOWN GÖRÜNÜMÜ */}
      {gorunum === 'markdown' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#081029] border border-[#CFC5B4] dark:border-[#2C3C72] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#CFC5B4]/50 dark:border-[#2C3C72] mb-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9]">
              Markdown Kaynak Metni (Düzada Resmi Dökümanı)
            </span>
            <button
              type="button"
              onClick={kopyala}
              className="text-[12px] font-mono text-[#F26B6F] hover:underline cursor-pointer flex items-center gap-1"
            >
              {kopyalandi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {kopyalandi ? 'Kopyalandı!' : 'Tümünü Kopyala'}
            </button>
          </div>
          <textarea
            readOnly
            value={markdownIcerik}
            rows={28}
            className="w-full font-mono text-[12px] leading-relaxed p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#0E1C4F] dark:text-[#F3EFE8] resize-y focus:outline-hidden"
          />
        </div>
      )}

      {/* BELGE GÖRÜNÜMÜ (Printable Formal Report) */}
      {gorunum === 'belge' && (
        <div
          ref={raporRef}
          className="bg-white dark:bg-[#FAF8F5] text-[#0E1C4F] rounded-2xl border border-[#CFC5B4] dark:border-stone-400 p-8 sm:p-12 shadow-sm font-sans max-w-5xl mx-auto print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none"
        >
          {/* Antet / Başlık Bandı */}
          <header className="pb-8 border-b-2 border-[#0E1C4F] flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-sm bg-[#0E1C4F] text-white text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
                  KEMS COMPANY ARCHIVES
                </span>
                <span className="text-[11px] font-mono text-[#6A5E4C] tracking-wider uppercase">
                  DÜZADA BELGESİ
                </span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0E1C4F]">
                Düzada Evren Raporu
              </h1>
              <p className="mt-1 text-[13px] font-medium text-[#6A5E4C]">
                Kanonik Coğrafya, Kentsel Doku, Ada Sakinleri ve Tarihsel Kronoloji Dökümü
              </p>
            </div>

            <div className="text-right font-mono text-[11px] text-[#6A5E4C] leading-snug">
              <div><b>Konum:</b> 39,60° K · 25,85° D</div>
              <div><b>İdari:</b> Ayvacık Beldesi</div>
              <div><b>Yüzölçümü:</b> 162,2 km²</div>
              <div><b>Menşe:</b> Düzada, TR · Made with Culture</div>
            </div>
          </header>

          {/* İstatistik Gösterge Çizelgesi */}
          <section className="my-8 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#6A5E4C]">Toplam Varlık</div>
              <div className="text-2xl font-black text-[#0E1C4F] tabular-nums mt-0.5">{duzadaItems.length}</div>
              <div className="text-[10px] text-[#6A5E4C]">Sistemdeki tüm kayıtlar</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#6A5E4C]">Kişi / Sakin</div>
              <div className="text-2xl font-black text-[#0E1C4F] tabular-nums mt-0.5">{kategoriler.kisiler.length}</div>
              <div className="text-[10px] text-[#6A5E4C]">Ada halkı ve misafirler</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#6A5E4C]">Mekân & Kurum</div>
              <div className="text-2xl font-black text-[#0E1C4F] tabular-nums mt-0.5">{kategoriler.mekanlar.length + kategoriler.kurumlar.length}</div>
              <div className="text-[10px] text-[#6A5E4C]">İşletme, kulüp ve yapılar</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#6A5E4C]">Kanon Mahalle</div>
              <div className="text-2xl font-black text-[#F26B6F] tabular-nums mt-0.5">5</div>
              <div className="text-[10px] text-[#6A5E4C]">Merkez, Liman, İskele, vb.</div>
            </div>
          </section>

          {/* BÖLÜM 1: COĞRAFYA VE KANONİK ÖLÇÜLER */}
          <section className="py-6 border-b border-[#E5DFD5] space-y-4">
            <div className="flex items-center gap-2 text-[#0E1C4F]">
              <Compass className="w-5 h-5 text-[#F26B6F]" />
              <h2 className="text-xl font-bold tracking-tight uppercase">1. Coğrafi ve Fiziksel Kanon</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-[#3B3A36]">
              Düzada, Ege Denizi açıklarında yer alan, antik dönemden günümüze kesintisiz yerleşim görmüş kurgusal bir adadır. 
              Ada kurgusal olmasına karşın gerçek koordinatlar (<b>39,60° K · 25,85° D</b>) ve denizcilik dinamikleri üzerine oturtulmuştur.
              Bozcaada'nın güneybatısında, Babakale'nin batısında yer alır; Küçükkuyu anakara iskelesi yaklaşık 65 km doğudadır.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#0E1C4F] bg-[#FAF8F5]">
                    <th className="py-2 px-3 font-mono font-bold text-[#0E1C4F]">Ölçü / Nitelik</th>
                    <th className="py-2 px-3 font-mono font-bold text-[#0E1C4F]">Kanonik Değer</th>
                    <th className="py-2 px-3 font-mono font-bold text-[#0E1C4F]">Detay ve Notlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD5]">
                  <tr>
                    <td className="py-2 px-3 font-semibold">Yüzölçümü</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#F26B6F]">162,2 km²</td>
                    <td className="py-2 px-3 text-[#6A5E4C]">Sabit kanon ölçüsü (değiştirilmez, yuvarlanmaz).</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Doğu–Batı Genişlik</td>
                    <td className="py-2 px-3 font-mono">18,7 km</td>
                    <td className="py-2 px-3 text-[#6A5E4C]">En geniş enlemesine hat.</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Kuzey–Güney Uzunluk</td>
                    <td className="py-2 px-3 font-mono">12,7 km</td>
                    <td className="py-2 px-3 text-[#6A5E4C]">Ada gövde boyu.</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Kıyı Şeridi</td>
                    <td className="py-2 px-3 font-mono">52,7 km</td>
                    <td className="py-2 px-3 text-[#6A5E4C]">Burunlar, koylar ve kumsallar dahil.</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Ada Tepesi (Zirve)</td>
                    <td className="py-2 px-3 font-mono font-bold">742 m</td>
                    <td className="py-2 px-3 text-[#6A5E4C]">Adanın en yüksek noktası. Antik sur kalıntıları ve Yangın Kulesi.</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Nüfus Döngüsü</td>
                    <td className="py-2 px-3 font-mono">3.000 – 15.000</td>
                    <td className="py-2 px-3 text-[#6A5E4C]">Kışın ~3.500 yerleşik; yazın turizmle 3–4 katına ulaşır.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* BÖLÜM 2: BEŞ KANONİK MAHALLE */}
          <section className="py-6 border-b border-[#E5DFD5] space-y-4">
            <div className="flex items-center gap-2 text-[#0E1C4F]">
              <MapPin className="w-5 h-5 text-[#F26B6F]" />
              <h2 className="text-xl font-bold tracking-tight uppercase">2. Beş Kanonik Mahalle ve Kentsel Yapı</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-[#3B3A36]">
              Kemal'in tescil ettiği 5 resmi mahalle. Her mahallenin kendine has ekonomik, mimari ve kültürel dokusu vardır:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mahalleDetaylari.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-bold text-[15px] text-[#0E1C4F]">{m.ad}</h3>
                    <span className="text-[10px] font-mono text-[#6A5E4C]">{m.bagliMaddeler.length} varlık</span>
                  </div>
                  <p className="text-[12px] text-[#555] leading-snug">{m.karakter}</p>
                  <div className="pt-2 border-t border-[#E5DFD5]">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#6A5E4C] block mb-1">Önemli Simgeler:</span>
                    <ul className="text-[11px] text-[#333] space-y-0.5 list-disc list-inside">
                      {m.simgeler.map((simge, idx) => (
                        <li key={idx}>{simge}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* BÖLÜM 3: VARLIKLAR (ENTITIES) */}
          <section className="py-6 border-b border-[#E5DFD5] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0E1C4F]">
                <Building className="w-5 h-5 text-[#F26B6F]" />
                <h2 className="text-xl font-bold tracking-tight uppercase">3. Varlıklar ve Mekân Dağılımı</h2>
              </div>
              <div className="print:hidden">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6A5E4C]" />
                  <input
                    type="text"
                    value={arama}
                    onChange={e => setArama(e.target.value)}
                    placeholder="Varlık veya kişi ara..."
                    className="pl-8 pr-3 py-1 text-[11px] rounded-lg border border-[#CFC5B4] bg-white text-[#0E1C4F] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Kurumlar ve Mekânlar Listesi */}
            <div className="space-y-3">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#6A5E4C]">
                Kilit Kurumlar, Mekânlar ve Tesisler
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...kategoriler.kurumlar, ...filtrelenmisMekanlar].slice(0, 15).map(item => (
                  <div
                    key={item.id}
                    onClick={() => onMaddeSec?.(item.id)}
                    className="p-3 rounded-lg border border-[#E5DFD5] hover:border-[#0E1C4F] transition-colors cursor-pointer bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#F26B6F] font-bold">
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                      <span className="text-[10px] font-mono text-[#6A5E4C]">
                        {BOLGE_ADLARI[item.metadata?.region] || item.metadata?.region || 'Ada'}
                      </span>
                    </div>
                    <div className="font-bold text-[13px] text-[#0E1C4F] mt-1.5">{item.title}</div>
                    <p className="text-[11px] text-[#666] line-clamp-2 mt-1 leading-snug">
                      {item.notes || 'Açıklama mevcut değil.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sakinler ve Kişiler Listesi */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#6A5E4C]">
                  Ada Sakinleri ({filtrelenmisKisiler.length} Kişi)
                </h3>
                <span className="text-[10px] text-[#6A5E4C] font-mono">
                  * "Ada Sakini" koruma modeliyle saklanır
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filtrelenmisKisiler.slice(0, 24).map(kisi => (
                  <div
                    key={kisi.id}
                    onClick={() => onMaddeSec?.(kisi.id)}
                    className="p-2.5 rounded-lg border border-[#E5DFD5] hover:border-[#0E1C4F] cursor-pointer bg-[#FAF8F5]"
                  >
                    <div className="font-semibold text-[12px] text-[#0E1C4F] truncate">{kisi.title}</div>
                    <div className="text-[10px] font-mono text-[#6A5E4C] truncate">
                      {kisi.metadata?.profile?.profession || 'Ada Sakini'}
                    </div>
                    <div className="text-[9px] text-[#888] truncate mt-0.5">
                      {BOLGE_ADLARI[kisi.metadata?.region] || kisi.metadata?.region || 'Düzada'}
                    </div>
                  </div>
                ))}
              </div>
              {filtrelenmisKisiler.length > 24 && (
                <p className="text-[11px] font-mono text-center text-[#6A5E4C] pt-2">
                  + {filtrelenmisKisiler.length - 24} diğer ada sakini sistem arşivinde kayıtlıdır.
                </p>
              )}
            </div>
          </section>

          {/* BÖLÜM 4: LORE VE KRONOLOJİ */}
          <section className="py-6 border-b border-[#E5DFD5] space-y-4">
            <div className="flex items-center gap-2 text-[#0E1C4F]">
              <Calendar className="w-5 h-5 text-[#F26B6F]" />
              <h2 className="text-xl font-bold tracking-tight uppercase">4. Tarihsel Kronoloji ve Kanon Silsilesi</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-[#3B3A36]">
              Düzada evreninde tarih çizgisi kesin ve değiştirilemez kurallara bağlanmıştır:
            </p>

            <div className="relative border-l-2 border-[#0E1C4F] ml-3 pl-4 space-y-4 font-sans text-[12px]">
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">Antik Çağ</span>
                <p className="text-[#333]">Ada Tepesi sur duvarları ve Liman açığındaki Amfora batık alanı.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">18. Yüzyıl</span>
                <p className="text-[#333]">İskele'deki Taş Kilise (Rum şapeli) ve yanındaki mezarlık.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">1923 (Lozan Mübadelesi)</span>
                <p className="text-[#333]">Köydeki ve İskele'deki Rumların ayrılışı; Selanik ve Girit göçmenlerinin gelişi. Kilise boşalır.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">1954</span>
                <p className="text-[#333]"><b>The Imperial Kemsköy</b> açılır (Haydarpaşa Garı minyatürü devlet misafirhanesinden otele). Yaz turizmi başlar.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">12 Mayıs 1957</span>
                <p className="text-[#333]"><b>Dirlik Spor Kulübü</b> kurulur (toprak sahada amatör gençlerle).</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">1970'ler</span>
                <p className="text-[#333]">Deniz Feneri otomatiğe geçer; bekçi evi Sahil Güvenliğe verilir. Köye elektrik bağlanır.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">1980'ler</span>
                <p className="text-[#333]">Düzada Belediyesi kurulur (Düzada Köyü → Merkez Mahallesi). Yeni Liman ve Dirlik Stadı inşa edilir. Sade Meze açılır.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">2000 Sonrası</span>
                <p className="text-[#333]">Dondurmacı Kızlar açılır. Çiftlik'te bağcılık ve butik şaraphaneler başlar.</p>
              </div>
              <div>
                <span className="font-mono font-bold text-[#F26B6F]">2024 / 2025</span>
                <p className="text-[#333]"><b>Kems Company</b> kurulur; Kemsköy Caddesi'ndeki fiziksel dükkân açılır.</p>
              </div>
            </div>
          </section>

          {/* BÖLÜM 5: KANON YAZIM VE TUTARLILIK KURALLARI */}
          <section className="py-6 space-y-4">
            <div className="flex items-center gap-2 text-[#0E1C4F]">
              <Shield className="w-5 h-5 text-[#F26B6F]" />
              <h2 className="text-xl font-bold tracking-tight uppercase">5. Kanon Denetim Kuralları</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5]">
                <b className="text-[#0E1C4F] block">Norveççe "ø" Yasağı:</b>
                <span className="text-[#555]">Evrende kesinlikle "Kemskøy" yazılmaz. Tek ve doğru yazım <b>Kemsköy</b>'dür.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5]">
                <b className="text-[#0E1C4F] block">Otel Departmanları:</b>
                <span className="text-[#555]">Resepsiyon, Kat Hizmetleri vb. marka değil departmandır; uydurma ad konmaz.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5]">
                <b className="text-[#0E1C4F] block">1980 Çakışma Kuralı:</b>
                <span className="text-[#555]">1980 öncesinde "Liman Mahallesi", "Dirlik Stadı", "Belediye", "Sade Meze" ifadeleri kullanılamaz.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5]">
                <b className="text-[#0E1C4F] block">Ada Sakini Koruma İlkesi:</b>
                <span className="text-[#555]">Kişiler silinmez; otelden ayrılanlar <code>ada-sakini</code> statüsüne geçirilir.</span>
              </div>
            </div>
          </section>

          {/* Altbilgi / Rapor Sonu */}
          <footer className="pt-8 border-t-2 border-[#0E1C4F] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#6A5E4C]">
            <div>Kems Komuta Merkezi Master Veritabanı</div>
            <div>Baskı Tarihi: {new Date().toLocaleDateString('tr-TR')} · Düzada, TR</div>
          </footer>
        </div>
      )}
    </div>
  );
};
