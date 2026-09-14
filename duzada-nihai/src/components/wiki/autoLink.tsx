import React from 'react';
import { Item } from '../../types';

/**
 * Otomatik bağlantı motoru.
 *
 * Wiki'yi "kendi kendine konuşan" hale getiren parça budur: bir maddenin
 * metninde başka bir maddenin adı geçtiğinde, o ad otomatik olarak
 * bağlantıya dönüşür. Kemal'in elle [[...]] yazmasına gerek yoktur —
 * ama isterse [[Ada Adı]] sözdizimi de desteklenir ve önceliklidir.
 */

export interface LinkIndexEntry {
  id: string;
  title: string;
  type: string;
  /** Eşleşmede kullanılacak tüm adlar: başlık + varsa takma adlar */
  names: string[];
}

/** Türkçe duyarlı küçültme (I/İ sorunu için) */
const trLower = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLocaleLowerCase('tr');

/**
 * Bunlar bağlanmaz. "Liman" hem bir mahallenin adı hem sıradan bir kelime;
 * "Liman ve Peron restoran" cümlesindeki liman, mahalle değildir. Böyle
 * genel kelimeleri ancak açık [[Liman Mahallesi]] yazımıyla bağlarız.
 */
const BAGLANMAZ = new Set([
  'liman', 'iskele', 'ada', 'merkez', 'çiftlik', 'stadyum', 'fener',
  'oda', 'otel', 'bar', 'restoran', 'kadro', 'misafir', 'sokak', 'cadde'
]);

/** Regex için kaçış */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Bağlantı indeksini kurar. Uzun adlar önce gelir ki
 * "Küçükçetmi Sürek Kulübü" varken sadece "Küçükçetmi" eşleşmesin.
 */
export function buildLinkIndex(items: Item[]): LinkIndexEntry[] {
  const entries: LinkIndexEntry[] = [];

  items.forEach(item => {
    if (item.archived) return;
    const title = (item.title || '').trim();
    if (title.length < 3) return; // "01" gibi başlıklar metni kirletir

    const aliases: string[] = Array.isArray(item.metadata?.aliases)
      ? item.metadata!.aliases.filter((a: unknown): a is string => typeof a === 'string')
      : [];

    const names = Array.from(new Set([title, ...aliases]))
      .map(n => n.trim())
      .filter(n => n.length >= 3);

    if (names.length === 0) return;

    entries.push({ id: item.id, title, type: item.type, names });
  });

  // Uzun adlar önce
  return entries.sort((a, b) => {
    const al = Math.max(...a.names.map(n => n.length));
    const bl = Math.max(...b.names.map(n => n.length));
    return bl - al;
  });
}

interface MatchSpan {
  start: number;
  end: number;
  id: string;
  label: string;
  explicit: boolean;
}

/**
 * Metindeki tüm eşleşmeleri bulur. Çakışan eşleşmelerde önce gelen
 * (yani daha uzun olan) kazanır.
 */
function findMatches(text: string, index: LinkIndexEntry[], selfId?: string): MatchSpan[] {
  const taken: MatchSpan[] = [];

  const overlaps = (start: number, end: number) =>
    taken.some(m => start < m.end && end > m.start);

  // --- 1. Açık [[...]] sözdizimi, her zaman öncelikli ---
  const explicitRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;
  let em: RegExpExecArray | null;
  while ((em = explicitRe.exec(text)) !== null) {
    const target = em[1].trim();
    const label = (em[2] || em[1]).trim();
    const hit = index.find(e => e.names.some(n => trLower(n) === trLower(target)));
    taken.push({
      start: em.index,
      end: em.index + em[0].length,
      id: hit ? hit.id : '',
      label,
      explicit: true
    });
  }

  // --- 2. Çıplak ad eşleşmeleri ---
  index.forEach(entry => {
    if (selfId && entry.id === selfId) return; // madde kendine bağlanmasın

    entry.names.forEach(name => {
      // Fazla genel kelimeler yalnızca [[...]] ile bağlanır
      if (BAGLANMAZ.has(trLower(name))) return;
      // Unicode duyarlı sınır: öncesi ve sonrası harf/rakam olmasın
      let re: RegExp;
      try {
        re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(name)}(?![\\p{L}\\p{N}_])`, 'giu');
      } catch {
        // Lookbehind desteklenmiyorsa bu adı atla
        return;
      }

      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (!overlaps(start, end)) {
          taken.push({ start, end, id: entry.id, label: m[0], explicit: false });
        }
      }
    });
  });

  return taken.sort((a, b) => a.start - b.start);
}

export interface AutoLinkProps {
  text: string;
  index: LinkIndexEntry[];
  /** Bu maddenin kendi id'si — kendine bağlanmayı önler */
  selfId?: string;
  onNavigate: (id: string) => void;
  /** Yönetim yüzünde, hedefi olmayan [[...]] kırmızı görünür */
  showBroken?: boolean;
  /**
   * Sayfa boyunca hangi maddelere bağlanıldığını tutan küme. Aynı şeye
   * sayfada üç kez bağlanmak gürültü; ilk geçtiği yer yeter. Bölüm bölüm
   * çağrıldığında aynı küme verilir ki sayım sayfanın tamamı için işlesin.
   */
  seen?: Set<string>;
}

/**
 * Metni parçalara bölüp bağlantıları React düğümlerine çevirir.
 * Paragraf boşlukları korunur.
 */
export const AutoLinkedText: React.FC<AutoLinkProps> = ({
  text,
  index,
  selfId,
  onNavigate,
  showBroken = false,
  seen
}) => {
  const paragraphs = React.useMemo(() => (text || '').split(/\n{2,}/), [text]);
  const linked = seen ?? new Set<string>();

  return (
    <>
      {paragraphs.map((para, pi) => {
        const matches = findMatches(para, index, selfId);
        const nodes: React.ReactNode[] = [];
        let cursor = 0;

        matches.forEach((m, mi) => {
          if (m.start > cursor) {
            nodes.push(para.slice(cursor, m.start));
          }

          if (!m.id) {
            // Hedefi bulunamayan açık bağlantı
            nodes.push(
              showBroken ? (
                <span
                  key={`b-${mi}`}
                  className="text-kiremit underline decoration-dotted decoration-kiremit/60 cursor-help"
                  title="Bu ada sahip bir madde yok — henüz yazılmamış olabilir"
                >
                  {m.label}
                </span>
              ) : (
                <span key={`b-${mi}`}>{m.label}</span>
              )
            );
          } else if (linked.has(m.id) && !m.explicit) {
            // Bu maddeye sayfada zaten bağlanıldı; düz metin olarak geç
            nodes.push(<span key={`p-${mi}`}>{m.label}</span>);
          } else {
            const id = m.id;
            linked.add(id);
            nodes.push(
              <button
                key={`l-${mi}`}
                type="button"
                onClick={() => onNavigate(id)}
                className="text-lacivert dark:text-bej underline decoration-lacivert/30 dark:decoration-bej/40 underline-offset-2 hover:decoration-lacivert dark:hover:decoration-bej hover:bg-lacivert/5 dark:hover:bg-bej/10 rounded-sm px-px transition-colors"
              >
                {m.label}
              </button>
            );
          }
          cursor = m.end;
        });

        if (cursor < para.length) nodes.push(para.slice(cursor));

        return (
          <p key={pi} className="mb-4 leading-[1.75] last:mb-0">
            {nodes}
          </p>
        );
      })}
    </>
  );
};

/** Metinde kaç ayrı maddeye bağlantı çıktığını sayar (yönetim yüzü için) */
export function countOutgoingLinks(text: string, index: LinkIndexEntry[], selfId?: string): number {
  const ids = new Set(
    findMatches(text || '', index, selfId)
      .map(m => m.id)
      .filter(Boolean)
  );
  return ids.size;
}
