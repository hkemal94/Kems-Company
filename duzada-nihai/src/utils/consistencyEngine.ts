import { Item, WikiSection } from '../types';
import { getCharacterKunye } from '../components/Duzada';

export interface ConsistencyIssue {
  id: string;
  module: 'kisi' | 'marka' | 'merch' | 'kitap' | 'blog' | 'duzada' | 'oyun';
  title: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  proposedFix: string;
  fixAction: 
    | { type: 'update'; item: Item }
    | { type: 'create'; item: Omit<Item, 'createdAt' | 'updatedAt' | 'userId'> & { id?: string } }
    | { type: 'batch'; actions: { type: 'update' | 'create'; item: any }[] };
}

// Helper to normalize strings for comparison
const normalize = (str: string) => str.trim().toLowerCase().replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c');

export function checkKisiConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);
  const otherEntities = items.filter(i => i.type !== 'kisi' && i.type !== 'karakter' && !i.archived);

  for (const char of kisiler) {
    const kunye = getCharacterKunye(char);
    const notesLower = normalize(char.notes || '');

    // 1. Referenced place/mekan not linked
    const places = otherEntities.filter(i => i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân');
    for (const place of places) {
      const placeNorm = normalize(place.title);
      if (placeNorm.length > 3 && notesLower.includes(placeNorm)) {
        if (!char.links?.includes(place.id)) {
          issues.push({
            id: `kisi_link_place_${char.id}_${place.id}`,
            module: 'kisi',
            title: 'Eksik Mekân Bağlantısı',
            type: 'warning',
            message: `"${char.title}" karakterinin notlarında "${place.title}" mekânından bahsediliyor fakat aralarında aktif bir wiki bağlantısı bulunmuyor.`,
            proposedFix: `"${char.title}" künyesine "${place.title}" mekân bağlantısını otomatik ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...char,
                links: Array.from(new Set([...(char.links || []), place.id]))
              }
            }
          });
        }
      }
    }

    // 2. Referenced brand not linked
    const brands = otherEntities.filter(i => i.type === 'marka');
    for (const brand of brands) {
      const brandNorm = normalize(brand.title);
      if (brandNorm.length > 3 && notesLower.includes(brandNorm)) {
        if (!char.links?.includes(brand.id)) {
          issues.push({
            id: `kisi_link_brand_${char.id}_${brand.id}`,
            module: 'kisi',
            title: 'Eksik Marka Bağlantısı',
            type: 'warning',
            message: `"${char.title}" karakterinin notlarında "${brand.title}" markasından bahsediliyor fakat aralarında aktif bir wiki bağlantısı bulunmuyor.`,
            proposedFix: `"${char.title}" künyesine "${brand.title}" marka bağlantısını otomatik ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...char,
                links: Array.from(new Set([...(char.links || []), brand.id]))
              }
            }
          });
        }
      }
    }

    // 3. Mentioned other characters not linked (Mutual Connection)
    for (const otherChar of kisiler) {
      if (otherChar.id === char.id) continue;
      const otherCharNorm = normalize(otherChar.title);
      if (otherCharNorm.length > 3 && notesLower.includes(otherCharNorm)) {
        if (!char.links?.includes(otherChar.id)) {
          issues.push({
            id: `kisi_link_kisi_${char.id}_${otherChar.id}`,
            module: 'kisi',
            title: 'İki Yönlü Karakter İlişkisi Eksik',
            type: 'info',
            message: `"${char.title}" sakinimizin biyografisinde "${otherChar.title}" karakterinin adı geçiyor fakat aralarında wiki bağı kurulmamış.`,
            proposedFix: `"${char.title}" ile "${otherChar.title}" karakterleri arasına karşılıklı wiki bağlantıları tanımla.`,
            fixAction: {
              type: 'batch',
              actions: [
                {
                  type: 'update',
                  item: {
                    ...char,
                    links: Array.from(new Set([...(char.links || []), otherChar.id]))
                  }
                },
                {
                  type: 'update',
                  item: {
                    ...otherChar,
                    links: Array.from(new Set([...(otherChar.links || []), char.id]))
                  }
                }
              ]
            }
          });
        }
      }
    }

    // 4. Age or Role contradictions with book chapters, game events, or blog posts
    // Let's search books, blogs, and game operations for explicit age statements (e.g. "Kerem 35 yaşında" or "Cemal garsonluk yapıyor")
    // If the role or age differs from kunye.yas / kunye.rol, raise alert.
    const chapters = items.filter(i => i.type === 'kitap_bolum' && !i.archived);
    for (const chapter of chapters) {
      const chapNotesNorm = normalize(chapter.notes || '');
      const charNameNorm = normalize(char.title);
      if (chapNotesNorm.includes(charNameNorm)) {
        // Look for age contradiction pattern (e.g. "ad [sayı] yaşında" or similar)
        const ageMatch = chapNotesNorm.match(new RegExp(`${charNameNorm}[^\\d]*(\\d+)\\s*(yasinda|yaslarinda|yasindaki)`, 'i'));
        if (ageMatch && kunye.yas) {
          const matchedAge = parseInt(ageMatch[1]);
          if (matchedAge !== Number(kunye.yas)) {
            issues.push({
              id: `kisi_age_contradiction_${char.id}_${chapter.id}`,
              module: 'kisi',
              title: 'Yaş Tutarsızlığı Algılandı',
              type: 'error',
              message: `Kitap bölümünde (${chapter.title}) "${char.title}" karakterinin yaşı ${matchedAge} olarak belirtilmiş, ancak karakter künyesinde yaşı ${kunye.yas} olarak kayıtlı.`,
              proposedFix: `Karakter künyesindeki yaşı kitap kurgusuyla uyumlu hale getirerek ${matchedAge} yap.`,
              fixAction: {
                type: 'update',
                item: {
                  ...char,
                  notes: char.notes.replace(new RegExp(`Yaş:\\s*${kunye.yas}`, 'i'), `Yaş: ${matchedAge}`)
                }
              }
            });
          }
        }
      }
    }
  }

  return issues;
}

export function checkMarkaConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const markalar = items.filter(i => i.type === 'marka' && !i.archived);
  const merchItems = items.filter(i => (i.type === 'ürün' || i.type === 'drop' || i.type === 'merch_urun') && !i.archived);
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);

  for (const brand of markalar) {
    const brandNotesLower = normalize(brand.notes || '');

    // 1. Brand has no associated merch
    const brandProducts = merchItems.filter(p => p.metadata?.brandId === brand.id || p.links?.includes(brand.id));
    if (brandProducts.length === 0) {
      issues.push({
        id: `brand_no_products_${brand.id}`,
        module: 'marka',
        title: 'Markaya Ait Ürün/Merch Eksik',
        type: 'warning',
        message: `"${brand.title}" markası tanımlanmış ancak portföyünde veya koleksiyonunda hiçbir Merchandise ürünü ya da Drop bulunmuyor.`,
        proposedFix: `Markaya ait ilk konsept ürün taslağını ("${brand.title} İmza Defteri") otomatik olarak oluştur.`,
        fixAction: {
          type: 'create',
          item: {
            id: `merch_${brand.id}_draft_${Date.now()}`,
            title: `${brand.title} İmza Defteri`,
            area: 'merch',
            type: 'ürün',
            status: 'Konsept',
            priority: 'orta',
            tags: ['ürün', 'taslak', 'koleksiyon'],
            links: [brand.id],
            notes: `Düzada estetiğine ve ${brand.title} ruhuna uygun arşivlik lüks imza defteri.`,
            images: [],
            isProposal: true,
            archived: false,
            metadata: {
              brandId: brand.id,
              category: 'aksesuar',
              rarity: 'Standart',
              material: 'Geri Dönüştürülmüş Arşiv Kağıdı',
              function: 'Günlük & Not Defteri'
            }
          }
        }
      });
    }

    // 2. Mentioned entities not in links
    for (const char of kisiler) {
      const charNorm = normalize(char.title);
      if (charNorm.length > 3 && brandNotesLower.includes(charNorm)) {
        if (!brand.links?.includes(char.id)) {
          issues.push({
            id: `brand_link_kisi_${brand.id}_${char.id}`,
            module: 'marka',
            title: 'Karakter Bağlantısı Eksik',
            type: 'info',
            message: `"${brand.title}" marka açıklamasında "${char.title}" karakteri geçiyor fakat marka ilişkilerinde bu bağ bulunmuyor.`,
            proposedFix: `Marka bağlantılarına "${char.title}" sakinini ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...brand,
                links: Array.from(new Set([...(brand.links || []), char.id]))
              }
            }
          });
        }
      }
    }
  }

  return issues;
}

export function checkMerchConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const merchItems = items.filter(i => (i.type === 'ürün' || i.type === 'drop' || i.type === 'merch_urun') && !i.archived);
  const markalar = items.filter(i => i.type === 'marka' && !i.archived);
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);

  for (const merch of merchItems) {
    const brandId = merch.metadata?.brandId || merch.links?.find(id => markalar.some(m => m.id === id));

    // 1. Merch drop/product not bound to any Marka
    if (!brandId) {
      const defaultBrand = markalar.find(m => m.id === 'kems_company') || markalar[0];
      issues.push({
        id: `merch_no_brand_${merch.id}`,
        module: 'merch',
        title: 'Öksüz Ürün (Marka Bağlantısı Yok)',
        type: 'error',
        message: `"${merch.title}" adlı merchandise ürünü/koleksiyonu hiçbir markaya bağlı değil.`,
        proposedFix: defaultBrand 
          ? `Ürünü ana holdingimiz olan "${defaultBrand.title}" markası altına bağla.`
          : 'Geçici olarak Kems Company markasına bağla.',
        fixAction: {
          type: 'update',
          item: {
            ...merch,
            links: Array.from(new Set([...(merch.links || []), defaultBrand?.id || 'kems_company'])),
            metadata: {
              ...(merch.metadata || {}),
              brandId: defaultBrand?.id || 'kems_company'
            }
          }
        }
      });
    }

    // 2. Referenced characters in notes not linked
    const notesLower = normalize(merch.notes || '');
    for (const char of kisiler) {
      const charNorm = normalize(char.title);
      if (charNorm.length > 3 && notesLower.includes(charNorm)) {
        if (!merch.links?.includes(char.id)) {
          issues.push({
            id: `merch_link_kisi_${merch.id}_${char.id}`,
            module: 'merch',
            title: 'Tasarım İlişkisi Eksik (Kişi)',
            type: 'info',
            message: `"${merch.title}" tasarım notlarında "${char.title}" esintisi/etkisi bulunuyor ancak ürünün bağlantılarında bu kişi ekli değil.`,
            proposedFix: `Ürünün bağlantılar listesine "${char.title}" karakterini ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...merch,
                links: Array.from(new Set([...(merch.links || []), char.id]))
              }
            }
          });
        }
      }
    }
  }

  return issues;
}

export function checkKitapConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const chapters = items.filter(i => i.type === 'kitap_bolum' && !i.archived);
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);
  const places = items.filter(i => (i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân') && !i.archived);

  for (const chap of chapters) {
    const textLower = normalize(chap.notes || '');

    // 1. Chapter mentions character but not linked
    for (const char of kisiler) {
      const charNorm = normalize(char.title);
      if (charNorm.length > 3 && textLower.includes(charNorm)) {
        if (!chap.links?.includes(char.id)) {
          issues.push({
            id: `kitap_link_kisi_${chap.id}_${char.id}`,
            module: 'kitap',
            title: 'Kurguda Bahsedilen Karakter Bağlanmamış',
            type: 'warning',
            message: `Kitap Bölümü "${chap.title}" metninde "${char.title}" sakininden bahsediliyor fakat bölüm ilişkilerinde ekli değil.`,
            proposedFix: `Bölümün referans bağlantılarına "${char.title}" karakterini ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...chap,
                links: Array.from(new Set([...(chap.links || []), char.id]))
              }
            }
          });
        }
      }
    }

    // 2. Chapter mentions place but not linked
    for (const place of places) {
      const placeNorm = normalize(place.title);
      if (placeNorm.length > 3 && textLower.includes(placeNorm)) {
        if (!chap.links?.includes(place.id)) {
          issues.push({
            id: `kitap_link_place_${chap.id}_${place.id}`,
            module: 'kitap',
            title: 'Kurguda Geçen Mekân Bağlanmamış',
            type: 'warning',
            message: `Kitap Bölümü "${chap.title}" metninde "${place.title}" mekânından bahsediliyor fakat ilişkiler listesinde bu bağ bulunmuyor.`,
            proposedFix: `Bölüm referans bağlantılarına "${place.title}" mekânını ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...chap,
                links: Array.from(new Set([...(chap.links || []), place.id]))
              }
            }
          });
        }
      }
    }
  }

  return issues;
}

export function checkBlogConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const posts = items.filter(i => i.type === 'blog_post' && !i.archived);
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);
  const brands = items.filter(i => i.type === 'marka' && !i.archived);

  for (const post of posts) {
    const textLower = normalize(post.notes || '');

    // 1. Post mentions character but not linked
    for (const char of kisiler) {
      const charNorm = normalize(char.title);
      if (charNorm.length > 3 && textLower.includes(charNorm)) {
        if (!post.links?.includes(char.id)) {
          issues.push({
            id: `blog_link_kisi_${post.id}_${char.id}`,
            module: 'blog',
            title: 'Blog Yazısında Bahsedilen Sakin Eksik',
            type: 'info',
            message: `"${post.title}" blog yazısında "${char.title}" karakterinin adı geçiyor fakat blog bağlantıları arasında tanımlanmamış.`,
            proposedFix: `Yazı bağlantılarına "${char.title}" karakterini ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...post,
                links: Array.from(new Set([...(post.links || []), char.id]))
              }
            }
          });
        }
      }
    }

    // 2. Post mentions brand but not linked
    for (const brand of brands) {
      const brandNorm = normalize(brand.title);
      if (brandNorm.length > 3 && textLower.includes(brandNorm)) {
        if (!post.links?.includes(brand.id)) {
          issues.push({
            id: `blog_link_brand_${post.id}_${brand.id}`,
            module: 'blog',
            title: 'Blog Yazısında Geçen Marka Eksik',
            type: 'info',
            message: `"${post.title}" blog yazısında "${brand.title}" markası geçiyor fakat blog bağlantılarında yer almıyor.`,
            proposedFix: `Yazı bağlantılarına "${brand.title}" markasını bağla.`,
            fixAction: {
              type: 'update',
              item: {
                ...post,
                links: Array.from(new Set([...(post.links || []), brand.id]))
              }
            }
          });
        }
      }
    }
  }

  return issues;
}

export function checkDuzadaConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const places = items.filter(i => (i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân') && !i.archived);
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);

  for (const place of places) {
    const textLower = normalize(place.notes || '');

    // 1. Place has a manager or representative character, but no links exist
    const managerName = place.metadata?.profile?.manager;
    if (managerName) {
      const match = kisiler.find(c => normalize(c.title) === normalize(managerName));
      if (match && !place.links?.includes(match.id)) {
        issues.push({
          id: `place_manager_not_linked_${place.id}_${match.id}`,
          module: 'duzada',
          title: 'Sorumlu Yönetici Bağlantısı Yok',
          type: 'warning',
          message: `"${place.title}" işletmesinin yöneticisi olarak "${managerName}" belirtilmiş, ancak aralarında aktif bir wiki bağı kurulmamış.`,
          proposedFix: `"${place.title}" mekânı ile sorumlu sakin "${match.title}" arasına karşılıklı wiki bağlantıları tanımla.`,
          fixAction: {
            type: 'batch',
            actions: [
              {
                type: 'update',
                item: {
                  ...place,
                  links: Array.from(new Set([...(place.links || []), match.id]))
                }
              },
              {
                type: 'update',
                item: {
                  ...match,
                  links: Array.from(new Set([...(match.links || []), place.id]))
                }
              }
            ]
          }
        });
      }
    }

    // 2. Place mentions another place in description but not linked
    for (const otherPlace of places) {
      if (otherPlace.id === place.id) continue;
      const otherPlaceNorm = normalize(otherPlace.title);
      if (otherPlaceNorm.length > 3 && textLower.includes(otherPlaceNorm)) {
        if (!place.links?.includes(otherPlace.id)) {
          issues.push({
            id: `place_link_place_${place.id}_${otherPlace.id}`,
            module: 'duzada',
            title: 'Bitişik/İlişkili Mekân Bağı Eksik',
            type: 'info',
            message: `"${place.title}" açıklamasında komşu veya ilişkili diğer mekân "${otherPlace.title}" geçiyor, ancak wiki bağlantısı kurulmamış.`,
            proposedFix: `Mekân bağlantılarına "${otherPlace.title}" mekânını ekle.`,
            fixAction: {
              type: 'update',
              item: {
                ...place,
                links: Array.from(new Set([...(place.links || []), otherPlace.id]))
              }
            }
          });
        }
      }
    }
  }

  return issues;
}

export function checkOyunConsistency(items: Item[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const games = items.filter(i => i.type === 'map_settings' && !i.archived); // Oyun settings/günleri
  const kisiler = items.filter(i => (i.type === 'kisi' || i.type === 'karakter') && !i.archived);
  const places = items.filter(i => (i.type === 'mekân' || i.type === 'yer' || i.type === 'dükkân') && !i.archived);

  for (const game of games) {
    const ops = game.metadata?.operations || [];
    for (const op of ops) {
      // 1. Linked character ID does not exist in the database
      if (op.linkedCharacterId && !kisiler.some(k => k.id === op.linkedCharacterId)) {
        // Try to find a character by close name matching
        const whoLower = normalize(op.whoWhat);
        const match = kisiler.find(k => normalize(k.title) === whoLower);
        if (match) {
          issues.push({
            id: `oyun_invalid_char_link_${game.id}_${op.id}`,
            module: 'oyun',
            title: 'Hatalı Karakter ID Eşleşmesi',
            type: 'error',
            message: `Oyun günü "${game.title}" içindeki "${op.whoWhat}" işleminde geçersiz bir Karakter ID referansı var.`,
            proposedFix: `İşlemin karakter bağlantısını veri tabanındaki eşleşen "${match.title}" sakini ile onar.`,
            fixAction: {
              type: 'update',
              item: {
                ...game,
                metadata: {
                  ...(game.metadata || {}),
                  operations: ops.map((o: any) => o.id === op.id ? { ...o, linkedCharacterId: match.id } : o)
                }
              }
            }
          });
        }
      }

      // 2. Linked place/room ID does not exist
      if (op.linkedRoomId && !places.some(p => p.id === op.linkedRoomId)) {
        issues.push({
          id: `oyun_invalid_room_link_${game.id}_${op.id}`,
          module: 'oyun',
          title: 'Geçersiz Bölge/Oda Referansı',
          type: 'warning',
          message: `Oyun günü "${game.title}" işleminde (${op.whoWhat}) geçersiz veya silinmiş bir oda referansı bulunuyor.`,
          proposedFix: `İlgili işlemdeki oda referansını temizle ve otel lobisine yönlendir.`,
          fixAction: {
            type: 'update',
            item: {
              ...game,
              metadata: {
                ...(game.metadata || {}),
                operations: ops.map((o: any) => o.id === op.id ? { ...o, linkedRoomId: undefined } : o)
              }
            }
          }
        });
      }

      // 3. Contradictory roles or descriptions mentioned in game operations vs kunye
      if (op.linkedCharacterId) {
        const char = kisiler.find(k => k.id === op.linkedCharacterId);
        if (char) {
          const kunye = getCharacterKunye(char);
          const opDescLower = normalize(op.description || '');
          const charRoleLower = normalize(kunye.rol || '');

          // Check if game day says they are working as another position or hints another name
          if (charRoleLower && opDescLower.includes('aşçı') && !charRoleLower.includes('ascı') && !charRoleLower.includes('mutfak') && !charRoleLower.includes('şef')) {
            issues.push({
              id: `oyun_role_mismatch_${game.id}_${op.id}_${char.id}`,
              module: 'oyun',
              title: 'Görev / Rol Çelişkisi',
              type: 'warning',
              message: `Oyun işleminde "${char.title}" karakterinin aşçılık/mutfak görevi yaptığı belirtiliyor, ancak karakterin asıl rolü "${kunye.rol}" olarak tanımlanmış.`,
              proposedFix: `İşlem kurgusuna uygun şekilde karakter künyesindeki meslek alanını "Mutfak Ekibi / ${kunye.rol}" olarak güncelle.`,
              fixAction: {
                type: 'update',
                item: {
                  ...char,
                  metadata: {
                    ...(char.metadata || {}),
                    profile: {
                      ...(char.metadata?.profile || {}),
                      profession: `Mutfak Ekibi / ${kunye.rol}`
                    }
                  }
                }
              }
            });
          }
        }
      }
    }
  }

  return issues;
}
