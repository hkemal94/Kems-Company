import React, { useEffect, useState } from 'react';
import type { Bosluk } from '../Bosluklar';
import { TYPE_LABELS } from '../wiki/wikiSchema';
import { seceneksizMi } from '../../lib/adaylar';
import { secenekleriOku, SECENEK_OLAYI } from '../../lib/soruSecenekleri';
import { StudyodaAc } from '../studyo/StudyodaAc';
import { DUGME_LAC, IKINCIL, YAZI } from './stil';

/**
 * Tıklamalı kanon sorusu (Paket 4) — günün sorusu ve atölye kartları.
 *
 * Soru, vikideki gerçek bir boşluktan gelir (Boşluklar sayfasının
 * soruları). Seçenekleri yapay zekâ stüdyoda getirir (29 Eylül akşamı:
 * sayfa açılınca kendiliğinden sorulmuyor); getirilmişse burada görünür.
 * Ad ya da sayı soran sorulara seçenek getirilmez. Hangi cevap seçilirse
 * seçilsin vikiye doğrudan yazılmaz: öneri tepsisine düşer, Kemal "İşle"
 * deyince maddeye geçer.
 */

interface Props {
  bosluk: Bosluk;
  onCevap: (cevap: string, secenektenMi: boolean) => Promise<void>;
  onSonra: () => void;
  buyuk?: boolean;
}

export const SoruKarti: React.FC<Props> = ({ bosluk, onCevap, onSonra, buyuk = false }) => {
  const seceneksiz = seceneksizMi(bosluk);
  const [secenekler, setSecenekler] = useState<string[] | null>(() => secenekleriOku(bosluk.anahtar));
  const [kutuAcik, setKutuAcik] = useState(seceneksiz);
  const [metin, setMetin] = useState('');
  const [yaziliyor, setYaziliyor] = useState(false);

  useEffect(() => {
    setSecenekler(secenekleriOku(bosluk.anahtar));
    setKutuAcik(seceneksiz);
    setMetin('');
    // Stüdyo seçenek getirince haber verir
    const bak = () => setSecenekler(secenekleriOku(bosluk.anahtar));
    window.addEventListener(SECENEK_OLAYI, bak);
    return () => window.removeEventListener(SECENEK_OLAYI, bak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bosluk.anahtar]);

  const gonder = async (cevap: string, secenektenMi: boolean) => {
    if (!cevap.trim() || yaziliyor) return;
    setYaziliyor(true);
    try { await onCevap(cevap.trim(), secenektenMi); } finally { setYaziliyor(false); }
  };

  const secenekSinifi = `block w-full text-left rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] hover:border-[#F26B6F] ${YAZI} cursor-pointer disabled:opacity-40 ${buyuk ? 'px-3.5 py-3 text-[14px] lg:py-2 lg:text-[12px]' : 'px-3 py-2 text-[12px]'}`;

  return (
    <div className="h-full flex flex-col">
      <p className={`text-[11px] ${IKINCIL}`}>
        {TYPE_LABELS[bosluk.item.type] || bosluk.item.type} · <b className={YAZI}>{bosluk.item.title}</b> · {bosluk.etiket}
      </p>
      <h3 className={`mt-1 font-semibold leading-snug ${YAZI} ${buyuk ? 'text-[16px]' : 'text-[13px]'}`}>{bosluk.soru}</h3>

      <div className="mt-auto pt-3 space-y-1.5">
        {!seceneksiz && secenekler?.map(s => (
          <button key={s} type="button" disabled={yaziliyor} onClick={() => gonder(s, true)} className={secenekSinifi}>
            {s}
          </button>
        ))}
        {!seceneksiz && (
          <StudyodaAc bosluk={bosluk} etiket={secenekler ? 'Başka seçenek · stüdyoda' : 'Seçenek getir · stüdyoda'} />
        )}
        {seceneksiz && (
          <p className={`text-[11px] ${IKINCIL}`}>Bu soru bir ad ya da sayı istiyor; seçenek getirmiyorum, sen yaz.</p>
        )}

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
              Tepsiye al
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
