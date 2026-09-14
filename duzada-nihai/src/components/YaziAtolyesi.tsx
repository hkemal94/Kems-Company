import React, { useState } from 'react';
import { PenTool, BookOpen } from 'lucide-react';
import Blog from './Blog';
import Kitap from './Kitap';
import { Item } from '../types';

interface YaziAtolyesiProps {
  items: Item[];
  activeItemId?: string | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (item: Item) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export default function YaziAtolyesi({
  items,
  activeItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem
}: YaziAtolyesiProps) {
  const [subTab, setSubTab] = useState<'blog' | 'kitap'>('blog');

  return (
    <div className="space-y-6">
      
      {/* Sub-tab switcher to unite blog and books in a single hub */}
      <div className="flex gap-2 border-b border-[#CFC5B4] pb-1">
        <button
          type="button"
          onClick={() => { setSubTab('blog'); onSelectItem(null); }}
          className={`px-4 py-2.5 text-xs font-mono font-bold flex items-center gap-2 rounded-t-lg transition-all border-t border-x ${
            subTab === 'blog'
              ? 'bg-[#F3EFE8] dark:bg-[#13204A] border-[#CFC5B4] text-[#1B2A4A] dark:text-[#F3EFE8] -mb-[5px] pb-3'
              : 'border-transparent text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8]/50'
          }`}
        >
          <PenTool className="w-4 h-4 text-[#D35057]" />
          <span>Blog & İçerik Atölyesi</span>
        </button>
        <button
          type="button"
          onClick={() => { setSubTab('kitap'); onSelectItem(null); }}
          className={`px-4 py-2.5 text-xs font-mono font-bold flex items-center gap-2 rounded-t-lg transition-all border-t border-x ${
            subTab === 'kitap'
              ? 'bg-[#F3EFE8] dark:bg-[#13204A] border-[#CFC5B4] text-[#1B2A4A] dark:text-[#F3EFE8] -mb-[5px] pb-3'
              : 'border-transparent text-[#6A5E4C] dark:text-[#A6B0C9] hover:bg-[#F3EFE8]/50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D35057]" />
          <span>Kitap & Roman Atölyesi</span>
        </button>
      </div>

      {/* Embedded active workspace view */}
      <div className="pt-2">
        {subTab === 'blog' ? (
          <Blog
            items={items}
            activeItemId={activeItemId}
            onSelectItem={onSelectItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onAddItem={onAddItem}
          />
        ) : (
          <Kitap
            items={items}
            activeItemId={activeItemId}
            onSelectItem={onSelectItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onAddItem={onAddItem}
          />
        )}
      </div>
    </div>
  );
}
