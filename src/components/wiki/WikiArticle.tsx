import React, { useMemo } from 'react';
import { AlertCircle, Link2, PencilLine, Unlink } from 'lucide-react';
import { Item } from '../../types';
import { resolveAllRelations, getRelationLabels, isEntityUnlinked } from '../../utils/relations';
import { AutoLinkedText, LinkIndexEntry } from './autoLink';
import { WikiRooms } from './WikiRooms';
import { WikiPeople } from './WikiPeople';
import {
  getKunyeFields,
  getArticleBody,
  kunyeCompleteness,
  isStub,
  TYPE_LABELS
} from './wikiSchema';

/**
 * Bir ilişki grubu. Otelin 90+ misafiri gibi kalabalık gruplar sayfayı
 * yutmasın diye ilk 24 tanesi gösterilir, gerisi istenirse açılır.
 */
const RelationGroup: React.FC<{
  label: string;
  count: number;
  children: (visible: number) => React.ReactNode;
}> = ({ label, count, children }) => {
  const LIMIT = 24;
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? count : Math.min(count, LIMIT);
  const hidden = count - visible;

  return (
    <div>
      <h3 className="text-[11px] font-mono text-gri dark:text-bej/70 mb-1.5">
        {label}
        {count > LIMIT && <span className="ml-1.5 opacity-60">{count}</span>}
      </h3>
      <ul className="flex flex-wrap gap-1.5">
        {children(visible)}
        {hidden > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[13px] px-2.5 py-1 rounded border border-dashed border-gri/40 dark:border-bej/30 text-gri dark:text-bej/70 hover:border-gri dark:hover:border-bej/60 transition-colors"
            >
              +{hidden} tane daha
            </button>
          </li>
        )}
        {expanded && count > LIMIT && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-[13px] px-2.5 py-1 rounded border border-dashed border-gri/40 dark:border-bej/30 text-gri dark:text-bej/70 hover:border-gri dark:hover:border-bej/60 transition-colors"
            >
              daralt
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};

interface WikiArticleProps {
  item: Item;
  allItems: Item[];
  linkIndex: LinkIndexEntry[];
  onNavigate: (id: string) => void;
  /** 'okuma' ziyaretçi yüzü, 'yonetim' Kemal'in yüzü */
  mode: 'okuma' | 'yonetim';
  onEdit?: (id: string) => void;
}

export const WikiArticle: React.FC<WikiArticleProps> = ({
  item,
  allItems,
  linkIndex,
  onNavigate,
  mode,
  onEdit
}) => {
  const admin = mode === 'yonetim';

  // Sırlar yalnızca yönetim yüzünde
  const kunye = useMemo(
    () => getKunyeFields(item, { includeSecrets: admin }),
    [item, admin]
  );
  const body = useMemo(() => getArticleBody(item), [item]);
  const completeness = useMemo(() => kunyeCompleteness(item), [item]);

  /** Bu mekâna bağlı odalar — ayrı ve katlanmış gösterilir */
  const rooms = useMemo(
    () =>
      allItems.filter(
        i => !i.archived && i.type === 'oda' && i.metadata?.placeId === item.id
      ),
    [allItems, item.id]
  );

  /**
   * Geri bağlantılar. relations.ts zaten çift yönlü çözüyor; burada
   * sadece okunabilir başlıklar altında gruplanıyor.
   */
  const isPerson = item.type === 'kisi' || item.type === 'karakter';

  /**
   * Bir mekâna bağlı kişiler ayrı bir bloğa çıkar. Otelin 94 misafiri
   * çip duvarı olmaktan çıkıp gruplu, katlanmış bir listeye dönüşür.
   * Eşik 6: az sayıda kişi çip olarak zaten okunaklı.
   */
  const { grouped, relatedPeople, peopleProposals, peopleLabel } = useMemo(() => {
    const rels = resolveAllRelations(item, allItems).filter(r => {
      if (admin) return true;
      return !r.isProposal; // ziyaretçi öneri görmesin
    });

    const map = new Map<string, { label: string; entries: typeof rels }>();
    const people: Item[] = [];
    const proposals = new Set<string>();
    const labelVotes = new Map<string, number>();
    const seenPeople = new Set<string>();

    rels.forEach(r => {
      const outgoing = r.sourceId === item.id;
      const other = outgoing ? r.targetId : r.sourceId;
      const otherItem = allItems.find(i => i.id === other);
      if (!otherItem || otherItem.archived) return;

      // Oda ilişkileri yukarıdaki blokta zaten var
      if (otherItem.type === 'oda' && otherItem.metadata?.placeId === item.id) return;

      const labels = getRelationLabels(r.type, r.sourceType, r.targetType);
      const label = outgoing ? labels.forward : labels.inverse;

      const otherIsPerson = otherItem.type === 'kisi' || otherItem.type === 'karakter';
      if (!isPerson && otherIsPerson) {
        if (!seenPeople.has(otherItem.id)) {
          seenPeople.add(otherItem.id);
          people.push(otherItem);
          if (r.isProposal) proposals.add(otherItem.id);
        }
        labelVotes.set(label, (labelVotes.get(label) || 0) + 1);
        return;
      }

      if (!map.has(label)) map.set(label, { label, entries: [] });
      map.get(label)!.entries.push(r);
    });

    // Kişi sayısı azsa ayrı blok kurmaya değmez; çip olarak geri koy
    if (people.length > 0 && people.length < 6) {
      rels.forEach(r => {
        const outgoing = r.sourceId === item.id;
        const other = outgoing ? r.targetId : r.sourceId;
        const otherItem = allItems.find(i => i.id === other);
        if (!otherItem || !seenPeople.has(otherItem.id)) return;
        const labels = getRelationLabels(r.type, r.sourceType, r.targetType);
        const label = outgoing ? labels.forward : labels.inverse;
        if (!map.has(label)) map.set(label, { label, entries: [] });
        map.get(label)!.entries.push(r);
      });
      people.length = 0;
    }

    // En çok oy alan ilişki etiketi başlık olur; 'Bağlantılı Varlık' gibi
    // jenerik bir etiket çıkarsa mekâna yakışan bir başlığa düşülür.
    let topLabel =
      Array.from(labelVotes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Kişiler';
    if (/bağlantılı varlık/i.test(topLabel)) {
      topLabel = isPerson ? 'Tanıdıkları' : 'Buradakiler';
    }

    return {
      grouped: Array.from(map.values()).sort((a, b) => b.entries.length - a.entries.length),
      relatedPeople: people,
      peopleProposals: proposals,
      peopleLabel: topLabel
    };
  }, [item, allItems, admin, isPerson]);

  /** Sayfa başına tek bağlantı sayacı; madde değişince sıfırlanır */
  const linkedOnce = useMemo(() => new Set<string>(), [item.id, mode]);

  const unlinked = useMemo(() => isEntityUnlinked(item, allItems), [item, allItems]);
  const stub = useMemo(() => isStub(item), [item]);

  return (
    <article className="max-w-none">
      {/* --- Başlık --- */}
      <header className="pb-4 mb-6 border-b-2 border-lacivert/15 dark:border-bej/20">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="postmark-label text-gri dark:text-bej/70">
            {TYPE_LABELS[item.type] || item.type}
          </span>
          {item.isProposal && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-dashed border-kiremit/60 text-kiremit">
              henüz resmi değil
            </span>
          )}
          {/* Jenerik ad taşıyan mekânlar — asıl ad sonra konacak */}
          {item.metadata?.adiGecici && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-dashed border-bej text-[#6b5b46]"
              title="Bu jenerik bir ad. Asıl adı sonra konacak."
            >
              adı henüz konmadı
            </span>
          )}
          {admin && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-gri hover:text-lacivert dark:text-bej/70 dark:hover:text-krem transition-colors"
            >
              <PencilLine size={12} /> düzenle
            </button>
          )}
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-lacivert dark:text-krem leading-tight">
          {item.title}
        </h1>

        {item.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.slice(0, 10).map(t => (
              <li
                key={t}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bej/25 dark:bg-lacivert-600/40 text-gri dark:text-bej/80"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* --- Yönetim uyarıları: ziyaretçi bunları görmez --- */}
      {admin && (unlinked || stub) && (
        <div className="mb-6 space-y-2">
          {unlinked && (
            <p className="flex items-start gap-2 text-[13px] px-3 py-2 rounded border border-kiremit/30 bg-kiremit/8 text-kiremit">
              <Unlink size={14} className="mt-0.5 shrink-0" />
              <span>
                Bu madde evrende hiçbir şeye bağlı değil. Bağlanmayan maddeler
                wiki'yi ölü gösterir — en az bir ilişki kur.
              </span>
            </p>
          )}
          {stub && (
            <p className="flex items-start gap-2 text-[13px] px-3 py-2 rounded border border-bej/60 bg-bej/15 text-[#6b5b46]">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>
                Taslak. Künyenin %{completeness.pct}'i dolu ({completeness.filled}/
                {completeness.total} alan) ve gövde metni kısa.
              </span>
            </p>
          )}
        </div>
      )}

      {/*
        Gövdesi olmayan maddelerde (künyesi dolu ama metni yazılmamış
        karakterler) iki sütun kurmak sol tarafı boş bırakıyor. O durumda
        künye tam genişlikte, ızgara olarak açılır.
      */}
      <div
        className={
          body.length > 0
            ? 'lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 items-start'
            : ''
        }
      >
        {/* --- Gövde --- */}
        <div className="min-w-0 order-1">
          {body.length === 0 ? (
            admin ? (
              <p className="text-gri dark:text-bej/60 italic text-sm">
                Gövde metni yok — bu maddenin bildikleri künyeden ibaret.
              </p>
            ) : null
          ) : (
            /* Aynı küme tüm bölümlere veriliyor: bir maddeye sayfada bir kez bağlanır */
            body.map((block, i) => (
              <section key={i} className="mb-7">
                {block.heading && (
                  <h2 className="font-serif text-xl text-lacivert dark:text-krem mb-2 flex items-center gap-2">
                    {block.heading}
                    {admin && block.status === 'öneri' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-dashed border-kiremit/50 text-kiremit">
                        öneri
                      </span>
                    )}
                  </h2>
                )}
                <div className="text-[15px] text-[#2a2a2a] dark:text-krem/85">
                  <AutoLinkedText
                    text={block.text}
                    index={linkIndex}
                    selfId={item.id}
                    onNavigate={onNavigate}
                    showBroken={admin}
                    seen={linkedOnce}
                  />
                </div>
              </section>
            ))
          )}

          <WikiPeople
            people={relatedPeople}
            onNavigate={onNavigate}
            title={peopleLabel}
            proposalIds={peopleProposals}
          />

          <WikiRooms rooms={rooms} onNavigate={onNavigate} />

          {/* --- Geri bağlantılar --- */}
          {grouped.length > 0 && (
            <section className="mt-8 pt-6 border-t border-bej/40 dark:border-lacivert-600/40">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-4 flex items-center gap-1.5">
                <Link2 size={12} /> Evrendeki bağlantıları
              </h2>

              <div className="space-y-4">
                {grouped.map(g => (
                  <RelationGroup key={g.label} label={g.label} count={g.entries.length}>
                    {(visible: number) => g.entries.slice(0, visible).map(r => {
                        const otherId = r.sourceId === item.id ? r.targetId : r.sourceId;
                        const otherTitle =
                          r.sourceId === item.id ? r.targetTitle : r.sourceTitle;
                        const otherType =
                          r.sourceId === item.id ? r.targetType : r.sourceType;
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => onNavigate(otherId)}
                              className={`text-[13px] px-2.5 py-1 rounded border transition-colors ${
                                r.isProposal
                                  ? 'border-dashed border-kiremit/50 text-kiremit hover:bg-kiremit/8'
                                  : 'border-bej/50 dark:border-lacivert-600/50 text-lacivert dark:text-krem hover:border-lacivert/50 dark:hover:border-bej/50 hover:bg-lacivert/5 dark:hover:bg-bej/10'
                              }`}
                              title={r.reason}
                            >
                              {otherTitle}
                              <span className="ml-1.5 text-[9px] font-mono text-gri dark:text-bej/50">
                                {TYPE_LABELS[otherType] || otherType}
                              </span>
                            </button>
                          </li>
                      );
                    })}
                  </RelationGroup>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* --- Künye --- */}
        {kunye.length > 0 && (
          <aside
            className={
              body.length > 0
                ? 'order-2 mt-8 lg:mt-0 lg:sticky lg:top-6'
                : 'order-2 mt-2'
            }
          >
            <div className="border border-bej/50 dark:border-lacivert-600/50 rounded-lg overflow-hidden bg-krem-acik/70 dark:bg-lacivert-800/40 archive-shadow">
              <h2 className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/70 border-b border-bej/40 dark:border-lacivert-600/40 bg-bej/12 dark:bg-lacivert-600/25">
                Künye
              </h2>
              <dl
                className={
                  body.length > 0
                    ? 'divide-y divide-bej/30 dark:divide-lacivert-600/30'
                    : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-bej/30 dark:bg-lacivert-600/30'
                }
              >
                {kunye.map(f => (
                  <div
                    key={f.id}
                    className={
                      body.length > 0
                        ? 'px-4 py-2.5'
                        : 'px-4 py-3 bg-krem-acik/90 dark:bg-lacivert-800/60'
                    }
                  >
                    <dt className="text-[10px] font-mono uppercase tracking-wide text-gri dark:text-bej/60 mb-0.5">
                      {f.label}
                    </dt>
                    <dd className="text-[13px] text-lacivert dark:text-krem/90 leading-snug">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {admin && completeness.total > 0 && (
                <div className="px-4 py-2 border-t border-bej/40 dark:border-lacivert-600/40">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gri dark:text-bej/60 mb-1">
                    <span>künye doluluğu</span>
                    <span>%{completeness.pct}</span>
                  </div>
                  <div className="h-1 rounded-full bg-bej/35 dark:bg-lacivert-600/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cam transition-all"
                      style={{ width: `${completeness.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </article>
  );
};
