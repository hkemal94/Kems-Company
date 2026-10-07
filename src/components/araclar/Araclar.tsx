import React from 'react';
import { SayfaBasi } from '../kabuk/SayfaBasi';
import { CalendarDays, Globe, Megaphone, Milestone, Newspaper, Percent, Sparkles } from 'lucide-react';
import { IKINCIL, KART, YAZI } from '../anasayfa/stil';

/**
 * Araçlar ekranı (30 Eylül, Kemal: "büyük şeyler çok derinlere saklanmış").
 * Bütün araçlar tek ekranda, büyük kartlarla. Menüde de her birinin kendi
 * satırı var; bu ekran hepsine bir arada bakmak için.
 */

export const ARACLAR: Array<{ id: string; ad: string; alt: string; simge: React.ElementType }> = [
  { id: 'fanzin', ad: 'Fanzin', alt: 'Aylık fanzin: taslak, dergi görünümü, PDF, karusel', simge: Newspaper },
  { id: 'takvim', ad: 'Takvim', alt: 'Tek takvim: drop çıkışları, gönderiler, fanzin günü', simge: CalendarDays },
  { id: 'yolharitasi', ad: 'Yol haritası', alt: 'Sıradaki işler, hedefler, haftalık özet', simge: Milestone },
  { id: 'studyo', ad: 'Yapay zekâ', alt: 'Öneri tepsisi ve yapay zekâ araçları', simge: Sparkles },
  { id: 'sosyal', ad: 'Sosyal medya', alt: 'Gönderi fikirleri, seriler, Instagram ızgarası', simge: Megaphone },
  { id: 'site', ad: 'Site', alt: 'kems.company düzenleme ve önizleme', simge: Globe },
  { id: 'durum', ad: 'Durum', alt: 'Yüzdeler, eksikler ve boşluklar', simge: Percent }
];

export const Araclar: React.FC<{ onGit: (id: string) => void }> = ({ onGit }) => (
  <div className="space-y-4 animate-in fade-in duration-300">
    <SayfaBasi baslik="Bütün araçlar" />
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
