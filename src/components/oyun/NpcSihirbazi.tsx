import React, { useMemo, useState } from 'react';
import { ChevronLeft, Check, Dices } from 'lucide-react';
import type { Item } from '../../types';
import { getRol } from '../wiki/kunyeParser';

/**
 * NPC sihirbazı (34 cevabın 21. maddesi).
 *
 * Kemal: "Standart bilgi/kategori; klavyesiz çoktan seçmeli NPC yaratma
 * istiyorum."
 *
 * Klavyesiz kısmı isimde düğümleniyor: bir kişiye ad vermek yazı işidir.
 * Çözüm uydurmak değil, Kemal'in kendi evrenindeki adları yeniden
 * birleştirmek — var olan kişilerin ön adları ve soyadları havuzdan
 * seçiliyor. Yani ada da tıklayarak karar veriyor, ve çıkan ad evrenin
 * kendi ses tonunda oluyor; benim uydurduğum bir isim değil.
 *
 * Seçimlerin hepsi kayda olduğu gibi yazılıyor. Sihirbaz künyeye tek satır
 * düzyazı eklemiyor — o Kemal'in işi, Boşluklar sayfasından doldurulur.
 */

export interface NpcSihirbaziProps {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onKapat: () => void;
}

const MIZAC = [
  'Sessiz', 'Konuşkan', 'Sinirli', 'Sakin', 'Meraklı',
  'Kuşkucu', 'Neşeli', 'Mesafeli', 'Yardımsever', 'Ketum'
];

const OTEL_DURUMU = [
  { id: 'misafir', ad: 'Otel misafiri', etiket: 'misafir' },
  { id: 'personel', ad: 'Otel personeli', etiket: 'personel' },
  { id: 'sakin', ad: 'Ada sakini', etiket: 'ada-sakini' }
];

/** Kişi kayıtlarından ön ad / soyad havuzu çıkarır. */
function adHavuzu(items: Item[]): { onAdlar: string[]; soyadlar: string[] } {
  const onAdlar = new Set<string>();
  const soyadlar = new Set<string>();
  for (const i of items) {
    if (i.archived || (i.type !== 'kisi' && i.type !== 'karakter')) continue;
    const parcalar = i.title.trim().split(/\s+/).filter(Boolean);
    if (parcalar.length >= 2) {
      onAdlar.add(parcalar[0]);
      soyadlar.add(parcalar[parcalar.length - 1]);
    } else if (parcalar.length === 1) {
      onAdlar.add(parcalar[0]);
    }
  }
  return {
    onAdlar: [...onAdlar].sort((a, b) => a.localeCompare(b, 'tr')),
    soyadlar: [...soyadlar].sort((a, b) => a.localeCompare(b, 'tr'))
  };
}

/**
 * Evrende zaten kullanılan roller — uydurma rol listesi yazmıyoruz.
 *
 * `profile.profession` alanı çoğu kayıtta boş (Boşluklar sayfası 463 boş alan
 * sayıyor). Bu yüzden uygulamanın kendi çözümleyicisi getRol da devrede:
 * rolü künye metninden ya da etiketten çıkarıyor. İkisi birleşince havuz
 * iki satırdan ibaret kalmıyor.
 *
 * Cümle uzunluğundaki girdiler eleniyor: "Düzada'nın unutulmuş hikâyelerini
 * derleyen gezgin kâşif" bir rol değil, bir tanım — düğmeye sığmaz.
 */
function rolHavuzu(items: Item[]): string[] {
  const roller = new Set<string>();
  const ekle = (x: unknown) => {
    if (typeof x !== 'string') return;
    const d = x.trim();
    if (d.length < 2 || d.length > 34) return;
    roller.add(d);
  };
  for (const i of items) {
    if (i.archived) continue;
    ekle((i.metadata as any)?.profile?.profession);
    if (i.type === 'kisi' || i.type === 'karakter') ekle(getRol(i));
  }
  return [...roller].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Mahalleler — harita/kayıt verisinden */
function mahalleHavuzu(items: Item[]): string[] {
  const m = new Set<string>();
  for (const i of items) {
    if (i.archived) continue;
    const b = (i.metadata as any)?.region;
    if (typeof b === 'string' && b.trim()) m.add(b.trim());
  }
  return [...m].sort((a, b) => a.localeCompare(b, 'tr'));
}

type AdimId = 'rol' | 'mahalle' | 'mizac' | 'durum' | 'onad' | 'soyad' | 'ozet';

export const NpcSihirbazi: React.FC<NpcSihirbaziProps> = ({ items, onAddItem, onKapat }) => {
  const { onAdlar, soyadlar } = useMemo(() => adHavuzu(items), [items]);
  const roller = useMemo(() => rolHavuzu(items), [items]);
  const mahalleler = useMemo(() => mahalleHavuzu(items), [items]);

  const [adim, setAdim] = useState<AdimId>('rol');
  const [rol, setRol] = useState('');
  const [mahalle, setMahalle] = useState('');
  const [mizac, setMizac] = useState('');
  const [durum, setDurum] = useState(OTEL_DURUMU[0]);
  const [onAd, setOnAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [yaziliyor, setYaziliyor] = useState(false);

  const adimlar: AdimId[] = ['rol', 'mahalle', 'mizac', 'durum', 'onad', 'soyad', 'ozet'];
  const sira = adimlar.indexOf(adim);

  const ileri = () => setAdim(adimlar[Math.min(sira + 1, adimlar.length - 1)]);
  const geri = () => setAdim(adimlar[Math.max(sira - 1, 0)]);

  /** Havuzdan rastgele seçer — zar, yazı değil */
  const zar = () => {
    if (roller.length) setRol(roller[Math.floor(Math.random() * roller.length)]);
    if (mahalleler.length) setMahalle(mahalleler[Math.floor(Math.random() * mahalleler.length)]);
    setMizac(MIZAC[Math.floor(Math.random() * MIZAC.length)]);
    setDurum(OTEL_DURUMU[Math.floor(Math.random() * OTEL_DURUMU.length)]);
    if (onAdlar.length) setOnAd(onAdlar[Math.floor(Math.random() * onAdlar.length)]);
    if (soyadlar.length) setSoyad(soyadlar[Math.floor(Math.random() * soyadlar.length)]);
    setAdim('ozet');
  };

  const ad = [onAd, soyad].filter(Boolean).join(' ');
  const cakisma = items.some(
    i => !i.archived && i.title.trim().toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr')
  );

  const kaydet = async () => {
    if (!ad || yaziliyor) return;
    setYaziliyor(true);
    try {
      await onAddItem({
        title: ad,
        area: 'duzada',
        type: 'kisi',
        status: 'Fikir',
        priority: 'orta',
        tags: ['npc', durum.etiket],
        links: [],
        // Künye metni yazılmıyor: boşluklar Kemal'in.
        notes: '',
        images: [],
        isProposal: false,
        archived: false,
        metadata: {
          profile: { profession: rol, personality: mizac, origin: '', motivation: '' },
          region: mahalle,
          npcSihirbazi: true
        }
      });
      onKapat();
    } finally {
      setYaziliyor(false);
    }
  };

  const Secenekler: React.FC<{
    liste: string[]; secili: string; sec: (s: string) => void; bosMesaj: string;
  }> = ({ liste, secili, sec, bosMesaj }) => (
    liste.length === 0 ? (
      <p className="text-[12px] text-[#9A8C76] italic">{bosMesaj}</p>
    ) : (
      <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto">
        {liste.map(x => (
          <button
            key={x}
            onClick={() => { sec(x); }}
            className={`px-3 py-1.5 text-[12px] rounded-lg border cursor-pointer transition-colors
              ${secili === x
                ? 'border-[#F26B6F] text-[#F26B6F] bg-[#FAF8F5]'
                : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] hover:border-[#F26B6F]'}`}
          >
            {x}
          </button>
        ))}
      </div>
    )
  );

  const basliklar: Record<AdimId, string> = {
    rol: 'Ne iş yapıyor?',
    mahalle: 'Nerede yaşıyor?',
    mizac: 'Nasıl biri?',
    durum: 'Oteldeki yeri ne?',
    onad: 'Ön adı',
    soyad: 'Soyadı',
    ozet: 'Özet'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4
                 bg-black/40 overflow-y-auto"
      onClick={onKapat}
    >
      <div
        className="w-full max-w-lg my-auto rounded-xl bg-[#FAF8F5] dark:bg-[#13204A]
                   border border-[#CFC5B4] dark:border-[#2C3C72] p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-mono text-sm font-bold text-[#1B2A4A] dark:text-[#F3EFE8]">
            NPC yarat · {basliklar[adim]}
          </h2>
          <span className="font-mono text-[10px] text-[#9A8C76]">
            {sira + 1}/{adimlar.length}
          </span>
        </div>
        <p className="text-[11px] text-[#9A8C76] dark:text-[#6E7CA0] mb-4">
          Hepsi tıklama. Adlar evrendeki kişilerden derleniyor, uydurulmuyor.
        </p>

        {adim === 'rol' && (
          <Secenekler liste={roller} secili={rol} sec={setRol}
            bosMesaj="Evrende henüz meslek yazılı bir kişi yok; önce bir künye doldur." />
        )}
        {adim === 'mahalle' && (
          <Secenekler liste={mahalleler} secili={mahalle} sec={setMahalle}
            bosMesaj="Kayıtlarda mahalle bilgisi yok." />
        )}
        {adim === 'mizac' && (
          <Secenekler liste={MIZAC} secili={mizac} sec={setMizac} bosMesaj="" />
        )}
        {adim === 'durum' && (
          <div className="flex flex-col gap-2">
            {OTEL_DURUMU.map(d => (
              <button
                key={d.id}
                onClick={() => setDurum(d)}
                className={`px-3 py-2 text-[12px] text-left rounded-lg border cursor-pointer
                  ${durum.id === d.id
                    ? 'border-[#F26B6F] text-[#F26B6F]'
                    : 'border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9]'}`}
              >
                {d.ad}
              </button>
            ))}
          </div>
        )}
        {adim === 'onad' && (
          <Secenekler liste={onAdlar} secili={onAd} sec={setOnAd}
            bosMesaj="Havuz boş — evrende iki parçalı adı olan kişi yok." />
        )}
        {adim === 'soyad' && (
          <Secenekler liste={soyadlar} secili={soyad} sec={setSoyad}
            bosMesaj="Havuz boş." />
        )}
        {adim === 'ozet' && (
          <div className="rounded-lg border border-[#CFC5B4] dark:border-[#2C3C72] p-4 space-y-1.5">
            <p className="font-serif font-bold text-lg text-[#1B2A4A] dark:text-[#F3EFE8]">
              {ad || '—'}
            </p>
            {[['Rol', rol], ['Mahalle', mahalle], ['Mizaç', mizac], ['Oteldeki yeri', durum.ad]]
              .map(([k, v]) => (
                <p key={k} className="text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9A8C76]">
                    {k}:
                  </span>{' '}
                  {v || <span className="italic text-[#9A8C76]">boş</span>}
                </p>
              ))}
            {cakisma && (
              <p className="text-[11px] text-[#F26B6F] pt-1">
                Bu adda bir kayıt zaten var — yine de eklersen iki kişi aynı adı taşır.
              </p>
            )}
            <p className="text-[11px] text-[#9A8C76] pt-1.5">
              Künye metni boş kalıyor; Boşluklar sayfasından doldurabilirsin.
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={geri}
            disabled={sira === 0}
            className="flex items-center gap-1 px-3 py-2 text-[11px] font-mono rounded-lg
                       border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C]
                       dark:text-[#A6B0C9] disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3" /> Geri
          </button>
          <button
            onClick={zar}
            title="Havuzdan rastgele seç"
            className="flex items-center gap-1 px-3 py-2 text-[11px] font-mono rounded-lg
                       border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C]
                       dark:text-[#A6B0C9] hover:border-[#F26B6F] cursor-pointer"
          >
            <Dices className="w-3 h-3" /> Zar at
          </button>
          <span className="flex-1" />
          {adim === 'ozet' ? (
            <button
              onClick={kaydet}
              disabled={!ad || yaziliyor}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-mono rounded-lg
                         bg-[#1B2A4A] text-[#F3EFE8] hover:opacity-90 disabled:opacity-30 cursor-pointer"
            >
              <Check className="w-3 h-3" /> {yaziliyor ? 'Ekleniyor…' : 'Kişiyi ekle'}
            </button>
          ) : (
            <button
              onClick={ileri}
              className="px-4 py-2 text-[11px] font-mono rounded-lg bg-[#1B2A4A]
                         text-[#F3EFE8] hover:opacity-90 cursor-pointer"
            >
              İleri
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NpcSihirbazi;
