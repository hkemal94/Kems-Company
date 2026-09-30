import React, { useMemo, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import type { Item } from '../../types';
import { durumOranlari } from '../../lib/durumOranlari';
import { adayKaydi, soruyuErtele, sorulacaklar } from '../../lib/adaylar';
import { gununSorusuBitti } from '../../lib/bildirimler';
import { eksikleriCikar } from '../Eksikler';
import { YuzdeSeridi, type SeritHedefi } from './YuzdeSeridi';
import { SoruKarti } from './SoruKarti';
import { OneriTepsisi } from '../studyo/OneriTepsisi';
import type { StudyoIslemleri } from '../studyo/StudyoBaglami';
import { EksikOzeti } from './EksikOzeti';
import { NotDefteri } from './NotDefteri';
import { DuzadaKarti } from './DuzadaKarti';
import { ETIKET, KART, IKINCIL, YAZI } from './stil';

/**
 * Ana sayfa (Paket 4). Kemal onayladı, 29 Eylül:
 *   Masaüstü: tek ekran — yüzde şeridi, üretim atölyesi, günün sorusu,
 *   adaylar, neyin eksik, not defteri, Düzada kartı.
 *   Telefon: sekmeli — Bugün · Atölye · Notlar · Durum. Açılışta Bugün
 *   (en üstte neyin eksik, altında günün sorusu + adaylar).
 *
 * Atölye yalnız kanon sorusu getirir. Yapay zekâ seçenekleri artık
 * stüdyoda (29 Eylül akşamı): ana sayfa açılınca kendiliğinden yapay
 * zekâya sorulmuyor. Adaylar kutusu yerine öneri tepsisinin ilk üçü.
 */

export type TelSekmesi = 'bugun' | 'atolye' | 'notlar' | 'durum';

type Hedef = SeritHedefi | 'eksikler' | 'harita';

interface Props {
  items: Item[];
  bugunDugmeler: string[];
  onGit: (hedef: Hedef, ayrinti?: string | null) => void;
  onMaddeyiAc: (item: Item) => void;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  /** Öneri tepsisi (stüdyoyla ortak) */
  studyo: StudyoIslemleri;
  onOpenSearch: () => void;
  /** Günün sorusu cevaplanınca bildirimler yeniden sayılsın */
  onBildirimYenile: () => void;
  /** Başlıktaki zil (App'ten) */
  zil: React.ReactNode;
  /** "+" ile yeni not sayfası isteği */
  yeniNotBekliyor: boolean;
  onYeniNot: () => void;
  onYeniNotAcildi: () => void;
  sekme: TelSekmesi;
  onSekme: (s: TelSekmesi) => void;
}

function selam(): string {
  const s = new Date().getHours();
  if (s >= 5 && s < 11) return 'Günaydın';
  if (s < 17 && s >= 11) return 'İyi günler';
  if (s < 22 && s >= 17) return 'İyi akşamlar';
  return 'İyi geceler';
}

export const Anasayfa: React.FC<Props> = ({
  items, bugunDugmeler, onGit, onMaddeyiAc, onAddItem, onUpdateItem, studyo,
  onOpenSearch, onBildirimYenile, zil, yeniNotBekliyor, onYeniNot, onYeniNotAcildi, sekme, onSekme
}) => {
  const [nabiz, setNabiz] = useState(0);
  const [kaydirma, setKaydirma] = useState(0);
  const oranlar = useMemo(() => durumOranlari(items), [items]);
  const eksikler = useMemo(() => eksikleriCikar(items), [items]);
  const sorular = useMemo(() => sorulacaklar(items, 40), [items, nabiz]); // eslint-disable-line react-hooks/exhaustive-deps
  const gununSorusu = sorular[0];
  const atolyeSorulari = useMemo(() => {
    const kalan = sorular.slice(1);
    if (!kalan.length) return [];
    const bas = kaydirma % kalan.length;
    return [...kalan.slice(bas), ...kalan.slice(0, bas)].slice(0, 3);
  }, [sorular, kaydirma]);
  const adaySayisi = items.filter(i => i.type === 'aday' && !i.archived).length;
  const cevapla = (gunun: boolean) => async (b: NonNullable<typeof gununSorusu>, cevap: string, secenektenMi: boolean) => {
    await onAddItem(adayKaydi(b, cevap, secenektenMi));
    if (gunun) { gununSorusuBitti(); onBildirimYenile(); }
  };
  const ertele = (gunun: boolean, anahtar: string) => {
    soruyuErtele(anahtar);
    if (gunun) { gununSorusuBitti(); onBildirimYenile(); }
    setNabiz(n => n + 1);
  };

  const tarih = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const gorunur = (s: TelSekmesi) => (sekme === s ? '' : 'hidden') + ' lg:block min-w-0';

  const TEL_SEKMELERI: Array<{ id: TelSekmesi; ad: string; rozet?: number }> = [
    { id: 'bugun', ad: 'Bugün', rozet: adaySayisi || undefined },
    { id: 'atolye', ad: 'Atölye' },
    { id: 'notlar', ad: 'Notlar' },
    { id: 'durum', ad: 'Durum' }
  ];

  return (
    <div className="space-y-3 lg:space-y-4 animate-in fade-in duration-300">
      {/* Selamlama */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[10px] font-mono uppercase tracking-[0.2em] ${IKINCIL}`}>{tarih}</div>
          <h1 className={`mt-1 font-bold tracking-tight leading-tight text-[20px] lg:text-[28px] ${YAZI}`}>
            {selam()}, Kemal. <em className="not-italic text-[#D6484C] dark:text-[#F26B6F] block lg:inline">Bugün adada ne üretelim?</em>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onOpenSearch} className={`hidden lg:flex items-center gap-2 w-56 px-3 py-2 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] text-[12px] ${IKINCIL} hover:border-[#F26B6F] cursor-pointer`}>
            <Search className="w-3.5 h-3.5" /> Ara <kbd className="ml-auto text-[10px]">⌘K</kbd>
          </button>
          <button type="button" onClick={onOpenSearch} title="Ara" className={`lg:hidden w-11 h-11 rounded-full flex items-center justify-center border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] ${IKINCIL} cursor-pointer`}>
            <Search className="w-4 h-4" />
          </button>
          <span className="lg:hidden">{zil}</span>
          <button
            type="button"
            onClick={onYeniNot}
            title="Yeni not sayfası"
            className="w-11 h-11 lg:w-auto lg:h-auto lg:px-4 lg:py-2 rounded-full lg:rounded-xl bg-[#F26B6F] text-white font-semibold text-[13px] flex items-center justify-center gap-1 hover:opacity-90 cursor-pointer"
          >
            <Plus className="w-5 h-5 lg:w-4 lg:h-4" /><span className="hidden lg:inline">Not</span>
          </button>
        </div>
      </div>

      {/* Telefon sekmeleri */}
      <nav className="lg:hidden sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#E4DCCD]/95 dark:bg-[#0B132B]/95 backdrop-blur-xs flex gap-1.5">
        {TEL_SEKMELERI.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSekme(s.id)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border cursor-pointer ${
              sekme === s.id
                ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] border-transparent'
                : `bg-[#FAF8F5] dark:bg-[#13204A] border-[#CFC5B4] dark:border-[#2C3C72] ${IKINCIL}`
            }`}
          >
            {s.ad}
            {s.rozet ? <sup className="ml-1 px-1.5 rounded-full bg-[#F26B6F] text-white text-[9px] font-bold">{s.rozet}</sup> : null}
          </button>
        ))}
      </nav>

      {/* Telefonda Neyin Eksik en üstte (Kemal, 29 Eylül): açınca ilk görülen */}
      {sekme === 'bugun' && (
        <div className="lg:hidden">
          <EksikOzeti eksikler={eksikler} dugmeler={bugunDugmeler} onAc={a => onGit('eksikler', a)} />
        </div>
      )}

      {/* Yüzde şeridi */}
      <div className={gorunur('durum')}>
        <YuzdeSeridi oranlar={oranlar} onSec={h => onGit(h)} />
      </div>

      {/*
        Hizalama (Kemal, 30 Eylül: "kartlar hizasız"): iki sıra da aynı üç
        sütunlu ızgarada; atölye iki sütun kaplar. Bir sıradaki kartlar en
        uzununun boyuna uzar, alt kenarları aynı çizgide biter.
      */}
      <div className="grid gap-3 lg:gap-4 lg:grid-cols-3 lg:items-stretch">
        {/* Üretim atölyesi */}
        <section className={`${gorunur('atolye')} lg:col-span-2 lg:!flex flex-col rounded-2xl bg-[#0E1C4F] dark:bg-[#13204A] dark:border dark:border-[#2C3C72] text-[#F3EFE8] p-4 lg:p-5`}>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#A6B0C9]">Üretim atölyesi</div>
          <h2 className="mt-1 text-[18px] font-bold">Vikideki boşluklardan sorular</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#C9D0E3]">
            Cevabını yaz ya da "✨ Stüdyoda aç" ile yapay zekâdan seçenek iste. Hiçbiri sen onaylamadan vikiye girmez — önce öneri tepsisine düşer.
          </p>
          <div className="mt-3 flex gap-1.5 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            <span className="shrink-0 px-3 py-1.5 rounded-full bg-[#F26B6F] text-white text-[11px] font-semibold">Kanon sorusu</span>
            <button type="button" onClick={() => setKaydirma(k => k + 3)} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#F3EFE8] text-[11px] font-semibold cursor-pointer">
              <RefreshCw className="w-3 h-3" /> Başka sorular
            </button>
          </div>
          {atolyeSorulari.length ? (
            <div className="mt-3 grid gap-2.5 md:grid-cols-3 flex-1">
              {atolyeSorulari.map(b => (
                <div key={b.anahtar} className="rounded-xl bg-[#FAF8F5] dark:bg-[#0F1A40] p-3 min-w-0 flex flex-col">
                  <div className={ETIKET}>Kanon sorusu</div>
                  <div className="mt-1.5 flex-1">
                    <SoruKarti bosluk={b} onCevap={(c, s) => cevapla(false)(b, c, s)} onSonra={() => ertele(false, b.anahtar)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-[#C9D0E3]">Sorulacak boşluk kalmadı.</p>
          )}
        </section>

        <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
          {/* Günün sorusu */}
          <section className={`${gorunur('bugun')} ${KART} p-4`}>
            <div className={ETIKET}>Günün sorusu</div>
            <div className="mt-2">
              {gununSorusu ? (
                <SoruKarti
                  bosluk={gununSorusu}
                  buyuk
                  onCevap={(c, s) => cevapla(true)(gununSorusu, c, s)}
                  onSonra={() => ertele(true, gununSorusu.anahtar)}
                />
              ) : (
                <p className={`text-[12px] ${IKINCIL}`}>Sorulacak boşluk kalmadı.</p>
              )}
            </div>
          </section>

          <div className={`${gorunur('bugun')} flex-1 [&>*]:h-full`}>
            <OneriTepsisi {...studyo} sinir={3} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className="hidden lg:block min-w-0 [&>*]:h-full">
          <EksikOzeti eksikler={eksikler} dugmeler={bugunDugmeler} onAc={a => onGit('eksikler', a)} />
        </div>
        <div className={`${gorunur('notlar')} lg:[&>*]:h-full`}>
          <NotDefteri items={items} onAddItem={onAddItem} onUpdateItem={onUpdateItem} uzun={sekme === 'notlar'} yeniSayfaBekliyor={yeniNotBekliyor} onYeniSayfaAcildi={onYeniNotAcildi} />
        </div>
        <div className={`${gorunur('durum')} lg:[&>*]:h-full`}>
          <DuzadaKarti items={items} onHarita={() => onGit('harita')} onMadde={onMaddeyiAc} />
        </div>
      </div>
    </div>
  );
};

export default Anasayfa;
