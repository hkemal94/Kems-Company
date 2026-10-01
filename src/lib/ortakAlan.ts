import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Item } from '../types';

/**
 * Eski ortak alan (1 Ekim, Kemal: "bilmiyorum, bak"). 30 Eylül'e kadar
 * Google'a bağlanmadan girilen kayıtlar `users/kems_public` altında
 * duruyordu; ortak alan kalktı. Burada yalnız okunur. Taşıma tek seferlik
 * ve düğmeyle: Kemal basınca kendi alanında olmayan kayıtlar oraya yazılır,
 * ikinci basışta taşınacak bir şey kalmaz.
 */
export const ORTAK_ALAN = 'kems_public';

export async function ortakAlanKayitlari(): Promise<Item[]> {
  const snap = await getDocs(collection(db, 'users', ORTAK_ALAN, 'items'));
  return snap.docs.map(d => ({ ...(d.data() as Item), id: d.id }));
}

/** Kendi alanında aynı kimlikle bulunmayan, arşivde olmayan kayıtlar */
export function tasinacaklar(ortak: Item[], benim: Item[]): Item[] {
  const var_ = new Set(benim.map(i => i.id));
  return ortak.filter(i => !var_.has(i.id) && !i.archived && !i.isProposal);
}
