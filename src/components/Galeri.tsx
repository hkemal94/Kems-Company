import React, { useMemo, useRef, useState } from 'react';
import { Upload, X, Link2, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { Item } from '../types';
import {
  compressImageBase64, compressPngKeepAlpha, dosyayiOku
} from '../lib/imageCompressor';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

/**
 * Galeri.
 *
 * Kemal: "Bunun için yazılıma bir galeri kurabilir miyiz, içine yükleriz
 * hepsini oradan çekersin?"
 *
 * Gerekçe: Canva'nın indirme sunucusu benim çalıştığım ortamdan kapalı,
 * logoların dosyalarını oradan çekemiyorum. Galeri bu duvarı aşıyor —
 * Kemal yüklüyor, görsel uygulamanın kendi verisine giriyor, oradan hem
 * ekranlarda kullanılıyor hem de yedeğe düşüyor.
 *
 * İki teknik karar:
 *
 * 1. PNG'ler saydamlığını koruyor. Uygulamanın eski sıkıştırıcısı her şeyi
 *    JPEG'e çevirip saydam zemini beyaza boyuyordu; logo için bu, kiremit
 *    zeminin üstünde beyaz kutu demek. Logolar PNG yolundan geçiyor.
 *
 * 2. Görseller kayıt olarak tutuluyor (type: 'ilham_gorsel'), ayrı bir
 *    depolama yok. Böylece yedekleme, arama ve arşiv kuralları bu
 *    görsellere de kendiliğinden işliyor.
 */

const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'gal-yukle', label: 'Yükle' },
  { id: 'gal-liste', label: 'Görseller' }
];

/** Firestore'un 1 MB'lık belge sınırına yaklaşmayalım */
const AZAMI_BAYT = 700_000;

export type GorselTuru = 'logo' | 'urun' | 'mekan' | 'ilham' | 'diger';

const TUR_ADI: Record<GorselTuru, string> = {
  logo: 'Logo / arma',
  urun: 'Ürün',
  mekan: 'Mekân',
  ilham: 'İlham',
  diger: 'Diğer'
};

function kabaBoyut(dataUrl: string): number {
  // base64 ~ 4/3 oranında şişer
  const i = dataUrl.indexOf(',');
  return i < 0 ? dataUrl.length : Math.floor((dataUrl.length - i - 1) * 0.75);
}

export interface GaleriProps {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onSelectItem?: (id: string) => void;
}

export const Galeri: React.FC<GaleriProps> = ({
  items, onAddItem, onUpdateItem, onSelectItem
}) => {
  const girdi = useRef<HTMLInputElement | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);
  const [yeniTur, setYeniTur] = useState<GorselTuru>('logo');
  const [suzgec, setSuzgec] = useState<GorselTuru | 'hepsi'>('hepsi');
  const [buyuk, setBuyuk] = useState<Item | null>(null);
  const [bagliyor, setBagliyor] = useState<string | null>(null);

  const gorseller = useMemo(
    () => items
      .filter(i => i.type === 'ilham_gorsel' && !i.archived && (i.images || []).length)
      .sort((a, b) => b.updatedAt - a.updatedAt),
    [items]
  );

  const suzulmus = useMemo(
    () => suzgec === 'hepsi'
      ? gorseller
      : gorseller.filter(g => ((g.metadata as any)?.gorselTuru || 'diger') === suzgec),
    [gorseller, suzgec]
  );

  /** Görselin bağlanabileceği kayıtlar — marka, drop, ürün, mekân, kişi */
  const hedefler = useMemo(
    () => items.filter(
      i => !i.archived && !i.isProposal
        && ['marka', 'drop', 'merch_urun', 'mekân', 'yer', 'kisi'].includes(i.type)
    ).sort((a, b) => a.title.localeCompare(b.title, 'tr')),
    [items]
  );

  const yukle = async (dosyalar: FileList) => {
    setYukleniyor(true);
    setRapor(null);
    const hatalar: string[] = [];
    let eklenen = 0;
    try {
      for (const dosya of Array.from(dosyalar)) {
        if (!dosya.type.startsWith('image/')) {
          hatalar.push(`${dosya.name}: görsel değil`);
          continue;
        }
        const ham = await dosyayiOku(dosya);
        // Saydamlık gereken türlerde PNG yolu, diğerlerinde JPEG
        const saydamlikGerekli = yeniTur === 'logo' || dosya.type === 'image/png';
        let kucuk = saydamlikGerekli
          ? await compressPngKeepAlpha(ham)
          : await compressImageBase64(ham);

        // PNG hâlâ büyükse fotoğraf gibi davranıp JPEG'e düşüyoruz —
        // ama logo isteniyorsa saydamlığı feda etmeyip uyarıyoruz.
        if (kabaBoyut(kucuk) > AZAMI_BAYT) {
          if (yeniTur === 'logo') {
            hatalar.push(
              `${dosya.name}: sıkıştırınca bile çok büyük `
              + `(${Math.round(kabaBoyut(kucuk) / 1024)} KB). Canva'dan daha küçük dışa aktar.`
            );
            continue;
          }
          kucuk = await compressImageBase64(ham, 900, 900, 0.7);
          if (kabaBoyut(kucuk) > AZAMI_BAYT) {
            hatalar.push(`${dosya.name}: çok büyük, atlandı`);
            continue;
          }
        }

        await onAddItem({
          title: dosya.name.replace(/\.[a-z0-9]+$/i, ''),
          area: 'ilham',
          type: 'ilham_gorsel',
          status: 'Arşivde',
          priority: 'düşük',
          tags: ['galeri', yeniTur],
          links: [],
          notes: '',
          images: [kucuk],
          isProposal: false,
          archived: false,
          metadata: { gorselTuru: yeniTur, kaynakDosya: dosya.name }
        });
        eklenen++;
      }
      setRapor(
        [eklenen ? `${eklenen} görsel yüklendi.` : null, ...hatalar]
          .filter(Boolean).join(' · ') || 'Bir şey yüklenmedi.'
      );
    } catch (e) {
      setRapor(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setYukleniyor(false);
      if (girdi.current) girdi.current.value = '';
    }
  };

  /** Görseli bir kayda bağlar — kaydın kendi görseli olur */
  const bagla = async (gorsel: Item, hedefId: string) => {
    const hedef = items.find(i => i.id === hedefId);
    if (!hedef) return;
    const kare = gorsel.images?.[0];
    if (!kare) return;
    const mevcut = hedef.images || [];
    if (!mevcut.includes(kare)) {
      await onUpdateItem({ ...hedef, images: [kare, ...mevcut], updatedAt: Date.now() });
    }
    await onUpdateItem({
      ...gorsel,
      metadata: { ...((gorsel.metadata || {}) as any), bagliId: hedefId },
      updatedAt: Date.now()
    });
    setBagliyor(null);
    setRapor(`"${gorsel.title}" → ${hedef.title} kaydına bağlandı.`);
  };

  const arsivle = async (g: Item) => {
    await onUpdateItem({ ...g, archived: true, updatedAt: Date.now() });
    setBuyuk(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="pb-4 border-b border-[#CFC5B4] dark:border-[#2C3C72]">
        <h1 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8] italic">
          Galeri
        </h1>
        <p className="mt-1 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9] max-w-2xl leading-relaxed">
          Logolar, ürün fotoğrafları, mekân görselleri. Yüklediğin her görsel
          uygulamanın verisine giriyor — yedeğe düşüyor, kayıtlara bağlanabiliyor
          ve ben buradan okuyabiliyorum. Logo seçersen saydam zemin korunur.
        </p>
      </div>

      <SayfaRayi baslik="Galeri" bolumler={RAY_BOLUMLERI} />

      {/* --- yükleme --- */}
      <section id="gal-yukle" className="scroll-mt-24">
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files?.length) void yukle(e.dataTransfer.files);
          }}
          className="rounded-xl border-2 border-dashed border-[#CFC5B4] dark:border-[#2C3C72]
                     bg-[#FAF8F5] dark:bg-[#13204A] p-5"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#6A5E4C] dark:text-[#A6B0C9]">
              Tür
            </span>
            {(Object.keys(TUR_ADI) as GorselTuru[]).map(t => (
              <button
                key={t}
                onClick={() => setYeniTur(t)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border cursor-pointer transition-colors
                  ${yeniTur === t
                    ? 'border-[#F26B6F] text-[#F26B6F]'
                    : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#F26B6F]'}`}
              >
                {TUR_ADI[t]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => girdi.current?.click()}
              disabled={yukleniyor}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-mono rounded-lg
                         bg-[#1B2A4A] text-[#F3EFE8] hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {yukleniyor ? 'Yükleniyor…' : 'Görsel seç'}
            </button>
            <span className="text-[11px] text-[#9A8C76] dark:text-[#6E7CA0]">
              ya da dosyaları buraya sürükle · birden çok seçebilirsin
            </span>
            <input
              ref={girdi}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files?.length) void yukle(e.target.files); }}
            />
          </div>

          {rapor && (
            <p className="mt-3 px-3 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A]
                          text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
              {rapor}
            </p>
          )}
        </div>
      </section>

      {/* --- liste --- */}
      <section id="gal-liste" className="scroll-mt-24">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <button
            onClick={() => setSuzgec('hepsi')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border cursor-pointer
              ${suzgec === 'hepsi' ? 'border-[#F26B6F] text-[#F26B6F]'
                : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
          >
            Hepsi ({gorseller.length})
          </button>
          {(Object.keys(TUR_ADI) as GorselTuru[]).map(t => {
            const n = gorseller.filter(
              g => ((g.metadata as any)?.gorselTuru || 'diger') === t
            ).length;
            if (!n) return null;
            return (
              <button
                key={t}
                onClick={() => setSuzgec(t)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border cursor-pointer
                  ${suzgec === t ? 'border-[#F26B6F] text-[#F26B6F]'
                    : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
              >
                {TUR_ADI[t]} ({n})
              </button>
            );
          })}
        </div>

        {suzulmus.length === 0 ? (
          <div className="flex items-center gap-2.5 px-4 py-6 rounded-xl border
                          border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A]">
            <ImageIcon className="w-4 h-4 text-[#CFC5B4] shrink-0" />
            <p className="text-[13px] text-[#6A5E4C] dark:text-[#A6B0C9]">
              Galeri boş. Canva'dan indirdiğin logoları buraya yükleyebilirsin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {suzulmus.map(g => {
              const m = (g.metadata as any) || {};
              const bagli = items.find(i => i.id === m.bagliId);
              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72]
                             bg-[#FAF8F5] dark:bg-[#13204A] overflow-hidden"
                >
                  <button
                    onClick={() => setBuyuk(g)}
                    className="block w-full cursor-pointer"
                    style={{
                      // saydam logo kirli görünmesin diye krem zemin
                      background: '#F3EFE8'
                    }}
                  >
                    <img
                      src={g.images![0]}
                      alt={g.title}
                      loading="lazy"
                      className="w-full object-contain"
                      style={{ height: 130, padding: 10 }}
                    />
                  </button>
                  <div className="px-3 py-2 border-t border-[#CFC5B4]/60 dark:border-[#2C3C72]">
                    <p className="text-[11px] font-semibold text-[#1B2A4A] dark:text-[#F3EFE8] truncate">
                      {g.title}
                    </p>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[#9A8C76] mt-0.5 truncate">
                      {TUR_ADI[(m.gorselTuru as GorselTuru) || 'diger']}
                      {bagli ? ` · ${bagli.title}` : ''}
                    </p>

                    {bagliyor === g.id ? (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={e => { if (e.target.value) void bagla(g, e.target.value); }}
                        className="mt-1.5 w-full text-[10px] font-mono bg-white dark:bg-[#17345A]
                                   text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4]
                                   dark:border-[#2C3C72] rounded p-1"
                      >
                        <option value="">Kayıt seç…</option>
                        {hedefler.map(h => (
                          <option key={h.id} value={h.id}>{h.title}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setBagliyor(g.id)}
                        className="mt-1.5 flex items-center gap-1 text-[10px] font-mono
                                   text-[#F26B6F] cursor-pointer"
                      >
                        {bagli ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                        {bagli ? 'Başka kayda bağla' : 'Bir kayda bağla'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- büyük görünüm --- */}
      {buyuk && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
          onClick={() => setBuyuk(null)}
        >
          <div
            className="max-w-3xl w-full rounded-xl bg-[#FAF8F5] dark:bg-[#13204A]
                       border border-[#CFC5B4] dark:border-[#2C3C72] p-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="font-mono text-sm font-bold text-[#1B2A4A] dark:text-[#F3EFE8] truncate">
                  {buyuk.title}
                </h2>
                <p className="text-[11px] text-[#9A8C76]">
                  {TUR_ADI[((buyuk.metadata as any)?.gorselTuru as GorselTuru) || 'diger']}
                  {' · '}
                  {Math.round(kabaBoyut(buyuk.images![0]) / 1024)} KB
                </p>
              </div>
              <button
                onClick={() => setBuyuk(null)}
                className="p-1 text-[#6A5E4C] hover:text-[#F26B6F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div style={{ background: '#F3EFE8', borderRadius: 6, padding: 16 }}>
              <img
                src={buyuk.images![0]}
                alt={buyuk.title}
                className="w-full object-contain"
                style={{ maxHeight: '60vh' }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              {onSelectItem && (buyuk.metadata as any)?.bagliId && (
                <button
                  onClick={() => onSelectItem(String((buyuk.metadata as any).bagliId))}
                  className="text-[11px] font-mono text-[#F26B6F] cursor-pointer"
                >
                  Bağlı kaydı aç →
                </button>
              )}
              <button
                onClick={() => void arsivle(buyuk)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono
                           rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72]
                           text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#F26B6F] cursor-pointer"
                title="Silinmez, arşive kalkar"
              >
                <Trash2 className="w-3 h-3" />
                Arşive kaldır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Galeri;
