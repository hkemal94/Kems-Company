import type { Item } from '../types';

/**
 * Viki düzeni (yapisal-4, 25 ve küçükler; yapisal-2, 2) — tek seferlik kart.
 *
 *   - Karakter → Kişi: ayrım tamamen kalkar; kayıtların türü "kisi" olur,
 *     künye ve metin olduğu gibi kalır.
 *   - Yaş alanı kalkar: künyedeki "Yaş:" satırı ve yaş alanı silinir.
 *   - Kems Company'nin kuruluş yılı 2025 (Canva; site de 2025).
 *
 * Neyin Eksik'te kart olarak çıkar; Kemal basınca yazılır, ikinci basışta
 * yapılacak iş kalmaz.
 */

const YAS_SATIRI = /^[ \t]*[*•-]?[ \t]*Yaş[ \t]*:.*(\r?\n|$)/gim;
const KEMS = /^kems company$/i;

export function vikiDuzeni(items: Item[]): Array<{ item: Item; neler: string[] }> {
  const cikti: Array<{ item: Item; neler: string[] }> = [];
  for (const i of items) {
    if (i.archived) continue;
    let yeni: Item = i;
    const neler: string[] = [];

    if (i.type === 'karakter') {
      yeni = { ...yeni, type: 'kisi', tags: (yeni.tags || []).map(t => (t === 'karakter' ? 'kisi' : t)) };
      neler.push('Karakter → Kişi');
    }

    if (yeni.type === 'kisi') {
      const notlar = yeni.notes || '';
      if (YAS_SATIRI.test(notlar)) {
        yeni = { ...yeni, notes: notlar.replace(YAS_SATIRI, '') };
        neler.push('künyedeki Yaş satırı silinir');
      }
      YAS_SATIRI.lastIndex = 0;
      const profil = yeni.metadata?.profile as Record<string, unknown> | undefined;
      if (profil && typeof profil.age === 'string' && profil.age.trim()) {
        // Kayıt üstüne eklenerek yazıldığı için alan boş yazılır
        yeni = { ...yeni, metadata: { ...yeni.metadata, profile: { ...profil, age: '' } } };
        neler.push('yaş alanı boşalır');
      }
    }

    if (yeni.type === 'marka' && KEMS.test(yeni.title.trim())) {
      const notlar = yeni.notes || '';
      const duzelt = notlar.replace(/(Kuruluş[^\n:]*:\s*)2024\b/gi, '$12025').replace(/Est\.?\s*2024/gi, 'Est. 2025');
      if (duzelt !== notlar) { yeni = { ...yeni, notes: duzelt }; neler.push('kuruluş 2024 → 2025'); }
      const profil = yeni.metadata?.profile as Record<string, unknown> | undefined;
      if (profil && typeof profil.founded === 'string' && /2024/.test(profil.founded)) {
        yeni = { ...yeni, metadata: { ...yeni.metadata, profile: { ...profil, founded: profil.founded.replace(/2024/g, '2025') } } };
        if (!neler.includes('kuruluş 2024 → 2025')) neler.push('kuruluş 2024 → 2025');
      }
    }

    if (neler.length) cikti.push({ item: { ...yeni, updatedAt: Date.now() }, neler });
  }
  return cikti;
}
