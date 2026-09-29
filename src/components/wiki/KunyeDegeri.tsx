import React from 'react';
import { renkKodlari } from './wikiSchema';

/**
 * Künye / Bilgiler değeri. İçinde renk kodu varsa (#0E1C4F) her renk küçük
 * bir kutucuk olarak çizilir, yanında adı durur (Kemal, 29 Eylül: "renkleri
 * ikon olarak künyeye koyman daha sağlıklı olur"). Kod, kutucuğun
 * üstüne gelince görünür.
 */
export const KunyeDegeri: React.FC<{ value: string }> = ({ value }) => {
  if (!renkKodlari(value).length) return <>{value}</>;
  const parcalar = value.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1.5">
      {parcalar.map((p, i) => {
        const kod = renkKodlari(p)[0];
        const ad = p.replace(/#[0-9a-f]{3,6}\b/gi, '').replace(/[()]/g, '').trim();
        return (
          <span key={i} className="inline-flex items-center gap-1.5" title={kod || undefined}>
            {kod && (
              <span
                className="inline-block w-4 h-4 rounded-full border border-lacivert/25 dark:border-krem/40 shrink-0"
                style={{ background: kod }}
              />
            )}
            <span>{ad || kod}</span>
          </span>
        );
      })}
    </span>
  );
};

