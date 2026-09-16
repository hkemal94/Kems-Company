import React, { useMemo } from 'react';
import { ArrowRight, CircleCheck, Compass } from 'lucide-react';
import type { AreaType, Item } from '../types';
import { DUZADA_GEO } from '../data/duzadaGeo';
import { isStub } from './wiki/wikiSchema';
import { getRol } from './wiki/kunyeParser';
import { isEntityUnlinked } from '../utils/relations';

/**
 * "Neyin eksik" paneli (A1).
 *
 * Anasayfada zaten sayılar vardı: 93 kişi, 43 mekân, 3 marka. Ama sayı
 * "ne yapmam lazım" sorusuna cevap vermiyor. 93 kişinin kaçının görevi boş,
 * haritadaki kaç yapının maddesi hiç açılmamış, hangi markanın sloganı yok —
 * bunları görmek için tek tek gezmek gerekiyordu.
 *
 * Bu panel onları tek ekranda topluyor. Her satır: kaç tane, neyin eksik,
 * tıklayınca nereye gidiyor. Hiçbir şey eksik değilse panel kendini gizler —
 * boş bir "her şey yolunda" kutusu yer kaplamasın.
 *
 * Kural: uydurma iş üretmiyor. Her satır gerçek bir veriden sayılıyor;
 * sayı sıfırsa satır yok.
 */

export interface Eksik {
  anahtar: string;
  sayi: number;
  baslik: string;
  aciklama: string;
  alan: AreaType;
  /** Tıklayınca açılacak madde — varsa doğrudan oraya gider */
  hedefId?: string;
}

/** Haritada maddesi olması gereken yapılar */
function haritaBeklentisi(): Array<{ wikiId: string; ad: string }> {
  const cikti: Array<{ wikiId: string; ad: string }> = [];
  for (const f of DUZADA_GEO.features) {
    const p = f.properties as Record<string, unknown> | null;
    if (!p || p.katman !== 'bina') continue;
    if (typeof p.wikiId !== 'string' || !p.wikiId) continue;
    if (cikti.some(x => x.wikiId === p.wikiId)) continue;  // otelin kuleleri
    cikti.push({ wikiId: p.wikiId, ad: String(p.ad || '') });
  }
  return cikti;
}

/**
 * Kişinin rolü belli mi.
 *
 * Rol ayrı bir metadata alanı DEĞİL: künye metninden, profilden ya da
 * etiketten çözülüyor. İlk yazdığımda metadata'da `gorev` diye bir alan
 * aradım, öyle bir alan yok, o yüzden 94 kişinin 94'ü "eksik" çıktı —
 * hiçbir işe yaramayan bir sayı. getRol uygulamanın kendi çözümleyicisi.
 */
function rolBos(i: Item): boolean {
  return !getRol(i).trim();
}

export function eksikleriCikar(items: Item[]): Eksik[] {
  const canli = items.filter(i => !i.archived);
  const kimlikler = new Set(canli.map(i => i.id));
  const eksikler: Eksik[] = [];

  // --- Harita: maddesi hiç açılmamış yapılar
  const maddesiz = haritaBeklentisi().filter(b => !kimlikler.has(b.wikiId));
  if (maddesiz.length) {
    eksikler.push({
      anahtar: 'harita-madde',
      sayi: maddesiz.length,
      baslik: 'yapının maddesi yok',
      aciklama: maddesiz.slice(0, 3).map(b => b.ad).join(', ')
        + (maddesiz.length > 3 ? '…' : '')
        + ' · haritada üstüne tıkla, künyesi haritadan dolsun',
      alan: 'duzada'
    });
  }

  // --- Wiki: açılmış ama içi boş maddeler
  const wikiTipleri = new Set(['mekân', 'dükkân', 'kulüp', 'yer', 'kisi', 'karakter']);
  const taslaklar = canli.filter(
    i => wikiTipleri.has(i.type) && !i.isProposal && isStub(i)
  );
  if (taslaklar.length) {
    eksikler.push({
      anahtar: 'taslak',
      sayi: taslaklar.length,
      baslik: 'madde taslak hâlde',
      aciklama: 'künyesi ya da gövdesi doldurulmayı bekliyor',
      alan: 'duzada',
      hedefId: taslaklar[0].id
    });
  }

  // --- Wiki: evrende hiçbir şeye bağlı olmayanlar
  const kopuk = canli.filter(
    i => wikiTipleri.has(i.type) && !i.isProposal && isEntityUnlinked(i, canli)
  );
  if (kopuk.length) {
    eksikler.push({
      anahtar: 'kopuk',
      sayi: kopuk.length,
      baslik: 'madde hiçbir şeye bağlı değil',
      aciklama: 'bağlanmayan madde wiki\'yi ölü gösterir — en az bir ilişki kur',
      alan: 'duzada',
      hedefId: kopuk[0].id
    });
  }

  // --- Kişiler: görevi yazılmamış olanlar
  const gorevsiz = canli.filter(
    i => (i.type === 'kisi' || i.type === 'karakter') && !i.isProposal && rolBos(i)
  );
  if (gorevsiz.length) {
    eksikler.push({
      anahtar: 'gorev',
      sayi: gorevsiz.length,
      baslik: 'kişinin rolü belli değil',
      aciklama: 'künyesinde ne iş yaptığı yazmıyor',
      alan: 'duzada',
      hedefId: gorevsiz[0].id
    });
  }

  // --- Mekânlar: adı hâlâ jenerik olanlar
  const adsiz = canli.filter(i => !i.isProposal && i.metadata?.adiGecici);
  if (adsiz.length) {
    eksikler.push({
      anahtar: 'ad',
      sayi: adsiz.length,
      baslik: 'yerin adı hâlâ geçici',
      aciklama: adsiz.slice(0, 3).map(i => i.title).join(', '),
      alan: 'duzada',
      hedefId: adsiz[0].id
    });
  }

  // --- Markalar: künyesi yarım olanlar
  /*
   * Marka künyesinin VAR olması yetmiyor: uygulama yeni marka açarken
   * hazır bir kit koyuyor — font 'Inter', palet rastgele. Küçükçetmi'nin
   * kaydında böyle bir palet duruyordu, gerçek markayla (krem + mürekkep)
   * hiç ilgisi yoktu. O yüzden ölçü "kit var mı" değil, "kit gerçek mi".
   */
  const markalar = canli.filter(i => i.type === 'marka' && !i.isProposal);
  const varsayilanMarka = markalar.filter(i => {
    const bk = i.metadata?.brandKit;
    if (!bk) return true;
    const fontVarsayilan = !bk.selectedFont || bk.selectedFont.trim() === 'Inter';
    const paletBos = !bk.colorPalette?.length;
    const sessiz = !bk.slogan?.trim() && !bk.voiceTone?.trim();
    return fontVarsayilan || paletBos || sessiz;
  });
  if (varsayilanMarka.length) {
    eksikler.push({
      anahtar: 'marka',
      sayi: varsayilanMarka.length,
      baslik: 'markanın künyesi hâlâ varsayılan',
      aciklama: varsayilanMarka.map(i => i.title).join(', ')
        + ' · Markalar\'daki "Canva künyelerini uygula" düğmesi bunu doldurur',
      alan: 'markalar',
      hedefId: varsayilanMarka[0].id
    });
  }

  // --- Merch: dropu olmayan ürün
  const droplar = new Set(canli.filter(i => i.type === 'drop').map(i => i.id));
  const dropsuzUrun = canli.filter(
    i => i.type === 'merch_urun' && !i.isProposal
      && !droplar.has(String(i.metadata?.dropId || ''))
  );
  if (dropsuzUrun.length) {
    eksikler.push({
      anahtar: 'urun-drop',
      sayi: dropsuzUrun.length,
      baslik: 'ürün bir dropa bağlı değil',
      aciklama: dropsuzUrun.slice(0, 3).map(i => i.title).join(', '),
      alan: 'merch',
      hedefId: dropsuzUrun[0].id
    });
  }

  // --- Merch: teması olmayan drop
  const temasizDrop = canli.filter(
    i => i.type === 'drop' && !i.isProposal && !i.metadata?.themeId
  );
  if (temasizDrop.length) {
    eksikler.push({
      anahtar: 'drop-tema',
      sayi: temasizDrop.length,
      baslik: 'dropun teması seçilmemiş',
      aciklama: temasizDrop.map(i => i.title).join(', '),
      alan: 'merch',
      hedefId: temasizDrop[0].id
    });
  }

  return eksikler.sort((a, b) => b.sayi - a.sayi);
}

interface EksiklerProps {
  items: Item[];
  onSelectArea: (area: AreaType, itemId?: string) => void;
}

export const Eksikler: React.FC<EksiklerProps> = ({ items, onSelectArea }) => {
  const eksikler = useMemo(() => eksikleriCikar(items), [items]);

  // Veri henüz yüklenmediyse panel açılmasın: boş listeyi "her şey tamam"
  // diye göstermek yanlış olur.
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-[12px] font-bold text-[#6A5E4C] dark:text-[#A6B0C9] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <Compass className="w-4 h-4 text-[#D35057]" />
        Neyin Eksik
      </h2>

      {eksikler.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A]">
          <CircleCheck className="w-4 h-4 text-[#4A5E68] shrink-0" />
          <p className="text-[13px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            Takip ettiğim boşluk kalmadı. Yeni bir şey eklediğinde burası
            kendiliğinden dolar.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {eksikler.map(e => (
            <li key={e.anahtar}>
              <button
                type="button"
                onClick={() => onSelectArea(e.alan, e.hedefId)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] hover:border-[#D35057] dark:hover:border-[#D35057] transition-colors cursor-pointer group archive-shadow"
              >
                <span className="font-mono text-lg font-bold text-[#D35057] leading-none mt-0.5 shrink-0 tabular-nums">
                  {e.sayi}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[#1B2A4A] dark:text-[#F3EFE8]">
                    {e.baslik}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-[#9A8C76] dark:text-[#6E7CA0] leading-snug">
                    {e.aciklama}
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 mt-1 shrink-0 text-[#CFC5B4] dark:text-[#2C3C72] group-hover:text-[#D35057] transition-colors" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Eksikler;
