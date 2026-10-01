import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CircleCheck, Compass } from 'lucide-react';
import type { AreaType, Item } from '../types';
import { soruCevapAktarimi } from '../lib/soruCevapAktarimi';
import { w3Aktarimi } from '../lib/w3Aktarimi';
import { w4Aktarimi } from '../lib/w4Aktarimi';
import { w5Aktarimi, w5GorselAdresi, W5_ETIKETI } from '../lib/w5Aktarimi';
import { useHaritaDuzeni } from '../lib/haritaDuzeni';
import { TemizlikKarti } from './TemizlikKarti';
import { GaleriYedegiKarti } from './GaleriYedegiKarti';
import { KanonKarti } from './KanonKarti';
import { vikiDuzeni } from '../lib/vikiDuzeni';
import { boslukDoldurma } from '../lib/boslukDoldurma';
import { haritadaAra, maddeTohumu } from '../lib/haritaMaddesi';
import { eksikleriCikar, type Cozum, type Eksik } from '../lib/eksikler';

interface EksiklerProps {
  items: Item[];
  onSelectArea: (area: AreaType, itemId?: string) => void;
  /** Kayıt yazma — ø temizliği için */
  onUpdateItem?: (item: Item) => Promise<void>;
  /** W5: galeriye görsel eklemek için */
  onAddItem?: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  /** Ana sayfadan bir satıra basılınca o başlık açık gelir (Paket 4) */
  baslangicAcik?: string | null;
  /** Temizlik kartı: kaydı gerçekten siler (29 Eylül) */
  onDeleteItem?: (id: string) => Promise<void>;
}

export const Eksikler: React.FC<EksiklerProps> = ({
  items, onSelectArea, onUpdateItem, onAddItem, baslangicAcik = null, onDeleteItem
}) => {
  const eksikler = useMemo(() => eksikleriCikar(items), [items]);
  /** Listesi açık olan eksik başlığı */
  const [acikEksik, setAcikEksik] = useState<string | null>(baslangicAcik);
  React.useEffect(() => { if (baslangicAcik) setAcikEksik(baslangicAcik); }, [baslangicAcik]);
  /** Satırdaki çözüm düğmesi çalışırken */
  const [cozuluyor, setCozuluyor] = useState<string | null>(null);

  /** Tek tuşla çözüm — yalnız Kemal basınca yazar */
  const coz = async (c: Cozum, anahtar: string) => {
    if (cozuluyor) return;
    setCozuluyor(anahtar);
    try {
      if (c.tur === 'madde-ac' && onAddItem) {
        const k = haritadaAra(c.wikiId);
        if (!k) return;
        const tohum = maddeTohumu(k);
        // undefined alan bütün kaydı reddettirir: boş anahtarlar çıkarılır
        const meta = Object.fromEntries(Object.entries(tohum.metadata || {}).filter(([, v]) => v !== undefined));
        await onAddItem({ ...tohum, metadata: meta } as Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>);
      } else if (c.tur === 'kayda-bagla' && onUpdateItem) {
        const hedef = items.find(i => i.id === c.hedefId);
        if (hedef) await onUpdateItem({ ...hedef, metadata: { ...(hedef.metadata || {}), haritaWikiId: c.wikiId }, updatedAt: Date.now() });
      } else if (c.tur === 'markaya-bagla' && onUpdateItem) {
        const hedef = items.find(i => i.id === c.hedefId);
        if (hedef) await onUpdateItem({ ...hedef, metadata: { ...(hedef.metadata || {}), brandId: c.markaId }, updatedAt: Date.now() });
      }
    } finally {
      setCozuluyor(null);
    }
  };
  const cozumAdi = (c: Cozum) => c.tur === 'madde-ac' ? 'Madde aç' : c.tur === 'kayda-bagla' ? 'Kayda bağla' : `${c.markaAdi}'ye bağla`;

  /**
   * Soru-cevapların vikiye aktarılması (W2) — mahalleler, mekânlar, otel,
   * ada ve kurumlar. Kurgu metni yok; yalnız Kemal'in cevapları.
   */
  const aktarim = useMemo(() => soruCevapAktarimi(items), [items]);
  const aktarimIsiVar = aktarim.yeniler.length + aktarim.guncellenenler.length > 0;
  const [aktarimIsi, setAktarimIsi] = useState(false);
  const [aktarimRaporu, setAktarimRaporu] = useState<string | null>(null);
  const [aktarimOnay, setAktarimOnay] = useState(false);

  const vikiyeAktar = async () => {
    if (!onUpdateItem || aktarimIsi) return;
    setAktarimOnay(false);
    setAktarimIsi(true);
    let n = 0;
    try {
      for (const kayit of [...aktarim.yeniler, ...aktarim.guncellenenler]) {
        await onUpdateItem(kayit);
        n++;
      }
      setAktarimRaporu(
        `${n} kayıt yazıldı. Tarihçe gibi boş bölümler "boş" işaretli; onları sen yazacaksın.`
        + (aktarim.bulunamayan.length ? ` Bulunamayan: ${aktarim.bulunamayan.join(', ')}.` : '')
      );
    } catch (e) {
      // Yazılanlar ikinci basışta atlanır; kalanlar için tekrar basılabilir
      setAktarimRaporu(
        `${n} kayıt yazıldı, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setAktarimIsi(false);
    }
  };

  /** W3 soru-cevapları vikiye — tarih aralıkları ve bilgi satırları */
  const w3 = useMemo(() => w3Aktarimi(items), [items]);
  const [w3Isi, setW3Isi] = useState(false);
  const [w3Raporu, setW3Raporu] = useState<string | null>(null);
  const [w3Onay, setW3Onay] = useState(false);

  const w3Aktar = async () => {
    if (!onUpdateItem || w3Isi) return;
    setW3Onay(false);
    setW3Isi(true);
    let n = 0;
    try {
      for (const kayit of w3.guncellenenler) { await onUpdateItem(kayit); n++; }
      setW3Raporu(
        `${n} kayıt güncellendi.`
        + (w3.bulunamayan.length ? ` Bulunamayan: ${w3.bulunamayan.join(', ')}.` : '')
      );
    } catch (e) {
      setW3Raporu(
        `${n} kayıt güncellendi, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setW3Isi(false);
    }
  };

  /** Ada hayatı bilgileri vikiye (W4) — W3 bitince görünür */
  const w4 = useMemo(() => w4Aktarimi(items), [items]);
  const [w4Isi, setW4Isi] = useState(false);
  const [w4Raporu, setW4Raporu] = useState<string | null>(null);
  const [w4Onay, setW4Onay] = useState(false);

  const w4Aktar = async () => {
    if (!onUpdateItem || w4Isi) return;
    setW4Onay(false);
    setW4Isi(true);
    let n = 0;
    try {
      for (const kayit of w4.guncellenenler) { await onUpdateItem(kayit); n++; }
      setW4Raporu(
        `${n} kayıt güncellendi.`
        + (w4.bulunamayan.length ? ` Bulunamayan: ${w4.bulunamayan.join(', ')}.` : '')
      );
    } catch (e) {
      setW4Raporu(
        `${n} kayıt güncellendi, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setW4Isi(false);
    }
  };

  /** W5: viki düzeltmeleri + Canva görselleri galeriye — W4 bitince görünür */
  const w5 = useMemo(() => w5Aktarimi(items), [items]);
  const w5Is = w5.guncellenenler.length + w5.gorseller.length;
  const [w5Isi, setW5Isi] = useState(false);
  const [w5Raporu, setW5Raporu] = useState<string | null>(null);
  const [w5Onay, setW5Onay] = useState(false);

  const w5Aktar = async () => {
    if (!onUpdateItem || !onAddItem || w5Isi) return;
    setW5Onay(false);
    setW5Isi(true);
    let kayit = 0;
    let gorsel = 0;
    const hatalar: string[] = [];
    try {
      // 1. Görsel dosyaları depodan okunur (public/galeri/canva)
      const veriler = new Map<string, string>();
      for (const { gorsel: g } of w5.gorseller) {
        try {
          const yanit = await fetch(w5GorselAdresi(g));
          if (!yanit.ok) throw new Error(String(yanit.status));
          const blob = await yanit.blob();
          const veri = await new Promise<string>((coz, red) => {
            const r = new FileReader();
            r.onload = () => coz(String(r.result || ''));
            r.onerror = () => red(new Error('okunamadı'));
            r.readAsDataURL(blob);
          });
          if (veri.startsWith('data:image/')) veriler.set(g.anahtar, veri);
          else hatalar.push(`${g.baslik}: görsel değil`);
        } catch (e) {
          hatalar.push(`${g.baslik}: ${e instanceof Error ? e.message : 'okunamadı'}`);
        }
      }

      // 2. Kayda bağlanacak görseller, kayıt kimliğine göre
      const bagliGorseller = new Map<string, string[]>();
      for (const { gorsel: g, hedefId } of w5.gorseller) {
        const veri = veriler.get(g.anahtar);
        if (!hedefId || !veri) continue;
        bagliGorseller.set(hedefId, [...(bagliGorseller.get(hedefId) || []), veri]);
      }
      const gorselEkle = (i: Item): Item => {
        const ek = (bagliGorseller.get(i.id) || []).filter(v => !(i.images || []).includes(v));
        return ek.length ? { ...i, images: [...(i.images || []), ...ek] } : i;
      };

      // 3. Viki kayıtları (görselleriyle birlikte)
      const yazilan = new Set<string>();
      for (const k of w5.guncellenenler) {
        await onUpdateItem(gorselEkle(k));
        yazilan.add(k.id);
        kayit++;
      }
      // Etiketi daha önce almış kayıtlara yalnız görsel eklenir
      for (const hedefId of bagliGorseller.keys()) {
        if (yazilan.has(hedefId)) continue;
        const hedef = items.find(i => i.id === hedefId);
        if (!hedef) continue;
        const yeni = gorselEkle(hedef);
        if (yeni !== hedef) { await onUpdateItem({ ...yeni, updatedAt: Date.now() }); kayit++; }
      }

      // 4. Galeri kayıtları
      for (const { gorsel: g, hedefId } of w5.gorseller) {
        const veri = veriler.get(g.anahtar);
        if (!veri) continue;
        await onAddItem({
          title: g.baslik,
          area: 'ilham',
          type: 'ilham_gorsel',
          status: 'Arşivde',
          priority: 'düşük',
          tags: ['galeri', g.tur, 'canva', W5_ETIKETI],
          links: [],
          notes: '',
          images: [veri],
          isProposal: false,
          archived: false,
          metadata: {
            gorselTuru: g.tur,
            kaynakDosya: g.dosya,
            canvaKaynak: g.anahtar,
            canvaTasarim: g.canvaTasarim,
            ...(hedefId ? { bagliId: hedefId } : {})
          }
        });
        gorsel++;
      }
      setW5Raporu(
        `${kayit} kayıt güncellendi, ${gorsel} görsel galeriye eklendi.`
        + (w5.bulunamayan.length ? ` Bulunamayan: ${w5.bulunamayan.join(', ')}.` : '')
        + (hatalar.length ? ` Okunamayan görsel: ${hatalar.join('; ')}. Tekrar basınca yalnız bunlar denenir.` : '')
      );
    } catch (e) {
      setW5Raporu(
        `${kayit} kayıt, ${gorsel} görsel yazıldı, sonra hata: `
        + `${e instanceof Error ? e.message : 'bilinmeyen'}. Kalanlar için tekrar bas.`
      );
    } finally {
      setW5Isi(false);
    }
  };

  /**
   * Harita düzeni yeni koordinata (H, 29 Eylül). Düzen eski koordinatta
   * kayıtlıysa harita onu okurken çevirir; bu kart çevrilmiş hâli kalıcı
   * yazar. Yazıldıktan sonra kart görünmez.
   */
  const harita = useHaritaDuzeni();
  const [koordinatIsi, setKoordinatIsi] = useState(false);
  const [koordinatRaporu, setKoordinatRaporu] = useState<string | null>(null);
  const koordinatiTasi = async () => {
    if (!harita.duzen || koordinatIsi) return;
    setKoordinatIsi(true);
    try {
      await harita.kaydet({ ...harita.duzen, guncelleme: Date.now() });
      setKoordinatRaporu('Harita düzenin yeni koordinata (39,60 K · 25,85 D) taşındı. Sınırlar, yollar, mekânlar ve Kurucu taslağı aynı yerinde; ölçüler değişmedi.');
    } catch (e) {
      setKoordinatRaporu(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}. Tekrar bas.`);
    } finally {
      setKoordinatIsi(false);
    }
  };

  // Veri henüz yüklenmediyse panel açılmasın: boş listeyi "her şey tamam"
  // diye göstermek yanlış olur.
  // Bu satır bütün useMemo/useState'lerin ALTINDA olmalı: üstte dururken veri
  // yüklenince çağrılan kanca sayısı değişiyordu, React bunu hata sayar.
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-[12px] font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <Compass className="w-4 h-4 text-[#F26B6F]" />
        Neyin Eksik
      </h2>

      {/* Temizlik (29 Eylül): kullanılmayan kayıtlar silinir, önce yedek */}
      {onDeleteItem && <TemizlikKarti items={items} onDeleteItem={onDeleteItem} />}

      {/* Galeri (29 Eylül): kullanılan görseller galeriye */}
      {onAddItem && <GaleriYedegiKarti items={items} onAddItem={onAddItem} />}

      {/* W3 soru-cevapları vikiye — tek seferlik */}
      {onUpdateItem && w3.guncellenenler.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {w3.guncellenenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              yeni soru-cevaplar (W3) vikiye aktarılmayı bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {w3.ozet.join(' · ')}.
              Tarihçe bölümleri boş kalır. Hiçbir şey silinmez.
            </span>
          </span>
          {w3Onay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {w3.guncellenenler.length} kayıt güncellensin mi?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setW3Onay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={w3Aktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setW3Onay(true)}
              disabled={w3Isi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {w3Isi ? 'Aktarılıyor…' : 'Vikiye aktar'}
            </button>
          )}
        </div>
      )}
      {w3Raporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {w3Raporu}
        </p>
      )}

      {/* Ada hayatı vikiye (W4) — tek seferlik; önce W3 */}
      {onUpdateItem && w3.guncellenenler.length === 0 && w4.guncellenenler.length > 0 && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {w4.guncellenenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              ada hayatı bilgileri (W4) vikiye aktarılmayı bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {w4.ozet.join(' · ')}.
              Yalnız ekleme; var olan yazıya dokunulmaz, hiçbir şey silinmez.
            </span>
          </span>
          {w4Onay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {w4.guncellenenler.length} kayıt güncellensin mi?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setW4Onay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={w4Aktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setW4Onay(true)}
              disabled={w4Isi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {w4Isi ? 'Aktarılıyor…' : 'Vikiye aktar'}
            </button>
          )}
        </div>
      )}
      {w4Raporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {w4Raporu}
        </p>
      )}

      {/* Harita düzeni yeni koordinata — tek seferlik */}
      {harita.duzen?.eskiKoordinat && harita.ilkYukleme && (
        <div className="mb-2.5 flex flex-wrap sm:flex-nowrap items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0">H</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              harita düzenin eski koordinatta kayıtlı
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
              Ada 39,60 K · 25,85 D'ye taşındı. Elle çizdiğin sınırlar, yollar, mekânlar ve Kurucu
              taslağı da aynı şekilde taşınır; şekiller ve ölçüler değişmez. Harita şimdiden doğru
              gösteriyor; bu düğme kalıcı yazar.
            </span>
          </span>
          <button
            type="button"
            onClick={koordinatiTasi}
            disabled={koordinatIsi}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {koordinatIsi ? 'Taşınıyor…' : 'Yeni koordinata taşı'}
          </button>
        </div>
      )}
      {koordinatRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {koordinatRaporu}
        </p>
      )}

      {/* Kanon kararları ve eski otel yazıları (29 Eylül akşamı) — tek seferlik, önce yedek */}
      {onUpdateItem && <KanonKarti items={items} onUpdateItem={onUpdateItem} />}
      {onUpdateItem && (
        <KanonKarti
          items={items}
          onUpdateItem={onUpdateItem}
          hesapla={boslukDoldurma}
          baslik="boşluklar künyedeki cevaplarla dolacak"
          aciklama="Künyede cevabı yazılı olan boş alanlar dolar (tür, mahalle, yıllar, sahibi, sezon, simgeler, sakinler). Dolu alana ve tarihçe metnine dokunulmaz."
          yedekAdi="bosluk-oncesi"
        />
      )}

      {/* Viki düzeni (yapisal-4): Karakter → Kişi, yaş alanı, Kems Company 2025 — tek seferlik */}
      {onUpdateItem && (
        <KanonKarti
          items={items}
          onUpdateItem={onUpdateItem}
          hesapla={vikiDuzeni}
          baslik="viki düzeni: Karakter → Kişi, yaş alanı kalkar, Kems Company 2025"
          aciklama="Karakter türündeki kayıtlar Kişi olur (künye ve metin aynen kalır); kişilerin künyesindeki Yaş satırı ve yaş alanı silinir; Kems Company'nin kuruluş yılı 2025 olur."
          yedekAdi="viki-duzeni-oncesi"
        />
      )}

      {/* Viki düzeltmeleri + Canva görselleri (W5) — tek seferlik; önce W4 */}
      {onUpdateItem && onAddItem && w3.guncellenenler.length === 0 && w4.guncellenenler.length === 0 && w5Is > 0 && (
        <div className="mb-2.5 flex flex-wrap sm:flex-nowrap items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {w5Is}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              viki düzeltmeleri ve Canva görselleri (W5) bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] leading-snug">
              {w5.ozet.join(' · ')}.
              Değişen satırların eskisi "eski metin"e taşınır; hiçbir şey silinmez.
            </span>
          </span>
          {w5Onay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {w5.guncellenenler.length} kayıt ve {w5.gorseller.length} görsel yazılsın mı?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setW5Onay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={w5Aktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setW5Onay(true)}
              disabled={w5Isi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {w5Isi ? 'Aktarılıyor…' : 'Aktar'}
            </button>
          )}
        </div>
      )}
      {w5Raporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {w5Raporu}
        </p>
      )}

      {/* Soru-cevaplar vikiye (W2) — tek seferlik */}
      {onUpdateItem && aktarimIsiVar && (
        <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
          <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
            {aktarim.yeniler.length + aktarim.guncellenenler.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
              soru-cevaplar vikiye aktarılmayı bekliyor
            </span>
            <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
              {aktarim.ozet.join(' · ')}.
              Yalnız senin cevapların yazılır; boş bölümler boş kalır.
              Hiçbir şey silinmez.
            </span>
          </span>
          {aktarimOnay ? (
            <span className="shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-[#F26B6F]">
                {aktarim.yeniler.length + aktarim.guncellenenler.length} kayıt yazılsın mı?
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAktarimOnay(false)}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#0E1C4F] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={vikiyeAktar}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#F26B6F] text-[#F3EFE8] hover:opacity-90 cursor-pointer"
                >
                  Evet, aktar
                </button>
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAktarimOnay(true)}
              disabled={aktarimIsi}
              className="shrink-0 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {aktarimIsi ? 'Aktarılıyor…' : 'Vikiye aktar'}
            </button>
          )}
        </div>
      )}
      {aktarimRaporu && (
        <p className="mb-2.5 px-4 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A] text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
          {aktarimRaporu}
        </p>
      )}

      {eksikler.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A]">
          <CircleCheck className="w-4 h-4 text-[#4A5E68] dark:text-[#A6B0C9] shrink-0" />
          <p className="text-[13px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            Takip ettiğim boşluk kalmadı. Yeni bir şey eklediğinde burası
            kendiliğinden dolar.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {eksikler.map(e => {
            const acik = acikEksik === e.anahtar;
            const liste = e.kayitlar || [];
            return (
            <li key={e.anahtar} className={acik ? 'sm:col-span-2' : ''}>
              <button
                type="button"
                onClick={() => liste.length ? setAcikEksik(acik ? null : e.anahtar) : onSelectArea(e.alan, e.hedefId)}
                aria-expanded={liste.length ? acik : undefined}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] hover:border-[#F26B6F] dark:hover:border-[#F26B6F] transition-colors cursor-pointer group archive-shadow ${acik ? 'rounded-t-xl border-[#F26B6F] dark:border-[#F26B6F]' : 'rounded-xl'}`}
              >
                <span className="font-mono text-lg font-bold text-[#F26B6F] leading-none mt-0.5 shrink-0 tabular-nums">
                  {e.sayi}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">
                    {e.baslik}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-[#6A5E4C] dark:text-[#95A1C2] leading-snug">
                    {e.aciklama}
                  </span>
                </span>
                {liste.length
                  ? <ChevronDown className={`w-3.5 h-3.5 mt-1 shrink-0 transition-transform ${acik ? 'rotate-180 text-[#F26B6F]' : 'text-[#6A5E4C] dark:text-[#95A1C2]'} group-hover:text-[#F26B6F]`} />
                  : <ArrowRight className="w-3.5 h-3.5 mt-1 shrink-0 text-[#6A5E4C] dark:text-[#95A1C2] group-hover:text-[#F26B6F] transition-colors" />}
              </button>
              {acik && (
                <div className="border border-t-0 border-[#F26B6F] rounded-b-xl bg-white/70 dark:bg-[#0E1C4F]/60 max-h-80 overflow-y-auto">
                  <ul className="divide-y divide-[#CFC5B4]/50 dark:divide-[#2C3C72]/60">
                    {liste.map((k, n) => (
                      <li key={(k.id || k.ad) + n} className="flex items-center">
                        <div className="flex-1 min-w-0">
                        {k.id ? (
                          <button
                            type="button"
                            onClick={() => onSelectArea(e.alan, k.id)}
                            className="w-full text-left flex items-baseline gap-3 px-4 py-2 hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer"
                          >
                            <span className="text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] shrink-0 max-w-[45%] truncate">{k.ad}</span>
                            <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] min-w-0 truncate flex-1">{k.not}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 self-center text-[#F26B6F]" />
                          </button>
                        ) : (
                          <div className="flex items-baseline gap-3 px-4 py-2">
                            <span className="text-[12px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] shrink-0 max-w-[45%] truncate">{k.ad}</span>
                            <span className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] min-w-0 truncate">{k.not}</span>
                          </div>
                        )}
                        </div>
                        {k.cozum && (
                          <button
                            type="button"
                            disabled={!!cozuluyor}
                            onClick={() => void coz(k.cozum!, `${e.anahtar}:${n}`)}
                            className="shrink-0 mr-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
                          >
                            {cozuluyor === `${e.anahtar}:${n}` ? '…' : cozumAdi(k.cozum)}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Eksikler;
