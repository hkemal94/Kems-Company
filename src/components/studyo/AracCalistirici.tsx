import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Item } from '../../types';
import { araciCalistir, oneriKaydi, type StudyoAraci } from '../../lib/studyo';
import { TYPE_LABELS } from '../wiki/wikiSchema';
import { DUGME_LAC, ETIKET, IKINCIL, YAZI } from '../anasayfa/stil';
import { OneriTepsisi } from './OneriTepsisi';
import type { StudyoIslemleri } from './StudyoBaglami';

/**
 * Tek bir stüdyo aracının çalışma alanı: kaydı seç, (varsa) notunu yaz,
 * "Çalıştır". Sonuç öneri tepsisine düşer ve hemen altında görünür.
 */

const EK_TURLER: Record<string, string> = { blog_post: 'Blog yazısı', kitap_bolum: 'Kitap bölümü', drop: 'Drop' };

interface Props extends StudyoIslemleri {
  arac: StudyoAraci;
  hedefId?: string;
  /** Serbest kutunun ilk yazısı */
  serbestIlk?: string;
  /** Kota dolu ya da sunucu yoksa düğme kapalı */
  kapali?: string | null;
  onDurum?: () => void;
}

export const AracCalistirici: React.FC<Props> = ({ arac, hedefId: ilkHedef, serbestIlk, kapali, onDurum, ...islemler }) => {
  const { items, onAddItem } = islemler;
  const adaylar = useMemo(() => items
    .filter(i => !i.archived && !i.isProposal && arac.hedefTurleri?.includes(i.type))
    .sort((a, b) => a.title.localeCompare(b.title, 'tr')), [items, arac]);
  const [hedefId, setHedefId] = useState<string>(ilkHedef && adaylar.some(a => a.id === ilkHedef) ? ilkHedef : '');
  const [serbest, setSerbest] = useState(serbestIlk || '');
  // Kayıt seçilmeden çalışan araçlar (fanzin): kaynak bütün kayıtlar
  const hedefsiz = arac.hedefTurleri === null;
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(false);
  const hedef: Item | null = items.find(i => i.id === hedefId) || null;

  const calistir = async () => {
    if ((!hedef && !hedefsiz) || calisiyor) return;
    setCalisiyor(true); setHata(null); setBitti(false);
    try {
      const sonuc = await araciCalistir(arac, hedef, serbest, items);
      await onAddItem(oneriKaydi(arac, hedef, sonuc));
      setBitti(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Bilinmeyen hata.');
    } finally {
      setCalisiyor(false);
      onDurum?.();
    }
  };

  const secimSinifi = `w-full text-[13px] bg-white dark:bg-[#17345A] ${YAZI} border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg p-2 focus:outline-hidden focus:border-[#F26B6F]`;

  return (
    <div className="space-y-3">
      <div>
        <div className={ETIKET}>{arac.ad}</div>
        <p className={`mt-1 text-[12px] leading-snug ${IKINCIL}`}>{arac.aciklama}</p>
      </div>
      {!hedefsiz && <label className="block">
        <span className={`block mb-1 text-[11px] ${IKINCIL}`}>Hangi kayıt?</span>
        <select value={hedefId} onChange={e => { setHedefId(e.target.value); setBitti(false); }} className={secimSinifi}>
          <option value="">Seç…</option>
          {adaylar.map(a => <option key={a.id} value={a.id}>{a.title} · {TYPE_LABELS[a.type] || EK_TURLER[a.type] || a.type}</option>)}
        </select>
      </label>}
      {arac.serbest && (
        <label className="block">
          <span className={`block mb-1 text-[11px] ${IKINCIL}`}>{arac.serbest}</span>
          <textarea rows={2} value={serbest} onChange={e => setSerbest(e.target.value)} className={secimSinifi} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={calistir} disabled={(!hedef && !hedefsiz) || calisiyor || !!kapali} className={`${DUGME_LAC} inline-flex items-center gap-1.5`}>
          <Sparkles className="w-3.5 h-3.5" /> {calisiyor ? 'Hazırlanıyor…' : 'Çalıştır'}
        </button>
        {kapali && <span className="text-[11px] text-[#B23A40] dark:text-[#F26B6F]">{kapali}</span>}
      </div>
      {hata && <p className="text-[12px] text-[#B23A40] dark:text-[#F26B6F]">{hata}</p>}
      {bitti && <p className={`text-[12px] ${IKINCIL}`}>Öneri tepsiye düştü. Ekle demeden hiçbir kayda yazılmaz.</p>}
      {hedef && (
        <OneriTepsisi {...islemler} hedefId={hedef.id} baslik={`${hedef.title} için öneriler`} />
      )}
    </div>
  );
};

export default AracCalistirici;
