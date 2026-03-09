/**
 * ImageStorageService — IndexedDB-backed persistent image storage.
 *
 * Problem: The 10-step clinical workflow stores images as `blob:` URLs which
 *          die on page refresh. After a refresh, `localUrl` points to nothing
 *          and the user cannot see or re-analyze their uploaded images.
 *
 * Solution: Store the raw image data (ArrayBuffer) in IndexedDB keyed by
 *           the MammogramImage.id (UUID). On hydration, re-create blob URLs
 *           from the stored ArrayBuffer.
 *
 * Why IndexedDB, not localStorage?
 * - localStorage has a ~5MB quota (already under pressure from attention maps)
 * - IndexedDB supports ~50MB–unlimited depending on browser (with user prompt)
 * - IndexedDB handles binary blobs natively without base64 overhead
 *
 * Lifecycle:
 *   1. User uploads image → addImage(imageId, file) stores the ArrayBuffer
 *   2. Page refresh → restoreImageUrl(imageId) re-creates a blob: URL
 *   3. Case deleted → removeImage(imageId) cleans up storage
 *   4. On unmount → revokeUrls() releases blob: URL memory
 */

const DB_NAME = 'clinicalvision_images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/** In-memory cache of restored blob URLs, so we don't create duplicates. */
const urlCache = new Map<string, string>();

/**
 * Open (or create) the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store an image blob in IndexedDB.
 *
 * @param imageId  MammogramImage.id (UUID)
 * @param file     The File or Blob to persist
 * @param mimeType MIME type for later Blob reconstruction
 */
export async function addImage(
  imageId: string,
  file: File | Blob,
  mimeType?: string
): Promise<void> {
  try {
    const buffer = await file.arrayBuffer();
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(
        { buffer, mimeType: mimeType ?? file.type, storedAt: Date.now() },
        imageId
      );
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[ImageStorage] Failed to store image:', err);
  }
}

/**
 * Restore a blob URL for a previously-stored image.
 *
 * Returns a fresh `blob:` URL that can be used as `<img src>` or
 * `fetch()`ed for re-analysis. Returns `null` if the image was
 * never stored or IndexedDB is unavailable.
 *
 * @param imageId MammogramImage.id (UUID)
 */
export async function restoreImageUrl(imageId: string): Promise<string | null> {
  // Return cached URL if we've already restored it this session
  if (urlCache.has(imageId)) {
    return urlCache.get(imageId)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(imageId);

      request.onsuccess = () => {
        db.close();
        const record = request.result;
        if (!record || !record.buffer) {
          resolve(null);
          return;
        }
        const blob = new Blob([record.buffer], { type: record.mimeType || 'image/png' });
        const url = URL.createObjectURL(blob);
        urlCache.set(imageId, url);
        resolve(url);
      };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[ImageStorage] Failed to restore image URL:', err);
    return null;
  }
}

/**
 * Restore blob URLs for multiple images at once.
 *
 * @param imageIds Array of MammogramImage.id values
 * @returns Map of imageId → blob URL (only includes successfully restored images)
 */
export async function restoreImageUrls(
  imageIds: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  // Process in parallel for speed
  const promises = imageIds.map(async (id) => {
    const url = await restoreImageUrl(id);
    if (url) results.set(id, url);
  });
  await Promise.all(promises);
  return results;
}

/**
 * Remove a stored image from IndexedDB.
 *
 * @param imageId MammogramImage.id (UUID)
 */
export async function removeImage(imageId: string): Promise<void> {
  // Revoke any cached blob URL
  const cached = urlCache.get(imageId);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(imageId);
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(imageId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[ImageStorage] Failed to remove image:', err);
  }
}

/**
 * Remove all images for a list of IDs (e.g. when deleting a case).
 */
export async function removeImages(imageIds: string[]): Promise<void> {
  for (const id of imageIds) {
    await removeImage(id);
  }
}

/**
 * Revoke all cached blob URLs (call on component unmount to free memory).
 * Does NOT delete the IndexedDB records — they survive for future restores.
 */
export function revokeAllUrls(): void {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}

/**
 * Check if an image exists in IndexedDB.
 */
export async function hasImage(imageId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(imageId);
      request.onsuccess = () => { db.close(); resolve(!!request.result); };
      request.onerror = () => { db.close(); resolve(false); };
    });
  } catch {
    return false;
  }
}

/**
 * Get approximate storage usage in bytes.
 */
export async function getStorageUsage(): Promise<number> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage ?? 0;
    }
  } catch {
    // Not available
  }
  return 0;
}
