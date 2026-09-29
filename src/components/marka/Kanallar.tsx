import React, { useState } from 'react';
import { Edit3, ExternalLink, Instagram, Trash2, Twitter, Youtube } from 'lucide-react';
import type { Item } from '../../types';

/**
 * Kanallar — Kems Company'nin yayın bağlantıları (YouTube, Instagram…).
 *
 * 29 Eylül: Durum sayfası sadeleşti (Kemal: "yüzdeler güzel, alttakiler
 * artık gereksiz"); kanallar oradan Markalar → Kems Company sayfasına
 * taşındı. Kanal yokken gösterilen uydurma örnek bağlantılar kaldırıldı.
 */

type Platform = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'custom';

interface Props {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
}

export const Kanallar: React.FC<Props> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [isEditingChannels, setIsEditingChannels] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState<Platform>('custom');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelTitle, setEditChannelTitle] = useState('');
  const [editChannelUrl, setEditChannelUrl] = useState('');
  const [editChannelPlatform, setEditChannelPlatform] = useState<Platform>('custom');
  const [deleteConfirmChannelId, setDeleteConfirmChannelId] = useState<string | null>(null);

  return (
    <>
      
      <div className="border-2 border-dashed border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5]/80 dark:bg-[#13204A]/30 rounded-xl p-6 space-y-4 paper-grain archive-shadow scroll-mt-24">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-xs font-mono uppercase tracking-widest text-[#0E1C4F] dark:text-[#F3EFE8] font-bold flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-[#F26B6F]" />
              Kanallar
            </h4>
            <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9]">
              Kems Company kurgu evreninin sosyal medya yayın ağları ve dijital kanalları.
            </p>
          </div>
          
          <button
            onClick={() => setIsEditingChannels(!isEditingChannels)}
            className="text-xs font-mono bg-white dark:bg-[#17345A] hover:bg-stone-50 border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs font-bold"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#F26B6F]" />
            <span>{isEditingChannels ? 'Kanalları Kilitle' : 'Düzenle'}</span>
          </button>
        </div>

        {/* Channels display / editing container */}
        {isEditingChannels ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-2 max-h-60 overflow-y-auto bg-white/40 dark:bg-black/15 p-3 rounded-lg border border-[#CFC5B4]/50">
              <span className="text-[10px] font-mono uppercase text-[#6A5E4C] dark:text-[#A6B0C9] font-bold">Aktif Yayınlar:</span>
              
              {items.filter(i => i.type === 'channel' && !i.archived).map(ch => (
                <div key={ch.id} className="p-2.5 bg-white dark:bg-[#17345A] border border-[#CFC5B4]/50 rounded-lg text-xs font-mono">
                  {editingChannelId === ch.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-stone-500 dark:text-stone-400 font-bold">Kanal İsmi</label>
                          <input
                            type="text"
                            value={editChannelTitle}
                            onChange={(e) => setEditChannelTitle(e.target.value)}
                            className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-1 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-stone-500 dark:text-stone-400 font-bold">Platform URL</label>
                          <input
                            type="url"
                            value={editChannelUrl}
                            onChange={(e) => setEditChannelUrl(e.target.value)}
                            className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-1 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-stone-500 dark:text-stone-400 font-bold">İkon Türü</label>
                          <select
                            value={editChannelPlatform}
                            onChange={(e) => setEditChannelPlatform(e.target.value as any)}
                            className="w-full text-xs bg-stone-50 dark:bg-[#112440] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-1 focus:outline-hidden"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter</option>
                            <option value="custom">Diğer</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingChannelId(null)}
                          className="px-2 py-1 text-[10px] bg-stone-200 text-stone-700 rounded hover:bg-stone-300 cursor-pointer"
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editChannelTitle.trim() || !editChannelUrl.trim()) return;
                            await onUpdateItem({
                              ...ch,
                              title: editChannelTitle,
                              notes: editChannelUrl,
                              metadata: {
                                ...ch.metadata,
                                platform: editChannelPlatform
                              }
                            });
                            setEditingChannelId(null);
                          }}
                          className="px-2 py-1 text-[10px] bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer font-bold"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="capitalize font-bold text-[#F26B6F] shrink-0">[{ch.metadata?.platform || 'custom'}]</span>
                        <span className="font-semibold text-[#0E1C4F] dark:text-[#F3EFE8] shrink-0">{ch.title}</span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[150px] sm:max-w-xs">{ch.notes}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingChannelId(ch.id);
                            setEditChannelTitle(ch.title);
                            setEditChannelUrl(ch.notes || '');
                            setEditChannelPlatform((ch.metadata?.platform as any) || 'custom');
                          }}
                          className="text-stone-500 dark:text-stone-400 hover:text-[#F26B6F] p-1 cursor-pointer"
                          title="Düzenle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async () => {
                            if (deleteConfirmChannelId === ch.id) {
                              if (onDeleteItem) {
                                await onDeleteItem(ch.id);
                              } else {
                                await onUpdateItem({ ...ch, archived: true });
                              }
                              setDeleteConfirmChannelId(null);
                            } else {
                              setDeleteConfirmChannelId(ch.id);
                            }
                          }}
                          className={`p-1 cursor-pointer transition-all rounded text-[11px] font-mono font-bold flex items-center gap-0.5 ${
                            deleteConfirmChannelId === ch.id
                              ? "text-white bg-red-600 px-1.5 animate-pulse"
                              : "text-red-500 hover:text-red-700"
                          }`}
                          title={deleteConfirmChannelId === ch.id ? "Silmek için tekrar tıklayın" : "Sil"}
                        >
                          {deleteConfirmChannelId === ch.id ? "Emin misiniz?" : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {items.filter(i => i.type === 'channel' && !i.archived).length === 0 && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-stone-500 dark:text-stone-400 italic">Veritabanında özelleştirilmiş kanal bulunamadı.</p>
                  <button
                    onClick={async () => {
                      const DEFAULTS = [
                        { title: 'YouTube (Eylül)', notes: 'https://youtube.com/@eylul', platform: 'youtube' },
                        { title: 'TikTok (Eylül)', notes: 'https://tiktok.com/@eylul', platform: 'custom' },
                        { title: 'Instagram (Kems)', notes: 'https://instagram.com/kems', platform: 'instagram' },
                        { title: 'Twitter (Kems)', notes: 'https://twitter.com/kems', platform: 'twitter' },
                      ];
                      for (const d of DEFAULTS) {
                        await onAddItem({
                          title: d.title,
                          area: 'komuta',
                          type: 'channel',
                          status: 'Yayında',
                          priority: 'orta',
                          tags: ['sosyal-medya'],
                          links: [],
                          notes: d.notes,
                          images: [],
                          isProposal: false,
                          archived: false,
                          metadata: { platform: d.platform }
                        });
                      }
                      alert("Varsayılan kanallar veritabanına eklendi!");
                    }}
                    className="text-[11px] font-mono bg-[#F26B6F] text-white px-3 py-1.5 rounded hover:bg-[#D6484C] transition-colors cursor-pointer font-bold"
                  >
                    Varsayılan Kanalları Klonla
                  </button>
                </div>
              )}
            </div>

            {/* Form to add a new channel link */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newChannelTitle.trim() || !newChannelUrl.trim()) return;
                
                await onAddItem({
                  title: newChannelTitle,
                  area: 'komuta',
                  type: 'channel',
                  status: 'Yayında',
                  priority: 'orta',
                  tags: ['sosyal-medya'],
                  links: [],
                  notes: newChannelUrl,
                  images: [],
                  isProposal: false,
                  archived: false,
                  metadata: { platform: newChannelPlatform }
                });

                setNewChannelTitle('');
                setNewChannelUrl('');
                setNewChannelPlatform('custom');
                alert("Yeni kanal başarıyla eklendi!");
              }}
              className="bg-white/45 dark:bg-[#17345A]/15 border border-[#CFC5B4] p-4 rounded-lg space-y-3"
            >
              <span className="text-[10px] font-mono font-bold text-[#0E1C4F] dark:text-[#F3EFE8] block uppercase">
                Yeni Kanal / Bağlantı Ekle
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">Kanal Başlığı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Spotify Çalma Listesi"
                    value={newChannelTitle}
                    onChange={(e) => setNewChannelTitle(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">Bağlantı Adresi (URL) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={newChannelUrl}
                    onChange={(e) => setNewChannelUrl(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#6A5E4C] dark:text-[#A6B0C9] mb-1 font-bold">Platform İkonu</label>
                  <select
                    value={newChannelPlatform}
                    onChange={(e) => setNewChannelPlatform(e.target.value as any)}
                    className="w-full text-xs bg-white dark:bg-[#17345A] text-[#0E1C4F] dark:text-[#F3EFE8] border border-[#CFC5B4] rounded p-2 text-[#0E1C4F]"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok (Custom)</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="custom">Özel Bağlantı</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#F26B6F] hover:bg-[#D6484C] text-white px-4 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  + Kanalı Ekle
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Render Active Channels List (Dashed strip format) */
          <div className="flex flex-wrap gap-3 animate-in fade-in duration-200">
            {items.filter(i => i.type === 'channel' && !i.archived).length > 0 ? (
              items.filter(i => i.type === 'channel' && !i.archived).map(ch => {
                const isYoutube = ch.metadata?.platform === 'youtube';
                const isInstagram = ch.metadata?.platform === 'instagram';
                const isTwitter = ch.metadata?.platform === 'twitter';
                
                let icon = <ExternalLink className="w-4 h-4" />;
                let btnClass = "bg-stone-500/10 text-stone-700 dark:text-stone-300 border border-dashed border-stone-500/40 hover:bg-stone-500 hover:text-white";
                
                if (isYoutube) {
                  icon = <Youtube className="w-4 h-4" />;
                  btnClass = "bg-[#F26B6F]/10 text-[#F26B6F] border border-dashed border-[#F26B6F]/40 hover:bg-[#F26B6F] hover:text-white";
                } else if (isInstagram) {
                  icon = <Instagram className="w-4 h-4" />;
                  btnClass = "bg-pink-600/10 text-pink-700 dark:text-pink-400 border border-dashed border-pink-600/40 hover:bg-pink-600 hover:text-white";
                } else if (isTwitter) {
                  icon = <Twitter className="w-4 h-4" />;
                  btnClass = "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-dashed border-sky-500/40 hover:bg-sky-500 hover:text-white";
                }

                return (
                  <a 
                    key={ch.id}
                    href={ch.notes} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`flex items-center gap-2.5 text-xs font-mono px-4 py-2 rounded-lg transition-all cursor-pointer ${btnClass}`}
                  >
                    {icon}
                    <span className="font-bold">{ch.title}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                );
              })
            ) : (
              // Kanal yoksa uydurma örnek bağlantı gösterilmez (29 Eylül)
              <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9]">Henüz kanal eklenmedi. "Düzenle" ile ekleyebilirsin.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Kanallar;
