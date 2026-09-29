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
/* Örnek veri tohumlama (seedUserData) silindi — 29 Eylül. Boş alan boş kalır. */

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

export const fetchAllItemsDirect = async (userId: string): Promise<Item[]> => {
  const path = `users/${userId}/items`;
  try {
    const q = query(collection(db, "users", userId, "items"));
    const snapshot = await getDocs(q);
    const items: Item[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Item);
    });
    items.sort((a, b) => b.updatedAt - a.updatedAt);
    return items;
  } catch (error) {
    console.error("Firestore doğrudan çekim hatası:", error);
    return [];
  }
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
    console.warn("Firestore arşivli abonelik uyarısı:", error);
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
