import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Item } from '../../types';
import type { Bosluk } from '../Bosluklar';
import { getKunyeFields, getArticleBody, TYPE_LABELS } from '../wiki/wikiSchema';
import { ADA_KIMLIGI } from '../../lib/vikiSifirlama';
import { aiCagir } from '../../lib/aiCagir';
import { seceneksizMi } from '../../lib/adaylar';
import { DUGME_BOS, DUGME_LAC, IKINCIL, YAZI } from './stil';

/**
 * Tıklamalı kanon sorusu (Paket 4) — günün sorusu ve atölye kartları.
 *
 * Soru, vikideki gerçek bir boşluktan gelir (Boşluklar sayfasının
 * soruları). Yapay zekâ en fazla üç kısa seçenek getirir; ad ya da sayı
 * soran sorularda getirmez. Hangi cevap seçilirse seçilsin vikiye doğrudan
 * yazılmaz: Adaylar'a düşer, Kemal "İşle" deyince maddeye geçer.
 */

const ONBELLEK = 'kems_soru_secenekleri';

function onbellektenOku(anahtar: string): string[] | null {
  try { return JSON.parse(localStorage.getItem(ONBELLEK) || '{}')[anahtar] ?? null; } catch { return null; }
}
function onbellegeYaz(anahtar: string, s: string[]) {
  try {
    const t = JSON.parse(localStorage.getItem(ONBELLEK) || '{}');
    t[anahtar] = s;
    localStorage.setItem(ONBELLEK, JSON.stringify(t));
  } catch { /* yok */ }
}

/** Yapay zekânın cevabından seçenek dizisi — bozuk gelirse boş */
function secenekleriAyikla(ham: unknown): string[] {
  let v = ham;
  if (typeof v === 'string') {
    try { v = JSON.parse(v.replace(/^```(json)?|```$/gm, '').trim()); } catch { return []; }
  }
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(x => x.trim()).slice(0, 3)
    : [];
}

interface Props {
  bosluk: Bosluk;
  items: Item[];
  onCevap: (cevap: string, secenektenMi: boolean) => Promise<void>;
  onSonra: () => void;
  /** Günün sorusu seçenekleri kendiliğinden ister; atölye düğmeyle */
  kendiliginden?: boolean;
  buyuk?: boolean;
}

export const SoruKarti: React.FC<Props> = ({ bosluk, items, onCevap, onSonra, kendiliginden = false, buyuk = false }) => {
  const seceneksiz = seceneksizMi(bosluk);
  const [secenekler, setSecenekler] = useState<string[] | null>(() => onbellektenOku(bosluk.anahtar));
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kutuAcik, setKutuAcik] = useState(seceneksiz);
  const [metin, setMetin] = useState('');
  const [yaziliyor, setYaziliyor] = useState(false);

  const getir = async () => {
    if (seceneksiz || yukleniyor) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const ada = items.find(i => i.id === ADA_KIMLIGI);
      const sonuc = await aiCagir('kanon-sorusu-secenek', {
        madde: bosluk.item.title,
        etiket: bosluk.etiket,
        soru: bosluk.soru,
        baglam: {
          tur: TYPE_LABELS[bosluk.item.type] || bosluk.item.type,
          kunye: getKunyeFields(bosluk.item).map(f => `${f.label}: ${f.value}`),
          metin: getArticleBody(bosluk.item).map(b => b.text).join('\n').slice(0, 1200)
        },
        ada: ada ? [getKunyeFields(ada).map(f => `${f.label}: ${f.value}`).join('; '), (ada.notes || '').slice(0, 1500)].join('\n') : ''
      });
      const s = secenekleriAyikla(sonuc);
      setSecenekler(s);
      if (s.length) onbellegeYaz(bosluk.anahtar, s);
      else setKutuAcik(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Seçenek gelmedi.');
      setKutuAcik(true);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    setSecenekler(onbellektenOku(bosluk.anahtar));
    setKutuAcik(seceneksiz);
    setMetin('');
    setHata(null);
    if (kendiliginden && !seceneksiz && !onbellektenOku(bosluk.anahtar)) void getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bosluk.anahtar]);

  const gonder = async (cevap: string, secenektenMi: boolean) => {
    if (!cevap.trim() || yaziliyor) return;
    setYaziliyor(true);
    try { await onCevap(cevap.trim(), secenektenMi); } finally { setYaziliyor(false); }
  };

  const secenekSinifi = `block w-full text-left rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] hover:border-[#F26B6F] ${YAZI} cursor-pointer disabled:opacity-40 ${buyuk ? 'px-3.5 py-3 text-[14px] lg:py-2 lg:text-[12px]' : 'px-3 py-2 text-[12px]'}`;

  return (
    <div>
      <p className={`text-[11px] ${IKINCIL}`}>
        {TYPE_LABELS[bosluk.item.type] || bosluk.item.type} · <b className={YAZI}>{bosluk.item.title}</b> · {bosluk.etiket}
      </p>
      <h3 className={`mt-1 font-semibold leading-snug ${YAZI} ${buyuk ? 'text-[16px]' : 'text-[13px]'}`}>{bosluk.soru}</h3>

      <div className="mt-3 space-y-1.5">
        {yukleniyor && <p className={`text-[11px] ${IKINCIL} animate-pulse`}>Seçenekler kanondan hazırlanıyor…</p>}
        {!seceneksiz && secenekler?.map(s => (
          <button key={s} type="button" disabled={yaziliyor} onClick={() => gonder(s, true)} className={secenekSinifi}>
            {s}
          </button>
        ))}
        {!seceneksiz && !secenekler && !yukleniyor && !kendiliginden && (
          <button type="button" onClick={getir} className={`${DUGME_BOS} inline-flex items-center gap-1.5`}>
            <Sparkles className="w-3.5 h-3.5 text-[#F26B6F]" /> Seçenek getir
          </button>
        )}
        {seceneksiz && (
          <p className={`text-[11px] ${IKINCIL}`}>Bu soru bir ad ya da sayı istiyor; seçenek getirmiyorum, sen yaz.</p>
        )}
        {hata && <p className="text-[11px] text-[#B23A40] dark:text-[#F26B6F]">{hata} Kendin yazabilirsin.</p>}

        {kutuAcik ? (
          <div className="flex items-start gap-2 pt-1">
            <textarea
              rows={2}
              value={metin}
              onChange={e => setMetin(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void gonder(metin, false); }}
              placeholder="Cevabın…"
              className={`flex-1 min-w-0 text-[13px] bg-white dark:bg-[#17345A] ${YAZI} border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-2 focus:outline-hidden focus:border-[#F26B6F]`}
            />
            <button type="button" onClick={() => gonder(metin, false)} disabled={!metin.trim() || yaziliyor} className={DUGME_LAC}>
              Adaylara al
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setKutuAcik(true)} className={secenekSinifi}>
            Kendim yazayım
          </button>
        )}
        <button type="button" onClick={onSonra} className={`${secenekSinifi} !border-dashed`}>
          Sonra karar veririm
        </button>
      </div>
    </div>
  );
};

export default SoruKarti;
