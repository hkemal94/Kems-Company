import React from 'react';
import { Box, CalendarDays, Globe, ListChecks, Megaphone, Milestone, Newspaper, Percent, Sparkles } from 'lucide-react';
import { ETIKET, IKINCIL, KART, YAZI } from '../anasayfa/stil';

/**
 * Araçlar ekranı (30 Eylül, Kemal: "büyük şeyler çok derinlere saklanmış").
 * Bütün araçlar tek ekranda, büyük kartlarla. Menüde de her birinin kendi
 * satırı var; bu ekran hepsine bir arada bakmak için.
 */

export const ARACLAR: Array<{ id: string; ad: string; alt: string; simge: React.ElementType }> = [
  { id: 'studyo3b', ad: '3B stüdyo', alt: 'Tişört ve sweatshirt üzerinde renk ve baskı denemesi', simge: Box },
  { id: 'fanzin', ad: 'Fanzin', alt: 'Aylık fanzin: taslak, dergi görünümü, PDF, karusel', simge: Newspaper },
  { id: 'takvim', ad: 'Takvim', alt: 'Drop çıkışları, gönderiler, fanzin günü', simge: CalendarDays },
  { id: 'yolharitasi', ad: 'Yol haritası', alt: 'Sıradaki işler, hedefler, haftalık özet', simge: Milestone },
  { id: 'studyo', ad: 'Yapay zekâ stüdyosu', alt: 'Öneri tepsisi ve yapay zekâ araçları', simge: Sparkles },
  { id: 'sosyal', ad: 'Sosyal medya', alt: 'Gönderi takvimi ve seriler', simge: Megaphone },
  { id: 'site', ad: 'Site', alt: 'kems.company düzenleme ve önizleme', simge: Globe },
  { id: 'eksikler', ad: 'Neyin Eksik', alt: 'Tek seferlik düğmeler ve eksikler', simge: ListChecks },
  { id: 'durum', ad: 'Durum', alt: 'Yüzdeler ve boşluklar', simge: Percent }
];

export const Araclar: React.FC<{ onGit: (id: string) => void }> = ({ onGit }) => (
  <div className="space-y-4 animate-in fade-in duration-300">
    <div>
      <div className={ETIKET}>Komuta Merkezi</div>
      <h1 className={`mt-1 text-[22px] lg:text-[28px] font-bold tracking-tight ${YAZI}`}>Araçlar</h1>
      <p className={`mt-1 text-[13px] ${IKINCIL}`}>Bütün araçlar bir arada. Her biri menüde de kendi satırında.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {ARACLAR.map(a => (
        <button key={a.id} type="button" onClick={() => onGit(a.id)}
          className={`${KART} p-4 text-left hover:border-[#F26B6F] cursor-pointer min-w-0`}>
          <a.simge className="w-6 h-6 text-[#F26B6F]" />
          <span className={`mt-3 block text-[15px] font-bold ${YAZI}`}>{a.ad}</span>
          <span className={`mt-1 block text-[12px] leading-snug ${IKINCIL}`}>{a.alt}</span>
        </button>
      ))}
    </div>
  </div>
);

export default Araclar;
