import { Item, ItemType } from '../types';

export interface Relation {
  targetId: string;
  type: 'bulunduğu yer' | 'sahibi' | 'çalışanı' | 'üyesi' | 'ait olduğu marka' | 'ilgili olay' | 'tanıdığı kişi' | 'genel bağlantı';
  isProposal?: boolean;
  reason?: string;
}

export interface BidirectionalRelation {
  id: string; // Unique combination of item IDs
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
  sourceType: ItemType;
  targetType: ItemType;
  type: 'bulunduğu yer' | 'sahibi' | 'çalışanı' | 'üyesi' | 'ait olduğu marka' | 'ilgili olay' | 'tanıdığı kişi' | 'genel bağlantı';
  isProposal: boolean;
  reason?: string;
  originItemId: string; // Which item actually stores this relation record
}

// Check if an item has any accepted links/connections (implicit or explicit)
export function isEntityUnlinked(item: Item, allItems: Item[]): boolean {
  if (item.archived || item.isProposal) return false;

  // 1. Explicit metadata.relations
  const hasRelations = (item.metadata?.relations || []).some((r: any) => !r.isProposal);
  if (hasRelations) return false;

  // 2. Metadata brandId or placeId
  if (item.metadata?.brandId || item.metadata?.placeId) return false;

  // 3. Links array
  if (item.links && item.links.length > 0) return false;

  // 4. Check if any other item links to this item
  const isLinkedByOthers = allItems.some(other => {
    if (other.id === item.id || other.archived || other.isProposal) return false;

    // Brand / Place parent reference
    if (other.metadata?.brandId === item.id || other.metadata?.placeId === item.id) return true;

    // Explicit relation
    const otherRelations = other.metadata?.relations || [];
    if (otherRelations.some((r: any) => r.targetId === item.id && !r.isProposal)) return true;

    // Legacy links
    if (other.links && other.links.includes(item.id)) return true;

    return false;
  });

  return !isLinkedByOthers;
}

// Helper to determine the inverse label for a relationship type
export function getRelationLabels(
  type: string,
  sourceType: ItemType,
  targetType: ItemType
): { forward: string; inverse: string } {
  switch (type) {
    case 'bulunduğu yer':
      return {
        forward: 'Bulunduğu Yer / Konum',
        inverse: 'Buradaki Kişiler / Varlıklar'
      };
    case 'sahibi':
      return {
        forward: 'Sahibi / İşletmecisi',
        inverse: 'Sahip Olduğu Varlıklar'
      };
    case 'çalışanı':
      return {
        forward: 'Çalışanı',
        inverse: 'Çalışanları / Ekibi'
      };
    case 'üyesi':
      return {
        forward: 'Üyesi Olduğu Topluluk',
        inverse: 'Üyeleri / Katılımcıları'
      };
    case 'ait olduğu marka':
      return {
        forward: 'Ait Olduğu Marka / Çatı',
        inverse: 'Markaya Bağlı Alt Varlıklar'
      };
    case 'ilgili olay':
      return {
        forward: 'İlgili Olay / Vakıa',
        inverse: 'Olayla İlişkili Kişiler / Yerler'
      };
    case 'tanıdığı kişi':
      return {
        forward: 'Tanıdığı Kişi / Bağlantı',
        inverse: 'Tanıdığı Kişi / Bağlantı'
      };
    default:
      return {
        forward: 'Bağlantılı Varlık',
        inverse: 'Bağlantılı Varlık'
      };
  }
}

// Resolve all bidirectional relationships for a given item, deduplicating them
export function resolveAllRelations(item: Item, allItems: Item[]): BidirectionalRelation[] {
  const relationsMap = new Map<string, BidirectionalRelation>();

  const addRelation = (rel: Omit<BidirectionalRelation, 'id'>) => {
    const key = [rel.sourceId, rel.targetId, rel.type].sort().join('::');
    if (!relationsMap.has(key)) {
      relationsMap.set(key, { ...rel, id: key });
    } else {
      // If one is official and another is proposed, prefer the official one
      const existing = relationsMap.get(key)!;
      if (existing.isProposal && !rel.isProposal) {
        relationsMap.set(key, { ...rel, id: key });
      }
    }
  };

  const itemMap = new Map<string, Item>(allItems.map(i => [i.id, i]));

  // --- 1. Process explicit relations inside metadata.relations ---
  const directRelations = item.metadata?.relations || [];
  directRelations.forEach((r: any) => {
    const target = itemMap.get(r.targetId);
    if (target && !target.archived) {
      addRelation({
        sourceId: item.id,
        targetId: target.id,
        sourceTitle: item.title,
        targetTitle: target.title,
        sourceType: item.type,
        targetType: target.type,
        type: r.type,
        isProposal: !!r.isProposal,
        reason: r.reason,
        originItemId: item.id
      });
    }
  });

  // --- 2. Process incoming explicit relations from other items ---
  allItems.forEach(other => {
    if (other.id === item.id || other.archived) return;
    const otherRelations = other.metadata?.relations || [];
    otherRelations.forEach((r: any) => {
      if (r.targetId === item.id) {
        addRelation({
          sourceId: other.id,
          targetId: item.id,
          sourceTitle: other.title,
          targetTitle: item.title,
          sourceType: other.type,
          targetType: item.type,
          type: r.type,
          isProposal: !!r.isProposal,
          reason: r.reason,
          originItemId: other.id
        });
      }
    });
  });

  // --- 3. Process implicit placeId metadata reference ---
  if (item.metadata?.placeId) {
    const target = itemMap.get(item.metadata.placeId);
    if (target && !target.archived) {
      addRelation({
        sourceId: item.id,
        targetId: target.id,
        sourceTitle: item.title,
        targetTitle: target.title,
        sourceType: item.type,
        targetType: target.type,
        type: 'bulunduğu yer',
        isProposal: false,
        originItemId: item.id
      });
    }
  }

  // Incoming placeId references
  allItems.forEach(other => {
    if (other.id === item.id || other.archived) return;
    if (other.metadata?.placeId === item.id) {
      addRelation({
        sourceId: other.id,
        targetId: item.id,
        sourceTitle: other.title,
        targetTitle: item.title,
        sourceType: other.type,
        targetType: item.type,
        type: 'bulunduğu yer',
        isProposal: false,
        originItemId: other.id
      });
    }
  });

  // --- 4. Process implicit brandId metadata reference ---
  if (item.metadata?.brandId) {
    const target = itemMap.get(item.metadata.brandId);
    if (target && !target.archived) {
      addRelation({
        sourceId: item.id,
        targetId: target.id,
        sourceTitle: item.title,
        targetTitle: target.title,
        sourceType: item.type,
        targetType: target.type,
        type: 'ait olduğu marka',
        isProposal: false,
        originItemId: item.id
      });
    }
  }

  // Incoming brandId references
  allItems.forEach(other => {
    if (other.id === item.id || other.archived) return;
    if (other.metadata?.brandId === item.id) {
      addRelation({
        sourceId: other.id,
        targetId: item.id,
        sourceTitle: other.title,
        targetTitle: item.title,
        sourceType: other.type,
        targetType: item.type,
        type: 'ait olduğu marka',
        isProposal: false,
        originItemId: other.id
      });
    }
  });

  // --- 5. Process legacy links array ---
  const itemLinks = item.links || [];
  itemLinks.forEach(targetId => {
    const target = itemMap.get(targetId);
    if (target && !target.archived) {
      addRelation({
        sourceId: item.id,
        targetId: target.id,
        sourceTitle: item.title,
        targetTitle: target.title,
        sourceType: item.type,
        targetType: target.type,
        type: 'genel bağlantı',
        isProposal: false,
        originItemId: item.id
      });
    }
  });

  // Incoming legacy links
  allItems.forEach(other => {
    if (other.id === item.id || other.archived) return;
    const otherLinks = other.links || [];
    if (otherLinks.includes(item.id)) {
      addRelation({
        sourceId: other.id,
        targetId: item.id,
        sourceTitle: other.title,
        targetTitle: item.title,
        sourceType: other.type,
        targetType: item.type,
        type: 'genel bağlantı',
        isProposal: false,
        originItemId: other.id
      });
    }
  });

  return Array.from(relationsMap.values());
}

// Generate high-confidence relationship suggestions for currently unlinked (floating) entities
export function generateAiProposalsForUnlinked(allItems: Item[]): { itemId: string; proposals: Relation[] }[] {
  const result: { itemId: string; proposals: Relation[] }[] = [];

  // Find the target main Yer (The Imperial Kemskøy hotel)
  const kemskoyHotel = allItems.find(
    i => !i.archived && (i.id === 'kemskoy_hotel' || i.title.toLowerCase().includes('imperial kemskøy'))
  );

  // Find target main brands
  const kucukcetmiBrand = allItems.find(
    i => !i.archived && i.type === 'marka' && i.title.toLowerCase().includes('küçükçetmi')
  );

  const kemsCompanyBrand = allItems.find(
    i => !i.archived && i.type === 'marka' && i.title.toLowerCase().includes('kems company')
  );

  const dumanCat = allItems.find(
    i => !i.archived && i.title.toLowerCase().includes('duman')
  );

  const reyhanUser = allItems.find(
    i => !i.archived && i.title.toLowerCase().includes('reyhan')
  );

  allItems.forEach(item => {
    // We only propose for unlinked or partially unlinked characters/places to help build the web
    if (item.archived || item.isProposal || item.type === 'marka' || item.type === 'map_settings') return;

    const proposals: Relation[] = [];
    const titleLower = item.title.toLowerCase();
    const notesLower = (item.notes || '').toLowerCase();
    const ignoredProposals: string[] = item.metadata?.ignoredProposals || [];

    const isIgnored = (targetId: string, type: string) => {
      const targetItem = allItems.find(i => i.id === targetId);
      const targetIgnored = targetItem?.metadata?.ignoredProposals || [];
      return (
        ignoredProposals.includes(targetId) || 
        ignoredProposals.includes(`${targetId}::${type}`) ||
        targetIgnored.includes(item.id) ||
        targetIgnored.includes(`${item.id}::${type}`)
      );
    };

    // 1. Kemskøy staff/guests suggestions to the hotel "The Imperial Kemskøy"
    if (kemskoyHotel && item.id !== kemskoyHotel.id) {
      if (item.tags.includes('kemskoy') || item.tags.includes('personel') || item.tags.includes('misafir') || notesLower.includes('kemskøy') || notesLower.includes('otelde')) {
        const isStaff = item.tags.includes('personel') || notesLower.includes('personel') || titleLower.includes('cemal') || titleLower.includes('nusret');
        const relType = isStaff ? 'çalışanı' : 'bulunduğu yer';
        if (!isIgnored(kemskoyHotel.id, relType)) {
          proposals.push({
            targetId: kemskoyHotel.id,
            type: relType,
            isProposal: true,
            reason: isStaff 
              ? 'Kemskøy personeli olarak otel kadrosuna ait.'
              : 'Kemskøy misafiri olarak otel konaklama listesinde yer alıyor.'
          });
        }
      }
    }

    // 2. Pet link: Reyhan Üsküp <-> Duman (kedi)
    if (reyhanUser && dumanCat) {
      if (item.id === reyhanUser.id) {
        if (!isIgnored(dumanCat.id, 'sahibi')) {
          proposals.push({
            targetId: dumanCat.id,
            type: 'sahibi',
            isProposal: true,
            reason: 'Reyhan Üsküp, Duman adlı kedinin sahibidir.'
          });
        }
      } else if (item.id === dumanCat.id) {
        if (!isIgnored(reyhanUser.id, 'sahibi')) {
          proposals.push({
            targetId: reyhanUser.id,
            type: 'sahibi',
            isProposal: true,
            reason: 'Duman, Reyhan Üsküp\'ün evcil hayvanıdır.'
          });
        }
      }
    }

    // 3. Brand links
    // Küçükçetmi Sürek Kulübü
    if (kucukcetmiBrand) {
      if (item.tags.includes('küçükçetmi') || notesLower.includes('küçükçetmi') || titleLower.includes('kamil') || titleLower.includes('çetmi')) {
        if (!isIgnored(kucukcetmiBrand.id, 'ait olduğu marka')) {
          proposals.push({
            targetId: kucukcetmiBrand.id,
            type: 'ait olduğu marka',
            isProposal: true,
            reason: 'Küçükçetmi yerleşkesi veya topluluğuyla ilişkili.'
          });
        }
      }
    }

    // Kems Company brand
    if (kemsCompanyBrand) {
      if (item.tags.includes('kems') || notesLower.includes('kems holding') || notesLower.includes('kems company')) {
        if (!isIgnored(kemsCompanyBrand.id, 'ait olduğu marka')) {
          proposals.push({
            targetId: kemsCompanyBrand.id,
            type: 'ait olduğu marka',
            isProposal: true,
            reason: 'Kems Company bünyesinde yer almaktadır.'
          });
        }
      }
    }

    if (proposals.length > 0) {
      result.push({ itemId: item.id, proposals });
    }
  });

  return result;
}

// Clean up references to a deleted item across all other items' relations and legacy links
export async function cleanupRelationsOnDelete(
  deletedId: string,
  allItems: Item[],
  onUpdateItem: (item: Item) => Promise<void>
): Promise<void> {
  const updates: Promise<void>[] = [];

  allItems.forEach(item => {
    if (item.id === deletedId) return;

    let changed = false;
    const updatedMetadata = { ...(item.metadata || {}) };

    // 1. Clean from relations array
    if (updatedMetadata.relations && Array.isArray(updatedMetadata.relations)) {
      const originalLength = updatedMetadata.relations.length;
      updatedMetadata.relations = updatedMetadata.relations.filter((r: any) => r.targetId !== deletedId);
      if (updatedMetadata.relations.length !== originalLength) {
        changed = true;
      }
    }

    // 2. Clean from placeId or brandId parent pointers
    if (updatedMetadata.placeId === deletedId) {
      delete updatedMetadata.placeId;
      changed = true;
    }
    if (updatedMetadata.brandId === deletedId) {
      delete updatedMetadata.brandId;
      changed = true;
    }

    // 3. Clean from legacy links array
    let updatedLinks = [...(item.links || [])];
    if (updatedLinks.includes(deletedId)) {
      updatedLinks = updatedLinks.filter(id => id !== deletedId);
      changed = true;
    }

    if (changed) {
      updates.push(
        onUpdateItem({
          ...item,
          links: updatedLinks,
          metadata: updatedMetadata
        })
      );
    }
  });

  await Promise.all(updates);
}

