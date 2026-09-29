import React, { useState } from 'react';
import { X, Plus, CalendarDays } from 'lucide-react';
import type { Item } from '../../types';
import {
  GUN_ADLARI, KANALLAR, SERI_RENKLERI, asamasi, gonderiBilgisi, gonderiler, kisaTarih, seriBilgisi,
  seriDuzenYazisi, siradakiBosYer, turBul, turStili, TUR_SINIFI, yeniSeri, type Duzen, type SeriBilgisi
} from '../../lib/sosyal';
import { DUGME_BOS, DUGME_LAC, ETIKET, IKINCIL, KART, YAZI } from '../anasayfa/stil';

/**
 * Seriler (Kemal: "ben serileri çok severim"). Her seri bir kategori gibi:
 * adı, rengi, düzeni. Takvimde seri renginde kenar; boş günleri kesikli.
 * Seri adını Kemal koyar; buradan ad önerilmez.
 */

type YeniKayit = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

interface Props {
  items: Item[];
  bugun: string;
  onAddItem: (item: YeniKayit & { id?: string }) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  /** Takvimi bu seriye süzerek aç */
  onTakvimde: (seriId: string) => void;
  /** Serinin boş yerine gönderi aç */
  onBosYer: (seri: Item, tarih: string) => void;
}

const kanalAdlari = (ids: string[]) => ids.map(id => KANALLAR.find(k => k.id === id)?.ad.split(' ')[0]).filter(Boolean).join(', ');

export const SeriListesi: React.FC<Props> = ({ items, bugun, onAddItem, onUpdateItem, onDeleteItem, onTakvimde, onBosYer }) => {
  const [form, setForm] = useState<Item | 'yeni' | null>(null);
  const tumGonderiler = gonderiler(items);
  const liste = items.filter(i => i.type === 'sosyal_seri' && !i.archived).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="space-y-3">
      <div className={ETIKET}>Seriler · yalnız KKM içinde</div>
      {liste.length === 0 && (
        <p className={`text-[13px] ${IKINCIL}`}>Henüz seri yok. Bir seri aç; adını sen koyarsın, rengi ve düzeni takvimde görünür.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {liste.map(seri => {
          const s = seriBilgisi(seri);
          const icindekiler = tumGonderiler.filter(g => gonderiBilgisi(g).seriId === seri.id)
            .sort((a, b) => (gonderiBilgisi(a).tarih || '9').localeCompare(gonderiBilgisi(b).tarih || '9'));
          const paylasilanlar = icindekiler.filter(g => asamasi(g) === 'Paylaşıldı' && gonderiBilgisi(g).tarih);
          const son = paylasilanlar[paylasilanlar.length - 1];
          const sirada = siradakiBosYer(seri, tumGonderiler, bugun);
          return (
            <div key={seri.id} className={`${KART} p-3.5 border-l-[6px]`} style={{ borderLeftColor: s.renk }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className={`text-[15px] font-bold truncate ${YAZI}`}>{seri.title}</div>
                  <div className={`text-[11px] mt-0.5 ${IKINCIL}`}>{seriDuzenYazisi(s)}{s.kanallar.length ? ` · ${kanalAdlari(s.kanallar)}` : ''}</div>
                </div>
                <button type="button" onClick={() => setForm(seri)} className={DUGME_BOS}>Düzenle</button>
              </div>
              <div className={`flex gap-4 mt-3 text-[11px] ${IKINCIL}`}>
                <span><strong className={`block text-[17px] ${YAZI}`}>{icindekiler.length}</strong>gönderi</span>
                <span><strong className={`block text-[17px] ${YAZI}`}>{son ? kisaTarih(gonderiBilgisi(son).tarih) : '—'}</strong>son paylaşılan</span>
                <span><strong className={`block text-[17px] ${YAZI}`}>{sirada ? kisaTarih(sirada) : '—'}</strong>sıradaki boş yer</span>
              </div>
              {icindekiler.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {icindekiler.slice(-8).map(g => {
                    const t = turBul(gonderiBilgisi(g).tur);
                    const gorsel = g.images?.[0];
                    return <i key={g.id} title={`${g.title}${t ? ` · ${t.ad}` : ''}`} className={`flex-1 max-w-8 aspect-square rounded-[3px] block ${gorsel ? '' : TUR_SINIFI}`} style={gorsel ? { background: `center/cover url("${gorsel}")` } : turStili(t?.id || '')} />;
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <button type="button" onClick={() => onTakvimde(seri.id)} className={`${DUGME_BOS} inline-flex items-center gap-1`}><CalendarDays className="w-3 h-3" /> Takvimde göster</button>
                {sirada && <button type="button" onClick={() => onBosYer(seri, sirada)} className={`${DUGME_BOS} inline-flex items-center gap-1`}><Plus className="w-3 h-3" /> {kisaTarih(sirada)} için gönderi</button>}
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setForm('yeni')} className={`rounded-2xl border-[1.5px] border-dashed border-[#CFC5B4] dark:border-[#2C3C72] p-4 text-[13px] ${IKINCIL} hover:border-[#F26B6F] cursor-pointer min-h-[120px]`}>
          + Yeni seri — adını sen koyarsın
        </button>
      </div>

      {form && (
        <SeriFormu
          seri={form === 'yeni' ? null : form}
          gonderiSayisi={form === 'yeni' ? 0 : tumGonderiler.filter(g => gonderiBilgisi(g).seriId === form.id).length}
          kullanilanRenkler={liste.map(l => seriBilgisi(l).renk)}
          onKapat={() => setForm(null)}
          onKaydet={async (ad, s) => {
            if (form === 'yeni') await onAddItem(yeniSeri(ad, s));
            else await onUpdateItem({ ...form, title: ad, metadata: { ...form.metadata, seri: s }, updatedAt: Date.now() });
            setForm(null);
          }}
          onSil={form === 'yeni' ? undefined : async () => {
            // Seri gider; gönderileri kalır, yalnız seriden çıkar
            for (const g of tumGonderiler.filter(g => gonderiBilgisi(g).seriId === form.id)) {
              await onUpdateItem({ ...g, metadata: { ...g.metadata, gonderi: { ...gonderiBilgisi(g), seriId: '' } }, updatedAt: Date.now() });
            }
            await onDeleteItem(form.id);
            setForm(null);
          }}
        />
      )}
    </div>
  );
};

const KUTU = `w-full text-[13px] bg-white dark:bg-[#17345A] ${YAZI} border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2.5 py-2 focus:outline-hidden focus:border-[#F26B6F]`;
const cip = (on: boolean) => `px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${on ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-white border-transparent' : `border-[#CFC5B4] dark:border-[#2C3C72] ${YAZI}`}`;

const SeriFormu: React.FC<{
  seri: Item | null;
  gonderiSayisi: number;
  kullanilanRenkler: string[];
  onKapat: () => void;
  onKaydet: (ad: string, s: SeriBilgisi) => Promise<void>;
  onSil?: () => Promise<void>;
}> = ({ seri, gonderiSayisi, kullanilanRenkler, onKapat, onKaydet, onSil }) => {
  const ilk = seri ? seriBilgisi(seri) : {
    renk: SERI_RENKLERI.find(r => !kullanilanRenkler.includes(r)) || SERI_RENKLERI[0],
    duzen: 'haftalik' as Duzen, gun: 0, kanallar: ['instagram']
  };
  const [ad, setAd] = useState(seri?.title || '');
  const [s, setS] = useState<SeriBilgisi>(ilk);
  const [silOnay, setSilOnay] = useState(false);
  const [bekle, setBekle] = useState(false);

  const duzenSec = (d: Duzen) => setS(x => ({ ...x, duzen: d, gun: d === 'aylik' ? Math.max(1, Math.min(28, x.gun || 1)) : d === 'haftalik' ? Math.min(6, x.gun) : 0 }));
  const kaydet = async () => { if (!ad.trim()) return; setBekle(true); try { await onKaydet(ad.trim(), s); } finally { setBekle(false); } };

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4" onClick={onKapat}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#FAF8F5] dark:bg-[#13204A] border border-[#CFC5B4] dark:border-[#2C3C72] shadow-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className={`flex-1 text-[17px] font-bold ${YAZI}`}>{seri ? 'Seriyi düzenle' : 'Yeni seri'}</h2>
          <button type="button" onClick={onKapat} title="Kapat" className={`w-9 h-9 rounded-full flex items-center justify-center ${IKINCIL} hover:bg-[#F3EFE8] dark:hover:bg-[#17345A] cursor-pointer`}><X className="w-5 h-5" /></button>
        </div>

        <label className="block"><span className={`block mb-1 ${ETIKET}`}>Adı · sen koyarsın</span>
          <input autoFocus value={ad} onChange={e => setAd(e.target.value)} className={KUTU} /></label>

        <div>
          <div className={`mb-1 ${ETIKET}`}>Renk</div>
          <div className="flex gap-2">
            {SERI_RENKLERI.map(r => (
              <button key={r} type="button" onClick={() => setS(x => ({ ...x, renk: r }))} title={r}
                className={`w-8 h-8 rounded-full cursor-pointer ${s.renk === r ? 'ring-2 ring-offset-2 ring-[#0E1C4F] dark:ring-[#F3EFE8] ring-offset-[#FAF8F5] dark:ring-offset-[#13204A]' : ''}`} style={{ background: r }} />
            ))}
          </div>
        </div>

        <div>
          <div className={`mb-1 ${ETIKET}`}>Düzen</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => duzenSec('haftalik')} className={cip(s.duzen === 'haftalik')}>Haftanın bir günü</button>
            <button type="button" onClick={() => duzenSec('aylik')} className={cip(s.duzen === 'aylik')}>Ayın bir günü</button>
            <button type="button" onClick={() => duzenSec('duzensiz')} className={cip(s.duzen === 'duzensiz')}>Düzensiz</button>
          </div>
          {s.duzen === 'haftalik' && (
            <select value={s.gun} onChange={e => setS(x => ({ ...x, gun: Number(e.target.value) }))} className={`${KUTU} mt-2`}>
              {GUN_ADLARI.map((g, n) => <option key={g} value={n}>Her {g.toLocaleLowerCase('tr')}</option>)}
            </select>
          )}
          {s.duzen === 'aylik' && (
            <select value={s.gun} onChange={e => setS(x => ({ ...x, gun: Number(e.target.value) }))} className={`${KUTU} mt-2`}>
              {Array.from({ length: 28 }, (_, n) => n + 1).map(g => <option key={g} value={g}>Her ayın {g}. günü</option>)}
            </select>
          )}
          <p className={`mt-1.5 text-[11px] ${IKINCIL}`}>{s.duzen === 'duzensiz' ? 'Takvimde boş yer göstermez; gönderileri yalnız renginden tanırsın.' : 'Takvimde boş günleri kesikli görünür. Bir şey kaydolmaz; basınca gönderi açılır.'}</p>
        </div>

        <div>
          <div className={`mb-1 ${ETIKET}`}>Kanallar · yeni gönderiye hazır gelir</div>
          <div className="flex flex-wrap gap-1.5">
            {KANALLAR.map(k => (
              <button key={k.id} type="button" onClick={() => setS(x => ({ ...x, kanallar: x.kanallar.includes(k.id) ? x.kanallar.filter(y => y !== k.id) : [...x.kanallar, k.id] }))} className={cip(s.kanallar.includes(k.id))}>{k.ad}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button type="button" disabled={!ad.trim() || bekle} onClick={kaydet} className={DUGME_LAC}>{seri ? 'Kaydet' : 'Seriyi aç'}</button>
          <button type="button" onClick={onKapat} className={DUGME_BOS}>Vazgeç</button>
        </div>

        {onSil && (
          <div className="pt-3 border-t border-[#CFC5B4] dark:border-[#2C3C72]">
            {silOnay ? (
              <div className="space-y-2">
                <p className="text-[12px] text-[#B23A40] dark:text-[#F26B6F]">Seri silinsin mi? {gonderiSayisi ? `${gonderiSayisi} gönderisi kalır, yalnız seriden çıkar.` : 'İçinde gönderi yok.'}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSilOnay(false)} className={DUGME_BOS}>Vazgeç</button>
                  <button type="button" onClick={() => void onSil()} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F26B6F] text-white cursor-pointer">Evet, sil</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setSilOnay(true)} className={`text-[11px] ${IKINCIL} hover:text-[#D6484C] cursor-pointer`}>Seriyi sil</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriListesi;
