import React, { useState } from 'react';
import { X, Send, Lightbulb } from 'lucide-react';
import { Item, AreaType, ItemType } from '../types';

interface HizliNotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, notes: string, area: AreaType, type: ItemType) => Promise<void>;
}

export default function HizliNotModal({ isOpen, onClose, onSave }: HizliNotModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [area, setArea] = useState<AreaType>('duzada');
  const [type, setType] = useState<ItemType>('olay');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(title, notes, area, type);
      setTitle('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAreaChange = (selectedArea: AreaType) => {
    setArea(selectedArea);
    // Set appropriate default type based on area
    if (selectedArea === 'duzada') setType('olay');
    else if (selectedArea === 'merch') setType('merch_urun');
    else if (selectedArea === 'blog') setType('blog_post');
    else if (selectedArea === 'kitap') setType('kitap_bolum');
    else if (selectedArea === 'brainstorm') setType('fikir');
  };

  return (
    <div className="fixed inset-0 bg-[#1B2A4A]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#F3EFE8] dark:bg-[#13204A] border-2 border-[#CFC5B4] dark:border-[#2C3C72] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 paper-grain">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CFC5B4] dark:border-[#2C3C72]">
          <div className="flex items-center gap-2 text-[#1B2A4A] dark:text-[#F3EFE8]">
            <Lightbulb className="w-5 h-5 text-[#D35057]" />
            <h3 className="font-serif font-bold text-lg">Hızlı Not Al</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#6A5E4C] dark:text-[#A6B0C9] hover:text-[#D35057] transition-colors p-1 rounded-lg hover:bg-[#CFC5B4]/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-1.5">
              Başlık / Fikir *
            </label>
            <input
              type="text"
              required
              placeholder="Notunuza kısa ve açıklayıcı bir başlık verin..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F6F1E7] dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-4 py-2 text-sm focus:outline-hidden focus:border-[#D35057] dark:focus:border-[#D35057]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-1.5">
                Çalışma Alanı
              </label>
              <select
                value={area}
                onChange={(e) => handleAreaChange(e.target.value as AreaType)}
                className="w-full bg-[#F6F1E7] dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-[#D35057]"
              >
                <option value="duzada">Düzada & Lore</option>
                <option value="merch">Merch / Drop</option>
                <option value="blog">Blog & İçerik</option>
                <option value="kitap">Kitap / Roman</option>
                <option value="brainstorm">Brainstorm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-1.5">
                Varlık Türü
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ItemType)}
                className="w-full bg-[#F6F1E7] dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-[#D35057]"
              >
                {area === 'duzada' && (
                  <>
                    <option value="olay">Olay</option>
                    <option value="karakter">Karakter</option>
                    <option value="mekân">Mekân</option>
                    <option value="kulüp">Kulüp / Topluluk</option>
                    <option value="dükkân">Dükkân</option>
                    <option value="ürün">Ürün (Lore)</option>
                  </>
                )}
                {area === 'merch' && (
                  <>
                    <option value="merch_urun">Ürün</option>
                    <option value="drop">Drop</option>
                    <option value="tema">Tema</option>
                  </>
                )}
                {area === 'blog' && <option value="blog_post">Blog Yazısı</option>}
                {area === 'kitap' && (
                  <>
                    <option value="kitap_bolum">Bölüm</option>
                    <option value="kitap_proje">Kitap Projesi</option>
                  </>
                )}
                {area === 'brainstorm' && <option value="fikir">Fikir</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-1.5">
              Notlar / Açıklama
            </label>
            <textarea
              rows={4}
              placeholder="Akla gelen ilk kıvılcımları buraya karala..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F6F1E7] dark:bg-[#17345A] text-[#1B2A4A] dark:text-[#F3EFE8] border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-4 py-2 text-sm focus:outline-hidden focus:border-[#D35057] font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] rounded-lg text-xs font-mono hover:bg-[#CFC5B4]/10 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-5 py-2 bg-[#D35057] hover:bg-[#B23A40] disabled:bg-[#D35057]/50 text-[#F3EFE8] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {saving ? "Kaydediliyor..." : "Fikir Olarak Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
