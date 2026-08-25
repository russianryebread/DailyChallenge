// Device-local reading state (saved + read) in IndexedDB, keyed by MM-DD so the
// English and Romanian editions of a reading share one state. All operations
// degrade gracefully to no-ops when IndexedDB is unavailable (private modes,
// old browsers). No immutable book content is duplicated here.

const DB_NAME = 'dailychallenge';
const DB_VERSION = 1;
const STORE = 'readingState';

export interface ReadingStateRecord {
  monthDay: string;
  saved?: boolean;
  savedAt?: number;
  firstReadAt?: number;
  lastReadAt?: number;
  readCount?: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'monthDay' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getState(
  monthDay: string,
): Promise<ReadingStateRecord | undefined> {
  const db = await openDb();
  if (!db) {
    return undefined;
  }
  try {
    return await requestToPromise(
      tx(db, 'readonly').get(monthDay) as IDBRequest<ReadingStateRecord>,
    );
  } catch {
    return undefined;
  }
}

export async function getAll(): Promise<ReadingStateRecord[]> {
  const db = await openDb();
  if (!db) {
    return [];
  }
  try {
    const all = await requestToPromise(
      tx(db, 'readonly').getAll() as IDBRequest<ReadingStateRecord[]>,
    );
    return all ?? [];
  } catch {
    return [];
  }
}

async function update(
  monthDay: string,
  mutate: (record: ReadingStateRecord) => ReadingStateRecord,
): Promise<ReadingStateRecord | null> {
  const db = await openDb();
  if (!db) {
    return null;
  }
  try {
    const store = tx(db, 'readwrite');
    const existing =
      (await requestToPromise(
        store.get(monthDay) as IDBRequest<ReadingStateRecord>,
      )) ?? { monthDay };
    const next = mutate({ ...existing, monthDay });
    await requestToPromise(store.put(next) as IDBRequest);
    return next;
  } catch {
    return null;
  }
}

/** Toggle the saved flag; returns the resulting saved state. */
export async function toggleSaved(monthDay: string): Promise<boolean> {
  const now = Date.now();
  const result = await update(monthDay, (record) => {
    const saved = !record.saved;
    return { ...record, saved, savedAt: saved ? now : undefined };
  });
  return result?.saved ?? false;
}

/**
 * Record meaningful engagement: opened for a few seconds and scrolled. Sets the
 * first-read timestamp once and always advances the last-read time and count.
 */
export async function markRead(monthDay: string): Promise<void> {
  const now = Date.now();
  await update(monthDay, (record) => ({
    ...record,
    firstReadAt: record.firstReadAt ?? now,
    lastReadAt: now,
    readCount: (record.readCount ?? 0) + 1,
  }));
}
