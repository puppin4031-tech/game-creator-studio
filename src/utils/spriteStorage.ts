/**
 * IndexedDB Sprite Storage Manager
 * 
 * Provides reliable, high-capacity client-side persistence for custom normalized sprite sheets.
 * - Stores binary PNG Blobs in IndexedDB (500MB+ quota, immune to 5MB localStorage limits).
 * - Avoids storing heavy raw Base64 strings in localStorage.
 * - Manages object URLs and cache invalidation.
 */

const DB_NAME = 'colonion_sprite_cache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'sprites';

export interface StoredSpriteRecord {
  /** Composite key e.g. "hunter:poop" or "pet:baby_raptor:idle" */
  key: string;
  characterKey: string;
  action: string;
  blob: Blob;
  frameCount: number;
  fps: number;
  updatedAt: number;
}

const BLOB_OBJECT_URL_CACHE = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('characterKey', 'characterKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save a normalized sprite blob to IndexedDB
 */
export async function saveSpriteToLocalDb(
  characterKey: string,
  action: string,
  blob: Blob,
  meta: { frameCount: number; fps: number }
): Promise<void> {
  try {
    const db = await openDb();
    const key = `${characterKey}:${action}`;
    // Invalidate previous object URL if cached
    const oldUrl = BLOB_OBJECT_URL_CACHE.get(key);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {}
      BLOB_OBJECT_URL_CACHE.delete(key);
    }
    const record: StoredSpriteRecord = {
      key,
      characterKey,
      action,
      blob,
      frameCount: meta.frameCount,
      fps: meta.fps,
      updatedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_NAME).put(record);
    });
  } catch (err) {
    console.warn('[spriteStorage] Failed to save to IndexedDB:', err);
  }
}

/**
 * Load a single sprite record from IndexedDB
 */
export async function loadSpriteFromLocalDb(
  characterKey: string,
  action: string
): Promise<StoredSpriteRecord | null> {
  try {
    const db = await openDb();
    const key = `${characterKey}:${action}`;
    return await new Promise<StoredSpriteRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
    });
  } catch (err) {
    console.warn('[spriteStorage] Failed to read from IndexedDB:', err);
    return null;
  }
}

/**
 * Resolve a stored IndexedDB sprite into an Object URL (cached per composite key).
 */
export async function getSpriteBlobUrlFromLocalDb(
  characterKey: string,
  action: string
): Promise<string | null> {
  const key = `${characterKey}:${action}`;
  const cached = BLOB_OBJECT_URL_CACHE.get(key);
  if (cached) return cached;

  const rec = await loadSpriteFromLocalDb(characterKey, action);
  if (!rec || !rec.blob) return null;
  const objUrl = URL.createObjectURL(rec.blob);
  BLOB_OBJECT_URL_CACHE.set(key, objUrl);
  return objUrl;
}

/**
 * Load all sprite records for a given character key from IndexedDB
 */
export async function loadAllSpritesForCharacterFromLocalDb(
  characterKey: string
): Promise<StoredSpriteRecord[]> {
  try {
    const db = await openDb();
    return await new Promise<StoredSpriteRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);
      const index = tx.objectStore(STORE_NAME).index('characterKey');
      const req = index.getAll(characterKey);
      req.onsuccess = () => resolve(req.result || []);
    });
  } catch (err) {
    console.warn('[spriteStorage] Failed to read character sprites from IndexedDB:', err);
    return [];
  }
}

/**
 * Load all sprite records across ALL character keys from IndexedDB (for fast boot hydration)
 */
export async function loadAllSpritesFromLocalDb(): Promise<StoredSpriteRecord[]> {
  try {
    const db = await openDb();
    return await new Promise<StoredSpriteRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  } catch (err) {
    console.warn('[spriteStorage] Failed to read all sprites from IndexedDB:', err);
    return [];
  }
}

/**
 * Remove a sprite record from IndexedDB
 */
export async function deleteSpriteFromLocalDb(
  characterKey: string,
  action: string
): Promise<void> {
  try {
    const db = await openDb();
    const key = `${characterKey}:${action}`;
    const oldUrl = BLOB_OBJECT_URL_CACHE.get(key);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {}
      BLOB_OBJECT_URL_CACHE.delete(key);
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_NAME).delete(key);
    });
  } catch (err) {
    console.warn('[spriteStorage] Failed to delete from IndexedDB:', err);
  }
}
