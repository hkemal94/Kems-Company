import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, Eye, MapPin, Search, Settings2, Unlink } from 'lucide-react';
import { Item, ItemType } from '../../types';
import { isEntityUnlinked } from '../../utils/relations';
import { buildLinkIndex } from './autoLink';
import { WikiArticle } from './WikiArticle';
import { WIKI_TYPES, TYPE_LABELS, isStub, bolgeAdi } from './wikiSchema';
import { OYUN_VAKA_IDLERI } from '../../data/kemskoyVenues';

interface WikiShellProps {
  items: Item[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
}

/** Odalar dizinde ayrı satır işgal etmez; mekânlarının altında yaşarlar */
const INDEX_TYPES: ItemType[] = WIKI_TYPES.filter(t => t !== 'oda');

/** Mekân sayılan tipler — mahallenin altında listelenirler */
const MEKAN_TIPLERI: ItemType[] = ['mekân', 'dükkân', 'kulüp'];

export const WikiShell: React.FC<WikiShellProps> = ({
  items,
  selectedId: controlledId,
  onSelect,
  onEdit,
  readOnly = false
}) => {
  const [internalId, setInternalId] = useState<string | null>(null);
  const [mode, setMode] = useState<'okuma' | 'yonetim'>(readOnly ? 'okuma' : 'yonetim');
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'hepsi' | null>(null);

  const selectedId = controlledId !== undefined ? controlledId : internalId;
  const navigate = (id: string | null) => {
    if (onSelect) onSelect(id);
    else setInternalId(id);
  };

  /**
   * Wiki'nin nüfusu. Oyun verisi buraya girmez: senaryo tipleri zaten
   * WIKI_TYPES dışında, resepsiyon vakaları ise kimlik listesiyle elenir.
   */
  const wikiItems = useMemo(
    () =>
      items.filter(
        i => !i.archived && WIKI_TYPES.includes(i.type) && !OYUN_VAKA_IDLERI.has(i.id)
      ),
    [items]
  );

  const linkIndex = useMemo(() => buildLinkIndex(wikiItems), [wikiItems]);
  const selected = useMemo(
    () => wikiItems.find(i => i.id === selectedId) || null,
    [wikiItems, selectedId]
  );

  /**
   * Mahalleler ve içlerindeki mekânlar — girişin omurgası.
   *
   * Mahalle, başka bir yere bağlı OLMAYAN 'yer' kaydıdır. Otel gibi bir
   * mekân veride 'yer' tipiyle durabilir; placeId'si bir mahalleyi
   * gösterdiği için mahalle listesine değil, o mahallenin içine düşer.
   */
  const idSet = useMemo(() => new Set(wikiItems.map(i => i.id)), [wikiItems]);

  const mahalleler = useMemo(() => {
    const ustDuzeyMi = (i: Item) => {
      const p = i.metadata?.placeId;
      return !p || !idSet.has(p);
    };

    const yerler = wikiItems.filter(i => i.type === 'yer' && ustDuzeyMi(i));

    /** Bir kaydın hangi mahalleye ait olduğu: önce placeId, yoksa bölge adı */
    const aitMi = (i: Item, yer: Item): boolean => {
      const p = i.metadata?.placeId;
      if (p && idSet.has(p)) return p === yer.id; // placeId varsa tek doğru cevap odur
      const region = i.metadata?.region ?? i.metadata?.profile?.region;
      return !!region && bolgeAdi(region) === yer.title;
    };

    return yerler
      .map(yer => {
        const icindekiler = wikiItems.filter(i => {
          if (i.id === yer.id) return false;
          const mekanSayilir = MEKAN_TIPLERI.includes(i.type) || i.type === 'yer';
          if (!mekanSayilir) return false;
          if (i.type === 'yer' && ustDuzeyMi(i)) return false; // başka bir mahalle
          return aitMi(i, yer);
        });
        return { yer, icindekiler };
      })
      .sort((a, b) => b.icindekiler.length - a.icindekiler.length);
  }, [wikiItems, idSet]);

  /**
   * Hiçbir yere bağlanmamış mekânlar. Bir otelin barı burada görünmez —
   * o otele bağlıdır ve otelin sayfasında yaşar; burada yalnızca gerçekten
   * sahipsiz kalanlar listelenir.
   */
  const yersizMekanlar = useMemo(() => {
    const bagli = new Set(mahalleler.flatMap(m => m.icindekiler.map(i => i.id)));
    const mahalleIds = new Set(mahalleler.map(m => m.yer.id));
    return wikiItems.filter(i => {
      if (!MEKAN_TIPLERI.includes(i.type) && i.type !== 'yer') return false;
      if (bagli.has(i.id) || mahalleIds.has(i.id)) return false;
      const p = i.metadata?.placeId;
      if (p && idSet.has(p)) return false; // bir üst mekâna bağlı
      return true;
    });
  }, [wikiItems, mahalleler, idSet]);

  const listed = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    return wikiItems
      .filter(i => i.type !== 'oda')
      .filter(i => (!typeFilter || typeFilter === 'hepsi' ? true : i.type === typeFilter))
      .filter(i =>
        needle
          ? i.title.toLocaleLowerCase('tr').includes(needle) ||
            (i.notes || '').toLocaleLowerCase('tr').includes(needle) ||
            i.tags.some(t => t.toLocaleLowerCase('tr').includes(needle))
          : true
      )
      .sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  }, [wikiItems, q, typeFilter]);

  const typeCounts = useMemo(() => {
    const m = new Map<ItemType, number>();
    wikiItems.filter(i => i.type !== 'oda').forEach(i => {
      m.set(i.type, (m.get(i.type) || 0) + 1);
    });
    return m;
  }, [wikiItems]);

  const health = useMemo(() => {
    const pool = wikiItems.filter(i => i.type !== 'oda');
    return {
      total: pool.length,
      unlinked: pool.filter(i => isEntityUnlinked(i, items)).length,
      stubs: pool.filter(i => isStub(i)).length
    };
  }, [wikiItems, items]);

  const admin = mode === 'yonetim';
  /** Arama yazıldıysa ya da bir tip seçildiyse liste görünümü açılır */
  const listeGorunumu = q.trim().length > 0 || typeFilter !== null;

  return (
    <div className="paper-grain min-h-full bg-krem dark:bg-lacivert text-lacivert dark:text-krem">
      <div className="sticky top-0 z-10 backdrop-blur bg-krem/90 dark:bg-lacivert/90 border-b border-bej/45 dark:border-lacivert-600/45">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              navigate(null);
              setQ('');
              setTypeFilter(null);
            }}
            className="flex items-center gap-2 font-serif text-lg hover:opacity-70 transition-opacity"
          >
            <BookOpen size={17} />
            Düzada Viki
          </button>

          {(selected || listeGorunumu) && (
            <button
              type="button"
              onClick={() => {
                navigate(null);
                setQ('');
                setTypeFilter(null);
              }}
              className="flex items-center gap-1 text-[12px] font-mono text-gri dark:text-bej/70 hover:text-lacivert dark:hover:text-krem transition-colors"
            >
              <ChevronLeft size={13} /> ada sayfası
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={() => setMode(m => (m === 'okuma' ? 'yonetim' : 'okuma'))}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded border border-bej/55 dark:border-lacivert-600/55 hover:bg-bej/15 dark:hover:bg-lacivert-600/30 transition-colors"
            >
              {admin ? <Settings2 size={12} /> : <Eye size={12} />}
              {admin ? 'yönetim yüzü' : 'okuma yüzü'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {selected ? (
          <WikiArticle
            item={selected}
            allItems={items}
            linkIndex={linkIndex}
            onNavigate={navigate}
            mode={mode}
            onEdit={onEdit}
          />
        ) : (
          <>
            {!listeGorunumu && (
              <header className="mb-7">
                <h1 className="font-serif text-4xl mb-1.5">Düzada</h1>
                <p className="text-[15px] text-gri dark:text-bej/70 max-w-xl leading-relaxed">
                  Ege Denizi'nde, zeytin ağaçlarıyla çevrili bir ada. {health.total} madde.
                </p>
              </header>
            )}

            <label className="flex items-center gap-2 px-3 py-2.5 mb-6 rounded-lg border border-bej/55 dark:border-lacivert-600/55 bg-white/70 dark:bg-lacivert-800/40">
              <Search size={15} className="text-gri dark:text-bej/70 shrink-0" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Adada bir şey ara"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gri/60 dark:placeholder:text-bej/40"
              />
            </label>

            {listeGorunumu ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  <FilterChip
                    active={typeFilter === 'hepsi' || typeFilter === null}
                    onClick={() => setTypeFilter('hepsi')}
                    label="hepsi"
                    count={listed.length}
                  />
                  {INDEX_TYPES.filter(t => (typeCounts.get(t) || 0) > 0).map(t => (
                    <FilterChip
                      key={t}
                      active={typeFilter === t}
                      onClick={() => setTypeFilter(t)}
                      label={TYPE_LABELS[t] || t}
                      count={typeCounts.get(t) || 0}
                    />
                  ))}
                </div>

                {listed.length === 0 ? (
                  <p className="text-sm text-gri dark:text-bej/70 italic py-8 text-center">
                    Eşleşen madde yok.
                  </p>
                ) : (
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
                    {listed.map(i => (
                      <li key={i.id}>
                        <MaddeButonu
                          item={i}
                          admin={admin}
                          allItems={items}
                          onClick={() => navigate(i.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              /* --- Ada sayfası: coğrafyadan giriş --- */
              <div className="space-y-8">
                <section>
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-3">
                    Mahalleler
                  </h2>

                  {mahalleler.length === 0 ? (
                    <p className="text-sm text-gri dark:text-bej/70 italic">
                      Henüz mahalle kaydı yok.
                    </p>
                  ) : (
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {mahalleler.map(({ yer, icindekiler }) => (
                        <li
                          key={yer.id}
                          className="border border-bej/45 dark:border-lacivert-600/45 rounded-lg bg-krem-acik/60 dark:bg-lacivert-800/35 overflow-hidden archive-shadow"
                        >
                          <button
                            type="button"
                            onClick={() => navigate(yer.id)}
                            className="w-full text-left px-4 pt-3.5 pb-2 hover:bg-bej/12 dark:hover:bg-lacivert-600/25 transition-colors group"
                          >
                            <span className="flex items-center gap-2">
                              <MapPin size={13} className="text-kiremit shrink-0" />
                              <span className="font-serif text-lg group-hover:underline decoration-lacivert/30 dark:decoration-bej/40 underline-offset-2">
                                {yer.title}
                              </span>
                            </span>
                          </button>

                          {icindekiler.length > 0 && (
                            <ul className="px-4 pb-3.5 pt-0.5 flex flex-wrap gap-1.5">
                              {icindekiler.map(m => (
                                <li key={m.id}>
                                  <button
                                    type="button"
                                    onClick={() => navigate(m.id)}
                                    className="text-[12px] px-2 py-0.5 rounded border border-bej/50 dark:border-lacivert-600/50 hover:border-lacivert/45 dark:hover:border-bej/45 transition-colors"
                                  >
                                    {m.title}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {yersizMekanlar.length > 0 && (
                  <section>
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-3">
                      Mahallesi belirtilmemiş mekânlar
                    </h2>
                    <ul className="flex flex-wrap gap-1.5">
                      {yersizMekanlar.map(m => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => navigate(m.id)}
                            className="text-[13px] px-2.5 py-1 rounded border border-bej/50 dark:border-lacivert-600/50 hover:border-lacivert/45 dark:hover:border-bej/45 transition-colors"
                          >
                            {m.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section>
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-3">
                    Dizinler
                  </h2>
                  <ul className="flex flex-wrap gap-1.5">
                    {INDEX_TYPES.filter(t => (typeCounts.get(t) || 0) > 0).map(t => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => setTypeFilter(t)}
                          className="text-[13px] px-3 py-1.5 rounded-full border border-bej/55 dark:border-lacivert-600/55 hover:border-lacivert/45 dark:hover:border-bej/45 transition-colors"
                        >
                          {TYPE_LABELS[t] || t}
                          <span className="ml-1.5 text-[11px] font-mono opacity-60">
                            {typeCounts.get(t)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                {admin && (health.unlinked > 0 || health.stubs > 0) && (
                  <section className="pt-5 border-t border-bej/40 dark:border-lacivert-600/40">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-gri dark:text-bej/60 mb-2">
                      Yapılacaklar
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {health.unlinked > 0 && (
                        <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded border border-kiremit/30 bg-kiremit/8 text-kiremit">
                          <Unlink size={11} /> {health.unlinked} madde hiçbir şeye bağlı değil
                        </span>
                      )}
                      {health.stubs > 0 && (
                        <span className="text-[11px] font-mono px-2 py-1 rounded border border-bej/60 bg-bej/15 text-[#6b5b46]">
                          {health.stubs} taslak
                        </span>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const MaddeButonu: React.FC<{
  item: Item;
  admin: boolean;
  allItems: Item[];
  onClick: () => void;
}> = ({ item, admin, allItems, onClick }) => {
  const stub = admin && isStub(item);
  const floating = admin && isEntityUnlinked(item, allItems);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-full text-left px-3.5 py-3 rounded-lg border border-bej/45 dark:border-lacivert-600/45 bg-white/60 dark:bg-lacivert-800/35 hover:border-lacivert/40 dark:hover:border-bej/45 transition-colors archive-shadow group"
    >
      <span className="flex items-start gap-2">
        <span className="font-serif text-[15px] group-hover:underline decoration-lacivert/30 dark:decoration-bej/40 underline-offset-2 leading-snug">
          {item.title}
        </span>
        {floating && <Unlink size={11} className="text-kiremit shrink-0 mt-1" />}
      </span>
      <span className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[9px] font-mono uppercase tracking-wide text-gri dark:text-bej/55">
          {TYPE_LABELS[item.type] || item.type}
        </span>
        {item.metadata?.adiGecici && (
          <span className="text-[9px] font-mono px-1 py-px rounded border border-dashed border-bej/70 text-[#6b5b46]">
            adsız
          </span>
        )}
        {stub && (
          <span className="text-[9px] font-mono px-1 py-px rounded border border-bej/55 text-[#6b5b46]">
            taslak
          </span>
        )}
      </span>
    </button>
  );
};

const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}> = ({ active, onClick, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
      active
        ? 'border-lacivert bg-lacivert text-krem dark:border-bej dark:bg-bej dark:text-lacivert'
        : 'border-bej/55 dark:border-lacivert-600/55 text-gri dark:text-bej/70 hover:border-lacivert/40 dark:hover:border-bej/45'
    }`}
  >
    {label}
    <span className="ml-1 opacity-60">{count}</span>
  </button>
);
