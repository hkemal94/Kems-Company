import React, { useRef, useState } from 'react';
import { Download, Upload, Archive, X } from 'lucide-react';
import type { Item, UserSettings } from '../types';
import {
  haritaDuzeniniYedekIcinOku, haritaDuzeniniYedektenYaz
} from '../lib/haritaDuzeni';

/**
 * Yedekleme (K2).
 *
 * Firestore'un zamanlanmış yedeklemesi bu projenin katmanında (AI Studio
 * Starter) kapalı. Otomatik yedek alınamıyor, o yüzden elle alınıyor:
 * tek düğme, tek dosya.
 *
 * Geri yükleme BİLEREK eksiltmeyen biçimde çalışıyor: yedekteki kayıtlar
 * eklenir ya da üstüne yazılır, yedekte olmayanlara dokunulmaz. Yani yanlış
 * bir dosya seçmek veriyi silmez. Gerçekten silmek isteyen kayıtları tek tek
 * siler.
 */

const SURUM = 1;
const SON_YEDEK_ANAHTARI = 'kems_son_yedek';

export interface YedeklemeProps {
  items: Item[];
  settings: UserSettings;
  /** Yedekten gelen bir kaydı yazar (var olanın üstüne) */
  onKayit: (item: Item) => Promise<void> | void;
}

interface YedekDosyasi {
  uygulama: string;
  surum: number;
  tarih: string;
  sayilar: { madde: number };
  settings: UserSettings;
  items: Item[];
  haritaDuzeni: unknown;
}

function sonYedekZamani(): number | null {
  try {
    const v = localStorage.getItem(SON_YEDEK_ANAHTARI);
    return v ? Number(v) : null;
  } catch { return null; }
}

function gunFarki(ms: number): number {
  return Math.floor((Date.now() - ms) / 86_400_000);
}

export const Yedekleme: React.FC<YedeklemeProps> = ({ items, settings, onKayit }) => {
  const [acik, setAcik] = useState(false);
  const [durum, setDurum] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonYedek, setSonYedek] = useState<number | null>(() => sonYedekZamani());
  const dosyaGirdisi = useRef<HTMLInputElement | null>(null);

  const indir = () => {
    const yedek: YedekDosyasi = {
      uygulama: 'Kems Komuta Merkezi',
      surum: SURUM,
      tarih: new Date().toISOString(),
      sayilar: { madde: items.length },
      settings,
      items,
      haritaDuzeni: haritaDuzeniniYedekIcinOku()
    };
    const bugun = new Date().toISOString().slice(0, 10);
    const bag = document.createElement('a');
    bag.href = URL.createObjectURL(
      new Blob([JSON.stringify(yedek, null, 2)], { type: 'application/json' })
    );
    bag.download = `kems-yedek-${bugun}.json`;
    bag.click();
    URL.revokeObjectURL(bag.href);

    const simdi = Date.now();
    try { localStorage.setItem(SON_YEDEK_ANAHTARI, String(simdi)); } catch { /* yok */ }
    setSonYedek(simdi);
    setDurum(`${items.length} madde indirildi.`);
  };

  const yukle = async (dosya: File) => {
    setCalisiyor(true);
    setDurum(null);
    try {
      const veri = JSON.parse(await dosya.text()) as Partial<YedekDosyasi>;
      if (!Array.isArray(veri.items)) {
        setDurum('Bu dosya bir Kems yedeği değil.');
        return;
      }
      if (!window.confirm(
        `${veri.items.length} kayıt geri yüklenecek.\n\n`
        + 'Aynı kimlikli kayıtların üstüne yazılır. '
        + 'Yedekte olmayan kayıtlar SİLİNMEZ.\n\nDevam edilsin mi?'
      )) return;

      let yazilan = 0;
      for (const kayit of veri.items) {
        if (!kayit || !kayit.id) continue;
        await onKayit(kayit);
        yazilan++;
      }
      if (veri.haritaDuzeni) {
        await haritaDuzeniniYedektenYaz(veri.haritaDuzeni);
      }
      setDurum(`${yazilan} kayıt geri yüklendi.`);
    } catch (e) {
      setDurum(`Okunamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`);
    } finally {
      setCalisiyor(false);
      if (dosyaGirdisi.current) dosyaGirdisi.current.value = '';
    }
  };

  const gun = sonYedek === null ? null : gunFarki(sonYedek);
  const eski = gun === null || gun >= 30;

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        title={
          gun === null ? 'Henüz yedek alınmadı'
            : gun === 0 ? 'Bugün yedek alındı'
              : `Son yedek ${gun} gün önce`
        }
        className="relative p-2 bg-white dark:bg-[#17345A] border border-[#CFC5B4]
                   dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9]
                   rounded-lg hover:text-[#D35057] transition-colors cursor-pointer"
      >
        <Archive className="w-4 h-4" />
        {eski && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full
                           bg-[#D35057]" />
        )}
      </button>

      {acik && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4
                     bg-black/40"
          onClick={() => setAcik(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#FAF8F5] dark:bg-[#13204A]
                       border border-[#CFC5B4] dark:border-[#2C3C72] p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-mono text-sm font-bold text-[#1B2A4A]
                               dark:text-[#F3EFE8]">
                  Yedekleme
                </h2>
                <p className="mt-0.5 text-xs text-[#6A5E4C] dark:text-[#A6B0C9]">
                  {gun === null ? 'Henüz yedek alınmadı.'
                    : gun === 0 ? 'Bugün yedek alındı.'
                      : `Son yedek ${gun} gün önce.`}
                </p>
              </div>
              <button
                onClick={() => setAcik(false)}
                className="p-1 text-[#6A5E4C] dark:text-[#A6B0C9]
                           hover:text-[#D35057] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#6A5E4C]
                          dark:text-[#A6B0C9]">
              Bütün maddeler, ayarlar ve harita düzeni tek bir dosyaya iner.
              Otomatik yedek bu Firebase katmanında sunulmuyor, o yüzden elle
              alınıyor.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={indir}
                disabled={calisiyor}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg
                           bg-[#1B2A4A] dark:bg-[#D35057] text-[#F3EFE8] text-xs
                           font-mono hover:opacity-90 disabled:opacity-40
                           cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Yedek indir · {items.length} madde
              </button>

              <button
                onClick={() => dosyaGirdisi.current?.click()}
                disabled={calisiyor}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg
                           border border-[#CFC5B4] dark:border-[#2C3C72]
                           text-[#6A5E4C] dark:text-[#A6B0C9] text-xs font-mono
                           hover:bg-[#F3EFE8] dark:hover:bg-[#17345A]
                           disabled:opacity-40 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {calisiyor ? 'Yükleniyor…' : 'Yedekten geri yükle'}
              </button>
              <input
                ref={dosyaGirdisi}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) void yukle(f);
                }}
              />
            </div>

            <p className="mt-3 text-[11px] leading-snug text-[#9A8C76]
                          dark:text-[#6E7CA0]">
              Geri yükleme eksiltmez: yedekteki kayıtlar eklenir ya da üstüne
              yazılır, yedekte olmayanlara dokunulmaz.
            </p>

            {durum && (
              <p className="mt-3 px-3 py-2 rounded-lg bg-[#F3EFE8] dark:bg-[#17345A]
                            text-xs text-[#6A5E4C] dark:text-[#A6B0C9]">
                {durum}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Yedekleme;
