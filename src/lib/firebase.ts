import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, collection, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs, writeBatch } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Item, UserSettings } from "../types";

const config: any = firebaseConfig;
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId || "(default)");
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/documents.readonly');

let cachedAccessToken: string | null = null;

export const getCachedAccessToken = () => cachedAccessToken;
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Sign-in helper
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (error) {
    console.error("Giriş yapılırken hata oluştu:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Çıkış yapılırken hata oluştu:", error);
    throw error;
  }
};

// Seed Example Data for new users
export const seedUserData = async (userId: string) => {
  const itemsRef = collection(db, "users", userId, "items");
  let existingItems;
  try {
    existingItems = await getDocs(itemsRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/items`);
    return;
  }
  
  if (!existingItems.empty) return; // User already has data

  const batch = writeBatch(db);

  // 1. Kamil Efendi (Karakter)
  const kamilId = "kamil_efendi_" + Date.now();
  const kamilRef = doc(itemsRef, kamilId);
  batch.set(kamilRef, {
    id: kamilId,
    title: "Kamil Efendi",
    area: "duzada",
    type: "karakter",
    status: "Bitti",
    priority: "yüksek",
    tags: ["karakter", "küçükçetmi", "arşiv", "lore"],
    links: [],
    notes: "Düzada'nın en eski sakinlerinden biri. Küçükçetmi Köyü'nde yaşar ve adanın geçmişine dair kayıp parşömenleri korur. Ağırbaşlı, pipo içen ve antik Yunanca bilen bilge bir şahsiyettir.",
    images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop"],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 4,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      region: "merkez",
      haritaKonum: { x: 46, y: 52 },
      wikiSections: [
        { id: "1", title: "Köken ve Gençlik", content: "Kamil Efendi, adanın merkezindeki eski taş evlerde doğdu. Gençliğinde Kems Arşivleri'nde kâtip olarak çalıştı.", status: "resmi" },
        { id: "2", title: "Sır Parşömenleri", content: "Kamil Efendi'nin evinde sakladığı, Düzada'nın kuruluşuna dair gizemli haritalar ve belgeler olduğuna inanılır.", status: "resmi" }
      ],
      brandKit: {
        selectedLogo: "Kamil Efendi'nin Mührü - Çift Başlı Turna",
        ideaLogos: ["Turna Mührü", "Zeytin Dalı Amblemi"],
        colorPalette: ["#1B2A4A", "#9DB0A4", "#BBA591"],
        exemplaryWorks: ["Antik Mühür Örneği"],
        selectedFont: "Garamond"
      }
    }
  });

  // 2. Küçükçetmi Köy Meydanı (Mekân)
  const meydanId = "kucukcetmi_meydan_" + Date.now();
  const meydanRef = doc(itemsRef, meydanId);
  batch.set(meydanRef, {
    id: meydanId,
    title: "Küçükçetmi Köy Meydanı",
    area: "duzada",
    type: "yer",
    status: "Bitti",
    priority: "orta",
    tags: ["yer", "küçükçetmi", "merkez"],
    links: [kamilId],
    notes: "Yüzyıllık tarihi çınarın gölgesinde uzanan, taş döşeli otantik köy meydanı. Kahvehaneler, zeytinyağı atölyeleri ve eski çeşme bu meydanın etrafında konumlanır. Düzada'nın sosyal kalbidir.",
    images: ["https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=512&auto=format&fit=crop"],
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 3,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      region: "merkez",
      haritaKonum: { x: 48, y: 50 },
      wikiSections: [
        { id: "1", title: "Tarihi Çınar", content: "Meydanın merkezindeki çınar ağacının yaklaşık 400 yıllık olduğu söylenir. Gövde çevresi 6 metreyi bulur.", status: "resmi" }
      ]
    }
  });

  // Update Kamil's links to point back to the square
  batch.update(kamilRef, { links: [meydanId] });

  // 3. Sürek Şenliği Tertip Komitesi (Kulüp)
  const komiteId = "surek_komitesi_" + Date.now();
  const komiteRef = doc(itemsRef, komiteId);
  batch.set(komiteRef, {
    id: komiteId,
    title: "Sürek Şenliği Tertip Komitesi",
    area: "duzada",
    type: "kulüp",
    status: "Planlandı",
    priority: "yüksek",
    tags: ["kulüp", "küçükçetmi", "etkinlik"],
    links: [meydanId],
    notes: "Her yıl düzenlenen Sürek Şenliği'nin bütçe, program, lojistik ve tasarım işlerini koordine eden, gönüllü ada sakinlerinden oluşan resmi kulüp.",
    images: [],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 2,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      wikiSections: [
        { id: "1", title: "Yıllık Bütçe ve Destek", content: "Şenlik bütçesi tamamen Kems Company sponsorluğu ve yerel halkın zeytin satışlarından elde ettiği bağışlarla toplanır.", status: "resmi" }
      ],
      brandKit: {
        selectedLogo: "Geleneksel Başak ve Çınar Yaprağı Amblemi",
        ideaLogos: ["Çapraz Başaklar", "Modern Çınar Yaprağı"],
        colorPalette: ["#D35057", "#7C8A5A", "#E4DCCD"],
        exemplaryWorks: ["Geçen Yılın Afişi"],
        selectedFont: "Space Grotesk"
      }
    }
  });

  // 4. Sürek Şenliği (Olay)
  const senlikId = "surek_senligi_" + Date.now();
  const senlikRef = doc(itemsRef, senlikId);
  batch.set(senlikRef, {
    id: senlikId,
    title: "Sürek Şenliği",
    area: "duzada",
    type: "olay",
    status: "Planlandı",
    priority: "yüksek",
    tags: ["olay", "küçükçetmi", "festival"],
    links: [meydanId, komiteId],
    notes: "Sonbahar ekinoksunda Küçükçetmi Meydanı'nda düzenlenen, ada üzümlerinin sıkıldığı, zeytinyağlarının tadıldığı ve adalı sanatçıların performans sergilediği geleneksel şenlik.",
    images: ["https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=512&auto=format&fit=crop"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 1,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      date: "2026-09-22",
      recurrence: "Her Yıl (Ekinoksta)",
      wikiSections: [
        { id: "1", title: "Hasat Seremonisi", content: "Şenliğin açılışında en yaşlı ada sakini (Kamil Efendi) ilk sıkılan zeytinyağını tarihi çınarın dibine döker.", status: "resmi" }
      ]
    }
  });

  // 5. Ege Rüzgarları (Merch Tema)
  const temaId = "ege_ruzgarlari_" + Date.now();
  const temaRef = doc(itemsRef, temaId);
  batch.set(temaRef, {
    id: temaId,
    title: "Ege Rüzgarları",
    area: "merch",
    type: "tema",
    status: "Çalışılıyor",
    priority: "orta",
    tags: ["merch", "tema", "ege", "giyim"],
    links: [meydanId],
    notes: "Küçükçetmi'nin serin melteminden, ada zeytinlerinin yaprak renginden ve deniz mavisinden ilham alan, retro-arşivsel estetiğe sahip giyim ve aksesuar kalıcı teması.",
    images: [],
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 5,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      moodboard: [
        "https://images.unsplash.com/photo-1505022610485-0249ba5b3675?q=80&w=256&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=256&auto=format&fit=crop"
      ]
    }
  });

  // 6. Küçükçetmi Dropu (Merch Drop)
  const dropId = "kucukcetmi_drop_" + Date.now();
  const dropRef = doc(itemsRef, dropId);
  batch.set(dropRef, {
    id: dropId,
    title: "Küçükçetmi Dropu",
    area: "merch",
    type: "drop",
    status: "Tasarım", // Drop specific status
    priority: "yüksek",
    tags: ["drop", "küçükçetmi", "sürek-şenliği"],
    links: [temaId, senlikId],
    notes: "Sürek Şenliği'nin gelişini kutlamak amacıyla üretilen, şenliğin ve Küçükçetmi'nin renklerini taşıyan mini limitli koleksiyon.",
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=512&auto=format&fit=crop"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 1,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      themeId: temaId,
      editionCount: 1,
      editionNotes: "1. Edisyon: Şenlik logolu özel ahşap etiketli seriler."
    }
  });

  // 7. Sürek Şenliği Tişörtü (Merch Ürün)
  const urunId = "senlik_tisort_" + Date.now();
  const urunRef = doc(itemsRef, urunId);
  batch.set(urunRef, {
    id: urunId,
    title: "Sürek Şenliği Tişörtü",
    area: "merch",
    type: "merch_urun",
    status: "Tasarım", // Ürün specific status
    priority: "yüksek",
    tags: ["ürün", "tişört", "küçükçetmi"],
    links: [dropId, senlikId, kamilId],
    notes: "%100 organik pamuk, ekru renk, arkasında Kamil Efendi'nin turna mührü olan özel tasarım şenlik tişörtü.",
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=256&auto=format&fit=crop"],
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now(),
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      themeId: temaId,
      dropId: dropId,
      variantColor: "Ekru / Zeytin Yeşili",
      category: "giyim"
    }
  });

  // 8. Küçükçetmi'nin Kayıp Amblemleri (Blog Post)
  const postId = "kayip_amblemler_post_" + Date.now();
  const postRef = doc(itemsRef, postId);
  batch.set(postRef, {
    id: postId,
    title: "Küçükçetmi'nin Kayıp Amblemleri",
    area: "blog",
    type: "blog_post",
    status: "Taslak", // Blog status
    priority: "orta",
    tags: ["yazı", "lore", "küçükçetmi", "amblem"],
    links: [kamilId, meydanId],
    notes: "Küçükçetmi kahvehanesindeki eski ocak taşında kazılı olan turna kuşu figürünün kökenlerini araştıran ve Kamil Efendi'nin anlatımlarıyla şekillenen lore taslağı.",
    images: [],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 1,
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      categoryType: "lore yazısı",
      isWikiHooked: true
    }
  });

  // 9. Bölüm 1: Çınar Altındaki Sır (Kitap Bölüm)
  const kitapId = "duzada_kitap_proje_" + Date.now();
  const kitapRef = doc(itemsRef, kitapId);
  batch.set(kitapRef, {
    id: kitapId,
    title: "Düzada Söylenceleri",
    area: "kitap",
    type: "kitap_proje",
    status: "Planlandı",
    priority: "orta",
    tags: ["kitap", "roman", "söylence"],
    links: [],
    notes: "Düzada'nın mistik atmosferinde, Kamil Efendi ve genç araştırmacı Can'ın antik sırlar peşindeki serüvenini anlatan roman projesi.",
    images: [],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
    archived: false,
    isProposal: false,
    userId
  });

  const bolumId = "duzada_kitap_bolum_1_" + Date.now();
  const bolumRef = doc(itemsRef, bolumId);
  batch.set(bolumRef, {
    id: bolumId,
    title: "Bölüm 1: Çınar Altındaki Sır",
    area: "kitap",
    type: "kitap_bolum",
    status: "yazıldı", // Kitap status
    priority: "yüksek",
    tags: ["bölüm", "kitap-bölümü"],
    links: [kitapId, kamilId, meydanId],
    notes: "Ekru kâğıdın üzerinde loş ışık titriyordu. Can, Küçükçetmi meydanındaki ulu çınarın gölgesinde oturan Kamil Efendi'ye doğru yürüdü. İhtiyarın piposundan çıkan duman adanın serin meltemine karışıyordu...",
    images: [],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    archived: false,
    isProposal: false,
    userId,
    metadata: {
      bookId: kitapId,
      chapterIndex: 1,
      chapterTodos: ["Kamil Efendi'nin konuşma tonunu daha bilgece yap.", "Çınar ağacının fiziksel detaylarını zenginleştir."]
    }
  });

  // 10. AI Proposal: Düzada Amblem Anlamı (Wiki Suggestion) - Öneri
  const proposalId = "proposal_wiki_amblem_" + Date.now();
  const proposalRef = doc(itemsRef, proposalId);
  batch.set(proposalRef, {
    id: proposalId,
    title: "Düzada Turna Amblemi Sembolizmi",
    area: "duzada",
    type: "olay",
    status: "Fikir",
    priority: "düşük",
    tags: ["öneri", "amblem", "sembol"],
    links: [kamilId],
    notes: "AI ÖNERİSİ: Turna kuşu, Düzada lore'unda göçmen kabilelerin barışçıl yerleşimini ve Kems Company'nin koruyucu şemsiyesini simgeler.",
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived: false,
    isProposal: true, // Dashed coral border, etc.
    userId
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/items`);
  }
};

// Firestore CRUD Operations
export const subscribeToItems = (userId: string, callback: (items: Item[]) => void) => {
  const path = `users/${userId}/items`;
  const q = query(collection(db, "users", userId, "items"), where("archived", "==", false));
  return onSnapshot(q, (snapshot) => {
    const items: Item[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Item);
    });
    // Order by updatedAt desc
    items.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(items);
  }, (error) => {
    console.error("Firestore abonelik hatası:", error);
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const subscribeToAllItemsWithArchived = (userId: string, callback: (items: Item[]) => void) => {
  const path = `users/${userId}/items`;
  const q = query(collection(db, "users", userId, "items"));
  return onSnapshot(q, (snapshot) => {
    const items: Item[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Item);
    });
    // Order by updatedAt desc
    items.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(items);
  }, (error) => {
    console.error("Firestore arşivli abonelik hatası:", error);
    handleFirestoreError(error, OperationType.GET, path);
  });
};

// Recursive helper to clean any undefined values from payloads before sending to Firestore
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object') {
    // Keep standard Date objects if any, or general objects
    if (obj instanceof Date) {
      return obj;
    }
    const cleanObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleanObj[key] = cleanUndefined(val);
        }
      }
    }
    return cleanObj;
  }
  return obj;
}

export const saveItem = async (userId: string, item: Omit<Item, 'userId'>) => {
  const path = `users/${userId}/items/${item.id}`;
  const docRef = doc(db, "users", userId, "items", item.id);
  const data = cleanUndefined({
    ...item,
    userId,
    updatedAt: Date.now()
  });
  try {
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateItemFields = async (userId: string, itemId: string, fields: Partial<Item>) => {
  const path = `users/${userId}/items/${itemId}`;
  const docRef = doc(db, "users", userId, "items", itemId);
  try {
    await updateDoc(docRef, cleanUndefined({
      ...fields,
      updatedAt: Date.now()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteItemDoc = async (userId: string, itemId: string) => {
  const path = `users/${userId}/items/${itemId}`;
  const docRef = doc(db, "users", userId, "items", itemId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// User settings
export const subscribeToSettings = (userId: string, callback: (settings: UserSettings) => void) => {
  const path = `users/${userId}/settings/general`;
  const docRef = doc(db, "users", userId, "settings", "general");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserSettings);
    } else {
      callback({ theme: "arşiv" });
    }
  }, (error) => {
    console.error("Settings subscription error:", error);
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const saveSettings = async (userId: string, settings: UserSettings) => {
  const path = `users/${userId}/settings/general`;
  const docRef = doc(db, "users", userId, "settings", "general");
  try {
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
