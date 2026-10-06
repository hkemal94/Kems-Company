import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Printer, Copy, Check, Download, FileText, MapPin, Compass,
  Building, Calendar, Search, Shield, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import type { Item } from '../../types';
import { WIKI_TYPES, TYPE_LABELS, isStub, BOLGE_ADLARI } from '../wiki/wikiSchema';
import { generateDuzadaPdf } from '../../lib/duzadaPdf';

// Sabit kanon ölçüleri (4.4 MB'lık duzadaGeo yüklenmesin diye doğrudan tanımlandı)
const DUZADA_MERKEZ: [number, number] = [25.85, 39.6];
const DUZADA_ALAN_KM2 = 162.2;

type BolumSekmesi = 'hepsi' | 'ozet' | 'mahalleler' | 'varliklar' | 'kronoloji';

interface DuzadaRaporuProps {
  items: Item[];
  onMaddeSec?: (id: string) => void;
  onHaritayaGit?: () => void;
}

export const DuzadaRaporu: React.FC<DuzadaRaporuProps> = ({
  items,
  onMaddeSec,
}) => {
  const [gorunum, setGorunum] = useState<'belge' | 'markdown'>('belge');
  const [aktifBolum, setAktifBolum] = useState<BolumSekmesi>('hepsi');
  const [arama, setArama] = useState('');
  const [kopyalandi, setKopyalandi] = useState(false);
  const [tumKisileriGoster, setTumKisileriGoster] = useState(false);
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);
  const raporRef = useRef<HTMLDivElement>(null);

  // 1. Düzada ve Viki içeriklerini filtrele (memoized)
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
      taslakSayisi,
      sitedeOlanlar
    };
  }, [duzadaItems]);

  // 5 Kanonik Mahalle
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

  // Markdown çıktısı yalnız istendiğinde hesaplanır (lazy)
  const uretMarkdown = useCallback(() => {
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
- **Koordinatlar:** ${DUZADA_MERKEZ[1]}° K · ${DUZADA_MERKEZ[0]}° D (Bozcaada güneybatısı, Babakale batısı, Ayvacık beldesi).
- **Yüzölçümü:** ${DUZADA_ALAN_KM2} km² (Sabit kanon değeridir).
- **Genişlik & Uzunluk:** Doğu–Batı: 18,7 km | Kuzey–Güney: 12,7 km.
- **Kıyı Şeridi:** 52,7 km.
- **En Yüksek Nokta:** Ada Tepesi (742 m). Antik duvarlar ve Yangın Gözetleme Kulesi burada yer alır.
- **Ulaşım Hattı:** Küçükkuyu (65 km doğuda) tarifeli kamu arabalı feribotu.

${mahalleDetaylari.map(m => `
### ${m.ad} (${m.eskiAd})
- **Kentsel Nitelik:** ${m.karakter}
- **Simgeler:** ${m.simgeler.join(', ')}
- **İlişkili Varlıklar:** ${m.bagliMaddeler.length} kayıt
`).join('')}

---

## 3. VARLIKLAR VE TOPLUMSAL YAPI (ENTITIES)

### Kilit Kurumlar ve Mekânlar
${kategoriler.kurumlar.map(k => `- **[${TYPE_LABELS[k.type] || k.type}] ${k.title}:** ${k.notes || 'Açıklama girilmedi.'} (${k.metadata?.region || 'Ada'})`).join('\n')}
${kategoriler.mekanlar.map(m => `- **[${TYPE_LABELS[m.type] || m.type}] ${m.title}:** ${m.notes || 'Açıklama girilmedi.'} (${m.metadata?.region || 'Ada'})`).join('\n')}

### Ada Sakinleri (${kategoriler.kisiler.length} Kişi)
${kategoriler.kisiler.slice(0, 30).map(k => `- **${k.title}:** ${k.metadata?.profile?.profession || 'Ada Sakini'} (${k.metadata?.region || 'Düzada'})`).join('\n')}
${kategoriler.kisiler.length > 30 ? `\n*(Ve sistemde kayıtlı ${kategoriler.kisiler.length - 30} diğer sakin...)*` : ''}

---

## 4. KANONİK TARİHÇE VE KRONOLOJİ (LORE)
1. **Antik Dönem:** Ada Tepesi surları ve Liman amfora batık alanı.
2. **18. Yüzyıl:** İskele Taş Kilise (Rum şapeli) inşası.
3. **19. Yüzyıl:** Deniz Feneri gaz lambalı kule inşası.
4. **1923 (Lozan Mübadelesi):** Rumların ayrılışı; Selanik ve Girit göçmenlerinin gelişi.
5. **1954:** The Imperial Kemsköy açılır (Devlet misafirhanesinden otele).
6. **12 Mayıs 1957:** Dirlik Spor Kulübü kurulur.
7. **1970'ler:** Deniz Feneri otomatiğe geçer; köye elektrik bağlanır.
8. **1980'ler:** Düzada Belediyesi kurulur (Köy → Merkez). Yeni Liman ve Dirlik Stadı inşa edilir. Sade Meze açılır.
9. **1990'lar:** Sürek avı terk edilir; Küçükçetmi doğa ve koruma kulübüne evrilir.
10. **2000 Sonrası:** Dondurmacı Kızlar açılır. Bağcılık ve butik şaraphaneler başlar.
11. **2024 / 2025:** Kems Company kuruluşu ve Kemsköy Caddesi mağazası.

---
*Rapor Sonu · Kems Komuta Merkezi*
`;
  }, [duzadaItems, kategoriler, mahalleDetaylari]);

  // Markdown Kopyalama
  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(uretMarkdown());
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Hata durumunda sessiz kal
    }
  };

  // Markdown Dosyası Olarak İndirme
  const indirMarkdown = () => {
    const md = uretMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duzada-evren-raporu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dinamik PDF Üretme (jspdf yalnızca tıklandığında yüklenir)
  const indirPdf = async () => {
    setPdfHazirlaniyor(true);
    try {
      await generateDuzadaPdf(items);
    } catch (e) {
      console.error('PDF üretilirken hata oluştu:', e);
    } finally {
      setPdfHazirlaniyor(false);
    }
  };

  const yazdir = () => {
    window.print();
  };

  const bolumGorunur = (id: BolumSekmesi) => aktifBolum === 'hepsi' || aktifBolum === id;

  return (
    <div className="space-y-4">
      {/* Üst Eylem ve Kontrol Çubuğu (Yazdırmada gizlenir) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-[#0E1C4F] dark:text-[#F3EFE8] leading-tight">
              Düzada Evren Raporu
            </h2>
            <p className="text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9]">
              {duzadaItems.length} kayıtlı varlık · Optimize görünüm
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Görünüm Geçişi */}
          <div className="flex items-center rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] p-0.5 bg-white/70 dark:bg-[#0B132B]">
            <button
              type="button"
              onClick={() => setGorunum('belge')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                gorunum === 'belge'
                  ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white'
                  : 'text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#0E1C4F]'
              }`}
            >
              Belge
            </button>
            <button
              type="button"
              onClick={() => setGorunum('markdown')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                gorunum === 'markdown'
                  ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white'
                  : 'text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#0E1C4F]'
              }`}
            >
              Ham Markdown
            </button>
          </div>

          <button
            type="button"
            onClick={kopyala}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] hover:bg-stone-100 cursor-pointer transition-colors"
            title="Markdown Metnini Kopyala"
          >
            {kopyalandi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
          </button>

          <button
            type="button"
            onClick={indirMarkdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#17345A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[11px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] hover:bg-stone-100 cursor-pointer transition-colors"
            title="Markdown Olarak İndir"
          >
            <Download className="w-3.5 h-3.5" />
            .md
          </button>

          <button
            type="button"
            onClick={indirPdf}
            disabled={pdfHazirlaniyor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] hover:opacity-90 text-[#F3EFE8] text-[11px] font-semibold cursor-pointer transition-opacity shadow-xs"
            title="Düzada Raporunu Doğrudan PDF Olarak İndir"
          >
            <Download className="w-3.5 h-3.5 text-[#F26B6F]" />
            {pdfHazirlaniyor ? 'Hazırlanıyor…' : 'PDF İndir'}
          </button>

          <button
            type="button"
            onClick={yazdir}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F26B6F] hover:bg-[#E05357] text-white text-[11px] font-semibold shadow-xs cursor-pointer transition-colors"
            title="Yazdır"
          >
            <Printer className="w-3.5 h-3.5" />
            Yazdır
          </button>
        </div>
      </div>

      {/* Bölüm Seçim Şeridi (Sayfayı hafif tutmak için hızlı filtre) */}
      {gorunum === 'belge' && (
        <div className="print:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
          <span className="text-[#6A5E4C] dark:text-[#A6B0C9] mr-1 uppercase tracking-wider text-[10px]">Bölüm:</span>
          {([
            ['hepsi', 'Tüm Belge'],
            ['ozet', 'Ölçüler'],
            ['mahalleler', 'Mahalleler (5)'],
            ['varliklar', 'Varlıklar & Sakinler'],
            ['kronoloji', 'Tarihçe & Kurallar']
          ] as const).map(([id, ad]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAktifBolum(id)}
              className={`px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                aktifBolum === id
                  ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white font-bold'
                  : 'bg-white/80 dark:bg-[#13204A]/60 text-[#6A5E4C] dark:text-[#A6B0C9] border border-[#CFC5B4]/50 hover:bg-stone-100'
              }`}
            >
              {ad}
            </button>
          ))}
        </div>
      )}

      {/* HAM MARKDOWN GÖRÜNÜMÜ */}
      {gorunum === 'markdown' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#081029] border border-[#CFC5B4] dark:border-[#2C3C72] shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#CFC5B4]/50 dark:border-[#2C3C72] mb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9]">
              Markdown Kaynak Metni
            </span>
            <button
              type="button"
              onClick={kopyala}
              className="text-[11px] font-mono text-[#F26B6F] hover:underline cursor-pointer flex items-center gap-1"
            >
              {kopyalandi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <textarea
            readOnly
            value={uretMarkdown()}
            rows={22}
            className="w-full font-mono text-[11px] leading-relaxed p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] text-[#0E1C4F] dark:text-[#F3EFE8] resize-y focus:outline-hidden"
          />
        </div>
      )}

      {/* BELGE GÖRÜNÜMÜ */}
      {gorunum === 'belge' && (
        <div
          ref={raporRef}
          className="bg-white dark:bg-[#FAF8F5] text-[#0E1C4F] rounded-2xl border border-[#CFC5B4] dark:border-stone-400 p-6 sm:p-10 shadow-sm font-sans max-w-5xl mx-auto print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none"
        >
          {/* Antet */}
          <header className="pb-6 border-b-2 border-[#0E1C4F] flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-xs bg-[#0E1C4F] text-white text-[9px] font-mono font-bold tracking-[0.2em] uppercase">
                  KEMS ARCHIVES
                </span>
                <span className="text-[10px] font-mono text-[#6A5E4C] tracking-wider uppercase">
                  DÜZADA BELGESİ
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0E1C4F]">
                Düzada Evren Raporu
              </h1>
              <p className="mt-0.5 text-[12px] font-medium text-[#6A5E4C]">
                Kanonik Coğrafya, Kentsel Doku, Ada Sakinleri ve Tarihsel Kronoloji
              </p>
            </div>

            <div className="text-right font-mono text-[10px] text-[#6A5E4C] leading-snug">
              <div><b>Konum:</b> 39,60° K · 25,85° D</div>
              <div><b>İdari:</b> Ayvacık Beldesi</div>
              <div><b>Yüzölçümü:</b> 162,2 km²</div>
              <div><b>Menşe:</b> Düzada, TR</div>
            </div>
          </header>

          {/* İstatistik Çizelgesi */}
          {bolumGorunur('ozet') && (
            <section className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5]">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6A5E4C]">Toplam Varlık</div>
                <div className="text-xl font-black text-[#0E1C4F] tabular-nums mt-0.5">{duzadaItems.length}</div>
                <div className="text-[9px] text-[#6A5E4C]">Kayıtlı öge</div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6A5E4C]">Kişi / Sakin</div>
                <div className="text-xl font-black text-[#0E1C4F] tabular-nums mt-0.5">{kategoriler.kisiler.length}</div>
                <div className="text-[9px] text-[#6A5E4C]">Ada nüfusu</div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6A5E4C]">Mekân & Kurum</div>
                <div className="text-xl font-black text-[#0E1C4F] tabular-nums mt-0.5">{kategoriler.mekanlar.length + kategoriler.kurumlar.length}</div>
                <div className="text-[9px] text-[#6A5E4C]">İşletme ve tesis</div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6A5E4C]">Kanon Mahalle</div>
                <div className="text-xl font-black text-[#F26B6F] tabular-nums mt-0.5">5</div>
                <div className="text-[9px] text-[#6A5E4C]">Resmi bölge</div>
              </div>
            </section>
          )}

          {/* BÖLÜM 1: COĞRAFYA */}
          {bolumGorunur('ozet') && (
            <section className="py-5 border-b border-[#E5DFD5] space-y-3">
              <div className="flex items-center gap-2 text-[#0E1C4F]">
                <Compass className="w-4 h-4 text-[#F26B6F]" />
                <h2 className="text-base font-bold tracking-tight uppercase">1. Coğrafi ve Fiziksel Kanon</h2>
              </div>
              <p className="text-[12px] leading-relaxed text-[#3B3A36]">
                Ege Denizi açıklarında (<b>39,60° K · 25,85° D</b>) yer alan ada, Bozcaada'nın güneybatısında, Babakale'nin batısındadır. 
                Ayvacık'a bağlı bir beldedir; Küçükkuyu feribot iskelesi yaklaşık 65 km doğudadır.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-[#0E1C4F] bg-[#FAF8F5]">
                      <th className="py-1.5 px-2.5 font-mono font-bold text-[#0E1C4F]">Ölçü</th>
                      <th className="py-1.5 px-2.5 font-mono font-bold text-[#0E1C4F]">Değer</th>
                      <th className="py-1.5 px-2.5 font-mono font-bold text-[#0E1C4F]">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DFD5]">
                    <tr>
                      <td className="py-1.5 px-2.5 font-semibold">Yüzölçümü</td>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-[#F26B6F]">162,2 km²</td>
                      <td className="py-1.5 px-2.5 text-[#6A5E4C]">Sabit kanon ölçüsü.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-semibold">Genişlik & Uzunluk</td>
                      <td className="py-1.5 px-2.5 font-mono">18,7 km x 12,7 km</td>
                      <td className="py-1.5 px-2.5 text-[#6A5E4C]">Doğu–Batı ve Kuzey–Güney eksenleri.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-semibold">Kıyı Şeridi</td>
                      <td className="py-1.5 px-2.5 font-mono">52,7 km</td>
                      <td className="py-1.5 px-2.5 text-[#6A5E4C]">Koylar ve burunlar dahil.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2.5 font-semibold">Ada Tepesi</td>
                      <td className="py-1.5 px-2.5 font-mono font-bold">742 m</td>
                      <td className="py-1.5 px-2.5 text-[#6A5E4C]">Zirve; antik kalıntılar ve Yangın Kulesi.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* BÖLÜM 2: MAHALLELER */}
          {bolumGorunur('mahalleler') && (
            <section className="py-5 border-b border-[#E5DFD5] space-y-3">
              <div className="flex items-center gap-2 text-[#0E1C4F]">
                <MapPin className="w-4 h-4 text-[#F26B6F]" />
                <h2 className="text-base font-bold tracking-tight uppercase">2. Beş Kanonik Mahalle</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mahalleDetaylari.map(m => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-bold text-[14px] text-[#0E1C4F]">{m.ad}</h3>
                      <span className="text-[9px] font-mono text-[#6A5E4C]">{m.bagliMaddeler.length} varlık</span>
                    </div>
                    <p className="text-[11px] text-[#555] leading-snug">{m.karakter}</p>
                    <div className="pt-1.5 border-t border-[#E5DFD5]">
                      <span className="text-[9px] font-mono font-bold uppercase text-[#6A5E4C] block mb-0.5">Simgeler:</span>
                      <p className="text-[10px] text-[#333] leading-snug">{m.simgeler.join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* BÖLÜM 3: VARLIKLAR */}
          {bolumGorunur('varliklar') && (
            <section className="py-5 border-b border-[#E5DFD5] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0E1C4F]">
                  <Building className="w-4 h-4 text-[#F26B6F]" />
                  <h2 className="text-base font-bold tracking-tight uppercase">3. Varlıklar ve Mekânlar</h2>
                </div>
                <div className="print:hidden">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#6A5E4C]" />
                    <input
                      type="text"
                      value={arama}
                      onChange={e => setArama(e.target.value)}
                      placeholder="Filtrele..."
                      className="pl-7 pr-2.5 py-1 text-[10px] rounded-lg border border-[#CFC5B4] bg-white text-[#0E1C4F] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Kurumlar ve Mekânlar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[...kategoriler.kurumlar, ...filtrelenmisMekanlar].slice(0, 12).map(item => (
                  <div
                    key={item.id}
                    onClick={() => onMaddeSec?.(item.id)}
                    className="p-2.5 rounded-lg border border-[#E5DFD5] hover:border-[#0E1C4F] transition-colors cursor-pointer bg-white"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="font-bold text-[#F26B6F]">{TYPE_LABELS[item.type] || item.type}</span>
                      <span className="text-[#6A5E4C]">{BOLGE_ADLARI[item.metadata?.region] || item.metadata?.region || 'Ada'}</span>
                    </div>
                    <div className="font-bold text-[12px] text-[#0E1C4F] mt-1">{item.title}</div>
                    <p className="text-[10px] text-[#666] line-clamp-1 mt-0.5">
                      {item.notes || 'Açıklama mevcut değil.'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Sakinler */}
              <div className="pt-3 border-t border-[#E5DFD5] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-[#6A5E4C]">
                    Ada Sakinleri ({filtrelenmisKisiler.length} Kişi)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setTumKisileriGoster(t => !t)}
                    className="print:hidden text-[10px] font-mono text-[#F26B6F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {tumKisileriGoster ? (
                      <>Daralt <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Tümünü Göster ({filtrelenmisKisiler.length}) <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(tumKisileriGoster ? filtrelenmisKisiler : filtrelenmisKisiler.slice(0, 20)).map(kisi => (
                    <div
                      key={kisi.id}
                      onClick={() => onMaddeSec?.(kisi.id)}
                      className="p-2 rounded-lg border border-[#E5DFD5] hover:border-[#0E1C4F] cursor-pointer bg-[#FAF8F5]"
                    >
                      <div className="font-semibold text-[11px] text-[#0E1C4F] truncate">{kisi.title}</div>
                      <div className="text-[9px] font-mono text-[#6A5E4C] truncate">
                        {kisi.metadata?.profile?.profession || 'Ada Sakini'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* BÖLÜM 4: LORE VE KRONOLOJİ */}
          {bolumGorunur('kronoloji') && (
            <section className="py-5 border-b border-[#E5DFD5] space-y-3">
              <div className="flex items-center gap-2 text-[#0E1C4F]">
                <Calendar className="w-4 h-4 text-[#F26B6F]" />
                <h2 className="text-base font-bold tracking-tight uppercase">4. Tarihsel Kronoloji (Lore)</h2>
              </div>

              <div className="border-l-2 border-[#0E1C4F] ml-2 pl-3 space-y-2.5 font-sans text-[11px]">
                <div><b className="text-[#F26B6F] font-mono">Antik Çağ:</b> Ada Tepesi akropol kalıntıları ve Amfora batık alanı.</div>
                <div><b className="text-[#F26B6F] font-mono">18. Yüzyıl:</b> İskele Taş Rum Kilisesi ve mezarlık.</div>
                <div><b className="text-[#F26B6F] font-mono">1923 (Lozan):</b> Rum cemaatinin ayrılışı; Selanik ve Girit göçmenleri.</div>
                <div><b className="text-[#F26B6F] font-mono">1954:</b> The Imperial Kemsköy açılır (Devlet misafirhanesinden otele). Yaz turizmi başlar.</div>
                <div><b className="text-[#F26B6F] font-mono">12 Mayıs 1957:</b> Dirlik Spor Kulübü kurulur.</div>
                <div><b className="text-[#F26B6F] font-mono">1970'ler:</b> Fener otomatiğe geçer. Köye elektrik bağlanır.</div>
                <div><b className="text-[#F26B6F] font-mono">1980'ler:</b> Düzada Belediyesi kurulur; Yeni Liman, Dirlik Stadı ve Sade Meze açılır.</div>
                <div><b className="text-[#F26B6F] font-mono">2000 Sonrası:</b> Dondurmacı Kızlar, bağcılık ve butik şaraphaneler.</div>
                <div><b className="text-[#F26B6F] font-mono">2024 / 2025:</b> Kems Company ve Kemsköy Caddesi mağazası faaliyete geçer.</div>
              </div>
            </section>
          )}

          {/* BÖLÜM 5: KANON KURALLARI */}
          {bolumGorunur('kronoloji') && (
            <section className="py-5 space-y-2.5">
              <div className="flex items-center gap-2 text-[#0E1C4F]">
                <Shield className="w-4 h-4 text-[#F26B6F]" />
                <h2 className="text-base font-bold tracking-tight uppercase">5. Kanon Kuralları</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5]">
                  <b className="text-[#0E1C4F] block">Norveççe "ø" Yasağı:</b>
                  <span className="text-[#555]">Asla "Kemskøy" yazılmaz; tek doğru biçim <b>Kemsköy</b>'dür.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD5]">
                  <b className="text-[#0E1C4F] block">1980 Kuralı:</b>
                  <span className="text-[#555]">1980 öncesi sahnelerde Liman Mahallesi, Dirlik Stadı, Belediye geçemez.</span>
                </div>
              </div>
            </section>
          )}

          {/* Altbilgi */}
          <footer className="pt-6 border-t-2 border-[#0E1C4F] flex flex-wrap items-center justify-between text-[10px] font-mono text-[#6A5E4C]">
            <div>Kems Komuta Merkezi Master Arşivi</div>
            <div>Düzada, TR · Made with Culture</div>
          </footer>
        </div>
      )}
    </div>
  );
};
