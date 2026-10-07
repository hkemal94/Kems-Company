import type { ItemType } from '../../types';

/** Atölye'nin tür renkleri (bağ ağı, zaman çizgisi): lacivert, kiremit ve yanlarında sakin tonlar (açık / karanlık) */
export const TUR_RENGI: Partial<Record<ItemType, string>> = {
  yer: 'fill-[#0E1C4F] dark:fill-[#8FA3D9]', ada: 'fill-[#0E1C4F] dark:fill-[#8FA3D9]',
  cadde: 'fill-[#5B6B8C] dark:fill-[#A9B6D3]', meydan: 'fill-[#5B6B8C] dark:fill-[#A9B6D3]',
  yer_adi: 'fill-[#5E7F3A] dark:fill-[#9DBF72]',
  'mekân': 'fill-[#F26B6F]', 'dükkân': 'fill-[#F26B6F]',
  kisi: 'fill-[#2F7D6D] dark:fill-[#5FB3A0]', karakter: 'fill-[#2F7D6D] dark:fill-[#5FB3A0]',
  aile: 'fill-[#8A5A9E] dark:fill-[#B994C9]',
  'kulüp': 'fill-[#C99A2E]', marka: 'fill-[#C99A2E]',
  olay: 'fill-[#3E7CB1] dark:fill-[#7FB0DA]',
  'ürün': 'fill-[#7A6F5E] dark:fill-[#B5A991]',
  oda: 'fill-[#A6B0C9] dark:fill-[#56658F]'
};
export const TUR_NOKTASI: Partial<Record<ItemType, string>> = {
  yer: 'bg-[#0E1C4F] dark:bg-[#8FA3D9]', ada: 'bg-[#0E1C4F] dark:bg-[#8FA3D9]',
  cadde: 'bg-[#5B6B8C] dark:bg-[#A9B6D3]', meydan: 'bg-[#5B6B8C] dark:bg-[#A9B6D3]',
  yer_adi: 'bg-[#5E7F3A] dark:bg-[#9DBF72]',
  'mekân': 'bg-[#F26B6F]', 'dükkân': 'bg-[#F26B6F]',
  kisi: 'bg-[#2F7D6D] dark:bg-[#5FB3A0]', karakter: 'bg-[#2F7D6D] dark:bg-[#5FB3A0]',
  aile: 'bg-[#8A5A9E] dark:bg-[#B994C9]',
  'kulüp': 'bg-[#C99A2E]', marka: 'bg-[#C99A2E]',
  olay: 'bg-[#3E7CB1] dark:bg-[#7FB0DA]',
  'ürün': 'bg-[#7A6F5E] dark:bg-[#B5A991]',
  oda: 'bg-[#A6B0C9] dark:bg-[#56658F]'
};
