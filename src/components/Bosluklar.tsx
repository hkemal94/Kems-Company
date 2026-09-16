import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, PenLine } from 'lucide-react';
import type { Item, ItemType } from '../types';
import { DEFAULT_QUESTIONS_BY_CAT } from './wiki/kunyeSorulari';
import { schemaKeyFor, TYPE_LABELS, WIKI_TYPES } from './wiki/wikiSchema';
import { SayfaRayi, type RayBolumu } from './SayfaRayi';

/**
 * Boşluklar (34 cevabın 17. ve 34. maddeleri).
 *
 * Kemal: "Ben bunu pek doldurmak istemiyorum. Elindekilerle süreci bitir,
 * boşlukları bana bir sayfada tane tane sağla, ben doldururum."
 * Ve: "Sen aç bana bir düğme, yazma; sonrasında ben içlerindeki boşlukları
 * düzenlerim."
 *
 * Bu sayfanın tek işi o: evrende doldurulmamış her alanı tek tek listelemek
 * ve yanına bir kutu koymak. Buraya hiçbir metin üretilmiyor — ne öneri, ne
 * taslak, ne "örnek olsun diye" bir cümle. Kutular boş açılır, Kemal yazar.
 *
 * Alanlar künye sorularından geliyor (kunyeSorulari.ts): her madde türünün
 * hangi alanları olduğu zaten orada tanımlı, burada yeniden uydurulmuyor.
 */

const RAY_BOLUMLERI: RayBolumu[] = [
  { id: 'bos-ozet', label: 'Özet' },
  { id: 'bos-liste', label: 'Boşluklar' }
];

/* --- fieldPath okuma/yazma ---------------------------------------- */

function oku(item: Item, yol: string): string {
  const parcalar = yol.split('.');
  let v: any = item;
  for (const p of parcalar) {
    if (v == null) return '';
    v = v[p];
  }
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

/**
 * Yolu yazar, ara nesneleri kopyalayarak.
 *
 * Firestore notu: `undefined` yazmak bütün kaydı reddettiriyor, o yüzden
 * boş değer yazılmıyor — boşsa hiç çağrılmıyor.
 */
function yaz(item: Item, yol: string, deger: string): Item {
  const parcalar = yol.split('.');
  const kok: any = { ...item };
  let dugum: any = kok;
  for (let i = 0; i < parcalar.length - 1; i++) {
    const p = parcalar[i];
    dugum[p] = { ...(dugum[p] || {}) };
    dugum = dugum[p];
  }
  dugum[parcalar[parcalar.length - 1]] = deger;
  kok.updatedAt = Date.now();
  return kok as Item;
}

/* --- boşlukların çıkarılması --------------------------------------- */

export interface Bosluk {
  anahtar: string;
  item: Item;
  alanId: string;
  etiket: string;
  soru: string;
  yol: string;
}

/** Başlık zaten dolu sayılır; onu boş bırakan kayıt yok. */
const ATLANAN_ALAN = new Set(['title']);

export function bosluklariCikar(items: Item[]): Bosluk[] {
  const cikti: Bosluk[] = [];
  for (const item of items) {
    if (item.archived || item.isProposal) continue;
    if (!WIKI_TYPES.includes(item.type as ItemType)) continue;
    const anahtar = schemaKeyFor(item.type as ItemType);
    if (!anahtar) continue;
    const sorular = DEFAULT_QUESTIONS_BY_CAT[anahtar] || [];
    for (const s of sorular) {
      if (ATLANAN_ALAN.has(s.id)) continue;
      if (oku(item, s.fieldPath).trim()) continue;
      cikti.push({
        anahtar: `${item.id}::${s.id}`,
        item,
        alanId: s.id,
        etiket: s.label,
        soru: s.question,
        yol: s.fieldPath
      });
    }
  }
  return cikti;
}

/* --- bileşen -------------------------------------------------------- */

interface BoslukSatiriProps {
  bosluk: Bosluk;
  onKaydet: (item: Item) => Promise<void>;
}

const BoslukSatiri: React.FC<BoslukSatiriProps> = ({ bosluk, onKaydet }) => {
  const [metin, setMetin] = useState('');
  const [yaziliyor, setYaziliyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  const kaydet = async () => {
    const d = metin.trim();
    if (!d || yaziliyor) return;
    setYaziliyor(true);
    try {
      await onKaydet(yaz(bosluk.item, bosluk.yol, d));
      setBitti(true);
    } finally {
      setYaziliyor(false);
    }
  };

  if (bitti) {
    return (
      <li className="flex items-center gap-2 px-4 py-2 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">
        <Check className="w-3.5 h-3.5 text-[#4A5E68] shrink-0" />
        <span className="truncate">{bosluk.etiket} yazıldı.</span>
      </li>
    );
  }

  return (
    <li className="px-4 py-3 border-t border-[#CFC5B4]/50 dark:border-[#2C3C72]/60">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[12px] font-semibold text-[#1B2A4A] dark:text-[#F3EFE8]">
          {bosluk.etiket}
        </span>
        <span className="text-[11px] text-[#9A8C76] dark:text-[#6E7CA0]">
          {bosluk.soru}
        </span>
      </div>
      <div className="mt-1.5 flex items-start gap-2">
        <textarea
          rows={2}
          value={metin}
          onChange={e => setMetin(e.target.value)}
          onKeyDown={e => {
            // Ctrl/Cmd+Enter ile kaydet — sıra sıra doldururken fare gereksiz
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void kaydet();
          }}
          placeholder="…"
          className="flex-1 text-[12px] bg-white dark:bg-[#17345A] text-[#1B2A4A]
                     dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72]
                     rounded-lg p-2 focus:outline-hidden focus:border-[#F26B6F]"
        />
        <button
          type="button"
          onClick={kaydet}
          disabled={!metin.trim() || yaziliyor}
          className="shrink-0 px-3 py-2 text-[11px] font-mono rounded-lg bg-[#1B2A4A]
                     text-[#F3EFE8] hover:opacity-90 disabled:opacity-30 cursor-pointer"
        >
          {yaziliyor ? '…' : 'Yaz'}
        </button>
      </div>
    </li>
  );
};

export const Bosluklar: React.FC<{
  items: Item[];
  onUpdateItem: (item: Item) => Promise<void>;
}> = ({ items, onUpdateItem }) => {
  const bosluklar = useMemo(() => bosluklariCikar(items), [items]);
  const [acikTur, setAcikTur] = useState<string | null>(null);
  const [acikMadde, setAcikMadde] = useState<string | null>(null);

  // Tür → madde → boşluklar
  const agac = useMemo(() => {
    const tur = new Map<string, Map<string, Bosluk[]>>();
    for (const b of bosluklar) {
      const t = String(b.item.type);
      if (!tur.has(t)) tur.set(t, new Map());
      const m = tur.get(t)!;
      if (!m.has(b.item.id)) m.set(b.item.id, []);
      m.get(b.item.id)!.push(b);
    }
    return tur;
  }, [bosluklar]);

  const turSayilari = useMemo(
    () => [...agac.entries()]
      .map(([t, m]) => ({
        tur: t,
        madde: m.size,
        bosluk: [...m.values()].reduce((n, l) => n + l.length, 0)
      }))
      .sort((a, b) => b.bosluk - a.bosluk),
    [agac]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="pb-4 border-b border-[#CFC5B4] dark:border-[#2C3C72]">
        <h1 className="font-serif font-bold text-xl text-[#1B2A4A] dark:text-[#F3EFE8] italic">
          Boşluklar
        </h1>
        <p className="mt-1 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9] max-w-2xl leading-relaxed">
          Evrende doldurulmamış her alan burada tek tek duruyor. Kutulara ben
          bir şey yazmıyorum — ne öneri ne taslak. Yazdığın anda kaydın kendisine
          geçiyor. Ctrl/⌘ + Enter da kaydeder.
        </p>
      </div>

      <SayfaRayi baslik="Boşluklar" bolumler={RAY_BOLUMLERI} />

      <section id="bos-ozet" className="scroll-mt-24">
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
            <span className="block font-mono text-2xl font-bold text-[#F26B6F] tabular-nums leading-none">
              {bosluklar.length}
            </span>
            <span className="block mt-1 text-[10px] font-mono uppercase tracking-widest text-[#6A5E4C] dark:text-[#A6B0C9]">
              boş alan
            </span>
          </div>
          {turSayilari.map(t => (
            <button
              key={t.tur}
              onClick={() => setAcikTur(acikTur === t.tur ? null : t.tur)}
              className={`px-4 py-3 rounded-xl border text-left cursor-pointer transition-colors
                ${acikTur === t.tur
                  ? 'border-[#F26B6F] bg-[#FAF8F5] dark:bg-[#13204A]'
                  : 'border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] hover:border-[#F26B6F]'}`}
            >
              <span className="block font-mono text-lg font-bold text-[#1B2A4A] dark:text-[#F3EFE8] tabular-nums leading-none">
                {t.bosluk}
              </span>
              <span className="block mt-1 text-[10px] font-mono uppercase tracking-widest text-[#6A5E4C] dark:text-[#A6B0C9]">
                {TYPE_LABELS[t.tur as ItemType] || t.tur} · {t.madde} madde
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="bos-liste" className="scroll-mt-24">
        {bosluklar.length === 0 ? (
          <p className="px-4 py-3 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72]
                        bg-[#FAF8F5] dark:bg-[#13204A] text-[13px] text-[#6A5E4C] dark:text-[#A6B0C9]">
            Takip ettiğim boş alan kalmadı.
          </p>
        ) : (
          <div className="space-y-2.5">
            {[...agac.entries()]
              .filter(([t]) => !acikTur || t === acikTur)
              .map(([t, maddeler]) => (
                <div key={t}>
                  <h2 className="mb-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em]
                                 text-[#6A5E4C] dark:text-[#A6B0C9]">
                    {TYPE_LABELS[t as ItemType] || t}
                  </h2>
                  <ul className="space-y-2">
                    {[...maddeler.entries()].map(([id, liste]) => {
                      const acik = acikMadde === id;
                      return (
                        <li
                          key={id}
                          className="rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72]
                                     bg-[#FAF8F5] dark:bg-[#13204A] overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setAcikMadde(acik ? null : id)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-left"
                          >
                            {acik
                              ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#F26B6F]" />
                              : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#CFC5B4]" />}
                            <span className="flex-1 min-w-0 text-[13px] font-semibold
                                             text-[#1B2A4A] dark:text-[#F3EFE8] truncate">
                              {liste[0].item.title}
                            </span>
                            <span className="shrink-0 flex items-center gap-1 font-mono text-[11px] text-[#F26B6F]">
                              <PenLine className="w-3 h-3" />
                              {liste.length}
                            </span>
                          </button>
                          {acik && (
                            <ul>
                              {liste.map(b => (
                                <BoslukSatiri
                                  key={b.anahtar}
                                  bosluk={b}
                                  onKaydet={onUpdateItem}
                                />
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Bosluklar;
