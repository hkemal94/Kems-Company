import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { Item } from '../types';
import { ortakAlanKayitlari, tasinacaklar } from '../lib/ortakAlan';

/**
 * Ortak alan kontrol kartı (1 Ekim). Yalnız eski ortak alanda kendi
 * alanında olmayan kayıt varsa görünür. "Taşı" kayıtları olduğu gibi
 * (oluşturulma tarihi dahil) Kemal'in alanına yazar; ortak alandan silmez.
 */
export const OrtakAlanKarti: React.FC<{ items: Item[]; onUpdateItem: (item: Item) => Promise<void> }> = ({ items, onUpdateItem }) => {
  const [ortak, setOrtak] = useState<Item[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    ortakAlanKayitlari()
      .then(k => { if (!iptal) setOrtak(k); })
      .catch(e => { if (!iptal) setHata(e instanceof Error ? e.message : String(e)); });
    return () => { iptal = true; };
  }, []);

  const liste = useMemo(() => (ortak ? tasinacaklar(ortak, items) : []), [ortak, items]);

  const tasi = async () => {
    if (calisiyor || !liste.length) return;
    if (!window.confirm(`Ortak alandaki ${liste.length} kayıt senin alanına taşınsın mı? Senin alanındaki hiçbir kayıt değişmez.`)) return;
    setCalisiyor(true);
    let n = 0;
    try {
      for (const k of liste) { await onUpdateItem(k); n++; }
      setRapor(`${n} kayıt taşındı.`);
    } catch (e) {
      setRapor(`${n} kayıt taşındı, sonra hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setCalisiyor(false);
    }
  };

  if (rapor) return <p className="mb-2.5 px-4 py-3 rounded-xl bg-[#FAF8F5] dark:bg-[#13204A] text-[13px] text-[#336659] dark:text-[#8FC4A8]">{rapor}</p>;
  if (hata) return <p className="mb-2.5 px-4 py-3 rounded-xl bg-[#FAF8F5] dark:bg-[#13204A] text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">Eski ortak alana bakılamadı ({hata}). Bu genellikle orada kayıt olmadığını ya da erişimin kapalı olduğunu gösterir.</p>;
  if (!liste.length) return null;

  const turler = Object.entries(liste.reduce<Record<string, number>>((m, i) => { m[i.type] = (m[i.type] || 0) + 1; return m; }, {}))
    .map(([t, n]) => `${n} ${t}`).join(' · ');
  return (
    <div className="mb-2.5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[#F26B6F]/40 bg-[#FAF8F5] dark:bg-[#13204A]">
      <ArrowRightLeft className="w-4 h-4 mt-0.5 shrink-0 text-[#D6484C] dark:text-[#F26B6F]" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#0E1C4F] dark:text-[#F3EFE8]">Eski ortak alanda {liste.length} kayıt var</p>
        <p className="mt-0.5 text-[12px] text-[#6A5E4C] dark:text-[#A6B0C9]">Senin alanında olmayanlar: {turler}. Taşıyınca hepsi senin alanında görünür.</p>
      </div>
      <button type="button" onClick={() => void tasi()} disabled={calisiyor} className="shrink-0 min-h-11 px-3.5 rounded-lg bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-[12px] font-semibold disabled:opacity-40 cursor-pointer">
        {calisiyor ? 'Taşınıyor…' : 'Taşı'}
      </button>
    </div>
  );
};

export default OrtakAlanKarti;
