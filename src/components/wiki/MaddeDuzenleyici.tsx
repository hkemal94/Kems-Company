import React, { useMemo, useState } from 'react';
import { KURUM_TIKI } from '../../lib/markaYapisi';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react';
import type { Item, WikiSection } from '../../types';
import { parseKunye, kendiMetniYaz } from './kunyeParser';
import { useKaydedilmemis } from '../../lib/kaydedilmemis';
import { DEFAULT_QUESTIONS_BY_CAT } from './kunyeSorulari';
import { TYPE_LABELS, WIKI_TYPES, schemaKeyFor, getKunyeFields } from './wikiSchema';
import { BAG_TURLERI, type BagTuru } from '../../utils/relations';

/**
 * Madde düzenleyici (yapisal-4, 25–28). Vikinin yönetim yüzünde "düzenle"ye
 * basınca maddenin üstünde açılır:
 *   - Künye alanları (türün şemasından; Kişi'de "Aile", Aile'de mahalle,
 *     uğraş, bağlı mekânlar / kişiler, adaya geliş)
 *   - Bağlar: hedef madde + sabit listeden bağ türü
 *   - Esin notu: yalnız Kemal görür; sitede ve okuma yüzünde yok
 *   - Metin (1 Ekim, Kemal: "künye harici düzenleme yapamıyorum"): giriş
 *     metni ve vikide görünen bölümler (başlık + metin; ekle, sil, sırala).
 *     Metni Kemal yazar; burada hiçbir şey kendiliğinden doldurulmaz.
 * Kayda yalnız "Kaydet" ile yazılır.
 */

interface Props {
  item: Item;
  allItems: Item[];
  onKaydet: (item: Item) => Promise<void>;
  onKapat: () => void;
}

interface Bag { targetId: string; type: BagTuru; isProposal?: boolean; reason?: string }

const yolOku = (item: Item, yol: string): string => {
  const v = yol.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), item);
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
};

export const MaddeDuzenleyici: React.FC<Props> = ({ item, allItems, onKaydet, onKapat }) => {
  const sema = (DEFAULT_QUESTIONS_BY_CAT[schemaKeyFor(item.type) || ''] || []).filter(f => f.fieldPath !== 'title' && f.fieldPath !== 'notes');
  const [alanlar, setAlanlar] = useState<Record<string, string>>(() => Object.fromEntries(sema.map(f => [f.fieldPath, yolOku(item, f.fieldPath)])));
  const [baglar, setBaglar] = useState<Bag[]>(() => ((item.metadata?.relations as Bag[]) || []).filter(b => b && b.targetId));
  const [esin, setEsin] = useState<string>(String(item.metadata?.esin || ''));
  /** Alan boşsa metindeki künye satırından okunan değer — kutuda soluk görünür */
  const metindeki = useMemo(() => new Map(getKunyeFields(item).map(f => [f.id, f.value])), [item]);
  const ipucu = (id: string, soru: string) => (metindeki.get(id) ? `metinde: ${metindeki.get(id)}` : soru);
  /** Maddenin adı (2 Ekim, Kemal: "isimleri değiştirmek mümkün değil") */
  const [ad, setAd] = useState<string>(item.title);
  /** Giriş metni: notlardaki kendi metin (künye satırları hariç) */
  const ilkGiris = useMemo(() => parseKunye(item).kendiMetni, [item]);
  const [giris, setGiris] = useState<string>(ilkGiris);
  const [bolumler, setBolumler] = useState<WikiSection[]>(() => ((item.metadata?.wikiSections as WikiSection[]) || []).map(b => ({ ...b })));
  // Metin değiştiyse kaydetmeden çıkarken sorulur
  const metinDegisti = ad.trim() !== item.title.trim() || giris.trim() !== ilkGiris.trim() || JSON.stringify(bolumler) !== JSON.stringify((item.metadata?.wikiSections as WikiSection[]) || []);
  useKaydedilmemis(metinDegisti);
  const bolumYaz = (n: number, d: Partial<WikiSection>) => setBolumler(bs => bs.map((b, k) => (k === n ? { ...b, ...d } : b)));
  const bolumTasi = (n: number, yon: -1 | 1) => setBolumler(bs => {
    const j = n + yon;
    if (j < 0 || j >= bs.length) return bs;
    const y = bs.slice();
    [y[n], y[j]] = [y[j], y[n]];
    return y;
  });
  /** Markalar'da kurum olarak görünsün mü (1 Ekim, Kemal: "ben tikle seçerim") */
  const kurumTikiVar = item.type !== 'marka' && item.type !== 'kulüp';
  const [kurum, setKurum] = useState<boolean>(item.metadata?.[KURUM_TIKI] === true);
  const [yeniHedef, setYeniHedef] = useState('');
  const [yeniTur, setYeniTur] = useState<BagTuru>('genel bağlantı');
  const [yaziliyor, setYaziliyor] = useState(false);

  const hedefler = useMemo(() => allItems
    .filter(i => i.id !== item.id && !i.archived && !i.isProposal && WIKI_TYPES.includes(i.type) && i.type !== 'oda')
    .sort((a, b) => a.title.localeCompare(b.title, 'tr')), [allItems, item.id]);
  const aileler = hedefler.filter(i => i.type === 'aile');
  /** Mahalle alanı için seçenekler: üst düzey 'yer' kayıtları (mahalleler) */
  const mahalleSecenekleri = useMemo(() => hedefler.filter(i => i.type === 'yer' && !i.metadata?.placeId).map(i => i.title), [hedefler]);

  const kaydet = async () => {
    setYaziliyor(true);
    try {
      const metadata = { ...(item.metadata || {}) } as Record<string, unknown>;
      const profil = { ...((metadata.profile as Record<string, unknown>) || {}) };
      for (const f of sema) {
        const v = (alanlar[f.fieldPath] || '').trim();
        if (f.fieldPath.startsWith('metadata.profile.')) profil[f.fieldPath.slice('metadata.profile.'.length)] = v;
        else if (f.fieldPath.startsWith('metadata.')) metadata[f.fieldPath.slice('metadata.'.length)] = v;
      }
      metadata.profile = profil;
      // Firestore: undefined yazılmaz
      metadata.relations = baglar.map(b => {
        const o: Record<string, unknown> = { targetId: b.targetId, type: b.type };
        if (b.isProposal) o.isProposal = true;
        if (b.reason) o.reason = b.reason;
        return o;
      });
      metadata.esin = esin.trim();
      // Bölümler: boş başlık ve boş metinli olanlar atılır; undefined yazılmaz
      metadata.wikiSections = bolumler
        .map(b => ({ id: b.id, title: b.title.trim(), content: b.content.trim(), status: b.status || 'resmi' }))
        .filter(b => b.title || b.content);
      // Tik kalkınca false yazılır: kayıt birleşerek yazıldığı için anahtarı silmek yetmez
      if (kurumTikiVar && (kurum || metadata[KURUM_TIKI] !== undefined)) metadata[KURUM_TIKI] = kurum;
      const notes = giris.trim() === ilkGiris.trim() ? item.notes : kendiMetniYaz(item, giris);
      // Boş ad yazılmaz; eski ad kalır
      const title = ad.trim() || item.title;
      await onKaydet({ ...item, title, notes, metadata: metadata as Item['metadata'], updatedAt: Date.now() });
      onKapat();
    } finally {
      setYaziliyor(false);
    }
  };

  const secim = 'text-[13px] bg-white dark:bg-lacivert-800/60 border border-bej/70 dark:border-lacivert-600/60 rounded px-2 py-1.5 focus:outline-hidden focus:border-kiremit';
  const girdi = 'w-full text-[13px] bg-white dark:bg-lacivert-800/60 border border-bej/70 dark:border-lacivert-600/60 rounded px-2.5 py-1.5 focus:outline-hidden focus:border-kiremit';

  return (
    <section className="mb-8 rounded-lg border-2 border-kiremit/40 bg-white/60 dark:bg-lacivert-800/40 p-4 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-sans text-[15px] font-bold">Düzenle · {TYPE_LABELS[item.type] || item.type}</h2>
        <button type="button" onClick={onKapat} aria-label="Kapat" className="p-1 text-gri hover:text-lacivert dark:text-bej/85"><X size={16} /></button>
      </div>

      <label className="block">
        <span className="block text-[11px] text-gri dark:text-bej/85 mb-0.5">Ad</span>
        <input value={ad} onChange={e => setAd(e.target.value)} placeholder={item.title} className={`${girdi} font-semibold`} />
      </label>

      {sema.length > 0 && (
        <div>
          <div className="postmark-label text-gri dark:text-bej/85 mb-2">Künye</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sema.map(f => (
              <label key={f.id} className="block">
                <span className="block text-[11px] text-gri dark:text-bej/85 mb-0.5">{f.label}</span>
                {f.id === 'aile' ? (
                  <>
                    <input list="aile-listesi" value={alanlar[f.fieldPath] || ''} onChange={e => setAlanlar(a => ({ ...a, [f.fieldPath]: e.target.value }))} placeholder={ipucu(f.id, f.question)} className={girdi} />
                    <datalist id="aile-listesi">{aileler.map(a => <option key={a.id} value={a.title} />)}</datalist>
                  </>
                ) : f.id === 'region' ? (
                  <>
                    <input list="mahalle-listesi" value={alanlar[f.fieldPath] || ''} onChange={e => setAlanlar(a => ({ ...a, [f.fieldPath]: e.target.value }))} placeholder={ipucu(f.id, f.question)} className={girdi} />
                    <datalist id="mahalle-listesi">{mahalleSecenekleri.map(m => <option key={m} value={m} />)}</datalist>
                  </>
                ) : (
                  <input value={alanlar[f.fieldPath] || ''} onChange={e => setAlanlar(a => ({ ...a, [f.fieldPath]: e.target.value }))} placeholder={ipucu(f.id, f.question)} className={girdi} />
                )}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-gri dark:text-bej/70">Boş bırakılan alan, metindeki künye satırında yazıyorsa oradan okunur.</p>
        </div>
      )}

      <div>
        <div className="postmark-label text-gri dark:text-bej/85 mb-1">Metin</div>
        <span className="block text-[11px] text-gri dark:text-bej/85 mb-0.5">Giriş metni</span>
        <textarea value={giris} onChange={e => setGiris(e.target.value)} rows={6} placeholder="Maddenin giriş metni — sen yazıyorsun." className={`${girdi} leading-relaxed`} />
        <div className="mt-3 space-y-3">
          {bolumler.map((b, n) => (
            <div key={b.id} className="rounded border border-bej/60 dark:border-lacivert-600/60 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input value={b.title} onChange={e => bolumYaz(n, { title: e.target.value })} placeholder="Bölüm başlığı (ör. Tarihçe)" className={`${girdi} font-semibold`} />
                {b.status === 'öneri' && <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-kiremit/15 text-kiremit">öneri</span>}
                <button type="button" aria-label="Yukarı" onClick={() => bolumTasi(n, -1)} disabled={n === 0} className="p-2 text-gri hover:text-kiremit disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label="Aşağı" onClick={() => bolumTasi(n, 1)} disabled={n === bolumler.length - 1} className="p-2 text-gri hover:text-kiremit disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" aria-label="Bölümü sil" onClick={() => setBolumler(bs => bs.filter((_, k) => k !== n))} className="p-2 text-gri hover:text-kiremit"><Trash2 size={14} /></button>
              </div>
              <textarea value={b.content} onChange={e => bolumYaz(n, { content: e.target.value })} rows={4} placeholder="Bölümün metni…" className={`${girdi} leading-relaxed`} />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setBolumler(bs => [...bs, { id: `b${Date.now()}`, title: '', content: '', status: 'resmi' }])}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-mono px-2.5 py-1.5 rounded border border-bej/70 hover:border-kiremit">
          <Plus size={13} /> Bölüm ekle
        </button>
      </div>

      <div>
        <div className="postmark-label text-gri dark:text-bej/85 mb-2">Bağlar</div>
        {baglar.length === 0 && <p className="text-[12px] text-gri dark:text-bej/70 mb-2">Henüz bağ yok.</p>}
        <ul className="space-y-1.5 mb-2">
          {baglar.map((b, n) => {
            const h = allItems.find(i => i.id === b.targetId);
            return (
              <li key={`${b.targetId}-${n}`} className="flex flex-wrap items-center gap-2 text-[13px]">
                <select value={b.type} onChange={e => setBaglar(bs => bs.map((x, k) => (k === n ? { ...x, type: e.target.value as BagTuru } : x)))} className={secim}>
                  {BAG_TURLERI.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                </select>
                <span className="flex-1 min-w-0 truncate">{h?.title || 'silinmiş madde'}{b.isProposal ? ' · öneri' : ''}</span>
                <button type="button" aria-label="Bağı kaldır" onClick={() => setBaglar(bs => bs.filter((_, k) => k !== n))} className="p-1 text-gri hover:text-kiremit"><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <select value={yeniTur} onChange={e => setYeniTur(e.target.value as BagTuru)} className={secim}>
            {BAG_TURLERI.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
          </select>
          <select value={yeniHedef} onChange={e => setYeniHedef(e.target.value)} className={`${secim} flex-1 min-w-[160px]`}>
            <option value="">Madde seç…</option>
            {hedefler.map(h => <option key={h.id} value={h.id}>{h.title} · {TYPE_LABELS[h.type] || h.type}</option>)}
          </select>
          <button type="button" disabled={!yeniHedef} onClick={() => { setBaglar(bs => [...bs, { targetId: yeniHedef, type: yeniTur }]); setYeniHedef(''); }}
            className="inline-flex items-center gap-1 text-[12px] font-mono px-2.5 py-1.5 rounded border border-bej/70 hover:border-kiremit disabled:opacity-40">
            <Plus size={13} /> Bağ ekle
          </button>
        </div>
      </div>

      <div>
        <div className="postmark-label text-gri dark:text-bej/85 mb-1">Esin notu · yalnız sen görürsün</div>
        <textarea value={esin} onChange={e => setEsin(e.target.value)} rows={3} placeholder="Bu madde neyden esinlendi? Sitede ve okuma yüzünde görünmez." className={girdi} />
      </div>

      {kurumTikiVar && (
        <label className="flex items-start gap-3 min-h-11 cursor-pointer">
          <input type="checkbox" checked={kurum} onChange={e => setKurum(e.target.checked)} className="mt-1 w-5 h-5 accent-[#0E1C4F] dark:accent-[#F26B6F] shrink-0" />
          <span>
            <span className="block text-[14px] font-semibold">Markalar'da kurum olarak göster</span>
            <span className="block text-[12px] text-gri dark:text-bej/70">Tiklersen bu madde Markalar sayfasında kurgu içi kurumlar arasına gelir; madde vikide olduğu gibi kalır. Tiki kaldırınca oradan çıkar.</span>
          </span>
        </label>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onKapat} className="text-[12px] font-mono px-3 py-1.5 rounded border border-bej/70">Vazgeç</button>
        <button type="button" disabled={yaziliyor} onClick={() => void kaydet()} className="inline-flex items-center gap-1 text-[12px] font-mono px-3 py-1.5 rounded bg-lacivert text-krem dark:bg-[#2C3C72] disabled:opacity-40">
          <Save size={13} /> {yaziliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </section>
  );
};

/** Aile sayfası: üyeler (kişilerin "Aile" alanından) ve basit aile ağacı */
export const AileUyeleri: React.FC<{ aile: Item; allItems: Item[]; onNavigate: (id: string) => void }> = ({ aile, allItems, onNavigate }) => {
  const ad = aile.title.trim().toLocaleLowerCase('tr');
  const uyeler = allItems
    .filter(i => !i.archived && !i.isProposal && (i.type === 'kisi' || i.type === 'karakter'))
    .filter(i => {
      const v = String((i.metadata?.profile as Record<string, unknown> | undefined)?.aile || '').trim().toLocaleLowerCase('tr');
      return v && (v === ad || v === aile.id.toLocaleLowerCase('tr') || v.replace(/\s+ailesi$/, '') === ad.replace(/\s+ailesi$/, ''));
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  return (
    <section className="mb-8">
      <h2 className="font-sans text-[20px] mb-3">Üyeler</h2>
      {uyeler.length === 0 ? (
        <p className="text-[13px] text-gri dark:text-bej/80">Henüz üye yok. Bir kişinin künyesinde "Aile" alanına bu ailenin adı yazılınca burada görünür.</p>
      ) : (
        <div className="flex flex-col items-center">
          <div className="px-4 py-2 rounded-lg bg-lacivert text-krem dark:bg-[#2C3C72] text-[14px] font-semibold">{aile.title}</div>
          <div className="w-px h-5 bg-bej dark:bg-lacivert-600" />
          <div className="relative flex flex-wrap justify-center gap-x-3 gap-y-4 pt-5 border-t border-bej dark:border-lacivert-600" style={{ minWidth: uyeler.length > 1 ? '60%' : undefined }}>
            {uyeler.map(u => (
              <div key={u.id} className="relative flex flex-col items-center">
                <span className="absolute -top-5 h-5 w-px bg-bej dark:bg-lacivert-600" />
                <button type="button" onClick={() => onNavigate(u.id)} className="px-3 py-1.5 rounded border border-bej/80 dark:border-lacivert-600 bg-white/70 dark:bg-lacivert-800/40 text-[13px] hover:border-kiremit">
                  {u.title}
                  {(u.metadata?.profile as Record<string, string> | undefined)?.profession && (
                    <span className="block text-[10px] text-gri dark:text-bej/70">{(u.metadata!.profile as Record<string, string>).profession}</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default MaddeDuzenleyici;
