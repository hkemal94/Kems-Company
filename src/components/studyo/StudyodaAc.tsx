import React from 'react';
import { Sparkles } from 'lucide-react';
import { useStudyo, type StudyoIstegi } from './StudyoBaglami';

/**
 * Sayfalardaki tek yapay zekâ düğmesi: "✨ Stüdyoda aç" (Kemal, 29 Eylül).
 * Basınca stüdyo yan panelde, o madde seçili açılır.
 */
export const StudyodaAc: React.FC<StudyoIstegi & { etiket?: string; className?: string }> = ({ etiket = 'Stüdyoda aç', className, ...istek }) => {
  const { ac } = useStudyo();
  return (
    <button
      type="button"
      onClick={() => ac(istek)}
      className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#CFC5B4] dark:border-[#2C3C72] text-[#0E1C4F] dark:text-[#F3EFE8] hover:border-[#F26B6F] cursor-pointer'}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#F26B6F]" /> {etiket}
    </button>
  );
};

export default StudyodaAc;
